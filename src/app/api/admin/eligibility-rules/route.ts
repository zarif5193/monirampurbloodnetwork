import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eligibilityRules } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { clientIp, errors, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { clearEligibilityCache } from "@/lib/eligibility";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { eligibilityRuleSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    enforceRateLimit(request, rateLimits.read, "admin:rules");
    const rows = await db.select().from(eligibilityRules).orderBy(desc(eligibilityRules.createdAt)).limit(20);
    return jsonOk({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

/** Creates a new ruleset version. Only one version is active at a time. */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    enforceRateLimit(request, rateLimits.write, "admin:rules:create", session.user.id);
    const data = eligibilityRuleSchema.parse(await request.json());

    if (data.active) {
      await db.update(eligibilityRules).set({ active: false, updatedAt: new Date() }).where(eq(eligibilityRules.active, true));
    }

    const inserted = await db
      .insert(eligibilityRules)
      .values({
        minimumAge: data.minimumAge,
        maximumAge: data.maximumAge ?? null,
        minimumWeightKg: data.minimumWeightKg.toFixed(2),
        defaultDonationIntervalDays: data.defaultDonationIntervalDays,
        maleDonationIntervalDays: data.maleDonationIntervalDays,
        femaleDonationIntervalDays: data.femaleDonationIntervalDays,
        ruleVersion: data.ruleVersion,
        effectiveDate: data.effectiveDate,
        source: data.source,
        active: data.active,
      })
      .onConflictDoUpdate({
        target: eligibilityRules.ruleVersion,
        set: {
          minimumAge: data.minimumAge,
          maximumAge: data.maximumAge ?? null,
          minimumWeightKg: data.minimumWeightKg.toFixed(2),
          defaultDonationIntervalDays: data.defaultDonationIntervalDays,
          maleDonationIntervalDays: data.maleDonationIntervalDays,
          femaleDonationIntervalDays: data.femaleDonationIntervalDays,
          source: data.source,
          active: data.active,
          updatedAt: new Date(),
        },
      })
      .returning({ id: eligibilityRules.id });

    clearEligibilityCache();

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "ELIGIBILITY_RULE_UPDATED",
      resourceType: "ELIGIBILITY_RULE",
      resourceId: inserted[0]!.id,
      newState: { ruleVersion: data.ruleVersion, active: data.active },
      ipAddress: clientIp(request),
    });

    return jsonOk({ id: inserted[0]!.id, ruleVersion: data.ruleVersion });
  } catch (error) {
    return jsonError(error);
  }
}
