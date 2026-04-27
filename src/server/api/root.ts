import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { configsRouter } from "~/server/api/routers/configs";
import { signalsRouter } from "~/server/api/routers/signals";
import { strategiesRouter } from "~/server/api/routers/strategies";
import { agentConfigsRouter } from "~/server/api/routers/agent-configs";
import { tradesRouter } from "~/server/api/routers/trades";
import { polyPositionsRouter } from "~/server/api/routers/poly-positions";

export const appRouter = createTRPCRouter({
  configs: configsRouter,
  strategies: strategiesRouter,
  signals: signalsRouter,
  agentConfigs: agentConfigsRouter,
  trades: tradesRouter,
  polyPositions: polyPositionsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
