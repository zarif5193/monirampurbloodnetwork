import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { attachSessionCookie, createSession } from "@/lib/auth/session";
import { clientIp, errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimitIdentity, rateLimits } from "@/lib/rate-limit";
import { ensureNotificationPreferences } from "@/lib/services/notifications";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsedEmail = typeof body?.email === "string" ? body.email.toLowerCase() : undefined;
    enforceRateLimit(request, rateLimits.login, "auth:login", rateLimitIdentity(request, parsedEmail));

    const data = loginSchema.parse(body);
    const rows = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const user = rows[0];

    // Identical response for unknown email and wrong password (no enumeration).
    if (!user) throw errors.invalidCredentials();
    const passwordValid = await verifyPassword(data.password, user.passwordHash);
    if (!passwordValid) throw errors.invalidCredentials();
    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      throw errors.forbidden();
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await ensureNotificationPreferences(user.id);

    const profileRows = await db
      .select({ complete: donorProfiles.profileComplete })
      .from(donorProfiles)
      .where(eq(donorProfiles.userId, user.id))
      .limit(1);

    const session = await createSession(user.id, request);

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "USER_LOGIN",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress: clientIp(request),
    });

    const response = jsonOk({
      email: user.email,
      emailVerified: user.emailVerified,
      profileComplete: profileRows[0]?.complete ?? false,
      role: user.role,
      stage: !user.emailVerified ? "VERIFY_EMAIL" : profileRows[0]?.complete ? "HOME" : "COMPLETE_PROFILE",
    });
    return attachSessionCookie(response, session.token, session.expiresAt);
  } catch (error) {
    return jsonError(error);
  }
}
