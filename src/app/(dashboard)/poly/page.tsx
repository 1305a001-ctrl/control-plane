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

export default async function PolyPage() {
  const configs = await api.agentConfigs.list({ agentType: "poly" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Poly Agent</h1>
          <p className="text-sm text-gray-400">
            Polymarket positions — market URLs, resolution conditions, stake limits.
          </p>
        </div>
        <Link
          href="/poly/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Add Market
        </Link>
      </div>

      {configs.length === 0 ? (
        <div className="rounded-lg border border-gray-800 p-6 text-center">
          <p className="text-sm text-gray-500">No Polymarket configs yet.</p>
          <p className="text-xs text-gray-600 mt-1">
            Add a market to start tracking resolution conditions and stake limits.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resolution Condition</TableHead>
              <TableHead>Min Confidence</TableHead>
              <TableHead>Max Stake</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((c) => {
              const cfg = c.config as Record<string, unknown>;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <a
                      href={cfg.market_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-indigo-400 hover:text-indigo-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.slug}
                    </a>
                    <span className="block text-xs text-gray-500">{c.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive && cfg.enabled ? "default" : "secondary"}>
                      {!c.isActive ? "archived" : cfg.enabled ? "enabled" : "disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-300 max-w-xs truncate">
                    {cfg.resolution_condition as string}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {((cfg.min_confidence as number) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {((cfg.max_stake_pct as number) * 100).toFixed(1)}%
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
        <p>The poly agent subscribes to <code className="bg-gray-800 px-1 rounded">signals:poly</code> on Redis.</p>
        <p>For each signal, it checks if there's an active market config and whether the signal meets the min confidence threshold.</p>
        <p>All markets here are Phase 7 — configs are stored now so you can plan positions before the agent is live.</p>
      </div>
    </div>
  );
}
