import { requireOwner } from "@/lib/auth";
import { getPayrollEmployees } from "@/lib/payroll-service/employees";
import { getRegistroForPeriod } from "@/lib/payroll-service/payroll";
import { currentPeriod } from "@/lib/planilla/payroll-period";
import { PayrollClient } from "@/components/planilla/payroll-client";
import { mutedText, pageHeading } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireOwner();
  const { tab } = await searchParams;
  // Registro es la pestaña por defecto: se carga ya en el servidor, en
  // paralelo con los empleados, para que la página abra con datos.
  const period = currentPeriod();
  const showsRegistro = !tab || tab === "registro";
  let employees: Awaited<ReturnType<typeof getPayrollEmployees>>;
  let registroRows: Awaited<ReturnType<typeof getRegistroForPeriod>> | null = null;
  try {
    [employees, registroRows] = await Promise.all([
      getPayrollEmployees(),
      showsRegistro ? getRegistroForPeriod(period.year, period.month, period.half) : Promise.resolve(null),
    ]);
  } catch (e) {
    // Mostrar el error real en vez de una página en blanco o un spinner eterno.
    console.error("planilla page failed", e);
    return (
      <div className="space-y-3">
        <h1 className={pageHeading}>Planilla</h1>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">No se pudo cargar la planilla.</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{e instanceof Error ? e.message : String(e)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className={pageHeading}>Planilla</h1>
        <p className={mutedText}>Registro de quincenas, resumen anual y auditoría — con décimo, vacación, prima y préstamos.</p>
      </div>
      <PayrollClient
        employees={employees}
        initialTab={tab}
        initialRegistro={registroRows ? { period, rows: registroRows } : null}
      />
    </div>
  );
}
