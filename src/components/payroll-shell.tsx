"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Same panel-list pattern as AssetsShell: list pinned to a persistent left
// pane, detail swaps on the right as /finance/payroll/[personId] changes.
export function PayrollShell({
  listPane,
  dict,
  children,
}: {
  listPane: React.ReactNode;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isIndex = pathname === "/finance/payroll";

  return (
    <div className="flex flex-col md:flex-row md:items-start">
      <div
        className={`w-full shrink-0 md:w-96 md:border-r md:border-hairline md:pr-6 lg:w-[28rem] ${isIndex ? "block" : "hidden md:block"}`}
      >
        {listPane}
      </div>
      <div className={`min-w-0 flex-1 md:pl-6 ${isIndex ? "hidden md:block" : "block"}`}>
        {!isIndex && (
          <Link
            href="/finance/payroll"
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink md:hidden"
          >
            <ArrowLeft className="size-4" /> {dict.payroll.backToList}
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
