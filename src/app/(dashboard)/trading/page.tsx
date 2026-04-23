import Link from "next/link";
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

export default async function TradingPage() {
  const configs = await api.agentConfigs.list({ agentType: "trading" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trading Agent</h1>
          <p className="text-sm text-gray-400">
            Per-asset risk limits, position sizing, and trade parameters. Versioned and auditable.
          </p>
        </div>
        <Link
          href="/trading/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Add Asset Config
        </Link>
      </div>

      {configs.length === 0 ? (
        <div className="rounded-lg border border-gray-800 p-6 text-center">
          <p className="text-sm text-gray-500">No trading configs yet.</p>
          <p className="text-xs text-gray-600 mt-1">
            Add a config for each asset the trading agent should manage.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Position Size</TableHead>
              <TableHead>Take Profit</TableHead>
              <TableHead>Stop Loss</TableHead>
              <TableHead>Min Confidence</TableHead>
              <TableHead>Max Daily</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((c) => {
              const cfg = c.config as Record<string, unknown>;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-mono font-semibold">{c.slug}</span>
                    <span className="block text-xs text-gray-500">{c.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive && cfg.enabled ? "default" : "secondary"}>
                      {!c.isActive ? "archived" : cfg.enabled ? "enabled" : "disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {((cfg.position_size_pct as number) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm text-green-400">
                    +{((cfg.take_profit_pct as number) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm text-red-400">
                    -{((cfg.stop_loss_pct as number) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {((cfg.min_signal_confidence as number) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {String(cfg.max_daily_trades)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">v{c.version}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <div className="rounded-lg border border-gray-800 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">How it works</p>
        <p>The trading agent subscribes to <code className="bg-gray-800 px-1 rounded">signals:trading</code> and <code className="bg-gray-800 px-1 rounded">signals:critical</code> on Redis.</p>
        <p>For each incoming signal, it looks up the active config for that asset and applies the position size, TP, and SL rules.</p>
        <p>Changing a config here creates a new version — the old one is kept for audit. The agent always reads the latest active version.</p>
      </div>
    </div>
  );
}
