import { errors, jsonError, jsonOk } from "@/lib/http";
import { requireSession } from "@/lib/auth/session";
import { verifyEmailWithCode } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { verifyEmailSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(request, rateLimits.verifyEmail, "auth:verify-email", session.user.id);

    const data = verifyEmailSchema.parse(await request.json());
    await verifyEmailWithCode(session.user.id, data.code);

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "EMAIL_VERIFIED",
      resourceType: "USER",
      resourceId: session.user.id,
      ipAddress: clientIp(request),
    });

    return jsonOk({ emailVerified: true, stage: "COMPLETE_PROFILE" });
  } catch (error) {
    if (error === errors.unauthorized()) {
      return jsonError(errors.unauthorized());
    }
    return jsonError(error);
  }
}
