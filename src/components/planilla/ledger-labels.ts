import type { LedgerCategory } from "@/lib/types/planilla";

/** Shared between ledger-section.tsx (the list) and
 *  ledger-entry-dialog.tsx (the add form) — kept in its own module
 *  rather than exported from either so neither has to import from the
 *  other (which would create a circular import between them). */
export const LEDGER_CATEGORY_LABEL: Record<LedgerCategory, string> = {
  prestamo: "Préstamo",
  adelanto: "Adelanto",
  seguro_social: "Seguro Social",
  carnet: "Carnet",
  otro: "Otro",
};

/** Categories the generic "Agregar movimiento" dialog offers --
 *  préstamo/adelanto are deliberately excluded (2026-08-28): those two
 *  now go through LoanDialog instead, which builds their installment
 *  schedule and auto-applies it to future quincenas -- adding one
 *  through the generic dialog would just be an unscheduled, un-applied
 *  ledger row with none of that. */
export const GENERIC_LEDGER_CATEGORIES: LedgerCategory[] = ["seguro_social", "carnet", "otro"];
