import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox, emailTokens, users } from "@/db/schema";
import { generateVerificationCode, hashPassword, hashSecret } from "@/lib/auth/password";
import { storeDevPendingCode, verifyEmailPendingCode } from "@/lib/email/dev-preview";
import { sendTransactionalMail, isEmailDeliveryConfigured } from "@/lib/email/mailer";
import { errors } from "@/lib/http";

export const TOKEN_TTL_MINUTES = 30;
export const MAX_VERIFY_ATTEMPTS = 6;

type TokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

async function invalidateExisting(userId: string, type: TokenType) {
  await db
    .update(emailTokens)
    .set({ consumedAt: new Date() })
    .where(and(eq(emailTokens.userId, userId), eq(emailTokens.type, type), isNull(emailTokens.consumedAt)));
}

/**
 * Issues a hashed, single-use code and emails it.
 * The plaintext code never leaves the mail pipeline / server memory.
 */
export async function issueCode(
  userId: string,
  email: string,
  type: TokenType,
): Promise<{ delivered: boolean }> {
  await invalidateExisting(userId, type);
  const code = generateVerificationCode();
  await db.insert(emailTokens).values({
    userId,
    email,
    type,
    codeHash: hashSecret(code),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
  });
  return sendTransactionalMail(email, {
    kind: type === "EMAIL_VERIFICATION" ? "email_verification" : "password_reset",
    code,
    minutes: TOKEN_TTL_MINUTES,
  });
}

type ConsumeResult = { ok: true } | { ok: false; code: "INVALID" | "EXPIRED" | "LOCKED" };

async function consumeCode(
  userId: string,
  type: TokenType,
  code: string,
): Promise<ConsumeResult> {
  const rows = await db
    .select()
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.userId, userId),
        eq(emailTokens.type, type),
        isNull(emailTokens.consumedAt),
      ),
    )
    .orderBy(desc(emailTokens.createdAt))
    .limit(1);

  const token = rows[0];
  if (!token) return { ok: false, code: "INVALID" };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, code: "EXPIRED" };
  if (token.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, code: "LOCKED" };

  if (hashSecret(code.trim()) !== token.codeHash) {
    await db
      .update(emailTokens)
      .set({ attempts: token.attempts + 1 })
      .where(eq(emailTokens.id, token.id));
    return { ok: false, code: "INVALID" };
  }

  await db.update(emailTokens).set({ consumedAt: new Date() }).where(eq(emailTokens.id, token.id));
  return { ok: true };
}

export async function verifyEmailWithCode(userId: string, code: string) {
  const result = await consumeCode(userId, "EMAIL_VERIFICATION", code);
  if (!result.ok) {
    throw errors.validation(
      "কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।",
      "That code is invalid or has expired. Please try again.",
      "CODE_INVALID",
    );
  }
  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function resetPasswordWithCode(
  userId: string,
  code: string,
  newPassword: string,
) {
  const result = await consumeCode(userId, "PASSWORD_RESET", code);
  if (!result.ok) {
    throw errors.validation(
      "কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।",
      "That code is invalid or has expired. Please try again.",
      "CODE_INVALID",
    );
  }
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Setup helper. Active ONLY while SMTP credentials are absent, so the
 * platform can be exercised before Gmail App Password is provisioned.
 * Returns the code from the server-side outbox (tokens themselves stay hashed).
 */
export async function peekPendingCodeForSetup(email: string): Promise<string | null> {
  if (isEmailDeliveryConfigured()) return null;
  const rows = await db
    .select({ user: users })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0]?.user;
  if (!user) return null;

  const tokens = await db
    .select()
    .from(emailTokens)
    .where(and(eq(emailTokens.userId, user.id), isNull(emailTokens.consumedAt)))
    .orderBy(desc(emailTokens.createdAt))
    .limit(1);
  const token = tokens[0];
  if (!token || token.expiresAt.getTime() < Date.now()) return null;

  return verifyEmailPendingCode(user.id);
}
