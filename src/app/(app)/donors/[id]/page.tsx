"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Badge, BloodGroupChip, Card, EmptyState, SkeletonList } from "@/components/ui";
import { ReportButton } from "@/components/report-dialog";
import { useLanguage } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";

type DonorDetail = {
  donor: null | {
    id: string;
    displayName: string;
    bloodGroup: string;
    unionName: string;
    upazila: string;
    district: string;
    verificationStatus: string;
    availabilityStatus: string;
    age: number;
    donationCount: number;
    lastDonationDate: string | null;
    nextPotentialDonationDate: string | null;
  };
  disclaimerBn: string;
  disclaimerEn: string;
  ruleVersion?: string;
};

export default function DonorDetailPage() {
  const params = useParams<{ id: string }>();
  const { tx, language } = useLanguage();
  const [data, setData] = useState<DonorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DonorDetail>(`/api/donors/${params.id}`)
      .then(setData)
      .catch(() => setData({ donor: null, disclaimerBn: "", disclaimerEn: "" }))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <SkeletonList rows={2} />;

  if (!data?.donor) {
    return (
      <EmptyState
        title={tx("এই রক্তদাতার তথ্য পাওয়া যায়নি।", "This donor profile is not available.")}
        description={tx(
          "রক্তদাতা হয়তো এই মুহূর্তে অনুপলব্ধ অথবা প্রোফাইল সাময়িকভাবে বন্ধ আছে।",
          "The donor may be unavailable right now or has paused their profile.",
        )}
        action={
          <Link href="/donors" className="btn btn-secondary">
            {tx("রক্তদাতা তালিকায় ফিরুন", "Back to donors")}
          </Link>
        }
      />
    );
  }

  const donor = data.donor;

  return (
    <div className="space-y-5">
      <Link href="/donors" className="text-[13px] font-medium text-ink-soft hover:underline">
        ← {tx("রক্তদাতা তালিকা", "Donor list")}
      </Link>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <BloodGroupChip group={donor.bloodGroup} size="lg" />
          <div className="flex-1">
            <h1 className="text-[18px] font-semibold text-ink">{donor.displayName}</h1>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {donor.verificationStatus === "VERIFIED" ? (
                <Badge tone="success">{tx("যাচাইকৃত রক্তদাতা", "Verified donor")}</Badge>
              ) : (
                <Badge>{tx("যাচাই অপেক্ষমাণ", "Verification pending")}</Badge>
              )}
              <Badge tone={donor.availabilityStatus === "AVAILABLE" ? "success" : "neutral"}>
                {tx("উপলব্ধ", "Available")}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: tx("এলাকা", "Area"), value: `${donor.unionName}, ${donor.upazila}` },
            { label: tx("জেলা", "District"), value: donor.district },
            { label: tx("বয়স", "Age"), value: String(donor.age) },
            { label: tx("মোট রক্তদান", "Total donations"), value: String(donor.donationCount) },
            { label: tx("সর্বশেষ রক্তদান", "Last donation"), value: formatDate(donor.lastDonationDate, language) },
            {
              label: tx("সম্ভাব্য পরবর্তী রক্তদানের তারিখ", "Potential next donation date"),
              value: formatDate(donor.nextPotentialDonationDate, language),
            },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-[color:var(--color-border)] px-3.5 py-2.5">
              <dt className="text-[12px] text-ink-muted">{row.label}</dt>
              <dd className="text-[14px] font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/requests/new?donor=${donor.id}&group=${encodeURIComponent(donor.bloodGroup)}`} className="btn btn-primary">
            {tx("অনুরোধ পাঠান", "Send request")}
          </Link>
          <ReportButton targetType="DONOR" targetId={donor.id} variant="secondary" />
        </div>
      </Card>

      <Alert tone="warning" title={tx("গোপনীয়তা ও চিকিৎসা তথ্য", "Privacy and medical information")}>
        {language === "bn" ? data.disclaimerBn : data.disclaimerEn}
        {" "}
        {tx(
          "ফোন নম্বর, ইমেইল, ঠিকানা ও জন্ম তারিখ প্রকাশ্যে দেখা যায় না।",
          "Phone number, email, address and date of birth are never shown publicly.",
        )}
      </Alert>
    </div>
  );
}
