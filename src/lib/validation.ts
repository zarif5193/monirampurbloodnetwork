import { z } from "zod";
import {
  AVAILABILITY_OPTIONS,
  BLOOD_GROUPS,
  EMERGENCY_CATEGORIES,
  GENDERS,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  REQUEST_STATUSES,
  URGENCY_LEVELS,
} from "@/lib/constants";

const email = z
  .string()
  .trim()
  .min(5, "ইমেইল ঠিকানা দিন।")
  .max(254)
  .email("সঠিক ইমেইল ঠিকানা দিন।")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।")
  .max(128, "পাসওয়ার্ড খুব বেশি দীর্ঘ।")
  .regex(/[A-Za-z]/, "পাসওয়ার্ডে অন্তত একটি অক্ষর থাকতে হবে।")
  .regex(/[0-9]/, "পাসওয়ার্ডে অন্তত একটি সংখ্যা থাকতে হবে।");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "পুরো নাম লিখুন।").max(120),
    email,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      error: "নিয়মাবলি ও গোপনীযতা নীতি মেনে নিতে হবে।",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "দুটি পাসওয়ার্ড এক নয়।",
  });

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "১০ সংখ্যার যাচাই কোডটি লিখুন।"),
});

export const resendVerificationSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    email,
    code: z.string().trim().regex(/^\d{10}$/, "১০ সংখ্যার কোডটি লিখুন।"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "দুটি পাসওয়ার্ড এক নয়।",
  });

const bdPhone = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)।");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "তারিখ সঠিক নয়।");

export const profileSchema = z.object({
  displayName: z.string().trim().min(3, "নাম লিখুন।").max(120),
  phoneNumber: bdPhone,
  dateOfBirth: isoDate.refine((value) => {
    const year = Number(value.slice(0, 4));
    return year >= 1940 && new Date(`${value}T00:00:00Z`) <= new Date();
  }, "জন্ম তারিখ সঠিক নয়।"),
  gender: z.enum(GENDERS),
  bloodGroup: z.enum(BLOOD_GROUPS),
  weightKg: z.coerce.number().min(20, "ওজন কমপক্ষে ২০ কেজি।").max(300),
  heightCm: z.coerce.number().min(60).max(250).optional().nullable(),
  district: z.string().trim().min(2).max(96),
  upazila: z.string().trim().min(2).max(96),
  unionName: z.string().trim().min(2, "ইউনিয়ন/এলাকা নির্বাচন করুন।").max(96),
  area: z.string().trim().max(160).optional().nullable(),
  availabilityStatus: z.enum(AVAILABILITY_OPTIONS).default("AVAILABLE"),
  lastDonationDate: isoDate.optional().nullable(),
  donationCount: z.coerce.number().int().min(0).max(400).optional(),
  acceptedDonorTerms: z.literal(true, {
    error: "রক্তদাতা অংশগ্রহণের শর্তাবলি মেনে নিতে হবে।",
  }),
});

export const profileUpdateSchema = profileSchema.partial().extend({
  acceptedDonorTerms: z.literal(true).optional(),
});

export const availabilitySchema = z.object({
  availabilityStatus: z.enum(AVAILABILITY_OPTIONS),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "দুটি পাসওয়ার্ড এক নয়।",
  });

export const languageSchema = z.object({ language: z.enum(["bn", "en"]) });

export const donorSearchSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  unionName: z.string().trim().max(96).optional(),
  availability: z.enum(AVAILABILITY_OPTIONS).optional(),
  verifiedOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  query: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(5).max(24).default(10),
});

export const bloodRequestSchema = z.object({
  patientName: z.string().trim().min(2, "রোগীর নাম লিখুন।").max(120),
  bloodGroup: z.enum(BLOOD_GROUPS),
  quantityUnits: z.coerce.number().int().min(1).max(20),
  hospital: z.string().trim().min(3, "হাসপাতাল/মেডিকেল সেন্টারের নাম লিখুন।").max(160),
  locationText: z.string().trim().min(3, "অবস্থান লিখুন।").max(200),
  district: z.string().trim().min(2).max(96).default("Jashore"),
  upazila: z.string().trim().min(2).max(96).default("Manirampur"),
  requiredDate: isoDate,
  urgency: z.enum(URGENCY_LEVELS),
  contactName: z.string().trim().min(3, "যোগাযোগের ব্যক্তির নাম লিখুন।").max(120),
  contactPhone: bdPhone,
  description: z.string().trim().max(1200).optional().nullable(),
});

export const requestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
});

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(64),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().max(1500).optional().nullable(),
});

export const reportModerationSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED", "DISMISSED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
  resolutionNote: z.string().trim().max(1500).optional().nullable(),
});

export const emergencyContactSchema = z.object({
  nameBn: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  organization: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().min(6).max(32),
  alternatePhone: z.string().trim().max(32).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  category: z.enum(EMERGENCY_CATEGORIES),
  sourceUrl: z.string().trim().url("সঠিক উৎসের লিংক দিন।").max(400).optional().nullable(),
  lastVerifiedAt: isoDate.optional().nullable(),
  active: z.boolean().default(false),
});

export const eligibilityRuleSchema = z.object({
  minimumAge: z.coerce.number().int().min(16).max(70),
  maximumAge: z.coerce.number().int().min(40).max(90).optional().nullable(),
  minimumWeightKg: z.coerce.number().min(35).max(120),
  defaultDonationIntervalDays: z.coerce.number().int().min(56).max(365),
  maleDonationIntervalDays: z.coerce.number().int().min(56).max(365),
  femaleDonationIntervalDays: z.coerce.number().int().min(56).max(365),
  ruleVersion: z.string().trim().min(2).max(32),
  effectiveDate: isoDate,
  source: z.string().trim().min(4).max(400),
  active: z.boolean().default(false),
});

export const notificationPreferencesSchema = z.object({
  newRequestAlerts: z.boolean().optional(),
  requestUpdates: z.boolean().optional(),
  emergencyAlerts: z.boolean().optional(),
  donationReminders: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
});

export const donationSchema = z.object({
  donationDate: isoDate,
  location: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(600).optional().nullable(),
});

export const accountDeletionSchema = z.object({
  confirmation: z.literal("DELETE", { error: "নিশ্চিত করতে DELETE লিখুন।" }),
  reason: z.string().trim().max(600).optional().nullable(),
});

export const donorVerificationSchema = z.object({
  verificationStatus: z.enum(["UNVERIFIED", "PENDING_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"]),
  note: z.string().trim().max(600).optional().nullable(),
});

export const adminUserActionSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETION_REQUESTED", "DEACTIVATED"]),
});
