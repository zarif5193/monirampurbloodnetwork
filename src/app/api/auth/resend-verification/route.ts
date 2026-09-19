import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { issueCode } from "@/lib/auth/tokens";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { resendVerificationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(request, rateLimits.resendVerification, "auth:resend", session.user.id);
    const data = resendVerificationSchema.parse(await request.json());

    if (data.email !== session.user.email) {
      return jsonOk({ queued: true });
    }
    if (session.user.emailVerified) {
      return jsonOk({ queued: true, alreadyVerified: true });
    }

    await issueCode(session.user.id, session.user.email, "EMAIL_VERIFICATION");
    return jsonOk({ queued: true });
  } catch (error) {
    return jsonError(error);
  }
}
