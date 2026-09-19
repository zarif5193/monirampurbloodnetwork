import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";

/** Audit logs are visible to administrators only. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const request0 = request;
    enforceRateLimit(request0, rateLimits.read, "admin:audit");

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        previousState: auditLogs.previousState,
        newState: auditLogs.newState,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        actorEmail: users.email,
        actorRole: auditLogs.actorRole,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(action ? eq(auditLogs.action, action) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}
