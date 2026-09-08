"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Same split-panel idea as AssetsShell, plus one extra rule: Table and
// Calendar view need the full width to be useful, so switching to either
// one (via the `display` query param) takes over the whole page instead of
// sharing it with a detail pane — only List/To Do view keeps the split.
export function WorkOrdersShell({
  header,
  listPane,
  dict,
  children,
}: {
  // Title, view switcher, "Nueva tarea" button, filter chips — the same
  // toolbar regardless of which view (List/To Do, Lista/Table, Calendario)
  // is selected, rendered once above the split instead of living inside
  // the row-list column.
  header: React.ReactNode;
  listPane: React.ReactNode;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const display = searchParams.get("display") ?? "list";
  const isIndex = pathname === "/work-orders";

  if (display !== "list") {
    return (
      <div className="w-full space-y-4">
        {header}
        {listPane}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* On mobile, viewing a task's detail hides the list column entirely
          (below) — the search/filter/tabs toolbar above it is about
          browsing that list, so it's just as irrelevant there and hides
          along with it. Desktop always shows both side by side, so the
          toolbar stays relevant and stays visible. */}
      <div className={isIndex ? "block" : "hidden md:block"}>{header}</div>
      <div className="flex flex-col md:flex-row md:items-start">
        <div
          className={`w-full shrink-0 md:w-96 md:border-r md:border-hairline md:pr-6 lg:w-[28rem] ${isIndex ? "block" : "hidden md:block"}`}
        >
          {listPane}
        </div>
        <div className={`min-w-0 flex-1 md:pl-6 ${isIndex ? "hidden md:block" : "block"}`}>
          {!isIndex && (
            <Link
              href="/work-orders"
              className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink md:hidden"
            >
              <ArrowLeft className="size-4" /> {dict.workOrders.backToList}
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
