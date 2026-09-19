import { jsonError, jsonOk } from "@/lib/http";
import { getActiveEligibilityRules, ELIGIBILITY_DISCLAIMER_BN, ELIGIBILITY_DISCLAIMER_EN } from "@/lib/eligibility";
import { ensureCoreDataset } from "@/db/seed";

/** Public, transparent eligibility configuration (rule version + source). */
export async function GET() {
  try {
    await ensureCoreDataset();
    const rules = await getActiveEligibilityRules();
    return jsonOk({
      rules: {
        minimumAge: rules.minimumAge,
        maximumAge: rules.maximumAge,
        minimumWeightKg: Number(rules.minimumWeightKg),
        defaultDonationIntervalDays: rules.defaultDonationIntervalDays,
        maleDonationIntervalDays: rules.maleDonationIntervalDays,
        femaleDonationIntervalDays: rules.femaleDonationIntervalDays,
        ruleVersion: rules.ruleVersion,
        source: rules.source,
      },
      disclaimerBn: ELIGIBILITY_DISCLAIMER_BN,
      disclaimerEn: ELIGIBILITY_DISCLAIMER_EN,
    });
  } catch (error) {
    return jsonError(error);
  }
}
