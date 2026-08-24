"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ClipboardList, Wrench, Building2, X } from "lucide-react";
import { card } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";

export const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette";

type Result = { id: string; label: string; href: string; icon: typeof ClipboardList; group: string };

export function CommandPalette({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function openPalette() {
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    setOpen(true);
  }

  // Global ⌘K / Ctrl+K shortcut, from anywhere in the app.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((wasOpen) => {
          if (wasOpen) return false;
          setQuery("");
          setResults([]);
          setActiveIndex(0);
          return true;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lets separate trigger buttons (mobile top bar, sidebar) open the same
  // single palette instance without prop-drilling state between them.
  useEffect(() => {
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
  }, []);

  // Focus is a DOM side effect, not derived state — fine to run on open.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Result[] = [
        ...data.workOrders.map((w: { id: string; title: string }) => ({
          id: w.id,
          label: w.title,
          href: `/work-orders/${w.id}`,
          icon: ClipboardList,
          group: dict.commandPalette.groupTasks,
        })),
        ...data.assets.map((a: { id: string; name: string }) => ({
          id: a.id,
          label: a.name,
          href: `/assets?asset=${a.id}`,
          icon: Wrench,
          group: dict.commandPalette.groupAssets,
        })),
        ...data.vendors.map((v: { id: string; name: string }) => ({
          id: v.id,
          label: v.name,
          href: `/directory?vendor=${v.id}`,
          icon: Building2,
          group: dict.commandPalette.groupVendors,
        })),
      ];
      setResults(mapped);
      setActiveIndex(0);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open, dict]);

  const visibleResults = useMemo(
    () => (query.trim().length >= 2 ? results : []),
    [query, results]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const r of visibleResults) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return map;
  }, [visibleResults]);

  function go(result: Result) {
    setOpen(false);
    router.push(result.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24">
      <button type="button" aria-label={dict.commandPalette.closeSearch} className="absolute inset-0" onClick={() => setOpen(false)} />
      <div className={`relative w-full max-w-lg overflow-hidden ${card}`}>
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Search className="size-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && visibleResults[activeIndex]) {
                go(visibleResults[activeIndex]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={dict.commandPalette.placeholder}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="button" onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length >= 2 && visibleResults.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-ink-faint">{dict.commandPalette.noResults}</p>
          )}
          {[...groups.entries()].map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">{group}</p>
              {items.map((item) => {
                const globalIndex = visibleResults.indexOf(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item)}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm ${
                      globalIndex === activeIndex ? "bg-primary-soft text-primary" : "text-ink-secondary"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
