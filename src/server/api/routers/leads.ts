import { and, desc, eq, ne, type SQL } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads } from "~/server/db/schema";

const NICHE_ENUM = ["restaurant", "clinic_dental", "clinic_medical", "clinic_beauty"] as const;
const STATUS_ENUM = [
  "new", "outreached", "replied", "qualified", "won", "lost", "dead",
] as const;
const CHAIN_ROLE_ENUM = ["standalone", "parent", "branch"] as const;

export const leadsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        niche: z.enum(NICHE_ENUM).optional(),
        status: z.enum(STATUS_ENUM).optional(),
        geoCity: z.string().optional(),
        minFitScore: z.number().min(0).max(1).optional(),
        // Default true: hide chain branches from outreach lists
        // (we contact the parent or standalones only).
        excludeBranches: z.boolean().default(true),
        chainRole: z.enum(CHAIN_ROLE_ENUM).optional(),
        limit: z.number().min(1).max(500).default(100),
      }),
    )
    .query(({ ctx, input }) => {
      const filters: SQL[] = [];
      if (input.niche) filters.push(eq(leads.niche, input.niche));
      if (input.status) filters.push(eq(leads.status, input.status));
      if (input.geoCity) filters.push(eq(leads.geoCity, input.geoCity));
      if (input.chainRole) {
        filters.push(eq(leads.chainRole, input.chainRole));
      } else if (input.excludeBranches) {
        filters.push(ne(leads.chainRole, "branch"));
      }

      const base = ctx.db.select().from(leads);
      const filtered = filters.length > 0 ? base.where(and(...filters)) : base;
      return filtered.orderBy(desc(leads.fitScore), desc(leads.businessReviewCount)).limit(input.limit);
    }),

  chainSummary: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.select({
      chainName: leads.chainName,
      chainRole: leads.chainRole,
    }).from(leads);
    const byRole: Record<string, number> = { standalone: 0, parent: 0, branch: 0 };
    const chains = new Set<string>();
    for (const r of all) {
      byRole[r.chainRole] = (byRole[r.chainRole] ?? 0) + 1;
      if (r.chainName) chains.add(r.chainName);
    }
    return { byRole, chainCount: chains.size };
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.select().from(leads).where(eq(leads.id, input.id));
      return rows[0] ?? null;
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.select({
      status: leads.status,
      niche: leads.niche,
      fitScore: leads.fitScore,
    }).from(leads);

    const byStatus: Record<string, number> = {};
    const byNiche: Record<string, number> = {};
    const fitBuckets = { high: 0, mid: 0, low: 0 };
    for (const r of all) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byNiche[r.niche] = (byNiche[r.niche] ?? 0) + 1;
      if (r.fitScore >= 0.55) fitBuckets.high += 1;
      else if (r.fitScore >= 0.35) fitBuckets.mid += 1;
      else fitBuckets.low += 1;
    }
    return { total: all.length, byStatus, byNiche, fitBuckets };
  }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(STATUS_ENUM),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(leads)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(leads.id, input.id));
      return { ok: true };
    }),
});
