import type { Metadata } from "next";
import { Bangers, Inter, Permanent_Marker, Special_Elite } from "next/font/google";
import Script from "next/script";

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

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-YB504H4P8Q";

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {children}
        <BackToTopButton />
      </body>
    </html>
  );
}
