import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  killEvents,
  macroEvents,
  polyPositions,
  riskLedger,
  trades,
} from "~/server/db/schema";

/**
 * Aggregated read-only view for the trading-OS landing page.
 * Combines latest snapshots from risk_ledger + open positions counts +
 * recent kill events + macro extremes into one round-trip for the UI.
 */
export const dashboardRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    // 1. Latest risk_ledger snapshot (total/intraday — written every 60s)
    const latestRisk = await ctx.db
      .select()
      .from(riskLedger)
      .where(and(eq(riskLedger.scope, "total"), eq(riskLedger.period, "intraday")))
      .orderBy(desc(riskLedger.snapshotAt))
      .limit(1);

    // 2. Open positions across asset classes (today's data: trades + polyPositions)
    const openTrades = await ctx.db
      .select()
      .from(trades)
      .where(inArray(trades.status, ["pending", "open", "partial"]));
    const openPolys = await ctx.db
      .select()
      .from(polyPositions)
      .where(inArray(polyPositions.status, ["pending", "open", "partial"]));

    // Bucket by asset_class. Today everything in `trades` is crypto/stocks/forex
    // mixed; we split heuristically by ticker shape until we add the column.
    const cryptoOpen = openTrades.filter((t) =>
      ["BTC", "ETH", "SOL", "DOGE", "ADA", "BNB", "XRP", "DOT"].some((sym) =>
        t.asset.toUpperCase().includes(sym),
      ),
    );
    const stocksOpen = openTrades.filter(
      (t) => !cryptoOpen.includes(t),
    );

    const sumExposure = (rows: typeof openTrades) =>
      rows.reduce((sum, t) => sum + (t.sizeUsd ?? 0), 0);

    // 3. Active kill events
    const activeKills = await ctx.db
      .select()
      .from(killEvents)
      .where(isNull(killEvents.clearedAt))
      .orderBy(desc(killEvents.triggeredAt))
      .limit(5);

    // 4. Recent extreme macro readings (last 30 days, |z| >= 2)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const macroExtremes = await ctx.db
      .select()
      .from(macroEvents)
      .where(
        and(
          gte(macroEvents.eventAt, since30d),
          inArray(macroEvents.interpretation, ["extreme-long", "extreme-short"]),
        ),
      )
      .orderBy(desc(macroEvents.eventAt))
      .limit(8);

    // 5. Today's win/loss + fees from the snapshot
    const r = latestRisk[0];

    return {
      risk: {
        snapshotAt: r?.snapshotAt ?? null,
        pnlUsd: r?.pnlUsd ?? 0,
        pnlPct: r?.pnlPct ?? 0,
        drawdownUsd: r?.drawdownUsd ?? 0,
        drawdownPct: r?.drawdownPct ?? 0,
        openPositionsCount: r?.openPositionsCount ?? 0,
        exposureUsd: r?.exposureUsd ?? 0,
        feesUsd: r?.feesUsd ?? 0,
        slippageUsd: r?.slippageUsd ?? 0,
        tradesClosed: r?.tradesClosed ?? 0,
        tradesWon: r?.tradesWon ?? 0,
        tradesLost: r?.tradesLost ?? 0,
      },
      positions: {
        crypto: {
          count: cryptoOpen.length,
          exposureUsd: sumExposure(cryptoOpen),
        },
        stocks: {
          count: stocksOpen.length,
          exposureUsd: sumExposure(stocksOpen),
        },
        forex: { count: 0, exposureUsd: 0 }, // no FX yet
        predictions: {
          count: openPolys.length,
          exposureUsd: openPolys.reduce((s, p) => s + (p.stakeUsd ?? 0), 0),
        },
      },
      activeKills,
      macroExtremes,
      // Static limits from project_trading_stack.md (TODO: move to config table)
      limits: {
        dailyDdPct: 5,
        totalDdPct: 20,
        correlationThreshold: 0.8,
      },
    };
  }),

  /**
   * PnL grouped by venue + time window. Reads from `positions` table
   * which is populated by adapters; covers binance, alpaca, polymarket.
   *
   * Window options:
   *   - 24h:  last 24 hours of opened/closed positions
   *   - 7d:   last 7 days
   *   - 30d:  last 30 days
   *   - all:  unbounded
   *
   * Returned shape per venue: {
   *   venue, n_open, n_closed, realized_usd, unrealized_usd, win_rate
   * }
   */
  pnlByVenue: protectedProcedure
    .input(
      z.object({
        window: z.enum(["24h", "7d", "30d", "all"]).default("24h"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sinceMap: Record<string, Date | null> = {
        "24h": new Date(Date.now() - 24 * 60 * 60 * 1000),
        "7d":  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        "30d": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        "all": null,
      };
      const since = sinceMap[input.window];

      const baseFilter = since ? sql`opened_at >= ${since}` : sql`true`;

      const rows = await ctx.db.execute<{
        venue: string;
        status: string;
        n: number;
        realized: number | null;
        unrealized: number | null;
        wins: number;
        losses: number;
      }>(sql`
        SELECT
          venue,
          status,
          COUNT(*)::int AS n,
          COALESCE(SUM(realized_pnl_usd), 0)::float AS realized,
          COALESCE(SUM(unrealized_pnl_usd), 0)::float AS unrealized,
          SUM(CASE WHEN realized_pnl_usd > 0 THEN 1 ELSE 0 END)::int AS wins,
          SUM(CASE WHEN realized_pnl_usd < 0 THEN 1 ELSE 0 END)::int AS losses
        FROM positions
        WHERE ${baseFilter}
        GROUP BY venue, status
        ORDER BY venue, status
      `);

      // Aggregate per venue
      const byVenue: Record<string, {
        venue: string;
        n_open: number;
        n_closed: number;
        realized_usd: number;
        unrealized_usd: number;
        wins: number;
        losses: number;
      }> = {};

      for (const r of rows) {
        const v = r.venue;
        byVenue[v] ??= {
          venue: v,
          n_open: 0,
          n_closed: 0,
          realized_usd: 0,
          unrealized_usd: 0,
          wins: 0,
          losses: 0,
        };
        if (r.status === "open" || r.status === "partial") {
          byVenue[v].n_open += r.n;
          byVenue[v].unrealized_usd += r.unrealized ?? 0;
        } else if (r.status === "closed") {
          byVenue[v].n_closed += r.n;
          byVenue[v].realized_usd += r.realized ?? 0;
          byVenue[v].wins += r.wins;
          byVenue[v].losses += r.losses;
        }
      }

      return Object.values(byVenue).map((v) => ({
        ...v,
        win_rate: v.n_closed > 0 ? v.wins / v.n_closed : null,
        total_pnl_usd: v.realized_usd + v.unrealized_usd,
      })).sort((a, b) => b.total_pnl_usd - a.total_pnl_usd);
    }),

  /**
   * Strategy-level fitness scorecard. Aggregates closed positions per
   * strategy with win-rate + total realized PnL + Sharpe proxy.
   *
   * Sharpe proxy = mean(per-trade pnl) / stddev(per-trade pnl). NOT a
   * true Sharpe (no risk-free rate, no annualization), but useful for
   * relative ranking.
   *
   * Strategies with < 5 closed trades are flagged but not filtered out.
   */
  strategyFitness: protectedProcedure
    .input(
      z.object({
        window: z.enum(["24h", "7d", "30d", "all"]).default("7d"),
        venue: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const window = input?.window ?? "7d";
      const venue = input?.venue;

      const sinceMap: Record<string, Date | null> = {
        "24h": new Date(Date.now() - 24 * 60 * 60 * 1000),
        "7d":  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        "30d": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        "all": null,
      };
      const since = sinceMap[window];
      const sinceFilter = since ? sql`AND p.closed_at >= ${since}` : sql``;
      const venueFilter = venue ? sql`AND p.venue = ${venue}` : sql``;

      const rows = await ctx.db.execute<{
        strategy_id: string;
        slug: string;
        name: string;
        venue: string;
        n_closed: number;
        wins: number;
        losses: number;
        total_pnl: number;
        avg_pnl: number;
        stddev_pnl: number;
      }>(sql`
        SELECT
          s.id AS strategy_id,
          s.slug,
          s.name,
          p.venue,
          COUNT(*)::int AS n_closed,
          SUM(CASE WHEN p.realized_pnl_usd > 0 THEN 1 ELSE 0 END)::int AS wins,
          SUM(CASE WHEN p.realized_pnl_usd < 0 THEN 1 ELSE 0 END)::int AS losses,
          COALESCE(SUM(p.realized_pnl_usd), 0)::float AS total_pnl,
          COALESCE(AVG(p.realized_pnl_usd), 0)::float AS avg_pnl,
          COALESCE(STDDEV(p.realized_pnl_usd), 0)::float AS stddev_pnl
        FROM positions p
        JOIN strategies s ON s.id = p.strategy_id
        WHERE p.status = 'closed'
        ${sinceFilter}
        ${venueFilter}
        GROUP BY s.id, s.slug, s.name, p.venue
        ORDER BY total_pnl DESC
      `);

      return rows.map((r) => ({
        strategy_id: r.strategy_id,
        slug: r.slug,
        name: r.name,
        venue: r.venue,
        n_closed: r.n_closed,
        wins: r.wins,
        losses: r.losses,
        total_pnl_usd: r.total_pnl,
        avg_pnl_usd: r.avg_pnl,
        win_rate: r.n_closed > 0 ? r.wins / r.n_closed : null,
        sharpe_proxy: r.stddev_pnl > 0 ? r.avg_pnl / r.stddev_pnl : null,
      }));
    }),

  /**
   * Unified recent activity feed: closed positions + active kill events
   * merged + sorted by time descending. Limit default 20.
   */
  recentActivity: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const recentClosed = await ctx.db.execute<{
        id: string;
        venue: string;
        asset: string;
        side: string;
        realized_pnl_usd: number | null;
        closed_at: Date;
        strategy_slug: string | null;
      }>(sql`
        SELECT p.id, p.venue, p.asset, p.side, p.realized_pnl_usd,
               p.closed_at, s.slug AS strategy_slug
        FROM positions p
        LEFT JOIN strategies s ON s.id = p.strategy_id
        WHERE p.status = 'closed' AND p.closed_at IS NOT NULL
        ORDER BY p.closed_at DESC
        LIMIT ${limit}
      `);

      const recentKills = await ctx.db
        .select()
        .from(killEvents)
        .orderBy(desc(killEvents.triggeredAt))
        .limit(limit);

      type Item =
        | { kind: "trade"; at: Date; venue: string; asset: string; side: string;
            pnl_usd: number | null; strategy_slug: string | null; }
        | { kind: "halt"; at: Date; level: number; halt_kind: string; scope: string;
            cleared_at: Date | null; };

      const items: Item[] = [
        ...recentClosed.map((r) => ({
          kind: "trade" as const,
          at: r.closed_at,
          venue: r.venue,
          asset: r.asset,
          side: r.side,
          pnl_usd: r.realized_pnl_usd,
          strategy_slug: r.strategy_slug,
        })),
        ...recentKills.map((k) => ({
          kind: "halt" as const,
          at: k.triggeredAt,
          level: k.level ?? 0,
          halt_kind: k.kind,
          scope: k.scope,
          cleared_at: k.clearedAt,
        })),
      ];

      items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return items.slice(0, limit);
    }),
});
