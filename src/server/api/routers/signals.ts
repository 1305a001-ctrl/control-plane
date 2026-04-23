import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  consistencyScores,
  marketSignals,
  pipelineAudit,
  signalOutcomes,
} from "~/server/db/schema";

export const signalsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        asset: z.string().optional(),
        direction: z.enum(["bullish", "bearish", "neutral"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(marketSignals)
        .orderBy(desc(marketSignals.publishedAt))
        .limit(input.limit),
    ),

  getOutcomes: protectedProcedure
    .input(z.object({ signalId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(signalOutcomes)
        .where(eq(signalOutcomes.signalId, input.signalId))
        .orderBy(desc(signalOutcomes.evaluatedAt)),
    ),

  getConsistency: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().uuid().optional(),
        asset: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consistencyScores)
        .orderBy(desc(consistencyScores.calculatedAt)),
    ),

  getAuditLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(pipelineAudit)
        .orderBy(desc(pipelineAudit.startedAt))
        .limit(input.limit),
    ),
});
