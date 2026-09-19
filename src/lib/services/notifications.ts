import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notificationPreferences, notifications } from "@/db/schema";

export type NotificationType =
  | "NEW_BLOOD_REQUEST"
  | "REQUEST_ACCEPTED"
  | "REQUEST_DECLINED"
  | "CONTACT_PERMISSION_GRANTED"
  | "EMERGENCY_ALERT"
  | "ACCOUNT_VERIFICATION"
  | "DONATION_REMINDER"
  | "AVAILABILITY_REMINDER"
  | "SYSTEM_ANNOUNCEMENT";

export type LocalisedNotification = {
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
};

/**
 * Creates a notification only when the recipient's preferences allow it.
 * Notification previews never contain sensitive patient data.
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  content: LocalisedNotification;
  link?: string | null;
  preferenceKey?: keyof typeof preferenceKeyMap;
}) {
  if (input.preferenceKey) {
    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, input.userId))
      .limit(1);
    const prefs = rows[0];
    if (prefs && !prefs[preferenceKeyMap[input.preferenceKey]]) return null;
  }

  const inserted = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      titleBn: input.content.titleBn,
      titleEn: input.content.titleEn,
      bodyBn: input.content.bodyBn,
      bodyEn: input.content.bodyEn,
      link: input.link ?? null,
    })
    .returning({ id: notifications.id });

  return inserted[0]?.id ?? null;
}

const preferenceKeyMap = {
  newRequestAlerts: "newRequestAlerts",
  requestUpdates: "requestUpdates",
  emergencyAlerts: "emergencyAlerts",
  donationReminders: "donationReminders",
  systemAnnouncements: "systemAnnouncements",
} as const;

export async function ensureNotificationPreferences(userId: string) {
  await db
    .insert(notificationPreferences)
    .values({ userId })
    .onConflictDoNothing({ target: notificationPreferences.userId });
}

export async function listNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadNotificationCount(userId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows[0]?.count ?? 0;
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const now = new Date();
  if (ids && ids.length > 0) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.userId, userId), sql`${notifications.id} = ANY(${ids})`));
    return;
  }
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
