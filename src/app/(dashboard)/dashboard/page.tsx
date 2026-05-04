import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/server";

import { EquitySparkline } from "../_components/equity-sparkline";

/**
 * Trading OS — landing dashboard. Live data via api.dashboard.summary().
 *
 * Reads from: risk_ledger (latest snapshot from risk-watcher), trades +
 * poly_positions (open count), kill_events (active halts), macro_events
 * (extreme readings from CFTC COT).
 */
export default async function TradingDashboard() {
  const [data, upcomingEvents, riskRecent] = await Promise.all([
    api.dashboard.summary(),
    api.macro.upcomingStatements({ daysAhead: 60, limit: 10 }),
    api.risk.recent(),
  ]);

  const totalOpen =
    data.positions.crypto.count +
    data.positions.stocks.count +
    data.positions.forex.count +
    data.positions.predictions.count;

  const winRate =
    data.risk.tradesClosed > 0
      ? data.risk.tradesWon / data.risk.tradesClosed
      : null;

  const dailyDdAbs = Math.abs(data.risk.drawdownPct);
  const totalDdAbs = Math.abs(data.risk.drawdownPct); // total = same window for v0.1.0

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trading OS</h1>
          <p className="text-sm text-gray-400">
            1000–3000 trades/day target · paper-mode · L0 maturity ·
            {data.risk.snapshotAt ? (
              <span> last snapshot {new Date(data.risk.snapshotAt).toLocaleTimeString()}</span>
            ) : (
              <span className="text-amber-400"> waiting for risk-watcher snapshot</span>
            )}
          </p>
        </div>
        <Link
          href="/kill-switch"
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 active:bg-red-800"
        >
          🔴 KILL ALL
        </Link>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today P&amp;L</CardDescription>
            <CardTitle className="text-3xl font-bold">
              <span className={pnlColor(data.risk.pnlUsd)}>
                {fmtUsd(data.risk.pnlUsd)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            {fmtPct(data.risk.pnlPct)} ·{" "}
            {data.risk.tradesClosed} trades · win{" "}
            {winRate === null ? "—" : `${(winRate * 100).toFixed(0)}%`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open positions</CardDescription>
            <CardTitle className="text-3xl font-bold">{totalOpen}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            crypto {data.positions.crypto.count} · stocks{" "}
            {data.positions.stocks.count} · fx {data.positions.forex.count} ·
            poly {data.positions.predictions.count}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exposure</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {fmtUsd(data.risk.exposureUsd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            gross sum across open
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost today</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-400">
              {fmtUsd(data.risk.feesUsd + data.risk.slippageUsd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            fees {fmtUsd(data.risk.feesUsd)} · slip{" "}
            {fmtUsd(data.risk.slippageUsd)}
          </CardContent>
        </Card>
      </div>

      {/* Equity curve sparkline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Equity curve
          </CardTitle>
          <CardDescription>
            risk_ledger snapshots (1-min cadence from risk-watcher)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EquitySparkline
            snapshots={riskRecent.map((r) => ({
              snapshotAt: r.snapshotAt,
              pnlUsd: r.pnlUsd,
            }))}
            width={640}
            height={80}
          />
        </CardContent>
      </Card>

      {/* Risk meters row */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Risk meters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <RiskMeter
            label="Daily DD"
            current={dailyDdAbs}
            limit={data.limits.dailyDdPct}
            unit="%"
          />
          <RiskMeter
            label="Total DD"
            current={totalDdAbs}
            limit={data.limits.totalDdPct}
            unit="%"
          />
          <RiskMeter
            label="Active halts"
            current={data.activeKills.length}
            limit={1}
            unit=""
            displayDecimals={0}
            invertedColors
          />
        </CardContent>
      </Card>

      {/* Asset class grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          By asset class
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <AssetCard
            href="/crypto"
            name="Crypto"
            positions={data.positions.crypto.count}
            exposure={data.positions.crypto.exposureUsd}
            note="OKX/Bybit · 24/7"
          />
          <AssetCard
            href="/stocks"
            name="Stocks"
            positions={data.positions.stocks.count}
            exposure={data.positions.stocks.exposureUsd}
            note="Alpaca · US hours"
          />
          <AssetCard
            href="/forex"
            name="Forex"
            positions={data.positions.forex.count}
            exposure={data.positions.forex.exposureUsd}
            note="OANDA · 24/5 · pending"
          />
          <AssetCard
            href="/predictions"
            name="Predictions"
            positions={data.positions.predictions.count}
            exposure={data.positions.predictions.exposureUsd}
            note="Polymarket · resolution-bound"
          />
        </div>
      </div>

      {/* Upcoming central bank events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Upcoming central bank events (next 60 days)
          </CardTitle>
          <CardDescription>
            FOMC / ECB / BoE / BoJ / BNM scheduled meetings · macro_events from
            cb_statements puller
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm italic text-gray-500">
              no events in next 60 days
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {upcomingEvents.map((e) => {
                const days = Math.ceil(
                  (new Date(e.eventAt).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                );
                return (
                  <li key={e.id} className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(e.eventAt).toISOString().slice(0, 10)}
                    </span>
                    <span className="font-semibold uppercase">
                      {e.source.replace("-statement", "")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(e.payload as { meeting_type?: string })?.meeting_type ??
                        "—"}
                    </span>
                    <span
                      className={
                        days <= 7
                          ? "text-amber-400 text-xs"
                          : "text-gray-500 text-xs"
                      }
                    >
                      in {days}d
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Live feeds row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Macro extremes (last 30d)
            </CardTitle>
            <CardDescription>
              CFTC COT positioning · |z| ≥ 2 · click into{" "}
              <Link href="/alpha" className="underline">
                /alpha
              </Link>{" "}
              for full
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.macroExtremes.length === 0 ? (
              <p className="text-sm italic text-gray-500">
                no extreme readings yet
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.macroExtremes.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(e.eventAt).toISOString().slice(0, 10)}
                    </span>
                    <span className="font-semibold">{e.instrument}</span>
                    <span
                      className={
                        e.interpretation === "extreme-long"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      z={e.surpriseScore?.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {e.interpretation}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Recent kill events
            </CardTitle>
            <CardDescription>last 5 active · full list at /kill-switch</CardDescription>
          </CardHeader>
          <CardContent>
            {data.activeKills.length === 0 ? (
              <p className="text-sm italic text-green-400">
                ✓ no active halts
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.activeKills.slice(0, 5).map((k) => (
                  <li key={k.id} className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(k.triggeredAt).toLocaleTimeString()}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      L{k.level} {k.kind}
                    </Badge>
                    <span className="text-xs text-gray-400">{k.scope}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RiskMeter({
  label,
  current,
  limit,
  unit,
  displayDecimals = 1,
  invertedColors = false,
}: {
  label: string;
  current: number;
  limit: number;
  unit: string;
  displayDecimals?: number;
  invertedColors?: boolean;
}) {
  const pct = Math.min(100, (current / limit) * 100);
  const greenAtLow = !invertedColors;
  const color = greenAtLow
    ? pct >= 80
      ? "bg-red-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-green-500"
    : current === 0
      ? "bg-green-500"
      : "bg-red-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {current.toFixed(displayDecimals)}
          {unit} / {limit.toFixed(displayDecimals)}
          {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-800">
        <div
          className={`h-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AssetCard({
  href,
  name,
  positions,
  exposure,
  note,
}: {
  href: string;
  name: string;
  positions: number;
  exposure: number;
  note: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-gray-600 hover:bg-gray-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{name}</CardTitle>
          <CardDescription className="text-xs">{note}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="font-bold">{fmtUsd(exposure)}</div>
          <div className="text-xs text-gray-400">{positions} open</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "" : "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pnlColor(n: number): string {
  if (n > 0) return "text-green-400";
  if (n < 0) return "text-red-400";
  return "text-gray-300";
}
