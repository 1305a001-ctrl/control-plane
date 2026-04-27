import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { leads, outreachMessages } from "~/server/db/schema";
import { resendSend } from "~/server/resend";

const STATUS_TERMINAL = new Set(["sent", "delivered", "opened", "replied", "bounced", "cancelled"]);

export const outreachRouter = createTRPCRouter({
  forLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(outreachMessages)
        .where(eq(outreachMessages.leadId, input.leadId))
        .orderBy(desc(outreachMessages.createdAt)),
    ),

  approveAndSend: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        toEmail: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const approver = ctx.session?.user?.email ?? "unknown";

      // Atomically claim the row: only proceed from drafted/approved → queued.
      // This prevents double-send if someone double-clicks the button.
      const claimed = await ctx.db
        .update(outreachMessages)
        .set({
          status: "queued",
          toEmail: input.toEmail,
          approvedBy: approver,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(outreachMessages.id, input.id),
            sql`${outreachMessages.status} IN ('drafted','approved')`,
          ),
        )
        .returning();

      if (claimed.length === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "message is no longer in a sendable state",
        });
      }
      const msg = claimed[0]!;

      const result = await resendSend({
        to: input.toEmail,
        subject: msg.subject ?? "(no subject)",
        text: msg.body,
      });

      if (!result.ok) {
        await ctx.db
          .update(outreachMessages)
          .set({
            status: "failed",
            errors: sql`${outreachMessages.errors} || ${JSON.stringify([
              { at: new Date().toISOString(), status: result.status, error: result.error },
            ])}::jsonb`,
            updatedAt: new Date(),
          })
          .where(eq(outreachMessages.id, input.id));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Resend rejected: ${result.status} ${result.error}`,
        });
      }

      // Promote lead to 'outreached' on first successful send.
      const sentAt = new Date();
      await ctx.db
        .update(outreachMessages)
        .set({
          status: "sent",
          resendMessageId: result.id,
          sentAt,
          updatedAt: sentAt,
        })
        .where(eq(outreachMessages.id, input.id));

      await ctx.db
        .update(leads)
        .set({ status: "outreached", updatedAt: sentAt })
        .where(and(eq(leads.id, msg.leadId), eq(leads.status, "new")));

      return { ok: true, resendMessageId: result.id };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(outreachMessages)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(outreachMessages.id, input.id),
            sql`${outreachMessages.status} IN ('drafted','approved','queued','failed')`,
          ),
        )
        .returning({ id: outreachMessages.id });

      if (updated.length === 0) {
        const existing = await ctx.db
          .select({ status: outreachMessages.status })
          .from(outreachMessages)
          .where(eq(outreachMessages.id, input.id));
        const cur = existing[0]?.status ?? "unknown";
        if (STATUS_TERMINAL.has(cur)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `cannot cancel — message is already ${cur}`,
          });
        }
      }
      return { ok: true };
    }),

  recent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(outreachMessages)
        .orderBy(desc(outreachMessages.createdAt))
        .limit(input.limit),
    ),
});
