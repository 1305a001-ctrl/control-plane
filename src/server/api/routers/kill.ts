import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { desc, isNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { killEvents } from "~/server/db/schema";
import { redis } from "~/server/redis";

const HALT_KEY = "system:halt";
const HALT_PREFIX = "system:halt:";
const RESET_KEY = "system:halt:reset_at";
const RISK_ALERTS_STREAM = "risk:alerts";
const FLAT_CHANNEL = "oms:flat-all";

// Same regex pa-agent uses to validate strategy slugs
const STRATEGY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

async function emitKillEvent(opts: {
  kind: string;
  scope?: string;
  level?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  actor: string;
}): Promise<string> {
  const payload = {
    id: crypto.randomUUID(),
    triggered_at: new Date().toISOString(),
    level: opts.level ?? 5,
    kind: opts.kind,
    scope: opts.scope ?? "all",
    actor: opts.actor,
    reason: opts.reason ?? null,
    metadata: opts.metadata ?? {},
  };
  return redis.xadd(
    RISK_ALERTS_STREAM,
    "MAXLEN",
    "~",
    "10000",
    "*",
    "data",
    JSON.stringify(payload),
  ) as Promise<string>;
}

export const killRouter = createTRPCRouter({
  /** Recent kill events (full audit log from postgres). */
  recent: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(killEvents)
      .orderBy(desc(killEvents.triggeredAt))
      .limit(50);
  }),

  /** Active (un-cleared) events from postgres audit. */
  active: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(killEvents)
      .where(isNull(killEvents.clearedAt))
      .orderBy(desc(killEvents.triggeredAt))
      .limit(20);
  }),

  /**
   * Live halt state from Redis — what the trading agents actually check.
   * Returns global halt + per-strategy halts + scheduled reset.
   */
  redisStatus: protectedProcedure.query(async () => {
    const [globalHalt, resetAt] = await Promise.all([
      redis.exists(HALT_KEY),
      redis.get(RESET_KEY),
    ]);

    // SCAN for per-strategy halts
    const strategyHalts: string[] = [];
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${HALT_PREFIX}*`,
        "COUNT",
        "100",
      );
      cursor = next;
      for (const key of keys) {
        if (key === RESET_KEY) continue;
        const slug = key.slice(HALT_PREFIX.length);
        if (slug) strategyHalts.push(slug);
      }
    } while (cursor !== "0");

    return {
      globalHalt: globalHalt > 0,
      resetAt: resetAt ?? null,
      strategyHalts,
    };
  }),

  /** /halt — set global halt + emit event. */
  haltAll: protectedProcedure
    .input(z.object({ reason: z.string().max(200).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      await redis.set(HALT_KEY, "1");
      await emitKillEvent({
        kind: "manual_halt_all",
        scope: "all",
        reason: input?.reason ?? "control-plane UI /halt",
        actor: `control-plane:${ctx.session?.user?.email ?? "unknown"}`,
      });
      return { ok: true };
    }),

  /** /halt-strategy <slug> — set strategy halt + emit event. */
  haltStrategy: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(64),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!STRATEGY_SLUG_RE.test(input.slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid slug. Use a-z, 0-9, dashes; max 64 chars; no leading dash.",
        });
      }
      await redis.set(`${HALT_PREFIX}${input.slug}`, "1");
      await emitKillEvent({
        kind: "manual_halt_strategy",
        scope: `strategy:${input.slug}`,
        reason: input.reason ?? `control-plane UI /halt-strategy ${input.slug}`,
        metadata: { strategy_slug: input.slug },
        actor: `control-plane:${ctx.session?.user?.email ?? "unknown"}`,
      });
      return { ok: true, slug: input.slug };
    }),

  /** /resume — clear global halt + emit event. */
  resume: protectedProcedure.mutation(async ({ ctx }) => {
    await redis.del(HALT_KEY);
    await redis.del(RESET_KEY);
    await emitKillEvent({
      kind: "manual_resume",
      scope: "all",
      reason: "control-plane UI /resume",
      actor: `control-plane:${ctx.session?.user?.email ?? "unknown"}`,
    });
    return { ok: true };
  }),

  /** /flat — set halt + publish to oms:flat-all channel. */
  flat: protectedProcedure.mutation(async ({ ctx }) => {
    await redis.set(HALT_KEY, "1");
    await redis.publish(FLAT_CHANNEL, "1");
    await emitKillEvent({
      kind: "manual_flat",
      scope: "all",
      reason: "control-plane UI /flat",
      metadata: { halt_set: true, channel: FLAT_CHANNEL },
      actor: `control-plane:${ctx.session?.user?.email ?? "unknown"}`,
    });
    return { ok: true };
  }),

  /** /reset-tomorrow — schedule auto-clear at next 04:00 +08. */
  resetTomorrow: protectedProcedure.mutation(async ({ ctx }) => {
    // Compute next 04:00 +08 in UTC. MYT is UTC+08, so 04:00 MYT = 20:00 UTC prev day.
    const nowUtc = new Date();
    const targetUtc = new Date(nowUtc);
    targetUtc.setUTCHours(20, 0, 0, 0); // 04:00 MYT today
    if (targetUtc.getTime() <= nowUtc.getTime()) {
      targetUtc.setUTCDate(targetUtc.getUTCDate() + 1); // next day
    }
    const isoTarget = targetUtc.toISOString();
    await redis.set(RESET_KEY, isoTarget);
    await emitKillEvent({
      kind: "manual_reset_tomorrow",
      scope: "all",
      reason: `Auto-clear scheduled for ${isoTarget}`,
      metadata: { reset_at: isoTarget },
      actor: `control-plane:${ctx.session?.user?.email ?? "unknown"}`,
    });
    return { ok: true, resetAt: isoTarget };
  }),
});
