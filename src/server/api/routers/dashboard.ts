import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  killEvents,
  macroEvents,
  polyPositions,
  riskLedger,
  trades,
} from "~/server/db/schema";

/**
 * Aggregated read-only view for the trading-OS landing page.
 * Combines latest snapshots from risk_ledger + open positions counts +
 * recent kill events + macro extremes into one round-trip for the UI.
 */
export const dashboardRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    // 1. Latest risk_ledger snapshot (total/intraday — written every 60s)
    const latestRisk = await ctx.db
      .select()
      .from(riskLedger)
      .where(and(eq(riskLedger.scope, "total"), eq(riskLedger.period, "intraday")))
      .orderBy(desc(riskLedger.snapshotAt))
      .limit(1);

    // 2. Open positions across asset classes (today's data: trades + polyPositions)
    const openTrades = await ctx.db
      .select()
      .from(trades)
      .where(inArray(trades.status, ["pending", "open", "partial"]));
    const openPolys = await ctx.db
      .select()
      .from(polyPositions)
      .where(inArray(polyPositions.status, ["pending", "open", "partial"]));

    // Bucket by asset_class. Today everything in `trades` is crypto/stocks/forex
    // mixed; we split heuristically by ticker shape until we add the column.
    const cryptoOpen = openTrades.filter((t) =>
      ["BTC", "ETH", "SOL", "DOGE", "ADA", "BNB", "XRP", "DOT"].some((sym) =>
        t.asset.toUpperCase().includes(sym),
      ),
    );
    const stocksOpen = openTrades.filter(
      (t) => !cryptoOpen.includes(t),
    );

    const sumExposure = (rows: typeof openTrades) =>
      rows.reduce((sum, t) => sum + (t.sizeUsd ?? 0), 0);

    // 3. Active kill events
    const activeKills = await ctx.db
      .select()
      .from(killEvents)
      .where(isNull(killEvents.clearedAt))
      .orderBy(desc(killEvents.triggeredAt))
      .limit(5);

    // 4. Recent extreme macro readings (last 30 days, |z| >= 2)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const macroExtremes = await ctx.db
      .select()
      .from(macroEvents)
      .where(
        and(
          gte(macroEvents.eventAt, since30d),
          inArray(macroEvents.interpretation, ["extreme-long", "extreme-short"]),
        ),
      )
      .orderBy(desc(macroEvents.eventAt))
      .limit(8);

    // 5. Today's win/loss + fees from the snapshot
    const r = latestRisk[0];

    return {
      risk: {
        snapshotAt: r?.snapshotAt ?? null,
        pnlUsd: r?.pnlUsd ?? 0,
        pnlPct: r?.pnlPct ?? 0,
        drawdownUsd: r?.drawdownUsd ?? 0,
        drawdownPct: r?.drawdownPct ?? 0,
        openPositionsCount: r?.openPositionsCount ?? 0,
        exposureUsd: r?.exposureUsd ?? 0,
        feesUsd: r?.feesUsd ?? 0,
        slippageUsd: r?.slippageUsd ?? 0,
        tradesClosed: r?.tradesClosed ?? 0,
        tradesWon: r?.tradesWon ?? 0,
        tradesLost: r?.tradesLost ?? 0,
      },
      positions: {
        crypto: {
          count: cryptoOpen.length,
          exposureUsd: sumExposure(cryptoOpen),
        },
        stocks: {
          count: stocksOpen.length,
          exposureUsd: sumExposure(stocksOpen),
        },
        forex: { count: 0, exposureUsd: 0 }, // no FX yet
        predictions: {
          count: openPolys.length,
          exposureUsd: openPolys.reduce((s, p) => s + (p.stakeUsd ?? 0), 0),
        },
      },
      activeKills,
      macroExtremes,
      // Static limits from project_trading_stack.md (TODO: move to config table)
      limits: {
        dailyDdPct: 5,
        totalDdPct: 20,
        correlationThreshold: 0.8,
      },
    };
  }),
});
