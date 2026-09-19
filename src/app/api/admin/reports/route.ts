import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireStaff } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { reportModerationSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await requireStaff();
    enforceRateLimit(request, rateLimits.read, "admin:reports", session.user.id);

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const rows = await db
      .select()
      .from(reports)
      .where(status ? and(eq(reports.status, status as "PENDING")) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(60);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

/** Moderation status can only be changed by staff, never by the reporting user. */
export async function POST(request: Request) {
  try {
    const session = await requireStaff();
    enforceRateLimit(request, rateLimits.write, "admin:reports:moderate", session.user.id);
    const body = (await request.json()) as { id?: string };
    if (!body.id) return jsonError(new Error("validation"));
    const data = reportModerationSchema.parse(body);

    const rows = await db.select().from(reports).where(eq(reports.id, body.id)).limit(1);
    const existing = rows[0];
    if (!existing) return jsonError(new Error("not found"));

    await db
      .update(reports)
      .set({
        status: data.status,
        priority: data.priority ?? existing.priority,
        resolutionNote: data.resolutionNote ?? existing.resolutionNote,
        resolvedBy: ["RESOLVED", "REJECTED", "DISMISSED"].includes(data.status) ? session.user.id : null,
        resolvedAt: ["RESOLVED", "REJECTED", "DISMISSED"].includes(data.status) ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, body.id));

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "REPORT_RESOLVED",
      resourceType: "REPORT",
      resourceId: body.id,
      previousState: { status: existing.status, priority: existing.priority },
      newState: { status: data.status, priority: data.priority ?? existing.priority },
      ipAddress: clientIp(request),
    });

    return jsonOk({ status: data.status });
  } catch (error) {
    return jsonError(error);
  }
}
