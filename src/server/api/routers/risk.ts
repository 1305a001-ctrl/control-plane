import { desc, eq, and } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { riskLedger } from "~/server/db/schema";

export const riskRouter = createTRPCRouter({
  /**
   * Latest snapshot for a (scope, period). Defaults to total/intraday —
   * the row written every 60s by risk-watcher.
   */
  latest: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(riskLedger)
      .where(and(eq(riskLedger.scope, "total"), eq(riskLedger.period, "intraday")))
      .orderBy(desc(riskLedger.snapshotAt))
      .limit(1);
    return rows[0] ?? null;
  }),

  /**
   * Recent risk_ledger rows for charting an equity curve.
   */
  recent: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(riskLedger)
      .where(and(eq(riskLedger.scope, "total"), eq(riskLedger.period, "intraday")))
      .orderBy(desc(riskLedger.snapshotAt))
      .limit(200);
  }),

  /**
   * Drawdown limits — static for now, sourced from project_trading_stack.md.
   * Future: read from a config table so they can be tuned without redeploy.
   */
  limits: protectedProcedure.query(() => ({
    perTradePct: 1,
    perDayPct: 5,
    perWeekPct: 10,
    perMonthPct: 15,
    perTotalPct: 20,
  })),
});
