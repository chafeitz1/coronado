"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { input as inputClass } from "@/lib/ui";

// Single-value field that opens a picker of existing values (e.g. every
// category already used across other assets) as clickable pills — nudges
// reuse of "Piscina" over also typing "piscina"/"Pool" while still taking
// free text for a value that isn't in the list yet. Styled as a real
// in-app picker rather than the browser's own native <datalist> popup.
export function SuggestInput({
  name,
  defaultValue = "",
  suggestions = [],
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    return q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions;
  }, [suggestions, value]);

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
      <input
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-hairline bg-surface p-2 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  option === value
                    ? "bg-primary text-on-primary"
                    : "bg-canvas-soft text-ink-secondary hover:bg-primary-soft hover:text-primary active:bg-primary-soft active:text-primary"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
