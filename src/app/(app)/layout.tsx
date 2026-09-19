import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth/session";

/**
 * Server-side gate. The middleware only checks for a cookie; here the session,
 * email verification and profile completion are all re-verified on the server.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/login?next=/home");
  if (!session.user.emailVerified) redirect("/verify-email");
  if (!session.profileComplete) redirect("/onboarding/profile");

  return <AppShell>{children}</AppShell>;
}
