import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[#f1eeed] text-[color:var(--color-ink-soft)] border-[color:var(--color-border)]",
  brand: "bg-brand-soft text-brand border-[#f2d6da]",
  success: "bg-[#eaf5ef] text-[color:var(--color-success)] border-[#d3e8db]",
  warning: "bg-[#fdf5e6] text-[color:var(--color-warning)] border-[#f0e0bd]",
  danger: "bg-[#fbeceb] text-[color:var(--color-danger)] border-[#f2d4d1]",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${toneClass[tone]}`}>{children}</span>;
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="text-[13px] text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[12.5px] text-ink-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-[12.5px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "neutral",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-3 text-[13.5px] leading-relaxed ${toneClass[tone]}`} role="status">
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon ? <div className="mb-1 opacity-70">{icon}</div> : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[13.5px] text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card p-4">
          <div className="skeleton mb-3 h-4 w-1/3" />
          <div className="skeleton mb-2 h-3 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      {label ? <span className="text-[13px]">{label}</span> : <span className="sr-only">loading</span>}
    </span>
  );
}

export function ProgressBar({ step, total }: { step: number; total: number }) {
  const percent = Math.round((step / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12.5px] text-ink-muted">
        <span>
          ধাপ {step} / {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#efe9e7]"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[12.5px] text-ink-muted">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function BloodGroupChip({ group, size = "md" }: { group: string; size?: "sm" | "md" | "lg" }) {
  const dimension = size === "lg" ? "h-14 w-14 text-[18px]" : size === "sm" ? "h-9 w-9 text-[12px]" : "h-11 w-11 text-[14px]";
  return (
    <span
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-xl bg-brand-soft font-semibold text-brand`}
      aria-label={`রক্তের গ্রুপ ${group}`}
    >
      {group}
    </span>
  );
}
