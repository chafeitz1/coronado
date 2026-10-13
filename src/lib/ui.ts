// Shared className tokens, adapted from DESIGN.md (Notion-inspired), then
// flattened to match MaintainX's hard-bordered "window" panels: no drop
// shadows, tighter corner radii, panels read as solid bordered surfaces
// rather than floating cards. Colors resolve through CSS vars in
// globals.css so light/dark both fall out of the same classes.

export const card = "rounded-md border border-hairline bg-surface";

export const listCard = "divide-y divide-hairline rounded-md border border-hairline bg-surface";

export const listRow = "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-hover active:bg-surface-hover";

export const label = "text-sm font-medium text-ink-secondary";

export const input =
  "w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/20";

// Every button gets a same-color :active mirror of its :hover, since touch
// devices fire :active but not (reliably) :hover — without it, tapping a
// button on mobile gives no visual confirmation until the action completes.
// A slight press-scale on top makes the tap itself feel registered.
export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-[color,background-color,border-color,transform] hover:bg-primary-active active:scale-[0.97] active:bg-primary-active disabled:pointer-events-none disabled:opacity-50";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition-[color,background-color,border-color,transform] hover:bg-surface-hover active:scale-[0.97] active:bg-surface-hover disabled:pointer-events-none disabled:opacity-50";

export const buttonUtility =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-[color,background-color,border-color,transform] hover:bg-surface-hover active:scale-[0.97] active:bg-surface-hover disabled:pointer-events-none disabled:opacity-50";

export const buttonGhost =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-hover active:bg-surface-hover hover:text-ink active:text-ink";

export const pageHeading = "text-xl font-bold tracking-tight text-ink";

export const sectionHeading = "text-xs font-semibold uppercase tracking-wide text-ink-faint";

export const mutedText = "text-sm text-ink-muted";

export const emptyState =
  "flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-hairline bg-canvas-soft px-4 py-12 text-center";
