import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorProfiles, donorRequests, users } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { errors } from "@/lib/http";
import { createNotification } from "@/lib/services/notifications";
import { assessEligibility } from "@/lib/eligibility";

/**
 * Matches a new request to eligible, available donors in the service area.
 * No phone numbers are involved in matching and no donor is contacted
 * automatically — donors receive an in-app notification they must act on.
 */
export async function notifyMatchingDonors(requestId: string) {
  const rows = await db.select().from(bloodRequests).where(eq(bloodRequests.id, requestId)).limit(1);
  const request = rows[0];
  if (!request) return 0;

  const candidateRows = await db
    .select({
      userId: donorProfiles.userId,
      displayName: donorProfiles.displayName,
      lastDonationDate: donorProfiles.lastDonationDate,
      gender: donorProfiles.gender,
      dateOfBirth: donorProfiles.dateOfBirth,
      weightKg: donorProfiles.weightKg,
    })
    .from(donorProfiles)
    .innerJoin(users, eq(users.id, donorProfiles.userId))
    .where(
      and(
        eq(donorProfiles.searchable, true),
        eq(donorProfiles.profileComplete, true),
        eq(donorProfiles.availabilityStatus, "AVAILABLE"),
        eq(users.status, "ACTIVE"),
        eq(donorProfiles.upazila, request.upazila),
        request.bloodGroup === "UNKNOWN"
          ? ne(donorProfiles.bloodGroup, "UNKNOWN")
          : eq(donorProfiles.bloodGroup, request.bloodGroup),
      ),
    )
    .limit(200);

  if (candidateRows.length === 0) return 0;

  const eligibleCandidates = [] as typeof candidateRows;
  for (const candidate of candidateRows) {
    const assessment = await assessEligibility({
      dateOfBirth: candidate.dateOfBirth,
      weightKg: candidate.weightKg,
      gender: candidate.gender,
      lastDonationDate: candidate.lastDonationDate ?? null,
    });
    if (assessment.status !== "NOT_ELIGIBLE") eligibleCandidates.push(candidate);
  }

  if (eligibleCandidates.length === 0) return 0;

  await db
    .insert(donorRequests)
    .values(
      eligibleCandidates.map((candidate) => ({
        requestId: request.id,
        donorId: candidate.userId,
      })),
    )
    .onConflictDoNothing();

  const urgencyBn =
    request.urgency === "CRITICAL" ? "অতি জরুরি" : request.urgency === "URGENT" ? "জরুরি" : "সাধারণ";

  for (const candidate of eligibleCandidates) {
    await createNotification({
      userId: candidate.userId,
      type: "NEW_BLOOD_REQUEST",
      preferenceKey: "newRequestAlerts",
      content: {
        titleBn: "নতুন রক্তের অনুরোধ",
        titleEn: "New blood request",
        bodyBn: `${request.bloodGroup} রক্তের একটি ${urgencyBn} অনুরোধ মণিরামপুরে জমা হয়েছে। বিস্তারিত দেখে সিদ্ধান্ত নিন।`,
        bodyEn: `A ${urgencyBn.toLowerCase()} request for ${request.bloodGroup} blood has been submitted in Manirampur. Review the details before deciding.`,
      },
      link: "/requests/inbox",
    });
  }

  await db
    .update(bloodRequests)
    .set({ status: "SEARCHING_FOR_DONOR", updatedAt: new Date() })
    .where(and(eq(bloodRequests.id, request.id), eq(bloodRequests.status, "VERIFIED")));

  return eligibleCandidates.length;
}

export async function listDonorInbox(userId: string) {
  const rows = await db
    .select({
      donorRequest: donorRequests,
      request: bloodRequests,
    })
    .from(donorRequests)
    .innerJoin(bloodRequests, eq(bloodRequests.id, donorRequests.requestId))
    .where(and(eq(donorRequests.donorId, userId), ne(donorRequests.status, "WITHDRAWN")))
    .orderBy(desc(donorRequests.createdAt))
    .limit(50);

  return rows.map((row) => ({
    donorRequestId: row.donorRequest.id,
    status: row.donorRequest.status,
    contactPermissionGranted: row.donorRequest.contactPermissionGranted,
    createdAt: row.donorRequest.createdAt,
    request: {
      id: row.request.id,
      patientName: row.request.patientName,
      bloodGroup: row.request.bloodGroup,
      quantityUnits: row.request.quantityUnits,
      hospital: row.request.hospital,
      locationText: row.request.locationText,
      requiredDate: row.request.requiredDate,
      urgency: row.request.urgency,
      status: row.request.status,
      contactName: row.request.contactName,
      contactPhone: row.request.contactPhone,
      description: row.request.description,
    },
  }));
}

/** Donor accepts: explicit, revocable contact permission is granted here. */
export async function acceptRequestAsDonor(userId: string, requestId: string, ip: string) {
  const rows = await db
    .select()
    .from(donorRequests)
    .where(and(eq(donorRequests.donorId, userId), eq(donorRequests.requestId, requestId)))
    .limit(1);
  const donorRequest = rows[0];
  if (!donorRequest) throw errors.forbidden();
  if (donorRequest.status === "DECLINED") {
    throw errors.conflict(
      "আপনি ইতিমধ্যে এই অনুরোধটি অগ্রাহ্য করেছেন।",
      "You have already declined this request.",
    );
  }

  const now = new Date();
  await db
    .update(donorRequests)
    .set({
      status: "ACCEPTED",
      donorAcceptedAt: now,
      contactPermissionGranted: true,
      contactPermissionGrantedAt: now,
    })
    .where(eq(donorRequests.id, donorRequest.id));

  const requestRows = await db
    .select({ requesterId: bloodRequests.requesterId, bloodGroup: bloodRequests.bloodGroup })
    .from(bloodRequests)
    .where(eq(bloodRequests.id, requestId))
    .limit(1);
  const request = requestRows[0];

  if (request) {
    await db
      .update(bloodRequests)
      .set({ status: "ACCEPTED", updatedAt: now })
      .where(
        and(
          eq(bloodRequests.id, requestId),
          inArray(bloodRequests.status, ["PENDING_REVIEW", "VERIFIED", "SEARCHING_FOR_DONOR", "DONOR_CONTACTED"]),
        ),
      );

    await createNotification({
      userId: request.requesterId,
      type: "REQUEST_ACCEPTED",
      preferenceKey: "requestUpdates",
      content: {
        titleBn: "রক্তদাতা আপনার অনুরোধ গ্রহণ করেছেন",
        titleEn: "A donor has accepted your request",
        bodyBn: `${request.bloodGroup} রক্তের অনুরোধটি একজন রক্তদাতা গ্রহণ করেছেন। এখন আপনি রক্তদাতার যোগাযোগের নম্বর দেখতে পারবেন।`,
        bodyEn: `A donor has accepted your request for ${request.bloodGroup} blood. You may now view the donor’s contact number.`,
      },
      link: `/requests/${requestId}`,
    });
  }

  await recordAudit({
    actorId: userId,
    actorRole: "USER",
    action: "CONTACT_PERMISSION_GRANTED",
    resourceType: "DONOR_REQUEST",
    resourceId: donorRequest.id,
    newState: { requestId, contactPermissionGranted: true },
    ipAddress: ip,
  });
}

export async function declineRequestAsDonor(userId: string, requestId: string) {
  const rows = await db
    .select()
    .from(donorRequests)
    .where(and(eq(donorRequests.donorId, userId), eq(donorRequests.requestId, requestId)))
    .limit(1);
  const donorRequest = rows[0];
  if (!donorRequest) throw errors.forbidden();

  await db
    .update(donorRequests)
    .set({
      status: "DECLINED",
      donorDeclinedAt: new Date(),
      contactPermissionGranted: false,
    })
    .where(eq(donorRequests.id, donorRequest.id));

  const requestRows = await db
    .select({ requesterId: bloodRequests.requesterId })
    .from(bloodRequests)
    .where(eq(bloodRequests.id, requestId))
    .limit(1);

  if (requestRows[0]) {
    await createNotification({
      userId: requestRows[0].requesterId,
      type: "REQUEST_DECLINED",
      preferenceKey: "requestUpdates",
      content: {
        titleBn: "একজন রক্তদাতা অনুরোধটি অগ্রাহ্য করেছেন",
        titleEn: "A donor declined this request",
        bodyBn: "অনুরোধটি এখনও চালু আছে। আমরা অন্য উপলব্ধ রক্তদাতাদের জানাতে থাকব।",
        bodyEn: "Your request is still active. We will keep notifying other available donors.",
      },
      link: `/requests/${requestId}`,
    });
  }
}

/**
 * Contact endpoint. Authorisation happens entirely server-side:
 * the caller must own the request AND the donor must have accepted it.
 */
export async function getAuthorisedDonorContact(userId: string, requestId: string, ip?: string | null) {
  const requestRows = await db
    .select()
    .from(bloodRequests)
    .where(and(eq(bloodRequests.id, requestId), eq(bloodRequests.requesterId, userId)))
    .limit(1);
  const request = requestRows[0];
  if (!request) throw errors.forbidden();

  const acceptedRows = await db
    .select({
      donorRequest: donorRequests,
      displayName: donorProfiles.displayName,
      phoneNumber: donorProfiles.phoneNumber,
      bloodGroup: donorProfiles.bloodGroup,
      userId: donorProfiles.userId,
    })
    .from(donorRequests)
    .innerJoin(donorProfiles, eq(donorProfiles.userId, donorRequests.donorId))
    .where(
      and(
        eq(donorRequests.requestId, requestId),
        eq(donorRequests.status, "ACCEPTED"),
        eq(donorRequests.contactPermissionGranted, true),
      ),
    )
    .limit(1);

  const accepted = acceptedRows[0];
  if (!accepted) throw errors.forbidden();

  await recordAudit({
    actorId: userId,
    actorRole: "USER",
    action: "CONTACT_VIEWED",
    resourceType: "BLOOD_REQUEST",
    resourceId: requestId,
    newState: { donorUserId: accepted.userId },
    ipAddress: ip,
  });

  return {
    donorId: accepted.userId,
    displayName: accepted.displayName,
    phoneNumber: accepted.phoneNumber,
    bloodGroup: accepted.bloodGroup,
    grantedAt: accepted.donorRequest.contactPermissionGrantedAt,
  };
}

export async function expireStaleRequests() {
  await db
    .update(bloodRequests)
    .set({ status: "EXPIRED", updatedAt: new Date() })
    .where(
      and(
        inArray(bloodRequests.status, ["PENDING_REVIEW", "VERIFIED", "SEARCHING_FOR_DONOR", "DONOR_CONTACTED"]),
        sql`${bloodRequests.requiredDate} < current_date - interval '7 days'`,
      ),
    );
}
