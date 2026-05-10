"use client";

/**
 * Recent Activity — unified feed of closed trades + halt events.
 * Polls every 10s.
 */

import { api } from "~/trpc/react";

export function RecentActivityFeed() {
  const { data, isLoading } = api.dashboard.recentActivity.useQuery(
    { limit: 25 },
    { refetchInterval: 10_000, staleTime: 5_000 },
  );

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            Recent Activity
          </h2>
          <p className="text-[10px] text-zinc-600">trade fills + halt events · refreshes every 10s</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          live
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-zinc-900/60" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm italic text-zinc-600">
          No activity in the last few cycles.
        </p>
      ) : (
        <ul className="max-h-96 space-y-0.5 overflow-y-auto pr-1 font-mono text-[11px]">
          {(data ?? []).map((item, idx) => (
            <ActivityItem key={idx} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

type Item =
  | { kind: "trade"; at: Date; venue: string; asset: string; side: string;
      pnl_usd: number | null; strategy_slug: string | null; }
  | { kind: "halt"; at: Date; level: number; halt_kind: string; scope: string;
      cleared_at: Date | null; };

function ActivityItem({ item }: { item: Item }) {
  const time = new Date(item.at);
  const ts = time.toISOString().slice(11, 19);

  if (item.kind === "trade") {
    const pos = (item.pnl_usd ?? 0) >= 0;
    return (
      <li className="grid grid-cols-12 items-center gap-2 rounded px-2 py-1 hover:bg-zinc-900/40">
        <span className="col-span-2 text-zinc-600">{ts}</span>
        <span className="col-span-1 rounded bg-zinc-900 px-1 py-0.5 text-center text-[9px] uppercase text-zinc-400">
          {item.venue.slice(0, 4)}
        </span>
        <span className="col-span-2 text-zinc-300">{item.asset}</span>
        <span className={`col-span-1 text-center text-[10px] font-bold ${
          item.side === "buy" || item.side === "long" ? "text-emerald-400" : "text-rose-400"
        }`}>
          {item.side.toUpperCase().slice(0, 4)}
        </span>
        <span className="col-span-4 truncate text-[10px] text-zinc-500" title={item.strategy_slug ?? ""}>
          {item.strategy_slug ?? "—"}
        </span>
        <span className={`col-span-2 text-right font-bold ${
          pos ? "text-emerald-400" : "text-rose-400"
        }`}>
          {item.pnl_usd === null ? "—" : fmtUsd(item.pnl_usd, { sign: true })}
        </span>
      </li>
    );
  }

  // Halt
  return (
    <li className="grid grid-cols-12 items-center gap-2 rounded border-l-2 border-rose-500 bg-rose-950/20 px-2 py-1">
      <span className="col-span-2 text-zinc-600">{ts}</span>
      <span className="col-span-1 rounded bg-rose-500/20 px-1 py-0.5 text-center text-[9px] font-bold text-rose-300">
        L{item.level}
      </span>
      <span className="col-span-3 font-bold uppercase text-rose-300">
        {item.halt_kind}
      </span>
      <span className="col-span-4 truncate text-[10px] text-zinc-400" title={item.scope}>
        scope: {item.scope}
      </span>
      <span className="col-span-2 text-right text-[10px]">
        {item.cleared_at ? (
          <span className="text-emerald-500">cleared</span>
        ) : (
          <span className="text-rose-300 font-bold">ACTIVE</span>
        )}
      </span>
    </li>
  );
}

function fmtUsd(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}
