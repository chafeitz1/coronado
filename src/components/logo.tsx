// The horizontal lockup (tree+pier symbol + "BONSAI" wordmark) — the kit's
// own usage guide calls this the pick for headers. Swaps to the white
// lockup under the app's dark theme (globals.css's prefers-color-scheme
// block) since bronze-on-dark-canvas reads low-contrast; both live in the
// same spot so the two stay in sync as this renders. Callers that already
// sit on a fixed light background (e.g. the login card's photo backdrop)
// should keep using the bronze mark directly instead of this component.
export function Logo({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate */}
      <img
        src="/brand/bonsai-logo-principal-bronce.svg"
        alt="Bonsai"
        className={`dark:hidden ${className ?? ""}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate */}
      <img
        src="/brand/bonsai-logo-principal-blanco.png"
        alt="Bonsai"
        className={`hidden dark:block ${className ?? ""}`}
      />
    </>
  );
}
