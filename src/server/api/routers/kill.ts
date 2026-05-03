import { desc, isNull } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { killEvents } from "~/server/db/schema";

export const killRouter = createTRPCRouter({
  /**
   * Recent kill events from the audit log (kill_events postgres table,
   * persisted by risk-watcher's kill_persister task).
   */
  recent: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(killEvents)
      .orderBy(desc(killEvents.triggeredAt))
      .limit(50);
  }),

  /**
   * Active (un-cleared) halts only. Useful for the "current state" panel.
   * Currently we treat any kind starting with `manual_halt_` or `*_breach`
   * with cleared_at IS NULL as "still active."
   */
  active: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(killEvents)
      .where(isNull(killEvents.clearedAt))
      .orderBy(desc(killEvents.triggeredAt))
      .limit(20);
  }),
});
