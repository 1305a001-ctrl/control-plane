import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ venue?: string; status?: string }>;

export default async function IntentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const venue = sp.venue;
  const status = sp.status as
    | "queued" | "submitted" | "filled" | "partial"
    | "rejected" | "cancelled" | "expired" | undefined;

  const [rows, summary] = await Promise.all([
    api.intents.list({ limit: 200, venue, status }),
    api.intents.summary(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">OMS Intents</h1>
        <p className="text-sm text-gray-400">
          Phase 2 OMS pipeline: oms-gateway writes queued/rejected, oms-dispatcher writes submitted, broker adapter WS writes filled/partial.
        </p>
      </div>

      <SummaryCards summary={summary} />

      <FilterBar venue={venue} status={status} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {rows.length} most recent intents
          {venue && <span className="ml-2 text-gray-500">venue={venue}</span>}
          {status && <span className="ml-2 text-gray-500">status={status}</span>}
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No intents match the current filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Notional $</TableHead>
                <TableHead className="text-right">Fill qty</TableHead>
                <TableHead className="text-right">Fill price</TableHead>
                <TableHead className="text-right">Fees $</TableHead>
                <TableHead>Broker order id</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-gray-400">
                    {fmtDt(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.venue}</TableCell>
                  <TableCell className="font-mono">{r.asset}</TableCell>
                  <TableCell>
                    <Badge variant={r.side === "buy" ? "default" : "destructive"}>
                      {r.side}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.notionalUsd != null ? `$${r.notionalUsd.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {r.fillQty != null ? r.fillQty.toFixed(6) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.fillPrice != null ? `$${r.fillPrice.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.feesUsd != null ? `$${r.feesUsd.toFixed(4)}` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">
                    {r.brokerOrderId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {r.rejectionReason ?? "—"}
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
    totalCount: number;
    queuedCount: number;
    filledCount: number;
    rejectedCount: number;
    totalNotional: number;
    totalFees: number;
    byVenue: Record<string, { count: number; notional: number }>;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Card label="Total intents" value={summary.totalCount} />
      <Card label="Queued / submitted" value={summary.queuedCount} />
      <Card label="Filled / partial" value={summary.filledCount} />
      <Card label="Rejected" value={summary.rejectedCount} />
      <Card
        label="Notional cumulative"
        value={`$${summary.totalNotional.toFixed(0)}`}
      />
      <Card
        label="Fees cumulative"
        value={`$${summary.totalFees.toFixed(4)}`}
      />
      <div className="col-span-2 md:col-span-6 mt-2">
        <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">By venue</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.byVenue).map(([v, s]) => (
            <Link
              key={v}
              href={`/intents?venue=${encodeURIComponent(v)}`}
              className="rounded border border-gray-800 bg-gray-900/40 px-3 py-1.5 text-xs hover:border-gray-700"
            >
              <span className="font-mono text-gray-300">{v}</span>
              <span className="ml-2 text-gray-500">
                {s.count} · ${s.notional.toFixed(0)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function FilterBar({
  venue,
  status,
}: {
  venue?: string;
  status?: string;
}) {
  const statuses = [
    "queued", "submitted", "filled", "partial",
    "rejected", "cancelled", "expired",
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="uppercase tracking-wider text-gray-500">Status:</span>
      <Link
        href={`/intents${venue ? `?venue=${encodeURIComponent(venue)}` : ""}`}
        className={
          "rounded border px-2 py-1 " +
          (!status
            ? "border-gray-600 bg-gray-800"
            : "border-gray-800 hover:border-gray-700")
        }
      >
        all
      </Link>
      {statuses.map((s) => {
        const params = new URLSearchParams();
        params.set("status", s);
        if (venue) params.set("venue", venue);
        const active = s === status;
        return (
          <Link
            key={s}
            href={`/intents?${params.toString()}`}
            className={
              "rounded border px-2 py-1 " +
              (active
                ? "border-gray-600 bg-gray-800"
                : "border-gray-800 hover:border-gray-700")
            }
          >
            {s}
          </Link>
        );
      })}
      {(venue || status) && (
        <Link
          href="/intents"
          className="ml-2 text-gray-500 underline hover:text-gray-300"
        >
          clear filters
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
    queued: "outline",
    submitted: "secondary",
    filled: "default",
    partial: "secondary",
    rejected: "destructive",
    cancelled: "destructive",
    expired: "outline",
  };
  return <Badge variant={variant[status] ?? "outline"}>{status}</Badge>;
}

function fmtDt(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(11, 19) + "Z";
}
