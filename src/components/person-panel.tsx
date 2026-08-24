"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Phone, Mail, Cake, Send, Camera, FileText, Upload, X, Pencil } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { PrefToggle } from "@/components/pref-toggle";
import { Avatar } from "@/components/ui/avatar";
import {
  updateStaffHireDate,
  updatePersonInfo,
  addSalaryChange,
  sendInvite,
  uploadPersonAvatar,
  uploadStaffDocument,
  deleteStaffDocument,
  getStaffDocumentUrl,
} from "@/app/actions/admin";
import { telHref, whatsAppHref } from "@/lib/phone";
import { formatLongDate } from "@/lib/dates";
import { buttonGhost, buttonSecondary, input, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { PersonRow, NotifEvent, SalaryEntry, StaffDetails } from "@/components/directory-explorer";

export function PersonPanel({
  person,
  isSelf,
  isOwner,
  dict,
  locale,
  events,
  prefLookup,
  staffDetails,
  salaryHistory,
  onClose,
}: {
  person: PersonRow;
  isSelf: boolean;
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  events: NotifEvent[];
  prefLookup: Record<string, boolean>;
  staffDetails: StaffDetails;
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

  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadPersonAvatar.bind(null, person.id),
    null
  );
  const avatarInputRef = useRef<HTMLFormElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [editingDates, setEditingDates] = useState(false);
  const [datesPending, startDates] = useTransition();

  function handleSaveDates(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startDates(async () => {
      await updateStaffHireDate(person.id, formData);
      setEditingDates(false);
    });
  }

  const [editingContact, setEditingContact] = useState(false);
  const [contactPending, startContact] = useTransition();

  function handleSaveContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startContact(async () => {
      await updatePersonInfo(person.id, formData);
      setEditingContact(false);
    });
  }

  const [addingSalary, setAddingSalary] = useState(false);
  const [salaryPending, startSalary] = useTransition();

  function handleAddSalary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSalary(async () => {
      await addSalaryChange(person.id, formData);
      setAddingSalary(false);
    });
  }

  return (
    <SidePanel open onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {isOwner ? (
            <form ref={avatarInputRef} action={avatarAction}>
              <input
                ref={avatarFileRef}
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={() => avatarInputRef.current?.requestSubmit()}
              />
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarPending}
                aria-label={dict.directory.changePhoto}
                className="group relative flex size-11 shrink-0 items-center justify-center rounded-full disabled:pointer-events-none"
              >
                <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="md" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
                  <Camera className="size-4" />
                </span>
              </button>
            </form>
          ) : (
            <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="md" />
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">
              {person.full_name}
              {isSelf && <span className="ml-1.5 text-sm font-normal text-ink-faint">{dict.directory.you}</span>}
            </p>
            {avatarState?.error && <p className="text-sm text-status-overdue-fg">{avatarState.error}</p>}
          </div>
        </div>

        {(person.phone || person.email || canManage) && (
          <div className="rounded-lg border border-hairline bg-canvas-soft p-3.5 text-sm text-ink-secondary">
            {editingContact ? (
              <form onSubmit={handleSaveContact} className="space-y-2">
                {person.email && (
                  <p className="flex items-center gap-2.5 text-ink-faint">
                    <Mail className="size-4 shrink-0" /> {person.email}
                  </p>
                )}
                <Field label={dict.directory.nameLabel}>
                  <input name="full_name" defaultValue={person.full_name} required className={input} />
                </Field>
                <Field label={dict.directory.phoneLabel}>
                  <input type="tel" name="phone" defaultValue={person.phone ?? ""} className={input} />
                </Field>
                <Field label={dict.directory.roleLabel}>
                  <select name="role" defaultValue={person.role} className={input}>
                    <option value="staff">{dict.directory.staffOption}</option>
                    <option value="resident">{dict.directory.residentOption}</option>
                    <option value="owner">{dict.directory.ownerOption}</option>
                  </select>
                </Field>
                {canManageStaff && (
                  <Field label={dict.directory.birthDateLabel}>
                    <input
                      type="date"
                      name="birth_date"
                      defaultValue={staffDetails.birth_date ?? ""}
                      className={input}
                    />
                  </Field>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={contactPending} className={buttonSecondary}>
                    {contactPending ? dict.vendorForm.submitPending : dict.vendorForm.submitEdit}
                  </button>
                  <button type="button" onClick={() => setEditingContact(false)} className={buttonGhost}>
                    {dict.vendorForm.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  {person.phone && (
                    <p className="flex items-center gap-2.5">
                      <Phone className="size-4 shrink-0 text-ink-faint" /> {person.phone}
                    </p>
                  )}
                  {person.email && (
                    <p className="flex items-center gap-2.5">
                      <Mail className="size-4 shrink-0 text-ink-faint" /> {person.email}
                    </p>
                  )}
                  {canManageStaff && staffDetails.birth_date && (
                    <p className="flex items-center gap-2.5">
                      <Cake className="size-4 shrink-0 text-ink-faint" />{" "}
                      {formatLongDate(staffDetails.birth_date, locale)}
                    </p>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setEditingContact(true)}
                    aria-label={dict.vendorDetail.edit}
                    className={buttonGhost}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
            )}
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
          <div className="space-y-4 border-t border-hairline pt-4">
            <h3 className={sectionHeading}>{dict.directory.employmentLabel}</h3>

            {editingDates ? (
              <form onSubmit={handleSaveDates} className="space-y-2 rounded-lg border border-hairline p-3.5">
                <Field label={dict.directory.hireDateLabel}>
                  <input type="date" name="hire_date" defaultValue={staffDetails.hire_date ?? ""} className={input} />
                </Field>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={datesPending} className={buttonSecondary}>
                    {datesPending ? dict.vendorForm.submitPending : dict.vendorForm.submitEdit}
                  </button>
                  <button type="button" onClick={() => setEditingDates(false)} className={buttonGhost}>
                    {dict.vendorForm.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-hairline bg-canvas-soft p-3.5 text-sm">
                <p className="text-ink-secondary">
                  {staffDetails.hire_date
                    ? format(dict.directory.sinceLabel, { date: formatLongDate(staffDetails.hire_date, locale) })
                    : dict.directory.hireDateLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingDates(true)}
                  aria-label={dict.vendorDetail.edit}
                  className={buttonGhost}
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-ink">{dict.directory.salaryHistoryLabel}</h4>
              {salaryHistory.length > 0 ? (
                <ul className="space-y-1 text-sm text-ink-secondary">
                  {salaryHistory.map((entry, i) => (
                    <li key={entry.effective_date + i} className="flex items-center justify-between">
                      <span className={i === 0 ? "font-medium text-ink" : undefined}>${entry.salary.toFixed(2)}</span>
                      <span className="text-ink-faint">{formatLongDate(entry.effective_date, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-faint">{dict.directory.noSalaryHistory}</p>
              )}

              {addingSalary ? (
                <form onSubmit={handleAddSalary} className="space-y-2 rounded-lg border border-hairline p-3.5">
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={salaryPending} className={buttonSecondary}>
                      {salaryPending ? dict.vendorForm.submitPending : dict.directory.addSalaryChange}
                    </button>
                    <button type="button" onClick={() => setAddingSalary(false)} className={buttonGhost}>
                      {dict.vendorForm.cancel}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setAddingSalary(true)} className={buttonGhost}>
                  + {dict.directory.addButton}
                </button>
              )}
            </div>

            <StaffDocumentSection userId={person.id} idDocumentPath={staffDetails.id_document_path} dict={dict} />
          </div>
        )}

        {canManageStaff && (
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
        )}
      </div>
    </SidePanel>
  );
}

function StaffDocumentSection({
  userId,
  idDocumentPath,
  dict,
}: {
  userId: string;
  idDocumentPath: string | null;
  dict: Dictionary;
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadStaffDocument.bind(null, userId),
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [viewPending, startView] = useTransition();
  const [viewError, setViewError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  function handleView() {
    setViewError(null);
    startView(async () => {
      const result = await getStaffDocumentUrl(userId);
      if (result.error) setViewError(result.error);
      else if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete() {
    if (!window.confirm(dict.directory.deleteDocument + "?")) return;
    startDelete(async () => {
      await deleteStaffDocument(userId);
    });
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-ink">{dict.directory.idDocumentLabel}</h4>
      <form ref={formRef} action={uploadAction}>
        <input
          ref={fileRef}
          type="file"
          name="document"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </form>

      {idDocumentPath ? (
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas-soft p-3">
          <FileText className="size-4 shrink-0 text-ink-faint" />
          <span className="flex-1 truncate text-sm text-ink-secondary">{idDocumentPath.split("/").pop()}</span>
          <button
            type="button"
            onClick={handleView}
            disabled={viewPending}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {dict.directory.viewDocument}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadPending}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {dict.directory.replaceDocument}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePending}
            aria-label={dict.directory.deleteDocument}
            className="text-ink-faint hover:text-status-overdue-fg disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadPending}
          className={`w-full ${buttonSecondary} disabled:pointer-events-none disabled:opacity-50`}
        >
          <Upload className="size-3.5" />
          {uploadPending ? dict.vendorForm.submitPending : dict.directory.uploadDocument}
        </button>
      )}
      {uploadState?.error && <p className="text-sm text-status-overdue-fg">{uploadState.error}</p>}
      {viewError && <p className="text-sm text-status-overdue-fg">{viewError}</p>}
    </div>
  );
}
