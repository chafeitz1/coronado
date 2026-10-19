'use client'
import { useState } from 'react'
import { fmtFecha, hoyISO } from '@/lib/tracking/constants'
import { generateWeekends } from '@/lib/tracking/queries'

interface Props { onClose: () => void; onSaved: () => void }

/** Crea los fines de semana (viernes → domingo) que falten en un rango, para
 *  que cuenten también los fines de semana en que nadie fue. Los que se
 *  cruzan con un evento ya registrado (feriado, fiesta) se saltan. */
export default function RellenarModal({ onClose, onSaved }: Props) {
  const [desde, setDesde] = useState(hoyISO())
  const [hasta, setHasta] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<number | null>(null)

  const run = async () => {
    if (!desde || !hasta || hasta < desde) { setError('Elige un rango válido.'); return }
    setSaving(true); setError('')
    try { setDone(await generateWeekends(desde, hasta)) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar.') }
    finally { setSaving(false) }
  }

  const inputStyle = { background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 13, width: '100%' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-elevated)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hairline)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Rellenar fines de semana</h2>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--ink-muted)' }}>✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
            Crea un fin de semana normal (viernes → domingo, 2 noches, sin familias) por cada viernes del rango que no tenga ya un evento.
            Si un feriado o fiesta ya cubre esas fechas (por ejemplo jueves → domingo), no se duplica. Después puedes hacer clic en cualquier fila del Historial para cambiar fechas, noches o familias.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Desde</label>
              <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setDone(null) }} style={{ ...inputStyle, marginTop: 4 }} />
              <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{desde && fmtFecha(desde)}</div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Hasta</label>
              <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setDone(null) }} style={{ ...inputStyle, marginTop: 4 }} />
              <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{hasta && fmtFecha(hasta)}</div>
            </div>
          </div>
          {done !== null && <p className="text-sm font-medium" style={{ color: 'var(--status-done-fg)' }}>{done === 0 ? 'No faltaba ningún fin de semana en ese rango.' : `Se crearon ${done} fines de semana.`}</p>}
          {error && <p className="text-xs" style={{ color: 'var(--status-overdue-fg)' }}>{error}</p>}
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--hairline)' }}>
          <button onClick={done !== null ? onSaved : onClose} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--hairline)', color: 'var(--ink-muted)' }}>
            {done !== null ? 'Listo' : 'Cancelar'}
          </button>
          {done === null && (
            <button onClick={run} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
              {saving ? 'Creando…' : 'Crear fines de semana'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
