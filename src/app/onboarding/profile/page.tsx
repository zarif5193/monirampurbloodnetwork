"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Field, ProgressBar } from "@/components/ui";
import { LogoMark } from "@/components/brand/Logo";
import { useApiError, useLanguage, useSession, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";
import { AVAILABILITY_OPTIONS, BLOOD_GROUPS, BLOOD_GROUP_LABELS_BN, GENDERS } from "@/lib/constants";

type Locations = { unionName: string; unionNameBn: string; upazila: string; upazilaBn: string; district: string; districtBn: string }[];

const TOTAL_STEPS = 4;

export default function CompleteProfilePage() {
  const router = useRouter();
  const { tx, language } = useLanguage();
  const describeError = useApiError();
  const { push } = useToast();
  const { session, loading } = useSession();

  const [step, setStep] = useState(1);
  const [unions, setUnions] = useState<Locations>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "MALE",
    bloodGroup: "O+",
    weightKg: "",
    heightCm: "",
    district: "Jashore",
    upazila: "Manirampur",
    unionName: "",
    area: "",
    availabilityStatus: "AVAILABLE",
    lastDonationDate: "",
    donationCount: "",
    acceptedDonorTerms: false,
  });

  useEffect(() => {
    if (loading) return;
    if (!session?.authenticated) {
      router.replace("/login");
      return;
    }
    if (!session.user?.emailVerified) {
      router.replace("/verify-email");
      return;
    }
    if (session.profileComplete) router.replace("/home");
  }, [loading, session, router]);

  useEffect(() => {
    apiFetch<{ items: Locations }>("/api/locations?district=Jashore&upazila=Manirampur")
      .then((data) => setUnions(data.items))
      .catch(() => setUnions([]));
  }, []);

  const unionLabel = useMemo(
    () => new Map(unions.map((item) => [item.unionName, language === "bn" ? item.unionNameBn : item.unionName])),
    [unions, language],
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (form.displayName.trim().length < 3) return setError(tx("আপনার পুরো নাম লিখুন।", "Please enter your full name."));
      if (!/^01[3-9]\d{8}$/.test(form.phoneNumber))
        return setError(tx("সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)।", "Enter a valid mobile number, e.g. 01712345678."));
      if (!form.dateOfBirth) return setError(tx("জন্ম তারিখ নির্বাচন করুন।", "Please select your date of birth."));
    }
    if (step === 2) {
      if (!form.bloodGroup) return setError(tx("রক্তের গ্রুপ নির্বাচন করুন।", "Please select your blood group."));
      const weight = Number(form.weightKg);
      if (!Number.isFinite(weight) || weight < 20 || weight > 300)
        return setError(tx("সঠিক ওজন (কেজি) লিখুন।", "Enter a valid weight in kilograms."));
    }
    if (step === 3 && !form.unionName) {
      return setError(tx("আপনার ইউনিয়ন/এলাকা নির্বাচন করুন।", "Please select your union/area."));
    }
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  async function submit() {
    if (!form.acceptedDonorTerms) {
      setError(tx("রক্তদাতা অংশগ্রহণের শর্তাবলি মেনে নিতে হবে।", "You must accept the donor participation terms."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          phoneNumber: form.phoneNumber,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          weightKg: Number(form.weightKg),
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          district: form.district,
          upazila: form.upazila,
          unionName: form.unionName,
          area: form.area.trim() || null,
          availabilityStatus: form.availabilityStatus,
          lastDonationDate: form.lastDonationDate || null,
          donationCount: form.donationCount ? Number(form.donationCount) : 0,
          acceptedDonorTerms: true,
        }),
      });
      push(tx("আপনার প্রোফাইল সম্পূর্ণ হয়েছে।", "Your profile is complete."), "success");
      router.replace("/home");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)] py-8">
      <div className="mx-auto w-full max-w-xl px-5">
        <div className="mb-5 flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <h1 className="text-[18px] font-semibold text-ink">{tx("আপনার প্রোফাইল সম্পূর্ণ করুন", "Complete your donor profile")}</h1>
            <p className="text-[12.5px] text-ink-muted">
              {tx(
                "প্রোফাইল সম্পূর্ণ না হওয়া পর্যন্ত হোম পৃষ্ঠা ব্যবহার করা যাবে না।",
                "The home screen stays unavailable until your profile is complete.",
              )}
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-5">
            <ProgressBar step={step} total={TOTAL_STEPS} />
          </div>

          {error ? (
            <div className="mb-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <Field label={tx("ডিসপ্লে নাম", "Display name")} htmlFor="displayName" required hint={tx("এই নাম প্রকাশ্যে দেখা যাবে।", "This name is shown publicly.")}>
                <input id="displayName" className="field-control" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} />
              </Field>
              <Field
                label={tx("মোবাইল নম্বর", "Mobile number")}
                htmlFor="phone"
                required
                hint={tx("গোপন থাকবে — কেবল অনুরোধ গ্রহণ করলে অনুরোধকারী দেখতে পাবেন।", "Remains private — visible only to a requester after you accept their request.")}
              >
                <input id="phone" inputMode="numeric" className="field-control" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value.replace(/\D/g, ""))} maxLength={11} />
              </Field>
              <Field label={tx("জন্ম তারিখ", "Date of birth")} htmlFor="dob" required>
                <input id="dob" type="date" className="field-control" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
              </Field>
              <Field label={tx("লিঙ্গ", "Gender")} htmlFor="gender" required>
                <select id="gender" className="field-control" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                  {GENDERS.map((value) => (
                    <option key={value} value={value}>
                      {value === "MALE" ? "পুরুষ" : value === "FEMALE" ? "মহিলা" : value === "OTHER" ? "অন্যান্য" : "বলতে চাই না"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <Field label={tx("রক্তের গ্রুপ", "Blood group")} required>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {BLOOD_GROUPS.map((group) => (
                    <button
                      type="button"
                      key={group}
                      onClick={() => update("bloodGroup", group)}
                      className={`rounded-xl border px-2 py-2.5 text-[14px] font-semibold transition-colors ${
                        form.bloodGroup === group
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-[color:var(--color-border)] bg-white text-ink-soft"
                      }`}
                      aria-pressed={form.bloodGroup === group}
                    >
                      {language === "bn" ? BLOOD_GROUP_LABELS_BN[group] : group}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={tx("ওজন (কেজি)", "Weight (kg)")} htmlFor="weight" required hint={tx("ন্যূনতম ৫০ কেজি হলে সাধারণত রক্তদানের মানদণ্ড পূরণ হয়।", "The common minimum weight is 50 kg; final checks happen at the collection centre.")}>
                <input id="weight" inputMode="decimal" className="field-control" value={form.weightKg} onChange={(event) => update("weightKg", event.target.value)} />
              </Field>
              <Field label={tx("উচ্চতা (সেমি) — ঐচ্ছিক", "Height (cm) — optional")} htmlFor="height">
                <input id="height" inputMode="numeric" className="field-control" value={form.heightCm} onChange={(event) => update("heightCm", event.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <Field label={tx("জেলা", "District")} htmlFor="district">
                <input id="district" className="field-control" value="যশোর / Jashore" readOnly />
              </Field>
              <Field label={tx("উপজেলা", "Upazila")} htmlFor="upazila">
                <input id="upazila" className="field-control" value="মণিরামপুর / Manirampur" readOnly />
              </Field>
              <Field label={tx("ইউনিয়ন / এলাকা", "Union / Area")} htmlFor="union" required hint={tx("তালিকাটি প্রশাসক কর্তৃক পরিচালিত, তাই বানান সবসময় সঠিক থাকে।", "This list is administrator managed, so spelling stays consistent.")}>
                <select id="union" className="field-control" value={form.unionName} onChange={(event) => update("unionName", event.target.value)}>
                  <option value="">{tx("নির্বাচন করুন", "Select one")}</option>
                  {unions.map((item) => (
                    <option key={item.unionName} value={item.unionName}>
                      {unionLabel.get(item.unionName) ?? item.unionName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tx("গ্রাম / মহল্লা — ঐচ্ছিক", "Village / locality — optional")} htmlFor="area" hint={tx("সাধারণ এলাকা ছাড়া ঠিকানা কখনও প্রকাশ করা হয় না।", "Only a general area is ever shown, never a full address.")}>
                <input id="area" className="field-control" value={form.area} onChange={(event) => update("area", event.target.value)} maxLength={160} />
              </Field>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <Field label={tx("সর্বশেষ রক্তদানের তারিখ", "Last donation date")} htmlFor="lastDonation" hint={tx("জানা না থাকলে খালি রাখুন।", "Leave empty if you do not know.")}>
                <input id="lastDonation" type="date" className="field-control" max={new Date().toISOString().slice(0, 10)} value={form.lastDonationDate} onChange={(event) => update("lastDonationDate", event.target.value)} />
              </Field>
              <Field label={tx("আগে কতবার রক্ত দিয়েছেন", "Number of previous donations")} htmlFor="donationCount">
                <input id="donationCount" inputMode="numeric" className="field-control" value={form.donationCount} onChange={(event) => update("donationCount", event.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label={tx("বর্তমান অবস্থা", "Current availability")} required>
                <div className="space-y-2">
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[color:var(--color-border)] px-3 py-2.5 text-[13.5px]">
                      <input
                        type="radio"
                        name="availability"
                        className="h-4 w-4 accent-[color:var(--color-brand)]"
                        checked={form.availabilityStatus === option}
                        onChange={() => update("availabilityStatus", option)}
                      />
                      {option === "AVAILABLE"
                        ? tx("রক্তদানের জন্য উপলব্ধ", "Available to donate")
                        : option === "TEMPORARILY_UNAVAILABLE"
                          ? tx("সাময়িকভাবে অনুপলব্ধ", "Temporarily unavailable")
                          : tx("এই মুহূর্তে অনুপলব্ধ", "Not available")}
                    </label>
                  ))}
                </div>
              </Field>
              <Alert tone="warning">
                {tx(
                  "প্রাথমিক তথ্য অনুযায়ী সম্ভাব্যভাবে উপযুক্ত হতে পারেন; চূড়ান্ত সিদ্ধান্ত সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।",
                  "Based on the available information, the donor may potentially meet preliminary criteria; final eligibility must be determined by the responsible medical professional/blood collection service.",
                )}
              </Alert>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[color:var(--color-brand)]"
                  checked={form.acceptedDonorTerms}
                  onChange={(event) => update("acceptedDonorTerms", event.target.checked)}
                />
                <span>
                  {tx(
                    "আমি রক্তদাতা অংশগ্রহণের শর্তাবলি মেনে নিচ্ছি এবং বুঝছি যে আমার ফোন নম্বর কেবল আমার গ্রহণ করা অনুরোধের অনুরোধকারী দেখতে পাবেন।",
                    "I accept the donor participation terms and understand my phone number is visible only to requesters whose requests I accept.",
                  )}
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || submitting}>
              {tx("পেছনে", "Back")}
            </button>
            {step < TOTAL_STEPS ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                {tx("পরবর্তী ধাপ", "Continue")}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? tx("সংরক্ষণ করা হচ্ছে…", "Saving…") : tx("প্রোফাইল সম্পূর্ণ করুন", "Finish profile")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
