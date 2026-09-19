"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Card, EmptyState, SkeletonList } from "@/components/ui";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";
import { EMERGENCY_CATEGORY_LABELS, EMERGENCY_CATEGORIES, type EmergencyCategory } from "@/lib/constants";

type EmergencyContact = {
  id: string;
  nameBn: string;
  nameEn: string;
  organization: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  category: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
};

export default function EmergencyPage() {
  const { tx, language } = useLanguage();
  const { push } = useToast();
  const [items, setItems] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: EmergencyContact[] }>("/api/emergency-contacts")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (category ? items.filter((item) => item.category === category) : items),
    [items, category],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-semibold text-ink">{tx("জরুরি সেবা", "Emergency services")}</h1>
        <p className="text-[13px] text-ink-muted">
          {tx(
            "শুধুমাত্র যাচাইকৃত সরকারি ও জরুরি সেবার নম্বর এখানে দেখানো হয়। অযাচাইকৃত নম্বর প্ল্যাটফর্মে যোগ করা হয় না।",
            "Only verified government and emergency numbers appear here. Unverified numbers are never published.",
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn min-h-[36px] px-3 py-1.5 text-[12.5px] ${category === "" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setCategory("")}
        >
          {tx("সব", "All")}
        </button>
        {EMERGENCY_CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            className={`btn min-h-[36px] px-3 py-1.5 text-[12.5px] ${category === value ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setCategory(value)}
          >
            {EMERGENCY_CATEGORY_LABELS[value as EmergencyCategory][language]}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tx("তথ্য যাচাইাধীন", "Information under verification")}
          description={tx(
            "এই মুহূর্তে কোনো যাচাইকৃত জরুরি সেবার নম্বর প্রকাশ করা হয়নি। প্রশাসক উৎসসহ নম্বর যাচাই করে প্রকাশ করবেন।",
            "No verified emergency numbers have been published yet. Administrators publish numbers only after verifying an official source.",
          )}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((contact) => (
            <Card as="li" key={contact.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{language === "bn" ? contact.nameBn : contact.nameEn}</p>
                  {contact.organization ? <p className="text-[12.5px] text-ink-muted">{contact.organization}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="success">
                      {tx("যাচাইকৃত", "Verified")}
                      {contact.lastVerifiedAt ? ` · ${formatDate(contact.lastVerifiedAt, language)}` : ""}
                    </Badge>
                  </div>
                  {contact.address ? <p className="mt-2 text-[12.5px] text-ink-muted">{contact.address}</p> : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${contact.phone}`} className="btn btn-primary min-h-[38px] px-3 py-1.5 text-[13px]">
                  {tx("কল করুন", "Call")}
                </a>
                <button
                  type="button"
                  className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(contact.phone);
                      push(tx("নম্বরটি কপি হয়েছে।", "Number copied."), "success");
                    } catch {
                      push(tx("কপি করা যায়নি।", "Could not copy."), "danger");
                    }
                  }}
                >
                  {tx("নম্বর কপি", "Copy number")}
                </button>
                <button
                  type="button"
                  className="btn btn-quiet min-h-[38px] px-2 py-1.5 text-[12.5px]"
                  onClick={() => setDetails(details === contact.id ? null : contact.id)}
                  aria-expanded={details === contact.id}
                >
                  {tx("বিস্তারিত", "Details")}
                </button>
              </div>

              {details === contact.id ? (
                <div className="mt-3 space-y-1 rounded-xl bg-[color:var(--color-surface-muted)] p-3 text-[12.5px] text-ink-soft">
                  <p>{tx("নম্বর", "Number")}: {contact.phone}</p>
                  {contact.alternatePhone ? <p>{tx("বিকল্প নম্বর", "Alternate")}: {contact.alternatePhone}</p> : null}
                  {contact.sourceUrl ? (
                    <p>
                      {tx("উৎস", "Source")}:{" "}
                      <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                        {contact.sourceUrl}
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </ul>
      )}

      <Alert tone="warning">
        {tx(
          "জরুরি অবস্থায় প্রথমে স্থানীয় স্বাস্থ্যসেবা কেন্দ্র বা জাতীয় জরুরি সেবায় যোগাযোগ করুন। এই প্ল্যাটফর্ম চিকিৎসা সেবা প্রদান করে না।",
          "In an emergency, contact your local health facility or the national emergency service first. This platform does not provide medical services.",
        )}
      </Alert>
    </div>
  );
}
