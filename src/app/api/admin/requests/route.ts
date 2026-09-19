import { SQL, and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests } from "@/db/schema";
import { requireStaff } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await requireStaff();
    enforceRateLimit(request, rateLimits.read, "admin:requests", session.user.id);

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const conditions: SQL[] = [];
    if (status) conditions.push(eq(bloodRequests.status, status as "VERIFIED"));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(bloodRequests)
      .where(where)
      .orderBy(desc(bloodRequests.createdAt))
      .limit(50);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}
