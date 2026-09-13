"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createPurchaseItem } from "@/app/actions/purchase-items";
import { buttonPrimary, buttonSecondary, input } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { PurchaseItemListType } from "@/lib/types/database";

// Fields stay controlled (rather than an uncontrolled form + formRef.reset())
// so a successful add can clear title/quantity/notes but keep list_type as
// the staff member left it — the described flow is adding several groceries
// (or several urgent asks) back to back, not one item then closing the panel.
// Calls the action directly from the form's action handler (same pattern as
// AssetPanel's handleCreate) instead of useActionState + a response effect,
// since resetting the fields is a direct response to the submit itself.
export function NewPurchaseItemPanel({ dict, onClose }: { dict: Dictionary; onClose: () => void }) {
  const [listType, setListType] = useState<PurchaseItemListType>("groceries");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [addedCount, setAddedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearImage() {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await createPurchaseItem(null, formData);
    if (result?.ok) {
      setTitle("");
      setQuantity("");
      setNotes("");
      clearImage();
      setAddedCount((n) => n + 1);
    } else if (result && !result.ok) {
      setError(result.error);
    }
  }

  return (
    <SidePanel open onClose={onClose} title={dict.purchases.addItem}>
      <form action={handleSubmit} className="space-y-4">
        <div className="inline-flex w-full rounded-md border border-hairline bg-canvas-soft p-1">
          {(["groceries", "urgent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setListType(t)}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                listType === t ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-muted"
              }`}
            >
              {t === "groceries" ? dict.purchases.groceries : dict.purchases.urgent}
            </button>
          ))}
        </div>
        <input type="hidden" name="list_type" value={listType} />

        <Field label={dict.purchases.itemLabel}>
          <input
            name="title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </Field>

        <Field label={dict.purchases.quantityLabel}>
          <input
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={dict.purchases.quantityPlaceholder}
            className={input}
          />
        </Field>

        <Field label={dict.purchases.notesLabel}>
          <textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
        </Field>

        <Field label={dict.purchases.imageLabel}>
          <div className="flex items-center gap-3">
            {imagePreview ? (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-hairline">
                <Image src={imagePreview} alt="" fill unoptimized className="object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label={dict.purchases.removePhoto}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonSecondary}>
                <ImagePlus className="size-4" /> {dict.purchases.addPhoto}
              </button>
            )}
            <input
              ref={fileInputRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>
        </Field>

        {error && <p className="text-sm text-status-overdue-fg">{error}</p>}
        {addedCount > 0 && <p className="text-sm text-status-done-fg">{format(dict.purchases.itemsAdded, { count: addedCount })}</p>}

        <SubmitButton className={`w-full ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.purchases.addAnother}
        </SubmitButton>
      </form>
    </SidePanel>
  );
}
