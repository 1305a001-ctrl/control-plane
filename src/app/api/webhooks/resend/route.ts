import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { outreachEvents, outreachMessages } from "~/server/db/schema";
import { verifyResendSignature } from "~/server/resendWebhook";

type ResendPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    [k: string]: unknown;
  };
};

const STATUS_FOR_EVENT: Record<string, { status: string; tsField: keyof typeof outreachMessages.$inferInsert }> = {
  "email.sent": { status: "sent", tsField: "sentAt" },
  "email.delivered": { status: "delivered", tsField: "deliveredAt" },
  "email.opened": { status: "opened", tsField: "openedAt" },
  "email.bounced": { status: "bounced", tsField: "bouncedAt" },
  "email.complained": { status: "bounced", tsField: "bouncedAt" },
};

const STATUS_RANK: Record<string, number> = {
  drafted: 0,
  approved: 1,
  queued: 2,
  failed: 2,
  sent: 3,
  delivered: 4,
  opened: 5,
  bounced: 5,
  replied: 6,
  cancelled: 99,
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const secret = env.RESEND_WEBHOOK_SECRET;
  let verified = false;
  let verifyReason = "no secret configured";
  if (secret) {
    const result = verifyResendSignature(rawBody, {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    }, secret);
    verified = result.ok;
    verifyReason = result.ok ? "ok" : result.reason;
  }

  let payload: ResendPayload;
  try {
    payload = JSON.parse(rawBody) as ResendPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventType = payload.type ?? "unknown";
  const resendId = payload.data?.email_id ?? null;
  const occurredAt = payload.created_at ? new Date(payload.created_at) : new Date();

  const matched = resendId
    ? await db
        .select({ id: outreachMessages.id, status: outreachMessages.status })
        .from(outreachMessages)
        .where(eq(outreachMessages.resendMessageId, resendId))
    : [];
  const messageId = matched[0]?.id ?? null;

  await db.insert(outreachEvents).values({
    messageId,
    resendMessageId: resendId,
    eventType,
    occurredAt,
    payload: payload as unknown as Record<string, unknown>,
    signatureVerified: verified,
  });

  // Reject unverified events for status mutation; keep the audit row above so we can debug.
  if (!verified) {
    return NextResponse.json({ ok: false, reason: verifyReason }, { status: 401 });
  }

  if (messageId && STATUS_FOR_EVENT[eventType]) {
    const { status: newStatus, tsField } = STATUS_FOR_EVENT[eventType]!;
    const currentRank = STATUS_RANK[matched[0]!.status] ?? 0;
    const newRank = STATUS_RANK[newStatus] ?? 0;
    // Don't regress: an `email.sent` after a `delivered` shouldn't downgrade us.
    if (newRank >= currentRank) {
      await db
        .update(outreachMessages)
        .set({
          status: newStatus,
          [tsField]: occurredAt,
          updatedAt: new Date(),
        })
        .where(eq(outreachMessages.id, messageId));
    }
  }

  return NextResponse.json({ ok: true });
}

// Reachability check for setup
export function GET() {
  return NextResponse.json({ ok: true, route: "resend webhook" });
}

// Avoid Next caching
export const dynamic = "force-dynamic";
