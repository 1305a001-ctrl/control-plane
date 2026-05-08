/**
 * Research router — surfaces signal-quality + source-quality analytics.
 *
 * Backed by signal_outcomes (populated daily by outcome-scorer). Joins
 * to articles via market_signals.source_article_ids[] to attribute
 * outcomes to the news source(s) that produced them.
 *
 * Note: a single signal can have multiple outcomes (one per evaluation
 * horizon — 1h / 4h / 24h). Counts in the by-source query represent
 * (signal × horizon) pairs, not distinct signals. The horizon column
 * surfaces the split so it's clear which horizon a source actually
 * predicts well at.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";


export const researchRouter = createTRPCRouter({
  /**
   * Per-source quality scorecard.
   *
   * For each news source: how many articles produced signals, how many
   * signal-outcome pairs they generated, win/loss/flat split, and hit
   * rate over decisive (non-flat) outcomes.
   *
   * `lookbackDays` parameter scopes the evaluation window. Default 7 days
   * — enough for stat significance on most sources without including
   * stale source mixes.
   */
  bySource: protectedProcedure
    .input(z.object({
      lookbackDays: z.number().int().min(1).max(90).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const days = input.lookbackDays;
      const rows = await ctx.db.execute(sql`
        WITH outcomes_in_window AS (
          SELECT o.id, o.signal_id, o.outcome, o.evaluation_horizon,
                 o.price_change_pct
          FROM signal_outcomes o
          WHERE o.evaluated_at >= NOW() - make_interval(days => ${days})
        ),
        per_signal_source AS (
          -- Each signal can have multiple source_article_ids; explode +
          -- attribute proportionally (each source gets credit for the
          -- signal's outcomes 1 / N_sources times). Simpler than
          -- per-source weighted: count each (signal, source) pair as 1
          -- outcome and divide later if needed.
          SELECT s.id AS signal_id, a.source
          FROM market_signals s
          JOIN articles a ON a.id = ANY(s.source_article_ids)
        )
        SELECT
          pss.source,
          COUNT(DISTINCT pss.signal_id)::int                 AS "signalCount",
          COUNT(*)::int                                      AS "outcomeCount",
          SUM(CASE WHEN o.outcome = 'win' THEN 1 ELSE 0 END)::int  AS wins,
          SUM(CASE WHEN o.outcome = 'loss' THEN 1 ELSE 0 END)::int AS losses,
          SUM(CASE WHEN o.outcome = 'flat' THEN 1 ELSE 0 END)::int AS flats,
          SUM(CASE WHEN o.outcome = 'expired' THEN 1 ELSE 0 END)::int AS expired,
          ROUND(AVG(o.price_change_pct)::numeric, 4)::float  AS "avgPriceChange",
          ROUND(STDDEV(o.price_change_pct)::numeric, 4)::float AS "stddevPriceChange"
        FROM per_signal_source pss
        JOIN outcomes_in_window o ON o.signal_id = pss.signal_id
        GROUP BY pss.source
        ORDER BY "outcomeCount" DESC
      `);
      return rows as unknown as Array<{
        source: string;
        signalCount: number;
        outcomeCount: number;
        wins: number;
        losses: number;
        flats: number;
        expired: number;
        avgPriceChange: number | null;
        stddevPriceChange: number | null;
      }>;
    }),

  /**
   * Per-strategy quality. Same shape as bySource but grouped by the
   * upstream strategy slug. Useful for comparing news strategies head-
   * to-head ("equity-catalyst" vs "macro-fed-policy" hit rate).
   */
  byStrategy: protectedProcedure
    .input(z.object({
      lookbackDays: z.number().int().min(1).max(90).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const days = input.lookbackDays;
      const rows = await ctx.db.execute(sql`
        SELECT
          COALESCE(st.slug, '<unknown>') AS slug,
          st.frontmatter->>'type'        AS type,
          st.frontmatter->>'bucket'      AS bucket,
          COUNT(*)::int                                       AS "outcomeCount",
          SUM(CASE WHEN o.outcome = 'win' THEN 1 ELSE 0 END)::int  AS wins,
          SUM(CASE WHEN o.outcome = 'loss' THEN 1 ELSE 0 END)::int AS losses,
          SUM(CASE WHEN o.outcome = 'flat' THEN 1 ELSE 0 END)::int AS flats,
          SUM(CASE WHEN o.outcome = 'expired' THEN 1 ELSE 0 END)::int AS expired,
          ROUND(AVG(o.price_change_pct)::numeric, 4)::float   AS "avgPriceChange"
        FROM signal_outcomes o
        JOIN market_signals s ON s.id = o.signal_id
        LEFT JOIN strategies st ON st.id = s.strategy_id
        WHERE o.evaluated_at >= NOW() - make_interval(days => ${days})
        GROUP BY st.slug, st.frontmatter->>'type', st.frontmatter->>'bucket'
        ORDER BY "outcomeCount" DESC
      `);
      return rows as unknown as Array<{
        slug: string;
        type: string | null;
        bucket: string | null;
        outcomeCount: number;
        wins: number;
        losses: number;
        flats: number;
        expired: number;
        avgPriceChange: number | null;
      }>;
    }),

  /**
   * Hit rate by horizon. When a source/strategy hits at 4h but not 1h,
   * that's actionable info for tuning evaluation windows.
   */
  byHorizon: protectedProcedure
    .input(z.object({
      lookbackDays: z.number().int().min(1).max(90).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const days = input.lookbackDays;
      const rows = await ctx.db.execute(sql`
        SELECT
          o.evaluation_horizon                                 AS horizon,
          COUNT(*)::int                                        AS "outcomeCount",
          SUM(CASE WHEN o.outcome = 'win' THEN 1 ELSE 0 END)::int  AS wins,
          SUM(CASE WHEN o.outcome = 'loss' THEN 1 ELSE 0 END)::int AS losses,
          SUM(CASE WHEN o.outcome = 'flat' THEN 1 ELSE 0 END)::int AS flats,
          ROUND(AVG(o.price_change_pct)::numeric, 4)::float    AS "avgPriceChange"
        FROM signal_outcomes o
        WHERE o.evaluated_at >= NOW() - make_interval(days => ${days})
        GROUP BY o.evaluation_horizon
        ORDER BY o.evaluation_horizon
      `);
      return rows as unknown as Array<{
        horizon: string;
        outcomeCount: number;
        wins: number;
        losses: number;
        flats: number;
        avgPriceChange: number | null;
      }>;
    }),
});
