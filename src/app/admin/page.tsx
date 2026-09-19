import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getSession } from "@/lib/auth/session";

/** Separate, server-gated admin surface. Normal donor UI never links here. */
export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!session.user.emailVerified) redirect("/verify-email");
  if (!["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/home");
  }
  return <AdminPanel role={session.user.role} />;
}
