import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { configsRouter } from "~/server/api/routers/configs";
import { signalsRouter } from "~/server/api/routers/signals";
import { strategiesRouter } from "~/server/api/routers/strategies";
import { agentConfigsRouter } from "~/server/api/routers/agent-configs";
import { tradesRouter } from "~/server/api/routers/trades";
import { intentsRouter } from "~/server/api/routers/intents";
import { performanceRouter } from "~/server/api/routers/performance";
import { polyPositionsRouter } from "~/server/api/routers/poly-positions";
import { positionsRouter } from "~/server/api/routers/positions";
import { riskRouter } from "~/server/api/routers/risk";
import { killRouter } from "~/server/api/routers/kill";
import { macroRouter } from "~/server/api/routers/macro";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { researchRouter } from "~/server/api/routers/research";

export const appRouter = createTRPCRouter({
  configs: configsRouter,
  strategies: strategiesRouter,
  signals: signalsRouter,
  agentConfigs: agentConfigsRouter,
  trades: tradesRouter,
  intents: intentsRouter,
  performance: performanceRouter,
  polyPositions: polyPositionsRouter,
  positions: positionsRouter,
  risk: riskRouter,
  kill: killRouter,
  macro: macroRouter,
  dashboard: dashboardRouter,
  research: researchRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
