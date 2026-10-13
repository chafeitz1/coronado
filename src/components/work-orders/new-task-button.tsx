"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { DisplayMode } from "@/components/view-switcher";
import { NewWorkOrderPanel } from "./new-work-order-panel";
import { buttonPrimary } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// List/To Do view keeps navigating to the standalone /work-orders/new page
// — it renders inline in the split's detail column, same as viewing any
// other task there. Table/Calendar/Board take over the whole page instead
// of splitting it, so that route has nowhere to render into; those open the
// side panel instead of navigating away and losing the current ?display=.
export function NewTaskButton({ dict, isOwner }: { dict: Dictionary; isOwner: boolean }) {
  const searchParams = useSearchParams();
  const display = ((searchParams.get("display") as DisplayMode) ?? "list") as DisplayMode;
  const [open, setOpen] = useState(false);

  if (display === "list") {
    return (
      <Link href="/work-orders/new" className={buttonPrimary}>
        <Plus className="size-4" /> {dict.workOrders.newTask}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonPrimary}>
        <Plus className="size-4" /> {dict.workOrders.newTask}
      </button>
      {open && <NewWorkOrderPanel dict={dict} isOwner={isOwner} onClose={() => setOpen(false)} />}
    </>
  );
}
