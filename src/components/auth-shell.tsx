import Link from "next/link";
import type { ReactNode } from "react";
import { LogoLockup } from "@/components/brand/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)]">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 py-10">
        <Link href="/" className="mx-auto mb-7 block">
          <LogoLockup size={44} />
        </Link>
        <div className="card p-6">
          <h1 className="text-[19px] font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13.5px] text-ink-muted">{subtitle}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-[13.5px] text-ink-soft">{footer}</div> : null}
        <p className="mt-8 text-center text-[11.5px] text-ink-muted">
          মণিরামপুর উপজেলা · যশোর · বাংলাদেশ — এক ব্যাগ রক্ত, একটি জীবন
        </p>
      </div>
    </div>
  );
}
