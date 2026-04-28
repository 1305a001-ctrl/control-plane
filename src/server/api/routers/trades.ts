import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { trades } from "~/server/db/schema";

const STATUS_ENUM = ["pending", "open", "closed", "cancelled", "rejected", "error"] as const;

export const tradesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(STATUS_ENUM).optional(),
        asset: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }),
    )
    .query(({ ctx, input }) => {
      const filters: SQL[] = [];
      if (input.status) filters.push(eq(trades.status, input.status));
      if (input.asset) filters.push(eq(trades.asset, input.asset));

      const base = ctx.db.select().from(trades);
      const filtered = filters.length > 0 ? base.where(and(...filters)) : base;
      return filtered.orderBy(desc(trades.createdAt)).limit(input.limit);
    }),

  open: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(trades)
      .where(inArray(trades.status, ["pending", "open"]))
      .orderBy(desc(trades.openedAt)),
  ),

  closed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(trades)
        .where(inArray(trades.status, ["closed"]))
        .orderBy(desc(trades.closedAt))
        .limit(input.limit),
    ),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.select().from(trades);
    let openCount = 0;
    let openExposure = 0;
    let closedCount = 0;
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    for (const t of all) {
      if (t.status === "pending" || t.status === "open") {
        openCount += 1;
        openExposure += t.sizeUsd;
      } else if (t.status === "closed") {
        closedCount += 1;
        totalPnl += t.pnlUsd ?? 0;
        if ((t.pnlUsd ?? 0) > 0) wins += 1;
        else if ((t.pnlUsd ?? 0) < 0) losses += 1;
      }
    }
    return {
      openCount,
      openExposure,
      closedCount,
      totalPnl,
      winRate: closedCount > 0 ? wins / closedCount : null,
      wins,
      losses,
    };
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.select().from(trades).where(eq(trades.id, input.id));
      return rows[0] ?? null;
    }),

  // NOTE: This is a UI-only state transition. It marks the trade row as
  // cancelled in the control-plane DB but does NOT contact the broker. Real
  // broker cancellation must be wired into the trading-agent's broker adapter
  // (e.g. alpaca cancel-order endpoint) — out of scope for this mutation.
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(trades)
        .set({
          status: "cancelled",
          closedAt: new Date(),
          closeReason: "manual_cancel",
        })
        .where(
          and(
            eq(trades.id, input.id),
            inArray(trades.status, ["pending", "open"]),
          ),
        )
        .returning({ id: trades.id });

      if (updated.length === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Trade is not in a cancellable state (pending/open).",
        });
      }
      return { ok: true, id: updated[0]!.id };
    }),
});
