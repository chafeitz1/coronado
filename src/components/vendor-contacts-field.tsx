"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { input as inputClass, label as labelClass, buttonSecondary } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface VendorContactValue {
  contact_name: string;
  role_label: string;
  phone: string;
  email: string;
}

const emptyContact: VendorContactValue = { contact_name: "", role_label: "", phone: "", email: "" };

export function VendorContactsField({
  defaultValue = [],
  dict,
}: {
  defaultValue?: VendorContactValue[];
  dict: Dictionary;
}) {
  const [contacts, setContacts] = useState<VendorContactValue[]>(
    defaultValue.length > 0 ? defaultValue : [emptyContact]
  );

  function update(i: number, field: keyof VendorContactValue, value: string) {
    setContacts((cs) => cs.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  return (
    <div className="space-y-2">
      <label className={labelClass}>{dict.vendorForm.contactsLabel}</label>
      <div className="space-y-3">
        {contacts.map((c, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-hairline bg-canvas-soft p-3">
            <div className="flex items-center gap-2">
              <input
                name="contact_name"
                value={c.contact_name}
                onChange={(e) => update(i, "contact_name", e.target.value)}
                placeholder={dict.vendorForm.contactNamePlaceholder}
                className={inputClass}
              />
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setContacts((cs) => cs.filter((_, idx) => idx !== i))}
                  aria-label={dict.vendorForm.removeContact}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover active:bg-surface-hover hover:text-status-overdue-fg"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <input
              name="role_label"
              value={c.role_label}
              onChange={(e) => update(i, "role_label", e.target.value)}
              placeholder={dict.vendorForm.contactRolePlaceholder}
              className={inputClass}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                name="contact_phone"
                value={c.phone}
                onChange={(e) => update(i, "phone", e.target.value)}
                placeholder={dict.vendorForm.contactPhonePlaceholder}
                className={inputClass}
              />
              <input
                type="email"
                name="contact_email"
                value={c.email}
                onChange={(e) => update(i, "email", e.target.value)}
                placeholder={dict.vendorForm.contactEmailPlaceholder}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setContacts((cs) => [...cs, emptyContact])}
        className={`${buttonSecondary} w-full`}
      >
        <Plus className="size-3.5" /> {dict.vendorForm.addContact}
      </button>
    </div>
  );
}
