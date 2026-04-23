import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { strategies, strategyActivations } from "~/server/db/schema";

const statusEnum = z.enum(["active", "inactive", "draft"]);

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

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: statusEnum }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(strategies)
        .set({ status: input.status })
        .where(eq(strategies.id, input.id))
        .returning();

      if (input.status === "active" || input.status === "inactive") {
        await ctx.db.insert(strategyActivations).values({
          strategyId: input.id,
          activatedBy: ctx.session.user.email ?? "unknown",
          reason: `status set to ${input.status} via control plane`,
          ...(input.status === "inactive" && { deactivatedAt: new Date() }),
        });
      }

      return updated;
    }),

  updateFilters: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signalConditions: z.array(
          z.object({ condition: z.string(), weight: z.number().min(0).max(1) }),
        ),
        riskFilters: z.object({
          min_source_credibility: z.number().min(0).max(1),
          min_evidence_strength: z.number().min(0).max(1),
          max_narrative_age_hours: z.number().int().min(1),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(strategies)
        .where(eq(strategies.id, input.id))
        .limit(1);
      if (!row) throw new Error("strategy not found");

      const updated_frontmatter = {
        ...(row.frontmatter as Record<string, unknown>),
        signal_conditions: input.signalConditions,
        risk_filters: input.riskFilters,
      };

      const [updated] = await ctx.db
        .update(strategies)
        .set({ frontmatter: updated_frontmatter })
        .where(eq(strategies.id, input.id))
        .returning();

      return updated;
    }),
});
