"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Pencil, Trash2, Phone, Mail, User as UserIcon, Building2, Siren, Camera, X } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { VendorForm } from "@/components/vendor-form";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { createVendor, updateVendor, deleteVendor, uploadVendorAvatar } from "@/app/actions/vendors";
import { telHref, whatsAppHref } from "@/lib/phone";
import { buttonSecondary, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { VendorTrade } from "@/lib/types/database";
import type { VendorRow } from "@/components/directory-explorer";

export type VendorPanelMode = "create" | "view" | "edit";

const VENDOR_AVATAR_SIZES = {
  sm: { wrap: "size-11", icon: "size-5", px: 44 },
  lg: { wrap: "size-14", icon: "size-6", px: 56 },
} as const;

export function VendorAvatar({
  avatarUrl,
  size = "sm",
}: {
  avatarUrl: string | null;
  size?: keyof typeof VENDOR_AVATAR_SIZES;
}) {
  const { wrap, icon, px } = VENDOR_AVATAR_SIZES[size];
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={px}
        height={px}
        className={`shrink-0 rounded-full object-cover ${wrap}`}
        unoptimized
      />
    );
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary ${wrap}`}>
      <Building2 className={icon} strokeWidth={2} />
    </span>
  );
}

export function VendorPanel({
  mode: initialMode,
  vendor,
  dict,
  isOwner,
  existingTrades,
  onClose,
}: {
  mode: VendorPanelMode;
  vendor: VendorRow | null;
  dict: Dictionary;
  isOwner: boolean;
  existingTrades: VendorTrade[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<VendorPanelMode>(initialMode);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createState, createAction] = useActionState(createVendor, null);
  const [updateState, updateAction] = useActionState(
    vendor ? updateVendor.bind(null, vendor.id) : createVendor,
    null
  );

  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadVendorAvatar.bind(null, vendor?.id ?? ""),
    null
  );
  const avatarFormRef = useRef<HTMLFormElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createState?.ok) onClose();
  }, [createState, onClose]);

  useEffect(() => {
    if (updateState?.ok) onClose();
  }, [updateState, onClose]);

  function handleDelete() {
    if (!vendor) return;
    if (!window.confirm(format(dict.vendorDetail.deleteConfirm, { name: vendor.name }))) return;
    startDelete(async () => {
      const result = await deleteVendor(vendor.id);
      if (result.error) setDeleteError(result.error);
      else onClose();
    });
  }

  // View mode shows the vendor's icon + name in the body instead — no need
  // to repeat it in the panel header too.
  const title = mode === "create" ? dict.vendorForm.title : mode === "edit" ? dict.vendorForm.editTitle : undefined;

  return (
    <SidePanel open onClose={onClose} title={title} hideClose={mode === "view"}>
      {mode === "create" && (
        <VendorForm
          action={createAction}
          submitLabel={dict.vendorForm.submit}
          dict={dict}
          existingTrades={existingTrades}
          error={createState && !createState.ok ? createState.error : undefined}
          onCancel={onClose}
        />
      )}

      {mode === "edit" && vendor && (
        <VendorForm
          action={updateAction}
          submitLabel={dict.vendorForm.submitEdit}
          dict={dict}
          existingTrades={existingTrades}
          defaultValues={{
            ...vendor,
            contacts: vendor.contacts.map((c) => ({
              contact_name: c.contact_name ?? "",
              role_label: c.role_label ?? "",
              phone: c.phone ?? "",
              email: c.email ?? "",
            })),
          }}
          error={updateState && !updateState.ok ? updateState.error : undefined}
          onCancel={() => setMode("view")}
        />
      )}

      {mode === "view" && vendor && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {isOwner ? (
              <form ref={avatarFormRef} action={avatarAction}>
                <input
                  ref={avatarFileRef}
                  type="file"
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={() => avatarFormRef.current?.requestSubmit()}
                />
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarPending}
                  aria-label={dict.directory.changePhoto}
                  className="group relative flex size-14 shrink-0 items-center justify-center rounded-full disabled:pointer-events-none"
                >
                  <VendorAvatar avatarUrl={vendor.avatar_url} size="lg" />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
                    <Camera className="size-4" />
                  </span>
                </button>
              </form>
            ) : (
              <VendorAvatar avatarUrl={vendor.avatar_url} size="lg" />
            )}
            <div className="min-w-0 flex-1">
              {/* Edit/delete/close all live in this one row (instead of a
                  separate floating close "X" plus bordered buttons further
                  down) so they're guaranteed to sit on the same line. */}
              <div className="flex items-center gap-1.5">
                <p className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{vendor.name}</p>
                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode("edit")}
                      title={dict.vendorDetail.edit}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-canvas-soft hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deletePending}
                      title={dict.vendorDetail.delete}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-status-overdue-bg hover:text-status-overdue-fg disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  title={dict.vendorDetail.close}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-canvas-soft hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {avatarState?.error && <p className="mt-1 text-sm text-status-overdue-fg">{avatarState.error}</p>}
              {deleteError && <p className="mt-1 text-sm text-status-overdue-fg">{deleteError}</p>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {vendor.is_emergency && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-overdue-fg px-2.5 py-0.5 text-xs font-semibold text-white">
                    <Siren className="size-3" /> {dict.directory.emergencyBadge}
                  </span>
                )}
                {vendor.trades.map((t) => (
                  <span key={t} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    {t}
                  </span>
                ))}
                {vendor.trades.length === 0 && !vendor.is_emergency && (
                  <span className="text-xs text-ink-faint">{dict.directory.noSpecialty}</span>
                )}
              </div>
            </div>
          </div>

          {vendor.contacts.length > 0 ? (
            <div className="space-y-3">
              {vendor.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="space-y-2 rounded-lg border border-hairline bg-canvas-soft p-3.5 text-sm text-ink-secondary"
                >
                  {(contact.contact_name || contact.role_label) && (
                    <p className="flex items-center gap-2.5 font-medium text-ink">
                      <UserIcon className="size-4 shrink-0 text-ink-faint" />
                      {[contact.contact_name, contact.role_label].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {contact.phone && (
                    <p className="flex items-center gap-2.5">
                      <Phone className="size-4 shrink-0 text-ink-faint" /> {contact.phone}
                    </p>
                  )}
                  {contact.email && (
                    <p className="flex items-center gap-2.5">
                      <Mail className="size-4 shrink-0 text-ink-faint" /> {contact.email}
                    </p>
                  )}
                  {(contact.phone || contact.email) && (
                    <div className="flex gap-2 pt-1">
                      {contact.phone && (
                        <a href={telHref(contact.phone)} className={`flex-1 ${buttonSecondary}`}>
                          <Phone className="size-3.5" /> {dict.vendorDetail.call}
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={whatsAppHref(contact.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 ${buttonSecondary}`}
                        >
                          <WhatsAppIcon className="size-3.5" /> {dict.vendorDetail.whatsapp}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className={`flex-1 ${buttonSecondary}`}>
                          <Mail className="size-3.5" /> {dict.vendorDetail.email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">{dict.directory.noContacts}</p>
          )}

          {vendor.notes && (
            <div className="space-y-1.5">
              <h3 className={sectionHeading}>{dict.vendorDetail.notesTitle}</h3>
              <p className="text-sm leading-relaxed text-ink-secondary">{vendor.notes}</p>
            </div>
          )}

        </div>
      )}
    </SidePanel>
  );
}
