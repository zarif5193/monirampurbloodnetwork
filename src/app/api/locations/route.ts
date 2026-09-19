import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { ensureCoreDataset } from "@/db/seed";
import { jsonError, jsonOk } from "@/lib/http";

/** Administrator-managed location dataset (prevents spelling variations). */
export async function GET(request: Request) {
  try {
    await ensureCoreDataset();
    const url = new URL(request.url);
    const district = url.searchParams.get("district") ?? "Jashore";
    const upazila = url.searchParams.get("upazila") ?? "Manirampur";

    const rows = await db
      .select({
        unionName: locations.unionName,
        unionNameBn: locations.unionNameBn,
        upazila: locations.upazila,
        upazilaBn: locations.upazilaBn,
        district: locations.district,
        districtBn: locations.districtBn,
      })
      .from(locations)
      .where(and(eq(locations.district, district), eq(locations.upazila, upazila), eq(locations.active, true)))
      .orderBy(asc(locations.unionName))
      .limit(200);

    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}
