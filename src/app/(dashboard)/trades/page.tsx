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

export default async function TradesPage() {
  const [open, closed, summary] = await Promise.all([
    api.trades.open(),
    api.trades.closed({ limit: 50 }),
    api.trades.summary(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Trades</h1>
        <p className="text-sm text-gray-400">
          Every order placed by the trading agent. Open positions are polled every {`${60}s`} for TP / SL / time-stop.
        </p>
      </div>

      <SummaryCards summary={summary} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Open positions ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-gray-500">No open trades.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead className="text-right">Size $</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">TP</TableHead>
                <TableHead className="text-right">SL</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Time stop</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-medium">{t.asset}</TableCell>
                  <TableCell>
                    <Badge variant={t.direction === "long" ? "default" : "destructive"}>
                      {t.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">{t.broker}</TableCell>
                  <TableCell className="text-right">${t.sizeUsd.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{fmtPrice(t.entryPrice)}</TableCell>
                  <TableCell className="text-right text-green-400">{fmtPrice(t.takeProfitPrice)}</TableCell>
                  <TableCell className="text-right text-red-400">{fmtPrice(t.stopLossPrice)}</TableCell>
                  <TableCell className="text-xs text-gray-400">{fmtDt(t.openedAt)}</TableCell>
                  <TableCell className="text-xs text-gray-400">{fmtDt(t.timeStopAt)}</TableCell>
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
          <p className="text-sm text-gray-500">No closed trades yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead className="text-right">Size $</TableHead>
                <TableHead className="text-right">Entry → Exit</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Closed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closed.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-medium">{t.asset}</TableCell>
                  <TableCell>
                    <Badge variant={t.direction === "long" ? "default" : "destructive"}>
                      {t.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">{t.broker}</TableCell>
                  <TableCell className="text-right">${t.sizeUsd.toFixed(0)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {fmtPrice(t.entryPrice)} → {fmtPrice(t.exitPrice)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      (t.pnlUsd ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {fmtPnl(t.pnlUsd)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="secondary">{t.closeReason ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">{fmtDt(t.closedAt)}</TableCell>
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
    openExposure: number;
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
        <span className="block text-xs text-gray-500">${summary.openExposure.toFixed(0)} exposure</span>
      </Card>
      <Card label="Closed">
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
        <span className="block text-xs text-gray-500">across all closed</span>
      </Card>
      <Card label="Win rate">
        <span className="text-2xl font-semibold">
          {summary.winRate === null ? "—" : `${(summary.winRate * 100).toFixed(0)}%`}
        </span>
        <span className="block text-xs text-gray-500">closed trades only</span>
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

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  if (p < 1) return p.toFixed(4);
  if (p < 100) return p.toFixed(2);
  return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
