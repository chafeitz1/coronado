"use client";
import { useMemo, useState } from "react";
import { FAMILIAS, TIPOS_EVENTO, TrackingEvent, clasificarEvento, diaSemana, fmtFecha, nochesEntre } from "@/lib/tracking/constants";
import { deleteEvent, insertEvent, updateEventFull } from "@/lib/tracking/queries";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { buttonGhost, buttonPrimary, input } from "@/lib/ui";

interface Props {
  /** Si viene, el modal edita ese evento; si no, crea uno nuevo. */
  evento?: TrackingEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function NuevaVisitaModal({ evento: editing, onClose, onSaved }: Props) {
  const [evento, setEvento] = useState(editing?.evento === "Fin de semana" ? "" : (editing?.evento ?? ""));
  const [fechaIni, setFechaIni] = useState(editing?.fecha_ini ?? "");
  const [fechaSal, setFechaSal] = useState(editing?.fecha_salida ?? "");
  const [tipo, setTipo] = useState(editing && editing.tipo !== clasificarEvento(editing.evento) ? editing.tipo : "");
  const [notas, setNotas] = useState(editing?.notas ?? "");
  const [noches, setNoches] = useState<Record<string, number>>(editing?.asistencia ?? {});
  const [nochesEv, setNochesEv] = useState<string>(editing?.noches != null ? String(editing.noches) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nochesEvento = useMemo(() => nochesEntre(fechaIni, fechaSal), [fechaIni, fechaSal]);

  const setFam = (familia: string, n: number) => setNoches((prev) => ({ ...prev, [familia]: Math.max(0, n) }));
  const toggleFam = (familia: string) => setFam(familia, (noches[familia] || 0) > 0 ? 0 : nochesEvento || 2);

  const handleSave = async () => {
    if (!fechaIni) {
      setError("La fecha de llegada es obligatoria.");
      return;
    }
    if (fechaSal && fechaSal < fechaIni) {
      setError("La salida no puede ser antes de la llegada.");
      return;
    }
    const asistencia = Object.entries(noches)
      .filter(([, n]) => n > 0)
      .map(([familia, n]) => ({ familia, noches: n }));
    const nombre = evento.trim() || "Fin de semana";
    const nochesEvento2 = nochesEv.trim() === "" ? undefined : Math.max(0, parseInt(nochesEv, 10) || 0);
    const inputPayload = {
      evento: nombre,
      noches: nochesEvento2,
      fecha_ini: fechaIni,
      fecha_salida: fechaSal || undefined,
      tipo: tipo || clasificarEvento(evento),
      notas: notas.trim() || undefined,
      asistencia,
    };
    setSaving(true);
    setError("");
    try {
      if (editing) await updateEventFull(editing.key, inputPayload);
      else await insertEvent(inputPayload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm("¿Borrar este evento y su asistencia? No se puede deshacer.")) return;
    setSaving(true);
    setError("");
    try {
      await deleteEvent(editing.key);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar.");
      setSaving(false);
    }
  };

  const hayFamilias = Object.values(noches).some((n) => n > 0);

  return (
    <SidePanel open onClose={onClose} title={editing ? "Editar evento" : "Nueva Visita"}>
      <div className="space-y-4">
        <Field label="Nombre del evento (opcional)">
          <input
            value={evento}
            onChange={(e) => setEvento(e.target.value)}
            placeholder="Ej: Sukkot — vacío = Fin de semana"
            className={input}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Llegada">
            <input type="date" value={fechaIni} onChange={(e) => setFechaIni(e.target.value)} className={input} />
            <p className="mt-1 text-xs text-ink-muted">{fechaIni ? `${fmtFecha(fechaIni)} · ${diaSemana(fechaIni)}` : ""}</p>
          </Field>
          <Field label="Salida">
            <input type="date" value={fechaSal} onChange={(e) => setFechaSal(e.target.value)} className={input} />
            <p className="mt-1 text-xs text-ink-muted">{fechaSal ? `${fmtFecha(fechaSal)} · ${diaSemana(fechaSal)}` : ""}</p>
          </Field>
        </div>

        <Field label="Noches del evento">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={60}
              value={nochesEv}
              placeholder={nochesEvento ? String(nochesEvento) : "—"}
              onChange={(e) => setNochesEv(e.target.value)}
              className={`${input} w-20 text-center`}
            />
            <span className="text-xs text-ink-faint">vacío = salida − llegada</span>
          </div>
        </Field>

        {nochesEvento > 0 && (
          <p className="rounded-md bg-primary-soft px-3 py-2 text-xs text-primary">
            {nochesEvento} noche{nochesEvento === 1 ? "" : "s"} en total ({diaSemana(fechaIni)} → {diaSemana(fechaSal)}).
            Al marcar una familia se le pone ese número; puedes ajustarlo.
          </p>
        )}

        <Field label="Tipo de evento">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={input}>
            <option value="">Auto (detectar del nombre)</option>
            {Object.entries(TIPOS_EVENTO).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-secondary">Noches por familia</p>
          <div className="grid grid-cols-2 gap-2">
            {FAMILIAS.map((f) => {
              const active = (noches[f.key] || 0) > 0;
              return (
                <div
                  key={f.key}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 ${active ? "" : "border-hairline"}`}
                  style={active ? { borderColor: f.color } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => toggleFam(f.key)}
                    className="flex flex-1 items-center gap-2 text-left"
                    title="Marcar / desmarcar"
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ background: f.color }} />
                    <span className="text-xs text-ink">{f.short}</span>
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={noches[f.key] || ""}
                    placeholder="0"
                    onChange={(e) => setFam(f.key, parseInt(e.target.value, 10) || 0)}
                    className="w-11 rounded-md border border-hairline bg-surface px-1 py-0.5 text-center text-xs text-ink outline-none focus:border-primary"
                  />
                </div>
              );
            })}
          </div>
          {!hayFamilias && (
            <p className="mt-2 text-xs text-ink-faint">
              Sin familias marcadas se guarda como fin de semana sin visita (cuenta para saber cuántos fines de semana
              nadie fue).
            </p>
          )}
        </div>

        <Field label="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Opcional..." className={`${input} resize-none`} />
        </Field>

        {error && <p className="text-xs text-status-overdue-fg">{error}</p>}

        <div className="flex items-center gap-3 border-t border-hairline pt-4">
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="mr-auto text-xs text-status-overdue-fg underline disabled:opacity-50"
            >
              Borrar evento
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className={buttonGhost}>
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className={buttonPrimary}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar visita"}
            </button>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
