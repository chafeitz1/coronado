'use client'
import { useMemo, useState } from 'react'
import { FAMILIAS, TIPOS_EVENTO, TrackingEvent, clasificarEvento, diaSemana, fmtFecha, nochesEntre } from '@/lib/tracking/constants'
import { deleteEvent, insertEvent, updateEventFull } from '@/lib/tracking/queries'

interface Props {
  /** Si viene, el modal edita ese evento; si no, crea uno nuevo. */
  evento?: TrackingEvent | null
  onClose: () => void
  onSaved: () => void
}

export default function NuevaVisitaModal({ evento: editing, onClose, onSaved }: Props) {
  const [evento,    setEvento]    = useState(editing?.evento === 'Fin de semana' ? '' : editing?.evento ?? '')
  const [fechaIni,  setFechaIni]  = useState(editing?.fecha_ini ?? '')
  const [fechaSal,  setFechaSal]  = useState(editing?.fecha_salida ?? '')
  const [tipo,      setTipo]      = useState(editing && editing.tipo !== clasificarEvento(editing.evento) ? editing.tipo : '')
  const [notas,     setNotas]     = useState(editing?.notas ?? '')
  const [noches,    setNoches]    = useState<Record<string, number>>(editing?.asistencia ?? {})
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const nochesEvento = useMemo(() => nochesEntre(fechaIni, fechaSal), [fechaIni, fechaSal])

  const setFam = (familia: string, n: number) => setNoches(prev => ({ ...prev, [familia]: Math.max(0, n) }))
  const toggleFam = (familia: string) => setFam(familia, (noches[familia] || 0) > 0 ? 0 : (nochesEvento || 2))

  const handleSave = async () => {
    if (!fechaIni) { setError('La fecha de llegada es obligatoria.'); return }
    if (fechaSal && fechaSal < fechaIni) { setError('La salida no puede ser antes de la llegada.'); return }
    const asistencia = Object.entries(noches).filter(([, n]) => n > 0).map(([familia, n]) => ({ familia, noches: n }))
    const nombre = evento.trim() || 'Fin de semana'
    const input = { evento: nombre, fecha_ini: fechaIni, fecha_salida: fechaSal || undefined, tipo: tipo || clasificarEvento(evento), notas: notas.trim() || undefined, asistencia }
    setSaving(true); setError('')
    try {
      if (editing) await updateEventFull(editing.key, input)
      else await insertEvent(input)
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editing || !window.confirm('¿Borrar este evento y su asistencia? No se puede deshacer.')) return
    setSaving(true); setError('')
    try { await deleteEvent(editing.key); onSaved() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo borrar.'); setSaving(false) }
  }

  const inputStyle = { background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 13, width: '100%' }
  const lbl = 'text-xs font-semibold uppercase tracking-wide'
  const hayFamilias = Object.values(noches).some(n => n > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-elevated)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hairline)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>{editing ? 'Editar evento' : 'Nueva Visita'}</h2>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--ink-muted)' }}>✕</button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div>
            <label className={lbl} style={{ color: 'var(--ink-muted)' }}>Nombre del evento (opcional)</label>
            <input value={evento} onChange={e => setEvento(e.target.value)} placeholder="Ej: Sukkot — vacío = Fin de semana" style={{ ...inputStyle, marginTop: 4 }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={{ color: 'var(--ink-muted)' }}>Llegada</label>
              <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
              <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{fechaIni ? `${fmtFecha(fechaIni)} · ${diaSemana(fechaIni)}` : ''}</div>
            </div>
            <div>
              <label className={lbl} style={{ color: 'var(--ink-muted)' }}>Salida</label>
              <input type="date" value={fechaSal} onChange={e => setFechaSal(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
              <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{fechaSal ? `${fmtFecha(fechaSal)} · ${diaSemana(fechaSal)}` : ''}</div>
            </div>
          </div>
          {nochesEvento > 0 && (
            <div className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              {nochesEvento} noche{nochesEvento === 1 ? '' : 's'} en total ({diaSemana(fechaIni)} → {diaSemana(fechaSal)}). Al marcar una familia se le pone ese número; puedes ajustarlo.
            </div>
          )}
          <div>
            <label className={lbl} style={{ color: 'var(--ink-muted)' }}>Tipo de evento</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
              <option value="">Auto (detectar del nombre)</option>
              {Object.entries(TIPOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={`${lbl} mb-2 block`} style={{ color: 'var(--ink-muted)' }}>Noches por familia</label>
            <div className="grid grid-cols-2 gap-2">
              {FAMILIAS.map(f => (
                <div key={f.key} className="flex items-center gap-2 rounded-lg px-3 py-2"
                     style={{ background: 'var(--canvas-soft)', border: `1px solid ${(noches[f.key] || 0) > 0 ? f.color : 'var(--hairline)'}` }}>
                  <button type="button" onClick={() => toggleFam(f.key)} className="flex items-center gap-2 flex-1 text-left" title="Marcar / desmarcar">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="text-xs" style={{ color: 'var(--ink)' }}>{f.short}</span>
                  </button>
                  <input type="number" min={0} max={60} value={noches[f.key] || ''} placeholder="0"
                         onChange={e => setFam(f.key, parseInt(e.target.value, 10) || 0)}
                         style={{ width: 44, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--ink)', padding: '2px 4px', fontSize: 12 }} />
                </div>
              ))}
            </div>
            {!hayFamilias && (
              <p className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>
                Sin familias marcadas se guarda como fin de semana sin visita (cuenta para saber cuántos fines de semana nadie fue).
              </p>
            )}
          </div>
          <div>
            <label className={lbl} style={{ color: 'var(--ink-muted)' }}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                      style={{ ...inputStyle, marginTop: 4, resize: 'none' }} placeholder="Opcional..." />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--status-overdue-fg)' }}>{error}</p>}
        </div>
        <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--hairline)' }}>
          {editing && (
            <button onClick={handleDelete} disabled={saving} className="text-xs underline mr-auto disabled:opacity-50" style={{ color: 'var(--status-overdue-fg)' }}>
              Borrar evento
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors"
                    style={{ borderColor: 'var(--hairline)', color: 'var(--ink-muted)' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar visita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
