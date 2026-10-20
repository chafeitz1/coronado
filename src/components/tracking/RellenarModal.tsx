"use client";
import { useState } from "react";
import { fmtFecha, hoyISO } from "@/lib/tracking/constants";
import { generateWeekends } from "@/lib/tracking/queries";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { buttonGhost, buttonPrimary, input, mutedText } from "@/lib/ui";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

/** Crea los fines de semana (viernes → domingo) que falten en un rango, para
 *  que cuenten también los fines de semana en que nadie fue. Los que se
 *  cruzan con un evento ya registrado (feriado, fiesta) se saltan. */
export default function RellenarModal({ onClose, onSaved }: Props) {
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const run = async () => {
    if (!desde || !hasta || hasta < desde) {
      setError("Elige un rango válido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      setDone(await generateWeekends(desde, hasta));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel open onClose={onClose} title="Rellenar fines de semana">
      <div className="space-y-4">
        <p className={mutedText}>
          Crea un fin de semana normal (viernes → domingo, 2 noches, sin familias) por cada viernes del rango que no
          tenga ya un evento. Si un feriado o fiesta ya cubre esas fechas (por ejemplo jueves → domingo), no se
          duplica. Después puedes hacer clic en cualquier fila del Historial para cambiar fechas, noches o familias.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setDone(null);
              }}
              className={input}
            />
            <p className="mt-1 text-xs text-ink-muted">{desde && fmtFecha(desde)}</p>
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setDone(null);
              }}
              className={input}
            />
            <p className="mt-1 text-xs text-ink-muted">{hasta && fmtFecha(hasta)}</p>
          </Field>
        </div>
        {done !== null && (
          <p className="text-sm font-medium text-status-done-fg">
            {done === 0 ? "No faltaba ningún fin de semana en ese rango." : `Se crearon ${done} fines de semana.`}
          </p>
        )}
        {error && <p className="text-xs text-status-overdue-fg">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4">
          <button type="button" onClick={done !== null ? onSaved : onClose} className={buttonGhost}>
            {done !== null ? "Listo" : "Cancelar"}
          </button>
          {done === null && (
            <button type="button" onClick={run} disabled={saving} className={buttonPrimary}>
              {saving ? "Creando…" : "Crear fines de semana"}
            </button>
          )}
        </div>
      </div>
    </SidePanel>
  );
}
