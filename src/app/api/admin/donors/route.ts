import { SQL, and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";

/** Staff donor management view — includes private contact data for authorised roles only. */
export async function GET(request: Request) {
  try {
    const session = await requireStaff();
    enforceRateLimit(request, rateLimits.read, "admin:donors", session.user.id);

    const url = new URL(request.url);
    const status = url.searchParams.get("verificationStatus");
    const query = url.searchParams.get("query");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = 20;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(donorProfiles.verificationStatus, status as "VERIFIED"));
    if (query) conditions.push(ilike(donorProfiles.displayName, `%${query}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: donorProfiles.id,
        userId: donorProfiles.userId,
        displayName: donorProfiles.displayName,
        email: users.email,
        phoneNumber: donorProfiles.phoneNumber,
        bloodGroup: donorProfiles.bloodGroup,
        upazila: donorProfiles.upazila,
        unionName: donorProfiles.unionName,
        availabilityStatus: donorProfiles.availabilityStatus,
        verificationStatus: donorProfiles.verificationStatus,
        donationCount: donorProfiles.donationCount,
        lastDonationDate: donorProfiles.lastDonationDate,
        createdAt: donorProfiles.createdAt,
      })
      .from(donorProfiles)
      .innerJoin(users, eq(users.id, donorProfiles.userId))
      .where(where)
      .orderBy(desc(donorProfiles.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(donorProfiles)
      .where(where);

    return jsonOk({ items: rows, total: countRow?.count ?? 0, page, pageSize });
  } catch (error) {
    return jsonError(error);
  }
}
