import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";

import { StatusControls } from "./StatusControls";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await api.leads.byId({ id });
  if (!lead) notFound();

  const factors = (lead.scoreFactors ?? {}) as Record<string, number>;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <Link href="/leads" className="text-xs text-gray-500 hover:text-gray-300 mb-2 block">
          ← all leads
        </Link>
        <h1 className="text-2xl font-semibold">{lead.businessName}</h1>
        <p className="text-sm text-gray-400">
          {lead.niche} · {lead.geoCity}, {lead.geoCountry}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-6">
        <Field label="Fit score">
          <span className="text-3xl font-semibold font-mono">{lead.fitScore.toFixed(2)}</span>
          <span className="block text-xs text-gray-500 mt-1">
            higher = bigger gap; better target
          </span>
        </Field>
        <Field label="Status">
          <StatusControls leadId={lead.id} current={lead.status} />
        </Field>
        <Field label="Rating">
          <span className="text-xl">{lead.businessRating?.toFixed(1) ?? "—"}</span>
          <span className="ml-2 text-xs text-gray-500">
            ({lead.businessReviewCount?.toLocaleString() ?? 0} reviews)
          </span>
        </Field>
        <Field label="Phone">
          <span className="font-mono text-sm">{lead.businessPhone ?? "—"}</span>
        </Field>
        <Field label="Address">
          <span className="text-sm text-gray-300">{lead.businessAddress ?? "—"}</span>
        </Field>
        <Field label="Website">
          {lead.businessWebsiteUrl ? (
            <a
              href={lead.businessWebsiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm break-all"
            >
              {lead.businessWebsiteUrl}
            </a>
          ) : (
            <span className="text-red-400 text-sm">none</span>
          )}
        </Field>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Score factors
        </h2>
        <div className="rounded-lg border border-gray-800 p-4 font-mono text-sm">
          {Object.keys(factors).length === 0 ? (
            <span className="text-gray-500">no penalties — good site, less obvious target</span>
          ) : (
            Object.entries(factors)
              .sort(([, a], [, b]) => b - a)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="text-green-400">+{v.toFixed(2)}</span>
                </div>
              ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Website analysis
        </h2>
        <div className="rounded-lg border border-gray-800 p-4 grid grid-cols-2 gap-3 text-sm">
          <Pair k="HTTPS" v={fmtBool(lead.websiteHttps)} />
          <Pair k="Mobile score" v={lead.websiteMobileScore ?? "—"} />
          <Pair k="Has booking widget" v={fmtBool(lead.websiteHasBooking)} />
          <Pair k="Last modified" v={lead.websiteLastModified ?? "—"} />
        </div>
      </section>

      <section className="text-xs text-gray-500 space-y-1">
        <div>id: <code className="font-mono">{lead.id}</code></div>
        <div>google_place_id: <code className="font-mono">{lead.googlePlaceId ?? "—"}</code></div>
        <div>created: {new Date(lead.createdAt).toLocaleString()}</div>
        <div>updated: {new Date(lead.updatedAt).toLocaleString()}</div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function Pair({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

function fmtBool(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v ? "✓" : "✗";
}
