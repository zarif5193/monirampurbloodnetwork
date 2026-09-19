/**
 * Development / provisioning aid.
 *
 * While SMTP credentials are NOT configured, transactional mail cannot leave the
 * server. In that state the rendered code is held in server memory (keyed by user
 * id) so the verification flow can still be exercised during setup.
 *
 * As soon as SMTP_APP_PASSWORD is present this map is never populated and the
 * helper endpoints return no codes at all.
 */
const pending = new Map<string, { code: string; expiresAt: number }>();

export function storeDevPendingCode(userId: string, code: string, ttlMinutes: number) {
  if (process.env.SMTP_APP_PASSWORD) return;
  pending.set(userId, { code, expiresAt: Date.now() + ttlMinutes * 60 * 1000 });
}

export function verifyEmailPendingCode(userId: string): string | null {
  if (process.env.SMTP_APP_PASSWORD) return null;
  const entry = pending.get(userId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pending.delete(userId);
    return null;
  }
  return entry.code;
}
