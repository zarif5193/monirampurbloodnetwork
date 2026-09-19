"use client";

import { useState } from "react";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from "@/lib/constants";

export function ReportIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 21V4h9l-1 3h5l-1.5 4.5L19 16H6" />
    </svg>
  );
}

/** Flag/report entry point. Accessible label + rate limited backend. */
export function ReportButton({
  targetType,
  targetId,
  label,
  variant = "quiet",
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
  variant?: "quiet" | "secondary";
}) {
  const { language, tx } = useLanguage();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason) {
      push(tx("অনুগ্রহ করে একটি কারণ নির্বাচন করুন।", "Please select a reason."), "danger");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, reason, description: description.trim() || null }),
      });
      push(
        tx(
          "রিপোর্টটি জমা হয়েছে। আমাদের টিম দ্রুত পর্যালোচনা করবে।",
          "Your report has been submitted. Our team will review it shortly.",
        ),
        "success",
      );
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (error) {
      push(tx("রিপোর্ট জমা দেওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।", "Could not submit the report. Please try again later."), "danger");
      void error;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`btn ${variant === "quiet" ? "btn-quiet" : "btn-secondary"} min-h-[38px] px-2.5 py-1.5 text-[12.5px]`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label ?? tx("রিপোর্ট করুন", "Report")}
        title={tx("রিপোর্ট করুন", "Report")}
      >
        <ReportIcon />
        {variant === "secondary" ? tx("রিপোর্ট করুন", "Report") : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#191a1e]/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={tx("রিপোর্ট করুন", "Report")}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-ink">{tx("রিপোর্ট করুন", "Submit a report")}</h2>
              <button type="button" className="btn btn-quiet px-2" onClick={() => setOpen(false)} aria-label={tx("বাতিল", "Cancel")}>
                ✕
              </button>
            </div>
            <p className="mb-4 text-[13px] text-ink-muted">
              {tx(
                "সমস্যাটি জানান। আপনার রিপোর্ট গোপন রাখা হবে এবং শুধুমাত্র অনুমোদিত পরিচ্ছন্নতা টিম দেখবে।",
                "Tell us what happened. Your report stays confidential and is visible only to authorised moderators.",
              )}
            </p>
            <fieldset className="mb-4">
              <legend className="field-label">{tx("কারণ", "Reason")}</legend>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[color:var(--color-border)] px-3 py-2 text-[13.5px]">
                    <input
                      type="radio"
                      name="report-reason"
                      value={value}
                      checked={reason === value}
                      onChange={() => setReason(value)}
                      className="h-4 w-4 accent-[color:var(--color-brand)]"
                    />
                    {REPORT_REASON_LABELS[value][language]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field-label" htmlFor="report-description">
              {tx("বিস্তারিত (ঐচ্ছিক)", "Details (optional)")}
            </label>
            <textarea
              id="report-description"
              className="field-control min-h-[92px]"
              maxLength={1500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={tx("কী ঘটেছে তা সংক্ষেপে লিখুন।", "Briefly describe what happened.")}
            />
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn btn-primary flex-1" onClick={submit} disabled={submitting}>
                {submitting ? tx("পাঠানো হচ্ছে…", "Sending…") : tx("রিপোর্ট জমা দিন", "Submit report")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                {tx("বাতিল", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
