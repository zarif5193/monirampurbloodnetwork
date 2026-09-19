import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donorProfiles, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { createNotification } from "@/lib/services/notifications";
import { donorVerificationSchema } from "@/lib/validation";

/** Donor verification / suspension. Server-side role check, audited. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    enforceRateLimit(request, rateLimits.write, "admin:verify-donor", session.user.id);
    const { id } = await context.params;
    const data = donorVerificationSchema.parse(await request.json());

    const rows = await db.select().from(donorProfiles).where(eq(donorProfiles.id, id)).limit(1);
    const profile = rows[0];
    if (!profile) return jsonError(new Error("not found"));

    await db
      .update(donorProfiles)
      .set({
        verificationStatus: data.verificationStatus,
        searchable:
          data.verificationStatus === "SUSPENDED" ? false : profile.availabilityStatus === "AVAILABLE",
        updatedAt: new Date(),
      })
      .where(eq(donorProfiles.id, id));

    if (data.verificationStatus === "SUSPENDED") {
      await db.update(users).set({ status: "SUSPENDED", updatedAt: new Date() }).where(eq(users.id, profile.userId));
    }

    await createNotification({
      userId: profile.userId,
      type: "SYSTEM_ANNOUNCEMENT",
      preferenceKey: "systemAnnouncements",
      content: {
        titleBn: "প্রোফাইল যাচাইয়ের হালনাগাদ",
        titleEn: "Profile verification update",
        bodyBn:
          data.verificationStatus === "VERIFIED"
            ? "অভিনন্দন! আপনার রক্তদাতা প্রোফাইল যাচাই করা হয়েছে।"
            : "আপনার প্রোফাইলের যাচাইয়ের অবস্থা হালনাগাদ হয়েছে। বিস্তারিত জানতে সহায়তায় যোগাযোগ করুন।",
        bodyEn:
          data.verificationStatus === "VERIFIED"
            ? "Congratulations! Your donor profile has been verified."
            : "Your donor verification status has been updated. Please contact support for details.",
      },
    });

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: data.verificationStatus === "SUSPENDED" ? "DONOR_SUSPENDED" : "DONOR_VERIFIED",
      resourceType: "DONOR_PROFILE",
      resourceId: id,
      previousState: { verificationStatus: profile.verificationStatus },
      newState: { verificationStatus: data.verificationStatus, note: data.note ?? null },
      ipAddress: clientIp(request),
    });

    return jsonOk({ verificationStatus: data.verificationStatus });
  } catch (error) {
    return jsonError(error);
  }
}
