import type { LucideIcon } from "lucide-react";
import { emptyState, mutedText } from "@/lib/ui";

export function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className={emptyState}>
      <Icon className="size-6 text-ink-faint" strokeWidth={1.5} />
      <p className={mutedText}>{message}</p>
    </div>
  );
}
