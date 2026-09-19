/**
 * Server-side environment configuration.
 * Nothing in this file may be imported from client components.
 * Secrets are never serialised into API responses.
 */

function optional(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",

  databaseUrl: process.env.DATABASE_URL ?? "",

  /** Session signing secret. Falls back to a generated dev-only secret. */
  sessionSecret:
    optional("SESSION_SECRET") ??
    optional("JWT_SECRET") ??
    (nodeEnv === "production" ? undefined : "manirampur-blood-network-development-secret"),

  sessionCookieName: "mbn_session",
  sessionTtlDays: Number(optional("SESSION_TTL_DAYS") ?? 30),

  smtp: {
    host: optional("SMTP_HOST"),
    port: Number(optional("SMTP_PORT") ?? 465),
    secure: (optional("SMTP_SECURE") ?? "true") === "true",
    user: optional("SMTP_USER"),
    appPassword: optional("SMTP_APP_PASSWORD"),
    from: optional("EMAIL_FROM") ?? optional("SMTP_USER"),
  },

  adminEmails: (optional("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),

  appUrl: optional("APP_URL") ?? "http://localhost:3000",

  upload: {
    maxBytes: Number(optional("UPLOAD_MAX_BYTES") ?? 4 * 1024 * 1024),
    storageDir: optional("UPLOAD_STORAGE_DIR") ?? "private-uploads",
  },
} as const;

/** True only when a Gmail App Password has actually been provisioned. */
export function isEmailDeliveryConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.appPassword && env.smtp.from);
}

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!env.sessionSecret && env.isProduction) {
  // Do not crash the sandbox preview: log loudly and use an ephemeral secret.
  console.warn(
    "[security] SESSION_SECRET is not set in production. Sessions are signed with an ephemeral key.",
  );
}

export const sessionSigningKey = env.sessionSecret ?? "manirampur-blood-network-ephemeral-secret";
