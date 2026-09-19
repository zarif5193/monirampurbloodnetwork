import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { requireSession, revokeSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(request, rateLimits.write, "auth:change-password", session.user.id);
    const data = changePasswordSchema.parse(await request.json());

    const { users } = await import("@/db/schema");
    const rows = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(data.currentPassword, user.passwordHash))) {
      throw errors.invalidCredentials();
    }

    const passwordHash = await hashPassword(data.password);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    // Keep the current session, revoke all others.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, session.user.id), ne(sessions.tokenHash, session.sessionToken)));

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "PASSWORD_CHANGED",
      resourceType: "USER",
      resourceId: session.user.id,
      ipAddress: clientIp(request),
    });

    revokeSession(session.sessionToken);

    return jsonOk({
      changed: true,
      messageBn: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।",
      messageEn: "Your password has been changed successfully.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
