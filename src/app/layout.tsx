import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { PageViewTracker } from "@/lib/analytics/use-analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mitasafi.co.ke"),
  title: "MitaSafi — Find Verified Rental Homes in Nairobi | Houses & Apartments for Rent",
  description:
    "Discover verified rental homes in Nairobi. Browse apartments, bedsitters, and houses with real photos, honest prices, and direct landlord contact. No brokers. No hidden fees. Find your home today.",
  keywords: [
    "houses for rent Nairobi",
    "apartments for rent Nairobi",
    "rental homes Kenya",
    "verified rentals",
    "Nairobi apartments",
    "bedsitter Nairobi",
    "1 bedroom Nairobi",
  ],
  authors: [{ name: "MitaSafi" }],
  creator: "MitaSafi",
  publisher: "MitaSafi",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://mitasafi.co.ke",
    siteName: "MitaSafi",
    title: "MitaSafi — Find Verified Rental Homes in Nairobi",
    description:
      "Renting shouldn't feel like gambling. Find verified homes with honest prices and direct landlord contact.",
    images: [
      {
        url: "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/logo/og-image.svg",
        width: 1200,
        height: 630,
        alt: "MitaSafi - Modern Rental Management for Nairobi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MitaSafi — Find Verified Rental Homes in Nairobi",
    description:
      "Renting shouldn't feel like gambling. Find verified homes with honest prices and direct landlord contact.",
    images: ["https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/logo/og-image.svg"],
  },
  icons: {
    icon: [
      { url: "/logo/favicon.svg", type: "image/svg+xml" },
      { url: "/logo/app-icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: "/logo/app-icon-192.svg",
    shortcut: "/logo/favicon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0D9488",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased" suppressHydrationWarning>
        <ToastProvider>
          <PageViewTracker />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
