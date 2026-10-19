import type { LoanOverviewEmployee } from "@/lib/payroll-service/payroll";
import { formatCents, MONTHS_ES } from "@/lib/planilla/payroll-period";
import { formatDisplayDate } from "@/lib/planilla/format-date";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function periodLabel(p: { year: number; month: number; half: 1 | 2 }): string {
  return `${MONTHS_ES[p.month - 1]} ${p.year} · ${p.half === 1 ? "1ra" : "2da"} quincena`;
}

const CATEGORY = { prestamo: "Préstamo", adelanto: "Adelanto" } as const;

export interface StatementLine {
  label: string;
  /** + lo otorgado, − lo descontado */
  amountCents: number;
  balanceCents: number;
  scheduled: boolean;
}

/** Movimientos de un préstamo en orden, con el saldo después de cada uno.
 *  Solo los descuentos ya realizados (quincena pagada) bajan el saldo; los
 *  programados se listan aparte como "Programado". */
export function statementLines(loan: LoanOverviewEmployee["loans"][number]): StatementLine[] {
  const lines: StatementLine[] = [
    { label: `${CATEGORY[loan.category]} otorgado (${formatDisplayDate(loan.requestDate)})`, amountCents: loan.principalCents, balanceCents: loan.principalCents, scheduled: false },
  ];
  let balance = loan.principalCents;
  for (const i of loan.installments.filter((x) => x.paid)) {
    balance -= i.amountCents;
    lines.push({ label: `Descuento — ${periodLabel(i.period)}`, amountCents: -i.amountCents, balanceCents: balance, scheduled: false });
  }
  for (const i of loan.installments.filter((x) => !x.paid)) {
    lines.push({ label: `Descuento programado — ${periodLabel(i.period)}`, amountCents: -i.amountCents, balanceCents: balance, scheduled: true });
  }
  return lines;
}

/** Documento HTML independiente (para abrir en una pestaña e imprimir o
 *  guardar como PDF): estado de cuenta de TODOS los préstamos del empleado,
 *  o de uno solo si se pasa `loanId`. */
export function loanStatementHtml(row: LoanOverviewEmployee, today: string, loanId?: string): string {
  const loans = loanId ? row.loans.filter((l) => l.id === loanId) : row.loans.filter((l) => l.status === "active");
  const lent = loans.reduce((s, l) => s + l.principalCents, 0);
  const paid = loans.reduce((s, l) => s + l.paidCents, 0) + (loanId ? 0 : row.unlinkedPaidCents);
  const balance = lent - paid;

  const sections = loans
    .map((l) => {
      const lines = statementLines(l);
      const rows = lines
        .map(
          (ln) => `<tr class="${ln.scheduled ? "sched" : ""}">
            <td>${esc(ln.label)}</td>
            <td class="num">${ln.amountCents >= 0 ? "" : "−"}${formatCents(Math.abs(ln.amountCents))}</td>
            <td class="num">${ln.scheduled ? "—" : formatCents(ln.balanceCents)}</td></tr>`
        )
        .join("");
      const pending = l.principalCents - l.paidCents;
      return `<h2>${CATEGORY[l.category]} de ${formatCents(l.principalCents)} — ${esc(formatDisplayDate(l.requestDate))}${l.status === "cancelled" ? " (cancelado)" : ""}</h2>
        <table><thead><tr><th>Concepto</th><th class="num">Monto</th><th class="num">Saldo</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td>Saldo pendiente de este ${l.category === "adelanto" ? "adelanto" : "préstamo"}</td><td></td><td class="num">${formatCents(pending)}</td></tr></tfoot></table>
        ${l.notes ? `<p class="note">${esc(l.notes)}</p>` : ""}`;
    })
    .join("");

  const unlinked =
    !loanId && row.unlinkedPaidCents > 0
      ? `<p class="note">Además se registraron descuentos por ${formatCents(row.unlinkedPaidCents)} que no están asociados a un préstamo en particular; ya están restados del saldo total.</p>`
      : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de cuenta — ${esc(row.employee.name)}</title>
<style>
  *{box-sizing:border-box} body{font:14px/1.45 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:32px auto;max-width:760px;padding:0 20px}
  h1{font-size:22px;margin:0} h2{font-size:15px;margin:26px 0 8px} .sub{color:#555;margin:2px 0 18px}
  .summary{display:flex;gap:12px;margin:14px 0} .box{flex:1;border:1px solid #ccc;border-radius:8px;padding:10px 12px}
  .box small{display:block;color:#555} .box b{font-size:18px}
  table{width:100%;border-collapse:collapse} th,td{padding:6px 8px;border-bottom:1px solid #e3e3e3;text-align:left} th{background:#f3f3f3;font-size:12px}
  .num{text-align:right;font-variant-numeric:tabular-nums} tfoot td{font-weight:700;border-top:2px solid #999}
  tr.sched td{color:#777;font-style:italic} .note{color:#555;font-size:12px}
  .sign{margin-top:48px;display:flex;gap:40px} .sign div{flex:1;border-top:1px solid #444;padding-top:4px;font-size:12px;color:#444}
  .actions{margin-bottom:16px} button{font:inherit;padding:6px 14px;border:1px solid #888;border-radius:6px;background:#fff;cursor:pointer}
  @media print{.actions{display:none} body{margin:0}}
</style></head><body>
<div class="actions"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<h1>Estado de cuenta de ${loanId ? "préstamo" : "préstamos"}</h1>
<p class="sub">${esc(row.employee.name)} · Emitido el ${esc(formatDisplayDate(today))}</p>
<div class="summary">
  <div class="box"><small>Total prestado</small><b>${formatCents(lent)}</b></div>
  <div class="box"><small>Total descontado</small><b>${formatCents(paid)}</b></div>
  <div class="box"><small>Saldo pendiente</small><b>${formatCents(balance)}</b></div>
</div>
${sections || "<p>No hay préstamos registrados.</p>"}${unlinked}
<div class="sign"><div>Firma del empleado</div><div>Fecha</div></div>
</body></html>`;
}
