"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, SkeletonList } from "@/components/ui";
import { useLanguage } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { BLOOD_GROUP_LABELS_BN } from "@/lib/constants";

type BloodRequest = {
  id: string;
  patientName: string;
  bloodGroup: string;
  quantityUnits: number;
  hospital: string;
  requiredDate: string;
  urgency: string;
  status: string;
  createdAt: string;
};

const statusTone: Record<string, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  PENDING_REVIEW: "warning",
  VERIFIED: "brand",
  SEARCHING_FOR_DONOR: "brand",
  DONOR_CONTACTED: "brand",
  ACCEPTED: "success",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export default function MyRequestsPage() {
  const { tx, language } = useLanguage();
  const [items, setItems] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: BloodRequest[] }>("/api/blood-requests")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold text-ink">{tx("আমার রক্তের অনুরোধ", "My blood requests")}</h1>
          <p className="text-[13px] text-ink-muted">
            {tx("আপনার জমা দেওয়া অনুরোধগুলোর অবস্থা এখানে দেখা যাবে।", "Track the status of the requests you submitted.")}
          </p>
        </div>
        <Link href="/requests/new" className="btn btn-primary min-h-[38px] px-3.5 py-1.5 text-[13px]">
          {tx("নতুন অনুরোধ", "New request")}
        </Link>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title={tx("এখনও কোনো রক্তের অনুরোধ জমা দেননি।", "You have not submitted a blood request yet.")}
          description={tx(
            "রক্তের প্রয়োজন হলে নতুন অনুরোধ তৈরি করুন। সাধারণ অনুরোধ যাচাইয়ের পর রক্তদাতাদের জানানো হয়।",
            "Create a new request when you need blood. General requests are broadcast to donors after verification.",
          )}
          action={
            <Link href="/requests/new" className="btn btn-primary">
              {tx("রক্তের অনুরোধ করুন", "Create blood request")}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((request) => (
            <Card as="li" key={request.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-ink">{request.patientName}</p>
                    <Badge tone={statusTone[request.status] ?? "neutral"}>{request.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {language === "bn" ? BLOOD_GROUP_LABELS_BN[request.bloodGroup as never] : request.bloodGroup} ·{" "}
                    {request.quantityUnits} {tx("ব্যাগ", "bag(s)")} · {request.hospital}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    {tx("প্রয়োজনের তারিখ", "Required by")}: {formatDate(request.requiredDate, language)}
                  </p>
                </div>
                <Link href={`/requests/${request.id}`} className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]">
                  {tx("বিস্তারিত", "Details")}
                </Link>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
