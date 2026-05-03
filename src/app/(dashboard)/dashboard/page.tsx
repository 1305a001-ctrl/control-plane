import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

/**
 * Trading OS — landing dashboard.
 *
 * Per project_trading_stack.md:
 *   - Top stats: today P&L, open positions, win rate, fees + slippage
 *   - System health LEDs
 *   - Risk meters: daily DD vs 5%, total DD vs 20%, correlation cluster
 *   - Asset-class grid (Crypto / Stocks / Forex / Predictions) — click-through
 *   - Live signal feed (last 20)
 *   - Recent kill events (from kill_events table)
 *   - Big-red Kill All button (with confirmation modal)
 *
 * Live data wiring is intentionally NOT done in this scaffold. All numbers are
 * placeholder. Wire to tRPC routers in a follow-up PR once the OMS + risk-
 * ledger persistence worker exist (Phase 1F + Phase 2).
 */
export default async function TradingDashboard() {
  // TODO(phase-2): replace placeholders with tRPC calls:
  //   - api.risk.todayPnL()           → daily P&L + win rate + fees + slippage
  //   - api.positions.openCount()     → per-asset-class open count
  //   - api.risk.drawdown()           → DD vs limits
  //   - api.signals.recent({ limit })
  //   - api.killEvents.recent({ limit })
  //   - api.health.systemStatus()     → SSE stream for live LEDs
  const placeholder = {
    todayPnLUsd: 0,
    todayPnLPct: 0,
    tradesToday: 0,
    winRate: null as number | null,
    feesUsd: 0,
    slippageUsd: 0,
    openPositions: { crypto: 0, stocks: 0, forex: 0, predictions: 0 },
    dailyDdPct: 0,
    dailyDdLimitPct: 5,
    totalDdPct: 0,
    totalDdLimitPct: 20,
    correlationCluster: 0,
    correlationLimit: 0.8,
    halts: [] as string[],
    systemHealth: {
      "ai-primary": "ok",
      "ai-staging": "ok",
      "ai-edge": "ok",
      postgres: "ok",
      redis: "ok",
      alpaca: "not-connected",
      okx: "not-connected",
    } as Record<string, "ok" | "degraded" | "down" | "not-connected">,
  };

  const totalOpen = Object.values(placeholder.openPositions).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar — title + kill button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trading OS</h1>
          <p className="text-sm text-gray-400">
            1000–3000 trades/day target · paper-mode until edge proven · L0 maturity
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
              <span className={pnlColor(placeholder.todayPnLUsd)}>
                {fmtUsd(placeholder.todayPnLUsd)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            {fmtPct(placeholder.todayPnLPct)} · {placeholder.tradesToday} trades
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open positions</CardDescription>
            <CardTitle className="text-3xl font-bold">{totalOpen}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            {Object.entries(placeholder.openPositions).map(([k, v]) => (
              <span key={k} className="mr-2">
                {k} {v}
              </span>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win rate</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {placeholder.winRate === null
                ? "—"
                : `${(placeholder.winRate * 100).toFixed(0)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            no trades yet today
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost today</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-400">
              {fmtUsd(placeholder.feesUsd + placeholder.slippageUsd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-400">
            fees {fmtUsd(placeholder.feesUsd)} · slip{" "}
            {fmtUsd(placeholder.slippageUsd)}
          </CardContent>
        </Card>
      </div>

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
            current={placeholder.dailyDdPct}
            limit={placeholder.dailyDdLimitPct}
            unit="%"
          />
          <RiskMeter
            label="Total DD"
            current={placeholder.totalDdPct}
            limit={placeholder.totalDdLimitPct}
            unit="%"
          />
          <RiskMeter
            label="Correlation cluster"
            current={placeholder.correlationCluster}
            limit={placeholder.correlationLimit}
            unit=""
            displayDecimals={2}
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
            pnl={0}
            positions={placeholder.openPositions.crypto}
            trades={0}
            note="OKX/Bybit · 24/7"
          />
          <AssetCard
            href="/stocks"
            name="Stocks"
            pnl={0}
            positions={placeholder.openPositions.stocks}
            trades={0}
            note="Alpaca · US hours"
          />
          <AssetCard
            href="/forex"
            name="Forex"
            pnl={0}
            positions={placeholder.openPositions.forex}
            trades={0}
            note="OANDA / IC Markets · 24/5"
          />
          <AssetCard
            href="/predictions"
            name="Predictions"
            pnl={0}
            positions={placeholder.openPositions.predictions}
            trades={0}
            note="Polymarket · resolution-bound"
          />
        </div>
      </div>

      {/* Live feeds row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Live signal feed
            </CardTitle>
            <CardDescription>last 20 from alphas:active</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              <i>no signals yet — alpha-fusion layer not deployed</i>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Recent kill events
            </CardTitle>
            <CardDescription>last 10 from risk:alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              <i>
                no events yet — kill-events persistence worker not deployed
                (Phase 1F)
              </i>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            System health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(placeholder.systemHealth).map(([name, state]) => (
              <HealthBadge key={name} name={name} state={state} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskMeter({
  label,
  current,
  limit,
  unit,
  displayDecimals = 1,
}: {
  label: string;
  current: number;
  limit: number;
  unit: string;
  displayDecimals?: number;
}) {
  const pct = Math.min(100, (Math.abs(current) / Math.abs(limit)) * 100);
  const color =
    pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-green-500";
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
  pnl,
  positions,
  trades,
  note,
}: {
  href: string;
  name: string;
  pnl: number;
  positions: number;
  trades: number;
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
          <div className={pnlColor(pnl)}>{fmtUsd(pnl)}</div>
          <div className="text-xs text-gray-400">
            {positions} open · {trades} today
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HealthBadge({
  name,
  state,
}: {
  name: string;
  state: "ok" | "degraded" | "down" | "not-connected";
}) {
  const variant: Record<typeof state, "default" | "secondary" | "destructive" | "outline"> = {
    ok: "default",
    degraded: "secondary",
    down: "destructive",
    "not-connected": "outline",
  };
  const dot: Record<typeof state, string> = {
    ok: "bg-green-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
    "not-connected": "bg-gray-600",
  };
  return (
    <Badge variant={variant[state]} className="gap-1.5 font-mono text-xs">
      <span className={`h-2 w-2 rounded-full ${dot[state]}`} />
      {name}
    </Badge>
  );
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "" : "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
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
