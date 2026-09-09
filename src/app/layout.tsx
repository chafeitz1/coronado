import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { RouteProgressBar } from "@/components/ui/route-progress-bar";
import { InstallPrompt } from "@/components/install-prompt";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casa Coronado",
  description: "Mantenimiento de la casa de playa",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS ignores manifest.json's install-related fields — these meta tags are
  // what actually let Safari treat an "Add to Home Screen" launch as a
  // standalone app instead of just a bookmark that opens in the browser.
  appleWebApp: {
    capable: true,
    title: "Coronado",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0075de",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas-soft text-ink">
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="w-full flex-1 px-4 pb-24 pt-6 md:px-8 md:py-8">{children}</main>
        </div>
        <InstallPrompt />
      </body>
    </html>
  );
}
