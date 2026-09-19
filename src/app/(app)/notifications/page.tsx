"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Card, EmptyState, SkeletonList } from "@/components/ui";
import { notifyLocally } from "@/components/notification-permission";
import { useLanguage, useToast } from "@/components/providers";
import { apiFetch, formatDate } from "@/lib/client/api";

type NotificationItem = {
  id: string;
  type: string;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const { tx, language } = useLanguage();
  const { push } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const lastCountRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: NotificationItem[]; unread: number }>("/api/notifications");
      setItems(data.items);
      setUnread(data.unread);
      if (data.unread > lastCountRef.current && lastCountRef.current > 0) {
        notifyLocally(
          language === "bn" ? "মণিরামপুর ব্লাড নেটওয়ার্ক" : "Manirampur Blood Network",
          language === "bn" ? "আপনার জন্য নতুন একটি বিজ্ঞপ্তি আছে।" : "You have a new notification.",
        );
      }
      lastCountRef.current = data.unread;
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, [load]);

  async function markAllRead() {
    try {
      await apiFetch("/api/notifications", { method: "POST", body: JSON.stringify({}) });
      push(tx("সব বিজ্ঞপ্তি পড়া হিসেবে চিহ্নিত হয়েছে।", "All notifications marked as read."), "success");
      await load();
    } catch {
      push(tx("চিহ্নিত করা যায়নি।", "Could not mark as read."), "danger");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold text-ink">{tx("নোটিফিকেশন", "Notifications")}</h1>
          <p className="text-[13px] text-ink-muted">
            {tx("নতুন রক্তের অনুরোধ ও অনুরোধের আপডেট এখানে দেখুন।", "New blood requests and request updates appear here.")}
          </p>
        </div>
        {unread > 0 ? (
          <button type="button" className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]" onClick={markAllRead}>
            {tx("সব পড়া হয়েছে", "Mark all read")}
          </button>
        ) : null}
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          title={tx("এই মুহূর্তে কোনো নোটিফিকেশন নেই।", "You have no notifications yet.")}
          description={tx(
            "নতুন রক্তের অনুরোধ, অনুরোধের আপডেট ও জরুরি বিজ্ঞপ্তি এখানে দেখা যাবে।",
            "New blood requests, updates and emergency alerts will appear here.",
          )}
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <Card as="li" key={item.id} className={`p-4 ${item.readAt ? "" : "border-[#f2d6da] bg-brand-soft/40"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-ink">{language === "bn" ? item.titleBn : item.titleEn}</p>
                    {!item.readAt ? <Badge tone="brand">{tx("নতুন", "New")}</Badge> : null}
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{language === "bn" ? item.bodyBn : item.bodyEn}</p>
                  <p className="mt-1 text-[12px] text-ink-muted">{formatDate(item.createdAt, language)}</p>
                </div>
                {item.link ? (
                  <Link href={item.link} className="btn btn-secondary min-h-[36px] px-3 py-1.5 text-[12.5px]">
                    {tx("দেখুন", "View")}
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
