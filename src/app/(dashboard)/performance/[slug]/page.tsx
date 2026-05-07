/**
 * /performance/[slug] — drill-down for a single strategy.
 *
 * Header card (status, runtime kind, version) + aggregate metrics +
 * per-asset breakdown + recent 20 closed positions. Linked from each
 * row in /performance's per-strategy table.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const MIN_TRADES_FOR_SHARPE = 10;

export default async function PerformanceStrategyPage({ params }: Props) {
  const { slug } = await params;
  const data = await api.performance.bySlug({ slug });
  if (!data) notFound();

  const strategy = data.strategy as Record<string, unknown>;
  const agg = data.aggregate as Record<string, unknown>;
  const recent = data.recent;
  const byAsset = data.byAsset;

  const tradeCount = Number(agg.tradeCount ?? 0);
  const wins = Number(agg.wins ?? 0);
  const losses = Number(agg.losses ?? 0);
  const totalPnl = Number(agg.totalPnlUsd ?? 0);
  const openUnrealized = Number(agg.openUnrealizedPnlUsd ?? 0);
  const openCount = Number(agg.openCount ?? 0);
  const avgPnlPct = agg.avgPnlPct != null ? Number(agg.avgPnlPct) : null;
  const stddevPnlPct = agg.stddevPnlPct != null ? Number(agg.stddevPnlPct) : null;
  const winRate = tradeCount > 0 ? wins / tradeCount : 0;
  const sharpe =
    tradeCount >= MIN_TRADES_FOR_SHARPE &&
    stddevPnlPct !== null &&
    stddevPnlPct > 0 &&
    avgPnlPct !== null
      ? avgPnlPct / stddevPnlPct
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/performance"
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ← /performance
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          <span className="font-mono">{String(strategy.slug)}</span>{" "}
          <Badge variant={strategy.status === "active" ? "default" : "secondary"}>
            {String(strategy.status)}
          </Badge>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {String(strategy.name)} · v{String(strategy.version)}
          {strategy.bucket ? (
            <>
              {" "}
              · bucket{" "}
              <Badge variant="outline">{String(strategy.bucket)}</Badge>
            </>
          ) : null}
          {strategy.runtime ? (
            <>
              {" "}
              · runtime{" "}
              <Badge variant="outline" className="font-mono">
                {String(strategy.runtime)}
              </Badge>
            </>
          ) : (
            <>
              {" "}
              ·{" "}
              <span className="text-xs text-gray-500" title="legacy spawn path">
                legacy
              </span>
            </>
          )}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="Closed trades" value={tradeCount} />
        <Card
          label="Win rate"
          value={tradeCount > 0 ? `${(winRate * 100).toFixed(0)}%` : "—"}
        />
        <Card
          label="Realized PnL"
          value={fmtUsd(totalPnl)}
          tone={totalPnl > 0 ? "green" : totalPnl < 0 ? "red" : "neutral"}
        />
        <Card
          label="Unrealized PnL"
          value={fmtUsd(openUnrealized)}
          tone={
            openUnrealized > 0 ? "green" : openUnrealized < 0 ? "red" : "neutral"
          }
        />
        <Card label="Open positions" value={openCount} />
        <Card
          label="Sharpe (trade)"
          value={
            sharpe === null ? "n/a" : sharpe.toFixed(2)
          }
          tone={
            sharpe === null
              ? "neutral"
              : sharpe > 1
                ? "green"
                : sharpe > 0
                  ? "neutral"
                  : "red"
          }
        />
        <Card label="Wins" value={wins} />
        <Card label="Losses" value={losses} />
        <Card
          label="Best trade"
          value={fmtUsd(Number(agg.bestTrade ?? 0))}
          tone="green"
        />
        <Card
          label="Worst trade"
          value={fmtUsd(Number(agg.worstTrade ?? 0))}
          tone="red"
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Per-asset ({byAsset.length})
        </h2>
        {byAsset.length === 0 ? (
          <p className="text-sm text-gray-500">No closed positions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win rate</TableHead>
                <TableHead className="text-right">Total PnL $</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byAsset.map((a) => {
                const aTrades = Number(a.tradeCount ?? 0);
                const aWins = Number(a.wins ?? 0);
                const aPnl = Number(a.totalPnlUsd ?? 0);
                const aWinRate = aTrades > 0 ? aWins / aTrades : 0;
                return (
                  <TableRow key={String(a.asset)}>
                    <TableCell className="font-mono">
                      {String(a.asset)}
                    </TableCell>
                    <TableCell className="text-right">{aTrades}</TableCell>
                    <TableCell className="text-right">
                      {aTrades > 0
                        ? `${(aWinRate * 100).toFixed(0)}%`
                        : "—"}
                    </TableCell>
                    <PnlCell value={aPnl} fmt={fmtUsd} />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Recent closed trades ({recent.length})
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No closed trades yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Closed</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((t) => {
                const id = String(t.id);
                const pnl = Number(t.realizedPnlUsd ?? 0);
                return (
                  <TableRow key={id}>
                    <TableCell className="text-xs text-gray-400">
                      {t.closedAt
                        ? fmtDate(t.closedAt as string | Date)
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {String(t.asset)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {String(t.venue)}
                    </TableCell>
                    <TableCell>{String(t.side)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {Number(t.qty ?? 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {fmtPrice(Number(t.avgEntryPrice ?? 0))}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {t.avgExitPrice != null
                        ? fmtPrice(Number(t.avgExitPrice))
                        : "—"}
                    </TableCell>
                    <PnlCell value={pnl} fmt={fmtUsd} />
                    <TableCell>
                      <Link
                        href={`/positions/${id}`}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        ↗
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "red" | "neutral";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-400"
      : tone === "red"
        ? "text-red-400"
        : "";
  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PnlCell({
  value,
  fmt,
}: {
  value: number | null;
  fmt: (n: number) => string;
}) {
  if (value === null || value === undefined) {
    return <TableCell className="text-right text-gray-500">—</TableCell>;
  }
  const tone =
    value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "";
  return <TableCell className={`text-right ${tone}`}>{fmt(value)}</TableCell>;
}

function fmtUsd(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}$${n.toFixed(2)}`;
}

function fmtPrice(n: number): string {
  if (n === 0) return "—";
  if (Math.abs(n) < 1) return n.toFixed(4);
  if (Math.abs(n) < 100) return n.toFixed(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 16).replace("T", " ");
}
