"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "loading" | "complete" | "fading";

// Tuning: SHOW_DELAY avoids flashing on already-prefetched, near-instant
// navigations. "loading" crawls toward LOADING_TARGET over LOADING_DURATION_MS
// — a plain CSS transition, not a JS ticker — since almost every real
// navigation lands well before that finishes on its own. "complete" then
// snaps the rest of the way to 100% quickly so the bar visibly *reaches the
// end* instead of just vanishing wherever the crawl happened to be, holds
// there briefly, and "fading" fades it out.
const SHOW_DELAY_MS = 150;
const LOADING_TARGET = 80;
const LOADING_DURATION_MS = 8000;
const COMPLETE_DURATION_MS = 250;
const FADE_DELAY_MS = 150;
const FADE_DURATION_MS = 300;

// A thin top-of-page bar that appears while a click-triggered navigation is
// in flight — without it, tapping a link on mobile gives no feedback at all
// until the new page suddenly appears (no :hover to confirm the tap, and
// most transitions aren't instant on a slow connection). Listens for clicks
// on any internal <a> anywhere in the app (event delegation on `document`,
// same trick nextjs-toploader-style libraries use) instead of wrapping
// every Link component individually.
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams.toString()}`;

  const [phase, setPhase] = useState<Phase>("idle");
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The route just changed — if a bar was showing (or about to), finish it
  // instead of leaving it stranded mid-crawl. Set during render (React's
  // "adjusting state on a prop change" pattern) instead of in an effect.
  const [prevUrl, setPrevUrl] = useState(currentUrl);
  if (currentUrl !== prevUrl) {
    setPrevUrl(currentUrl);
    if (phase === "loading") setPhase("complete");
  }

  useEffect(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
  }, [currentUrl]);

  useEffect(() => {
    if (phase !== "complete") return;
    const t = setTimeout(() => setPhase("fading"), COMPLETE_DURATION_MS + FADE_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("idle"), FADE_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    function startLoading() {
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => setPhase("loading"), SHOW_DELAY_MS);
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      let target: URL;
      try {
        target = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (target.origin !== window.location.origin) return;
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;
      startLoading();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", startLoading);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", startLoading);
      if (showTimer.current) clearTimeout(showTimer.current);
    };
  }, []);

  if (phase === "idle") return null;

  const width = phase === "loading" ? LOADING_TARGET : 100;
  const widthDuration = phase === "loading" ? LOADING_DURATION_MS : COMPLETE_DURATION_MS;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5" aria-hidden>
      <div
        className="h-full rounded-full bg-primary"
        style={{
          width: `${width}%`,
          opacity: phase === "fading" ? 0 : 1,
          transition: `width ${widthDuration}ms ease-out, opacity ${FADE_DURATION_MS}ms ease-out`,
        }}
      />
    </div>
  );
}
