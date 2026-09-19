import type { Language } from "@/lib/i18n";

export type ApiFailure = {
  code: string;
  messageBn: string;
  messageEn: string;
  field?: string;
};

export class ApiError extends Error {
  status: number;
  failure: ApiFailure;

  constructor(status: number, failure: ApiFailure) {
    super(failure.messageEn);
    this.status = status;
    this.failure = failure;
  }

  localizedMessage(language: Language): string {
    return language === "bn" ? this.failure.messageBn : this.failure.messageEn;
  }
}

export const offlineError = () =>
  new ApiError(0, {
    code: "OFFLINE",
    messageBn: "ইন্টারনেট সংযোগ পরীক্ষা করুন।",
    messageEn: "Please check your internet connection.",
  });

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw offlineError();
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init?.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw offlineError();
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const envelope = payload as { ok?: boolean; data?: T; error?: ApiFailure } | null;

  if (!response.ok || !envelope?.ok) {
    throw new ApiError(
      response.status,
      envelope?.error ?? {
        code: "SERVER_ERROR",
        messageBn: "সাময়িকভাবে একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
        messageEn: "Something went wrong on our side. Please try again shortly.",
      },
    );
  }

  return envelope.data as T;
}

export function formatErrorMessage(error: unknown, language: Language): string {
  if (error instanceof ApiError) return error.localizedMessage(language);
  if (error instanceof Error && error.name === "AbortError") {
    return language === "bn" ? "অনুরোধটি সময়মতো সম্পন্ন হয়নি।" : "The request timed out.";
  }
  return language === "bn"
    ? "সাময়িকভাবে একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
    : "Something went wrong on our side. Please try again shortly.";
}

export function formatDate(value: string | Date | null | undefined, language: Language): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
