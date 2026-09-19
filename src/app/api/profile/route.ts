import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, donations, locations, users } from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth/session";
import { clientIp, errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { profileSchema, profileUpdateSchema } from "@/lib/validation";
import { assessEligibility, computeNextDonationDate, getActiveEligibilityRules } from "@/lib/eligibility";
import { ensureCoreDataset } from "@/db/seed";

async function assertValidArea(district: string, upazila: string, unionName: string) {
  const rows = await db
    .select({ id: locations.id })
    .from(locations)
    .where(
      and(
        eq(locations.district, district),
        eq(locations.upazila, upazila),
        eq(locations.unionName, unionName),
        eq(locations.active, true),
      ),
    )
    .limit(1);
  if (rows.length === 0) {
    throw errors.validation(
      "নির্বাচিত ইউনিয়ন/এলাকাটি আমাদের অনুমোদিত তালিকায় নেই। অনুগ্রহ করে তালিকা থেকে নির্বাচন করুন।",
      "The selected union/area is not in the approved dataset. Please choose from the list.",
      "INVALID_AREA",
    );
  }
}

export async function GET() {
  try {
    const session = await requireVerifiedUser();
    const profileRows = await db
      .select()
      .from(donorProfiles)
      .where(eq(donorProfiles.userId, session.user.id))
      .limit(1);
    const profile = profileRows[0];

    const userRows = await db
      .select({ email: users.email, emailVerified: users.emailVerified, language: users.language, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!profile) {
      return jsonOk({ hasProfile: false, user: userRows[0] });
    }

    const rules = await getActiveEligibilityRules();
    const assessment = await assessEligibility({
      dateOfBirth: profile.dateOfBirth,
      weightKg: profile.weightKg,
      gender: profile.gender,
      lastDonationDate: profile.lastDonationDate ?? null,
    });

    const history = await db
      .select()
      .from(donations)
      .where(eq(donations.donorProfileId, profile.id))
      .orderBy(desc(donations.donationDate))
      .limit(20);

    return jsonOk({
      hasProfile: true,
      profileComplete: profile.profileComplete,
      user: userRows[0],
      profile: {
        ...profile,
        healthNotesPrivate: profile.healthNotesPrivate, // private by design, owner only
      },
      eligibility: assessment,
      ruleVersion: rules.ruleVersion,
      ruleSource: rules.source,
      donationHistory: history,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.write, "profile:create", session.user.id);
    await ensureCoreDataset();
    const data = profileSchema.parse(await request.json());
    await assertValidArea(data.district, data.upazila, data.unionName);

    const existing = await db
      .select({ id: donorProfiles.id })
      .from(donorProfiles)
      .where(eq(donorProfiles.userId, session.user.id))
      .limit(1);
    if (existing[0]) {
      throw errors.conflict(
        "আপনার প্রোফাইল ইতিমধ্যে তৈরি করা হয়েছে।",
        "Your profile has already been created.",
      );
    }

    const rules = await getActiveEligibilityRules();
    const { nextPotentialDonationDate, ruleVersion } = computeNextDonationDate({
      lastDonationDate: data.lastDonationDate ?? null,
      gender: data.gender,
      rules,
    });

    const inserted = await db
      .insert(donorProfiles)
      .values({
        userId: session.user.id,
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        weightKg: data.weightKg.toFixed(2),
        heightCm: data.heightCm ? Math.round(data.heightCm) : null,
        district: data.district,
        upazila: data.upazila,
        unionName: data.unionName,
        area: data.area ?? null,
        availabilityStatus: data.availabilityStatus,
        lastDonationDate: data.lastDonationDate ?? null,
        nextPotentialDonationDate,
        donationCount: data.donationCount ?? 0,
        profileComplete: true,
        searchable: data.availabilityStatus === "AVAILABLE",
        ruleVersionUsed: ruleVersion,
        verificationStatus: "UNVERIFIED",
      })
      .returning({ id: donorProfiles.id });

    const profileId = inserted[0]!.id;

    if (data.lastDonationDate) {
      await db.insert(donations).values({
        donorProfileId: profileId,
        donationDate: data.lastDonationDate,
        ruleVersion,
        notes: "প্রোফাইল সম্পূর্ণ করার সময় দেওয়া তথ্য",
      });
    }

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "PROFILE_COMPLETED",
      resourceType: "DONOR_PROFILE",
      resourceId: profileId,
      newState: { bloodGroup: data.bloodGroup, upazila: data.upazila, unionName: data.unionName },
      ipAddress: clientIp(request),
    });

    return jsonOk({ profileComplete: true, nextPotentialDonationDate, ruleVersion });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireVerifiedUser();
    enforceRateLimit(request, rateLimits.write, "profile:update", session.user.id);
    const data = profileUpdateSchema.parse(await request.json());

    const rows = await db
      .select()
      .from(donorProfiles)
      .where(eq(donorProfiles.userId, session.user.id))
      .limit(1);
    const profile = rows[0];
    if (!profile) throw errors.profileIncomplete();

    if (data.unionName || data.upazila || data.district) {
      await assertValidArea(
        data.district ?? profile.district,
        data.upazila ?? profile.upazila,
        data.unionName ?? profile.unionName,
      );
    }

    const merged = {
      displayName: data.displayName ?? profile.displayName,
      phoneNumber: data.phoneNumber ?? profile.phoneNumber,
      dateOfBirth: data.dateOfBirth ?? profile.dateOfBirth,
      gender: data.gender ?? profile.gender,
      bloodGroup: data.bloodGroup ?? profile.bloodGroup,
      weightKg: data.weightKg !== undefined ? data.weightKg : Number(profile.weightKg),
      heightCm: data.heightCm !== undefined ? data.heightCm : profile.heightCm,
      district: data.district ?? profile.district,
      upazila: data.upazila ?? profile.upazila,
      unionName: data.unionName ?? profile.unionName,
      area: data.area !== undefined ? data.area : profile.area,
      availabilityStatus: data.availabilityStatus ?? profile.availabilityStatus,
      lastDonationDate:
        data.lastDonationDate === undefined ? profile.lastDonationDate : data.lastDonationDate,
    };

    const rules = await getActiveEligibilityRules();
    const { nextPotentialDonationDate, ruleVersion } = computeNextDonationDate({
      lastDonationDate: merged.lastDonationDate ?? null,
      gender: merged.gender,
      rules,
    });

    await db
      .update(donorProfiles)
      .set({
        displayName: merged.displayName,
        phoneNumber: merged.phoneNumber,
        dateOfBirth: merged.dateOfBirth,
        gender: merged.gender,
        bloodGroup: merged.bloodGroup,
        weightKg: merged.weightKg.toFixed(2),
        heightCm: merged.heightCm ? Math.round(merged.heightCm) : null,
        district: merged.district,
        upazila: merged.upazila,
        unionName: merged.unionName,
        area: merged.area ?? null,
        availabilityStatus: merged.availabilityStatus,
        lastDonationDate: merged.lastDonationDate ?? null,
        nextPotentialDonationDate,
        searchable: merged.availabilityStatus === "AVAILABLE",
        ruleVersionUsed: ruleVersion,
        updatedAt: new Date(),
      })
      .where(eq(donorProfiles.id, profile.id));

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "PROFILE_UPDATED",
      resourceType: "DONOR_PROFILE",
      resourceId: profile.id,
      ipAddress: clientIp(request),
    });

    return jsonOk({ updated: true, nextPotentialDonationDate, ruleVersion });
  } catch (error) {
    return jsonError(error);
  }
}
