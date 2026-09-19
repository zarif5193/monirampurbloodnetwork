import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { ensureNotificationPreferences } from "@/lib/services/notifications";
import { notificationPreferencesSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.read, "notifications:prefs", session.user.id);
    await ensureNotificationPreferences(session.user.id);
    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, session.user.id))
      .limit(1);
    return jsonOk({ preferences: rows[0] ?? null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.write, "notifications:prefs:update", session.user.id);
    const data = notificationPreferencesSchema.parse(await request.json());
    await ensureNotificationPreferences(session.user.id);
    await db
      .update(notificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, session.user.id));
    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, session.user.id))
      .limit(1);
    return jsonOk({ preferences: rows[0] ?? null });
  } catch (error) {
    return jsonError(error);
  }
}
