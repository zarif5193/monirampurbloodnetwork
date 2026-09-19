"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, BloodGroupChip, Card, EmptyState, SkeletonList } from "@/components/ui";
import { ReportButton } from "@/components/report-dialog";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { BLOOD_GROUP_LABELS_BN } from "@/lib/constants";

type InboxItem = {
  donorRequestId: string;
  status: string;
  contactPermissionGranted: boolean;
  createdAt: string;
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
    contactName: string;
    contactPhone: string;
    description: string | null;
  };
};

export default function DonorInboxPage() {
  const { tx, language } = useLanguage();
  const { push } = useToast();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<InboxItem | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: InboxItem[] }>("/api/donor-requests");
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(item: InboxItem) {
    setConfirming(null);
    setPending(item.donorRequestId);
    try {
      await apiFetch(`/api/blood-requests/${item.request.id}/accept`, { method: "POST" });
      push(
        tx(
          "আপনি অনুরোধটি গ্রহণ করেছেন। অনুরোধকারী এখন আপনার যোগাযোগের নম্বর দেখতে পারবেন।",
          "You accepted this request. The requester can now view your contact number.",
        ),
        "success",
      );
      await load();
    } catch {
      push(tx("গ্রহণ করা যায়নি। আবার চেষ্টা করুন।", "Could not accept. Please try again."), "danger");
    } finally {
      setPending(null);
    }
  }

  async function decline(item: InboxItem) {
    setPending(item.donorRequestId);
    try {
      await apiFetch(`/api/blood-requests/${item.request.id}/decline`, { method: "POST" });
      push(tx("অনুরোধটি অগ্রাহ্য করা হয়েছে। আপনার নম্বর গোপন রাখা হয়েছে।", "Request declined. Your number stays private."), "success");
      await load();
    } catch {
      push(tx("অগ্রাহ্য করা যায়নি।", "Could not decline."), "danger");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-semibold text-ink">{tx("রক্তদানের অনুরোধ", "Blood requests for you")}</h1>
        <p className="text-[13px] text-ink-muted">
          {tx(
            "আপনার রক্তের গ্রুপ ও এলাকা অনুযায়ী অনুরোধ এখানে আসে। গ্রহণ করলেই অনুরোধকারী আপনার নম্বর দেখতে পাবেন।",
            "Requests matching your blood group and area arrive here. Your number is shared only if you accept.",
          )}
        </p>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title={tx("এই মুহূর্তে কোনো রক্তের অনুরোধ নেই।", "There are no blood requests right now.")}
          description={tx(
            "নতুন অনুরোধ এলে নোটিফিকেশনের মাধ্যমে জানানো হবে। উপলব্ধ থাকলে প্রোফাইলে অবস্থা “রক্তদানের জন্য উপলব্ধ” রাখুন।",
            "We will notify you when a new request arrives. Keep your availability set to “Available” in your profile.",
          )}
          action={
            <Link href="/profile#availability" className="btn btn-secondary">
              {tx("উপলব্ধতা পরীক্ষা করুন", "Check availability")}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <Card as="li" key={item.donorRequestId} className="p-4">
              <div className="flex items-start gap-3">
                <BloodGroupChip group={item.request.bloodGroup} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-ink">{item.request.patientName}</p>
                    <Badge tone={item.request.urgency === "CRITICAL" ? "danger" : item.request.urgency === "URGENT" ? "warning" : "neutral"}>
                      {item.request.urgency === "CRITICAL" ? tx("অতি জরুরি", "Critical") : item.request.urgency === "URGENT" ? tx("জরুরি", "Urgent") : tx("সাধারণ", "Routine")}
                    </Badge>
                    {item.status === "ACCEPTED" ? <Badge tone="success">{tx("গ্রহণ করেছেন", "Accepted")}</Badge> : null}
                    {item.status === "DECLINED" ? <Badge>{tx("অগ্রাহ্য", "Declined")}</Badge> : null}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {item.request.quantityUnits} {tx("ব্যাগ", "bag(s)")} · {item.request.hospital} · {item.request.locationText}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    {tx("প্রয়োজনের তারিখ", "Required by")}: {formatDate(item.request.requiredDate, language)} ·{" "}
                    {tx("যোগাযোগ", "Contact")}: {item.request.contactName}
                  </p>
                  {item.request.description ? (
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{item.request.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.status === "NOTIFIED" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary min-h-[38px] px-3.5 py-1.5 text-[13px]"
                          onClick={() => setConfirming(item)}
                          disabled={pending === item.donorRequestId}
                        >
                          {tx("গ্রহণ করুন", "Accept")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]"
                          onClick={() => decline(item)}
                          disabled={pending === item.donorRequestId}
                        >
                          {tx("অগ্রাহ্য করুন", "Decline")}
                        </button>
                      </>
                    ) : (
                      <Link href={`/requests/${item.request.id}`} className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]">
                        {tx("বিস্তারিত দেখুন", "View details")}
                      </Link>
                    )}
                    <ReportButton targetType="BLOOD_REQUEST" targetId={item.request.id} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      {confirming ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#191a1e]/60 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h2 className="text-[16.5px] font-semibold text-ink">
              {tx("আপনি কি এই রক্তের অনুরোধটি গ্রহণ করতে চান?", "Do you want to accept this blood request?")}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              {tx(
                "অনুরোধ গ্রহণ করলে সংশ্লিষ্ট অনুরোধকারী আপনার যোগাযোগের নম্বর দেখতে পারবেন।",
                "By accepting, the requester will be allowed to view your donor contact number.",
              )}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn btn-primary flex-1" onClick={() => accept(confirming)} disabled={pending === confirming.donorRequestId}>
                {pending === confirming.donorRequestId ? tx("পাঠানো হচ্ছে…", "Sending…") : tx("গ্রহণ করুন", "Accept")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(null)}>
                {tx("বাতিল", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Alert tone="warning">
        {tx(
          "রক্তদানের আগে সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের স্বাস্থ্য যাচাই অনুসরণ করুন।",
          "Follow the health screening of the responsible medical professional/blood collection service before donating.",
        )}
      </Alert>
    </div>
  );
}
