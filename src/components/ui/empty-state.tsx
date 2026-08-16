import { emptyState, mutedText } from "@/lib/ui";

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className={emptyState}>
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <p className={mutedText}>{message}</p>
    </div>
  );
}
