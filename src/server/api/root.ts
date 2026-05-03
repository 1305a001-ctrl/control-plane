import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { configsRouter } from "~/server/api/routers/configs";
import { signalsRouter } from "~/server/api/routers/signals";
import { strategiesRouter } from "~/server/api/routers/strategies";
import { agentConfigsRouter } from "~/server/api/routers/agent-configs";
import { tradesRouter } from "~/server/api/routers/trades";
import { polyPositionsRouter } from "~/server/api/routers/poly-positions";
import { leadsRouter } from "~/server/api/routers/leads";
import { outreachRouter } from "~/server/api/routers/outreach";
import { riskRouter } from "~/server/api/routers/risk";
import { killRouter } from "~/server/api/routers/kill";
import { macroRouter } from "~/server/api/routers/macro";
import { dashboardRouter } from "~/server/api/routers/dashboard";

export const appRouter = createTRPCRouter({
  configs: configsRouter,
  strategies: strategiesRouter,
  signals: signalsRouter,
  agentConfigs: agentConfigsRouter,
  trades: tradesRouter,
  polyPositions: polyPositionsRouter,
  leads: leadsRouter,
  outreach: outreachRouter,
  risk: riskRouter,
  kill: killRouter,
  macro: macroRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
