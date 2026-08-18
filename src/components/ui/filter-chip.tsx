"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// A single filter control shown as a pill that opens a small popover of
// options — the "Due Date / Location / Priority" chips row from MaintainX.
export function FilterChip({
  icon: Icon,
  label,
  activeLabel,
  onClear,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  activeLabel?: string | null;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!activeLabel;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          active
            ? "border-primary bg-primary-soft text-primary"
            : "border-hairline bg-surface text-ink-secondary hover:bg-surface-hover"
        }`}
      >
        {Icon && <Icon className="size-3.5" />}
        {active ? activeLabel : label}
        {active && onClear && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="rounded-full hover:bg-primary/15"
          >
            <X className="size-3" />
          </span>
        )}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute left-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-lg border border-hairline bg-surface p-1 shadow-[var(--shadow-soft)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterChipOption({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover ${
        active ? "font-medium text-primary" : "text-ink-secondary"
      }`}
    >
      {children}
    </button>
  );
}
