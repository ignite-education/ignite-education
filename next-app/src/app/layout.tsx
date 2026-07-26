import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import SiteJsonLd from "@/components/SiteJsonLd";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, GA_MEASUREMENT_ID } from "@/lib/siteConfig";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves every relative canonical / openGraph.url / image below to the apex
  // host, so pages don't each hardcode 'https://ignite.education'.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ignite Education - Learn skills that matter",
    template: "%s | Ignite Education",
  },
  description: "AI-powered courses designed to help you learn practical skills and advance your career.",
  applicationName: SITE_NAME,
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: "/favicon.svg",
  },
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_GB",
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE],
  },
  // Belt-and-braces alongside DNS TXT verification on the apex domain.
  ...(process.env.NEXT_PUBLIC_GSC_TOKEN
    ? { verification: { google: process.env.NEXT_PUBLIC_GSC_TOKEN } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Version indicator for deployment verification */}
        <meta name="generator" content="Next.js (Ignite v2)" />
        {/* Google Identity Services (for One Tap / personalized sign-in button) */}
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* NEXTJS-VERSION: 2.0.0 - Deployed 2025-02-07 */}
        <SiteJsonLd />
        {children}

        {/*
          GA4. These pages are served on the apex via a Vercel rewrite from the
          root project, whose index.html carries the same tag — but public pages
          never load that document, so without this every indexable page is
          untracked. Host-gated on the client so preview/staging traffic on
          next.ignite.education isn't counted, and so the page stays static
          (reading headers() here would opt every route out of ISR).
        */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            if (location.hostname === 'ignite.education') {
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            }
          `}
        </Script>
      </body>
    </html>
  );
}
