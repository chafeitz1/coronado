"use client";

import { useEffect, useState } from "react";
import { isStandalone } from "@/components/install-prompt";

// Only for the installed PWA — a regular browser tab already has the
// browser's own loading UI, and replaying a ~5s brand animation on every
// page load there would just be annoying. Background color is the video's
// own baked-in cream, not a design token: it has to pixel-match the footage
// exactly (incl. under letterboxing on non-9:16 screens), which isn't
// something the rest of the app's palette needs to track.
const BACKGROUND = "#F1ECE5";

// Safety net for autoplay being blocked or the video failing to fire
// `onEnded`/`onError` — without this a broken video could strand the user
// behind the splash indefinitely.
const MAX_VISIBLE_MS = 6000;

export function AppSplash() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !isStandalone()) return;

    Promise.resolve().then(() => setVisible(true));
    const maxTimeout = setTimeout(hide, MAX_VISIBLE_MS);
    return () => clearTimeout(maxTimeout);
  }, []);

  function hide() {
    setFadingOut(true);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${fadingOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: BACKGROUND }}
    >
      <video autoPlay muted playsInline className="h-full w-full object-cover" onEnded={hide} onError={hide}>
        <source src="/splash.webm" type="video/webm" />
        <source src="/splash.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
