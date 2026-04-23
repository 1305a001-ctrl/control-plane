import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/auth-schema";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    Resend({
      apiKey: env.AUTH_RESEND_KEY,
      from: env.AUTH_EMAIL_FROM,
      ...(process.env.NODE_ENV === "development" && {
        sendVerificationRequest({ url }) {
          console.log("\n========================================");
          console.log("MAGIC LINK (dev only):");
          console.log(url);
          console.log("========================================\n");
        },
      }),
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;
