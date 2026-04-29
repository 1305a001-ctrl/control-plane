import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { marketSignals, signalOutcomes, strategies, strategyActivations, trades } from "~/server/db/schema";

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

  performance: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().uuid(),
        sinceDays: z.number().int().min(1).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sinceDate = new Date(Date.now() - input.sinceDays * 24 * 60 * 60 * 1000);

      // Per-horizon aggregation joining outcomes → signals filtered to this strategy.
      const horizonRows = await ctx.db.execute(sql`
        SELECT
          o.evaluation_horizon AS horizon,
          COUNT(*) AS total,
          SUM((o.outcome = 'win')::int)::int AS wins,
          SUM((o.outcome = 'loss')::int)::int AS losses,
          SUM((o.outcome = 'flat')::int)::int AS flats,
          SUM((o.outcome = 'expired')::int)::int AS expired,
          AVG(o.price_change_pct) FILTER (WHERE o.outcome IN ('win','loss')) AS avg_pct,
          MAX(o.evaluated_at) AS last_evaluated_at
        FROM signal_outcomes o
        JOIN market_signals s ON s.id = o.signal_id
        WHERE s.strategy_id = ${input.strategyId}::uuid
          AND s.published_at >= ${sinceDate}
        GROUP BY o.evaluation_horizon
        ORDER BY o.evaluation_horizon
      `);

      // Recent signals firing this strategy (count by direction)
      const directionRows = await ctx.db
        .select({
          direction: marketSignals.direction,
          n: sql<number>`COUNT(*)::int`,
          avgConfidence: sql<number>`AVG(${marketSignals.confidence})::float`,
        })
        .from(marketSignals)
        .where(
          and(
            eq(marketSignals.strategyId, input.strategyId),
            gte(marketSignals.publishedAt, sinceDate),
          ),
        )
        .groupBy(marketSignals.direction);

      // Trades attached to this strategy's signals
      const tradeRows = await ctx.db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          SUM((status = 'open' OR status = 'pending')::int)::int AS open,
          SUM((status = 'closed' AND pnl_usd > 0)::int)::int AS wins,
          SUM((status = 'closed' AND pnl_usd < 0)::int)::int AS losses,
          COALESCE(SUM(pnl_usd) FILTER (WHERE status = 'closed'), 0)::float AS total_pnl,
          COALESCE(AVG(pnl_usd) FILTER (WHERE status = 'closed'), 0)::float AS avg_pnl
        FROM trades t
        JOIN market_signals s ON s.id = t.signal_id
        WHERE s.strategy_id = ${input.strategyId}::uuid
          AND s.published_at >= ${sinceDate}
      `);

      // Recent outcomes (last 15 rows for inspection)
      const recentOutcomes = await ctx.db.execute(sql`
        SELECT
          o.outcome,
          o.evaluation_horizon AS horizon,
          o.price_change_pct,
          o.notes,
          o.evaluated_at,
          s.asset,
          s.direction,
          s.confidence
        FROM signal_outcomes o
        JOIN market_signals s ON s.id = o.signal_id
        WHERE s.strategy_id = ${input.strategyId}::uuid
        ORDER BY o.evaluated_at DESC
        LIMIT 15
      `);

      const tradesArr = tradeRows as unknown as Array<Record<string, unknown>>;
      return {
        sinceDays: input.sinceDays,
        sinceDate,
        byHorizon: horizonRows as unknown as Array<Record<string, unknown>>,
        byDirection: directionRows,
        trades: tradesArr[0] ?? {
          total: 0, open: 0, wins: 0, losses: 0, total_pnl: 0, avg_pnl: 0,
        },
        recentOutcomes: recentOutcomes as unknown as Array<Record<string, unknown>>,
      };
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
