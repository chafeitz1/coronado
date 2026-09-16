import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { RouteProgressBar } from "@/components/ui/route-progress-bar";
import { InstallPrompt } from "@/components/install-prompt";
import { PullToRefresh } from "@/components/pull-to-refresh";
import "./globals.css";

// Runs the instant the parser reaches it — well before React hydrates —
// so the splash appears with no gap after the native OS splash instead of
// waiting on the JS bundle to load/parse/hydrate first. That wait (a few
// hundred ms, more on a slow phone) is exactly the blank-screen flash this
// exists to avoid, so this can't be a React effect: it has to be a plain,
// render-blocking script that mutates the DOM directly. The #app-splash
// div it targets is emitted hidden in the same server-rendered HTML, right
// before this script tag, so the node already exists by the time this runs.
const SPLASH_SCRIPT = `(function () {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var standalone =
      window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (!standalone) return;
    var el = document.getElementById("app-splash");
    var video = document.getElementById("app-splash-video");
    if (!el || !video) return;
    el.style.display = "block";
    var hidden = false;
    function hide() {
      if (hidden) return;
      hidden = true;
      el.style.transition = "opacity .3s";
      el.style.opacity = "0";
      setTimeout(function () {
        el.remove();
      }, 300);
    }
    video.addEventListener("ended", hide);
    video.addEventListener("error", hide);
    setTimeout(hide, 6000);
  } catch (e) {}
})();`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bonsai",
  description: "Bonsai · Casa de playa",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS ignores manifest.json's install-related fields — these meta tags are
  // what actually let Safari treat an "Add to Home Screen" launch as a
  // standalone app instead of just a bookmark that opens in the browser.
  //
  // statusBarStyle is deliberately "default", not "black-translucent":
  // translucent makes iOS draw content *underneath* the status bar instead
  // of reserving space for it, which requires every fixed/sticky top
  // element in the app to add its own env(safe-area-inset-top) padding or
  // it collides with the status bar (this is what clipped the top nav bar
  // after installing). "default" makes iOS reserve that space itself, so
  // nothing else needs to account for it.
  appleWebApp: {
    capable: true,
    title: "Bonsai",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F1ECE5",
  // Without this, env(safe-area-inset-*) resolves to 0 on iOS — fine in a
  // regular Safari tab (the browser's own chrome keeps content off the
  // rounded corners/home indicator), but an installed standalone PWA has no
  // such chrome, so content bleeds right into them unless we opt in here and
  // pad for the insets ourselves.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas-soft text-ink">
        <div id="app-splash" className="fixed inset-0 z-50" style={{ display: "none", background: "#F1ECE5" }}>
          <video id="app-splash-video" autoPlay muted playsInline className="h-full w-full object-cover">
            <source src="/splash.webm" type="video/webm" />
            <source src="/splash.mp4" type="video/mp4" />
          </video>
        </div>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <PullToRefresh />
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="w-full flex-1 px-4 pb-24 pt-6 md:px-8 md:py-8">{children}</main>
        </div>
        <InstallPrompt />
      </body>
    </html>
  );
}
