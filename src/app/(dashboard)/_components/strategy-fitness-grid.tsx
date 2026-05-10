"use client";

/**
 * Strategy Fitness — sortable grid of all strategies with closed positions.
 * Color-coded by Sharpe proxy. Refreshes every 30s.
 */

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

const WINDOWS = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "all", label: "ALL" },
] as const;

type Win = (typeof WINDOWS)[number]["value"];
type SortBy = "pnl" | "winrate" | "sharpe" | "n";

export function StrategyFitnessGrid() {
  const [window, setWindow] = useState<Win>("7d");
  const [sortBy, setSortBy] = useState<SortBy>("pnl");
  const { data, isLoading } = api.dashboard.strategyFitness.useQuery(
    { window },
    { refetchInterval: 30_000, staleTime: 20_000 },
  );

  const sorted = (data ?? []).slice().sort((a, b) => {
    switch (sortBy) {
      case "pnl":
        return b.total_pnl_usd - a.total_pnl_usd;
      case "winrate":
        return (b.win_rate ?? 0) - (a.win_rate ?? 0);
      case "sharpe":
        return (b.sharpe_proxy ?? -999) - (a.sharpe_proxy ?? -999);
      case "n":
        return b.n_closed - a.n_closed;
      default:
        return 0;
    }
  });

  const totalPnl = sorted.reduce((s, r) => s + r.total_pnl_usd, 0);
  const totalClosed = sorted.reduce((s, r) => s + r.n_closed, 0);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Strategy Fitness
          </h2>
          <p className="text-[10px] text-zinc-600">
            {sorted.length} strategies · {totalClosed} closed · net{" "}
            <span className={totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {fmtUsd(totalPnl)}
            </span>{" "}
            · refreshes every 30s
          </p>
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
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-zinc-900/60" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center text-sm italic text-zinc-600">
          No closed positions in window — strategies haven't fired or all open.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="pb-2 pr-3 text-left font-semibold">Strategy</th>
                <th className="pb-2 pr-3 text-left font-semibold">Venue</th>
                <SortableTh label="N" k="n" sortBy={sortBy} onClick={setSortBy} />
                <SortableTh label="Win" k="winrate" sortBy={sortBy} onClick={setSortBy} />
                <SortableTh label="PnL" k="pnl" sortBy={sortBy} onClick={setSortBy} />
                <th className="pb-2 pr-3 text-right font-semibold">Avg/trade</th>
                <SortableTh label="Sharpe*" k="sharpe" sortBy={sortBy} onClick={setSortBy} />
                <th className="pb-2 text-center font-semibold">Health</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <StrategyRow key={`${s.strategy_id}-${s.venue}`} s={s} />
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-zinc-600">
            * Sharpe proxy = mean(per-trade pnl) / stddev. Not annualized; useful for relative ranking.
          </p>
        </div>
      )}
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortBy,
  onClick,
}: {
  label: string;
  k: SortBy;
  sortBy: SortBy;
  onClick: (k: SortBy) => void;
}) {
  const active = sortBy === k;
  return (
    <th
      className={`pb-2 pr-3 text-right font-semibold ${
        active ? "text-emerald-400" : "text-zinc-500"
      } cursor-pointer select-none hover:text-zinc-200`}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label} {active && <span>↓</span>}
      </span>
    </th>
  );
}

function StrategyRow({
  s,
}: {
  s: {
    strategy_id: string;
    slug: string;
    name: string;
    venue: string;
    n_closed: number;
    wins: number;
    losses: number;
    total_pnl_usd: number;
    avg_pnl_usd: number;
    win_rate: number | null;
    sharpe_proxy: number | null;
  };
}) {
  const pnlPos = s.total_pnl_usd >= 0;
  const sharpe = s.sharpe_proxy;
  const fitness = healthOf(s);

  return (
    <tr className="border-b border-zinc-900/60 hover:bg-zinc-900/30">
      <td className="py-1.5 pr-3">
        <Link
          href={`/performance/${s.slug}`}
          className="block max-w-[260px] truncate font-medium text-zinc-300 hover:text-emerald-300"
          title={s.name}
        >
          {s.name}
        </Link>
      </td>
      <td className="py-1.5 pr-3 text-zinc-500">{s.venue}</td>
      <td className="py-1.5 pr-3 text-right font-mono text-zinc-400">{s.n_closed}</td>
      <td className="py-1.5 pr-3 text-right font-mono">
        <span className={
          s.win_rate === null ? "text-zinc-600"
          : s.win_rate >= 0.5 ? "text-emerald-400"
          : s.win_rate >= 0.4 ? "text-amber-400"
          : "text-rose-400"
        }>
          {s.win_rate === null ? "—" : `${Math.round(s.win_rate * 100)}%`}
        </span>
      </td>
      <td className={`py-1.5 pr-3 text-right font-mono ${
        pnlPos ? "text-emerald-400" : "text-rose-400"
      }`}>
        {fmtUsd(s.total_pnl_usd, { sign: true })}
      </td>
      <td className={`py-1.5 pr-3 text-right font-mono ${
        s.avg_pnl_usd >= 0 ? "text-zinc-400" : "text-rose-400"
      }`}>
        {fmtUsd(s.avg_pnl_usd, { sign: true })}
      </td>
      <td className="py-1.5 pr-3 text-right font-mono">
        <span className={
          sharpe === null ? "text-zinc-600"
          : sharpe >= 1 ? "text-emerald-300 font-semibold"
          : sharpe >= 0 ? "text-emerald-500"
          : sharpe >= -0.5 ? "text-amber-400"
          : "text-rose-400"
        }>
          {sharpe === null ? "—" : sharpe.toFixed(2)}
        </span>
      </td>
      <td className="py-1.5 text-center">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
          fitness === "strong" ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
          : fitness === "ok" ? "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30"
          : fitness === "bleed" ? "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/30"
          : "bg-zinc-800/40 text-zinc-500 ring-1 ring-inset ring-zinc-800"
        }`}>
          {fitness === "strong" ? "● healthy"
            : fitness === "ok" ? "● mixed"
            : fitness === "bleed" ? "● bleed"
            : "○ small-N"}
        </span>
      </td>
    </tr>
  );
}

function healthOf(s: {
  n_closed: number;
  total_pnl_usd: number;
  sharpe_proxy: number | null;
}): "strong" | "ok" | "bleed" | "small" {
  if (s.n_closed < 5) return "small";
  if (s.total_pnl_usd > 0 && (s.sharpe_proxy ?? 0) >= 0.3) return "strong";
  if (s.total_pnl_usd >= 0) return "ok";
  return "bleed";
}

function fmtUsd(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}
