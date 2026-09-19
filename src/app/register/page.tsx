"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Field } from "@/components/ui";
import { useApiError, useLanguage, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 5);
}

export default function RegisterPage() {
  const router = useRouter();
  const { tx } = useLanguage();
  const describeError = useApiError();
  const { push } = useToast();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => passwordScore(form.password), [form.password]);
  const strengthLabel = ["", "খুব দুর্বল", "দুর্বল", "মধ্যম", "ভালো", "শক্তিশালী"][score];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(tx("দুটি পাসওয়ার্ড এক নয়।", "The two passwords do not match."));
      return;
    }
    if (!form.acceptedTerms) {
      setError(
        tx(
          "চালিয়ে যেতে গোপনীয়তা নীতি ও ব্যবহারের শর্তাবলি মেনে নিতে হবে।",
          "You must accept the privacy policy and terms of service to continue.",
        ),
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      push(
        tx(
          "রেজিস্ট্রেশন সফল হয়েছে। ইমেইলে পাঠানো কোডটি দিয়ে যাচাই করুন।",
          "Registration complete. Please verify using the code sent to your email.",
        ),
        "success",
      );
      router.replace("/verify-email");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={tx("নতুন রক্তদাতা অ্যাকাউন্ট", "Create a donor account")}
      subtitle={tx(
        "ইমেইল ও পাসওয়ার্ড দিয়ে শুরু করুন। পরবর্তী ধাপে ইমেইল যাচাই ও প্রোফাইল সম্পূর্ণ করতে হবে।",
        "Start with your email and password. Next you will verify your email and complete your profile.",
      )}
      footer={
        <>
          {tx("অ্যাকাউন্ট আছে? ", "Already registered? ")}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {tx("লগইন করুন", "Sign in")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        <Field label={tx("পুরো নাম", "Full name")} htmlFor="fullName" required>
          <input
            id="fullName"
            className="field-control"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          />
        </Field>

        <Field label={tx("ইমেইল ঠিকানা", "Email address")} htmlFor="email" required hint={tx("এই ঠিকানায় যাচাই কোড পাঠানো হবে।", "A verification code will be sent to this address.")}>
          <input
            id="email"
            type="email"
            className="field-control"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>

        <Field label={tx("পাসওয়ার্ড", "Password")} htmlFor="password" required hint={tx("কমপক্ষে ৮ অক্ষর, অন্তত একটি অক্ষর ও একটি সংখ্যা।", "At least 8 characters, with at least one letter and one number.")}>
          <input
            id="password"
            type="password"
            className="field-control"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            aria-describedby="password-strength"
          />
        </Field>

        <div className="mb-4" aria-live="polite">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#efe9e7]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(score / 5) * 100}%`,
                  background: score <= 2 ? "var(--color-danger)" : score === 3 ? "var(--color-warning)" : "var(--color-success)",
                }}
              />
            </div>
            <span className="w-20 text-right text-[12px] text-ink-muted">{form.password ? strengthLabel : ""}</span>
          </div>
          <span id="password-strength" className="sr-only">
            {tx("পাসওয়ার্ড শক্তি", "Password strength")}
          </span>
        </div>

        <Field label={tx("পাসওয়ার্ড আবার লিখুন", "Confirm password")} htmlFor="confirmPassword" required>
          <input
            id="confirmPassword"
            type="password"
            className="field-control"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
          />
        </Field>

        <label className="mb-5 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[color:var(--color-brand)]"
            checked={form.acceptedTerms}
            onChange={(event) => setForm({ ...form, acceptedTerms: event.target.checked })}
            required
          />
          <span>
            {tx("আমি", "I accept the")}{" "}
            <Link href="/about#privacy" className="font-medium text-brand hover:underline">
              {tx("গোপনীয়তা নীতি", "privacy policy")}
            </Link>
            {", "}
            <Link href="/about#terms" className="font-medium text-brand hover:underline">
              {tx("ব্যবহারের শর্তাবলি", "terms of service")}
            </Link>
            {" "}
            {tx(
              "এবং রক্তদাতা অংশগ্রহণের শর্তাবলি পড়েছি এবং মেনে নিচ্ছি।",
              "and the donor participation terms after reading them.",
            )}
          </span>
        </label>

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? tx("অ্যাকাউন্ট তৈরি হচ্ছে…", "Creating account…") : tx("অ্যাকাউন্ট তৈরি করুন", "Create account")}
        </button>
      </form>
    </AuthShell>
  );
}
