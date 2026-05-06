import { Badge } from "~/components/ui/badge";
import { LineChart } from "~/components/charts/line-chart";
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

const MIN_TRADES_FOR_SHARPE = 10;

export default async function PerformancePage() {
  const [byStrategy, byBucket, overall, curves] = await Promise.all([
    api.performance.byStrategy(),
    api.performance.byBucket(),
    api.performance.overall(),
    api.performance.curves(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Performance</h1>
        <p className="text-sm text-gray-400">
          Realised PnL + win-rate aggregations from{" "}
          <code className="text-gray-300">positions</code>. Trade-Sharpe shown
          once a strategy crosses {MIN_TRADES_FOR_SHARPE} closed trades.
        </p>
      </div>

      <OverallCards overall={overall as Record<string, number | null>} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Curves
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <LineChart
            caption="Equity (cum. realized PnL, USD)"
            data={curves.map((c) => ({ ts: c.ts, value: c.pnlUsd }))}
            tone="green"
            fmt={fmtUsd}
          />
          <LineChart
            caption="Drawdown from high-water mark (%)"
            data={curves.map((c) => ({ ts: c.ts, value: -Math.abs(c.drawdownPct) * 100 }))}
            tone="red"
            fmt={(n) => `${n.toFixed(2)}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          By bucket ({byBucket.length})
        </h2>
        {byBucket.length === 0 ? (
          <p className="text-sm text-gray-500">No closed positions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win rate</TableHead>
                <TableHead className="text-right">Total PnL $</TableHead>
                <TableHead className="text-right">Avg PnL $</TableHead>
                <TableHead className="text-right">Avg PnL %</TableHead>
                <TableHead className="text-right">Best</TableHead>
                <TableHead className="text-right">Worst</TableHead>
                <TableHead className="text-right">Notional $</TableHead>
                <TableHead className="text-right">Fees $</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byBucket.map((b) => (
                <TableRow key={b.bucket}>
                  <TableCell>
                    <Badge variant="secondary">{b.bucket}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{b.tradeCount}</TableCell>
                  <TableCell className="text-right">
                    {b.tradeCount > 0
                      ? `${((b.wins / b.tradeCount) * 100).toFixed(0)}%`
                      : "—"}
                  </TableCell>
                  <PnlCell value={b.totalPnlUsd} fmt={fmtUsd} />
                  <PnlCell value={b.avgPnlUsd} fmt={fmtUsd} />
                  <PnlCell value={b.avgPnlPct} fmt={fmtPct} />
                  <PnlCell value={b.bestTrade} fmt={fmtUsd} />
                  <PnlCell value={b.worstTrade} fmt={fmtUsd} />
                  <TableCell className="text-right text-gray-400">
                    {fmtUsd(b.totalNotional)}
                  </TableCell>
                  <TableCell className="text-right text-gray-400">
                    {fmtFee(b.totalFeesUsd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          By strategy ({byStrategy.length})
        </h2>
        {byStrategy.length === 0 ? (
          <p className="text-sm text-gray-500">No closed positions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Strategy</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win rate</TableHead>
                <TableHead className="text-right">Realized $</TableHead>
                <TableHead className="text-right" title="Open positions only">Unreal $</TableHead>
                <TableHead className="text-right">Avg PnL %</TableHead>
                <TableHead className="text-right">Sharpe</TableHead>
                <TableHead className="text-right">Best</TableHead>
                <TableHead className="text-right">Worst</TableHead>
                <TableHead>First → Last</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byStrategy.map((s) => (
                <TableRow key={s.strategyId}>
                  <TableCell className="font-mono">
                    {s.slug ?? <span className="text-gray-500">{s.strategyId.slice(0, 8)}</span>}
                  </TableCell>
                  <TableCell>
                    {s.bucket ? (
                      <Badge variant="outline">{s.bucket}</Badge>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{s.tradeCount}</TableCell>
                  <TableCell className="text-right">
                    {(s.winRate * 100).toFixed(0)}%
                  </TableCell>
                  <PnlCell value={s.totalPnlUsd} fmt={fmtUsd} />
                  <PnlCell value={s.openUnrealizedPnlUsd ?? 0} fmt={fmtUsd} />
                  <PnlCell value={s.avgPnlPct} fmt={fmtPct} />
                  <TableCell className="text-right">
                    {s.sharpe === null ? (
                      <span className="text-xs text-gray-500" title={`needs ${MIN_TRADES_FOR_SHARPE - s.tradeCount} more trades`}>
                        n/a
                      </span>
                    ) : (
                      <span
                        className={
                          s.sharpe > 1
                            ? "text-green-400"
                            : s.sharpe > 0
                            ? "text-yellow-400"
                            : "text-red-400"
                        }
                      >
                        {s.sharpe.toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <PnlCell value={s.bestTrade} fmt={fmtUsd} />
                  <PnlCell value={s.worstTrade} fmt={fmtUsd} />
                  <TableCell className="text-xs text-gray-400">
                    {s.firstClosedAt && s.lastClosedAt
                      ? `${fmtDate(s.firstClosedAt)} → ${fmtDate(s.lastClosedAt)}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function OverallCards({
  overall,
}: {
  overall: Record<string, number | null>;
}) {
  const closedCount = Number(overall.closedCount ?? 0);
  const openCount = Number(overall.openCount ?? 0);
  const realized = Number(overall.totalRealizedPnlUsd ?? 0);
  const unrealized = Number(overall.totalUnrealizedPnlUsd ?? 0);
  const total = realized + unrealized;
  const fees = Number(overall.totalFeesUsd ?? 0);
  const exposure = Number(overall.openExposureUsd ?? 0);
  const wins = Number(overall.wins ?? 0);
  const losses = Number(overall.losses ?? 0);
  const winRate = closedCount > 0 ? wins / closedCount : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Card label="Closed positions" value={closedCount} />
      <Card label="Open positions" value={openCount} />
      <Card
        label="Realized PnL"
        value={fmtUsd(realized)}
        tone={realized > 0 ? "green" : realized < 0 ? "red" : "neutral"}
      />
      <Card
        label="Unrealized PnL"
        value={fmtUsd(unrealized)}
        tone={unrealized > 0 ? "green" : unrealized < 0 ? "red" : "neutral"}
      />
      <Card
        label="Total PnL"
        value={fmtUsd(total)}
        tone={total > 0 ? "green" : total < 0 ? "red" : "neutral"}
      />
      <Card label="Win rate" value={`${(winRate * 100).toFixed(0)}%`} />
      <Card label="Open exposure" value={fmtUsd(exposure)} />
      <Card label="Fees paid" value={fmtFee(fees)} />
      <div className="col-span-2 md:col-span-6 mt-2 grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
        <Card label="Wins" value={wins} />
        <Card label="Losses" value={losses} />
        <Card
          label="Best trade"
          value={fmtUsd(Number(overall.bestTrade ?? 0))}
          tone="green"
        />
        <Card
          label="Worst trade"
          value={fmtUsd(Number(overall.worstTrade ?? 0))}
          tone="red"
        />
      </div>
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

function PnlCell({ value, fmt }: { value: number | null; fmt: (n: number) => string }) {
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

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(3)}%`;
}

function fmtFee(n: number): string {
  return `$${n.toFixed(4)}`;
}

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
