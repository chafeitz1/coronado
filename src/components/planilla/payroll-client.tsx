"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import type {
  AuditoriaData,
  PayrollEmployee,
  PayrollEmployeeAnnualSummary,
  UpcomingObligations,
} from "@/lib/types/planilla";
import type { RegistroRow } from "@/lib/payroll-service/payroll";
import type { LoanRequestRow } from "@/lib/payroll-service/loan-requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/payroll-ui/tabs";
import { Button } from "@/components/payroll-ui/button";
import { DashboardView } from "@/components/planilla/dashboard-view";
import { AuditoriaView } from "@/components/planilla/auditoria-view";
import { SolicitudesView } from "@/components/planilla/solicitudes-view";
import { RegistroView } from "@/components/planilla/registro-view";
import { ResumenView } from "@/components/planilla/resumen-view";
import { EmployeeDetailSheet } from "@/components/planilla/employee-detail-sheet";
import { type ColumnKey, defaultVisibleColumns, REGISTRO_COLUMNS_STORAGE_KEY } from "@/components/planilla/registro-columns";

export type PayrollTab = "dashboard" | "registro" | "resumen" | "auditoria" | "solicitudes";

export type PayrollTabData =
  | { kind: "registro"; period: { year: number; month: number; half: 1 | 2 }; rows: RegistroRow[] }
  | { kind: "resumen"; rows: PayrollEmployeeAnnualSummary[] }
  | { kind: "auditoria"; data: AuditoriaData }
  | { kind: "dashboard"; rows: PayrollEmployeeAnnualSummary[]; obligations: UpcomingObligations }
  | { kind: "solicitudes"; requests: LoanRequestRow[] }
  | { kind: "error"; message: string };

/** Reads Registro's saved column visibility from localStorage (kept
 *  outside the component so the effect is a plain `if (x) setState(x)`). */
function readStoredColumns(): Record<ColumnKey, boolean> | null {
  try {
    const raw = window.localStorage.getItem(REGISTRO_COLUMNS_STORAGE_KEY);
    if (!raw) return null;
    return { ...defaultVisibleColumns(), ...(JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>) };
  } catch {
    return null;
  }
}

export function PayrollClient({
  employees,
  tab,
  year,
  data,
}: {
  employees: PayrollEmployee[];
  tab: PayrollTab;
  year: number;
  data: PayrollTabData;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = React.useTransition();
  // Auditoría entrega una función de exportar CSV cuando termina de cargar;
  // el botón vive en el encabezado de la página solo mientras esa pestaña
  // está activa.
  const [auditoriaExport, setAuditoriaExport] = React.useState<(() => void) | null>(null);
  // "Ver detalle" se abre desde Registro y desde Resumen Anual: el estado
  // vive acá para que ambos abran la misma hoja.
  const [detailEmployeeId, setDetailEmployeeId] = React.useState<string | null>(null);
  const activeEmployees = React.useMemo(() => employees.filter((e) => e.status === "ACTIVE"), [employees]);

  // Registro's "Columnas" choice lives here so it survives tab changes.
  const [visibleColumns, setVisibleColumns] = React.useState(defaultVisibleColumns);
  /* eslint-disable react-hooks/set-state-in-effect -- reads browser-only localStorage after hydration */
  React.useEffect(() => {
    const stored = readStoredColumns();
    if (stored) setVisibleColumns(stored);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      window.localStorage.setItem(REGISTRO_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {
      // storage unavailable (private mode) — the choice just won't persist
    }
  }, [visibleColumns]);

  function go(nextTab: PayrollTab, nextYear: number) {
    startNavigation(() => {
      router.push(`/finance/payroll?tab=${nextTab}&year=${nextYear}`, { scroll: false });
    });
  }
  const refresh = () => startNavigation(() => router.refresh());

  const tabLabel: Record<PayrollTab, string> = {
    dashboard: "Dashboard",
    registro: "Registro",
    resumen: "Resumen Anual",
    auditoria: "Auditoría",
    solicitudes: "Solicitudes",
  };

  return (
    <Tabs value={tab} onValueChange={(v) => go(v as PayrollTab, year)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          {(Object.keys(tabLabel) as PayrollTab[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {tabLabel[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-3">
          {navigating && <span className="text-xs text-muted-foreground">Cargando…</span>}
          {tab === "auditoria" && (
            <Button size="sm" variant="outline" onClick={() => auditoriaExport?.()} disabled={!auditoriaExport}>
              <Download />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      <div className={navigating ? "pt-4 opacity-60 transition-opacity" : "pt-4"}>
        {data.kind === "error" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">No se pudo cargar esta sección.</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{data.message}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={refresh}>
              Reintentar
            </Button>
          </div>
        )}
        {data.kind === "registro" && (
          <TabsContent value="registro" forceMount className="m-0">
            <RegistroView
              employees={activeEmployees}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              onViewDetail={setDetailEmployeeId}
              initialRegistro={{ period: data.period, rows: data.rows }}
            />
          </TabsContent>
        )}
        {data.kind === "resumen" && (
          <TabsContent value="resumen" forceMount className="m-0">
            <ResumenView
              rows={data.rows}
              year={year}
              onYearChange={(y) => go("resumen", y)}
              onViewDetail={setDetailEmployeeId}
              onRefresh={refresh}
            />
          </TabsContent>
        )}
        {data.kind === "auditoria" && (
          <TabsContent value="auditoria" forceMount className="m-0">
            <AuditoriaView data={data.data} year={year} onYearChange={(y) => go("auditoria", y)} onExportReady={setAuditoriaExport} />
          </TabsContent>
        )}
        {data.kind === "dashboard" && (
          <TabsContent value="dashboard" forceMount className="m-0">
            <DashboardView rows={data.rows} obligations={data.obligations} year={year} onYearChange={(y) => go("dashboard", y)} />
          </TabsContent>
        )}
        {data.kind === "solicitudes" && (
          <TabsContent value="solicitudes" forceMount className="m-0">
            <SolicitudesView employees={activeEmployees} requests={data.requests} />
          </TabsContent>
        )}
      </div>

      <EmployeeDetailSheet
        employee={employees.find((e) => e.id === detailEmployeeId) ?? null}
        year={year}
        open={detailEmployeeId !== null}
        onOpenChange={(open) => !open && setDetailEmployeeId(null)}
      />
    </Tabs>
  );
}
