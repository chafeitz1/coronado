"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutPanelLeft, Table2, CalendarDays, LayoutGrid, Columns3 } from "lucide-react";

export type DisplayMode = "list" | "table" | "calendar" | "gallery" | "board";

const ICONS: Record<DisplayMode, typeof LayoutPanelLeft> = {
  list: LayoutPanelLeft,
  table: Table2,
  calendar: CalendarDays,
  gallery: LayoutGrid,
  board: Columns3,
};

// A segmented toggle — every option visible and one click away, instead of
// a dropdown that hides the other views behind an extra click. Switches how
// the same underlying list is displayed via a `display` query param. Reads
// its own current value from the URL so it can be dropped anywhere (e.g.
// next to a server-rendered page heading) without a parent having to thread
// it down. `defaultMode` is the mode assumed (and left out of the URL) when
// the query param is absent — work orders default to "list", assets
// default to "gallery".
export function ViewSwitcher({
  options,
  defaultMode = "list",
}: {
  options: { key: DisplayMode; label: string }[];
  defaultMode?: DisplayMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = ((searchParams.get("display") as DisplayMode) ?? defaultMode) as DisplayMode;

  function select(mode: DisplayMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === defaultMode) params.delete("display");
    else params.set("display", mode);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface p-1">
      {options.map((opt) => {
        const Icon = ICONS[opt.key];
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => select(opt.key)}
            aria-pressed={active}
            title={opt.label}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary-soft text-primary"
                : "text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
            }`}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
