import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { configsRouter } from "~/server/api/routers/configs";
import { signalsRouter } from "~/server/api/routers/signals";
import { strategiesRouter } from "~/server/api/routers/strategies";

export const appRouter = createTRPCRouter({
  configs: configsRouter,
  strategies: strategiesRouter,
  signals: signalsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
