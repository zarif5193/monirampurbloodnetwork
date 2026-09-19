"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Field } from "@/components/ui";
import { useApiError, useLanguage } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { tx } = useLanguage();
  const describeError = useApiError();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ messageBn: string; messageEn: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      void router.prefetch("/reset-password");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      void data;
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={tx("পাসওয়ার্ড রিসেট করুন", "Reset your password")}
      subtitle={tx(
        "আপনার ইমেইল ঠিকানা দিন। ঠিকানাটি সিস্টেমে থাকলে রিসেট কোড পাঠানো হবে।",
        "Enter your email address. If it exists in our system, a reset code will be sent.",
      )}
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {tx("লগইন পৃষ্ঠায় ফিরুন", "Back to sign in")}
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success">
          {tx(
            "যদি এই ইমেইল ঠিকানাটি আমাদের সিস্টেমে থাকে, তাহলে পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে।",
            "If this email address exists in our system, a password reset code has been sent.",
          )}
        </Alert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="mt-4">
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? tx("ইমেইল পাঠানো হচ্ছে…", "Sending email…") : tx("রিসেট কোড পাঠান", "Send reset code")}
        </button>
      </form>
    </AuthShell>
  );
}
