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

const NICHE_LABELS: Record<string, string> = {
  restaurant: "🍴 restaurant",
  clinic_dental: "🦷 dental",
  clinic_medical: "🩺 medical",
  clinic_beauty: "✨ beauty",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  new: "secondary",
  outreached: "default",
  replied: "default",
  qualified: "default",
  won: "default",
  lost: "destructive",
  dead: "destructive",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string; status?: string; city?: string }>;
}) {
  const params = await searchParams;
  const [leads, summary] = await Promise.all([
    api.leads.list({
      niche: params.niche as never,
      status: params.status as never,
      geoCity: params.city,
      limit: 200,
    }),
    api.leads.summary(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-gray-400">
          Discovered Malaysian businesses ranked by fit. Higher fit = bigger gap between
          their current state and what we&apos;d build.
        </p>
      </div>

      <SummaryCards summary={summary} />

      <Filters />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Top {leads.length}
        </h2>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-500">
            No leads yet. Run prospect-agent to populate the table.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Fit</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Reviews</TableHead>
                <TableHead>Web</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/leads/${l.id}`} className="font-medium hover:text-indigo-300">
                      {l.businessName}
                    </Link>
                    {l.businessAddress && (
                      <span className="block text-xs text-gray-500 truncate max-w-md">
                        {l.businessAddress}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {NICHE_LABELS[l.niche] ?? l.niche}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">{l.geoCity ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    <FitBadge score={l.fitScore} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-400">
                    {l.businessRating?.toFixed(1) ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-400">
                    {l.businessReviewCount?.toLocaleString() ?? "—"}
                  </TableCell>
                  <TableCell>
                    {l.businessWebsiteUrl ? (
                      <a
                        href={l.businessWebsiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        site ↗
                      </a>
                    ) : (
                      <span className="text-xs text-red-400">none</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"}>
                      {l.status}
                    </Badge>
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

function SummaryCards({
  summary,
}: {
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byNiche: Record<string, number>;
    fitBuckets: { high: number; mid: number; low: number };
  };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Total leads">
        <span className="text-2xl font-semibold">{summary.total}</span>
      </Card>
      <Card label="High fit (≥0.55)">
        <span className="text-2xl font-semibold text-green-400">
          {summary.fitBuckets.high}
        </span>
        <span className="block text-xs text-gray-500">
          mid {summary.fitBuckets.mid} · low {summary.fitBuckets.low}
        </span>
      </Card>
      <Card label="By niche">
        {Object.entries(summary.byNiche).map(([n, count]) => (
          <span key={n} className="block text-xs">
            {NICHE_LABELS[n] ?? n}: {count}
          </span>
        ))}
      </Card>
      <Card label="By status">
        {Object.entries(summary.byStatus).map(([s, count]) => (
          <span key={s} className="block text-xs">
            <Badge variant={STATUS_VARIANT[s] ?? "secondary"}>{s}</Badge> {count}
          </span>
        ))}
      </Card>
    </div>
  );
}

function FitBadge({ score }: { score: number }) {
  const color =
    score >= 0.55 ? "text-green-400" : score >= 0.35 ? "text-yellow-400" : "text-gray-500";
  return <span className={color}>{score.toFixed(2)}</span>;
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function Filters() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <FilterPill href="/leads" label="all" />
      <FilterPill href="/leads?niche=restaurant" label="🍴 restaurants" />
      <FilterPill href="/leads?niche=clinic_dental" label="🦷 dental" />
      <FilterPill href="/leads?niche=clinic_medical" label="🩺 medical" />
      <FilterPill href="/leads?niche=clinic_beauty" label="✨ beauty" />
      <span className="px-2 text-gray-700">·</span>
      <FilterPill href="/leads?status=new" label="new" />
      <FilterPill href="/leads?status=outreached" label="outreached" />
      <FilterPill href="/leads?status=replied" label="replied" />
      <FilterPill href="/leads?status=qualified" label="qualified" />
    </div>
  );
}

function FilterPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded border border-gray-800 px-2 py-1 hover:border-gray-600 hover:text-white text-gray-400"
    >
      {label}
    </Link>
  );
}
