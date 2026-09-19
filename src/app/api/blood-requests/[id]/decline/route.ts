import { requireCompletedProfile } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { declineRequestAsDonor } from "@/lib/services/requests";

/** Donor decline — the phone number stays private. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.write, "requests:decline", session.user.id);
    const { id } = await context.params;

    await declineRequestAsDonor(session.user.id, id);

    return jsonOk({
      declined: true,
      messageBn: "অনুরোধটি অগ্রাহ্য করা হয়েছে। আপনার যোগাযোগের নম্বর গোপন রাখা হয়েছে।",
      messageEn: "You have declined this request. Your contact number remains private.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
