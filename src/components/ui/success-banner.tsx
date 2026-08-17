import { CheckCircle2 } from "lucide-react";

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-status-done-bg px-4 py-2.5 text-sm font-medium text-status-done-fg">
      <CheckCircle2 className="size-4 shrink-0" />
      {message}
    </div>
  );
}
