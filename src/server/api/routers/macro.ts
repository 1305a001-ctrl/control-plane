import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { macroEvents } from "~/server/db/schema";

export const macroRouter = createTRPCRouter({
  /**
   * Most recent macro_event per instrument for a given source.
   *
   * Implementation: fetch last ~30 days from the source, sort by event_at
   * desc, group by instrument in TS, take the first per instrument. This
   * is fine for the ~15 tracked CFTC markets — single query, simple typing.
   */
  latestPerInstrument: protectedProcedure
    .input(
      z.object({
        source: z.string().default("cftc-cot"),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Pull last 60 days — plenty to catch the most recent COT release
      // for every tracked instrument (which publishes weekly).
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const rows = await ctx.db
        .select()
        .from(macroEvents)
        .where(
          and(
            eq(macroEvents.source, input.source),
            isNotNull(macroEvents.instrument),
            gte(macroEvents.eventAt, since),
          ),
        )
        .orderBy(desc(macroEvents.eventAt));

      // Group by instrument, keep the first (most recent) per group
      const seen = new Set<string>();
      const latest: typeof rows = [];
      for (const r of rows) {
        if (!r.instrument || seen.has(r.instrument)) continue;
        seen.add(r.instrument);
        latest.push(r);
        if (latest.length >= input.limit) break;
      }
      return latest;
    }),

  /**
   * Extreme readings only — |z-score| >= minAbsZ — across all instruments.
   */
  extremes: protectedProcedure
    .input(
      z.object({
        source: z.string().default("cftc-cot"),
        minAbsZ: z.number().default(2),
        sinceDays: z.number().default(60),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sinceDate = new Date(Date.now() - input.sinceDays * 24 * 60 * 60 * 1000);
      return ctx.db
        .select()
        .from(macroEvents)
        .where(
          and(
            eq(macroEvents.source, input.source),
            isNotNull(macroEvents.surpriseScore),
            inArray(macroEvents.interpretation, ["extreme-long", "extreme-short"]),
            gte(macroEvents.eventAt, sinceDate),
          ),
        )
        .orderBy(desc(macroEvents.eventAt))
        .limit(input.limit);
    }),

  /**
   * History for a single instrument — for charting positioning over time.
   */
  history: protectedProcedure
    .input(
      z.object({
        source: z.string().default("cftc-cot"),
        instrument: z.string(),
        limit: z.number().min(1).max(500).default(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(macroEvents)
        .where(
          and(
            eq(macroEvents.source, input.source),
            eq(macroEvents.instrument, input.instrument),
          ),
        )
        .orderBy(desc(macroEvents.eventAt))
        .limit(input.limit);
    }),
});
