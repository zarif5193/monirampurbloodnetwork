import { sql } from "drizzle-orm";
import { db } from "@/db";
import { eligibilityRules, locations } from "@/db/schema";

/**
 * Core reference data: the approved location dataset and the active
 * eligibility ruleset. Both are idempotent and contain no user data.
 *
 * Location source: public administrative records for Manirampur Upazila,
 * Jashore (1 municipality + 17 union parishads).
 */
const MANIRAMPUR_UNIONS: [string, string][] = [
  ["Bhojgati", "ভোজগাতি"],
  ["Chaluahati", "চালুয়াহাটি"],
  ["Dhakuria", "ঢাকুরিয়া"],
  ["Durbadanga", "দুর্বাদঙ্গা"],
  ["Haridaskati", "হরিদাসকাটি"],
  ["Hariharnagar", "হরিহরনগর"],
  ["Jhanpa", "ঝাঁপা"],
  ["Kashimnagar", "কাশিমনগর"],
  ["Khanpur", "খানপুর"],
  ["Khedapara", "খেদাপাড়া"],
  ["Kultia", "কুলটিয়া"],
  ["Manirampur", "মণিরামপুর"],
  ["Manoharpur", "মনোহরপুর"],
  ["Maswimnagar", "মসউইমনগর"],
  ["Nehalpur", "নেহালপুর"],
  ["Rohita", "রোহিতা"],
  ["Shyamkur", "শ্যামকুর"],
  ["Manirampur Municipality", "মণিরামপুর পৌরসভা"],
];

const LOCATION_SOURCE = "https://en.wikipedia.org/wiki/Manirampur_Upazila";

let seeded = false;

export async function ensureCoreDataset() {
  if (seeded) return;

  const [ruleCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eligibilityRules);

  if ((ruleCount?.count ?? 0) === 0) {
    await db
      .insert(eligibilityRules)
      .values({
        minimumAge: 18,
        maximumAge: 60,
        minimumWeightKg: "50.00",
        defaultDonationIntervalDays: 120,
        maleDonationIntervalDays: 120,
        femaleDonationIntervalDays: 180,
        temporaryDeferralRules: {
          feverOrInfection: 14,
          dentalProcedure: 7,
          antibioticCourse: 14,
          surgery: 180,
          pregnancyOrBreastfeeding: 365,
          tattooOrPiercing: 180,
        },
        ruleVersion: "MBN-RULES-2026.1",
        effectiveDate: new Date().toISOString().slice(0, 10),
        source:
          "প্রাথমিক কনফিগারেবল নিয়মাবলি — চূড়ান্ত যাচাই সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্র করবেন (Requires clinical review before clinical use)",
        active: true,
      })
      .onConflictDoNothing();
  }

  const [locationCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(locations);

  if ((locationCount?.count ?? 0) === 0) {
    await db
      .insert(locations)
      .values(
        MANIRAMPUR_UNIONS.map(([unionName, unionNameBn]) => ({
          district: "Jashore",
          districtBn: "যশোর",
          upazila: "Manirampur",
          upazilaBn: "মণিরামপুর",
          unionName,
          unionNameBn,
          sourceUrl: LOCATION_SOURCE,
          active: true,
        })),
      )
      .onConflictDoNothing();
  }

  seeded = true;
}
