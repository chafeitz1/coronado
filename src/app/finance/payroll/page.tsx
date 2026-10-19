import { requireOwner } from "@/lib/auth";
import { getPayrollEmployees } from "@/lib/payroll-service/employees";
import { getLoanRequests } from "@/lib/payroll-service/loan-requests";
import { getAnnualSummary, getAuditoriaData, getLoansOverview, getPlanillaOverview, getRegistroForPeriod } from "@/lib/payroll-service/payroll";
import { PayrollClient, type PayrollTab, type PayrollTabData } from "@/components/planilla/payroll-client";
import { currentPeriod } from "@/lib/planilla/payroll-period";
import { mutedText, pageHeading } from "@/lib/ui";

export const dynamic = "force-dynamic";

const TABS: PayrollTab[] = ["dashboard", "registro", "resumen", "auditoria", "solicitudes"];

/**
 * Cada pestaña trae sus datos con la página (Server Component), igual que
 * Registro: cambiar de pestaña o de año es una navegación (`?tab=…&year=…`).
 * Antes cada pestaña pedía sus datos con server actions, que Next despacha
 * de una en una y que se quedaban en cola.
 */
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ tab?: string; year?: string; section?: string }> }) {
  await requireOwner();
  const params = await searchParams;
  const period = currentPeriod();
  // "prestamos" ahora vive dentro de Resumen Anual (como "Historial de préstamos").
  const asksLoans = params.tab === "prestamos" || params.section === "prestamos";
  const tab: PayrollTab = asksLoans ? "resumen" : TABS.includes(params.tab as PayrollTab) ? (params.tab as PayrollTab) : "registro";
  const parsedYear = Number(params.year);
  const year = Number.isInteger(parsedYear) && parsedYear > 2000 && parsedYear < 2100 ? parsedYear : period.year;

  let employees: Awaited<ReturnType<typeof getPayrollEmployees>> = [];
  let data: PayrollTabData;
  try {
    const employeesPromise = getPayrollEmployees();
    switch (tab) {
      case "registro": {
        const [emps, rows] = await Promise.all([employeesPromise, getRegistroForPeriod(period.year, period.month, period.half)]);
        employees = emps;
        data = { kind: "registro", period, rows };
        break;
      }
      case "resumen": {
        const [emps, rows, loans] = await Promise.all([employeesPromise, getAnnualSummary(year), getLoansOverview()]);
        employees = emps;
        data = { kind: "resumen", rows, loans, section: asksLoans ? "prestamos" : "empleados" };
        break;
      }
      case "auditoria": {
        const [emps, auditoria] = await Promise.all([employeesPromise, getAuditoriaData(year)]);
        employees = emps;
        data = { kind: "auditoria", data: auditoria };
        break;
      }
      case "dashboard": {
        const [emps, overview] = await Promise.all([employeesPromise, getPlanillaOverview(year)]);
        employees = emps;
        data = { kind: "dashboard", rows: overview.rows, obligations: overview.obligations };
        break;
      }
      default: {
        const [emps, requests] = await Promise.all([employeesPromise, getLoanRequests()]);
        employees = emps;
        data = { kind: "solicitudes", requests };
      }
    }
  } catch (e) {
    // Mostrar el error real en vez de una página en blanco o un spinner eterno.
    console.error("planilla page failed", e);
    data = { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className={pageHeading}>Planilla</h1>
        <p className={mutedText}>Registro de quincenas, resumen anual y auditoría — con décimo, vacación, prima y préstamos.</p>
      </div>
      <PayrollClient employees={employees} tab={tab} year={year} data={data} />
    </div>
  );
}
