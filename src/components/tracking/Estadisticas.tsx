"use client";
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { FAMILIAS, TIPOS_EVENTO, TrackingRecord, fmtFecha } from "@/lib/tracking/constants";
import { Pill } from "@/components/ui/pill";
import { card, sectionHeading } from "@/lib/ui";

// Tooltip styling for the app's theme — these already resolve through the
// same CSS vars as everything else, just read inline since Recharts takes
// plain style objects, not classNames.
const TT = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 6, color: "var(--ink)", fontSize: 12 },
  labelStyle: { color: "var(--ink-muted)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--ink)" },
  cursor: { fill: "rgba(0,117,222,0.06)" },
};
const TICK = { fill: "var(--ink-muted)", fontSize: 11 };
const GRID = "var(--hairline)";

interface Props {
  data: TrackingRecord[];
  allData: TrackingRecord[];
}

// ── Chart 1: Familias noches + visitas ────────────────────────────────────────
function FamiliasChart({ data }: { data: TrackingRecord[] }) {
  const [metric, setMetric] = useState<"both" | "noches" | "visitas">("both");

  const chartData = FAMILIAS.map((f) => ({
    name: f.short,
    noches: data.filter((r) => r.familia === f.key).reduce((s, r) => s + r.noches, 0),
    visitas: data.filter((r) => r.familia === f.key).length,
    color: f.color,
  })).filter((d) => d.noches > 0 || d.visitas > 0);

  return (
    <div className={`p-4 ${card}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className={sectionHeading}>Estadísticas por Familia</span>
        <div className="flex gap-1">
          {(["both", "noches", "visitas"] as const).map((v) => (
            <Pill key={v} label={v === "both" ? "Ambos" : v === "noches" ? "Noches" : "Visitas"} active={metric === v} onClick={() => setMetric(v)} small />
          ))}
        </div>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 10, left: -12, bottom: 4 }} barCategoryGap="30%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="name" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip {...TT} formatter={(v, name) => [v, name === "noches" ? "Noches" : "Visitas"]} />
            {(metric === "noches" || metric === "both") && (
              <Bar dataKey="noches" name="noches" radius={[3, 3, 0, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Bar>
            )}
            {(metric === "visitas" || metric === "both") && (
              <Bar dataKey="visitas" name="visitas" radius={[3, 3, 0, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={metric === "both" ? e.color + "aa" : e.color} />
                ))}
              </Bar>
            )}
            {metric === "both" && (
              <Legend
                iconSize={8}
                iconType="circle"
                formatter={(v) => <span style={{ color: "var(--ink-muted)", fontSize: 10 }}>{v === "noches" ? "Noches (sólido)" : "Visitas (claro)"}</span>}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Chart 2: Tendencia / Tipo de Evento ───────────────────────────────────────
function TendenciaTipoChart({ data, allData }: Props) {
  const [tab, setTab] = useState<"tendencia" | "tipo">("tendencia");
  const [hiddenFams, setHiddenFams] = useState(new Set<string>());
  const [drillTipo, setDrillTipo] = useState<string | null>(null);

  const toggleFam = (key: string) =>
    setHiddenFams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Tendencia
  const years = [...new Set(allData.map((r) => r.year))].sort();
  const tendenciaData = years.map((y) => {
    const entry: Record<string, string | number> = { year: String(y) };
    FAMILIAS.forEach((f) => {
      const n = allData.filter((r) => r.familia === f.key && r.year === y).reduce((s, r) => s + r.noches, 0);
      if (n > 0) entry[f.short] = n;
    });
    return entry;
  });
  const activeFams = FAMILIAS.filter((f) => allData.some((r) => r.familia === f.key));

  // Tipo de evento
  const evtMap: Record<string, { evento: string; tipo: string; fecha_ini: string; familias: Set<string> }> = {};
  data.forEach((r) => {
    if (!evtMap[r.eventoKey]) evtMap[r.eventoKey] = { evento: r.evento, tipo: r.tipo, fecha_ini: r.fecha_ini, familias: new Set() };
    evtMap[r.eventoKey].familias.add(r.familia);
  });
  const uniqueEvts = Object.entries(evtMap).map(([k, v]) => ({ key: k, ...v }));

  const tipoData = Object.entries(TIPOS_EVENTO)
    .map(([k, v]) => ({
      tipoKey: k,
      name: v.label,
      color: v.color,
      count: uniqueEvts.filter((e) => e.tipo === k).length,
      events: uniqueEvts.filter((e) => e.tipo === k).sort((a, b) => b.fecha_ini.localeCompare(a.fecha_ini)),
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const drillData = drillTipo ? tipoData.find((t) => t.tipoKey === drillTipo) : null;

  return (
    <div className={`p-4 ${card}`}>
      {/* Tab header */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Pill label="📈 Tendencia Anual" active={tab === "tendencia"} onClick={() => { setTab("tendencia"); setDrillTipo(null); }} />
        <Pill label="🏷️ Tipo de Evento" active={tab === "tipo"} onClick={() => { setTab("tipo"); setDrillTipo(null); }} />
        {tab === "tendencia" && (
          <div className="ml-auto flex flex-wrap gap-1">
            {activeFams.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleFam(f.key)}
                className="rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity"
                style={{
                  borderColor: f.color,
                  color: hiddenFams.has(f.key) ? "var(--ink-faint)" : f.color,
                  background: hiddenFams.has(f.key) ? "transparent" : f.color + "22",
                  opacity: hiddenFams.has(f.key) ? 0.5 : 1,
                }}
              >
                {f.short}
              </button>
            ))}
          </div>
        )}
        {tab === "tipo" && drillTipo && (
          <button type="button" onClick={() => setDrillTipo(null)} className="ml-auto rounded-md border border-hairline px-2 py-0.5 text-xs text-ink-muted transition-colors hover:bg-surface-hover active:bg-surface-hover">
            ✕ Cerrar
          </button>
        )}
      </div>

      {tab === "tendencia" && (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tendenciaData} margin={{ top: 4, right: 10, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="year" tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip {...TT} />
              {activeFams
                .filter((f) => !hiddenFams.has(f.key))
                .map((f) => (
                  <Line key={f.key} type="monotone" dataKey={f.short} stroke={f.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "tipo" && (
        <>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tipoData}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 60, bottom: 4 }}
                onClick={(e) => {
                  const key = (e as { activePayload?: { payload?: { tipoKey?: string } }[] } | null)?.activePayload?.[0]?.payload?.tipoKey;
                  if (key) setDrillTipo((prev) => (prev === key ? null : key));
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={TICK} />
                <YAxis dataKey="name" type="category" tick={{ fill: "var(--ink-secondary)", fontSize: 10 }} width={56} />
                <Tooltip {...TT} formatter={(v) => [`${v} eventos`, ""]} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} cursor="pointer">
                  {tipoData.map((e, i) => (
                    <Cell key={i} fill={e.tipoKey === drillTipo ? e.color : e.color + "bb"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {drillData && (
            <div className="mt-3 overflow-hidden rounded-md border border-hairline">
              <div className="border-b border-hairline px-3 py-2" style={{ background: drillData.color + "18" }}>
                <span className="text-xs font-bold" style={{ color: drillData.color }}>
                  {drillData.name} — {drillData.count} eventos
                </span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
                {drillData.events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-hairline px-3 py-2 last:border-0">
                    <div>
                      <span className="text-xs text-ink">{e.evento || "—"}</span>
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {[...e.familias].map((k) => {
                          const f = FAMILIAS.find((ff) => ff.key === k);
                          return f ? (
                            <span key={k} className="rounded px-1 text-xs" style={{ background: f.color + "20", color: f.color }}>
                              {f.short}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-ink-muted">{fmtFecha(e.fecha_ini)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Estadisticas({ data, allData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <FamiliasChart data={data} />
      <TendenciaTipoChart data={data} allData={allData} />
    </div>
  );
}
