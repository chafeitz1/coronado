"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { input as inputClass } from "@/lib/ui";

// Free-text multi-value tag field — type a word, press Enter or "," to add
// it as a chip, or open the picker below and click a value already used
// across other vendors (styled as a real in-app picker, not the browser's
// own native <datalist> popup) to reuse it instead of fragmenting
// "Piscina"/"piscina"/"Pool".
export function TagInput({
  name,
  defaultValue = [],
  suggestions = [],
  placeholder,
}: {
  name: string;
  defaultValue?: string[];
  suggestions?: string[];
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value || tags.includes(value)) {
      setText("");
      return;
    }
    setTags((t) => [...t, value]);
    setText("");
  }

  function removeTag(value: string) {
    setTags((t) => t.filter((tag) => tag !== value));
  }

  const available = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions.filter((s) => !tags.includes(s)).filter((s) => !q || s.toLowerCase().includes(q));
  }, [suggestions, tags, text]);

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
      {tags.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 hover:bg-primary/15"
              >
                <X className="size-3" />
              </button>
              <input type="hidden" name={name} value={tag} />
            </span>
          ))}
        </div>
      )}
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(text);
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Backspace" && !text && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {open && available.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-hairline bg-surface p-2 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-1.5">
            {available.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => addTag(option)}
                className="rounded-full bg-canvas-soft px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:bg-primary-soft hover:text-primary"
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
