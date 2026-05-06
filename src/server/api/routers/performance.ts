/**
 * Read-only performance analytics over the positions table.
 *
 * positions is populated by risk-watcher's positions_aggregator from
 * filled oms_intents. closed positions carry realized_pnl_usd; this
 * router rolls them up by strategy + bucket and computes simple
 * trade-Sharpe (mean/stddev of return %).
 *
 * Sharpe-style number is meaningless below ~10 closed trades — we
 * report null until then.
 */
import { sql } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const MIN_TRADES_FOR_SHARPE = 10;

type StrategyRow = {
  strategyId: string;
  slug: string | null;
  bucket: string | null;
  tradeCount: number;
  wins: number;
  losses: number;
  totalPnlUsd: number;
  avgPnlUsd: number;
  avgPnlPct: number | null;
  stddevPnlPct: number | null;
  bestTrade: number;
  worstTrade: number;
  totalFeesUsd: number;
  firstClosedAt: Date | null;
  lastClosedAt: Date | null;
};

type WithMetrics = StrategyRow & {
  winRate: number;
  sharpe: number | null;
  totalNotionalUsd: number;
};

function withMetrics(row: StrategyRow, totalNotionalUsd: number): WithMetrics {
  const winRate = row.tradeCount > 0 ? row.wins / row.tradeCount : 0;
  let sharpe: number | null = null;
  if (
    row.tradeCount >= MIN_TRADES_FOR_SHARPE &&
    row.stddevPnlPct !== null &&
    row.stddevPnlPct > 0 &&
    row.avgPnlPct !== null
  ) {
    sharpe = row.avgPnlPct / row.stddevPnlPct;
  }
  return { ...row, winRate, sharpe, totalNotionalUsd };
}


export const performanceRouter = createTRPCRouter({
  byStrategy: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      WITH closed AS (
        SELECT
          p.strategy_id,
          s.slug,
          s.frontmatter->>'bucket' AS bucket,
          p.realized_pnl_usd,
          p.fees_usd,
          (p.qty * p.avg_entry_price) AS notional,
          CASE
            WHEN p.qty * p.avg_entry_price > 0
            THEN p.realized_pnl_usd / (p.qty * p.avg_entry_price)
            ELSE NULL
          END AS pnl_pct,
          p.closed_at
        FROM positions p
        LEFT JOIN strategies s ON s.id = p.strategy_id
        WHERE p.status = 'closed' AND p.realized_pnl_usd IS NOT NULL
      ),
      open_open AS (
        SELECT
          p.strategy_id,
          COUNT(*)::int AS open_count,
          COALESCE(SUM(p.unrealized_pnl_usd), 0)::float AS open_unrealized
        FROM positions p
        WHERE p.status = 'open'
        GROUP BY p.strategy_id
      )
      SELECT
        c.strategy_id::text        AS "strategyId",
        c.slug,
        c.bucket,
        COUNT(*)::int              AS "tradeCount",
        SUM(CASE WHEN c.realized_pnl_usd > 0 THEN 1 ELSE 0 END)::int AS wins,
        SUM(CASE WHEN c.realized_pnl_usd < 0 THEN 1 ELSE 0 END)::int AS losses,
        COALESCE(SUM(c.realized_pnl_usd), 0)::float AS "totalPnlUsd",
        COALESCE(AVG(c.realized_pnl_usd), 0)::float AS "avgPnlUsd",
        AVG(c.pnl_pct)::float      AS "avgPnlPct",
        STDDEV(c.pnl_pct)::float   AS "stddevPnlPct",
        COALESCE(MAX(c.realized_pnl_usd), 0)::float AS "bestTrade",
        COALESCE(MIN(c.realized_pnl_usd), 0)::float AS "worstTrade",
        COALESCE(SUM(c.fees_usd), 0)::float AS "totalFeesUsd",
        COALESCE(SUM(c.notional), 0)::float AS "totalNotional",
        COALESCE(MAX(o.open_unrealized), 0)::float AS "openUnrealizedPnlUsd",
        COALESCE(MAX(o.open_count), 0)::int AS "openCount",
        MIN(c.closed_at)           AS "firstClosedAt",
        MAX(c.closed_at)           AS "lastClosedAt"
      FROM closed c
      LEFT JOIN open_open o ON o.strategy_id = c.strategy_id
      GROUP BY c.strategy_id, c.slug, c.bucket
      ORDER BY "totalPnlUsd" DESC
    `);
    return (rows as unknown as Array<StrategyRow & {
      totalNotional: number;
      openUnrealizedPnlUsd: number;
      openCount: number;
    }>).map((r) => ({
      ...withMetrics(r, r.totalNotional ?? 0),
      openUnrealizedPnlUsd: r.openUnrealizedPnlUsd ?? 0,
      openCount: r.openCount ?? 0,
    }));
  }),

  byBucket: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      WITH closed AS (
        SELECT
          COALESCE(s.frontmatter->>'bucket', 'unknown') AS bucket,
          p.realized_pnl_usd,
          p.fees_usd,
          (p.qty * p.avg_entry_price) AS notional,
          CASE
            WHEN p.qty * p.avg_entry_price > 0
            THEN p.realized_pnl_usd / (p.qty * p.avg_entry_price)
            ELSE NULL
          END AS pnl_pct,
          p.closed_at
        FROM positions p
        LEFT JOIN strategies s ON s.id = p.strategy_id
        WHERE p.status = 'closed' AND p.realized_pnl_usd IS NOT NULL
      )
      SELECT
        bucket,
        COUNT(*)::int                                          AS "tradeCount",
        SUM(CASE WHEN realized_pnl_usd > 0 THEN 1 ELSE 0 END)::int AS wins,
        SUM(CASE WHEN realized_pnl_usd < 0 THEN 1 ELSE 0 END)::int AS losses,
        COALESCE(SUM(realized_pnl_usd), 0)::float AS "totalPnlUsd",
        COALESCE(AVG(realized_pnl_usd), 0)::float AS "avgPnlUsd",
        AVG(pnl_pct)::float                       AS "avgPnlPct",
        STDDEV(pnl_pct)::float                    AS "stddevPnlPct",
        COALESCE(SUM(notional), 0)::float         AS "totalNotional",
        COALESCE(SUM(fees_usd), 0)::float         AS "totalFeesUsd",
        COALESCE(MAX(realized_pnl_usd), 0)::float AS "bestTrade",
        COALESCE(MIN(realized_pnl_usd), 0)::float AS "worstTrade"
      FROM closed
      GROUP BY bucket
      ORDER BY "totalPnlUsd" DESC
    `);
    return rows as unknown as Array<{
      bucket: string;
      tradeCount: number;
      wins: number;
      losses: number;
      totalPnlUsd: number;
      avgPnlUsd: number;
      avgPnlPct: number | null;
      stddevPnlPct: number | null;
      totalNotional: number;
      totalFeesUsd: number;
      bestTrade: number;
      worstTrade: number;
    }>;
  }),

  overall: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'closed')::int AS "closedCount",
        COUNT(*) FILTER (WHERE status = 'open')::int   AS "openCount",
        COALESCE(SUM(realized_pnl_usd) FILTER (WHERE status = 'closed'), 0)::float AS "totalRealizedPnlUsd",
        COALESCE(SUM(unrealized_pnl_usd) FILTER (WHERE status = 'open'), 0)::float AS "totalUnrealizedPnlUsd",
        COALESCE(SUM(fees_usd), 0)::float AS "totalFeesUsd",
        COALESCE(SUM(qty * avg_entry_price) FILTER (WHERE status = 'open'), 0)::float AS "openExposureUsd",
        COUNT(*) FILTER (WHERE status = 'open' AND marked_at IS NOT NULL)::int AS "markedCount",
        MIN(marked_at) FILTER (WHERE status = 'open' AND marked_at IS NOT NULL) AS "oldestMarkAt",
        SUM(CASE WHEN status = 'closed' AND realized_pnl_usd > 0 THEN 1 ELSE 0 END)::int AS wins,
        SUM(CASE WHEN status = 'closed' AND realized_pnl_usd < 0 THEN 1 ELSE 0 END)::int AS losses,
        MAX(realized_pnl_usd) FILTER (WHERE status = 'closed')::float AS "bestTrade",
        MIN(realized_pnl_usd) FILTER (WHERE status = 'closed')::float AS "worstTrade"
      FROM positions
    `);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0] ?? {};
    return row;
  }),
});
