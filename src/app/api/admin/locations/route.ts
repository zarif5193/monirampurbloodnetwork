import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { ensureCoreDataset } from "@/db/seed";

/** Location dataset management (additional upazilas can be added later). */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    await ensureCoreDataset();
    const rows = await db
      .select()
      .from(locations)
      .orderBy(asc(locations.district), asc(locations.upazila), asc(locations.unionName))
      .limit(500);
    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      district?: string;
      districtBn?: string;
      upazila?: string;
      upazilaBn?: string;
      unionName?: string;
      unionNameBn?: string;
      sourceUrl?: string;
    };
    if (!body.district || !body.upazila || !body.unionName || !body.unionNameBn) {
      return jsonError(new Error("validation"));
    }
    const inserted = await db
      .insert(locations)
      .values({
        district: body.district,
        districtBn: body.districtBn ?? body.district,
        upazila: body.upazila,
        upazilaBn: body.upazilaBn ?? body.upazila,
        unionName: body.unionName,
        unionNameBn: body.unionNameBn,
        sourceUrl: body.sourceUrl ?? null,
        active: true,
      })
      .onConflictDoNothing()
      .returning({ id: locations.id });

    return jsonOk({ id: inserted[0]?.id ?? null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { id?: string; active?: boolean };
    if (!body.id) return jsonError(new Error("validation"));
    await db
      .update(locations)
      .set({ active: body.active ?? true })
      .where(eq(locations.id, body.id));
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
