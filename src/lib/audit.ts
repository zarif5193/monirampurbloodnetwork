import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "USER_REGISTERED"
  | "EMAIL_VERIFIED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "PROFILE_COMPLETED"
  | "PROFILE_UPDATED"
  | "AVAILABILITY_CHANGED"
  | "DONOR_VERIFIED"
  | "DONOR_SUSPENDED"
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_STATUS_CHANGED"
  | "DONOR_ACCEPTED"
  | "DONOR_DECLINED"
  | "CONTACT_PERMISSION_GRANTED"
  | "CONTACT_VIEWED"
  | "REPORT_CREATED"
  | "REPORT_RESOLVED"
  | "ELIGIBILITY_RULE_UPDATED"
  | "EMERGENCY_CONTACT_UPDATED"
  | "USER_SUSPENDED"
  | "USER_REACTIVATED"
  | "ACCOUNT_DELETION_REQUESTED";

export async function recordAudit(entry: {
  actorId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      previousState: entry.previousState ? (entry.previousState as object) : null,
      newState: entry.newState ? (entry.newState as object) : null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (error) {
    // Auditing must never break the request path; log server-side only.
    console.error("[audit] failed to record entry", error instanceof Error ? error.name : "unknown");
  }
}
