import { clearSessionCookie, getSession, revokeSession } from "@/lib/auth/session";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (session) {
      await revokeSession(session.sessionToken);
      await recordAudit({
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "USER_LOGOUT",
        resourceType: "USER",
        resourceId: session.user.id,
        ipAddress: clientIp(request),
      });
    }
    return clearSessionCookie(jsonOk({ loggedOut: true }));
  } catch (error) {
    return jsonError(error);
  }
}
