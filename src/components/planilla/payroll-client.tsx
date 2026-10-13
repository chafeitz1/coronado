"use client";

import * as React from "react";

import type { PayrollEmployee } from "@/lib/types/planilla";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/payroll-ui/tabs";
import { RegistroView } from "@/components/planilla/registro-view";
import { type ColumnKey, defaultVisibleColumns, REGISTRO_COLUMNS_STORAGE_KEY } from "@/components/planilla/registro-columns";

const TABS = ["registro"] as const;
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

export function PayrollClient({ employees, initialTab }: { employees: PayrollEmployee[]; initialTab?: string }) {
  const [activeTab, setActiveTab] = React.useState<TabKey>(
    (TABS as readonly string[]).includes(initialTab ?? "") ? (initialTab as TabKey) : "registro"
  );

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
      <TabsList>
        <TabsTrigger value="registro">Registro</TabsTrigger>
      </TabsList>
      <TabsContent value="registro" className="pt-4">
        <RegistroView employees={employees} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns} />
      </TabsContent>
    </Tabs>
  );
}
