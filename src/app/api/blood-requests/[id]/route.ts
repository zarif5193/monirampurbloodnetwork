import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorProfiles, donorRequests } from "@/db/schema";
import { requireCompletedProfile, requireStaff } from "@/lib/auth/session";
import { errors, jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";

/**
 * Request detail. The requester and staff may see everything; an accepted donor
 * sees the operational details but never the requester's private contact phone
 * until they have explicitly accepted (their own choice grants permission).
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.read, "requests:detail", session.user.id);
    const { id } = await context.params;

    const rows = await db.select().from(bloodRequests).where(eq(bloodRequests.id, id)).limit(1);
    const request0 = rows[0];
    if (!request0) throw errors.notFound();

    const isRequester = request0.requesterId === session.user.id;
    const isStaff = ["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(session.user.role);

    let donorResponse: { status: string; contactPermissionGranted: boolean } | null = null;
    if (!isRequester && !isStaff) {
      const donorRows = await db
        .select()
        .from(donorRequests)
        .where(and(eq(donorRequests.requestId, id), eq(donorRequests.donorId, session.user.id)))
        .limit(1);
      if (!donorRows[0]) throw errors.forbidden();
      donorResponse = {
        status: donorRows[0].status,
        contactPermissionGranted: donorRows[0].contactPermissionGranted,
      };
    }

    let acceptedDonors: { donorId: string; displayName: string; acceptedAt: Date | null }[] = [];
    if (isRequester || isStaff) {
      acceptedDonors = await db
        .select({
          donorId: donorRequests.donorId,
          displayName: donorProfiles.displayName,
          acceptedAt: donorRequests.donorAcceptedAt,
        })
        .from(donorRequests)
        .innerJoin(donorProfiles, eq(donorProfiles.userId, donorRequests.donorId))
        .where(and(eq(donorRequests.requestId, id), eq(donorRequests.status, "ACCEPTED")))
        .limit(20);
    }

    // Proof documents are never exposed here — owner/admins use the document endpoint.
    const { proofDocumentPath: _hidden, ...safeRequest } = request0;

    return jsonOk({
      request: safeRequest,
      viewer: { isRequester, isStaff },
      donorResponse,
      acceptedDonors,
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** Requester may cancel or complete their own request. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.write, "requests:update", session.user.id);
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };

    if (!body.status || !["CANCELLED", "COMPLETED"].includes(body.status)) {
      throw errors.validation("অনুরোধের অবস্থা সঠিক নয়।", "Invalid request status.");
    }

    const result = await db
      .update(bloodRequests)
      .set({ status: body.status as "CANCELLED" | "COMPLETED", updatedAt: new Date() })
      .where(and(eq(bloodRequests.id, id), eq(bloodRequests.requesterId, session.user.id)))
      .returning({ id: bloodRequests.id });

    if (!result[0]) throw errors.forbidden();
    return jsonOk({ status: body.status });
  } catch (error) {
    return jsonError(error);
  }
}

/** Staff-only deletion (moderation). */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await context.params;
    await db.delete(bloodRequests).where(eq(bloodRequests.id, id));
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
