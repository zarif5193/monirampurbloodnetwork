import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorRequests } from "@/db/schema";
import { requireStaff } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { createNotification } from "@/lib/services/notifications";
import { notifyMatchingDonors } from "@/lib/services/requests";
import { requestStatusSchema } from "@/lib/validation";

/** Request verification / moderation. Donors are only broadcast after approval. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff();
    enforceRateLimit(request, rateLimits.write, "admin:request-status", session.user.id);
    const { id } = await context.params;
    const data = requestStatusSchema.parse(await request.json());

    const rows = await db.select().from(bloodRequests).where(eq(bloodRequests.id, id)).limit(1);
    const existing = rows[0];
    if (!existing) return jsonError(new Error("not found"));

    await db
      .update(bloodRequests)
      .set({
        status: data.status,
        verifiedBy: session.user.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bloodRequests.id, id));

    let notifiedDonors = 0;
    if (data.status === "VERIFIED") {
      notifiedDonors = await notifyMatchingDonors(id);
    }

    if (data.status === "REJECTED" || data.status === "CANCELLED") {
      const donors = await db
        .select({ donorId: donorRequests.donorId })
        .from(donorRequests)
        .where(eq(donorRequests.requestId, id))
        .limit(200);
      for (const donor of donors) {
        await createNotification({
          userId: donor.donorId,
          type: "SYSTEM_ANNOUNCEMENT",
          preferenceKey: "systemAnnouncements",
          content: {
            titleBn: "একটি রক্তের অনুরোধ বাতিল হয়েছে",
            titleEn: "A blood request has been withdrawn",
            bodyBn: "আপনি যে অনুরোধটি দেখেছিলেন সেটি আর সক্রিয় নেই।",
            bodyEn: "A request you reviewed is no longer active.",
          },
        });
      }
      await db
        .update(donorRequests)
        .set({ status: "WITHDRAWN" })
        .where(eq(donorRequests.requestId, id));
    }

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: data.status === "REJECTED" ? "REQUEST_REJECTED" : "REQUEST_APPROVED",
      resourceType: "BLOOD_REQUEST",
      resourceId: id,
      previousState: { status: existing.status },
      newState: { status: data.status, notifiedDonors },
      ipAddress: clientIp(request),
    });

    return jsonOk({ status: data.status, notifiedDonors });
  } catch (error) {
    return jsonError(error);
  }
}
