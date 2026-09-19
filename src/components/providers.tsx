"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, formatErrorMessage } from "@/lib/client/api";
import { bilingual, type Language } from "@/lib/i18n";

/* ----------------------------- language ----------------------------- */

type LanguageContextValue = { language: Language; setLanguage: (value: Language) => void };
const LanguageContext = createContext<LanguageContextValue>({ language: "bn", setLanguage: () => {} });

export function useLanguage() {
  const { language, setLanguage } = useContext(LanguageContext);
  const tx = useCallback(
    (bn: string, en: string) => bilingual(language, bn, en),
    [language],
  );
  return { language, setLanguage, tx };
}

/* ------------------------------ toasts ------------------------------ */

type Toast = { id: number; message: string; tone: "success" | "danger" | "info" };
const ToastContext = createContext<{ push: (message: string, tone?: Toast["tone"]) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/* ----------------------------- session ------------------------------ */

export type SessionState = {
  authenticated: boolean;
  user?: { id: string; email: string; role: string; emailVerified: boolean; language: string };
  hasProfile?: boolean;
  profileComplete?: boolean;
  unreadNotifications?: number;
  stage: "GUEST" | "VERIFY_EMAIL" | "COMPLETE_PROFILE" | "HOME";
  emailDeliveryConfigured?: boolean;
};

const SessionContext = createContext<{
  session: SessionState | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ session: null, loading: true, refresh: async () => {} });

export function useSession() {
  return useContext(SessionContext);
}

/* --------------------------- provider tree -------------------------- */

export function AppProviders({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof document === "undefined") return "bn";
    const stored = document.cookie
      .split("; ")
      .find((row) => row.startsWith("mbn_lang="))
      ?.split("=")[1];
    return stored === "bn" || stored === "en" ? stored : "bn";
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const toastId = useRef(0);

  const setLanguage = useCallback((value: Language) => {
    setLanguageState(value);
    document.cookie = `mbn_lang=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = value;
  }, []);

  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<SessionState>("/api/auth/session");
      setSession(data);
    } catch {
      setSession({ authenticated: false, stage: "GUEST" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refresh]);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const languageValue = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  const toastValue = useMemo(() => ({ push }), [push]);
  const sessionValue = useMemo(() => ({ session, loading, refresh }), [session, loading, refresh]);

  return (
    <LanguageContext.Provider value={languageValue}>
      <ToastContext.Provider value={toastValue}>
        <OfflineBanner />
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(1rem+var(--safe-bottom))]">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-[13.5px] shadow-lg ${
                toast.tone === "success"
                  ? "border-[#d3e8db] bg-white text-[color:var(--color-success)]"
                  : toast.tone === "danger"
                    ? "border-[#f2d4d1] bg-white text-[color:var(--color-danger)]"
                    : "border-[color:var(--color-border)] bg-white text-ink"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </LanguageContext.Provider>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#191a1e]/85 px-5" role="alertdialog" aria-live="assertive">
      <div className="card w-full max-w-sm p-6 text-center">
        <p className="text-[16px] font-semibold text-ink">{bilingual(language, "ইন্টারনেট সংযোগ নেই", "No Internet Connection")}</p>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          {bilingual(
            language,
            "কোনো ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
            "We couldn’t connect to the internet. Please check your connection and try again.",
          )}
        </p>
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => window.location.reload()}>
          {bilingual(language, "আবার চেষ্টা করুন", "Retry")}
        </button>
      </div>
    </div>
  );
}

/** Global error helper used across screens. */
export function useApiError() {
  const { language } = useLanguage();
  return useCallback((error: unknown) => formatErrorMessage(error, language), [language]);
}
