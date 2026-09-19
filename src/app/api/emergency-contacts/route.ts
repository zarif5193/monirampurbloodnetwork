import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emergencyContacts } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";

/**
 * Public emergency directory. Only administrator-verified and activated
 * records are listed — the platform never fabricates a government number.
 */
export async function GET(request: Request) {
  try {
    enforceRateLimit(request, rateLimits.read, "emergency:list");
    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    const conditions = [eq(emergencyContacts.active, true)];
    if (category) conditions.push(eq(emergencyContacts.category, category));

    const rows = await db
      .select({
        id: emergencyContacts.id,
        nameBn: emergencyContacts.nameBn,
        nameEn: emergencyContacts.nameEn,
        organization: emergencyContacts.organization,
        phone: emergencyContacts.phone,
        alternatePhone: emergencyContacts.alternatePhone,
        address: emergencyContacts.address,
        category: emergencyContacts.category,
        sourceUrl: emergencyContacts.sourceUrl,
        lastVerifiedAt: emergencyContacts.lastVerifiedAt,
      })
      .from(emergencyContacts)
      .where(and(...conditions))
      .orderBy(asc(emergencyContacts.category), asc(emergencyContacts.nameBn))
      .limit(100);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}
