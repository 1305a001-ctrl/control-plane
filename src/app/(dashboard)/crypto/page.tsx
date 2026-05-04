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
import { CRYPTO_SYMBOLS, classifyAsset } from "~/lib/asset-class";
import { api } from "~/trpc/server";

/**
 * /crypto — open + recent crypto trades from the existing trades table.
 *
 * Filters by asset class via the heuristic in src/lib/asset-class.ts.
 * When a top-level asset_class column lands in trades (Phase 2), this
 * filter moves to a server-side WHERE clause.
 */
export default async function CryptoPage() {
  const all = await api.trades.list({ limit: 200 });
  const cryptoTrades = all.filter((t) => classifyAsset(t.asset) === "crypto");
  const open = cryptoTrades.filter((t) =>
    ["pending", "open", "partial"].includes(t.status),
  );
  const recent = cryptoTrades
    .filter((t) => t.status === "closed")
    .slice(0, 30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crypto</h1>
        <p className="text-sm text-gray-400">
          OKX/Bybit · 24/7 · {open.length} open positions ·{" "}
          {recent.length} recently closed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Open positions
          </CardTitle>
          <CardDescription>
            Live from `trades` filtered by asset_class=crypto (heuristic via{" "}
            CRYPTO_SYMBOLS — {CRYPTO_SYMBOLS.size} entries)
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
          <p>· Funding rates (OKX/Bybit perp funding) — Phase 3 adapter</p>
          <p>· On-chain context (Glassnode MVRV/SOPR) — Tier C credential</p>
          <p>· Liquidation cascade detector → trades:cascade:* signal stream — Phase 3 D-bucket strategy</p>
        </CardContent>
      </Card>
    </div>
  );
}
