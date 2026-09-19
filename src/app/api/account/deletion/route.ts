import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, sessions, users } from "@/db/schema";
import { requireSession, revokeSession } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { accountDeletionSchema } from "@/lib/validation";

/**
 * Account deletion request. Requires authentication and explicit confirmation.
 * Personal identifiers are anonymised immediately; audit records are retained
 * for legal/safety purposes and no longer reference the person.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(request, rateLimits.write, "account:delete", session.user.id);
    accountDeletionSchema.parse(await request.json());

    await db
      .update(users)
      .set({ status: "DELETION_REQUESTED", deletionRequestedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    await db
      .update(donorProfiles)
      .set({
        displayName: "নিবন্ধন বাতিলকৃত ডোনার",
        phoneNumber: "00000000000",
        searchable: false,
        availabilityStatus: "NOT_AVAILABLE",
        area: null,
        healthNotesPrivate: null,
        updatedAt: new Date(),
      })
      .where(eq(donorProfiles.userId, session.user.id));

    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, session.user.id));

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "ACCOUNT_DELETION_REQUESTED",
      resourceType: "USER",
      resourceId: session.user.id,
      ipAddress: clientIp(request),
    });

    const response = jsonOk({
      requested: true,
      messageBn:
        "আপনার অ্যাকাউন্ট মুছে ফেলার অনুরোধ নথিভুক্ত হয়েছে। আপনার ব্যক্তিগত তথ্য সুরক্ষার স্বার্থে সাথে সাথেই অপসারণ/গুম করা হয়েছে।",
      messageEn:
        "Your account deletion request has been recorded. Your personal data has been removed or anonymised immediately.",
    });

    revokeSession(session.sessionToken);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
