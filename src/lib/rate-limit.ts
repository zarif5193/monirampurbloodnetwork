import { errors, clientIp } from "@/lib/http";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitRule = { limit: number; windowMs: number };

export const rateLimits = {
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  verifyEmail: { limit: 12, windowMs: 15 * 60 * 1000 },
  resendVerification: { limit: 3, windowMs: 10 * 60 * 1000 },
  forgotPassword: { limit: 4, windowMs: 60 * 60 * 1000 },
  resetPassword: { limit: 10, windowMs: 60 * 60 * 1000 },
  report: { limit: 6, windowMs: 60 * 60 * 1000 },
  write: { limit: 60, windowMs: 10 * 60 * 1000 },
  read: { limit: 300, windowMs: 10 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

/** Throws a 429 HttpError when the caller exceeds the rule. */
export function enforceRateLimit(
  request: Request,
  rule: RateLimitRule,
  scope: string,
  identity?: string,
) {
  const now = Date.now();
  sweep(now);
  const key = `${scope}:${identity ?? clientIp(request)}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > rule.limit) {
    throw errors.rateLimited();
  }
}

export function rateLimitIdentity(request: Request, email?: string) {
  const emailPart = email ? email.toLowerCase() : "";
  return `${clientIp(request)}|${emailPart}`;
}
