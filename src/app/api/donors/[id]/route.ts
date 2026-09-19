import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, users } from "@/db/schema";
import { requireCompletedProfile } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { toPublicDonor } from "@/lib/services/donors";
import { assessEligibility } from "@/lib/eligibility";
import { ELIGIBILITY_DISCLAIMER_BN, ELIGIBILITY_DISCLAIMER_EN } from "@/lib/eligibility";

/** Public-safe donor detail. Contact details are never returned here. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.read, "donors:detail", session.user.id);
    const { id } = await context.params;

    if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(new Error("not found"));

    const rows = await db
      .select({ profile: donorProfiles, status: users.status })
      .from(donorProfiles)
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(
        and(
          eq(donorProfiles.id, id),
          eq(donorProfiles.profileComplete, true),
          eq(donorProfiles.searchable, true),
          eq(users.status, "ACTIVE"),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return jsonOk({ donor: null });
    }

    const assessment = await assessEligibility({
      dateOfBirth: row.profile.dateOfBirth,
      weightKg: row.profile.weightKg,
      gender: row.profile.gender,
      lastDonationDate: row.profile.lastDonationDate ?? null,
    });

    return jsonOk({
      donor: toPublicDonor(row.profile, {
        eligible: assessment.status === "ELIGIBLE" ? true : assessment.status === "NOT_ELIGIBLE" ? false : null,
      }),
      disclaimerBn: ELIGIBILITY_DISCLAIMER_BN,
      disclaimerEn: ELIGIBILITY_DISCLAIMER_EN,
      ruleVersion: assessment.ruleVersion,
    });
  } catch (error) {
    return jsonError(error);
  }
}
