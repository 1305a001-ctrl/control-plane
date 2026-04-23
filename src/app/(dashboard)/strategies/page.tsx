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
          Click any row to edit status, signal conditions, and risk filters.
        </p>
      </div>

      {strategies.length === 0 ? (
        <p className="text-sm text-gray-500">
          No strategies synced yet. Run{" "}
          <code className="font-mono text-xs bg-gray-800 px-1 py-0.5 rounded">
            sync_strategies.py
          </code>{" "}
          to seed from strategy-library.
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
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Git SHA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byType[type]!.map((s) => {
                    const fm = s.frontmatter as Record<string, unknown>;
                    const conditions = (fm.signal_conditions as unknown[]) ?? [];
                    return (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-gray-900">
                        <TableCell>
                          <Link href={`/strategies/${s.id}`} className="block">
                            <span className="font-medium">{s.name}</span>
                            <span className="block text-xs text-gray-500 font-mono">{s.slug}</span>
                          </Link>
                        </TableCell>
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
                          {(fm.assets as string[])?.join(", ")}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {s.gitSha.slice(0, 7)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
