import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth/session";
import { clientIp, errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { availabilitySchema } from "@/lib/validation";
import { computeNextDonationDate, getActiveEligibilityRules } from "@/lib/eligibility";

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.write, "profile:availability", session.user.id);
    const data = availabilitySchema.parse(await request.json());

    const rows = await db
      .select()
      .from(donorProfiles)
      .where(eq(donorProfiles.userId, session.user.id))
      .limit(1);
    const profile = rows[0];
    if (!profile) throw errors.profileIncomplete();

    const rules = await getActiveEligibilityRules();
    const { nextPotentialDonationDate, ruleVersion } = computeNextDonationDate({
      lastDonationDate: profile.lastDonationDate ?? null,
      gender: profile.gender,
      rules,
    });

    await db
      .update(donorProfiles)
      .set({
        availabilityStatus: data.availabilityStatus,
        searchable: data.availabilityStatus === "AVAILABLE",
        nextPotentialDonationDate,
        ruleVersionUsed: ruleVersion,
        updatedAt: new Date(),
      })
      .where(eq(donorProfiles.id, profile.id));

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "AVAILABILITY_CHANGED",
      resourceType: "DONOR_PROFILE",
      resourceId: profile.id,
      previousState: { availabilityStatus: profile.availabilityStatus },
      newState: { availabilityStatus: data.availabilityStatus },
      ipAddress: clientIp(request),
    });

    return jsonOk({ availabilityStatus: data.availabilityStatus, searchable: data.availabilityStatus === "AVAILABLE" });
  } catch (error) {
    return jsonError(error);
  }
}
