import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PwaInstallButton from "../components/pwa-install-button";
import { ThemeProvider } from "@/components/theme-provider";

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
  title: "MG MUZUKA GILBERT",
  description:
    "Luxury photography, videography, booking, and protected-gallery platform.",
  applicationName: "MG MUZUKA GILBERT",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MG MUZUKA GILBERT",
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
      { url: "/brand/mg-logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/mg-logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/mg-logo-apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MG MUZUKA GILBERT" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#050505" />
        <meta name="msapplication-TileImage" content="/brand/mg-logo-512.png" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#d4af37" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="shortcut icon" href="/brand/mg-logo-192.png" />
        <link rel="icon" href="/brand/mg-logo-192.png" sizes="192x192" />
        <link rel="icon" href="/brand/mg-logo-512.png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/brand/mg-logo-apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          {children}
          <PwaInstallButton />
        </ThemeProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
