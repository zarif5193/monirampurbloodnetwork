import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { errors, jsonError } from "@/lib/http";
import { env } from "@/lib/env";
import { recordAudit } from "@/lib/audit";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

/** Private supporting documents. Only the requester and authorised staff may read them. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await context.params;

    if (!/^[0-9a-f-]{36}$/i.test(id)) throw errors.notFound();

    const rows = await db
      .select({
        requesterId: bloodRequests.requesterId,
        document: bloodRequests.proofDocumentPath,
        name: bloodRequests.proofDocumentName,
      })
      .from(bloodRequests)
      .where(and(eq(bloodRequests.id, id)))
      .limit(1);

    const row = rows[0];
    if (!row || !row.document) throw errors.notFound();

    const isStaff = ["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    if (row.requesterId !== session.user.id && !isStaff) throw errors.forbidden();

    // Stored names are generated UUIDs; validate to rule out any traversal.
    const safeName = path.basename(row.document);
    if (!/^[0-9a-f-]{36}(\.pdf|\.jpg|\.png)$/i.test(safeName)) throw errors.notFound();

    const storageRoot = path.isAbsolute(env.upload.storageDir)
      ? env.upload.storageDir
      : path.join(process.cwd(), env.upload.storageDir);
    const target = path.join(storageRoot, safeName);
    if (!target.startsWith(storageRoot)) throw errors.forbidden();

    const bytes = await readFile(target);
    const extension = path.extname(safeName).toLowerCase();

    await recordAudit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "CONTACT_VIEWED",
      resourceType: "REQUEST_DOCUMENT",
      resourceId: id,
    });

    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": MIME_BY_EXT[extension] ?? "application/octet-stream",
        "content-disposition": `inline; filename="document${extension}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
