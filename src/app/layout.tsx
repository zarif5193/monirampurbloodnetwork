import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "মণিরামপুর ব্লাড নেটওয়ার্ক | Manirampur Blood Network",
    template: "%s | মণিরামপুর ব্লাড নেটওয়ার্ক",
  },
  description:
    "মণিরামপুর উপজেলার নিরাপদ ও যাচাইকৃত রক্তদাতা নেটওয়ার্ক। এক ব্যাগ রক্ত, একটি জীবন।",
  applicationName: "Manirampur Blood Network",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "মণিরামপুর ব্লাড নেটওয়ার্ক",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-512.png" }],
  },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#8d1224",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
