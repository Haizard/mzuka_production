import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#d4af37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Muzuka Gilbert",
  description:
    "Luxury photography, videography, booking, and protected-gallery platform.",
  applicationName: "Muzuka Gilbert",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Muzuka Gilbert",
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/brand/splash-2048x2732.png", media: "screen and (device-width: 1024px) and (device-height: 1366px)" },
      { url: "/brand/splash-1668x2388.png", media: "screen and (device-width: 834px) and (device-height: 1194px)" },
      { url: "/brand/splash-1290x2796.png", media: "screen and (device-width: 430px) and (device-height: 932px)" },
      { url: "/brand/splash-1179x2556.png", media: "screen and (device-width: 393px) and (device-height: 852px)" },
    ],
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#050505" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
