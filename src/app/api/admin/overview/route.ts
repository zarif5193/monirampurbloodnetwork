import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorProfiles, reports, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const [donorStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        verified: sql<number>`count(*) filter (where ${donorProfiles.verificationStatus} = 'VERIFIED')::int`,
        available: sql<number>`count(*) filter (where ${donorProfiles.availabilityStatus} = 'AVAILABLE')::int`,
      })
      .from(donorProfiles);

    const [requestStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${bloodRequests.status} = 'PENDING_REVIEW')::int`,
        accepted: sql<number>`count(*) filter (where ${bloodRequests.status} = 'ACCEPTED')::int`,
        completed: sql<number>`count(*) filter (where ${bloodRequests.status} = 'COMPLETED')::int`,
      })
      .from(bloodRequests);

    const [reportStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${reports.status} = 'PENDING')::int`,
      })
      .from(reports);

    const [userStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        verifiedEmails: sql<number>`count(*) filter (where ${users.emailVerified})::int`,
        suspended: sql<number>`count(*) filter (where ${users.status} = 'SUSPENDED')::int`,
      })
      .from(users);

    const pendingReports = await db
      .select({
        id: reports.id,
        reason: reports.reason,
        targetType: reports.targetType,
        priority: reports.priority,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(and(eq(reports.status, "PENDING")))
      .limit(10);

    const pendingRequests = await db
      .select({
        id: bloodRequests.id,
        patientName: bloodRequests.patientName,
        bloodGroup: bloodRequests.bloodGroup,
        hospital: bloodRequests.hospital,
        urgency: bloodRequests.urgency,
        createdAt: bloodRequests.createdAt,
      })
      .from(bloodRequests)
      .where(eq(bloodRequests.status, "PENDING_REVIEW"))
      .limit(10);

    return jsonOk({
      donors: donorStats,
      requests: requestStats,
      reports: reportStats,
      users: userStats,
      pendingReports,
      pendingRequests,
    });
  } catch (error) {
    return jsonError(error);
  }
}
