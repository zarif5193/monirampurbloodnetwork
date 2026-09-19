import { requireCompletedProfile } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { acceptRequestAsDonor } from "@/lib/services/requests";

/**
 * Donor acceptance. This single action is what grants the requester
 * permission to view the donor's phone number — nothing else can.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.write, "requests:accept", session.user.id);
    const { id } = await context.params;

    await acceptRequestAsDonor(session.user.id, id, clientIp(request));

    return jsonOk({
      accepted: true,
      messageBn:
        "আপনি অনুরোধটি গ্রহণ করেছেন। অনুরোধকারী এখন আপনার যোগাযোগের নম্বর দেখতে পারবেন।",
      messageEn:
        "You have accepted this request. The requester can now view your contact number.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
