"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, Field } from "@/components/ui";
import { useApiError, useLanguage, useToast } from "@/components/providers";
import { apiFetch } from "@/lib/client/api";
import { BLOOD_GROUPS, BLOOD_GROUP_LABELS_BN, URGENCY_LEVELS } from "@/lib/constants";

function NewRequestForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { tx, language } = useLanguage();
  const describeError = useApiError();
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    patientName: "",
    bloodGroup: params.get("group") ?? "O+",
    quantityUnits: "1",
    hospital: "",
    locationText: "",
    requiredDate: "",
    urgency: "URGENT",
    contactName: "",
    contactPhone: "",
    description: "",
  });
  const preferredDonorId = params.get("donor");

  useEffect(() => {
    if (preferredDonorId) return;
    apiFetch<{ profile?: { displayName: string; phoneNumber: string } }>("/api/profile")
      .then((data) => {
        if (data.profile) {
          setForm((current) => ({
            ...current,
            contactName: current.contactName || data.profile!.displayName,
            contactPhone: current.contactPhone || data.profile!.phoneNumber,
          }));
        }
      })
      .catch(() => {});
  }, [preferredDonorId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      body.append("district", "Jashore");
      body.append("upazila", "Manirampur");
      if (preferredDonorId) body.append("preferredDonorId", preferredDonorId);
      if (file) body.append("proofDocument", file);

      await apiFetch("/api/blood-requests", { method: "POST", body });
      push(
        tx(
          "অনুরোধটি জমা হয়েছে।",
          "Your request has been submitted.",
        ),
        "success",
      );
      router.replace("/requests");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {preferredDonorId ? (
        <Alert tone="brand">
          {tx(
            "এই অনুরোধটি আপনার নির্বাচিত রক্তদাতার কাছে সরাসরি যাবে। রক্তদাতা গ্রহণ করলেই আপনি নম্বর দেখতে পাবেন।",
            "This request goes directly to the donor you selected. You can view their number once they accept.",
          )}
        </Alert>
      ) : (
        <Alert tone="warning">
          {tx(
            "সাধারণ অনুরোধ পরিচ্ছন্নতা টিমের যাচাইয়ের পর উপলব্ধ রক্তদাতাদের জানানো হয়। জরুরি হলে সরাসরি কোনো রক্তদাতা নির্বাচন করুন।",
            "General requests are broadcast to available donors after moderator verification. For urgent needs, select a specific donor.",
          )}
        </Alert>
      )}

      <div className="card p-5">
        <Field label={tx("রোগীর নাম", "Patient name")} htmlFor="patientName" required>
          <input id="patientName" className="field-control" required value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} />
        </Field>

        <Field label={tx("রক্তের গ্রুপ", "Blood group")} required>
          <select className="field-control" value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })}>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {language === "bn" ? BLOOD_GROUP_LABELS_BN[group] : group}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-0 sm:grid-cols-2">
          <Field label={tx("কত ব্যাগ", "Units needed")} htmlFor="quantity" required>
            <input id="quantity" inputMode="numeric" className="field-control" value={form.quantityUnits} onChange={(event) => setForm({ ...form, quantityUnits: event.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label={tx("জরুরি মাত্রা", "Urgency")} required>
            <select className="field-control" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })}>
              {URGENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === "ROUTINE" ? tx("সাধারণ", "Routine") : level === "URGENT" ? tx("জরুরি", "Urgent") : tx("অতি জরুরি", "Critical")}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={tx("হাসপাতাল / মেডিকেল সেন্টার", "Hospital / medical facility")} htmlFor="hospital" required>
          <input id="hospital" className="field-control" required value={form.hospital} onChange={(event) => setForm({ ...form, hospital: event.target.value })} />
        </Field>

        <Field label={tx("অবস্থান", "Location")} htmlFor="location" required hint={tx("যেমন: মণিরামপুর বাজার, পৌরসভা", "e.g. Manirampur Bazar, Municipality")}>
          <input id="location" className="field-control" required value={form.locationText} onChange={(event) => setForm({ ...form, locationText: event.target.value })} />
        </Field>

        <Field label={tx("প্রয়োজনের তারিখ", "Required date")} htmlFor="requiredDate" required>
          <input id="requiredDate" type="date" className="field-control" min={new Date().toISOString().slice(0, 10)} required value={form.requiredDate} onChange={(event) => setForm({ ...form, requiredDate: event.target.value })} />
        </Field>

        <div className="grid gap-0 sm:grid-cols-2">
          <Field label={tx("যোগাযোগের ব্যক্তি", "Contact person")} htmlFor="contactName" required>
            <input id="contactName" className="field-control" required value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
          </Field>
          <Field label={tx("যোগাযোগের নম্বর", "Contact number")} htmlFor="contactPhone" required>
            <input id="contactPhone" inputMode="numeric" maxLength={11} className="field-control" required value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value.replace(/\D/g, "") })} />
          </Field>
        </div>

        <Field label={tx("বিস্তারিত (ঐচ্ছিক)", "Details (optional)")} htmlFor="description">
          <textarea id="description" className="field-control min-h-[96px]" maxLength={1200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>

        <Field
          label={tx("সহায়ক ডকুমেন্ট (ঐচ্ছিক)", "Supporting document (optional)")}
          htmlFor="proof"
          hint={tx("PDF, JPG অথবা PNG — সর্বোচ্চ ৪ MB। ডকুমেন্ট সম্পূর্ণ গোপন থাকে।", "PDF, JPG or PNG — maximum 4 MB. Documents stay completely private.")}
        >
          <input
            id="proof"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="field-control"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
      </div>

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={submitting}>
        {submitting ? tx("অনুরোধ পাঠানো হচ্ছে…", "Sending request…") : tx("অনুরোধ জমা দিন", "Submit request")}
      </button>
    </form>
  );
}

export default function NewRequestPage() {
  const { tx } = useLanguage();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-semibold text-ink">{tx("রক্তের অনুরোধ করুন", "Request blood")}</h1>
        <p className="text-[13px] text-ink-muted">
          {tx(
            "সঠিক তথ্য দিলে রক্তদাতা দ্রুত সিদ্ধান্ত নিতে পারেন।",
            "Accurate details help donors decide quickly.",
          )}
        </p>
      </div>
      <Suspense fallback={null}>
        <NewRequestForm />
      </Suspense>
    </div>
  );
}
