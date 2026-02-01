import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "HexDrop - Secure File Sharing",
  description: "Share files securely with end-to-end encryption",
  keywords: ["file sharing", "encryption", "secure", "privacy"],
  authors: [{ name: "Jayraj Pamnani" }],
  creator: "Jayraj Pamnani",
  publisher: "Jayraj Pamnani",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "HexDrop - Secure File Sharing",
    description: "Share files securely with end-to-end encryption",
    siteName: "HexDrop",
  },
  twitter: {
    card: "summary_large_image",
    title: "HexDrop - Secure File Sharing",
    description: "Share files securely with end-to-end encryption",
    creator: "@jayrajpamnani",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            theme="light"
            toastOptions={{
              style: {
                background: 'white',
                color: 'black',
                border: '1px solid #fecaca',
              },
              className: 'toaster',
            }}
            richColors
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
