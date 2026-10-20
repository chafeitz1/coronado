"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FAMILIAS, MESES, TrackingEvent, TrackingRecord, HebrewBucket, fmtFecha } from "@/lib/tracking/constants";
import { card, sectionHeading } from "@/lib/ui";

const CORE_KEYS = ["Papi y Mami", "Flia Harari", "Flia Hayo", "Flia Hafeitz Assis", "Flia Hafeitz Abadi", "Flia Hafeitz Hanono"];
const PAPI = "Papi y Mami";
const HEBREW_MESES = ["Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago"];
const HEBREW_ORDER = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];

const TT = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 6, color: "var(--ink)", fontSize: 12 },
  labelStyle: { color: "var(--ink-muted)", fontWeight: 600 },
  itemStyle: { color: "var(--ink)" },
};

function famColor(k: string) {
  return FAMILIAS.find((f) => f.key === k)?.color || "var(--ink-faint)";
}
function famShort(k: string) {
  return FAMILIAS.find((f) => f.key === k)?.short || k;
}

function buildEventos(records: TrackingRecord[]) {
  const map: Record<string, { key: string; evento: string; fecha_ini: string; year: number; month: number; familias: Set<string> }> = {};
  records.forEach((r) => {
    if (!map[r.eventoKey]) map[r.eventoKey] = { key: r.eventoKey, evento: r.evento, fecha_ini: r.fecha_ini, year: r.year, month: r.month, familias: new Set() };
    map[r.eventoKey].familias.add(r.familia);
  });
  return Object.values(map);
}

interface Props {
  data: TrackingRecord[];
  allData: TrackingRecord[];
  /** eventos del período (con invitados por nombre) */
  events: TrackingEvent[];
  hebrewMode?: boolean;
  hebrewYears?: HebrewBucket[];
}

export default function DatosCuriosos({ data, allData, events, hebrewMode = false }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedEvt, setExpandedEvt] = useState<number | null>(null);

  const eventosAll = buildEventos(allData);
  const eventosFiltrado = buildEventos(data);

  const yearsAll = [...new Set(eventosAll.map((e) => e.year))].sort();

  // Todos juntos (cross-year)
  const todosJuntosEvts = eventosAll.filter((e) => CORE_KEYS.every((k) => e.familias.has(k))).sort((a, b) => b.fecha_ini.localeCompare(a.fecha_ini));
  const tjByYear: Record<number, typeof todosJuntosEvts> = {};
  todosJuntosEvts.forEach((e) => {
    if (!tjByYear[e.year]) tjByYear[e.year] = [];
    tjByYear[e.year].push(e);
  });
  const lastTJ = todosJuntosEvts[0];

  // Co-asistencia (filtered)
  const coMap: Record<string, typeof eventosFiltrado> = {};
  CORE_KEYS.filter((k) => k !== PAPI).forEach((k) => {
    coMap[k] = [];
  });
  eventosFiltrado.forEach((e) => {
    if (!e.familias.has(PAPI)) return;
    const others = CORE_KEYS.filter((k) => k !== PAPI && e.familias.has(k));
    if (others.length !== 1) return;
    coMap[others[0]].push(e);
  });
  const coRank = Object.entries(coMap)
    .map(([key, evts]) => ({
      key,
      n: evts.length,
      last: [...evts].sort((a, b) => b.fecha_ini.localeCompare(a.fecha_ini))[0]?.fecha_ini || "",
    }))
    .sort((a, b) => b.n - a.n);

  // Mes popular (filtered)
  const mesCounts = Array(12).fill(0);
  data.forEach((r) => {
    if (r.month >= 0) mesCounts[r.month]++;
  });
  const monthOrder = hebrewMode ? HEBREW_ORDER : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const monthLabels = hebrewMode ? HEBREW_MESES : [...MESES];
  const mesData = monthOrder.map((mi, i) => ({ name: monthLabels[i], visitas: mesCounts[mi] }));

  // Invitados (filtered)
  const invEvts = events
    .filter((e) => (e.asistencia["Invitados"] || 0) > 0 || !!e.invitados)
    .sort((a, b) => b.fecha_ini.localeCompare(a.fecha_ini));
  // Invitados más frecuentes (por nombre) y familias presentes en esos fines de semana
  const ALIAS: Record<string, string> = { "alan shajtel": "Allan Shajtel" };
  const guestCount = new Map<string, number>();
  for (const e of invEvts) {
    for (const raw of (e.invitados || "").split(",")) {
      const name = raw.trim();
      if (!name) continue;
      const canon = ALIAS[name.toLowerCase()] ?? name;
      guestCount.set(canon, (guestCount.get(canon) || 0) + 1);
    }
  }
  const guestRank = [...guestCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const famWithGuests = CORE_KEYS.map((k) => ({ key: k, n: invEvts.filter((e) => (e.asistencia[k] || 0) > 0).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Todos juntos */}
        <div className={`p-4 ${card}`}>
          <div className={`mb-3 ${sectionHeading}`}>✨ Todos Juntos (6 de 6)</div>
          <div className="mb-3 flex items-center gap-4 border-b border-hairline pb-3">
            <div>
              <span className="text-2xl font-bold text-ink">{todosJuntosEvts.length}</span>
              <span className="ml-1 text-xs text-ink-muted">veces</span>
            </div>
            {lastTJ && (
              <div>
                <div className="text-xs text-ink-muted">Último</div>
                <div className="text-xs font-medium text-ink">{lastTJ.evento}</div>
                <div className="text-xs text-ink-faint">{fmtFecha(lastTJ.fecha_ini)}</div>
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            {yearsAll
              .filter((y) => tjByYear[y])
              .map((y) => {
                const evts = tjByYear[y];
                const isOpen = expandedYear === y;
                return (
                  <div key={y}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-surface-hover active:bg-surface-hover"
                      onClick={() => setExpandedYear(isOpen ? null : y)}
                    >
                      <span className="font-medium text-ink">{y}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{evts.length}×</span>
                        <span className="text-[9px] text-ink-faint">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {isOpen &&
                      evts.map((e, i) => (
                        <div key={i} className="flex justify-between py-0.5 pl-4 text-xs text-ink-muted">
                          <span className="truncate pr-2">{e.evento || "—"}</span>
                          <span className="shrink-0">{fmtFecha(e.fecha_ini)}</span>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Co-asistencia */}
        <div className={`p-4 ${card}`}>
          <div className={`mb-1 ${sectionHeading}`}>🤝 Solos con Papi y Mami</div>
          <div className="mb-3 text-xs text-ink-faint">Solo una familia extra (Musi no cuenta)</div>
          <div className="space-y-2">
            {coRank.map(({ key, n, last }, i) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-3 text-right text-xs font-bold text-ink-faint">{i + 1}</div>
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: famColor(key) }}>
                      {famShort(key)}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-ink">{n}</span>
                      <span className="ml-1 text-xs text-ink-muted">v</span>
                      {last && <span className="ml-2 text-xs text-ink-faint">{fmtFecha(last)}</span>}
                    </div>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-canvas-soft">
                    <div className="h-full rounded-full" style={{ width: `${(n / (coRank[0]?.n || 1)) * 100}%`, background: famColor(key) }} />
                  </div>
                </div>
              </div>
            ))}
            {coRank.every((c) => c.n === 0) && <p className="text-xs text-ink-faint">Sin datos para el período.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Mes popular */}
        <div className={`p-4 ${card}`}>
          <div className={`mb-3 ${sectionHeading}`}>📅 Mes Más Popular</div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mesData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis dataKey="name" tick={{ fill: "var(--ink-muted)", fontSize: 9 }} />
                <YAxis tick={{ fill: "var(--ink-muted)", fontSize: 9 }} />
                <Tooltip {...TT} formatter={(v) => [`${v} visitas`, ""]} />
                <Bar dataKey="visitas" radius={[2, 2, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invitados */}
        <div className={`p-4 ${card}`}>
          <div className="mb-3 flex items-center justify-between">
            <span className={sectionHeading}>🎉 Eventos con Invitados</span>
            <span className="text-xs font-bold text-ink">{invEvts.length} fines de semana</span>
          </div>
          <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 300 }}>
            {invEvts.length === 0 && <p className="text-xs text-ink-faint">Sin eventos con invitados.</p>}
            {invEvts.map((e, i) => {
              const others = CORE_KEYS.filter((k) => (e.asistencia[k] || 0) > 0);
              const isOpen = expandedEvt === i;
              const notes = [e.notas, ...e.otros.map((o) => `${famShort(o.familia)}: ${o.nota}`)].filter(Boolean);
              return (
                <div key={i} className="overflow-hidden rounded-md border border-hairline">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-2 p-2 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover"
                    onClick={() => setExpandedEvt(isOpen ? null : i)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs text-ink">{e.evento}</div>
                      <div className="text-xs font-medium text-ink">{e.invitados || <span className="font-normal text-ink-faint">(sin nombres anotados)</span>}</div>
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {others.map((k) => (
                          <span key={k} className="rounded px-1 text-xs" style={{ background: famColor(k) + "20", color: famColor(k) }}>
                            {famShort(k)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-ink-muted">{fmtFecha(e.fecha_ini)}</div>
                      <div className="mt-0.5 text-xs text-ink-faint">{isOpen ? "▲" : "▼"}</div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-hairline px-3 pb-2 text-xs text-ink-muted">
                      {notes.length > 0 ? notes.map((n, j) => <div key={j} className="mt-1">{n}</div>) : <div className="mt-1 italic text-ink-faint">Sin notas registradas.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quién trae más invitados */}
        <div className={`p-4 ${card}`}>
          <span className={sectionHeading}>Invitados más frecuentes</span>
          <div className="mt-3 space-y-1">
            {guestRank.length === 0 && <p className="text-xs text-ink-faint">Aún no hay nombres de invitados anotados.</p>}
            {guestRank.slice(0, 8).map(([name, n]) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-ink">{name}</span>
                <span className="font-bold tabular-nums text-ink">{n}×</span>
              </div>
            ))}
          </div>
          {famWithGuests.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Familias presentes en esos fines de semana</p>
              <div className="mt-2 space-y-1">
                {famWithGuests.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-xs">
                    <span className="font-semibold" style={{ color: famColor(f.key) }}>{famShort(f.key)}</span>
                    <span className="tabular-nums text-ink">{f.n}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-faint">Es quién estaba en la casa, no necesariamente quién invitó.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
