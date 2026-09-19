import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Cryptographically random, single-use code (10 digits for easy manual entry). */
export function generateVerificationCode(): string {
  const buffer = randomBytes(10);
  let code = "";
  for (const byte of buffer) {
    code += (byte % 10).toString();
  }
  return code;
}

export function generateOpaqueToken(): string {
  return randomBytes(48).toString("base64url");
}

/** Codes/tokens are stored hashed — never in plaintext. */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
