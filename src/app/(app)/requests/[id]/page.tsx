"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Card, SkeletonList } from "@/components/ui";
import { ReportButton } from "@/components/report-dialog";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { BLOOD_GROUP_LABELS_BN } from "@/lib/constants";

type RequestDetail = {
  request: {
    id: string;
    patientName: string;
    bloodGroup: string;
    quantityUnits: number;
    hospital: string;
    locationText: string;
    requiredDate: string;
    urgency: string;
    status: string;
    description: string | null;
    contactName: string;
    contactPhone: string;
    proofDocumentName: string | null;
    createdAt: string;
  };
  viewer: { isRequester: boolean; isStaff: boolean };
  donorResponse: { status: string; contactPermissionGranted: boolean } | null;
  acceptedDonors: { donorId: string; displayName: string; acceptedAt: string | null }[];
};

type ContactResponse = {
  displayName: string;
  phoneNumber: string;
  bloodGroup: string;
  grantedAt: string | null;
  disclaimerBn: string;
  disclaimerEn: string;
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const { tx, language } = useLanguage();
  const { push } = useToast();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ContactResponse | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<RequestDetail>(`/api/blood-requests/${params.id}`));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revealNumber() {
    setContactLoading(true);
    setContactError(null);
    try {
      setContact(await apiFetch<ContactResponse>(`/api/blood-requests/${params.id}/contact`));
    } catch {
      setContactError(
        tx(
          "এই মুহূর্তে নম্বরটি দেখা সম্ভব নয়। রক্তদাতা অনুরোধ গ্রহণ করলেই নম্বর দেখা যাবে।",
          "The number is not available yet. It appears once the donor accepts the request.",
        ),
      );
    } finally {
      setContactLoading(false);
    }
  }

  async function cancelRequest() {
    setCancelling(true);
    try {
      await apiFetch(`/api/blood-requests/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      push(tx("অনুরোধটি বাতিল করা হয়েছে।", "The request has been cancelled."), "success");
      await load();
    } catch {
      push(tx("বাতিল করা যায়নি।", "Could not cancel the request."), "danger");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <SkeletonList rows={2} />;
  if (!data) {
    return (
      <Alert tone="danger">
        {tx("অনুরোধটি দেখার অনুমতি আপনার নেই অথবা এটি আর নেই।", "You cannot view this request, or it no longer exists.")}
      </Alert>
    );
  }

  const request = data.request;

  return (
    <div className="space-y-5">
      <Link href="/requests" className="text-[13px] font-medium text-ink-soft hover:underline">
        ← {tx("আমার অনুরোধ", "My requests")}
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold text-ink">{request.patientName}</h1>
            <p className="mt-1 text-[13.5px] text-ink-muted">
              {language === "bn" ? BLOOD_GROUP_LABELS_BN[request.bloodGroup as never] : request.bloodGroup} ·{" "}
              {request.quantityUnits} {tx("ব্যাগ", "bag(s)")} · {request.hospital}
            </p>
          </div>
          <Badge tone={request.status === "ACCEPTED" || request.status === "COMPLETED" ? "success" : request.status === "REJECTED" ? "danger" : "brand"}>
            {request.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: tx("অবস্থান", "Location"), value: request.locationText },
            { label: tx("প্রয়োজনের তারিখ", "Required by"), value: formatDate(request.requiredDate, language) },
            { label: tx("জরুরি মাত্রা", "Urgency"), value: request.urgency },
            { label: tx("জমার তারিখ", "Submitted"), value: formatDate(request.createdAt, language) },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-[color:var(--color-border)] px-3.5 py-2.5">
              <dt className="text-[12px] text-ink-muted">{row.label}</dt>
              <dd className="text-[14px] font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        {request.description ? <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{request.description}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <ReportButton targetType="BLOOD_REQUEST" targetId={request.id} variant="secondary" />
          {data.viewer.isRequester && ["PENDING_REVIEW", "VERIFIED", "SEARCHING_FOR_DONOR", "DONOR_CONTACTED", "ACCEPTED"].includes(request.status) ? (
            <button type="button" className="btn btn-secondary" onClick={cancelRequest} disabled={cancelling}>
              {cancelling ? tx("বাতিল হচ্ছে…", "Cancelling…") : tx("অনুরোধ বাতিল করুন", "Cancel request")}
            </button>
          ) : null}
        </div>
      </Card>

      {data.viewer.isRequester ? (
        <Card className="p-5">
          <h2 className="text-[16px] font-semibold text-ink">{tx("রক্তদাতার যোগাযোগ তথ্য", "Donor contact information")}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            {tx(
              "রক্তদাতা অনুরোধ গ্রহণ করলেই কেবল নম্বর দেখা যাবে — এর আগে কোনো নম্বর সার্ভারের বাইরে যায় না।",
              "The number appears only after the donor accepts; before that, no number ever leaves the server.",
            )}
          </p>

          {data.acceptedDonors.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[color:var(--color-border)] px-4 py-3 text-[13.5px] text-ink-muted">
              {tx("এখনও কোনো রক্তদাতা গ্রহণ করেননি।", "No donor has accepted yet.")}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.acceptedDonors.map((donor) => (
                <li key={donor.donorId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] px-4 py-3">
                  <div>
                    <p className="text-[14.5px] font-semibold text-ink">{donor.displayName}</p>
                    <p className="text-[12.5px] text-ink-muted">
                      {tx("গ্রহণ করেছেন", "Accepted")}: {formatDate(donor.acceptedAt, language)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {contact && contact.displayName === donor.displayName ? (
                      <>
                        <a href={`tel:${contact.phoneNumber}`} className="btn btn-primary min-h-[38px] px-3 py-1.5 text-[13px]">
                          {tx("কল করুন", "Call donor")}
                        </a>
                        <span className="rounded-lg bg-brand-soft px-3 py-1.5 text-[15px] font-semibold tracking-wide text-brand">
                          {contact.phoneNumber}
                        </span>
                      </>
                    ) : (
                      <button type="button" className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]" onClick={revealNumber} disabled={contactLoading}>
                        {contactLoading ? tx("যাচাই করা হচ্ছে…", "Verifying…") : tx("নম্বর দেখুন", "View number")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {contactError ? (
            <div className="mt-3">
              <Alert tone="danger">{contactError}</Alert>
            </div>
          ) : null}

          {contact ? (
            <div className="mt-3">
              <Alert tone="warning">{language === "bn" ? contact.disclaimerBn : contact.disclaimerEn}</Alert>
            </div>
          ) : null}
        </Card>
      ) : null}

      {data.donorResponse ? (
        <Card className="p-5">
          <h2 className="text-[16px] font-semibold text-ink">{tx("আপনার সাড়া", "Your response")}</h2>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            {data.donorResponse.status === "ACCEPTED"
              ? tx(
                  "আপনি অনুরোধটি গ্রহণ করেছেন। অনুরোধকারী এখন আপনার যোগাযোগের নম্বর দেখতে পারবেন।",
                  "You accepted this request. The requester can now view your contact number.",
                )
              : data.donorResponse.status === "DECLINED"
                ? tx("আপনি অনুরোধটি অগ্রাহ্য করেছেন। আপনার নম্বর গোপন আছে।", "You declined this request. Your number stays private.")
                : tx("আপনার সিদ্ধান্ত অপেক্ষমাণ।", "Awaiting your decision.")}
          </p>
          <Link href="/requests/inbox" className="btn btn-secondary mt-3">
            {tx("অনুরোধ ইনবক্সে ফিরুন", "Back to inbox")}
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
