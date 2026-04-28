import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CloseButton } from "./CloseButton";

export default async function PolyPositionsPage() {
  const [open, closed, summary] = await Promise.all([
    api.polyPositions.open(),
    api.polyPositions.closed({ limit: 50 }),
    api.polyPositions.summary(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Polymarket positions</h1>
        <p className="text-sm text-gray-400">
          Every paper-mode position opened by the poly agent. Settled when the underlying market resolves.
        </p>
      </div>

      <SummaryCards summary={summary} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Open positions ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-gray-500">No open positions.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Stake $</TableHead>
                <TableHead className="text-right">Entry prob.</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-mono text-sm">{p.marketSlug}</span>
                    {p.marketUrl && (
                      <a
                        href={p.marketUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        polymarket ↗
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.side === "YES" ? "default" : "destructive"}>{p.side}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${p.stakeUsd.toFixed(0)}</TableCell>
                  <TableCell className="text-right">
                    {p.entryProbability != null ? p.entryProbability.toFixed(3) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.shares != null ? p.shares.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">{fmtDt(p.openedAt)}</TableCell>
                  <TableCell className="text-right">
                    <CloseButton positionId={p.id} currentStatus={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Closed (last {closed.length})
        </h2>
        {closed.length === 0 ? (
          <p className="text-sm text-gray-500">No settled positions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Stake $</TableHead>
                <TableHead className="text-right">Entry → Exit</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Closed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closed.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.marketSlug}</TableCell>
                  <TableCell>
                    <Badge variant={p.side === "YES" ? "default" : "destructive"}>{p.side}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${p.stakeUsd.toFixed(0)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {p.entryProbability?.toFixed(3) ?? "—"} → {p.exitProbability?.toFixed(3) ?? "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      (p.pnlUsd ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {fmtPnl(p.pnlUsd)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.resolvedOutcome ?? p.closeReason ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">{fmtDt(p.closedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function SummaryCards({
  summary,
}: {
  summary: {
    openCount: number;
    openStake: number;
    closedCount: number;
    totalPnl: number;
    winRate: number | null;
    wins: number;
    losses: number;
  };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Open">
        <span className="text-2xl font-semibold">{summary.openCount}</span>
        <span className="block text-xs text-gray-500">${summary.openStake.toFixed(0)} staked</span>
      </Card>
      <Card label="Settled">
        <span className="text-2xl font-semibold">{summary.closedCount}</span>
        <span className="block text-xs text-gray-500">
          {summary.wins}W / {summary.losses}L
        </span>
      </Card>
      <Card label="Total PnL">
        <span
          className={`text-2xl font-semibold font-mono ${
            summary.totalPnl >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {fmtPnl(summary.totalPnl)}
        </span>
        <span className="block text-xs text-gray-500">across all settled</span>
      </Card>
      <Card label="Win rate">
        <span className="text-2xl font-semibold">
          {summary.winRate === null ? "—" : `${(summary.winRate * 100).toFixed(0)}%`}
        </span>
        <span className="block text-xs text-gray-500">settled only</span>
      </Card>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function fmtPnl(p: number | null | undefined): string {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}$${p.toFixed(2)}`;
}

function fmtDt(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
