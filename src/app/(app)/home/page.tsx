"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Badge, BloodGroupChip, Card, SectionTitle, SkeletonList, StatTile } from "@/components/ui";
import { useLanguage, useSession } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { BLOOD_GROUP_LABELS_BN } from "@/lib/constants";

type ProfileResponse = {
  hasProfile: boolean;
  profile?: {
    displayName: string;
    bloodGroup: string;
    availabilityStatus: string;
    lastDonationDate: string | null;
    nextPotentialDonationDate: string | null;
    donationCount: number;
    verificationStatus: string;
    unionName: string;
  };
  eligibility?: { status: string; reasonsBn: string[]; reasonsEn: string[] };
  ruleVersion?: string;
};

const actions = [
  { href: "/donors", label: "রক্ত খুঁজুন", sub: "Find blood" },
  { href: "/donors", label: "ডোনার খুঁজুন", sub: "Find donor" },
  { href: "/requests/new", label: "জরুরি অনুরোধ", sub: "Emergency request" },
  { href: "/profile#donation", label: "আমার রক্তদানের তথ্য", sub: "My donation status" },
  { href: "/notifications", label: "নোটিফিকেশন", sub: "Notifications" },
  { href: "/emergency", label: "জরুরি সহায়তা", sub: "Emergency help" },
];

export default function HomePage() {
  const { tx, language } = useLanguage();
  const { session } = useSession();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ProfileResponse>("/api/profile")
      .then(setProfile)
      .catch(() => setProfile({ hasProfile: false }))
      .finally(() => setLoading(false));
  }, []);

  const displayName = profile?.profile?.displayName ?? session?.user?.email?.split("@")[0] ?? "";
  const availability = profile?.profile?.availabilityStatus ?? "NOT_AVAILABLE";

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b border-[color:var(--color-border)] bg-brand-soft px-5 py-6">
          <p className="text-[13px] font-medium text-brand">
            {tx("আসসালামু আলাইকুম", "Assalamu alaikum")}, {displayName}
          </p>
          <h1 className="mt-1 text-[21px] font-semibold leading-snug text-ink">
            {tx(
              "আপনার এক ব্যাগ রক্ত, কারও জীবনের আশার আলো হতে পারে।",
              "One bag of blood can become someone’s hope for life.",
            )}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">{tx("এক ব্যাগ রক্ত, একটি জীবন", "One bag of blood, one life")}</p>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3 transition-colors hover:bg-[color:var(--color-surface-muted)]"
            >
              <span>
                <span className="block text-[14px] font-semibold text-ink">{action.label}</span>
                <span className="block text-[12px] text-ink-muted">{action.sub}</span>
              </span>
              <span aria-hidden="true" className="text-ink-muted">
                ›
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={tx("আমার রক্তদানের তথ্য", "My donation status")} />
        {loading ? (
          <SkeletonList rows={2} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label={tx("রক্তের গ্রুপ", "Blood group")}
              value={language === "bn" ? BLOOD_GROUP_LABELS_BN[(profile?.profile?.bloodGroup ?? "O+") as never] : (profile?.profile?.bloodGroup ?? "—")}
            />
            <StatTile
              label={tx("সম্ভাব্য পরবর্তী রক্তদানের তারিখ", "Potential next donation date")}
              value={formatDate(profile?.profile?.nextPotentialDonationDate, language)}
              hint={tx("এটি কোনো চিকিৎসা ছাড়পত্র নয়।", "This is not a medical clearance.")}
            />
            <StatTile label={tx("মোট রক্তদান", "Total donations")} value={String(profile?.profile?.donationCount ?? 0)} />
          </div>
        )}
      </section>

      {profile?.profile ? (
        <section>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <BloodGroupChip group={profile.profile.bloodGroup} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink">{profile.profile.displayName}</p>
                  <Badge tone={profile.profile.verificationStatus === "VERIFIED" ? "success" : "neutral"}>
                    {profile.profile.verificationStatus === "VERIFIED"
                      ? tx("যাচাইকৃত রক্তদাতা", "Verified donor")
                      : tx("যাচাই অপেক্ষমাণ", "Verification pending")}
                  </Badge>
                  <Badge tone={availability === "AVAILABLE" ? "success" : availability === "TEMPORARILY_UNAVAILABLE" ? "warning" : "neutral"}>
                    {availability === "AVAILABLE"
                      ? tx("রক্তদানের জন্য উপলব্ধ", "Available")
                      : availability === "TEMPORARILY_UNAVAILABLE"
                        ? tx("সাময়িকভাবে অনুপলব্ধ", "Temporarily unavailable")
                        : tx("এই মুহূর্তে অনুপলব্ধ", "Not available")}
                  </Badge>
                </div>
                <p className="mt-1 text-[13px] text-ink-muted">
                  {tx("সর্বশেষ রক্তদান", "Last donation")}: {formatDate(profile.profile.lastDonationDate, language)} · {profile.profile.unionName}
                </p>
                {profile.profile.lastDonationDate ? (
                  <p className="mt-2 text-[13px] font-medium text-ink-soft">
                    {tx("আপনার সম্ভাব্য পরবর্তী রক্তদানের সময় কাছাকাছি।", "Your potential next donation date is approaching.")}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/profile#donation" className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]">
                    {tx("রক্তদানের তথ্য হালনাগাদ করুন", "Update donation info")}
                  </Link>
                  <Link href="/profile#availability" className="btn btn-ghost min-h-[38px] px-3 py-1.5 text-[13px]">
                    {tx("উপলব্ধতা পরিবর্তন করুন", "Change availability")}
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <section>
        <Alert tone="warning" title={tx("স্বাস্থ্য সতর্কতা", "Medical safety")}>
          {tx(
            "এই অ্যাপ্লিকেশন কোনো চিকিৎসা পরামর্শ বা ডায়াগনস্টিক ব্যবস্থা নয়। রক্তদানের আগে সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের স্বাস্থ্য যাচাই অনুসরণ করুন।",
            "This application is not a medical advisory or diagnostic system. Follow the health screening of the responsible medical professional/blood collection service before donating.",
          )}
        </Alert>
      </section>
    </div>
  );
}
