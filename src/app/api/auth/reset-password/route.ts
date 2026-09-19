import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { resetPasswordWithCode } from "@/lib/auth/tokens";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, rateLimits.resetPassword, "auth:reset");
    const data = resetPasswordSchema.parse(await request.json());

    const rows = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const user = rows[0];
    if (!user) {
      return jsonOk({ reset: true });
    }

    await resetPasswordWithCode(user.id, data.code, data.password);

    // Invalidate every existing session after a password reset.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, user.id));

    await recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "PASSWORD_RESET",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress: clientIp(request),
    });

    return jsonOk({
      reset: true,
      messageBn: "আপনার পাসওয়ার্ড পরিবর্তন হয়েছে। অনুগ্রহ করে নতুন পাসওয়ার্ড দিয়ে লগইন করুন।",
      messageEn: "Your password has been updated. Please sign in with your new password.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
