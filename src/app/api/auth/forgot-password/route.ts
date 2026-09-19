import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueCode } from "@/lib/auth/tokens";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimitIdentity, rateLimits } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsedEmail = typeof body?.email === "string" ? body.email.toLowerCase() : undefined;
    enforceRateLimit(
      request,
      rateLimits.forgotPassword,
      "auth:forgot",
      rateLimitIdentity(request, parsedEmail),
    );

    const data = forgotPasswordSchema.parse(body);
    const rows = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const user = rows[0];

    // Always answer identically — never reveal whether the address exists.
    if (user && user.status !== "DEACTIVATED") {
      await issueCode(user.id, user.email, "PASSWORD_RESET");
    }

    return jsonOk({
      queued: true,
      messageBn:
        "যদি এই ইমেইল ঠিকানাটি আমাদের সিস্টেমে থাকে, তাহলে পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে। ইনবক্স ও স্প্যাম ফোল্ডার পরীক্ষা করুন।",
      messageEn:
        "If this email address exists in our system, a password reset code has been sent. Please check your inbox and spam folder.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
