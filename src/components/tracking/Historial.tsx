"use client";
import { useMemo, useState } from "react";
import { FAMILIAS, LUGARES, TIPOS_EVENTO, TrackingEvent, diaSemana, fmtFecha, hoyISO, nochesEntre } from "@/lib/tracking/constants";
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
  { key: "invitados", label: "Invitados (nombres)" },
  { key: "notas", label: "Notas y destinos" },
] as const;

const sumNoches = (e: TrackingEvent) => Object.values(e.asistencia).reduce((s, n) => s + n, 0);
const huboVisita = (e: TrackingEvent) => Object.values(e.asistencia).some((n) => n > 0);
const tieneInvitados = (e: TrackingEvent) => (e.asistencia["Invitados"] || 0) > 0 || !!e.invitados;
const famShort = (k: string) => FAMILIAS.find((f) => f.key === k)?.short ?? k;

/** Historial + Calendario en una sola tabla: una fila por evento (incluso los
 *  fines de semana en que nadie fue) con una columna por familia. */
export default function Historial({ events, onEdit, onGenerate }: Props) {
  const [search, setSearch] = useState("");
  const [famFilter, setFam] = useState<Set<string>>(new Set()); // vacío = todas
  const [tipoFilter, setTipo] = useState<Set<string>>(new Set()); // vacío = todos
  const [estado, setEstado] = useState<Estado>("todos");
  const [soloInvitados, setSoloInvitados] = useState(false);
  const [destFilter, setDest] = useState<Set<string>>(new Set()); // vacío = todos

  const toggleIn = (set: Set<string>, setter: (s: Set<string>) => void, k: string) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setter(next);
  };
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
    if (famFilter.size > 0) evs = evs.filter((e) => [...famFilter].some((f) => (e.asistencia[f] || 0) > 0));
    if (tipoFilter.size > 0) evs = evs.filter((e) => tipoFilter.has(e.tipo));
    if (soloInvitados) evs = evs.filter(tieneInvitados);
    if (destFilter.size > 0) evs = evs.filter((e) => e.otros.some((o) => o.lugar && destFilter.has(o.lugar)));
    if (estado === "con") evs = evs.filter(huboVisita);
    if (estado === "sin") evs = evs.filter((e) => !huboVisita(e));
    if (search.trim()) {
      const q = search.toLowerCase();
      evs = evs.filter((e) =>
        [e.evento, e.invitados, e.notas, ...e.otros.map((o) => `${o.lugar ?? ""} ${o.nota}`)].some((t) => (t || "").toLowerCase().includes(q))
      );
    }
    return [...evs].sort((a, b) => (sortDir === "desc" ? b.fecha_ini.localeCompare(a.fecha_ini) : a.fecha_ini.localeCompare(b.fecha_ini)));
  }, [events, famFilter, tipoFilter, estado, soloInvitados, destFilter, search, sortDir]);

  const famVisibles = FAMILIAS.filter((f) => !hidden.has(f.key));
  const hoy = hoyISO();
  const sinVisitaPasados = events.filter((e) => !huboVisita(e) && e.fecha_ini <= hoy).length;
  const filtrosActivos = (famFilter.size > 0 ? 1 : 0) + (tipoFilter.size > 0 ? 1 : 0) + (estado !== "todos" ? 1 : 0) + (soloInvitados ? 1 : 0) + (destFilter.size > 0 ? 1 : 0) + hidden.size;

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
          placeholder="Buscar evento, invitado o nota..."
          className={`${input} w-56`}
        />

        <FilterChip
          label="Filtros y columnas"
          activeLabel={filtrosActivos ? `Filtros y columnas · ${filtrosActivos}` : null}
          keepOpen
          onClear={filtrosActivos ? () => {
            setFam(new Set());
            setTipo(new Set());
            setEstado("todos");
            setSoloInvitados(false);
            setDest(new Set());
            setHidden(new Set());
          } : undefined}
        >
          <div className="max-h-[70vh] w-72 max-w-[85vw] space-y-4 overflow-y-auto p-2">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Fines de semana</p>
              {([["todos", "Todos"], ["con", "Con visita"], ["sin", "Sin visita"]] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-xs text-ink">
                  <input type="radio" name="estado-fines" checked={estado === k} onChange={() => setEstado(k)} /> {label}
                </label>
              ))}
              <label className="flex items-center gap-2 pt-1 text-xs font-medium text-ink">
                <input type="checkbox" checked={soloInvitados} onChange={(e) => setSoloInvitados(e.target.checked)} /> Solo con invitados
              </label>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Familias (cualquiera de las marcadas)</p>
              {FAMILIAS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" checked={famFilter.has(f.key)} onChange={() => toggleIn(famFilter, setFam, f.key)} />
                  <span className="size-2 rounded-full" style={{ background: f.color }} /> {f.short}
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Fueron a otro lugar</p>
              {LUGARES.map((l) => (
                <label key={l} className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" checked={destFilter.has(l)} onChange={() => toggleIn(destFilter, setDest, l)} /> {l}
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tipo de evento</p>
              {Object.entries(TIPOS_EVENTO).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" checked={tipoFilter.has(k)} onChange={() => toggleIn(tipoFilter, setTipo, k)} />
                  <span className="size-2 rounded-full" style={{ background: v.color }} /> {v.label}
                </label>
              ))}
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

        <button
          type="button"
          onClick={() => setSoloInvitados((v) => !v)}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            soloInvitados
              ? "border-primary bg-primary-soft text-primary"
              : "border-hairline bg-surface text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
          }`}
        >
          Con invitados
        </button>
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
        <table className="w-full min-w-[900px] bg-surface text-xs">
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
              {!hidden.has("invitados") && (
                <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Invitados
                </th>
              )}
              {!hidden.has("notas") && (
                <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Notas y destinos
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
                      {ev.noches ?? (nochesEntre(ev.fecha_ini, ev.fecha_salida) || "—")}
                      {sumNoches(ev) > 0 && <span className="ml-1 text-ink-faint">({sumNoches(ev)})</span>}
                    </td>
                  )}
                  {!hidden.has("invitados") && (
                    <td className="min-w-32 px-2 py-2 text-ink">{ev.invitados || <span className="text-ink-faint">—</span>}</td>
                  )}
                  {!hidden.has("notas") && (
                    <td className="min-w-40 px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {ev.otros.map((o, i) => (
                          <span
                            key={i}
                            className={`rounded border px-1.5 py-0.5 text-[11px] ${o.lugar ? "border-primary/40 bg-primary-soft text-primary" : "border-hairline text-ink-muted"}`}
                            title={o.nota}
                          >
                            {famShort(o.familia)}: {o.nota}
                          </span>
                        ))}
                        {ev.notas && <span className="text-[11px] text-ink-muted">{ev.notas}</span>}
                        {ev.otros.length === 0 && !ev.notas && <span className="text-ink-faint">—</span>}
                      </div>
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
                <td colSpan={14} className="px-4 py-10 text-center text-ink-muted">
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
                  colSpan={1 + (hidden.has("fin") ? 0 : 1) + 1 + (hidden.has("tipo") ? 0 : 1) + (hidden.has("noches") ? 0 : 1) + (hidden.has("invitados") ? 0 : 1) + (hidden.has("notas") ? 0 : 1)}
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
        Noches = las del evento (como en el Sheet; si no hay, fecha fin − fecha inicio); entre paréntesis, la suma de noches de las familias. Haz clic en una fila
        para editarla.
      </p>
    </div>
  );
}
