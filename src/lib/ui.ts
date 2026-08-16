// Shared className tokens so every page/form looks consistent without
// re-typing the same Tailwind soup everywhere. Minimal/neutral palette
// (zinc scale) with a single indigo accent for primary actions and focus.

export const card =
  "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const listCard =
  "divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900";

export const listRow =
  "flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60";

export const label = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

export const buttonGhost =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

export const pageHeading = "text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";

export const sectionHeading =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500";

export const mutedText = "text-sm text-zinc-500 dark:text-zinc-400";

export const emptyState =
  "flex flex-col items-center gap-1 rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center dark:border-zinc-700";
