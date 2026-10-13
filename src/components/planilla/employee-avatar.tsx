import { employeeAccentColor } from "@/lib/planilla/payroll-colors";

/** Small colored initial-letter circle -- an employee's identity
 *  marker, shown next to their name in Registro's table, Resumen
 *  Anual's cards, Dashboard and Auditoría. Same color everywhere
 *  (see employeeAccentColor's own comment on why it's keyed off
 *  `sortOrder`, not the id or list position). */
export function EmployeeAvatar({
  name,
  employeeId,
  sortOrder,
  size = "sm",
}: {
  name: string;
  employeeId: string;
  sortOrder: number;
  size?: "sm" | "md";
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const dims = size === "md" ? "size-10 text-sm" : "size-7 text-[11px]";
  return (
    <div
      data-employee-id={employeeId}
      title={name}
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: employeeAccentColor(sortOrder) }}
    >
      {initial}
    </div>
  );
}
