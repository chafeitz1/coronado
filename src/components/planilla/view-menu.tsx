"use client";

import * as React from "react";
import { Star } from "lucide-react";

/**
 * Building blocks for the single "Vistas" menu that Registro and
 * Auditoría use (Oct 2026, per the user: too many buttons in the
 * toolbar -- every view option now lives inside one popover, and each
 * two-way choice is ONE on/off switch instead of two words side by
 * side, same pattern as Ebony / Coronado).
 */

export function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

/** A labeled iOS-style on/off switch. */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left hover:bg-accent/60"
      title={hint}
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors " +
          (checked ? "bg-primary" : "bg-muted-foreground/30")
        }
      >
        <span
          className={
            "inline-block size-4 rounded-full bg-background shadow transition-transform " +
            (checked ? "translate-x-[18px]" : "translate-x-0.5")
          }
        />
      </span>
    </button>
  );
}

export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-foreground hover:bg-accent/60">
      <input type="checkbox" className="size-3.5 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Small footer action: saves the current view as the default. */
export function SaveDefaultLink({ isDefault, saving, onSave }: { isDefault: boolean; saving: boolean; onSave: () => void }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving || isDefault}
      className="flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
    >
      <Star className={"size-3.5 " + (isDefault ? "fill-current text-amber-500" : "")} />
      {isDefault ? "Es tu vista predeterminada" : saving ? "Guardando…" : "Guardar como predeterminada"}
    </button>
  );
}
