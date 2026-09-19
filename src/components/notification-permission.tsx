"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage, useToast } from "@/components/providers";
import { bilingual } from "@/lib/i18n";

/**
 * Notification permission flow.
 * Asks once, never re-prompts after an explicit denial or "later".
 */
export function NotificationPermissionCard() {
  const { language } = useLanguage();
  const { push } = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSupported(false);
      return;
    }
    const dismissed = window.localStorage.getItem("mbn_notification_prompt");
    if (dismissed) return;
    if (Notification.permission === "default") {
      const timer = setTimeout(() => setVisible(true), 1400);
      return () => clearTimeout(timer);
    }
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      if (!("Notification" in window)) {
        push(bilingual(language, "এই ব্রাউজারে নোটিফিকেশন সমর্থিত নয়।", "Notifications are not supported in this browser."), "danger");
        return;
      }
      const permission = await Notification.requestPermission();
      window.localStorage.setItem("mbn_notification_prompt", permission);
      if (permission === "granted") {
        push(bilingual(language, "নোটিফিকেশন চালু হয়েছে।", "Notifications are enabled."), "success");
        new Notification("মণিরামপুর ব্লাড নেটওয়ার্ক", {
          body: bilingual(
            language,
            "নোটিফিকেশন চালু আছে। নতুন রক্তের অনুরোধের খবর আপনি পাবেন।",
            "Notifications are on. You will be alerted about new blood requests.",
          ),
        });
      } else if (permission === "denied") {
        push(
          bilingual(
            language,
            "নোটিফিকেশন বন্ধ করা হয়েছে। ব্রাউজার সেটিংস থেকে চালু করতে পারবেন।",
            "Notifications were blocked. You can enable them later in browser settings.",
          ),
          "danger",
        );
      }
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }, [language, push]);

  const postpone = useCallback(() => {
    window.localStorage.setItem("mbn_notification_prompt", "later");
    setVisible(false);
  }, [language]);

  if (!visible || !supported) return null;

  return (
    <div className="app-shell my-4">
      <div className="card border-[#f2d6da] bg-brand-soft p-4">
        <p className="text-[14px] font-semibold text-brand">
          {bilingual(language, "নোটিফিকেশন চালু করুন", "Enable notifications")}
        </p>
        <p className="mt-1 text-[13px] text-ink-soft">
          {bilingual(
            language,
            "নতুন রক্তের অনুরোধ, অনুরোধের আপডেট এবং জরুরি বিজ্ঞপ্তি সময়মতো পেতে নোটিফিকেশন চালু করুন।",
            "Turn on notifications to receive new blood requests, request updates and important emergency alerts.",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary min-h-[40px] px-4 py-2 text-[13.5px]" onClick={enable} disabled={busy}>
            {busy ? bilingual(language, "অপেক্ষা করুন…", "Please wait…") : bilingual(language, "নোটিফিকেশন চালু করুন", "Enable notifications")}
          </button>
          <button type="button" className="btn btn-secondary min-h-[40px] px-4 py-2 text-[13.5px]" onClick={postpone}>
            {bilingual(language, "পরে করব", "Maybe later")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shows a local notification for a new in-app alert (no sensitive payload). */
export function notifyLocally(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body });
}
