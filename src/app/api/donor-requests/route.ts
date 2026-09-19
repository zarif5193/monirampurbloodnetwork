import { and, desc, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorRequests } from "@/db/schema";
import { requireCompletedProfile } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { expireStaleRequests } from "@/lib/services/requests";

/** Donor inbox: requests the donor has been notified about. */
export async function GET(request: Request) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.read, "donor-requests:inbox", session.user.id);
    await expireStaleRequests();

    const rows = await db
      .select({
        donorRequestId: donorRequests.id,
        status: donorRequests.status,
        contactPermissionGranted: donorRequests.contactPermissionGranted,
        createdAt: donorRequests.createdAt,
        request: {
          id: bloodRequests.id,
          patientName: bloodRequests.patientName,
          bloodGroup: bloodRequests.bloodGroup,
          quantityUnits: bloodRequests.quantityUnits,
          hospital: bloodRequests.hospital,
          locationText: bloodRequests.locationText,
          requiredDate: bloodRequests.requiredDate,
          urgency: bloodRequests.urgency,
          status: bloodRequests.status,
          contactName: bloodRequests.contactName,
          contactPhone: bloodRequests.contactPhone,
          description: bloodRequests.description,
        },
      })
      .from(donorRequests)
      .innerJoin(bloodRequests, eq(bloodRequests.id, donorRequests.requestId))
      .where(
        and(
          eq(donorRequests.donorId, session.user.id),
          ne(donorRequests.status, "WITHDRAWN"),
          or(ne(bloodRequests.status, "EXPIRED"), eq(bloodRequests.status, "COMPLETED")),
        ),
      )
      .orderBy(desc(donorRequests.createdAt))
      .limit(60);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}
