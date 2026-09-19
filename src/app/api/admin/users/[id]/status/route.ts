import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { adminUserActionSchema } from "@/lib/validation";

/** Suspend / reactivate an account. Roles can never be set from the client. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    enforceRateLimit(request, rateLimits.write, "admin:user-status", session.user.id);
    const { id } = await context.params;
    const data = adminUserActionSchema.parse(await request.json());

    if (id === session.user.id) {
      return jsonError(new Error("cannot change own status"));
    }

    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const target = rows[0];
    if (!target) return jsonError(new Error("not found"));
    if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return jsonError(new Error("forbidden"));
    }

    await db.update(users).set({ status: data.status, updatedAt: new Date() }).where(eq(users.id, id));
    if (data.status === "SUSPENDED" || data.status === "DEACTIVATED") {
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, id));
    }

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: data.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      resourceType: "USER",
      resourceId: id,
      previousState: { status: target.status },
      newState: { status: data.status },
      ipAddress: clientIp(request),
    });

    return jsonOk({ status: data.status });
  } catch (error) {
    return jsonError(error);
  }
}
