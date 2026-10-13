import { requireOwner } from "@/lib/auth";
import { getPayrollEmployees } from "@/lib/payroll-service/employees";
import { PayrollClient } from "@/components/planilla/payroll-client";
import { mutedText, pageHeading } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireOwner();
  const { tab } = await searchParams;
  const employees = (await getPayrollEmployees()).filter((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-5">
      <div>
        <h1 className={pageHeading}>Planilla</h1>
        <p className={mutedText}>Registro de quincenas, resumen anual y auditoría — con décimo, vacación, prima y préstamos.</p>
      </div>
      <PayrollClient employees={employees} initialTab={tab} />
    </div>
  );
}
