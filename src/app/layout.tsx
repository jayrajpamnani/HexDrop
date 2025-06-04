import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HexDrop: Private, encrypted file delivery",
  description: "Securely share files with end-to-end encryption. No account required.",
  keywords: ["file sharing", "encryption", "secure", "privacy", "file transfer"],
  authors: [{ name: "HexDrop Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  themeColor: "#ffffff",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
