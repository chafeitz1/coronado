"use client";
import { FAMILIAS, MESES, TrackingRecord, HebrewBucket } from "@/lib/tracking/constants";
import { Pill } from "@/components/ui/pill";
import { sectionHeading } from "@/lib/ui";

const CIVIL_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HEBREW_ORDER = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
const HEBREW_MESES = ["Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"];

export type ResumenMetric = "visitas" | "noches";
export type ResumenView = "mensual" | "anual";

interface Props {
  data: TrackingRecord[];
  allData: TrackingRecord[];
  hebrewMode?: boolean;
  hebrewYears?: HebrewBucket[];
  /** Controlados desde la página para poder guardarlos como vista predeterminada. */
  metric: ResumenMetric;
  onMetricChange: (m: ResumenMetric) => void;
  view: ResumenView;
  onViewChange: (v: ResumenView) => void;
}

export default function TablaResumen({
  data,
  allData,
  hebrewMode = false,
  hebrewYears = [],
  metric,
  onMetricChange: setMetric,
  view,
  onViewChange: setView,
}: Props) {
  const monthOrder = hebrewMode ? HEBREW_ORDER : CIVIL_ORDER;
  const monthLabels = hebrewMode ? HEBREW_MESES : [...MESES];

  // ── Mensual: rows = familia, cols = months ────────────────────────────────
  const matrizMes: Record<string, Record<number, number>> = {};
  FAMILIAS.forEach((f) => {
    matrizMes[f.key] = {};
  });
  data.forEach((r) => {
    if (!matrizMes[r.familia]) matrizMes[r.familia] = {};
    const m = r.month;
    if (m < 0) return;
    if (metric === "noches") {
      matrizMes[r.familia][m] = (matrizMes[r.familia][m] || 0) + r.noches;
    } else {
      matrizMes[r.familia][m] = (matrizMes[r.familia][m] || 0) + 1;
    }
  });

  // ── Anual: rows = familia, cols = years ───────────────────────────────────
  const yearsAll = hebrewMode
    ? hebrewYears.map((b) => ({ key: b.startYear, label: b.label }))
    : [...new Set(allData.map((r) => r.year))]
        .filter((y) => y > 0)
        .sort()
        .map((y) => ({ key: y, label: String(y) }));

  const matrizYear: Record<string, Record<number, number>> = {};
  FAMILIAS.forEach((f) => {
    matrizYear[f.key] = {};
  });
  allData.forEach((r) => {
    let yKey = r.year;
    if (hebrewMode) {
      const bucket = hebrewYears.find((b) => r.fecha_ini >= b.start && r.fecha_ini < b.end);
      if (!bucket) return;
      yKey = bucket.startYear;
    }
    if (!matrizYear[r.familia]) matrizYear[r.familia] = {};
    if (metric === "noches") {
      matrizYear[r.familia][yKey] = (matrizYear[r.familia][yKey] || 0) + r.noches;
    } else {
      matrizYear[r.familia][yKey] = (matrizYear[r.familia][yKey] || 0) + 1;
    }
  });

  const maxVal =
    view === "mensual"
      ? Math.max(1, ...FAMILIAS.flatMap((f) => monthOrder.map((mi) => matrizMes[f.key]?.[mi] || 0)))
      : Math.max(1, ...FAMILIAS.flatMap((f) => yearsAll.map((y) => matrizYear[f.key]?.[y.key] || 0)));

  const cellColor = (v: number, fam: (typeof FAMILIAS)[number]) => {
    if (!v) return "transparent";
    const alpha = Math.max(0.08, (v / maxVal) * 0.85);
    return `${fam.color}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  };

  const cols = view === "mensual" ? monthOrder.map((mi, i) => ({ key: mi, label: monthLabels[i] })) : yearsAll;
  const getVal = (fKey: string, colKey: number) =>
    view === "mensual" ? matrizMes[fKey]?.[colKey] || 0 : matrizYear[fKey]?.[colKey] || 0;
  const rowTotal = (fKey: string) => cols.reduce((s, c) => s + getVal(fKey, c.key), 0);
  const colTotal = (colKey: number) => FAMILIAS.reduce((s, f) => s + getVal(f.key, colKey), 0);
  const grandTotal = FAMILIAS.reduce((s, f) => s + rowTotal(f.key), 0);

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={sectionHeading}>Distribución por Familia y Mes</span>
        <div className="ml-auto flex gap-1">
          {(["visitas", "noches"] as const).map((m) => (
            <Pill key={m} label={m} active={metric === m} onClick={() => setMetric(m)} small />
          ))}
          {(["mensual", "anual"] as const).map((v) => (
            <Pill key={v} label={v} active={view === v} onClick={() => setView(v)} small />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-hairline">
        <div className="overflow-x-auto">
          <table className="w-full bg-surface text-xs">
            <thead>
              <tr className="border-b border-hairline">
                <th className="sticky left-0 min-w-[88px] bg-canvas-soft px-3 py-2 text-left text-xs font-semibold text-ink-muted">
                  Familia
                </th>
                {cols.map((c) => (
                  <th key={c.key} className="min-w-9 bg-canvas-soft px-1 py-2 text-center text-xs font-semibold text-ink-muted">
                    {c.label}
                  </th>
                ))}
                <th className="bg-canvas-soft px-2 py-2 text-center text-xs font-semibold text-ink-muted">Total</th>
              </tr>
            </thead>
            <tbody>
              {FAMILIAS.filter((f) => rowTotal(f.key) > 0).map((f) => (
                <tr key={f.key} className="border-b border-hairline">
                  <td className="sticky left-0 bg-surface px-3 py-2 font-semibold" style={{ color: f.color }}>
                    {f.short}
                  </td>
                  {cols.map((c) => {
                    const v = getVal(f.key, c.key);
                    return (
                      <td
                        key={c.key}
                        className="px-1 py-2 text-center font-medium tabular-nums text-ink"
                        style={{ background: cellColor(v, f) }}
                      >
                        {v || <span className="text-ink-faint">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-bold tabular-nums" style={{ color: f.color }}>
                    {rowTotal(f.key)}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-hairline bg-canvas-soft">
                <td className="sticky left-0 bg-canvas-soft px-3 py-2 font-bold text-ink">TOTAL</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-1 py-2 text-center font-bold tabular-nums text-ink">
                    {colTotal(c.key) || "—"}
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-bold tabular-nums text-primary">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
