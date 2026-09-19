"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, BloodGroupChip, Card, EmptyState, Field, SkeletonList } from "@/components/ui";
import { ReportButton } from "@/components/report-dialog";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { BLOOD_GROUPS, BLOOD_GROUP_LABELS_BN } from "@/lib/constants";

type PublicDonor = {
  id: string;
  displayName: string;
  bloodGroup: string;
  unionName: string;
  upazila: string;
  availabilityStatus: string;
  verificationStatus: string;
  age: number;
  donationCount: number;
  nextPotentialDonationDate: string | null;
  preliminaryEligibility: "POSSIBLE" | "NOT_POSSIBLE" | "UNKNOWN";
};

type LocationItem = { unionName: string; unionNameBn: string };

export default function DonorsPage() {
  const { tx, language } = useLanguage();
  const { push } = useToast();
  const [items, setItems] = useState<PublicDonor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unions, setUnions] = useState<LocationItem[]>([]);
  const [filters, setFilters] = useState({ bloodGroup: "", unionName: "", verifiedOnly: false, query: "" });

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (filters.bloodGroup) params.set("bloodGroup", filters.bloodGroup);
    if (filters.unionName) params.set("unionName", filters.unionName);
    if (filters.verifiedOnly) params.set("verifiedOnly", "true");
    if (filters.query.trim().length >= 2) params.set("query", filters.query.trim());
    return params.toString();
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ items: PublicDonor[]; total: number; hasMore: boolean }>(`/api/donors?${query}`);
      setItems(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    apiFetch<{ items: LocationItem[] }>("/api/locations")
      .then((data) => setUnions(data.items))
      .catch(() => setUnions([]));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-semibold text-ink">{tx("রক্তদাতা খুঁজুন", "Find a donor")}</h1>
        <p className="text-[13px] text-ink-muted">
          {tx(
            "ফোন নম্বর প্রকাশ্যে নেই। অনুরোধ পাঠান — রক্তদাতা গ্রহণ করলেই নম্বর দেখা যাবে।",
            "Phone numbers are never public. Send a request — the number appears only after the donor accepts.",
          )}
        </p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label={tx("রক্তের গ্রুপ", "Blood group")}>
            <select
              className="field-control"
              value={filters.bloodGroup}
              onChange={(event) => {
                setPage(1);
                setFilters({ ...filters, bloodGroup: event.target.value });
              }}
            >
              <option value="">{tx("সব গ্রুপ", "All groups")}</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {language === "bn" ? BLOOD_GROUP_LABELS_BN[group] : group}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx("ইউনিয়ন / এলাকা", "Union / Area")}>
            <select
              className="field-control"
              value={filters.unionName}
              onChange={(event) => {
                setPage(1);
                setFilters({ ...filters, unionName: event.target.value });
              }}
            >
              <option value="">{tx("সব এলাকা", "All areas")}</option>
              {unions.map((item) => (
                <option key={item.unionName} value={item.unionName}>
                  {language === "bn" ? item.unionNameBn : item.unionName}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx("নাম দিয়ে খুঁজুন", "Search by name")}>
            <input
              className="field-control"
              value={filters.query}
              maxLength={60}
              onChange={(event) => {
                setPage(1);
                setFilters({ ...filters, query: event.target.value });
              }}
              placeholder={tx("কমপক্ষে ২ অক্ষর", "At least 2 characters")}
            />
          </Field>
          <div className="flex items-end pb-4">
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-ink-soft">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[color:var(--color-brand)]"
                checked={filters.verifiedOnly}
                onChange={(event) => {
                  setPage(1);
                  setFilters({ ...filters, verifiedOnly: event.target.checked });
                }}
              />
              {tx("শুধু যাচাইকৃত", "Verified only")}
            </label>
          </div>
        </div>
      </Card>

      {loading ? (
        <SkeletonList rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title={tx("এই মুহূর্তে কোনো ডোনার পাওয়া যায়নি।", "No matching donors are currently available.")}
          description={tx(
            "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন। রক্তদাতারা নিজেদের উপলব্ধ ঘোষণা করলেই তাঁরা এখানে দেখা যাবেন।",
            "Try changing the filters. Donors appear here as soon as they mark themselves available.",
          )}
        />
      ) : (
        <>
          <p className="text-[12.5px] text-ink-muted">
            {tx("মোট", "Total")}: {total}
          </p>
          <ul className="space-y-3">
            {items.map((donor) => (
              <Card as="li" key={donor.id} className="p-4">
                <div className="flex items-start gap-3">
                  <BloodGroupChip group={donor.bloodGroup} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/donors/${donor.id}`} className="text-[15px] font-semibold text-ink hover:underline">
                        {donor.displayName}
                      </Link>
                      {donor.verificationStatus === "VERIFIED" ? (
                        <Badge tone="success">{tx("যাচাইকৃত রক্তদাতা", "Verified donor")}</Badge>
                      ) : null}
                      <Badge tone="success">{tx("উপলব্ধ", "Available")}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      {language === "bn" ? donor.unionName : donor.unionName} · {tx("বয়স", "Age")}: {donor.age} ·{" "}
                      {tx("মোট রক্তদান", "Donations")}: {donor.donationCount}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      {tx("সম্ভাব্য পরবর্তী রক্তদানের তারিখ", "Potential next donation date")}:{" "}
                      {formatDate(donor.nextPotentialDonationDate, language)}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-muted">
                      {tx(
                        "প্রাথমিক তথ্য অনুযায়ী সম্ভাব্যভাবে উপযুক্ত হতে পারেন; চূড়ান্ত সিদ্ধান্ত সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।",
                        "May potentially meet preliminary criteria; final eligibility is decided by the responsible medical professional/blood collection service.",
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link href={`/requests/new?donor=${donor.id}&group=${encodeURIComponent(donor.bloodGroup)}`} className="btn btn-primary min-h-[38px] px-3.5 py-1.5 text-[13px]">
                        {tx("অনুরোধ পাঠান", "Send request")}
                      </Link>
                      <Link href={`/donors/${donor.id}`} className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]">
                        {tx("বিস্তারিত", "Details")}
                      </Link>
                      <ReportButton targetType="DONOR" targetId={donor.id} label={tx("রিপোর্ট করুন", "Report")} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-secondary" disabled={page === 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              {tx("আগের পৃষ্ঠা", "Previous")}
            </button>
            <span className="text-[13px] text-ink-muted">{tx("পৃষ্ঠা", "Page")} {page}</span>
            <button type="button" className="btn btn-secondary" disabled={!hasMore || loading} onClick={() => setPage((current) => current + 1)}>
              {tx("পরের পৃষ্ঠা", "Next")}
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        className="btn btn-quiet text-[12.5px]"
        onClick={() => push(tx("তালিকা হালনাগাদ করা হচ্ছে…", "Refreshing the list…"), "info")}
      >
        {tx("তালিকা রিফ্রেশ করুন", "Refresh list")}
      </button>
    </div>
  );
}
