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
  hideClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  // For panels that build their own close control inline with other
  // header icons (edit/delete) so everything sits on one row instead of
  // this floating "X" and the content's own icons landing at different
  // heights depending on what's above them in the body.
  hideClose?: boolean;
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
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-hover active:bg-surface-hover hover:text-ink"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          !hideClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-hover active:bg-surface-hover hover:text-ink"
            >
              <X className="size-5" />
            </button>
          )
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
