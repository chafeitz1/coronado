"use client";

import * as React from "react";

import type { PayrollEmployee } from "@/lib/types/planilla";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/payroll-ui/tabs";
import { RegistroView } from "@/components/planilla/registro-view";
import { DashboardView } from "@/components/planilla/dashboard-view";
import { AuditoriaView } from "@/components/planilla/auditoria-view";
import { Button } from "@/components/payroll-ui/button";
import { Download } from "lucide-react";
import { SolicitudesView } from "@/components/planilla/solicitudes-view";
import { ResumenView } from "@/components/planilla/resumen-view";
import { EmployeeDetailSheet } from "@/components/planilla/employee-detail-sheet";
import { currentPeriod } from "@/lib/planilla/payroll-period";
import { type ColumnKey, defaultVisibleColumns, REGISTRO_COLUMNS_STORAGE_KEY } from "@/components/planilla/registro-columns";

const TABS = ["dashboard", "registro", "resumen", "auditoria", "solicitudes"] as const;
type TabKey = (typeof TABS)[number];

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
  initialTab,
  initialRegistro,
}: {
  employees: PayrollEmployee[];
  initialTab?: string;
  initialRegistro?: React.ComponentProps<typeof RegistroView>["initialRegistro"];
}) {
  const [activeTab, setActiveTab] = React.useState<TabKey>(
    (TABS as readonly string[]).includes(initialTab ?? "") ? (initialTab as TabKey) : "registro"
  );

  // Auditoría entrega una función de exportar CSV cuando termina de cargar;
  // el botón vive en el encabezado de la página solo mientras esa pestaña
  // está activa.
  const [auditoriaExport, setAuditoriaExport] = React.useState<(() => void) | null>(null);
  const [year, setYear] = React.useState(() => currentPeriod().year);
  // "Ver detalle" se abre desde Registro y desde Resumen Anual: el estado
  // vive acá para que ambos abran la misma hoja.
  const [detailEmployeeId, setDetailEmployeeId] = React.useState<string | null>(null);
  const activeEmployees = React.useMemo(() => employees.filter((e) => e.status === "ACTIVE"), [employees]);

  // Registro's "Columnas" choice lives here (not in RegistroView) so it
  // survives switching tabs — RegistroView unmounts when its tab goes
  // inactive. Persisted to localStorage so it also survives a reload.
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

  function changeTab(next: string) {
    setActiveTab(next as TabKey);
    window.history.replaceState(null, "", `?tab=${next}`);
  }

  return (
    <Tabs value={activeTab} onValueChange={changeTab}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="registro">Registro</TabsTrigger>
          <TabsTrigger value="resumen">Resumen Anual</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
        </TabsList>
        {activeTab === "auditoria" && (
          <Button size="sm" variant="outline" onClick={() => auditoriaExport?.()} disabled={!auditoriaExport}>
            <Download />
            Exportar CSV
          </Button>
        )}
      </div>
      <TabsContent value="dashboard" className="pt-4">
        <DashboardView year={year} onYearChange={setYear} />
      </TabsContent>
      <TabsContent value="registro" className="pt-4">
        <RegistroView
          employees={activeEmployees}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onViewDetail={setDetailEmployeeId}
          initialRegistro={initialRegistro}
        />
      </TabsContent>
      <TabsContent value="resumen" className="pt-4">
        <ResumenView year={year} onYearChange={setYear} onViewDetail={setDetailEmployeeId} />
      </TabsContent>
      <TabsContent value="auditoria" className="pt-4">
        <AuditoriaView year={year} onYearChange={setYear} onExportReady={setAuditoriaExport} />
      </TabsContent>
      <TabsContent value="solicitudes" className="pt-4">
        <SolicitudesView employees={activeEmployees} />
      </TabsContent>
      <EmployeeDetailSheet
        employee={employees.find((e) => e.id === detailEmployeeId) ?? null}
        year={year}
        open={detailEmployeeId !== null}
        onOpenChange={(open) => !open && setDetailEmployeeId(null)}
      />
    </Tabs>
  );
}
