import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { issueCode } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import { clientIp, errors, jsonOk, jsonError } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { rateLimits, enforceRateLimit } from "@/lib/rate-limit";
import { ensureNotificationPreferences } from "@/lib/services/notifications";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, rateLimits.register, "auth:register");

    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing[0]) {
      throw errors.conflict(
        "এই ইমেইল ঠিকানায় ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন অথবা পাসওয়ার্ড রিসেট করুন।",
        "An account already exists with this email address. Please sign in or reset your password.",
      );
    }

    const passwordHash = await hashPassword(data.password);
    const role = env.adminEmails.includes(data.email) ? "SUPER_ADMIN" : "USER";

    const inserted = await db
      .insert(users)
      .values({ email: data.email, passwordHash, role, language: "bn" })
      .returning({ id: users.id, email: users.email, role: users.role });

    const user = inserted[0]!;
    await ensureNotificationPreferences(user.id);

    const delivery = await issueCode(user.id, user.email, "EMAIL_VERIFICATION");
    const session = await createSession(user.id, request);

    await recordAudit({
      actorId: user.id,
      actorRole: role,
      action: "USER_REGISTERED",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress: clientIp(request),
    });

    const response = jsonOk({
      email: user.email,
      emailDelivered: delivery.delivered,
      stage: "VERIFY_EMAIL",
    });
    return attachSessionCookie(response, session.token, session.expiresAt);
  } catch (error) {
    return jsonError(error);
  }
}
