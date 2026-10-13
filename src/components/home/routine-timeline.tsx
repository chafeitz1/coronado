"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, ListChecks, Pencil } from "lucide-react";
import { setGuestsPresent } from "@/app/actions/routine";
import { RoutineEditorPanel } from "./routine-editor-panel";
import { buttonGhost, card, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { RoutineItem } from "./types";

const HOUSE_TIMEZONE = "America/Panama";

function currentMinutes() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  return hour * 60 + minute;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Read-only for everyone (including the owner, outside the edit panel) —
// a reminder board, not another place to manage tasks. "Now" is recomputed
// every minute so the highlighted/dimmed rows stay accurate on a screen
// left open rather than only at page load.
export function RoutineTimeline({
  items,
  guestsPresent,
  isOwner,
  dict,
}: {
  items: RoutineItem[];
  guestsPresent: boolean;
  isOwner: boolean;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(currentMinutes);

  useEffect(() => {
    const id = setInterval(() => setNowMinutes(currentMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));
  // Everything before the next item still to come reads as "already
  // happened" (dimmed); that one item is the current focus (highlighted);
  // the rest are "later" (normal weight).
  const nextIndex = sorted.findIndex((item) => toMinutes(item.time) > nowMinutes);

  function toggleGuests() {
    startTransition(async () => {
      await setGuestsPresent(!guestsPresent);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between gap-3 p-4 ${card}`}>
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              guestsPresent ? "bg-primary-soft text-primary" : "bg-canvas-soft text-ink-faint"
            }`}
          >
            <Clock className="size-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{dict.routine.guestsPresentLabel}</p>
            <p className={mutedText}>{guestsPresent ? dict.routine.guestsPresentOn : dict.routine.guestsPresentOff}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={guestsPresent}
          disabled={pending}
          onClick={toggleGuests}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            guestsPresent ? "bg-primary" : "bg-canvas-soft"
          }`}
        >
          <span
            className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform ${
              guestsPresent ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {isOwner && (
        <button type="button" onClick={() => setEditing(true)} className={`flex items-center gap-1.5 ${buttonGhost}`}>
          <Pencil className="size-3.5" /> {dict.routine.editTitle}
        </button>
      )}

      {!guestsPresent ? (
        <div className={`flex items-center gap-3 p-5 text-sm ${card}`}>
          <ListChecks className="size-5 shrink-0 text-ink-faint" />
          <p className="text-ink-secondary">{dict.routine.emptyNoGuests}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className={`flex items-center gap-3 p-5 text-sm ${card}`}>
          <ListChecks className="size-5 shrink-0 text-ink-faint" />
          <p className="text-ink-secondary">{dict.routine.emptyNoItems}</p>
        </div>
      ) : (
        <ol className={`divide-y divide-hairline overflow-hidden ${card}`}>
          {sorted.map((item, i) => {
            const past = nextIndex !== -1 && i < nextIndex;
            const isAllPast = nextIndex === -1;
            const current = i === nextIndex;
            return (
              <li
                key={item.id}
                className={`flex gap-3 p-4 ${past || isAllPast ? "opacity-50" : ""} ${current ? "bg-primary-soft/40" : ""}`}
              >
                <span
                  className={`w-14 shrink-0 font-mono text-sm ${current ? "font-semibold text-primary" : "text-ink-muted"}`}
                >
                  {item.time.slice(0, 5)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${current ? "text-ink" : "text-ink-secondary"}`}>{item.title}</p>
                  {item.steps && <p className={`mt-0.5 whitespace-pre-line text-xs ${mutedText}`}>{item.steps}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {editing && <RoutineEditorPanel items={sorted} dict={dict} onClose={() => setEditing(false)} />}
    </div>
  );
}
