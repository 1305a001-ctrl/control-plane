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

export default async function StrategiesPage() {
  const strategies = await api.strategies.list({});

  const byType = strategies.reduce(
    (acc, s) => {
      const key = s.type as "news" | "trading" | "poly";
      acc[key] = [...(acc[key] ?? []), s];
      return acc;
    },
    {} as Record<"news" | "trading" | "poly", typeof strategies>,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Strategies</h1>
        <p className="text-sm text-gray-400">
          Synced from strategy-library. Versioned by git SHA + content hash.
        </p>
      </div>

      {strategies.length === 0 ? (
        <p className="text-sm text-gray-500">
          No strategies synced yet. Run sync_strategies.py to seed from strategy-library.
        </p>
      ) : (
        (["news", "trading", "poly"] as const).map((type) =>
          byType[type]?.length ? (
            <section key={type}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                {type}
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Git SHA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byType[type]!.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.slug}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-gray-400">{s.version}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "active"
                              ? "default"
                              : s.status === "draft"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {(s.frontmatter as { assets?: string[] })?.assets?.join(", ")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {s.gitSha.slice(0, 7)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
