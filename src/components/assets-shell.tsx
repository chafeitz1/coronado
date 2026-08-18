"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Panel view: list stays mounted in a persistent left pane and only the
// right pane swaps as you navigate /assets/[id], /assets/new, etc. — no
// page reload of the list. On mobile there's no room for both, so we show
// whichever pane matches the current route (list at the bare /assets
// index, detail otherwise) with a back link to return to the list.
export function AssetsShell({
  listPane,
  dict,
  children,
}: {
  listPane: React.ReactNode;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isIndex = pathname === "/assets";

  return (
    <div className="flex flex-col md:flex-row md:items-start">
      <div
        className={`w-full shrink-0 md:w-80 md:border-r md:border-hairline md:pr-6 lg:w-96 ${isIndex ? "block" : "hidden md:block"}`}
      >
        {listPane}
      </div>
      <div className={`min-w-0 flex-1 md:pl-6 ${isIndex ? "hidden md:block" : "block"}`}>
        {!isIndex && (
          <Link
            href="/assets"
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink md:hidden"
          >
            <ArrowLeft className="size-4" /> {dict.assets.backToList}
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
