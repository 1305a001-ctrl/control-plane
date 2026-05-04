import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/server";

/**
 * /risk — full DD breakdown, kill events history.
 * Wires to: risk_ledger (latest + recent for sparkline), kill_events (audit log).
 */
export default async function RiskPage() {
  const [latest, recent, killAudit, limits, correlation] = await Promise.all([
    api.risk.latest(),
    api.risk.recent(),
    api.kill.recent(),
    api.risk.limits(),
    api.risk.latestCorrelation(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk</h1>
        <p className="text-sm text-gray-400">
          Drawdown vs configured limits · kill-events full audit · last
          snapshot{" "}
          {latest?.snapshotAt
            ? new Date(latest.snapshotAt).toLocaleString()
            : "—"}
        </p>
      </div>

      {/* Limit bars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Drawdown vs limits
          </CardTitle>
          <CardDescription>
            Limits sourced from project_trading_stack.md. Per-trade 1% in paper,
            scale to 2% only after Sharpe &gt; 1 across 100+ trades.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <LimitBar
            label="Per-trade"
            current={0}
            limit={limits.perTradePct}
            unit="%"
            note="paper"
          />
          <LimitBar
            label="Daily"
            current={Math.abs(latest?.drawdownPct ?? 0)}
            limit={limits.perDayPct}
            unit="%"
            note="halt new"
          />
          <LimitBar
            label="Weekly"
            current={Math.abs(latest?.drawdownPct ?? 0)}
            limit={limits.perWeekPct}
            unit="%"
            note="full halt"
          />
          <LimitBar
            label="Monthly"
            current={Math.abs(latest?.drawdownPct ?? 0)}
            limit={limits.perMonthPct}
            unit="%"
            note="review week"
          />
          <LimitBar
            label="Total"
            current={Math.abs(latest?.drawdownPct ?? 0)}
            limit={limits.perTotalPct}
            unit="%"
            note="flat all"
          />
        </CardContent>
      </Card>

      {/* Snapshot details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Latest snapshot (total · intraday)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latest === null ? (
            <p className="text-sm italic text-gray-500">
              no snapshot yet — risk-watcher writes every 60s
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Stat label="P&L" value={fmtUsd(latest.pnlUsd)} />
              <Stat label="P&L %" value={`${latest.pnlPct.toFixed(2)}%`} />
              <Stat label="Drawdown" value={fmtUsd(latest.drawdownUsd)} />
              <Stat
                label="Drawdown %"
                value={`${latest.drawdownPct.toFixed(2)}%`}
              />
              <Stat
                label="Open positions"
                value={String(latest.openPositionsCount)}
              />
              <Stat label="Exposure" value={fmtUsd(latest.exposureUsd)} />
              <Stat label="Fees" value={fmtUsd(latest.feesUsd)} />
              <Stat label="Slippage" value={fmtUsd(latest.slippageUsd)} />
              <Stat
                label="Trades opened"
                value={String(latest.tradesOpened)}
              />
              <Stat
                label="Trades closed"
                value={String(latest.tradesClosed)}
              />
              <Stat label="Won" value={String(latest.tradesWon)} />
              <Stat label="Lost" value={String(latest.tradesLost)} />
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">
            v0.1.0: pnlPct + drawdownPct are 0 until account-equity baseline is
            wired in Phase 2 OMS. Trade counts + P&L + exposure are real.
          </p>
        </CardContent>
      </Card>

      {/* Snapshot history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Snapshot history (last 200)
          </CardTitle>
          <CardDescription>1-min cadence from risk-watcher</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm italic text-gray-500">no history yet</p>
          ) : (
            <p className="text-sm text-gray-300">
              {recent.length} snapshots · oldest{" "}
              {new Date(
                recent[recent.length - 1]!.snapshotAt,
              ).toLocaleString()}{" "}
              · newest{" "}
              {new Date(recent[0]!.snapshotAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Correlation snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Correlation snapshot
          </CardTitle>
          <CardDescription>
            Cross-position correlation matrix from risk-watcher (every 5 min, rolling{" "}
            {correlation?.windowMinutes ?? 60} min window)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {correlation === null ? (
            <p className="text-sm italic text-gray-500">
              no snapshots yet — risk-watcher writes every 5 min
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <Stat
                  label="Snapshot at"
                  value={new Date(correlation.snapshotAt).toLocaleTimeString()}
                />
                <Stat
                  label="Asset universe"
                  value={
                    correlation.assetUniverse.length === 0
                      ? "—"
                      : `${correlation.assetUniverse.length} (${correlation.assetUniverse.join(
                          ", ",
                        )})`
                  }
                />
                <Stat
                  label="Max pairwise corr"
                  value={
                    correlation.maxPairwiseCorr === null
                      ? "—"
                      : correlation.maxPairwiseCorr.toFixed(3)
                  }
                />
                <Stat
                  label="Cluster status"
                  value={
                    correlation.thresholdBreached ? "🚨 BREACH" : "✓ ok"
                  }
                />
              </div>
              <p className="text-xs text-gray-500">
                Matrix is empty in v0.1.0 (the price-history source to compute
                returns isn&apos;t wired yet — comes in Phase 2 with per-venue
                adapters). Asset universe + cadence are stable; matrix-math fills
                in when prices flow.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kill events full audit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Kill events history (last 50)
          </CardTitle>
          <CardDescription>
            All halts, drawdown breaches, manual triggers — durable audit log
            from kill_events table
          </CardDescription>
        </CardHeader>
        <CardContent>
          {killAudit.length === 0 ? (
            <p className="text-sm italic text-gray-500">no events yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Cleared</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {killAudit.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(e.triggeredAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">L{e.level}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.kind}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.scope}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.actor}
                    </TableCell>
                    <TableCell className="text-xs">{e.reason}</TableCell>
                    <TableCell>
                      {e.clearedAt ? (
                        <span className="text-xs text-gray-500">
                          {new Date(e.clearedAt).toLocaleTimeString()}
                        </span>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          active
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LimitBar({
  label,
  current,
  limit,
  unit,
  note,
}: {
  label: string;
  current: number;
  limit: number;
  unit: string;
  note: string;
}) {
  const pct = Math.min(100, (current / limit) * 100);
  const color =
    pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-green-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {current.toFixed(2)}
          {unit} / {limit}
          {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-800">
        <div
          className={`h-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "" : "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}
