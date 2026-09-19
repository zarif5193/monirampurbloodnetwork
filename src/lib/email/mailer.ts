import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { env, isEmailDeliveryConfigured } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isEmailDeliveryConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.appPassword,
    },
  });
  return transporter;
}

export { isEmailDeliveryConfigured };

export type MailTemplate =
  | { kind: "email_verification"; code: string; minutes: number }
  | { kind: "password_reset"; code: string; minutes: number };

const BILINGUAL_FOOTER = {
  bn: "মণিরামপুর ব্লাড নেটওয়ার্ক — এক ব্যাগ রক্ত, একটি জীবন। আপনি যদি এই ইমেইলটি না চেয়ে থাকেন তাহলে এটি উপেক্ষা করুন।",
  en: "Manirampur Blood Network — One bag of blood, one life. If you did not request this email, you can safely ignore it.",
};

function render(template: MailTemplate) {
  const subject =
    template.kind === "email_verification"
      ? "ইমেইল যাচাই কোড — মণিরামপুর ব্লাড নেটওয়ার্ক"
      : "পাসওয়ার্ড রিসেট কোড — মণিরামপুর ব্লাড নেটওয়ার্ক";

  const heading =
    template.kind === "email_verification" ? "ইমেইল যাচাই কোড" : "পাসওয়ার্ড রিসেট কোড";

  const html = `<!doctype html><html lang="bn"><body style="margin:0;background:#f6f2f0;font-family:'Noto Sans Bengali',system-ui,Segoe UI,sans-serif;color:#1d1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #eee2df;">
      <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#9b1b2c;font-weight:700;">মণিরামপুর ব্লাড নেটওয়ার্ক</div>
      <h1 style="font-size:22px;margin:14px 0 8px;">${heading}</h1>
      <p style="font-size:15px;line-height:1.7;color:#4b4341;margin:0 0 22px;">অনুগ্রহ করে নিচের কোডটি অ্যাপের যাচাই পৃষ্ঠায় লিখুন। এই কোডটি ${template.minutes} মিনিট পর্যন্ত বৈধ এবং কেবল একবার ব্যবহার করা যাবে।</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:700;background:#f7ecea;color:#8d1224;padding:18px 12px;border-radius:12px;text-align:center;">${template.code}</div>
      <p style="font-size:14px;line-height:1.7;color:#4b4341;margin:22px 0 0;">${BILINGUAL_FOOTER.bn}<br/><span style="color:#7a706e;font-size:13px;">${BILINGUAL_FOOTER.en}</span></p>
    </div>
    <p style="text-align:center;color:#8d8482;font-size:12px;margin-top:18px;">Manirampur Upazila · Jashore · Bangladesh</p>
  </div></body></html>`;

  const text = `${heading}\n\nকোড / Code: ${template.code}\n\nবৈধতা / Valid for: ${template.minutes} minutes\n\n${BILINGUAL_FOOTER.bn}\n${BILINGUAL_FOOTER.en}`;

  return { subject, html, text };
}

/** Sends transactional mail and records metadata (never credentials) server-side. */
export async function sendTransactionalMail(
  recipient: string,
  template: MailTemplate,
): Promise<{ delivered: boolean }> {
  const { subject, html, text } = render(template);
  const from = env.smtp.from ?? "no-reply@manirampur-blood-network.local";

  let delivered = false;
  let deliveryError: string | null = null;
  const mailer = getTransporter();

  if (!mailer) {
    deliveryError = "SMTP_NOT_CONFIGURED";
    console.warn(
      `[email] delivery not configured — "${template.kind}" for a registered account is stored server-side. Configure SMTP_APP_PASSWORD to enable delivery.`,
    );
  } else {
    try {
      await mailer.sendMail({ from, to: recipient, subject, html, text });
      delivered = true;
    } catch (error) {
      // Only a generic reason is stored; no credentials or raw SMTP errors.
      deliveryError = "SMTP_DELIVERY_FAILED";
      console.error("[email] delivery failed:", error instanceof Error ? error.name : "unknown");
    }
  }

  await db.insert(emailOutbox).values({
    recipient,
    subject,
    template: template.kind,
    bodyPreview: delivered ? null : text,
    delivered,
    deliveryError,
  });

  return { delivered };
}
