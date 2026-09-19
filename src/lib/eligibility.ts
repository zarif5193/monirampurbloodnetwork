import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { eligibilityRules, type EligibilityRuleRow } from "@/db/schema";

export type EligibilityRules = Pick<
  EligibilityRuleRow,
  | "minimumAge"
  | "maximumAge"
  | "minimumWeightKg"
  | "defaultDonationIntervalDays"
  | "maleDonationIntervalDays"
  | "femaleDonationIntervalDays"
  | "ruleVersion"
  | "source"
> & { temporaryDeferralRules: Record<string, unknown> | null };

let cache: { value: EligibilityRules; at: number } | null = null;

/** Loads the active, administrator-managed ruleset (60s cache). */
export async function getActiveEligibilityRules(): Promise<EligibilityRules> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;

  const rows = await db
    .select()
    .from(eligibilityRules)
    .where(eq(eligibilityRules.active, true))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error("No active eligibility ruleset configured");
  }

  const value: EligibilityRules = {
    minimumAge: row.minimumAge,
    maximumAge: row.maximumAge,
    minimumWeightKg: row.minimumWeightKg,
    defaultDonationIntervalDays: row.defaultDonationIntervalDays,
    maleDonationIntervalDays: row.maleDonationIntervalDays,
    femaleDonationIntervalDays: row.femaleDonationIntervalDays,
    temporaryDeferralRules: (row.temporaryDeferralRules as Record<string, unknown> | null) ?? null,
    ruleVersion: row.ruleVersion,
    source: row.source,
  };
  cache = { value, at: Date.now() };
  return value;
}

export function clearEligibilityCache() {
  cache = null;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ageFromDob(dob: string, reference = new Date()): number {
  const birth = new Date(`${dob}T00:00:00Z`);
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Donation date engine.
 * Calculates a *potential* next donation date only — never a medical clearance.
 */
export function computeNextDonationDate(input: {
  lastDonationDate: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  rules: EligibilityRules;
}): { nextPotentialDonationDate: string | null; ruleVersion: string } {
  const interval =
    input.gender === "MALE"
      ? input.rules.maleDonationIntervalDays
      : input.gender === "FEMALE"
        ? input.rules.femaleDonationIntervalDays
        : input.rules.defaultDonationIntervalDays;

  if (!input.lastDonationDate) {
    return { nextPotentialDonationDate: null, ruleVersion: input.rules.ruleVersion };
  }
  return {
    nextPotentialDonationDate: addDays(input.lastDonationDate, interval),
    ruleVersion: input.rules.ruleVersion,
  };
}

export type EligibilityAssessment = {
  /** "ELIGIBLE" | "NOT_ELIGIBLE" | "UNKNOWN" — informational only. */
  status: "ELIGIBLE" | "NOT_ELIGIBLE" | "UNKNOWN";
  nextPotentialDonationDate: string | null;
  ruleVersion: string;
  reasonsBn: string[];
  reasonsEn: string[];
  /** Mandatory disclaimer shown next to every assessment. */
  disclaimerBn: string;
  disclaimerEn: string;
};

export const ELIGIBILITY_DISCLAIMER_BN =
  "প্রাথমিক তথ্য অনুযায়ী সম্ভাব্যভাবে উপযুক্ত হতে পারেন; চূড়ান্ত সিদ্ধান্ত সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।";
export const ELIGIBILITY_DISCLAIMER_EN =
  "Based on the available information, the donor may potentially meet preliminary criteria; final eligibility must be determined by the responsible medical professional/blood collection service.";

export async function assessEligibility(input: {
  dateOfBirth: string;
  weightKg: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  lastDonationDate: string | null;
}): Promise<EligibilityAssessment> {
  const rules = await getActiveEligibilityRules();
  const reasonsBn: string[] = [];
  const reasonsEn: string[] = [];
  const age = ageFromDob(input.dateOfBirth);
  const weight = Number(input.weightKg);

  if (age < rules.minimumAge) {
    reasonsBn.push(`ন্যূনতম বয়স ${rules.minimumAge} বছর।`);
    reasonsEn.push(`Minimum age is ${rules.minimumAge} years.`);
  }
  if (rules.maximumAge && age > rules.maximumAge) {
    reasonsBn.push(`সর্বোচ্চ বয়স ${rules.maximumAge} বছর।`);
    reasonsEn.push(`Maximum age is ${rules.maximumAge} years.`);
  }
  if (Number.isFinite(weight) && weight < Number(rules.minimumWeightKg)) {
    reasonsBn.push(`ন্যূনতম ওজন ${Number(rules.minimumWeightKg)} কেজি।`);
    reasonsEn.push(`Minimum weight is ${Number(rules.minimumWeightKg)} kg.`);
  }

  const { nextPotentialDonationDate } = computeNextDonationDate({
    lastDonationDate: input.lastDonationDate,
    gender: input.gender,
    rules,
  });

  if (nextPotentialDonationDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (nextPotentialDonationDate > today) {
      reasonsBn.push("সর্বশেষ রক্তদানের পর নির্ধারিত বিরতি এখনও পূর্ণ হয়নি।");
      reasonsEn.push("The configured interval since the last donation has not elapsed yet.");
    }
  }

  const status: EligibilityAssessment["status"] =
    reasonsBn.length === 0 ? "ELIGIBLE" : "NOT_ELIGIBLE";

  return {
    status,
    nextPotentialDonationDate,
    ruleVersion: rules.ruleVersion,
    reasonsBn,
    reasonsEn,
    disclaimerBn: ELIGIBILITY_DISCLAIMER_BN,
    disclaimerEn: ELIGIBILITY_DISCLAIMER_EN,
  };
}

export async function findActiveRuleVersion() {
  const rows = await db
    .select({ ruleVersion: eligibilityRules.ruleVersion })
    .from(eligibilityRules)
    .where(and(eq(eligibilityRules.active, true)))
    .limit(1);
  return rows[0]?.ruleVersion ?? null;
}
