/**
 * Read-only views over oms_intents for the /intents page.
 *
 * Schema is owned by oms-gateway (writes queued/rejected) +
 * oms-dispatcher (writes submitted) + binance-adapter (writes
 * filled/partial/etc via WS user-data). Control-plane just reads.
 */
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { omsIntents } from "~/server/db/schema";

const STATUS_ENUM = [
  "queued",
  "submitted",
  "filled",
  "partial",
  "rejected",
  "cancelled",
  "expired",
] as const;

export const intentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(STATUS_ENUM).optional(),
        venue: z.string().optional(),
        asset: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
      }),
    )
    .query(({ ctx, input }) => {
      const filters: SQL[] = [];
      if (input.status) filters.push(eq(omsIntents.status, input.status));
      if (input.venue) filters.push(eq(omsIntents.venue, input.venue));
      if (input.asset) filters.push(eq(omsIntents.asset, input.asset));

      const base = ctx.db.select().from(omsIntents);
      const filtered =
        filters.length > 0 ? base.where(and(...filters)) : base;
      return filtered.orderBy(desc(omsIntents.createdAt)).limit(input.limit);
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        status: omsIntents.status,
        venue: omsIntents.venue,
        count: sql<number>`COUNT(*)::int`,
        notionalSum: sql<number>`COALESCE(SUM(${omsIntents.notionalUsd}), 0)::float`,
        feesSum: sql<number>`COALESCE(SUM(${omsIntents.feesUsd}), 0)::float`,
      })
      .from(omsIntents)
      .groupBy(omsIntents.status, omsIntents.venue);

    let totalCount = 0;
    let queuedCount = 0;
    let filledCount = 0;
    let rejectedCount = 0;
    let totalNotional = 0;
    let totalFees = 0;
    const byVenue: Record<string, { count: number; notional: number }> = {};

    for (const r of rows) {
      const c = Number(r.count);
      const n = Number(r.notionalSum);
      const f = Number(r.feesSum);
      totalCount += c;
      totalNotional += n;
      totalFees += f;
      if (r.status === "queued" || r.status === "submitted") queuedCount += c;
      if (r.status === "filled" || r.status === "partial") filledCount += c;
      if (r.status === "rejected") rejectedCount += c;
      const v = byVenue[r.venue] ?? { count: 0, notional: 0 };
      v.count += c;
      v.notional += n;
      byVenue[r.venue] = v;
    }

    return {
      totalCount,
      queuedCount,
      filledCount,
      rejectedCount,
      totalNotional,
      totalFees,
      byVenue,
    };
  }),
});
