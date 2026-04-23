import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { agentConfigs } from "~/server/db/schema";

const agentTypeEnum = z.enum(["trading", "poly"]);

const tradingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  position_size_pct: z.number().min(0.001).max(1).describe("Position Size %|number|0.05"),
  max_open_positions: z.number().int().min(1).max(20).describe("Max Open Positions|number|3"),
  take_profit_pct: z.number().min(0.001).max(1).describe("Take Profit %|number|0.08"),
  stop_loss_pct: z.number().min(0.001).max(1).describe("Stop Loss %|number|0.04"),
  min_signal_confidence: z.number().min(0).max(1).describe("Min Signal Confidence|number|0.70"),
  max_daily_trades: z.number().int().min(1).max(50).describe("Max Daily Trades|number|2"),
  notes: z.string().optional().describe("Notes|textarea|"),
});

const polyConfigSchema = z.object({
  enabled: z.boolean().default(false),
  market_url: z.string().url().describe("Polymarket URL|text|https://polymarket.com/event/..."),
  resolution_condition: z.string().min(1).describe("Resolution Condition|textarea|e.g. Will BTC exceed $100k before July 2026?"),
  min_confidence: z.number().min(0).max(1).describe("Min Confidence|number|0.65"),
  max_stake_pct: z.number().min(0.001).max(0.5).describe("Max Stake % of bankroll|number|0.02"),
  notes: z.string().optional().describe("Notes|textarea|"),
});

export const agentConfigsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ agentType: agentTypeEnum }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(agentConfigs)
        .where(eq(agentConfigs.agentType, input.agentType))
        .orderBy(desc(agentConfigs.updatedAt)),
    ),

  getActive: protectedProcedure
    .input(z.object({ agentType: agentTypeEnum }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(agentConfigs)
        .where(
          and(
            eq(agentConfigs.agentType, input.agentType),
            eq(agentConfigs.isActive, true),
          ),
        )
        .orderBy(agentConfigs.slug),
    ),

  createTrading: protectedProcedure
    .input(
      z.object({
        slug: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/, "Must be uppercase e.g. BTC or NVDA"),
        name: z.string().min(1),
        description: z.string().optional(),
        config: tradingConfigSchema,
        changeReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.session.user.email ?? "unknown";

      const [existing] = await ctx.db
        .select()
        .from(agentConfigs)
        .where(
          and(
            eq(agentConfigs.agentType, "trading"),
            eq(agentConfigs.slug, input.slug),
            eq(agentConfigs.isActive, true),
          ),
        )
        .limit(1);

      const nextVersion = existing ? existing.version + 1 : 1;

      if (existing) {
        await ctx.db
          .update(agentConfigs)
          .set({ isActive: false })
          .where(eq(agentConfigs.id, existing.id));
      }

      const [created] = await ctx.db
        .insert(agentConfigs)
        .values({
          agentType: "trading",
          slug: input.slug,
          version: nextVersion,
          name: input.name,
          description: input.description,
          config: input.config,
          isActive: true,
          createdBy: userEmail,
          supersedesId: existing?.id,
        })
        .returning();

      return created;
    }),

  createPoly: protectedProcedure
    .input(
      z.object({
        slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be kebab-case"),
        name: z.string().min(1),
        description: z.string().optional(),
        config: polyConfigSchema,
        changeReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.session.user.email ?? "unknown";

      const [existing] = await ctx.db
        .select()
        .from(agentConfigs)
        .where(
          and(
            eq(agentConfigs.agentType, "poly"),
            eq(agentConfigs.slug, input.slug),
            eq(agentConfigs.isActive, true),
          ),
        )
        .limit(1);

      const nextVersion = existing ? existing.version + 1 : 1;

      if (existing) {
        await ctx.db
          .update(agentConfigs)
          .set({ isActive: false })
          .where(eq(agentConfigs.id, existing.id));
      }

      const [created] = await ctx.db
        .insert(agentConfigs)
        .values({
          agentType: "poly",
          slug: input.slug,
          version: nextVersion,
          name: input.name,
          description: input.description,
          config: input.config,
          isActive: true,
          createdBy: userEmail,
          supersedesId: existing?.id,
        })
        .returning();

      return created;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(agentConfigs)
        .set({ isActive: false })
        .where(eq(agentConfigs.id, input.id));
    }),
});

export { tradingConfigSchema, polyConfigSchema };
