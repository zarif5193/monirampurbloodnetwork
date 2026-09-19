import { SQL, and, asc, desc, eq, ilike, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles } from "@/db/schema";
import { requireCompletedProfile } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { toPublicDonor } from "@/lib/services/donors";
import { assessEligibility } from "@/lib/eligibility";
import { donorSearchSchema } from "@/lib/validation";

/**
 * Secure donor discovery. Results are paginated, projected through a strict
 * public field set and never include contact information.
 */
export async function GET(request: Request) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.read, "donors:search", session.user.id);

    const url = new URL(request.url);
    const filters = donorSearchSchema.parse({
      bloodGroup: url.searchParams.get("bloodGroup") ?? undefined,
      unionName: url.searchParams.get("unionName") ?? undefined,
      availability: url.searchParams.get("availability") ?? undefined,
      verifiedOnly: url.searchParams.get("verifiedOnly") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    const conditions: SQL[] = [
      eq(donorProfiles.searchable, true),
      eq(donorProfiles.profileComplete, true),
      eq(donorProfiles.availabilityStatus, "AVAILABLE"),
      ne(donorProfiles.userId, session.user.id),
    ];

    if (filters.bloodGroup) conditions.push(eq(donorProfiles.bloodGroup, filters.bloodGroup));
    if (filters.unionName) conditions.push(eq(donorProfiles.unionName, filters.unionName));
    if (filters.availability) {
      conditions.push(eq(donorProfiles.availabilityStatus, filters.availability));
    }
    if (filters.verifiedOnly) conditions.push(eq(donorProfiles.verificationStatus, "VERIFIED"));
    if (filters.query) conditions.push(ilike(donorProfiles.displayName, `%${filters.query}%`));

    const where = and(...conditions);
    const offset = (filters.page - 1) * filters.pageSize;

    const rows = await db
      .select()
      .from(donorProfiles)
      .where(where)
      .orderBy(
        sql`case ${donorProfiles.verificationStatus} when 'VERIFIED' then 0 else 1 end`,
        asc(donorProfiles.unionName),
        desc(donorProfiles.updatedAt),
      )
      .limit(filters.pageSize)
      .offset(offset);

    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(donorProfiles)
      .where(where);

    const total = countRows[0]?.count ?? 0;

    const items = [] as ReturnType<typeof toPublicDonor>[];
    for (const row of rows) {
      const assessment = await assessEligibility({
        dateOfBirth: row.dateOfBirth,
        weightKg: row.weightKg,
        gender: row.gender,
        lastDonationDate: row.lastDonationDate ?? null,
      });
      items.push(
        toPublicDonor(row, {
          eligible: assessment.status === "ELIGIBLE" ? true : assessment.status === "NOT_ELIGIBLE" ? false : null,
        }),
      );
    }

    return jsonOk({
      items,
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      hasMore: offset + items.length < total,
    });
  } catch (error) {
    return jsonError(error);
  }
}
