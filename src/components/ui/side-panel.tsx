"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// A slide-over that floats above the page content instead of navigating
// to a separate route — used for create/edit/detail flows that would
// otherwise take the user away from whatever list they were browsing.
export function SidePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative flex h-full w-full max-w-md flex-col bg-canvas shadow-[var(--shadow-elevated)]">
        <div className="flex shrink-0 items-center justify-end border-b border-hairline px-5 py-4">
          {title && <h2 className="mr-auto text-base font-semibold text-ink">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
