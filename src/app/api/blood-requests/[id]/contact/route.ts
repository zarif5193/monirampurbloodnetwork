import { requireCompletedProfile } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { getAuthorisedDonorContact } from "@/lib/services/requests";

/**
 * GET /api/blood-requests/:requestId/contact
 *
 * Returns the donor's phone number only when ALL of the following hold:
 *  1. the caller is authenticated,
 *  2. the caller owns this blood request,
 *  3. the donor has explicitly accepted the request,
 *  4. contact permission was granted by the donor.
 * Otherwise the response is 403 Forbidden.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCompletedProfile();
    enforceRateLimit(request, rateLimits.read, "requests:contact", session.user.id);
    const { id } = await context.params;

    const contact = await getAuthorisedDonorContact(session.user.id, id);

    return jsonOk({
      donorId: contact.donorId,
      displayName: contact.displayName,
      phoneNumber: contact.phoneNumber,
      bloodGroup: contact.bloodGroup,
      grantedAt: contact.grantedAt,
      disclaimerBn:
        "চূড়ান্ত রক্তদানের সিদ্ধান্ত রক্তদাতা এবং সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।",
      disclaimerEn:
        "The final donation decision rests with the donor and the responsible medical professional/blood collection service.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
