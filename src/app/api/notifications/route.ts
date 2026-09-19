import { requireSession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";
import { enforceRateLimit, rateLimits } from "@/lib/rate-limit";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/lib/services/notifications";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(request, rateLimits.read, "notifications:list", session.user.id);
    const items = await listNotifications(session.user.id);
    const unread = await unreadNotificationCount(session.user.id);
    return jsonOk({ items, unread });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    enforceRateLimit(request, rateLimits.write, "notifications:read", session.user.id);
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
    await markNotificationsRead(session.user.id, body.ids);
    return jsonOk({ read: true, unread: await unreadNotificationCount(session.user.id) });
  } catch (error) {
    return jsonError(error);
  }
}
