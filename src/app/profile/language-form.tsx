"use client";

import { updateLocale } from "@/app/actions/profile";
import type { Locale } from "@/lib/types/database";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function LanguageForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <div className="flex gap-2">
      <LanguageOption value="es" label={dict.languageForm.spanish} current={locale} />
      <LanguageOption value="en" label={dict.languageForm.english} current={locale} />
    </div>
  );
}

function LanguageOption({ value, label, current }: { value: Locale; label: string; current: Locale }) {
  const active = value === current;

  return (
    <form action={updateLocale.bind(null, value)}>
      <button
        type="submit"
        disabled={active}
        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
          active
            ? "border-primary bg-primary-soft text-primary"
            : "border-hairline bg-surface text-ink-secondary hover:bg-surface-hover"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
