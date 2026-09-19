"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Field } from "@/components/ui";
import { useApiError, useLanguage } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { tx } = useLanguage();
  const describeError = useApiError();
  const [form, setForm] = useState({
    email: params.get("email") ?? "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(tx("দুটি পাসওয়ার্ড এক নয়।", "The two passwords do not match."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify(form) });
      router.replace("/login");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={tx("নতুন পাসওয়ার্ড দিন", "Set a new password")}
      subtitle={tx(
        "ইমেইলে পাঠানো ১০ সংখ্যার কোড এবং নতুন পাসওয়ার্ড দিন। রিসেট হলে পুরোনো সব সেশন বাতিল হয়ে যাবে।",
        "Enter the 10-digit code from your email and a new password. All previous sessions will be revoked.",
      )}
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {tx("লগইন পৃষ্ঠায় ফিরুন", "Back to sign in")}
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <Field label={tx("ইমেইল ঠিকানা", "Email address")} htmlFor="email" required>
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
        <Field label={tx("রিসেট কোড", "Reset code")} htmlFor="code" required>
          <input
            id="code"
            inputMode="numeric"
            maxLength={10}
            className="field-control text-center text-[18px] tracking-[0.35em]"
            required
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })}
          />
        </Field>
        <Field
          label={tx("নতুন পাসওয়ার্ড", "New password")}
          htmlFor="password"
          required
          hint={tx("কমপক্ষে ৮ অক্ষর, অন্তত একটি অক্ষর ও একটি সংখ্যা।", "At least 8 characters, with at least one letter and one number.")}
        >
          <input
            id="password"
            type="password"
            className="field-control"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </Field>
        <Field label={tx("নতুন পাসওয়ার্ড আবার লিখুন", "Confirm new password")} htmlFor="confirm" required>
          <input
            id="confirm"
            type="password"
            className="field-control"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
          />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={submitting || form.code.length !== 10}>
          {submitting ? tx("পরিবর্তন করা হচ্ছে…", "Updating…") : tx("পাসওয়ার্ড পরিবর্তন করুন", "Update password")}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
