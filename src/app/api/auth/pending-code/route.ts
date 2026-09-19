import { z } from "zod";
import { peekPendingCodeForSetup } from "@/lib/auth/tokens";
import { isEmailDeliveryConfigured } from "@/lib/email/mailer";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().email().toLowerCase() });

/**
 * Provisioning helper — returns a pending verification code ONLY while SMTP
 * credentials have not been configured (i.e. transactional email cannot leave
 * the server yet). Once SMTP_APP_PASSWORD is set this endpoint always returns
 * `available: false` and never exposes a code.
 */
export async function POST(request: Request) {
  try {
    if (isEmailDeliveryConfigured()) {
      return jsonOk({ available: false });
    }
    enforceRateLimit(request, rateLimits.verifyEmail, "auth:pending-code");
    const data = schema.parse(await request.json());
    const code = await peekPendingCodeForSetup(data.email);
    if (!code) return jsonOk({ available: false });
    return jsonOk({
      available: true,
      code,
      noticeBn:
        "ইমেইল ডেলিভারি এখনও কনফিগার করা হয়নি (Gmail App Password সেট করা হয়নি)। তাই কোডটি সার্ভার থেকে দেখানো হচ্ছে।",
      noticeEn:
        "Email delivery is not configured yet (no Gmail App Password), so the code is surfaced from the server.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
