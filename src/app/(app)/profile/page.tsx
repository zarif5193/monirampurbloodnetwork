"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Card, Field, SectionTitle, SkeletonList } from "@/components/ui";
import { useApiError, useLanguage, useSession, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { AVAILABILITY_OPTIONS, BLOOD_GROUP_LABELS_BN } from "@/lib/constants";

type ProfileResponse = {
  hasProfile: boolean;
  user?: { email: string; emailVerified: boolean; createdAt: string };
  profile?: {
    displayName: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    weightKg: string;
    heightCm: number | null;
    unionName: string;
    upazila: string;
    area: string | null;
    availabilityStatus: string;
    lastDonationDate: string | null;
    nextPotentialDonationDate: string | null;
    donationCount: number;
    verificationStatus: string;
    ruleVersionUsed: string | null;
  };
  donationHistory?: { id: string; donationDate: string; location: string | null }[];
};

type Preferences = {
  newRequestAlerts: boolean;
  requestUpdates: boolean;
  emergencyAlerts: boolean;
  donationReminders: boolean;
  systemAnnouncements: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const { tx, language, setLanguage } = useLanguage();
  const describeError = useApiError();
  const { push } = useToast();
  const { refresh } = useSession();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [donation, setDonation] = useState({ lastDonationDate: "", donationCount: "", weightKg: "" });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [today] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const profile = await apiFetch<ProfileResponse>("/api/profile");
      setData(profile);
      setDonation({
        lastDonationDate: profile.profile?.lastDonationDate ?? "",
        donationCount: String(profile.profile?.donationCount ?? 0),
        weightKg: profile.profile?.weightKg ?? "",
      });
    } catch {
      setData({ hasProfile: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
      void apiFetch<{ preferences: Preferences | null }>("/api/notifications/preferences")
        .then((response) => setPreferences(response.preferences))
        .catch(() => setPreferences(null));
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function saveAvailability(availabilityStatus: string) {
    setBusy("availability");
    try {
      await apiFetch("/api/profile/availability", { method: "POST", body: JSON.stringify({ availabilityStatus }) });
      push(tx("উপলব্ধতা হালনাগাদ হয়েছে।", "Availability updated."), "success");
      await load();
    } catch (error) {
      push(describeError(error), "danger");
    } finally {
      setBusy(null);
    }
  }

  async function saveDonationInfo() {
    setBusy("donation");
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          lastDonationDate: donation.lastDonationDate || null,
          donationCount: Number(donation.donationCount || 0),
          weightKg: Number(donation.weightKg),
        }),
      });
      push(tx("রক্তদানের তথ্য হালনাগাদ হয়েছে।", "Donation information updated."), "success");
      await load();
    } catch (error) {
      push(describeError(error), "danger");
    } finally {
      setBusy(null);
    }
  }

  async function savePreferences(next: Preferences) {
    setPreferences(next);
    setBusy("preferences");
    try {
      await apiFetch("/api/notifications/preferences", { method: "PUT", body: JSON.stringify(next) });
      push(tx("নোটিফিকেশন সেটিংস সংরক্ষিত হয়েছে।", "Notification settings saved."), "success");
    } catch (error) {
      push(describeError(error), "danger");
    } finally {
      setBusy(null);
    }
  }

  async function changePassword() {
    setBusy("password");
    try {
      await apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify(passwords) });
      push(tx("পাসওয়ার্ড পরিবর্তন হয়েছে।", "Your password has been changed."), "success");
      setPasswords({ currentPassword: "", password: "", confirmPassword: "" });
    } catch (error) {
      push(describeError(error), "danger");
    } finally {
      setBusy(null);
    }
  }

  async function requestDeletion() {
    setBusy("delete");
    try {
      await apiFetch("/api/account/deletion", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE", reason: null }),
      });
      await refresh();
      router.replace("/");
    } catch (error) {
      push(describeError(error), "danger");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <SkeletonList rows={4} />;
  if (!data?.profile) {
    return <Alert tone="warning">{tx("প্রোফাইল তথ্য পাওয়া যায়নি।", "Profile information is unavailable.")}</Alert>;
  }

  const profile = data.profile;
  const age = profile.dateOfBirth
    ? Math.floor((today - new Date(`${profile.dateOfBirth}T00:00:00Z`).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold text-ink">{profile.displayName}</h1>
            <p className="text-[13px] text-ink-muted">{data.user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={data.user?.emailVerified ? "success" : "warning"}>
                {data.user?.emailVerified ? tx("ইমেইল যাচাইকৃত", "Email verified") : tx("ইমেইল যাচাই বাকি", "Email unverified")}
              </Badge>
              <Badge tone={profile.verificationStatus === "VERIFIED" ? "success" : "neutral"}>
                {profile.verificationStatus === "VERIFIED" ? tx("যাচাইকৃত রক্তদাতা", "Verified donor") : tx("যাচাই অপেক্ষমাণ", "Verification pending")}
              </Badge>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={logout} disabled={busy === "logout"}>
            {busy === "logout" ? tx("লগআউট হচ্ছে…", "Signing out…") : tx("লগআউট", "Log out")}
          </button>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: tx("রক্তের গ্রুপ", "Blood group"), value: language === "bn" ? BLOOD_GROUP_LABELS_BN[profile.bloodGroup as never] : profile.bloodGroup },
            { label: tx("বয়স", "Age"), value: age ? String(age) : "—" },
            { label: tx("মোবাইল", "Mobile"), value: profile.phoneNumber },
            { label: tx("ইউনিয়ন / এলাকা", "Union / Area"), value: `${profile.unionName}, ${profile.upazila}` },
            { label: tx("ওজন", "Weight"), value: `${Number(profile.weightKg)} kg` },
            { label: tx("সম্ভাব্য পরবর্তী রক্তদানের তারিখ", "Potential next donation date"), value: formatDate(profile.nextPotentialDonationDate, language) },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-[color:var(--color-border)] px-3.5 py-2.5">
              <dt className="text-[12px] text-ink-muted">{row.label}</dt>
              <dd className="text-[14px] font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section id="availability">
        <SectionTitle title={tx("উপলব্ধতা", "Availability")} subtitle={tx("সব সময় হালনাগাদ রাখুন।", "Keep this up to date.")} />
        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`btn min-h-[40px] px-3.5 py-2 text-[13px] ${profile.availabilityStatus === option ? "btn-primary" : "btn-secondary"}`}
                onClick={() => saveAvailability(option)}
                disabled={busy === "availability"}
              >
                {option === "AVAILABLE"
                  ? tx("রক্তদানের জন্য উপলব্ধ", "Available")
                  : option === "TEMPORARILY_UNAVAILABLE"
                    ? tx("সাময়িকভাবে অনুপলব্ধ", "Temporarily unavailable")
                    : tx("এই মুহূর্তে অনুপলব্ধ", "Not available")}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section id="donation">
        <SectionTitle title={tx("রক্তদানের তথ্য", "Donation information")} />
        <Card className="p-4">
          <div className="grid gap-0 sm:grid-cols-3">
            <Field label={tx("সর্বশেষ রক্তদানের তারিখ", "Last donation date")} htmlFor="lastDonation">
              <input id="lastDonation" type="date" className="field-control" max={new Date().toISOString().slice(0, 10)} value={donation.lastDonationDate} onChange={(event) => setDonation({ ...donation, lastDonationDate: event.target.value })} />
            </Field>
            <Field label={tx("মোট রক্তদান", "Total donations")} htmlFor="count">
              <input id="count" inputMode="numeric" className="field-control" value={donation.donationCount} onChange={(event) => setDonation({ ...donation, donationCount: event.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label={tx("ওজন (কেজি)", "Weight (kg)")} htmlFor="weight">
              <input id="weight" inputMode="decimal" className="field-control" value={donation.weightKg} onChange={(event) => setDonation({ ...donation, weightKg: event.target.value })} />
            </Field>
          </div>
          <button type="button" className="btn btn-primary" onClick={saveDonationInfo} disabled={busy === "donation"}>
            {busy === "donation" ? tx("সংরক্ষণ করা হচ্ছে…", "Saving…") : tx("সংরক্ষণ করুন", "Save")}
          </button>
          <p className="mt-3 text-[12.5px] text-ink-muted">
            {tx("নিয়মের সংস্করণ", "Rule version")}: {profile.ruleVersionUsed ?? "—"}
          </p>
          {(data.donationHistory?.length ?? 0) > 0 ? (
            <ul className="mt-4 space-y-2">
              {data.donationHistory!.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] px-3.5 py-2 text-[13.5px]">
                  <span>{formatDate(entry.donationDate, language)}</span>
                  <span className="text-ink-muted">{entry.location ?? "—"}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <section id="notifications">
        <SectionTitle title={tx("নোটিফিকেশন সেটিংস", "Notification settings")} />
        <Card className="p-4">
          <div className="space-y-2">
            {preferences
              ? (Object.keys(preferences) as (keyof Preferences)[])
                  .map((key) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] px-3.5 py-2.5 text-[13.5px]">
                      <span>
                        {key === "newRequestAlerts"
                          ? tx("নতুন রক্তের অনুরোধ", "New blood requests")
                          : key === "requestUpdates"
                            ? tx("অনুরোধের আপডেট", "Request updates")
                            : key === "emergencyAlerts"
                              ? tx("জরুরি বিজ্ঞপ্তি", "Emergency alerts")
                              : key === "donationReminders"
                                ? tx("রক্তদানের অনুস্মারক", "Donation reminders")
                                : tx("সিস্টেম ঘোষণা", "System announcements")}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[color:var(--color-brand)]"
                        checked={Boolean(preferences[key])}
                        onChange={(event) => savePreferences({ ...preferences, [key]: event.target.checked })}
                      />
                    </label>
                  ))
              : null}
          </div>
          {busy === "preferences" ? <p className="mt-2 text-[12.5px] text-ink-muted">{tx("সংরক্ষণ করা হচ্ছে…", "Saving…")}</p> : null}
        </Card>
      </section>

      <section id="security">
        <SectionTitle title={tx("নিরাপত্তা", "Security")} subtitle={tx("পাসওয়ার্ড পরিবর্তন করুন।", "Change your password.")} />
        <Card className="p-4">
          <div className="grid gap-0 sm:grid-cols-3">
            <Field label={tx("বর্তমান পাসওয়ার্ড", "Current password")} htmlFor="currentPassword">
              <input id="currentPassword" type="password" autoComplete="current-password" className="field-control" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
            </Field>
            <Field label={tx("নতুন পাসওয়ার্ড", "New password")} htmlFor="newPassword">
              <input id="newPassword" type="password" autoComplete="new-password" className="field-control" value={passwords.password} onChange={(event) => setPasswords({ ...passwords, password: event.target.value })} />
            </Field>
            <Field label={tx("নিশ্চিত করুন", "Confirm password")} htmlFor="confirmPassword">
              <input id="confirmPassword" type="password" autoComplete="new-password" className="field-control" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} />
            </Field>
          </div>
          <button type="button" className="btn btn-primary" onClick={changePassword} disabled={busy === "password" || !passwords.currentPassword}>
            {busy === "password" ? tx("পরিবর্তন করা হচ্ছে…", "Updating…") : tx("পাসওয়ার্ড পরিবর্তন করুন", "Change password")}
          </button>
        </Card>
      </section>

      <section id="preferences">
        <SectionTitle title={tx("ভাষা", "Language")} />
        <Card className="p-4">
          <div className="flex gap-2">
            {(["bn", "en"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`btn min-h-[40px] px-4 py-2 text-[13px] ${language === value ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setLanguage(value);
                  push(tx("ভাষা পরিবর্তন হয়েছে।", "Language updated."), "success");
                }}
              >
                {value === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section id="privacy">
        <SectionTitle title={tx("গোপনীয়তা ও সহায়তা", "Privacy and support")} />
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 text-[13.5px]">
            <Link href="/about#privacy" className="font-medium text-brand hover:underline">{tx("গোপনীয়তা নীতি", "Privacy policy")}</Link>
            <Link href="/about#terms" className="font-medium text-brand hover:underline">{tx("ব্যবহারের শর্তাবলি", "Terms of service")}</Link>
            <Link href="/about#safety" className="font-medium text-brand hover:underline">{tx("নিরাপত্তা তথ্য", "Safety information")}</Link>
            <Link href="/about" className="font-medium text-brand hover:underline">{tx("পরিচিতি", "About")}</Link>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-muted">
            {tx("সহায়তায় যোগাযোগ", "Support")}: support@manirampurbloodnetwork.example
          </p>
        </Card>
      </section>

      <section id="deletion">
        <SectionTitle title={tx("অ্যাকাউন্ট মুছে ফেলার অনুরোধ", "Account deletion request")} />
        <Card className="p-4">
          <Alert tone="danger">
            {tx(
              "মুছে ফেলার অনুরোধ দিলে আপনার ব্যক্তিগত তথ্য সাথে সাথেই গুম করা হবে এবং সব সেশন বাতিল হবে। নিরাপত্তা ও আইনগত কারণে কিছু নিরীহ রেকর্ড সংরক্ষিত থাকতে পারে।",
              "Requesting deletion anonymises your personal data immediately and revokes every session. Some non-identifying records may be retained for safety and legal reasons.",
            )}
          </Alert>
          <Field label={tx("নিশ্চিত করতে DELETE লিখুন", "Type DELETE to confirm")} htmlFor="confirmDelete">
            <input id="confirmDelete" className="field-control" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
          </Field>
          <button type="button" className="btn btn-secondary" onClick={requestDeletion} disabled={busy === "delete" || deleteConfirmation !== "DELETE"}>
            {busy === "delete" ? tx("অনুরোধ পাঠানো হচ্ছে…", "Submitting…") : tx("অ্যাকাউন্ট মুছে ফেলার অনুরোধ", "Request account deletion")}
          </button>
        </Card>
      </section>
    </div>
  );
}
