// The horizontal lockup (tree+pier symbol + "BONSAI" wordmark) — the kit's
// own usage guide calls this the pick for headers. Bronze-on-light only;
// add a light-on-dark path here if a dark-background spot needs one.
export function Logo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate
  return <img src="/brand/bonsai-logo-principal-bronce.svg" alt="Bonsai" className={className} />;
}
