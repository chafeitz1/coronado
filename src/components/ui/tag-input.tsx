"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { input as inputClass } from "@/lib/ui";

// Free-text multi-value tag field — type a word, press Enter or "," to add
// it as a chip. `suggestions` (e.g. every trade already used across other
// vendors) shows up as native browser autocomplete, nudging people toward
// reusing the same word instead of fragmenting "Piscina"/"piscina"/"Pool".
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
  const listId = `${name}-suggestions`;

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

  return (
    <div>
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
        list={listId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(text);
          } else if (e.key === "Backspace" && !text && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        placeholder={placeholder}
        className={inputClass}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
