// A single filter option in a horizontally-scrollable pill row — the
// "All / Piscina / Cocina..." style filter used across Directory and Assets.
export function Pill({
  label,
  active,
  onClick,
  small,
  noShrink,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
  noShrink?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border font-medium transition-colors ${noShrink ? "shrink-0 whitespace-nowrap" : ""} ${
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-hairline bg-surface text-ink-muted hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}
