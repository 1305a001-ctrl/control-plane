import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

/**
 * Shared scaffold for the new dashboard pages added in the trading-stack
 * pivot (project_trading_stack.md). Keeps the pages small + uniform until
 * each gets its own tRPC wiring.
 */
export function ScaffoldPage({
  title,
  subtitle,
  status,
  sections,
}: {
  title: string;
  subtitle: string;
  status: "ready" | "wip" | "blocked";
  sections: { title: string; description: string; placeholder: string }[];
}) {
  const statusColor: Record<typeof status, string> = {
    ready: "text-green-400",
    wip: "text-amber-400",
    blocked: "text-red-400",
  };
  const statusLabel: Record<typeof status, string> = {
    ready: "READY",
    wip: "WIP",
    blocked: "BLOCKED",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <span className={`text-xs font-bold uppercase ${statusColor[status]}`}>
            {statusLabel[status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                {s.title}
              </CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic text-gray-500">{s.placeholder}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
