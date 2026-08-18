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
  listPane,
  dict,
  children,
}: {
  listPane: React.ReactNode;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const display = searchParams.get("display") ?? "list";
  const isIndex = pathname === "/work-orders";

  if (display !== "list") {
    return <div className="w-full">{listPane}</div>;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <div className={`w-full shrink-0 md:w-80 lg:w-96 ${isIndex ? "block" : "hidden md:block"}`}>
        {listPane}
      </div>
      <div className={`min-w-0 flex-1 ${isIndex ? "hidden md:block" : "block"}`}>
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
  );
}
