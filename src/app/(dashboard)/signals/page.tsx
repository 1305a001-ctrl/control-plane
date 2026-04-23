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

export default async function SignalsPage() {
  const [signals, auditLog] = await Promise.all([
    api.signals.list({ limit: 50 }),
    api.signals.getAuditLog({ limit: 10 }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Signals</h1>
        <p className="text-sm text-gray-400">
          Immutable signal feed. Every signal carries full provenance.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Signal Feed
        </h2>
        {signals.length === 0 ? (
          <p className="text-sm text-gray-500">No signals yet. Pipeline hasn&apos;t run.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Config v</TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signals.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm font-medium">{s.asset}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.direction === "bullish"
                          ? "default"
                          : s.direction === "bearish"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {s.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {((s.confidence ?? 0) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {((s.compositeRiskScore ?? 0) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">
                    {s.redisChannel}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    v{s.researchConfigVersion}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {s.publishedAt.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Pipeline Audit Log
        </h2>
        {auditLog.length === 0 ? (
          <p className="text-sm text-gray-500">No pipeline runs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fetched</TableHead>
                <TableHead>Skipped</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-sm">
                    {run.startedAt.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        run.status === "completed"
                          ? "default"
                          : run.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{run.articlesFetched}</TableCell>
                  <TableCell className="text-sm text-gray-400">{run.articlesSkipped}</TableCell>
                  <TableCell className="text-sm">{run.signalsProduced}</TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
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
