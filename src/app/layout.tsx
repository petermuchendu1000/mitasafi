import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { PageViewTracker } from "@/lib/analytics/use-analytics";
import "./globals.css";
import { landingImage } from "@/lib/storage/landing-images";
import { SITE_URL } from "@/lib/site/urls";

const title = "MitaSafi | Rentals and Home Services in Kenya";
const description = "Find houses, apartments and bedsitters for rent across Kenya. Compare local movers, cleaners, plumbers and other home services by location.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
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
    url: SITE_URL,
    siteName: "MitaSafi",
    title,
    description,
    images: [
      {
        url: landingImage("logo/og-image.png"),
        width: 1200,
        height: 630,
        alt: "MitaSafi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [landingImage("logo/og-image.png")],
  },
  icons: {
    icon: [
      { url: "/logo/favicon.svg", type: "image/svg+xml" },
      {
        url: "/logo/app-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-screen bg-gray-50 antialiased"
        suppressHydrationWarning
      >
        <ToastProvider>
          <PageViewTracker />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
