"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, Field } from "@/components/ui";
import { useApiError, useLanguage, useSession, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { tx, language } = useLanguage();
  const describeError = useApiError();
  const { push } = useToast();
  const { session, loading, refresh } = useSession();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session && !session.authenticated) router.replace("/login");
  }, [loading, session, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      await refresh();
      push(tx("ইমেইল যাচাই সম্পন্ন হয়েছে।", "Your email is verified."), "success");
      router.replace("/onboarding/profile");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: session?.user?.email }),
      });
      push(
        tx(
          "নতুন কোড পাঠানো হয়েছে। ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।",
          "A new code has been sent. Please check your inbox and spam folder.",
        ),
        "success",
      );
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setResending(false);
    }
  }

  async function revealSetupCode() {
    if (!session?.user?.email) return;
    try {
      const data = await apiFetch<{ available: boolean; code?: string; noticeBn?: string; noticeEn?: string }>(
        "/api/auth/pending-code",
        { method: "POST", body: JSON.stringify({ email: session.user.email }) },
      );
      if (data.available && data.code) {
        setSetupCode(data.code);
      } else {
        push(tx("কোড পাওয়া যায়নি। আবার চেষ্টা করুন।", "No code is available. Please try again."), "danger");
      }
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <AuthShell
      title={tx("ইমেইল যাচাই করুন", "Verify your email")}
      subtitle={tx(
        "আপনার ইমেইলে ১০ সংখ্যার যাচাই কোড পাঠানো হয়েছে। কোডটি ৩০ মিনিট পর্যন্ত বৈধ এবং কেবল একবার ব্যবহার করা যাবে।",
        "We sent a 10-digit verification code to your email. It is valid for 30 minutes and can be used once.",
      )}
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {tx("লগইন পৃষ্ঠায় ফিরুন", "Back to sign in")}
        </Link>
      }
    >
      {session && !session.emailDeliveryConfigured ? (
        <div className="mb-4">
          <Alert tone="warning" title={tx("ইমেইল ডেলিভারি কনফিগার করা হয়নি", "Email delivery is not configured")}>
            {language === "bn"
              ? "Gmail App Password সেট করা হয়নি, তাই কোড ইমেইলে যাচ্ছে না। কোডটি সার্ভার থেকে দেখতে নিচের বোতামটি ব্যবহার করুন।"
              : "No Gmail App Password is set, so codes are not being emailed. Use the button below to retrieve the code from the server."}
            <button type="button" className="btn btn-secondary mt-2 w-full" onClick={revealSetupCode}>
              {tx("কোড দেখুন", "Show code")}
            </button>
            {setupCode ? (
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-center text-[18px] font-semibold tracking-[0.3em] text-brand">
                {setupCode}
              </p>
            ) : null}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate>
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <Field label={tx("যাচাই কোড", "Verification code")} htmlFor="code" required hint={session?.user?.email ?? ""}>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{10}"
            maxLength={10}
            className="field-control text-center text-[18px] tracking-[0.35em]"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={submitting || code.length !== 10}>
          {submitting ? tx("যাচাই করা হচ্ছে…", "Verifying…") : tx("ইমেইল যাচাই করুন", "Verify email")}
        </button>
        <button type="button" className="btn btn-ghost mt-2 w-full" onClick={resend} disabled={resending}>
          {resending ? tx("ইমেইল পাঠানো হচ্ছে…", "Sending email…") : tx("আবার কোড পাঠান", "Send the code again")}
        </button>
      </form>
    </AuthShell>
  );
}
