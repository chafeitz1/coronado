"use client";
import { useMemo, useState } from "react";
import { FAMILIAS, TIPOS_EVENTO, TrackingEvent, diaSemana, fmtFecha, hoyISO, nochesEntre } from "@/lib/tracking/constants";
import { FilterChip } from "@/components/ui/filter-chip";
import { buttonUtility, input, mutedText } from "@/lib/ui";

interface Props {
  events: TrackingEvent[];
  onEdit: (ev: TrackingEvent) => void;
  onGenerate: () => void;
}

type Estado = "todos" | "con" | "sin";
const COLS_FIJAS = [
  { key: "fin", label: "Fin" },
  { key: "tipo", label: "Tipo" },
  { key: "noches", label: "Noches" },
] as const;

const sumNoches = (e: TrackingEvent) => Object.values(e.asistencia).reduce((s, n) => s + n, 0);
const huboVisita = (e: TrackingEvent) => Object.values(e.asistencia).some((n) => n > 0);

/** Historial + Calendario en una sola tabla: una fila por evento (incluso los
 *  fines de semana en que nadie fue) con una columna por familia. */
export default function Historial({ events, onEdit, onGenerate }: Props) {
  const [search, setSearch] = useState("");
  const [famFilter, setFam] = useState("all");
  const [tipoFilter, setTipo] = useState("all");
  const [estado, setEstado] = useState<Estado>("todos");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggleHidden = (k: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const filtered = useMemo(() => {
    let evs = events;
    if (famFilter !== "all") evs = evs.filter((e) => (e.asistencia[famFilter] || 0) > 0);
    if (tipoFilter !== "all") evs = evs.filter((e) => e.tipo === tipoFilter);
    if (estado === "con") evs = evs.filter(huboVisita);
    if (estado === "sin") evs = evs.filter((e) => !huboVisita(e));
    if (search.trim()) evs = evs.filter((e) => (e.evento || "").toLowerCase().includes(search.toLowerCase()));
    return [...evs].sort((a, b) => (sortDir === "desc" ? b.fecha_ini.localeCompare(a.fecha_ini) : a.fecha_ini.localeCompare(b.fecha_ini)));
  }, [events, famFilter, tipoFilter, estado, search, sortDir]);

  const famVisibles = FAMILIAS.filter((f) => !hidden.has(f.key));
  const hoy = hoyISO();
  const sinVisitaPasados = events.filter((e) => !huboVisita(e) && e.fecha_ini <= hoy).length;
  const filtrosActivos = (famFilter !== "all" ? 1 : 0) + (tipoFilter !== "all" ? 1 : 0) + (estado !== "todos" ? 1 : 0) + hidden.size;

  const totales = FAMILIAS.map((f) => ({
    key: f.key,
    noches: filtered.reduce((s, e) => s + (e.asistencia[f.key] || 0), 0),
    veces: filtered.filter((e) => (e.asistencia[f.key] || 0) > 0).length,
  }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar evento..."
          className={`${input} w-56`}
        />

        <FilterChip
          label="Filtros y columnas"
          activeLabel={filtrosActivos ? `Filtros y columnas · ${filtrosActivos}` : null}
          onClear={filtrosActivos ? () => {
            setFam("all");
            setTipo("all");
            setEstado("todos");
            setHidden(new Set());
          } : undefined}
        >
          <div className="w-64 space-y-4 p-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Filtros</p>
              <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)} className={input}>
                <option value="todos">Todos los fines de semana</option>
                <option value="con">Solo con visita</option>
                <option value="sin">Solo sin visita</option>
              </select>
              <select value={famFilter} onChange={(e) => setFam(e.target.value)} className={input}>
                <option value="all">Todas las familias</option>
                {FAMILIAS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.short}
                  </option>
                ))}
              </select>
              <select value={tipoFilter} onChange={(e) => setTipo(e.target.value)} className={input}>
                <option value="all">Todos los tipos</option>
                {Object.entries(TIPOS_EVENTO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Columnas visibles</p>
              {COLS_FIJAS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleHidden(c.key)} /> {c.label}
                </label>
              ))}
              {FAMILIAS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" checked={!hidden.has(f.key)} onChange={() => toggleHidden(f.key)} />
                  <span className="size-2 rounded-full" style={{ background: f.color }} /> {f.short}
                </label>
              ))}
            </div>
          </div>
        </FilterChip>

        <button type="button" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))} className={buttonUtility}>
          Fecha {sortDir === "desc" ? "↓" : "↑"}
        </button>
        <button type="button" onClick={onGenerate} className={buttonUtility}>
          + Rellenar fines de semana
        </button>
        <span className={`ml-auto ${mutedText}`}>
          {filtered.length} eventos · {sinVisitaPasados} fines de semana sin visita (hasta hoy)
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[720px] bg-surface text-xs">
          <thead>
            <tr className="border-b border-hairline bg-canvas-soft">
              <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Inicio
              </th>
              {!hidden.has("fin") && (
                <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Fin
                </th>
              )}
              <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Evento
              </th>
              {!hidden.has("tipo") && (
                <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Tipo
                </th>
              )}
              {!hidden.has("noches") && (
                <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Noches
                </th>
              )}
              {famVisibles.map((f) => (
                <th key={f.key} className="whitespace-nowrap px-2 py-2 text-center font-semibold" style={{ color: f.color }}>
                  {f.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => {
              const tipo = TIPOS_EVENTO[ev.tipo] as { label: string; color: string } | undefined;
              const vacio = !huboVisita(ev);
              return (
                <tr
                  key={ev.key}
                  onClick={() => onEdit(ev)}
                  className={`cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-surface-hover active:bg-surface-hover ${vacio ? "opacity-60" : ""}`}
                  title="Clic para editar"
                >
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-ink">
                    {fmtFecha(ev.fecha_ini)} <span className="text-ink-faint">{diaSemana(ev.fecha_ini)}</span>
                  </td>
                  {!hidden.has("fin") && (
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-ink-muted">
                      {fmtFecha(ev.fecha_salida)} <span className="text-ink-faint">{diaSemana(ev.fecha_salida)}</span>
                    </td>
                  )}
                  <td className="px-2 py-2 font-medium text-ink">
                    {ev.evento || "—"}
                    {vacio && <span className="ml-1.5 text-[10px] font-normal text-ink-faint">sin visita</span>}
                  </td>
                  {!hidden.has("tipo") && (
                    <td className="px-2 py-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-semibold"
                        style={{ background: (tipo?.color || "var(--ink-faint)") + "20", color: tipo?.color || "var(--ink-muted)" }}
                      >
                        {tipo?.label || ev.tipo}
                      </span>
                    </td>
                  )}
                  {!hidden.has("noches") && (
                    <td className="px-2 py-2 text-right tabular-nums text-ink">
                      {nochesEntre(ev.fecha_ini, ev.fecha_salida) || "—"}
                      {sumNoches(ev) > 0 && <span className="ml-1 text-ink-faint">({sumNoches(ev)})</span>}
                    </td>
                  )}
                  {famVisibles.map((f) => {
                    const n = ev.asistencia[f.key];
                    return (
                      <td
                        key={f.key}
                        className="px-2 py-2 text-center tabular-nums font-semibold"
                        style={n ? { color: f.color, background: f.color + "14" } : { color: "var(--ink-faint)" }}
                      >
                        {n ? n : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-ink-muted">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-hairline bg-canvas-soft">
                <td
                  className="px-2 py-2 font-bold text-ink"
                  colSpan={1 + (hidden.has("fin") ? 0 : 1) + 1 + (hidden.has("tipo") ? 0 : 1) + (hidden.has("noches") ? 0 : 1)}
                >
                  Total (noches · veces)
                </td>
                {famVisibles.map((f) => {
                  const t = totales.find((x) => x.key === f.key)!;
                  return (
                    <td key={f.key} className="px-2 py-2 text-center font-bold tabular-nums" style={{ color: f.color }}>
                      {t.noches} · {t.veces}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Noches = fecha fin − fecha inicio; entre paréntesis, la suma de noches de las familias. Haz clic en una fila
        para editarla.
      </p>
    </div>
  );
}
