"use client";

import { useState, useTransition } from "react";
import { Phone, Send } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { PrefToggle } from "@/components/pref-toggle";
import { Avatar } from "@/components/ui/avatar";
import { updateStaffHireDate, addSalaryChange, sendInvite } from "@/app/actions/admin";
import { telHref, whatsAppHref } from "@/lib/phone";
import { buttonSecondary, input, sectionHeading } from "@/lib/ui";
import { type Dictionary } from "@/lib/i18n/dictionaries";
import type { PersonRow, NotifEvent, SalaryEntry } from "@/components/directory-explorer";

export function PersonPanel({
  person,
  isSelf,
  isOwner,
  dict,
  events,
  prefLookup,
  hireDate,
  salaryHistory,
  onClose,
}: {
  person: PersonRow;
  isSelf: boolean;
  isOwner: boolean;
  dict: Dictionary;
  events: NotifEvent[];
  prefLookup: Record<string, boolean>;
  hireDate: string | null;
  salaryHistory: SalaryEntry[];
  onClose: () => void;
}) {
  const canManage = isOwner && !isSelf;
  const canManageStaff = canManage && person.role === "staff";

  const [invitePending, startInvite] = useTransition();
  const [inviteResult, setInviteResult] = useState<"error" | "sent" | null>(null);

  function handleSendInvite() {
    setInviteResult(null);
    startInvite(async () => {
      const result = await sendInvite(person.id);
      setInviteResult(result.error ? "error" : "sent");
    });
  }

  return (
    <SidePanel open onClose={onClose} title={person.full_name}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="md" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">
              {person.full_name}
              {isSelf && <span className="ml-1.5 text-sm font-normal text-ink-faint">{dict.directory.you}</span>}
            </p>
          </div>
        </div>

        {person.phone && (
          <div className="space-y-2 rounded-lg border border-hairline bg-canvas-soft p-3.5 text-sm text-ink-secondary">
            <p className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-ink-faint" /> {person.phone}
            </p>
          </div>
        )}

        {person.phone && (
          <div className="flex gap-2">
            <a href={telHref(person.phone)} className={`flex-1 ${buttonSecondary}`}>
              <Phone className="size-3.5" /> {dict.vendorDetail.call}
            </a>
            <a
              href={whatsAppHref(person.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 ${buttonSecondary}`}
            >
              <WhatsAppIcon className="size-3.5" /> {dict.vendorDetail.whatsapp}
            </a>
          </div>
        )}

        {canManage && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleSendInvite}
              disabled={invitePending}
              className={`w-full ${buttonSecondary} disabled:pointer-events-none disabled:opacity-50`}
            >
              <Send className="size-3.5" />
              {invitePending ? dict.directory.sendInvitePending : dict.directory.sendInvite}
            </button>
            {inviteResult === "sent" && <p className="text-sm text-ink-secondary">{dict.directory.inviteSent}</p>}
            {inviteResult === "error" && <p className="text-sm text-status-overdue-fg">{dict.directory.inviteError}</p>}
          </div>
        )}

        {canManageStaff && (
          <>
            <div className="space-y-1.5 border-t border-hairline pt-4">
              <h3 className={sectionHeading}>{dict.directory.hireDateLabel}</h3>
              <form action={updateStaffHireDate.bind(null, person.id)} className="flex flex-wrap items-end gap-2">
                <input type="date" name="hire_date" defaultValue={hireDate ?? ""} className={input} />
                <SubmitButton className={buttonSecondary} pendingLabel={dict.vendorForm.submitPending}>
                  {dict.vendorForm.submit}
                </SubmitButton>
              </form>
            </div>

            <div className="space-y-2">
              <h3 className={sectionHeading}>{dict.directory.salaryHistoryLabel}</h3>
              {salaryHistory.length > 0 ? (
                <ul className="space-y-1 text-sm text-ink-secondary">
                  {salaryHistory.map((entry, i) => (
                    <li key={entry.effective_date + i} className="flex items-center justify-between">
                      <span className={i === 0 ? "font-medium text-ink" : undefined}>${entry.salary.toFixed(2)}</span>
                      <span className="text-ink-faint">{entry.effective_date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-faint">{dict.directory.noSalaryHistory}</p>
              )}
              <form action={addSalaryChange.bind(null, person.id)} className="flex flex-wrap items-end gap-2 pt-1">
                <Field label={dict.directory.salaryLabel}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="salary"
                    required
                    placeholder={dict.directory.salaryPlaceholder}
                    className={input}
                  />
                </Field>
                <Field label={dict.directory.effectiveDateLabel}>
                  <input type="date" name="effective_date" className={input} />
                </Field>
                <SubmitButton className={buttonSecondary} pendingLabel={dict.vendorForm.submitPending}>
                  {dict.directory.addSalaryChange}
                </SubmitButton>
              </form>
            </div>

            <div className="space-y-2">
              <h3 className={sectionHeading}>{dict.directory.notifications}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-faint">
                      <th className="pb-2 font-normal">{dict.directory.eventHeader}</th>
                      <th className="pb-2 font-normal">{dict.directory.pushHeader}</th>
                      <th className="pb-2 font-normal">{dict.directory.emailHeader}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {events.map((event) => (
                      <tr key={event.key}>
                        <td className="py-2 text-ink-secondary">{event.label}</td>
                        <td className="py-2">
                          <PrefToggle
                            userId={person.id}
                            eventType={event.key}
                            channel="push"
                            defaultEnabled={prefLookup[`${person.id}:${event.key}:push`] ?? true}
                          />
                        </td>
                        <td className="py-2">
                          <PrefToggle
                            userId={person.id}
                            eventType={event.key}
                            channel="email"
                            defaultEnabled={prefLookup[`${person.id}:${event.key}:email`] ?? true}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SidePanel>
  );
}
