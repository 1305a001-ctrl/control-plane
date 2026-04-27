import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { polyPositions } from "~/server/db/schema";

const STATUS_ENUM = ["pending", "open", "closed", "cancelled", "error"] as const;

export const polyPositionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(STATUS_ENUM).optional(),
        marketSlug: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }),
    )
    .query(({ ctx, input }) => {
      if (input.status) {
        return ctx.db
          .select()
          .from(polyPositions)
          .where(eq(polyPositions.status, input.status))
          .orderBy(desc(polyPositions.createdAt))
          .limit(input.limit);
      }
      return ctx.db
        .select()
        .from(polyPositions)
        .orderBy(desc(polyPositions.createdAt))
        .limit(input.limit);
    }),

  open: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(polyPositions)
      .where(inArray(polyPositions.status, ["pending", "open"]))
      .orderBy(desc(polyPositions.openedAt)),
  ),

  closed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(polyPositions)
        .where(eq(polyPositions.status, "closed"))
        .orderBy(desc(polyPositions.closedAt))
        .limit(input.limit),
    ),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.select().from(polyPositions);
    let openCount = 0;
    let openStake = 0;
    let closedCount = 0;
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    for (const p of all) {
      if (p.status === "pending" || p.status === "open") {
        openCount += 1;
        openStake += p.stakeUsd;
      } else if (p.status === "closed") {
        closedCount += 1;
        totalPnl += p.pnlUsd ?? 0;
        if ((p.pnlUsd ?? 0) > 0) wins += 1;
        else if ((p.pnlUsd ?? 0) < 0) losses += 1;
      }
    }
    return {
      openCount,
      openStake,
      closedCount,
      totalPnl,
      winRate: closedCount > 0 ? wins / closedCount : null,
      wins,
      losses,
    };
  }),
});
