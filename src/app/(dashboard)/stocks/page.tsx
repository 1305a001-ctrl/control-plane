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
import { classifyAsset } from "~/lib/asset-class";
import { api } from "~/trpc/server";

/**
 * /stocks — open + recent stock trades from the existing trades table.
 * Filters via classifyAsset() heuristic — anything not crypto / forex
 * is assumed stocks.
 */
export default async function StocksPage() {
  const all = await api.trades.list({ limit: 200 });
  const stockTrades = all.filter((t) => classifyAsset(t.asset) === "stocks");
  const open = stockTrades.filter((t) =>
    ["pending", "open", "partial"].includes(t.status),
  );
  const recent = stockTrades
    .filter((t) => t.status === "closed")
    .slice(0, 30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stocks</h1>
        <p className="text-sm text-gray-400">
          Alpaca paper → live · US market hours · {open.length} open ·{" "}
          {recent.length} recently closed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Open positions
          </CardTitle>
          <CardDescription>
            Live from `trades` filtered by asset_class=stocks (heuristic)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {open.length === 0 ? (
            <p className="text-sm italic text-gray-500">no open positions</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Size USD</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {open.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.asset}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.direction === "long" ? "default" : "destructive"}
                      >
                        {t.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>${t.sizeUsd.toFixed(0)}</TableCell>
                    <TableCell>{t.entryPrice?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell>{t.stopLossPrice?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell>{t.takeProfitPrice?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {t.broker}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {t.openedAt ? new Date(t.openedAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Recently closed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm italic text-gray-500">none yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>P&L USD</TableHead>
                  <TableHead>Close reason</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.asset}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.direction}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        (t.pnlUsd ?? 0) > 0
                          ? "text-green-400"
                          : (t.pnlUsd ?? 0) < 0
                            ? "text-red-400"
                            : ""
                      }
                    >
                      {t.pnlUsd != null ? `$${t.pnlUsd.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {t.closeReason ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {t.closedAt ? new Date(t.closedAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Pending wiring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-gray-400">
          <p>· Alpaca live broker — Tier C credential</p>
          <p>· Watchlist (Finviz) — Phase 4 adapter</p>
          <p>· Earnings calendar — Phase 4 adapter (Polygon or Finviz)</p>
        </CardContent>
      </Card>
    </div>
  );
}
