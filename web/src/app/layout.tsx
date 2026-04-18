import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { business } from "@/lib/business";
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
  title: `${business.brand_name} | Services Auto a ${business.city}`,
  description: `Entretien automobile premium a ${business.city}. Vidange, freinage, diagnostic, detailing et carnet d'entretien digital via QR code.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
