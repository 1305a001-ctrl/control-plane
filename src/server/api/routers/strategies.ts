import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { strategies, strategyActivations } from "~/server/db/schema";

export const strategiesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["news", "trading", "poly"]).optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const conditions = [];
      if (input.type) conditions.push(eq(strategies.type, input.type));
      if (input.status) conditions.push(eq(strategies.status, input.status));

      return ctx.db
        .select()
        .from(strategies)
        .orderBy(desc(strategies.syncedAt));
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(strategies)
        .where(eq(strategies.slug, input.slug))
        .orderBy(desc(strategies.syncedAt)),
    ),

  getActivations: protectedProcedure
    .input(z.object({ strategyId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(strategyActivations)
        .where(eq(strategyActivations.strategyId, input.strategyId))
        .orderBy(desc(strategyActivations.activatedAt)),
    ),
});
