"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { input } from "@/lib/ui";

type Option = { value: string; label: string };

// MaintainX-style "Start typing..." combobox: looks like a search field,
// filters the option list as you type, submits like a normal <select> via
// a hidden input so it drops into existing form actions unchanged.
export function Combobox({
  name,
  options,
  placeholder,
  defaultValue,
  noResultsLabel = "No results.",
}: {
  name: string;
  options: Option[];
  placeholder: string;
  defaultValue?: string;
  noResultsLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

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
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setValue("");
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder={placeholder}
          className={`${input} pl-9 pr-8`}
        />
        {selected && !open ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setQuery("");
            }}
            aria-label="Clear"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink active:text-ink"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
        )}
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-hairline bg-surface py-1 shadow-[var(--shadow-soft)]">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-ink-faint">{noResultsLabel}</li>}
          {filtered.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  setValue(opt.value);
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-surface-hover active:bg-surface-hover ${
                  opt.value === value ? "font-medium text-primary" : "text-ink-secondary"
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
