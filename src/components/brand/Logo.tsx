import type { CSSProperties } from "react";

/**
 * Brand mark: a single blood drop resting inside an open human-support arc,
 * drawn with vectors so it stays crisp on light backgrounds, dark backgrounds,
 * browser tabs and Android launcher icons.
 */
export function LogoMark({ size = 40, tone = "brand" }: { size?: number; tone?: "brand" | "light" | "dark" }) {
  const styles: CSSProperties = { width: size, height: size };
  const drop = tone === "light" ? "#ffffff" : "#8d1224";
  const arc = tone === "light" ? "rgba(255,255,255,0.72)" : tone === "dark" ? "#c9ced6" : "#0f5c56";

  return (
    <svg viewBox="0 0 48 48" style={styles} role="img" aria-label="মণিরামপুর ব্লাড নেটওয়ার্ক">
      <path
        d="M24 5.5c0 5.4-9.4 13.2-9.4 20.4A9.4 9.4 0 0 0 24 35.3a9.4 9.4 0 0 0 9.4-9.4C33.4 18.7 24 10.9 24 5.5Z"
        fill={drop}
      />
      <path
        d="M9.6 32.4c3.4 6.6 9.1 10.4 14.4 10.4s11-3.8 14.4-10.4"
        stroke={arc}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="24.6" r="2.4" fill={tone === "light" ? "#8d1224" : "#ffffff"} opacity="0.85" />
    </svg>
  );
}

export function LogoLockup({
  size = 36,
  tone = "brand",
  subtitle,
}: {
  size?: number;
  tone?: "brand" | "light" | "dark";
  subtitle?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} tone={tone} />
      <span className="leading-tight">
        <span
          className="block font-semibold"
          style={{ fontSize: size * 0.4, color: tone === "light" ? "#fff" : "var(--color-ink)" }}
        >
          মণিরামপুর ব্লাড নেটওয়ার্ক
        </span>
        <span
          className="block"
          style={{
            fontSize: size * 0.26,
            letterSpacing: "0.08em",
            color: tone === "light" ? "rgba(255,255,255,0.75)" : "var(--color-ink-muted)",
          }}
        >
          {subtitle ?? "MANIRAMPUR BLOOD NETWORK"}
        </span>
      </span>
    </span>
  );
}
