import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorProfiles, reports } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth/session";
import { errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.report, "reports:create", session.user.id);
    const data = reportSchema.parse(await request.json());

    // Validate the target exists before accepting a report.
    if (data.targetType === "DONOR") {
      const rows = await db
        .select({ id: donorProfiles.id })
        .from(donorProfiles)
        .where(eq(donorProfiles.id, data.targetId))
        .limit(1);
      if (!rows[0]) throw errors.notFound();
    } else if (data.targetType === "BLOOD_REQUEST") {
      const rows = await db
        .select({ id: bloodRequests.id })
        .from(bloodRequests)
        .where(eq(bloodRequests.id, data.targetId))
        .limit(1);
      if (!rows[0]) throw errors.notFound();
    }

    const inserted = await db
      .insert(reports)
      .values({
        reporterId: session.user.id,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        description: data.description ?? null,
        status: "PENDING",
        priority: data.reason === "HARASSMENT" || data.reason === "FRAUD" ? "HIGH" : "NORMAL",
      })
      .returning({ id: reports.id });

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "REPORT_CREATED",
      resourceType: "REPORT",
      resourceId: inserted[0]!.id,
      newState: { targetType: data.targetType, reason: data.reason },
      ipAddress: clientIp(request),
    });

    return jsonOk({
      id: inserted[0]!.id,
      messageBn: "আপনার রিপোর্টটি গ্রহণ করা হয়েছে। আমাদের পরিচ্ছন্নতা টিম দ্রুত পর্যালোচনা করবে।",
      messageEn: "Your report has been submitted. Our moderation team will review it shortly.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** A user can review their own reports only. */
export async function GET(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.read, "reports:mine", session.user.id);
    const items = await db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        reason: reports.reason,
        status: reports.status,
        priority: reports.priority,
        createdAt: reports.createdAt,
        resolutionNote: reports.resolutionNote,
      })
      .from(reports)
      .where(eq(reports.reporterId, session.user.id))
      .orderBy(desc(reports.createdAt))
      .limit(50);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}
