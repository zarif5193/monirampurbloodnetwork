"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Field } from "@/components/ui";
import { useApiError, useLanguage, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";

type LoginResponse = { stage: string; emailVerified: boolean; profileComplete: boolean };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { tx } = useLanguage();
  const describeError = useApiError();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.stage === "VERIFY_EMAIL") {
        router.replace("/verify-email");
      } else if (data.stage === "COMPLETE_PROFILE") {
        router.replace("/onboarding/profile");
      } else {
        router.replace(params.get("next") ?? "/home");
      }
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={tx("লগইন করুন", "Sign in")}
      subtitle={tx("আপনার ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।", "Use your email address and password.")}
      footer={
        <>
          {tx("নতুন রক্তদাতা? ", "New donor? ")}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            {tx("অ্যাকাউন্ট তৈরি করুন", "Create an account")}
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
        <Field label={tx("ইমেইল ঠিকানা", "Email address")} htmlFor="email" required>
          <input
            id="email"
            name="email"
            type="email"
            className="field-control"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={tx("পাসওয়ার্ড", "Password")} htmlFor="password" required>
          <input
            id="password"
            name="password"
            type="password"
            className="field-control"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? tx("যাচাই করা হচ্ছে…", "Verifying…") : tx("লগইন", "Sign in")}
        </button>
        <div className="mt-3 text-center">
          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-ink-soft hover:underline"
            onClick={() => push(tx("পাসওয়ার্ড রিসেট পৃষ্ঠায় যাচ্ছি…", "Opening password reset…"), "info")}
          >
            {tx("পাসওয়ার্ড ভুলে গেছেন?", "Forgot your password?")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
