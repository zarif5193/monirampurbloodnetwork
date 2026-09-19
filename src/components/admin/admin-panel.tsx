"use client";

import { useCallback, useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { Alert, Badge, Card, Field, SectionTitle, SkeletonList, StatTile } from "@/components/ui";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { REPORT_REASON_LABELS, type ReportReason, type UserRole } from "@/lib/constants";

type Overview = {
  donors: { total: number; verified: number; available: number };
  requests: { total: number; pending: number; accepted: number; completed: number };
  reports: { total: number; pending: number };
  users: { total: number; verifiedEmails: number; suspended: number };
  pendingReports: { id: string; reason: string; targetType: string; priority: string; createdAt: string }[];
  pendingRequests: { id: string; patientName: string; bloodGroup: string; hospital: string; urgency: string; createdAt: string }[];
};

type AdminDonor = {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  bloodGroup: string;
  unionName: string;
  verificationStatus: string;
  availabilityStatus: string;
};

type AdminRequest = {
  id: string;
  patientName: string;
  bloodGroup: string;
  hospital: string;
  status: string;
  urgency: string;
  requiredDate: string;
  proofDocumentPath: string | null;
};

type AdminReport = {
  id: string;
  reason: string;
  targetType: string;
  targetId: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorEmail: string | null;
  createdAt: string;
};

const TABS = [
  { id: "overview", label: "ড্যাশবোর্ড" },
  { id: "requests", label: "রক্তের অনুরোধ" },
  { id: "donors", label: "রক্তদাতা" },
  { id: "reports", label: "রিপোর্ট" },
  { id: "emergency", label: "জরুরি সেবা" },
  { id: "rules", label: "যোগ্যতার নিয়ম" },
  { id: "audit", label: "অডিট লগ" },
] as const;

export function AdminPanel({ role }: { role: UserRole }) {
  const { tx } = useLanguage();
  const { push } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [donors, setDonors] = useState<AdminDonor[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, donorList, requestList, reportList, auditList] = await Promise.all([
        apiFetch<Overview>("/api/admin/overview"),
        apiFetch<{ items: AdminDonor[] }>("/api/admin/donors"),
        apiFetch<{ items: AdminRequest[] }>("/api/admin/requests"),
        apiFetch<{ items: AdminReport[] }>("/api/admin/reports"),
        apiFetch<{ items: AuditEntry[] }>("/api/admin/audit-logs"),
      ]);
      setOverview(summary);
      setDonors(donorList.items);
      setRequests(requestList.items);
      setReports(reportList.items);
      setAudit(auditList.items);
    } catch {
      push(tx("ডেটা লোড করা যায়নি।", "Could not load data."), "danger");
    } finally {
      setLoading(false);
    }
  }, [push, tx]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setRequestStatus(id: string, status: string) {
    try {
      const result = await apiFetch<{ notifiedDonors: number }>(`/api/admin/requests/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      push(
        status === "VERIFIED"
          ? `${tx("যাচাই সম্পন্ন —", "Verified —")} ${result.notifiedDonors} ${tx("রক্তদাতাকে জানানো হয়েছে।", "donors notified.")}`
          : tx("অনুরোধের অবস্থা হালনাগাদ হয়েছে।", "Request status updated."),
        "success",
      );
      await load();
    } catch {
      push(tx("হালনাগাদ করা যায়নি।", "Update failed."), "danger");
    }
  }

  async function setDonorVerification(id: string, verificationStatus: string) {
    try {
      await apiFetch(`/api/admin/donors/${id}/verification`, {
        method: "POST",
        body: JSON.stringify({ verificationStatus }),
      });
      push(tx("রক্তদাতার অবস্থা হালনাগাদ হয়েছে।", "Donor status updated."), "success");
      await load();
    } catch {
      push(tx("হালনাগাদ করা যায়নি।", "Update failed."), "danger");
    }
  }

  async function moderateReport(id: string, status: string) {
    try {
      await apiFetch("/api/admin/reports", {
        method: "POST",
        body: JSON.stringify({ id, status }),
      });
      push(tx("রিপোর্ট হালনাগাদ হয়েছে।", "Report updated."), "success");
      await load();
    } catch {
      push(tx("হালনাগাদ করা যায়নি।", "Update failed."), "danger");
    }
  }

  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)]">
      <header className="border-b border-[color:var(--color-border)] bg-white">
        <div className="app-shell flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-[14px] font-semibold text-ink">
              {tx("প্রশাসক প্যানেল", "Admin panel")} · {tx("মণিরামপুর ব্লাড নেটওয়ার্ক", "Manirampur Blood Network")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="brand">{role}</Badge>
            <a href="/home" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]">
              {tx("অ্যাপ", "App")}
            </a>
          </div>
        </div>
      </header>

      <main className="app-shell py-6">
        <nav className="mb-5 flex flex-wrap gap-2" aria-label={tx("প্রশাসক বিভাগ", "Admin sections")}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn min-h-[36px] px-3 py-1.5 text-[12.5px] ${tab === item.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            {tab === "overview" && overview ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatTile label={tx("মোট রক্তদাতা", "Donors")} value={String(overview.donors.total)} hint={`${overview.donors.verified} ${tx("যাচাইকৃত", "verified")}`} />
                  <StatTile label={tx("মোট অনুরোধ", "Requests")} value={String(overview.requests.total)} hint={`${overview.requests.pending} ${tx("যাচাই অপেক্ষমাণ", "pending")}`} />
                  <StatTile label={tx("রিপোর্ট", "Reports")} value={String(overview.reports.total)} hint={`${overview.reports.pending} ${tx("অমীমাংসিত", "open")}`} />
                  <StatTile label={tx("ব্যবহারকারী", "Users")} value={String(overview.users.total)} hint={`${overview.users.verifiedEmails} ${tx("ইমেইল যাচাইকৃত", "verified")}`} />
                </div>

                <div>
                  <SectionTitle title={tx("যাচাই অপেক্ষমাণ অনুরোধ", "Requests awaiting verification")} />
                  {overview.pendingRequests.length === 0 ? (
                    <Card className="p-4 text-[13.5px] text-ink-muted">{tx("এই মুহূর্তে কোনো অনুরোধ যাচাইয়ের অপেক্ষায় নেই।", "No requests are waiting for verification.")}</Card>
                  ) : (
                    <ul className="space-y-2">
                      {overview.pendingRequests.map((request) => (
                        <Card as="li" key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="text-[14.5px] font-semibold text-ink">
                              {request.patientName} · {request.bloodGroup}
                            </p>
                            <p className="text-[12.5px] text-ink-muted">
                              {request.hospital} · {formatDate(request.createdAt, "bn")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" className="btn btn-primary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setRequestStatus(request.id, "VERIFIED")}>
                              {tx("যাচাই ও সম্প্রচার", "Verify & notify donors")}
                            </button>
                            <button type="button" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setRequestStatus(request.id, "REJECTED")}>
                              {tx("প্রত্যাখ্যান", "Reject")}
                            </button>
                          </div>
                        </Card>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <SectionTitle title={tx("অমীমাংসিত রিপোর্ট", "Open reports")} />
                  {overview.pendingReports.length === 0 ? (
                    <Card className="p-4 text-[13.5px] text-ink-muted">{tx("কোনো রিপোর্ট অমীমাংসিত নেই।", "There are no open reports.")}</Card>
                  ) : (
                    <ul className="space-y-2">
                      {overview.pendingReports.map((report) => (
                        <Card as="li" key={report.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="text-[14px] font-medium text-ink">{REPORT_REASON_LABELS[report.reason as ReportReason]?.bn ?? report.reason}</p>
                            <p className="text-[12.5px] text-ink-muted">
                              {report.targetType} · {report.priority} · {formatDate(report.createdAt, "bn")}
                            </p>
                          </div>
                          <button type="button" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => moderateReport(report.id, "UNDER_REVIEW")}>
                            {tx("পর্যালোচনায় নিন", "Mark under review")}
                          </button>
                        </Card>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "requests" ? (
              <ul className="space-y-2">
                {requests.map((request) => (
                  <Card as="li" key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-ink">
                        {request.patientName} · {request.bloodGroup} · {request.hospital}
                      </p>
                      <p className="text-[12.5px] text-ink-muted">
                        {request.status} · {formatDate(request.requiredDate, "bn")}
                        {request.proofDocumentPath ? (
                          <>
                            {" · "}
                            <a href={`/api/documents/${request.id}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                              {tx("সহায়ক ডকুমেন্ট", "Document")}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setRequestStatus(request.id, "VERIFIED")}>
                        {tx("যাচাই", "Verify")}
                      </button>
                      <button type="button" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setRequestStatus(request.id, "REJECTED")}>
                        {tx("প্রত্যাখ্যান", "Reject")}
                      </button>
                      <button type="button" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setRequestStatus(request.id, "COMPLETED")}>
                        {tx("সম্পন্ন", "Complete")}
                      </button>
                    </div>
                  </Card>
                ))}
              </ul>
            ) : null}

            {tab === "donors" ? (
              <ul className="space-y-2">
                {donors.map((donor) => (
                  <Card as="li" key={donor.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-ink">
                        {donor.displayName} · {donor.bloodGroup}
                      </p>
                      <p className="text-[12.5px] text-ink-muted">
                        {donor.email} · {donor.phoneNumber} · {donor.unionName} · {donor.verificationStatus}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setDonorVerification(donor.id, "VERIFIED")}>
                        {tx("যাচাইকৃত করুন", "Verify")}
                      </button>
                      <button type="button" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => setDonorVerification(donor.id, "SUSPENDED")}>
                        {tx("স্থগিত", "Suspend")}
                      </button>
                    </div>
                  </Card>
                ))}
              </ul>
            ) : null}

            {tab === "reports" ? (
              <ul className="space-y-2">
                {reports.map((report) => (
                  <Card as="li" key={report.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold text-ink">{REPORT_REASON_LABELS[report.reason as ReportReason]?.bn ?? report.reason}</p>
                        <p className="text-[12.5px] text-ink-muted">
                          {report.targetType} · {report.targetId} · {report.priority} · {report.status}
                        </p>
                        {report.description ? <p className="mt-1 text-[13px] text-ink-soft">{report.description}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["UNDER_REVIEW", "RESOLVED", "DISMISSED"].map((status) => (
                          <button key={status} type="button" className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]" onClick={() => moderateReport(report.id, status)}>
                            {status === "UNDER_REVIEW" ? tx("পর্যালোচনা", "Review") : status === "RESOLVED" ? tx("সমাধান", "Resolve") : tx("বাতিল", "Dismiss")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </ul>
            ) : null}

            {tab === "emergency" ? <EmergencyManager /> : null}
            {tab === "rules" ? <RulesManager /> : null}

            {tab === "audit" ? (
              <div className="space-y-3">
                <Alert tone="warning">
                  {tx("অডিট লগ শুধুমাত্র অনুমোদিত প্রশাসক দেখতে পান। এটি পরিবর্তন করা যায় না।", "Audit logs are visible to authorised administrators only and cannot be modified.")}
                </Alert>
                <ul className="space-y-2">
                  {audit.map((entry) => (
                    <Card as="li" key={entry.id} className="p-3.5">
                      <p className="text-[13.5px] font-medium text-ink">
                        {entry.action} · {entry.resourceType}
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        {entry.actorEmail ?? "system"} · {formatDate(entry.createdAt, "bn")} {entry.resourceId ? `· ${entry.resourceId}` : ""}
                      </p>
                    </Card>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function EmergencyManager() {
  const { tx } = useLanguage();
  const { push } = useToast();
  const [items, setItems] = useState<
    { id: string; nameBn: string; nameEn: string; phone: string; category: string; sourceUrl: string | null; active: boolean; lastVerifiedAt: string | null }[]
  >([]);
  const [form, setForm] = useState({
    nameBn: "",
    nameEn: "",
    organization: "",
    phone: "",
    category: "POLICE",
    sourceUrl: "",
    active: false,
  });

  const load = useCallback(async () => {
    const data = await apiFetch<{ items: typeof items }>("/api/admin/emergency-contacts");
    setItems(data.items);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  return (
    <div className="space-y-4">
      <Alert tone="warning">
        {tx(
          "শুধুমাত্র সরকারি/দপ্তরিক উৎসের লিংকসহ নম্বর যোগ করুন। যাচাই ছাড়া নম্বর প্রকাশ করা যাবে না।",
          "Only add numbers with an official source URL. Unverified numbers must not be published.",
        )}
      </Alert>

      <Card className="p-4">
        <SectionTitle title={tx("নতুন জরুরি সেবা যোগ করুন", "Add an emergency contact")} />
        <div className="grid gap-0 sm:grid-cols-2">
          <Field label={tx("নাম (বাংলা)", "Name (Bangla)")}>
            <input className="field-control" value={form.nameBn} onChange={(event) => setForm({ ...form, nameBn: event.target.value })} />
          </Field>
          <Field label={tx("নাম (ইংরেজি)", "Name (English)")}>
            <input className="field-control" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} />
          </Field>
          <Field label={tx("প্রতিষ্ঠান", "Organization")}>
            <input className="field-control" value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} />
          </Field>
          <Field label={tx("ফোন", "Phone")}>
            <input className="field-control" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label={tx("ক্যাটাগরি", "Category")}>
            <select className="field-control" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {["NATIONAL_EMERGENCY", "POLICE", "FIRE_SERVICE", "AMBULANCE_MEDICAL", "HEALTH_COMPLEX", "UPAZILA_ADMINISTRATION", "DISASTER", "OTHER_GOVERNMENT"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx("উৎসের লিংক", "Source URL")}>
            <input className="field-control" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
          </Field>
        </div>
        <label className="mb-3 flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" className="h-4 w-4 accent-[color:var(--color-brand)]" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          {tx("সর্বজনীনভাবে প্রকাশ করুন (উৎস যাচাইয়ের পরে)", "Publish publicly (after verifying the source)")}
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            try {
              await apiFetch("/api/admin/emergency-contacts", { method: "POST", body: JSON.stringify({ ...form, organization: form.organization || null, sourceUrl: form.sourceUrl || null }) });
              push(tx("যোগ করা হয়েছে।", "Contact added."), "success");
              setForm({ ...form, nameBn: "", nameEn: "", phone: "", organization: "", sourceUrl: "", active: false });
              await load();
            } catch {
              push(tx("যোগ করা যায়নি।", "Could not add."), "danger");
            }
          }}
        >
          {tx("সংরক্ষণ করুন", "Save contact")}
        </button>
      </Card>

      <ul className="space-y-2">
        {items.map((contact) => (
          <Card as="li" key={contact.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">
                {contact.nameBn} · {contact.phone}
              </p>
              <p className="text-[12px] text-ink-muted">
                {contact.category} · {contact.active ? tx("প্রকাশিত", "Published") : tx("অপ্রকাশিত", "Unpublished")}
                {contact.sourceUrl ? ` · ${contact.sourceUrl}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]"
                onClick={async () => {
                  await apiFetch("/api/admin/emergency-contacts", {
                    method: "PATCH",
                    body: JSON.stringify({ id: contact.id, active: !contact.active, lastVerifiedAt: new Date().toISOString().slice(0, 10) }),
                  });
                  await load();
                }}
              >
                {contact.active ? tx("প্রকাশ বন্ধ করুন", "Unpublish") : tx("প্রকাশ করুন", "Publish")}
              </button>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}

function RulesManager() {
  const { tx } = useLanguage();
  const { push } = useToast();
  const [items, setItems] = useState<
    { id: string; ruleVersion: string; minimumAge: number; minimumWeightKg: string; maleDonationIntervalDays: number; femaleDonationIntervalDays: number; active: boolean; source: string }[]
  >([]);
  const [form, setForm] = useState({
    minimumAge: "18",
    maximumAge: "60",
    minimumWeightKg: "50",
    defaultDonationIntervalDays: "120",
    maleDonationIntervalDays: "120",
    femaleDonationIntervalDays: "180",
    ruleVersion: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    source: "",
    active: false,
  });

  const load = useCallback(async () => {
    const data = await apiFetch<{ items: typeof items }>("/api/admin/eligibility-rules");
    setItems(data.items);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  return (
    <div className="space-y-4">
      <Alert tone="warning">
        {tx(
          "এই নিয়মাবলি চিকিৎসা পরামর্শ নয়। চিকিৎসাগত পর্যালোচনা ছাড়া চালু করবেন না।",
          "These rules are not medical advice. Do not activate without clinical review.",
        )}
      </Alert>

      <Card className="p-4">
        <SectionTitle title={tx("নতুন নিয়মের সংস্করণ", "New ruleset version")} />
        <div className="grid gap-0 sm:grid-cols-3">
          {(
            [
              ["minimumAge", "ন্যূনতম বয়স"],
              ["maximumAge", "সর্বোচ্চ বয়স"],
              ["minimumWeightKg", "ন্যূনতম ওজন (কেজি)"],
              ["defaultDonationIntervalDays", "সাধারণ বিরতি (দিন)"],
              ["maleDonationIntervalDays", "পুরুষ বিরতি (দিন)"],
              ["femaleDonationIntervalDays", "মহিলা বিরতি (দিন)"],
              ["ruleVersion", "নিয়মের সংস্করণ"],
              ["effectiveDate", "কার্যকর তারিখ"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type={key === "effectiveDate" ? "date" : "text"}
                className="field-control"
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </Field>
          ))}
        </div>
        <Field label={tx("উৎস / পর্যালোচনা", "Source / review note")}>
          <input className="field-control" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
        </Field>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            try {
              await apiFetch("/api/admin/eligibility-rules", {
                method: "POST",
                body: JSON.stringify({
                  ...form,
                  minimumAge: Number(form.minimumAge),
                  maximumAge: form.maximumAge ? Number(form.maximumAge) : null,
                  minimumWeightKg: Number(form.minimumWeightKg),
                  defaultDonationIntervalDays: Number(form.defaultDonationIntervalDays),
                  maleDonationIntervalDays: Number(form.maleDonationIntervalDays),
                  femaleDonationIntervalDays: Number(form.femaleDonationIntervalDays),
                }),
              });
              push(tx("নিয়ম সংরক্ষিত হয়েছে।", "Ruleset saved."), "success");
              await load();
            } catch {
              push(tx("সংরক্ষণ করা যায়নি।", "Could not save."), "danger");
            }
          }}
        >
          {tx("সংরক্ষণ করুন", "Save ruleset")}
        </button>
      </Card>

      <ul className="space-y-2">
        {items.map((rule) => (
          <Card as="li" key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">{rule.ruleVersion}</p>
              <p className="text-[12.5px] text-ink-muted">
                {rule.minimumAge}+ · {Number(rule.minimumWeightKg)} kg · {rule.maleDonationIntervalDays}/{rule.femaleDonationIntervalDays} {tx("দিন", "days")} ·{" "}
                {rule.active ? tx("সক্রিয়", "active") : tx("নিষ্ক্রিয়", "inactive")}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]"
              onClick={async () => {
                await apiFetch("/api/admin/eligibility-rules", {
                  method: "POST",
                  body: JSON.stringify({
                    minimumAge: rule.minimumAge,
                    minimumWeightKg: Number(rule.minimumWeightKg),
                    defaultDonationIntervalDays: 120,
                    maleDonationIntervalDays: rule.maleDonationIntervalDays,
                    femaleDonationIntervalDays: rule.femaleDonationIntervalDays,
                    ruleVersion: rule.ruleVersion,
                    effectiveDate: new Date().toISOString().slice(0, 10),
                    source: rule.source,
                    active: true,
                  }),
                });
                push(tx("সক্রিয় নিয়ম পরিবর্তন হয়েছে।", "Active ruleset changed."), "success");
                await load();
              }}
            >
              {tx("সক্রিয় করুন", "Activate")}
            </button>
          </Card>
        ))}
      </ul>
    </div>
  );
}
