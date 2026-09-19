/** Shared domain constants used by both server and client code. */

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const DONATABLE_BLOOD_GROUPS = BLOOD_GROUPS.filter((g) => g !== "UNKNOWN");

export const BLOOD_GROUP_LABELS_BN: Record<BloodGroup, string> = {
  "A+": "এ+",
  "A-": "এ-",
  "B+": "বি+",
  "B-": "বি-",
  "AB+": "এবি+",
  "AB-": "এবি-",
  "O+": "ও+",
  "O-": "ও-",
  UNKNOWN: "অজানা",
};

export const AVAILABILITY_OPTIONS = [
  "AVAILABLE",
  "TEMPORARILY_UNAVAILABLE",
  "NOT_AVAILABLE",
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_OPTIONS)[number];

export const REQUEST_STATUSES = [
  "PENDING_REVIEW",
  "VERIFIED",
  "SEARCHING_FOR_DONOR",
  "DONOR_CONTACTED",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const URGENCY_LEVELS = ["ROUTINE", "URGENT", "CRITICAL"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const REPORT_REASONS = [
  "FRAUD",
  "FAKE_REQUEST",
  "SUSPICIOUS_DONOR",
  "INCORRECT_INFORMATION",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "PLATFORM_MISUSE",
  "PRIVACY_CONCERN",
  "OTHER",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, { bn: string; en: string }> = {
  FRAUD: { bn: "প্রতারণা / জালিয়াতি", en: "Fraud or forgery" },
  FAKE_REQUEST: { bn: "ভুয়া রক্তের অনুরোধ", en: "Fake blood request" },
  SUSPICIOUS_DONOR: { bn: "সন্দেহজনক রক্তদাতা", en: "Suspicious donor" },
  INCORRECT_INFORMATION: { bn: "ভুল তথ্য", en: "Incorrect information" },
  HARASSMENT: { bn: "হয়রানি / অপব্যবহার", en: "Harassment or abuse" },
  INAPPROPRIATE_CONTENT: { bn: "অনুপযুক্ত কনটেন্ট", en: "Inappropriate content" },
  PLATFORM_MISUSE: { bn: "প্ল্যাটফর্মের অপব্যবহার", en: "Platform misuse" },
  PRIVACY_CONCERN: { bn: "গোপনীয়তা সংক্রান্ত সমস্যা", en: "Privacy concern" },
  OTHER: { bn: "অন্যান্য", en: "Other" },
};

export const REPORT_TARGET_TYPES = ["DONOR", "BLOOD_REQUEST", "USER", "PLATFORM"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
export type Gender = (typeof GENDERS)[number];

export const EMERGENCY_CATEGORIES = [
  "NATIONAL_EMERGENCY",
  "POLICE",
  "FIRE_SERVICE",
  "AMBULANCE_MEDICAL",
  "HEALTH_COMPLEX",
  "UPAZILA_ADMINISTRATION",
  "DISASTER",
  "OTHER_GOVERNMENT",
] as const;
export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[number];

export const EMERGENCY_CATEGORY_LABELS: Record<EmergencyCategory, { bn: string; en: string }> = {
  NATIONAL_EMERGENCY: { bn: "জাতীয় জরুরি সেবা", en: "National Emergency Service" },
  POLICE: { bn: "পুলিশ", en: "Police" },
  FIRE_SERVICE: { bn: "ফায়ার সার্ভিস", en: "Fire Service" },
  AMBULANCE_MEDICAL: { bn: "অ্যাম্বুলেন্স / চিকিৎসা", en: "Ambulance / Medical" },
  HEALTH_COMPLEX: { bn: "উপজেলা স্বাস্থ্য কমপ্লেক্স", en: "Upazila Health Complex" },
  UPAZILA_ADMINISTRATION: { bn: "উপজেলা প্রশাসন / ইউএনও", en: "Upazila Administration / UNO" },
  DISASTER: { bn: "দুর্যোগ / ত্রাণ সেবা", en: "Disaster / Relief services" },
  OTHER_GOVERNMENT: { bn: "অন্যান্য সরকারি সেবা", en: "Other verified government services" },
};

export const PRIMARY_DISTRICT = "Jashore";
export const PRIMARY_DISTRICT_BN = "যশোর";
export const PRIMARY_UPAZILA = "Manirampur";
export const PRIMARY_UPAZILA_BN = "মণিরামপুর";

export const STAFF_ROLES = ["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
export type UserRole = "USER" | "SUPPORT" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
