import type { Metadata } from "next";
import { Bangers, Inter, Permanent_Marker, Special_Elite } from "next/font/google";

import BackToTopButton from "@/app/components/back-to-top-button";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Bangers({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const hulkTitleFont = Permanent_Marker({
  variable: "--font-hulk-title",
  weight: "400",
  subsets: ["latin"],
});

const hulkBodyFont = Special_Elite({
  variable: "--font-hulk-body",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weekly Music Vault",
  description: "Weekly 4-song playlist generated from Google Drive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${hulkTitleFont.variable} ${hulkBodyFont.variable} antialiased`}
      >
        {children}
        <BackToTopButton />
      </body>
    </html>
  );
}
