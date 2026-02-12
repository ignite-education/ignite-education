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
  icons: {
    icon: [
      { url: "https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-24%20at%2008.26.51.png", sizes: "32x32", type: "image/png" },
      { url: "https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-24%20at%2008.26.51.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-24%20at%2008.26.51.png",
    apple: "https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-24%20at%2008.26.51.png",
  },
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
        {children}
      </body>
    </html>
  );
}
