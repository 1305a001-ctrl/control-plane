import { env } from "~/env";

export type ResendSendInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export type ResendSendResult = {
  ok: true;
  id: string;
} | {
  ok: false;
  status: number;
  error: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function resendSend(input: ResendSendInput): Promise<ResendSendResult> {
  const key = env.OUTREACH_RESEND_KEY ?? env.AUTH_RESEND_KEY;
  if (!key) return { ok: false, status: 0, error: "no Resend API key configured" };

  const fromAddr = `${env.OUTREACH_FROM_NAME} <${env.OUTREACH_FROM_EMAIL}>`;
  const replyTo = input.replyTo ?? env.OUTREACH_REPLY_TO;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddr,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<unreadable>");
    return { ok: false, status: res.status, error: text.slice(0, 500) };
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) return { ok: false, status: res.status, error: "Resend returned no id" };
  return { ok: true, id: json.id };
}
