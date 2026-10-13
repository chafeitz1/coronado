"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
}

/** Lista con búsqueda y casillas para filtrar por varios valores a la vez
 *  (p. ej. varios empleados en Auditoría). */
export function MultiSelectFilter({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: MultiSelectOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <div className="rounded-md border border-border">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full border-b border-border bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
      />
      <ul className="max-h-52 overflow-y-auto py-1">
        {visible.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">Sin resultados.</li>}
        {visible.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onToggle(option.id)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/60"
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-border",
                    isSelected && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {isSelected && <Check className="size-2.5" />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
