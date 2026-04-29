"use client";

import { api } from "~/trpc/react";

type HorizonRow = {
  horizon: string;
  total: string | number;
  wins: number | null;
  losses: number | null;
  flats: number | null;
  expired: number | null;
  avg_pct: number | null;
  last_evaluated_at: string | Date | null;
};

type DirectionRow = {
  direction: string;
  n: number;
  avgConfidence: number;
};

type OutcomeRow = {
  outcome: string;
  horizon: string;
  price_change_pct: number | null;
  notes: string | null;
  evaluated_at: string | Date;
  asset: string;
  direction: string;
  confidence: number;
};

type Trades = {
  total: number;
  open: number;
  wins: number;
  losses: number;
  total_pnl: number;
  avg_pnl: number;
};

const HORIZON_ORDER = ["4h", "1d", "7d", "trade_close", "poly_resolved"];

function rankHorizon(h: string): number {
  const i = HORIZON_ORDER.indexOf(h);
  return i === -1 ? 999 : i;
}

export function StrategyPerformance({ strategyId }: { strategyId: string }) {
  const { data, isLoading } = api.strategies.performance.useQuery({
    strategyId,
    sinceDays: 30,
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading performance…</p>;
  }
  if (!data) {
    return <p className="text-sm text-gray-500">No performance data yet.</p>;
  }

  const horizons = ((data.byHorizon as unknown as HorizonRow[]) ?? [])
    .slice()
    .sort((a, b) => rankHorizon(a.horizon) - rankHorizon(b.horizon));
  const directions = (data.byDirection as DirectionRow[]) ?? [];
  const trades = data.trades as unknown as Trades;
  const recent = (data.recentOutcomes as unknown as OutcomeRow[]) ?? [];

  const totalSignals = directions.reduce((s, d) => s + Number(d.n ?? 0), 0);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Performance · last {data.sinceDays} days
        </h2>

        {/* Top-line: signals + trades summary */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Stat label="Signals fired" value={totalSignals.toString()} />
          <Stat
            label="Trades opened"
            value={`${trades.total} (${trades.open} open)`}
          />
          <Stat
            label="Closed-trade win rate"
            value={
              trades.wins + trades.losses > 0
                ? `${((trades.wins / (trades.wins + trades.losses)) * 100).toFixed(0)}%`
                : "—"
            }
            sub={`${trades.wins}W / ${trades.losses}L`}
          />
          <Stat
            label="Total paper PnL"
            value={`${trades.total_pnl >= 0 ? "+" : ""}$${trades.total_pnl.toFixed(2)}`}
            tone={trades.total_pnl >= 0 ? "good" : "bad"}
          />
        </div>

        {/* Per-horizon outcome accuracy */}
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left font-mono text-xs">horizon</th>
                <th className="px-3 py-2 text-right font-mono text-xs">total</th>
                <th className="px-3 py-2 text-right font-mono text-xs">wins</th>
                <th className="px-3 py-2 text-right font-mono text-xs">losses</th>
                <th className="px-3 py-2 text-right font-mono text-xs">flat</th>
                <th className="px-3 py-2 text-right font-mono text-xs">expired</th>
                <th className="px-3 py-2 text-right font-mono text-xs">accuracy</th>
                <th className="px-3 py-2 text-right font-mono text-xs">avg pct</th>
              </tr>
            </thead>
            <tbody>
              {horizons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-3 text-center text-gray-500 text-xs">
                    No outcomes scored yet for this strategy.
                  </td>
                </tr>
              ) : (
                horizons.map((h) => {
                  const total = Number(h.total ?? 0);
                  const wins = Number(h.wins ?? 0);
                  const losses = Number(h.losses ?? 0);
                  const decisive = wins + losses;
                  const accuracy = decisive > 0 ? wins / decisive : null;
                  return (
                    <tr key={h.horizon} className="border-t border-gray-800 font-mono text-xs">
                      <td className="px-3 py-1.5">{h.horizon}</td>
                      <td className="px-3 py-1.5 text-right">{total}</td>
                      <td className="px-3 py-1.5 text-right text-emerald-400">{wins}</td>
                      <td className="px-3 py-1.5 text-right text-red-400">{losses}</td>
                      <td className="px-3 py-1.5 text-right text-gray-400">{Number(h.flats ?? 0)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500">{Number(h.expired ?? 0)}</td>
                      <td className="px-3 py-1.5 text-right">
                        {accuracy === null
                          ? "—"
                          : `${(accuracy * 100).toFixed(0)}%`}
                      </td>
                      <td className={`px-3 py-1.5 text-right ${(h.avg_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {h.avg_pct === null ? "—" : `${(h.avg_pct * 100).toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          <span className="text-gray-400">Horizons explained:</span>{" "}
          <code className="text-xs">4h</code>/<code className="text-xs">1d</code>/<code className="text-xs">7d</code> are
          outcome-scorer price-only evaluations · <code className="text-xs">trade_close</code> is
          actual paper-trade close · <code className="text-xs">poly_resolved</code> is paper-poly settlement.
        </p>
      </div>

      {/* Direction split */}
      {directions.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Signal direction mix
          </h3>
          <div className="flex flex-wrap gap-2">
            {directions.map((d) => (
              <span
                key={d.direction}
                className="rounded border border-gray-700 px-2 py-1 text-xs font-mono"
              >
                {d.direction}: {d.n} (avg conf {d.avgConfidence?.toFixed(2)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent outcomes */}
      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recent outcomes (last {recent.length})
          </h3>
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left font-mono">when</th>
                  <th className="px-3 py-2 text-left font-mono">asset</th>
                  <th className="px-3 py-2 text-left font-mono">dir</th>
                  <th className="px-3 py-2 text-left font-mono">horizon</th>
                  <th className="px-3 py-2 text-left font-mono">outcome</th>
                  <th className="px-3 py-2 text-right font-mono">pct</th>
                  <th className="px-3 py-2 text-left font-mono">notes</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} className="border-t border-gray-800 font-mono">
                    <td className="px-3 py-1 text-gray-500">
                      {new Date(r.evaluated_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-1">{r.asset}</td>
                    <td className="px-3 py-1 text-gray-400">{r.direction}</td>
                    <td className="px-3 py-1 text-gray-400">{r.horizon}</td>
                    <td
                      className={`px-3 py-1 ${
                        r.outcome === "win"
                          ? "text-emerald-400"
                          : r.outcome === "loss"
                            ? "text-red-400"
                            : "text-gray-500"
                      }`}
                    >
                      {r.outcome}
                    </td>
                    <td
                      className={`px-3 py-1 text-right ${(r.price_change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {r.price_change_pct === null
                        ? "—"
                        : `${(r.price_change_pct * 100).toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-1 text-gray-500 truncate max-w-md" title={r.notes ?? ""}>
                      {r.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-gray-100";
  return (
    <div className="rounded-lg border border-gray-800 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-mono ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}
