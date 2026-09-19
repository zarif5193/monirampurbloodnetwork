import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donorProfiles } from "@/db/schema";
import { requireCompletedProfile } from "@/lib/auth/session";
import { clientIp, errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { createNotification } from "@/lib/services/notifications";
import { donorRequests } from "@/db/schema";
import { expireStaleRequests, notifyMatchingDonors } from "@/lib/services/requests";
import { bloodRequestSchema } from "@/lib/validation";
import { env } from "@/lib/env";

const ALLOWED_MIME = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
]);

export async function GET(request: Request) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.read, "requests:list", session.user.id);
    await expireStaleRequests();

    const rows = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.requesterId, session.user.id))
      .orderBy(desc(bloodRequests.createdAt))
      .limit(50);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

/** Creates a blood request. Supporting documents stay private to the owner + admins. */
export async function POST(request: Request) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.write, "requests:create", session.user.id);

    const contentType = request.headers.get("content-type") ?? "";
    let payload: Record<string, unknown>;
    let storedDocument: { path: string; name: string } | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      payload = Object.fromEntries(
        Array.from(form.entries())
          .filter(([key]) => key !== "proofDocument")
          .map(([key, value]) => [key, typeof value === "string" ? value : ""]),
      );

      const file = form.get("proofDocument");
      if (file && file instanceof File && file.size > 0) {
        if (file.size > env.upload.maxBytes) {
          throw errors.validation(
            "সংযুক্ত ফাইলটি খুব বড়। সর্বোচ্চ ৪ মেগাবাইট।",
            "The attached file is too large. Maximum size is 4 MB.",
            "FILE_TOO_LARGE",
          );
        }
        const extension = ALLOWED_MIME.get(file.type);
        if (!extension) {
          throw errors.validation(
            "শুধুমাত্র PDF, JPG অথবা PNG ফাইল সংযুক্ত করা যাবে।",
            "Only PDF, JPG or PNG files may be attached.",
            "UNSUPPORTED_FILE_TYPE",
          );
        }
        const safeName = `${randomUUID()}${extension}`;
        const storageRoot = path.isAbsolute(env.upload.storageDir)
          ? env.upload.storageDir
          : path.join(process.cwd(), env.upload.storageDir);
        await mkdir(storageRoot, { recursive: true });
        const target = path.join(storageRoot, safeName);
        if (!target.startsWith(storageRoot)) throw errors.forbidden(); // path traversal guard
        await writeFile(target, Buffer.from(await file.arrayBuffer()));
        storedDocument = { path: safeName, name: file.name.slice(0, 120) };
      }
    } else {
      payload = await request.json();
    }

    const data = bloodRequestSchema.parse(payload);

    if (new Date(`${data.requiredDate}T23:59:59Z`) < new Date()) {
      throw errors.validation(
        "প্রয়োজনের তারিখ অতীত হতে পারে না।",
        "The required date cannot be in the past.",
        "INVALID_DATE",
      );
    }

    /**
     * A request aimed at one specific donor is delivered straight to that donor
     * (they still decide whether to accept). Any general broadcast requires
     * moderator verification first — requests are never mass-broadcast unverified.
     */
    let status: "PENDING_REVIEW" | "DONOR_CONTACTED" = "PENDING_REVIEW";
    let preferredDonorId: string | null = null;
    const preferred = typeof payload.preferredDonorId === "string" ? payload.preferredDonorId : null;
    if (preferred && /^[0-9a-f-]{36}$/i.test(preferred)) {
      const donorRows = await db
        .select({ userId: donorProfiles.userId })
        .from(donorProfiles)
        .where(
          and(
            eq(donorProfiles.id, preferred),
            eq(donorProfiles.searchable, true),
            eq(donorProfiles.profileComplete, true),
          ),
        )
        .limit(1);
      if (donorRows[0]) {
        preferredDonorId = preferred;
        status = "DONOR_CONTACTED";
      }
    }

    const inserted = await db
      .insert(bloodRequests)
      .values({
        requesterId: session.user.id,
        patientName: data.patientName,
        bloodGroup: data.bloodGroup,
        quantityUnits: data.quantityUnits,
        hospital: data.hospital,
        locationText: data.locationText,
        district: data.district,
        upazila: data.upazila,
        requiredDate: data.requiredDate,
        urgency: data.urgency,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        description: data.description ?? null,
        preferredDonorId,
        status,
        proofDocumentPath: storedDocument?.path ?? null,
        proofDocumentName: storedDocument?.name ?? null,
      })
      .returning({ id: bloodRequests.id, status: bloodRequests.status });

    const created = inserted[0]!;

    if (preferredDonorId) {
      const donorUser = await db
        .select({ userId: donorProfiles.userId })
        .from(donorProfiles)
        .where(eq(donorProfiles.id, preferredDonorId))
        .limit(1);
      if (donorUser[0]) {
        await db
          .insert(donorRequests)
          .values({ requestId: created.id, donorId: donorUser[0].userId })
          .onConflictDoNothing();
        await createNotification({
          userId: donorUser[0].userId,
          type: "NEW_BLOOD_REQUEST",
          preferenceKey: "newRequestAlerts",
          content: {
            titleBn: "আপনার কাছে একটি রক্তের অনুরোধ পাঠানো হয়েছে",
            titleEn: "You have received a blood request",
            bodyBn: `${data.bloodGroup} রক্তের একটি অনুরোধ আপনাকে পাঠানো হয়েছে। বিস্তারিত দেখে গ্রহণ বা অগ্রাহ্য করুন।`,
            bodyEn: `A request for ${data.bloodGroup} blood has been sent to you. Review it and accept or decline.`,
          },
          link: "/requests/inbox",
        });
      }
    }

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "REQUEST_CREATED",
      resourceType: "BLOOD_REQUEST",
      resourceId: created.id,
      newState: { bloodGroup: data.bloodGroup, urgency: data.urgency },
      ipAddress: clientIp(request),
    });

    return jsonOk({
      id: created.id,
      status: created.status,
      messageBn:
        "আপনার অনুরোধটি গ্রহণ করা হয়েছে। যাচাইয়ের পর উপলব্ধ রক্তদাতাদের জানানো হবে।",
      messageEn:
        "Your request has been received. Once verified, available donors in the area will be notified.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** Cancels the requester's own active requests (bulk convenience endpoint). */
export async function PATCH(request: Request) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.write, "requests:cancel", session.user.id);
    const body = (await request.json()) as { id?: string };
    if (!body.id) throw errors.validation("অনুরোধ আইডি দিন।", "Provide a request id.");

    await db
      .update(bloodRequests)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(
        and(
          eq(bloodRequests.id, body.id),
          eq(bloodRequests.requesterId, session.user.id),
          inArray(bloodRequests.status, [
            "PENDING_REVIEW",
            "VERIFIED",
            "SEARCHING_FOR_DONOR",
            "DONOR_CONTACTED",
            "ACCEPTED",
          ]),
        ),
      );

    return jsonOk({ cancelled: true });
  } catch (error) {
    return jsonError(error);
  }
}
