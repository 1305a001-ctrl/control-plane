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
 * /predictions — Polymarket positions live from poly_positions.
 * Future Phase 4: cross-market correlator hits + edge-ranked market list.
 */
export default async function PredictionsPage() {
  const all = await api.polyPositions.list({ limit: 200 });
  const open = all.filter((p) =>
    ["pending", "open", "partial"].includes(p.status),
  );
  const recent = all.filter((p) => p.status === "closed").slice(0, 30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Predictions</h1>
        <p className="text-sm text-gray-400">
          Polymarket · resolution-bound · {open.length} open ·{" "}
          {recent.length} recently closed · cross-market correlator pending
          Phase 4
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Open positions
          </CardTitle>
          <CardDescription>
            From poly_positions table (paper mode for now)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {open.length === 0 ? (
            <p className="text-sm italic text-gray-500">no open positions</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Stake USD</TableHead>
                  <TableHead>Entry prob</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {open.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.marketSlug}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.side === "yes" ? "default" : "destructive"}
                      >
                        {p.side}
                      </Badge>
                    </TableCell>
                    <TableCell>${p.stakeUsd.toFixed(0)}</TableCell>
                    <TableCell>{p.entryProbability?.toFixed(3) ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.status}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {p.openedAt ? new Date(p.openedAt).toLocaleString() : "—"}
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
            Recently closed / resolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm italic text-gray-500">none yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>P&L USD</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.marketSlug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.side}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        (p.pnlUsd ?? 0) > 0
                          ? "text-green-400"
                          : (p.pnlUsd ?? 0) < 0
                            ? "text-red-400"
                            : ""
                      }
                    >
                      {p.pnlUsd != null ? `$${p.pnlUsd.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {p.resolvedOutcome ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {p.closedAt ? new Date(p.closedAt).toLocaleString() : "—"}
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
          <p>· Polymarket on-chain wallet — needs MY lawyer review (Tier 3 gated)</p>
          <p>· Edge-ranked market list — Phase 4 cross-market correlator</p>
          <p>· Resolution calendar — Phase 4</p>
        </CardContent>
      </Card>
    </div>
  );
}
