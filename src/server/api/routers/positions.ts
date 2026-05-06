/**
 * Read-only position detail — served by `/positions/[id]`.
 *
 * Surfaces the unified positions table (binance + alpaca + polymarket) plus
 * the per-intent timeline (each intent that contributed to scale-in / partial-
 * close / full-close / reversal). Distinct from polyPositionsRouter, which
 * targets the Polymarket-specific paper book maintained by poly-agent.
 */
import { sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const positionsRouter = createTRPCRouter({
  /** Single position + ordered intent timeline + strategy info. */
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const headerRows = await ctx.db.execute(sql`
        SELECT
          p.id::text                               AS "id",
          p.strategy_id::text                      AS "strategyId",
          s.slug                                   AS "strategySlug",
          s.frontmatter->>'bucket'                 AS "bucket",
          p.asset                                  AS "asset",
          p.venue                                  AS "venue",
          p.side                                   AS "side",
          p.qty::float                             AS "qty",
          p.exit_qty::float                        AS "exitQty",
          p.avg_entry_price::float                 AS "avgEntryPrice",
          p.avg_exit_price::float                  AS "avgExitPrice",
          p.realized_pnl_usd::float                AS "realizedPnlUsd",
          p.unrealized_pnl_usd::float              AS "unrealizedPnlUsd",
          p.mark_price::float                      AS "markPrice",
          p.marked_at                              AS "markedAt",
          p.fees_usd::float                        AS "feesUsd",
          p.opened_at                              AS "openedAt",
          p.closed_at                              AS "closedAt",
          p.status                                 AS "status",
          p.intent_ids                             AS "intentIds",
          p.metadata                               AS "metadata"
        FROM positions p
        LEFT JOIN strategies s ON s.id = p.strategy_id
        WHERE p.id = ${input.id}::uuid
        LIMIT 1
      `);
      const header = (headerRows as unknown as Array<Record<string, unknown>>)[0];
      if (!header) return null;

      const intentRows = await ctx.db.execute(sql`
        SELECT
          oi.id::text             AS "id",
          oi.side                 AS "side",
          oi.notional_usd::float  AS "notionalUsd",
          oi.fill_qty::float      AS "fillQty",
          oi.fill_price::float    AS "fillPrice",
          oi.fees_usd::float      AS "feesUsd",
          oi.status               AS "status",
          oi.rejection_reason     AS "rejectionReason",
          oi.broker_order_id      AS "brokerOrderId",
          oi.created_at           AS "createdAt",
          oi.submitted_at         AS "submittedAt",
          oi.completed_at         AS "completedAt"
        FROM oms_intents oi
        WHERE oi.id = ANY(${(header.intentIds ?? []) as string[]}::uuid[])
        ORDER BY oi.completed_at NULLS LAST, oi.created_at
      `);

      return {
        ...header,
        intents: intentRows as unknown as Array<Record<string, unknown>>,
      };
    }),

  /** Recent positions index (lists across venues). */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "closed", "all"]).default("all"),
          venue: z.enum(["binance", "alpaca", "polymarket", "all"]).default("all"),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .default({ status: "all", venue: "all", limit: 100 }),
    )
    .query(async ({ ctx, input }) => {
      const statusFilter =
        input.status === "all"
          ? sql``
          : sql`AND p.status = ${input.status}`;
      const venueFilter =
        input.venue === "all"
          ? sql``
          : sql`AND p.venue = ${input.venue}`;
      const rows = await ctx.db.execute(sql`
        SELECT
          p.id::text                       AS "id",
          s.slug                           AS "strategySlug",
          p.asset                          AS "asset",
          p.venue                          AS "venue",
          p.side                           AS "side",
          p.qty::float                     AS "qty",
          p.avg_entry_price::float         AS "avgEntryPrice",
          p.realized_pnl_usd::float        AS "realizedPnlUsd",
          p.unrealized_pnl_usd::float      AS "unrealizedPnlUsd",
          p.mark_price::float              AS "markPrice",
          p.opened_at                      AS "openedAt",
          p.closed_at                      AS "closedAt",
          p.status                         AS "status",
          array_length(p.intent_ids, 1)::int AS "intentCount"
        FROM positions p
        LEFT JOIN strategies s ON s.id = p.strategy_id
        WHERE 1=1
          ${statusFilter}
          ${venueFilter}
        ORDER BY p.opened_at DESC
        LIMIT ${input.limit}
      `);
      return rows as unknown as Array<Record<string, unknown>>;
    }),
});
