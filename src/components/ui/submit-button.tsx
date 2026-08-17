"use client";

import { useFormStatus } from "react-dom";

// Disables + relabels itself while its parent <form>'s action is in
// flight, so a slow request can't be mistaken for "nothing happened" and
// mashed into duplicate submissions (this is what created 38 copies of
// the same vendor before this component existed).
export function SubmitButton({
  className,
  pendingLabel,
  children,
}: {
  className?: string;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
