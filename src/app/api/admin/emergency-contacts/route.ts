import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { emergencyContactSchema } from "@/lib/validation";

/** Government/emergency contact management. Requires an explicit source URL. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    enforceRateLimit(request, rateLimits.read, "admin:emergency");
    const rows = await db
      .select()
      .from(emergencyContacts)
      .orderBy(asc(emergencyContacts.category), asc(emergencyContacts.nameBn))
      .limit(200);
    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    enforceRateLimit(request, rateLimits.write, "admin:emergency:create", session.user.id);
    const data = emergencyContactSchema.parse(await request.json());

    const inserted = await db
      .insert(emergencyContacts)
      .values({
        nameBn: data.nameBn,
        nameEn: data.nameEn,
        organization: data.organization ?? null,
        phone: data.phone,
        alternatePhone: data.alternatePhone ?? null,
        address: data.address ?? null,
        category: data.category,
        sourceUrl: data.sourceUrl ?? null,
        lastVerifiedAt: data.lastVerifiedAt ? new Date(`${data.lastVerifiedAt}T00:00:00Z`) : null,
        active: data.active,
      })
      .returning({ id: emergencyContacts.id });

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "EMERGENCY_CONTACT_UPDATED",
      resourceType: "EMERGENCY_CONTACT",
      resourceId: inserted[0]!.id,
      newState: { nameEn: data.nameEn, category: data.category, active: data.active },
      ipAddress: clientIp(request),
    });

    return jsonOk({ id: inserted[0]!.id });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();
    enforceRateLimit(request, rateLimits.write, "admin:emergency:update", session.user.id);
    const body = (await request.json()) as {
      id?: string;
      active?: boolean;
      lastVerifiedAt?: string;
      phone?: string;
    };
    if (!body.id) return jsonError(new Error("validation"));

    await db
      .update(emergencyContacts)
      .set({
        ...(body.active === undefined ? {} : { active: body.active }),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.lastVerifiedAt ? { lastVerifiedAt: new Date(`${body.lastVerifiedAt}T00:00:00Z`) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(emergencyContacts.id, body.id));

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "EMERGENCY_CONTACT_UPDATED",
      resourceType: "EMERGENCY_CONTACT",
      resourceId: body.id,
      newState: body,
      ipAddress: clientIp(request),
    });

    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
