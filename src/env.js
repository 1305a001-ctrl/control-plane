import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_RESEND_KEY: z.string(),
    AUTH_EMAIL_FROM: z.string().email(),
    AUTH_URL: z.string().url().optional(),
    DATABASE_URL: z.string().url(),
    OUTREACH_RESEND_KEY: z.string().optional(),
    OUTREACH_FROM_EMAIL: z.string().email().default("ben@the2357.com"),
    OUTREACH_FROM_NAME: z.string().default("Ben from the2357.com"),
    OUTREACH_REPLY_TO: z.string().email().optional(),
    RESEND_WEBHOOK_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY,
    AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM,
    DATABASE_URL: process.env.DATABASE_URL,
    OUTREACH_RESEND_KEY: process.env.OUTREACH_RESEND_KEY,
    OUTREACH_FROM_EMAIL: process.env.OUTREACH_FROM_EMAIL,
    OUTREACH_FROM_NAME: process.env.OUTREACH_FROM_NAME,
    OUTREACH_REPLY_TO: process.env.OUTREACH_REPLY_TO,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
