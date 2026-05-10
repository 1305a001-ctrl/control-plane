"use client";

/**
 * PnL strip — displays realized + unrealized PnL grouped by venue
 * across selectable time windows. Polls every 15s for near-live.
 *
 * Each venue card shows:
 *   - venue name + status dot (green=positive, red=negative)
 *   - large total PnL (realized + unrealized)
 *   - n_open / n_closed counts
 *   - win-rate inline meter
 *   - tiny trend bar
 */

import { useState } from "react";
import { api } from "~/trpc/react";

const WINDOWS = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "all", label: "ALL" },
] as const;

type Win = (typeof WINDOWS)[number]["value"];

const VENUE_LABEL: Record<string, string> = {
  alpaca: "Alpaca · stocks",
  binance: "Binance · crypto",
  polymarket: "Polymarket · predictions",
  oanda: "OANDA · forex",
};

export function PnLVenueStrip() {
  const [window, setWindow] = useState<Win>("24h");
  const { data, isLoading } = api.dashboard.pnlByVenue.useQuery(
    { window },
    { refetchInterval: 15_000, staleTime: 10_000 },
  );

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            PnL by Venue
          </h2>
          <p className="text-[10px] text-zinc-600">refreshes every 15s</p>
        </div>
        <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setWindow(w.value)}
              className={`rounded px-2.5 py-1 text-xs font-mono font-semibold transition-colors ${
                window === w.value
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(data ?? []).length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm italic text-zinc-600">
              No positions in window — adapters quiet.
            </p>
          ) : (
            (data ?? []).map((v) => <VenueCard key={v.venue} venue={v} />)
          )}
        </div>
      )}
    </div>
  );
}

function VenueCard({
  venue,
}: {
  venue: {
    venue: string;
    n_open: number;
    n_closed: number;
    realized_usd: number;
    unrealized_usd: number;
    total_pnl_usd: number;
    win_rate: number | null;
  };
}) {
  const pos = venue.total_pnl_usd >= 0;
  const tone = pos ? "emerald" : "rose";
  const wr = venue.win_rate ?? 0;
  const wrPct = Math.round(wr * 100);
  const label = VENUE_LABEL[venue.venue] ?? venue.venue;

  return (
    <div
      className={`group relative overflow-hidden rounded-md border bg-zinc-950 p-3 transition-colors ${
        pos
          ? "border-emerald-900/60 hover:border-emerald-500/40"
          : "border-rose-900/60 hover:border-rose-500/40"
      }`}
    >
      {/* Glow accent on the left */}
      <div
        className={`absolute left-0 top-0 h-full w-0.5 ${
          pos ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />

      <div className="ml-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
          <span className="font-semibold text-zinc-300">{label}</span>
          <span className={`flex items-center gap-1 ${
            pos ? "text-emerald-400" : "text-rose-400"
          }`}>
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${
              pos ? "bg-emerald-400" : "bg-rose-400"
            }`} />
            LIVE
          </span>
        </div>

        <div className={`mt-1 font-mono text-2xl font-bold tracking-tight ${
          pos ? "text-emerald-300" : "text-rose-300"
        }`}>
          {fmtUsd(venue.total_pnl_usd, { sign: true })}
        </div>

        <div className="mt-2 flex items-baseline justify-between text-[11px] text-zinc-500">
          <span>
            <span className="text-zinc-300">{venue.n_open}</span> open ·{" "}
            <span className="text-zinc-300">{venue.n_closed}</span> closed
          </span>
          <span>
            R <span className={`font-mono ${venue.realized_usd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {fmtUsdShort(venue.realized_usd)}
            </span>{" · "}
            U <span className={`font-mono ${venue.unrealized_usd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {fmtUsdShort(venue.unrealized_usd)}
            </span>
          </span>
        </div>

        {/* Win rate meter */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">win rate</span>
            <span className={`font-mono ${
              wr >= 0.5 ? "text-emerald-400" : wr >= 0.4 ? "text-amber-400" : "text-rose-400"
            }`}>
              {venue.win_rate === null ? "—" : `${wrPct}%`}
            </span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-900">
            <div
              className={`h-full transition-all ${
                wr >= 0.5 ? "bg-emerald-500" : wr >= 0.4 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${wrPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtUsd(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtUsdShort(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}
