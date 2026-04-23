import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { researchConfigVersions, researchConfigs } from "~/server/db/schema";

const configSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case"),
  name: z.string().min(1),
  description: z.string().optional(),
  config: z.record(z.unknown()),
});

export const configsRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(researchConfigs)
      .orderBy(desc(researchConfigs.createdAt)),
  ),

  getActive: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(researchConfigs)
      .where(eq(researchConfigs.isActive, true))
      .orderBy(researchConfigs.slug),
  ),

  getHistory: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(researchConfigVersions)
        .where(eq(researchConfigVersions.slug, input.slug))
        .orderBy(desc(researchConfigVersions.changedAt)),
    ),

  create: protectedProcedure
    .input(configSchema.extend({ changeReason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.session.user.email ?? "unknown";

      // Find current active version to supersede
      const [existing] = await ctx.db
        .select()
        .from(researchConfigs)
        .where(
          and(
            eq(researchConfigs.slug, input.slug),
            eq(researchConfigs.isActive, true),
          ),
        )
        .limit(1);

      const nextVersion = existing ? existing.version + 1 : 1;

      // Deactivate existing if present
      if (existing) {
        await ctx.db
          .update(researchConfigs)
          .set({ isActive: false })
          .where(eq(researchConfigs.id, existing.id));
      }

      // Insert new version
      const [created] = await ctx.db
        .insert(researchConfigs)
        .values({
          slug: input.slug,
          version: nextVersion,
          name: input.name,
          description: input.description,
          config: input.config,
          isActive: true,
          createdBy: userEmail,
          supersedesId: existing?.id,
        })
        .returning();

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Audit log
      await ctx.db.insert(researchConfigVersions).values({
        configId: created.id,
        slug: input.slug,
        version: nextVersion,
        changedBy: userEmail,
        changeReason: input.changeReason,
        previousConfig: existing?.config ?? null,
        newConfig: input.config,
      });

      return created;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(researchConfigs)
        .set({ isActive: false })
        .where(eq(researchConfigs.id, input.id));
    }),
});
