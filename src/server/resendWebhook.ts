import crypto from "node:crypto";

// Resend signs webhooks via Svix. Headers:
//   svix-id        — message id
//   svix-timestamp — unix seconds
//   svix-signature — space-separated list of `v1,<base64-hmac>` entries
// HMAC body = `${id}.${timestamp}.${rawBody}` keyed with the secret.
// Secret arrives as `whsec_<base64>` — decode the part after the prefix.

const TOLERANCE_SECONDS = 5 * 60;

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifyResendSignature(
  rawBody: string,
  headers: { id?: string | null; timestamp?: string | null; signature?: string | null },
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): WebhookVerifyResult {
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return { ok: false, reason: "missing svix-* headers" };
  }
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "invalid timestamp" };
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(keyB64, "base64");
  } catch {
    return { ok: false, reason: "secret is not valid base64" };
  }

  const signedPayload = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signedPayload).digest("base64");

  // Header may contain multiple `v1,<sig>` entries — accept any match.
  const candidates = headers.signature.split(" ");
  for (const c of candidates) {
    const [version, sig] = c.split(",");
    if (version !== "v1" || !sig) continue;
    if (timingSafeEq(sig, expected)) return { ok: true };
  }
  return { ok: false, reason: "no signature matched" };
}

function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
