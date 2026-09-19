import { jsonError, jsonOk } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/services/notifications";
import { isEmailDeliveryConfigured } from "@/lib/email/mailer";

/** Persistent-login validation endpoint. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return jsonOk({ authenticated: false, stage: "GUEST", emailDeliveryConfigured: isEmailDeliveryConfigured() });
    }

    const unread = session.user.emailVerified ? await unreadNotificationCount(session.user.id) : 0;

    return jsonOk({
      authenticated: true,
      emailDeliveryConfigured: isEmailDeliveryConfigured(),
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        emailVerified: session.user.emailVerified,
        language: session.user.language,
      },
      hasProfile: session.hasProfile,
      profileComplete: session.profileComplete,
      unreadNotifications: unread,
      stage: !session.user.emailVerified
        ? "VERIFY_EMAIL"
        : !session.profileComplete
          ? "COMPLETE_PROFILE"
          : "HOME",
    });
  } catch (error) {
    return jsonError(error);
  }
}
