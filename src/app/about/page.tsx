import Link from "next/link";
import { LogoLockup, LogoMark } from "@/components/brand/Logo";

const sections = [
  {
    id: "mission",
    title: "মিশন",
    body: [
      "মণিরামপুর ব্লাড নেটওয়ার্ক একটি কমিউনিটি-কেন্দ্রিক প্ল্যাটফর্ম, যার উদ্দেশ্য মণিরামপুর উপজেলার রক্তদাতাদের সঙ্গে বৈধ রক্তের প্রয়োজন সংযোগ করানো।",
      "আমরা রক্ত সংগ্রহ করি না, চিকিৎসা পরামর্শ দিই না এবং কোনো প্রতিষ্ঠানের প্রতিনিধিত্ব করি না। আমাদের কাজ হলো নিরাপদ, গোপনীয় ও দ্রুত সংযোগ তৈরি করা।",
    ],
  },
  {
    id: "privacy",
    title: "গোপনীয়তা নীতি",
    body: [
      "আমরা শুধুমাত্র প্রয়োজনীয় তথ্য সংগ্রহ করি: নাম, ইমেইল, মোবাইল নম্বর, জন্ম তারিখ, লিঙ্গ, রক্তের গ্রুপ, ওজন, উচ্চতা এবং ইউনিয়ন/এলাকা।",
      "রক্তদাতার মোবাইল নম্বর, ইমেইল, ঠিকানা ও জন্ম তারিখ কখনও প্রকাশ্যে দেখা যায় না। নম্বর দেখার অনুমতি কেবল রক্তদাতা অনুরোধ গ্রহণ করলে তৈরি হয় এবং সার্ভার প্রতিবার অনুমোদন যাচাই করে।",
      "সহায়ক ডকুমেন্ট সর্বজনীন ফোল্ডারে রাখা হয় না; শুধুমাত্র অনুমোদিত ব্যক্তি ও প্রশাসক সেগুলো দেখতে পান।",
      "আপনি চাইলে তথ্য সংশোধন করতে পারেন এবং অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারেন (প্রোফাইল → অ্যাকাউন্ট মুছে ফেলার অনুরোধ)।",
    ],
  },
  {
    id: "terms",
    title: "ব্যবহারের শর্তাবলি ও রক্তদাতা অংশগ্রহণের শর্ত",
    body: [
      "এই প্ল্যাটফর্মে ভুয়া অনুরোধ, প্রতারণা, হয়রানি বা অনুপযুক্ত কনটেন্ট সম্পূর্ণ নিষিদ্ধ। সন্দেহজনক কার্যক্রম “রিপোর্ট করুন” বোতাম দিয়ে জানান।",
      "রক্তদাতা হিসেবে যুক্ত হওয়া সম্পূর্ণ স্বেচ্ছামূলক। যেকোনো অনুরোধ আপনি গ্রহণ বা অগ্রাহ্য করতে পারেন — অগ্রাহ্য করলে আপনার নম্বর গোপন থাকে।",
      "অ্যাকাউন্ট তৈরির সময় দেওয়া তথ্য সঠিক রাখা ব্যবহারকারীর দায়িত্ব। ভুল তথ্য দিলে প্রোফাইল সাময়িকভাবে অনুসন্ধান থেকে বাদ দেওয়া হতে পারে।",
    ],
  },
  {
    id: "safety",
    title: "রক্তদান সংক্রান্ত নিরাপত্তা তথ্য",
    body: [
      "এই অ্যাপ্লিকেশন কোনো চিকিৎসা ডায়াগনস্টিক ব্যবস্থা নয়। কোনো তথ্যকে “চিকিৎসাগতভাবে নিরাপদ” বলে দেখানো হয় না।",
      "প্রাথমিক তথ্য অনুযায়ী সম্ভাব্যভাবে উপযুক্ত হতে পারেন; চূড়ান্ত সিদ্ধান্ত সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।",
      "“সম্ভাব্য পরবর্তী রক্তদানের তারিখ” কেবল একটি হিসাব, কোনো চিকিৎসা ছাড়পত্র নয়। রক্তদানের আগে সংশ্লিষ্ট কেন্দ্রের স্বাস্থ্য যাচাই অনুসরণ করুন।",
    ],
  },
  {
    id: "support",
    title: "সহায়তা",
    body: [
      "সমস্যা রিপোর্ট করতে প্রোফাইল → সহায়তা ব্যবহার করুন অথবা সংশ্লিষ্ট রক্তদাতা/অনুরোধের পাশে থাকা “রিপোর্ট করুন” বোতামটি চাপুন।",
      "অ্যাকাউন্ট, যাচাই কোড বা পাসওয়ার্ড সংক্রান্ত সমস্যায় লগইন পৃষ্ঠার “পাসওয়ার্ড ভুলে গেছেন?” বিকল্পটি ব্যবহার করুন।",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)]">
      <header className="border-b border-[color:var(--color-border)] bg-white">
        <div className="app-shell flex h-16 items-center justify-between">
          <Link href="/" aria-label="মণিরামপুর ব্লাড নেটওয়ার্ক">
            <LogoLockup size={32} />
          </Link>
          <Link href="/home" className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13px]">
            অ্যাপে ফিরুন
          </Link>
        </div>
      </header>

      <main className="app-shell py-9">
        <div className="mx-auto max-w-2xl">
          <div className="mb-7 flex items-center gap-3">
            <LogoMark size={44} />
            <div>
              <h1 className="text-[21px] font-semibold text-ink">মণিরামপুর ব্লাড নেটওয়ার্ক সম্পর্কে</h1>
              <p className="text-[13px] text-ink-muted">মণিরামপুর উপজেলা, যশোর — এক ব্যাগ রক্ত, একটি জীবন</p>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="card p-5 scroll-mt-20">
                <h2 className="text-[16.5px] font-semibold text-ink">{section.title}</h2>
                <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-soft">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="card p-5">
              <h2 className="text-[16.5px] font-semibold text-ink">নির্মাতা</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                এই প্ল্যাটফর্মটি নির্মাণ করেছেন <span className="font-semibold text-ink">Zarif</span>। উদ্দেশ্য —
                মণিরামপুরের মানুষের জন্য একটি নিরাপদ ও নির্ভরযোগ্য রক্তদান নেটওয়ার্ক।
              </p>
            </section>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary px-5">
              রক্তদাতা হিসেবে যুক্ত হন
            </Link>
            <Link href="/login" className="btn btn-secondary px-5">
              লগইন
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[color:var(--color-border)] bg-white">
        <div className="app-shell py-6 text-[12.5px] text-ink-muted">
          © {new Date().getFullYear()} মণিরামপুর ব্লাড নেটওয়ার্ক · Developed by Zarif
        </div>
      </footer>
    </div>
  );
}
