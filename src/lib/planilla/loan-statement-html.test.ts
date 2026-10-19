import { describe, expect, it } from "vitest";
import { loanStatementHtml, statementLines } from "@/lib/planilla/loan-statement-html";
import type { LoanOverviewEmployee } from "@/lib/payroll-service/payroll";

const row = {
  employee: { id: "e", name: "Ariel <Rivera>", status: "ACTIVE" },
  loans: [
    {
      id: "l1",
      category: "prestamo",
      requestDate: "2025-01-20",
      principalCents: 100000,
      status: "active",
      notes: null,
      paidCents: 30000,
      scheduledCents: 10000,
      installments: [
        { ledgerEntryId: "a", period: { year: 2025, month: 1, half: 2 }, amountCents: 20000, paid: true },
        { ledgerEntryId: "b", period: { year: 2025, month: 2, half: 2 }, amountCents: 10000, paid: true },
        { ledgerEntryId: "c", period: { year: 2025, month: 3, half: 2 }, amountCents: 10000, paid: false },
      ],
    },
  ],
  lentCents: 100000,
  paidCents: 30000,
  unlinkedPaidCents: 0,
  balanceCents: 70000,
} as unknown as LoanOverviewEmployee;

describe("estado de cuenta de préstamos", () => {
  it("el saldo baja solo con descuentos ya realizados", () => {
    const lines = statementLines(row.loans[0]);
    expect(lines.map((l) => l.balanceCents)).toEqual([100000, 80000, 70000, 70000]);
    expect(lines[3].scheduled).toBe(true);
  });
  it("escapa el nombre y muestra el saldo pendiente", () => {
    const html = loanStatementHtml(row, "2026-10-19");
    expect(html).toContain("Ariel &lt;Rivera&gt;");
    expect(html).toContain("$700.00");
  });
});
