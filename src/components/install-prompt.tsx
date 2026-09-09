"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { buttonPrimary, buttonGhost, card, mutedText } from "@/lib/ui";

const DISMISSED_KEY = "install-prompt-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS has no display-mode media query support pre-installation; Safari
    // exposes this non-standard property on the installed app's window instead.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// "checking" and "hidden" both render nothing — keeping them distinct (rather
// than collapsing to one "hidden" state up front) means the very first
// client render matches the server's (nothing), avoiding a hydration
// mismatch, while the effect still gets to tell the two cases apart.
type Visibility = "checking" | "hidden" | "ios" | "installable";

// Chrome/Edge/Android fire beforeinstallprompt and let us trigger the native
// install dialog ourselves. iOS Safari has no such event — Apple only
// supports a manual Share > "Agregar a inicio" flow, so that branch just
// shows instructions instead of a button. Either way, this matters beyond
// convenience: on iOS, push notifications only work once the site has been
// added to the home screen — a plain Safari tab can't receive them at all.
export function InstallPrompt() {
  const [visibility, setVisibility] = useState<Visibility>("checking");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let alreadyDismissed = false;
    try {
      alreadyDismissed = Boolean(localStorage.getItem(DISMISSED_KEY));
    } catch {
      // Private browsing / storage blocked — treat as not dismissed.
    }

    if (isStandalone() || alreadyDismissed) {
      Promise.resolve().then(() => setVisibility("hidden"));
      return;
    }

    if (isIos()) {
      Promise.resolve().then(() => setVisibility("ios"));
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisibility("installable");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisibility("hidden");
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to persist to — it'll just show again next visit.
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") dismiss();
  }

  if (visibility === "checking" || visibility === "hidden") return null;

  return (
    <div className={`fixed inset-x-4 bottom-20 z-40 mx-auto max-w-sm space-y-2 p-4 shadow-2xl md:bottom-4 ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">
            C
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Agregá Casa Coronado a tu pantalla de inicio</p>
            <p className={`text-xs ${mutedText}`}>
              {visibility === "ios"
                ? "Así podés recibir notificaciones — en iPhone no funcionan desde el navegador."
                : "Acceso más rápido, y podés recibir notificaciones."}
            </p>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Cerrar" className={`shrink-0 ${buttonGhost} !p-1.5`}>
          <X className="size-4" />
        </button>
      </div>

      {visibility === "ios" ? (
        <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
          Tocá <Share className="size-3.5" /> y luego &quot;Agregar a inicio&quot;
        </p>
      ) : (
        <button type="button" onClick={install} className={`w-full ${buttonPrimary}`}>
          <Download className="size-4" /> Instalar
        </button>
      )}
    </div>
  );
}
