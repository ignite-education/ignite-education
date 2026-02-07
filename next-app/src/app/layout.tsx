import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Ignite Education - Learn skills that matter",
    template: "%s | Ignite Education",
  },
  description: "AI-powered courses designed to help you learn practical skills and advance your career.",
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* NEXTJS-VERSION: 2.0.0 - Deployed 2025-02-07 */}
        {children}
      </body>
    </html>
  );
}
