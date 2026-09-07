"use client";

import { useFormStatus } from "react-dom";

// Dims + disables itself while its parent <form>'s action is in flight,
// same as SubmitButton — without this a delete tap (usually just an icon,
// no label to swap to a pending state) gave zero feedback until the row
// suddenly vanished.
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ""} disabled:pointer-events-none disabled:opacity-50`}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
