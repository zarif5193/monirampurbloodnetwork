import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { donorProfiles, sessions, users } from "@/db/schema";
import { env, sessionSigningKey } from "@/lib/env";
import { errors } from "@/lib/http";
import { generateOpaqueToken, hashSecret } from "@/lib/auth/password";

const secretKey = new TextEncoder().encode(sessionSigningKey);
const rollingRefreshMs = 1000 * 60 * 60; // refresh "last used" at most hourly

export type SessionUser = {
  id: string;
  email: string;
  role: (typeof users.$inferSelect)["role"];
  status: (typeof users.$inferSelect)["status"];
  emailVerified: boolean;
  language: string;
};

export type SessionContext = {
  user: SessionUser;
  sessionToken: string;
  profileComplete: boolean;
  hasProfile: boolean;
};

function newSessionToken() {
  return generateOpaqueToken();
}

async function signSession(token: string, expiresAt: Date) {
  return new SignJWT({ sub: token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey);
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: env.isProduction,
    path: "/",
    expires,
  };
}

/** Creates a server-side session and returns the signed cookie value. */
export async function createSession(userId: string, request: Request) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashSecret(token),
    expiresAt,
    userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? null,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  const signed = await signSession(token, expiresAt);
  return { token: signed, expiresAt };
}

export function attachSessionCookie(response: import("next/server").NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(env.sessionCookieName, token, sessionCookieOptions(expiresAt));
  return response;
}

export function clearSessionCookie(response: import("next/server").NextResponse) {
  response.cookies.set(env.sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
  return response;
}

/** Resolves the current session. Returns null when unauthenticated/invalid. */
export async function getSession(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(env.sessionCookieName)?.value;
  if (!raw) return null;

  let token: string;
  try {
    const { payload } = await jwtVerify(raw, secretKey);
    token = typeof payload.sub === "string" ? payload.sub : "";
  } catch {
    return null;
  }
  if (!token) return null;

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashSecret(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.user.status === "SUSPENDED" || row.user.status === "DEACTIVATED") return null;

  if (Date.now() - new Date(row.session.lastUsedAt).getTime() > rollingRefreshMs) {
    await db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, row.session.id));
  }

  const profileRows = await db
    .select({ complete: donorProfiles.profileComplete })
    .from(donorProfiles)
    .where(eq(donorProfiles.userId, row.user.id))
    .limit(1);

  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      role: row.user.role,
      status: row.user.status,
      emailVerified: row.user.emailVerified,
      language: row.user.language,
    },
    sessionToken: token,
    hasProfile: profileRows.length > 0,
    profileComplete: profileRows[0]?.complete ?? false,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw errors.unauthorized();
  return session;
}

export async function requireVerifiedUser(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.user.emailVerified) throw errors.emailNotVerified();
  return session;
}

export async function requireCompletedProfile(): Promise<SessionContext & { profileComplete: true }> {
  const session = await requireVerifiedUser();
  if (!session.profileComplete) throw errors.profileIncomplete();
  return session as SessionContext & { profileComplete: true };
}

const STAFF_ROLES = ["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export async function requireStaff() {
  const session = await requireSession();
  if (!session.user.emailVerified) throw errors.emailNotVerified();
  if (!STAFF_ROLES.includes(session.user.role as (typeof STAFF_ROLES)[number])) {
    throw errors.adminRequired();
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!session.user.emailVerified) throw errors.emailNotVerified();
  if (!ADMIN_ROLES.includes(session.user.role as (typeof ADMIN_ROLES)[number])) {
    throw errors.adminRequired();
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (session.user.role !== "SUPER_ADMIN") throw errors.adminRequired();
  return session;
}

/** Invalidates the current session row (logout). */
export async function revokeSession(token: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, hashSecret(token)), isNull(sessions.revokedAt)));
}
