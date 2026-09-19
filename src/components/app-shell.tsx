"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { useLanguage, useSession, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";
import { NotificationPermissionCard } from "@/components/notification-permission";

type NavItem = { href: string; label: string; icon: string; badge?: number };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, tx } = useLanguage();
  const { session } = useSession();
  const { push } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const navigation: NavItem[] = [
    { href: "/home", label: tx("হোম", "Home"), icon: "home" },
    { href: "/donors", label: tx("রক্তদাতা", "Donors"), icon: "donors" },
    { href: "/requests/inbox", label: tx("অনুরোধ", "Requests"), icon: "requests" },
    {
      href: "/notifications",
      label: tx("নোটিফিকেশন", "Alerts"),
      icon: "bell",
      badge: session?.unreadNotifications ?? 0,
    },
    { href: "/profile", label: tx("প্রোফাইল", "Profile"), icon: "profile" },
  ];

  async function logout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      push(tx("আপনি সফলভাবে লগআউট করেছেন।", "You have signed out."), "success");
      router.replace("/login");
    } catch {
      push(tx("লগআউট করা যায়নি। আবার চেষ্টা করুন।", "Could not sign out. Please try again."), "danger");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh pb-[calc(4.75rem+var(--safe-bottom))] lg:pb-0">
      <header
        className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-canvas)]/92 backdrop-blur"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="app-shell flex h-14 items-center justify-between gap-3">
          <Link href="/home" className="flex items-center gap-2" aria-label="মণিরামপুর ব্লাড নেটওয়ার্ক">
            <LogoMark size={28} />
            <span className="text-[14px] font-semibold leading-tight text-ink">মণিরামপুর ব্লাড নেটওয়ার্ক</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-soft hover:bg-white"
                data-active={pathname === item.href}
              >
                {item.label}
                {item.badge ? <span className="ml-1 text-brand">({item.badge})</span> : null}
              </Link>
            ))}
            <Link href="/emergency" className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-soft hover:bg-white">
              {tx("জরুরি সেবা", "Emergency")}
            </Link>
            <button type="button" className="btn btn-secondary ml-2 min-h-[38px] px-3 py-1.5 text-[13px]" onClick={logout} disabled={loggingOut}>
              {loggingOut ? tx("লগআউট হচ্ছে…", "Signing out…") : tx("লগআউট", "Log out")}
            </button>
          </nav>
          <button
            type="button"
            className="btn btn-quiet lg:hidden"
            onClick={logout}
            disabled={loggingOut}
            aria-label={tx("লগআউট", "Log out")}
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="app-shell py-5">{children}</main>

      {session && !session.emailDeliveryConfigured ? (
        <div className="app-shell mb-4">
          <p className="rounded-xl border border-[#f0e0bd] bg-[#fdf5e6] p-3 text-[12.5px] text-[color:var(--color-warning)]">
            {tx(
              "ইমেইল ডেলিভারি কনফিগার করা হয়নি — যাচাই কোড পাঠানো যাচ্ছে না।",
              "Email delivery is not configured — verification codes cannot be sent yet.",
            )}
          </p>
        </div>
      ) : null}

      <NotificationPermissionCard />

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--color-border)] bg-white/97 backdrop-blur lg:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-label={tx("প্রধান নেভিগেশন", "Primary navigation")}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-1.5">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="nav-item" data-active={active} aria-current={active ? "page" : undefined}>
                <NavIcon name={item.icon} active={active} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="absolute -mt-6 ml-5 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "var(--color-brand)" : "var(--color-ink-muted)";
  const common = { fill: "none", stroke, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg width="21" height="21" viewBox="0 0 24 24" {...common}><path d="M4 10.5 12 4l8 6.5V20H4z" /></svg>;
  if (name === "donors") return <svg width="21" height="21" viewBox="0 0 24 24" {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5" /><path d="M17 6.5c0 2-2.2 4-2.2 5.6a2.2 2.2 0 1 0 4.4 0c0-1.6-2.2-3.6-2.2-5.6Z" /></svg>;
  if (name === "requests") return <svg width="21" height="21" viewBox="0 0 24 24" {...common}><path d="M6 4h9l4 4v12H6z" /><path d="M14 4v4h4" /><path d="M9 13h7M9 16h5" /></svg>;
  if (name === "bell") return <svg width="21" height="21" viewBox="0 0 24 24" {...common}><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" /><path d="M10 18.5a2 2 0 0 0 4 0" /></svg>;
  return <svg width="21" height="21" viewBox="0 0 24 24" {...common}><circle cx="12" cy="8.5" r="3.4" /><path d="M5 20c1-3.6 3.7-5.2 7-5.2s6 1.6 7 5.2" /></svg>;
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.7" strokeLinecap="round">
      <path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </svg>
  );
}

/** Small helper hook used by screens to keep notification count fresh. */
export function useNotificationBadge() {
  const { session, refresh } = useSession();
  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);
  return session?.unreadNotifications ?? 0;
}
