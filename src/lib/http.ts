import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiError = { code: string; messageBn: string; messageEn: string };

export class HttpError extends Error {
  status: number;
  payload: ApiError;

  constructor(status: number, payload: ApiError) {
    super(payload.messageEn);
    this.status = status;
    this.payload = payload;
  }
}

export const errors = {
  invalidCredentials: () =>
    new HttpError(401, {
      code: "INVALID_CREDENTIALS",
      messageBn: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।",
      messageEn: "The email address or password is incorrect.",
    }),
  unauthorized: () =>
    new HttpError(401, {
      code: "UNAUTHORIZED",
      messageBn: "অনুগ্রহ করে আবার লগইন করুন।",
      messageEn: "Please sign in again.",
    }),
  sessionExpired: () =>
    new HttpError(401, {
      code: "SESSION_EXPIRED",
      messageBn: "আপনার সেশন শেষ হয়েছে। নিরাপদে চালিয়ে যেতে আবার লগইন করুন।",
      messageEn: "Your session has expired. Please sign in again to continue securely.",
    }),
  forbidden: () =>
    new HttpError(403, {
      code: "FORBIDDEN",
      messageBn: "এই তথ্য দেখার অনুমতি আপনার নেই।",
      messageEn: "You do not have permission to view this information.",
    }),
  adminRequired: () =>
    new HttpError(403, {
      code: "ADMIN_REQUIRED",
      messageBn: "এই অংশটি শুধুমাত্র অনুমোদিত প্রশাসকের জন্য।",
      messageEn: "This area is restricted to authorised administrators.",
    }),
  emailNotVerified: () =>
    new HttpError(403, {
      code: "EMAIL_NOT_VERIFIED",
      messageBn: "অনুগ্রহ করে আপনার ইমেইল যাচাই করুন।",
      messageEn: "Please verify your email address first.",
    }),
  profileIncomplete: () =>
    new HttpError(403, {
      code: "PROFILE_INCOMPLETE",
      messageBn: "চালিয়ে যেতে অনুগ্রহ করে আপনার প্রোফাইল সম্পূর্ণ করুন।",
      messageEn: "Please complete your donor profile to continue.",
    }),
  validation: (messageBn: string, messageEn: string, code = "VALIDATION_ERROR") =>
    new HttpError(422, { code, messageBn, messageEn }),
  rateLimited: () =>
    new HttpError(429, {
      code: "RATE_LIMITED",
      messageBn: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
      messageEn: "Too many attempts. Please try again in a little while.",
    }),
  conflict: (messageBn: string, messageEn: string) =>
    new HttpError(409, { code: "CONFLICT", messageBn, messageEn }),
  notFound: () =>
    new HttpError(404, {
      code: "NOT_FOUND",
      messageBn: "অনুরোধটি খুঁজে পাওয়া যায়নি।",
      messageEn: "The requested resource could not be found.",
    }),
  server: () =>
    new HttpError(500, {
      code: "SERVER_ERROR",
      messageBn: "সাময়িকভাবে একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
      messageEn: "Something went wrong on our side. Please try again shortly.",
    }),
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

/** Generic, safe error envelope. Internal details never reach the client. */
export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { ok: false, error: error.payload },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          messageBn: "প্রদত্ত তথ্য সঠিক নয়। অনুগ্রহ করে ফর্মটি পরীক্ষা করুন।",
          messageEn: "Some information is invalid. Please review the form and try again.",
          field: first?.path?.join(".") ?? undefined,
        },
      },
      { status: 422 },
    );
  }
  // Server-side log only — no stack traces or SQL errors are returned to users.
  console.error("[api] unhandled error:", error);
  return NextResponse.json({ ok: false, error: errors.server().payload }, { status: 500 });
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
