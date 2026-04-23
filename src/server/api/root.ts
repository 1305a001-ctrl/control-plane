import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { configsRouter } from "~/server/api/routers/configs";
import { signalsRouter } from "~/server/api/routers/signals";
import { strategiesRouter } from "~/server/api/routers/strategies";
import { agentConfigsRouter } from "~/server/api/routers/agent-configs";

export const appRouter = createTRPCRouter({
  configs: configsRouter,
  strategies: strategiesRouter,
  signals: signalsRouter,
  agentConfigs: agentConfigsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
