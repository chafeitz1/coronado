"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/payroll-ui/dialog";
import { Button } from "@/components/payroll-ui/button";

/**
 * The standard wrapper for any "add / edit a record" dialog in Atlas —
 * title, description, a scrollable body for form fields, and a
 * consistent Cancel/Submit footer. Modules pass their own fields as
 * children and their own submit handler; this owns nothing about form
 * state itself (pair it with the Form primitives in components/ui/form).
 */
export function FormDialog({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  onSubmit,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  submitting = false,
  children,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* No inner max-height cap — DialogContent is now a full-height
            slide-over (see payroll-ui/dialog.tsx), not a centered modal
            with limited vertical room, so the body can grow and the
            panel's own scroll handles overflow. */}
        <div className="flex flex-1 flex-col gap-4 py-1">{children}</div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            {cancelLabel}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
