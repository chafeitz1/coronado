"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, LayoutPanelLeft, Table2, CalendarDays, LayoutGrid } from "lucide-react";

export type DisplayMode = "list" | "table" | "calendar" | "gallery";

const ICONS: Record<DisplayMode, typeof LayoutPanelLeft> = {
  list: LayoutPanelLeft,
  table: Table2,
  calendar: CalendarDays,
  gallery: LayoutGrid,
};

// Matches MaintainX's "◫ To Do View ⌄" control: switches how the same
// underlying list is displayed via a `display` query param. Reads its own
// current value from the URL so it can be dropped anywhere (e.g. next to a
// server-rendered page heading) without a parent having to thread it down.
// `defaultMode` is the mode assumed (and left out of the URL) when the
// query param is absent — work orders default to "list", assets default
// to "gallery".
export function ViewSwitcher({
  options,
  defaultMode = "list",
}: {
  options: { key: DisplayMode; label: string }[];
  defaultMode?: DisplayMode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = ((searchParams.get("display") as DisplayMode) ?? defaultMode) as DisplayMode;
  const Icon = ICONS[value];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  function select(mode: DisplayMode) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === defaultMode) params.delete("display");
    else params.set("display", mode);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-hover active:bg-surface-hover"
      >
        <Icon className="size-4" />
        {options.find((o) => o.key === value)?.label}
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-40 overflow-hidden rounded-lg border border-hairline bg-surface p-1 shadow-[var(--shadow-soft)]">
          {options.map((opt) => {
            const OptIcon = ICONS[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => select(opt.key)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover active:bg-surface-hover ${
                  opt.key === value ? "font-medium text-primary" : "text-ink-secondary"
                }`}
              >
                <OptIcon className="size-4" /> {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
