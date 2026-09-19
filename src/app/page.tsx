import Link from "next/link";
import { LogoLockup, LogoMark } from "@/components/brand/Logo";

const pillars = [
  {
    title: "যাচাইকৃত রক্তদাতা",
    body: "প্রতিটি রক্তদাতা ইমেইল যাচাই ও প্রোফাইল সম্পূর্ণ করার পরেই অনুসন্ধানে আসে।",
  },
  {
    title: "ফোন নম্বর সম্পূর্ণ গোপন",
    body: "রক্তদাতা অনুরোধ গ্রহণ করলেই কেবল অনুরোধকারী নম্বর দেখতে পান — এর আগে কখনও নয়।",
  },
  {
    title: "স্থানীয় ও নির্ভরযোগ্য",
    body: "মণিরামপুর উপজেলার ইউনিয়নভিত্তিক তথ্য, সরকারি উৎসের জরুরি নম্বর এবং পরিষ্কার নিয়মাবলি।",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--color-border)] bg-white">
        <div className="app-shell flex h-16 items-center justify-between">
          <LogoLockup size={34} />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-secondary min-h-[38px] px-3 py-1.5 text-[13.5px]">
              লগইন
            </Link>
            <Link href="/register" className="btn btn-primary min-h-[38px] px-3 py-1.5 text-[13.5px]">
              নতুন অ্যাকাউন্ট
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="app-shell py-12 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="badge bg-brand-soft text-brand">মণিরামপুর উপজেলা, যশোর</span>
              <h1 className="mt-4 text-[30px] font-semibold leading-[1.25] text-ink sm:text-[38px]">
                এক ব্যাগ রক্ত,
                <br />
                একটি জীবন
              </h1>
              <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
                মণিরামপুর ব্লাড নেটওয়ার্ক একটি সামাজিক উদ্যোগ — যা মণিরামপুর উপজেলার রক্তদাতাদের সঙ্গে
                প্রকৃত রক্তের প্রয়োজনে যারা অপেক্ষায় আছেন তাদের সংযোগ ঘটায়। এখানে কোনো ভুয়া তথ্য নেই,
                প্রকাশ্যে কোনো ফোন নম্বর নেই এবং কোনো তথ্য ছাড়াই কিছু দেখানো হয় না।
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className="btn btn-primary px-5">
                  রক্তদাতা হিসেবে যুক্ত হন
                </Link>
                <Link href="/login" className="btn btn-secondary px-5">
                  ইতিমধ্যে অ্যাকাউন্ট আছে
                </Link>
              </div>
              <dl className="mt-9 grid gap-3 sm:grid-cols-3">
                {pillars.map((pillar) => (
                  <div key={pillar.title} className="card p-4">
                    <dt className="text-[14px] font-semibold text-ink">{pillar.title}</dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">{pillar.body}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="card p-7">
              <div className="flex items-center gap-3">
                <LogoMark size={48} />
                <div>
                  <p className="text-[14px] font-semibold text-ink">নিরাপত্তা ও গোপনীয়তা</p>
                  <p className="text-[12.5px] text-ink-muted">আপনার তথ্য কীভাবে সুরক্ষিত থাকে</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-[13.5px] leading-relaxed text-ink-soft">
                {[
                  "ইমেইল ও পাসওয়ার্ড দিয়ে নিরাপদ লগইন; পাসওয়ার্ড কখনও সাধারণ আকারে সংরক্ষিত হয় না।",
                  "রক্তদাতার ফোন নম্বর কেবল অনুমোদিত অনুরোধকারী দেখতে পান — সার্ভার থেকে অনুমোদন যাচাই করা হয়।",
                  "প্রাথমিক স্বাস্থ্য তথ্য শুধু আপনি নিজে দেখতে পান।",
                  "যেকোনো সমস্যা রিপোর্ট করার সুবিধা এবং অ্যাকাউন্ট মুছে ফেলার অনুরোধের সুবিধা।",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-4 border-t border-[color:var(--color-border)] pt-4 text-[13px]">
                <Link href="/about" className="font-medium text-brand hover:underline">
                  পরিচিতি ও নীতিমালা
                </Link>
                <Link href="/about#safety" className="font-medium text-ink-soft hover:underline">
                  রক্তদান সংক্রান্ত সতর্কতা
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--color-border)] bg-white">
        <div className="app-shell flex flex-col gap-2 py-6 text-[12.5px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} মণিরামপুর ব্লাড নেটওয়ার্ক</p>
          <p>Developed by Zarif</p>
        </div>
      </footer>
    </div>
  );
}
