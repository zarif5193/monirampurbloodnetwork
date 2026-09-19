import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "SUPPORT",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "DELETION_REQUESTED",
  "DEACTIVATED",
]);

export const bloodGroupEnum = pgEnum("blood_group", [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "UNKNOWN",
]);

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);

export const availabilityEnum = pgEnum("availability_status", [
  "AVAILABLE",
  "TEMPORARILY_UNAVAILABLE",
  "NOT_AVAILABLE",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "UNVERIFIED",
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "PENDING_REVIEW",
  "VERIFIED",
  "SEARCHING_FOR_DONOR",
  "DONOR_CONTACTED",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const requestUrgencyEnum = pgEnum("request_urgency", [
  "ROUTINE",
  "URGENT",
  "CRITICAL",
]);

export const donorRequestStatusEnum = pgEnum("donor_request_status", [
  "NOTIFIED",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "WITHDRAWN",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
  "DISMISSED",
]);

export const reportPriorityEnum = pgEnum("report_priority", [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
]);

export const tokenTypeEnum = pgEnum("email_token_type", [
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
]);

/* ------------------------------------------------------------------ */
/* Users & sessions                                                    */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    role: userRoleEnum("role").notNull().default("USER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    language: varchar("language", { length: 5 }).notNull().default("bn"),
    emailDeliveriesDisabled: boolean("email_deliveries_disabled").notNull().default(false),
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    statusReason: text("status_reason"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    statusChangedBy: uuid("status_changed_by"),
    preferredLanguage: varchar("preferred_language", { length: 8 }).notNull().default("bn"),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email), index("users_role_idx").on(t.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

/** Hashed, single-use email tokens (verification codes + password reset). */
export const emailTokens = pgTable(
  "email_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    type: tokenTypeEnum("type").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_tokens_user_type_idx").on(t.userId, t.type)],
);

/** Server-side record of outbound transactional email (metadata only, no secrets). */
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipient: varchar("recipient", { length: 254 }).notNull(),
    subject: text("subject").notNull(),
    template: varchar("template", { length: 64 }).notNull(),
    bodyPreview: text("body_preview"),
    delivered: boolean("delivered").notNull().default(false),
    status: varchar("status", { length: 24 }).notNull().default("PENDING"),
    deliveryError: text("delivery_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_outbox_recipient_idx").on(t.recipient)],
);

export const locationTypeEnum = pgEnum("location_type", ["DISTRICT", "UPAZILA", "UNION"]);

/* ------------------------------------------------------------------ */
/* Location dataset (administrator managed)                            */
/* ------------------------------------------------------------------ */

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: locationTypeEnum("type").notNull().default("UNION"),
    parentId: uuid("parent_id"),
    nameBn: varchar("name_bn", { length: 160 }).notNull().default(""),
    nameEn: varchar("name_en", { length: 160 }).notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    district: varchar("district", { length: 96 }).notNull().default(""),
    districtBn: varchar("district_bn", { length: 96 }).notNull().default(""),
    upazila: varchar("upazila", { length: 96 }).notNull().default(""),
    upazilaBn: varchar("upazila_bn", { length: 96 }).notNull().default(""),
    unionName: varchar("union_name", { length: 96 }).notNull().default(""),
    unionNameBn: varchar("union_name_bn", { length: 96 }).notNull().default(""),
    sourceUrl: text("source_url"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("locations_unique").on(t.district, t.upazila, t.unionName),
    index("locations_lookup_idx").on(t.district, t.upazila, t.active),
  ],
);

/* ------------------------------------------------------------------ */
/* Donor profiles                                                      */
/* ------------------------------------------------------------------ */

export const donorProfiles = pgTable(
  "donor_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: genderEnum("gender").notNull(),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }).notNull(),
    heightCm: integer("height_cm"),
    district: varchar("district", { length: 96 }).notNull().default(""),
    upazila: varchar("upazila", { length: 96 }).notNull().default(""),
    unionName: varchar("union_name", { length: 96 }).notNull().default(""),
    area: varchar("area", { length: 160 }),
    availabilityStatus: availabilityEnum("availability_status").notNull().default("NOT_AVAILABLE"),
    lastDonationDate: date("last_donation_date"),
    nextPotentialDonationDate: date("next_potential_donation_date"),
    donationCount: integer("donation_count").notNull().default(0),
    profilePhotoPath: text("profile_photo_path"),
    healthNotesPrivate: text("health_notes_private"),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("UNVERIFIED"),
    profileComplete: boolean("profile_complete").notNull().default(false),
    searchable: boolean("searchable").notNull().default(false),
    profileCompletion: integer("profile_completion").notNull().default(0),
    verificationNote: text("verification_note"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ruleVersionUsed: varchar("rule_version_used", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("donor_profiles_user_unique").on(t.userId),
    index("donor_profiles_search_idx").on(
      t.bloodGroup,
      t.upazila,
      t.availabilityStatus,
      t.searchable,
    ),
  ],
);

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorProfileId: uuid("donor_profile_id")
      .notNull()
      .references(() => donorProfiles.id, { onDelete: "cascade" }),
    donationDate: date("donation_date").notNull(),
    bloodGroup: bloodGroupEnum("blood_group").notNull().default("UNKNOWN"),
    donorId: uuid("donor_id"),
    requestId: uuid("request_id"),
    locationName: varchar("location_name", { length: 200 }),
    district: varchar("district", { length: 96 }),
    upazila: varchar("upazila", { length: 96 }),
    location: varchar("location", { length: 160 }),
    bloodRequestId: uuid("blood_request_id"),
    notes: text("notes"),
    ruleVersion: varchar("rule_version", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("donations_donor_idx").on(t.donorProfileId, t.donationDate)],
);

/* ------------------------------------------------------------------ */
/* Blood requests + donor responses                                    */
/* ------------------------------------------------------------------ */

export const bloodRequests = pgTable(
  "blood_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientName: varchar("patient_name", { length: 120 }).notNull(),
    bloodGroup: bloodGroupEnum("blood_group").notNull(),
    quantityUnits: integer("quantity_units").notNull().default(1),
    hospital: varchar("hospital", { length: 160 }).notNull(),
    locationText: varchar("location_text", { length: 200 }).notNull(),
    district: varchar("district", { length: 96 }).notNull().default("Jashore"),
    upazila: varchar("upazila", { length: 96 }).notNull().default("Manirampur"),
    unionName: varchar("union_name", { length: 96 }),
    requiredDate: date("required_date").notNull(),
    urgency: requestUrgencyEnum("urgency").notNull().default("URGENT"),
    contactName: varchar("contact_name", { length: 120 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
    description: text("description"),
    preferredDonorId: uuid("preferred_donor_id").references(() => donorProfiles.id, {
      onDelete: "set null",
    }),
    proofDocumentPath: text("proof_document_path"),
    proofDocumentName: text("proof_document_name"),
    status: requestStatusEnum("status").notNull().default("PENDING_REVIEW"),
    statusNote: text("status_note"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("blood_requests_status_idx").on(t.status, t.bloodGroup),
    index("blood_requests_requester_idx").on(t.requesterId),
  ],
);

export const donorRequests = pgTable(
  "donor_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => bloodRequests.id, { onDelete: "cascade" }),
    donorId: uuid("donor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: donorRequestStatusEnum("status").notNull().default("NOTIFIED"),
    donorAcceptedAt: timestamp("donor_accepted_at", { withTimezone: true }),
    donorDeclinedAt: timestamp("donor_declined_at", { withTimezone: true }),
    contactPermissionGranted: boolean("contact_permission_granted").notNull().default(false),
    contactPermissionGrantedAt: timestamp("contact_permission_granted_at", { withTimezone: true }),
    contactUnlockedAt: timestamp("contact_unlocked_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("donor_requests_unique").on(t.requestId, t.donorId),
    index("donor_requests_donor_idx").on(t.donorId, t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 48 }).notNull(),
    titleBn: text("title_bn").notNull(),
    titleEn: text("title_en").notNull(),
    bodyBn: text("body_bn").notNull(),
    bodyEn: text("body_en").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    isRead: boolean("is_read").notNull().default(false),
    broadcastId: uuid("broadcast_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    newRequestAlerts: boolean("new_request_alerts").notNull().default(true),
    requestUpdates: boolean("request_updates").notNull().default(true),
    emergencyAlerts: boolean("emergency_alerts").notNull().default(true),
    donationReminders: boolean("donation_reminders").notNull().default(true),
    systemAnnouncements: boolean("system_announcements").notNull().default(true),
    pushSubscription: jsonb("push_subscription"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/* ------------------------------------------------------------------ */
/* Reports (moderation)                                                */
/* ------------------------------------------------------------------ */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 64 }).notNull(),
    reason: varchar("reason", { length: 48 }).notNull(),
    description: text("description"),
    status: reportStatusEnum("status").notNull().default("PENDING"),
    priority: reportPriorityEnum("priority").notNull().default("NORMAL"),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_reporter_idx").on(t.reporterId),
    index("reports_status_idx").on(t.status, t.priority),
  ],
);

/* ------------------------------------------------------------------ */
/* Emergency contacts (administrator managed, never fabricated)         */
/* ------------------------------------------------------------------ */

export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameBn: varchar("name_bn", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    organization: varchar("organization", { length: 160 }),
    phone: varchar("phone", { length: 32 }).notNull(),
    alternatePhone: varchar("alternate_phone", { length: 32 }),
    address: text("address"),
    category: varchar("category", { length: 48 }).notNull(),
    sourceUrl: text("source_url"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("emergency_contacts_active_idx").on(t.active, t.category)],
);

/* ------------------------------------------------------------------ */
/* Eligibility rules (configurable medical safety ruleset)              */
/* ------------------------------------------------------------------ */

export const eligibilityRules = pgTable(
  "eligibility_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    minimumAge: integer("minimum_age").notNull(),
    maximumAge: integer("maximum_age"),
    minimumWeightKg: numeric("minimum_weight_kg", { precision: 5, scale: 2 }).notNull(),
    defaultDonationIntervalDays: integer("default_donation_interval_days").notNull(),
    maleDonationIntervalDays: integer("male_donation_interval_days").notNull(),
    femaleDonationIntervalDays: integer("female_donation_interval_days").notNull(),
    temporaryDeferralRules: jsonb("temporary_deferral_rules"),
    ruleVersion: varchar("rule_version", { length: 32 }).notNull(),
    effectiveDate: date("effective_date").notNull(),
    source: text("source").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("eligibility_rules_version_unique").on(t.ruleVersion)],
);

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: varchar("actor_role", { length: 24 }),
    actorName: varchar("actor_name", { length: 160 }),
    action: varchar("action", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 48 }).notNull(),
    resourceId: varchar("resource_id", { length: 64 }),
    previousState: jsonb("previous_state"),
    newState: jsonb("new_state"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_actor_idx").on(t.actorId)],
);


export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type DonorProfileRow = typeof donorProfiles.$inferSelect;
export type BloodRequestRow = typeof bloodRequests.$inferSelect;
export type DonorRequestRow = typeof donorRequests.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type EmergencyContactRow = typeof emergencyContacts.$inferSelect;
export type EligibilityRuleRow = typeof eligibilityRules.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
