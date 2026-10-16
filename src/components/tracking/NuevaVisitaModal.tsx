'use client'
import { useState } from 'react'
import { FAMILIAS, TIPOS_EVENTO, clasificarEvento } from '@/lib/tracking/constants'
import { insertEvent } from '@/lib/tracking/queries'

interface Props { onClose: () => void; onSaved: () => void }

export default function NuevaVisitaModal({ onClose, onSaved }: Props) {
  const [evento,    setEvento]    = useState('')
  const [fechaIni,  setFechaIni]  = useState('')
  const [fechaSal,  setFechaSal]  = useState('')
  const [tipo,      setTipo]      = useState('')
  const [notas,     setNotas]     = useState('')
  const [noches,    setNoches]    = useState<Record<string, number>>({})
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const handleNochesChange = (familia: string, val: string) => {
    const n = parseInt(val, 10)
    setNoches(prev => ({ ...prev, [familia]: isNaN(n) ? 0 : n }))
  }

  const handleSave = async () => {
    if (!evento.trim() || !fechaIni) { setError('Nombre del evento y fecha de llegada son obligatorios.'); return }
    const asistencia = Object.entries(noches).filter(([, n]) => n > 0).map(([familia, n]) => ({ familia, noches: n }))
    if (asistencia.length === 0) { setError('Selecciona al menos una familia con noches > 0.'); return }
    setSaving(true); setError('')
    try {
      await insertEvent({ evento: evento.trim(), fecha_ini: fechaIni, fecha_salida: fechaSal || undefined, tipo: tipo || clasificarEvento(evento), notas: notas || undefined, asistencia })
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); setSaving(false) }
  }

  const inputStyle = { background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 13, width: '100%' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-elevated)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hairline)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Nueva Visita</h2>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--ink-muted)' }}>✕</button>
        </div>
        {/* Body */}
        <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Nombre del evento</label>
            <input value={evento} onChange={e => setEvento(e.target.value)} placeholder="Ej: Sukkot 2026" style={{ ...inputStyle, marginTop: 4 }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Llegada</label>
              <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Salida</label>
              <input type="date" value={fechaSal} onChange={e => setFechaSal(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Tipo de evento</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
              <option value="">Auto (detectar del nombre)</option>
              {Object.entries(TIPOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {/* Family nights */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--ink-muted)' }}>Noches por familia</label>
            <div className="grid grid-cols-2 gap-2">
              {FAMILIAS.map(f => (
                <div key={f.key} className="flex items-center gap-2 rounded-lg px-3 py-2"
                     style={{ background: 'var(--canvas-soft)', border: '1px solid var(--hairline)' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--ink)' }}>{f.short}</span>
                  <input type="number" min={0} max={30} value={noches[f.key] || ''} placeholder="0"
                         onChange={e => handleNochesChange(f.key, e.target.value)}
                         style={{ width: 44, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--ink)', padding: '2px 4px', fontSize: 12 }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                      style={{ ...inputStyle, marginTop: 4, resize: 'none' }} placeholder="Opcional..." />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--status-overdue-fg)' }}>{error}</p>}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--hairline)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors"
                  style={{ borderColor: 'var(--hairline)', color: 'var(--ink-muted)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
            {saving ? 'Guardando…' : 'Guardar visita'}
          </button>
        </div>
      </div>
    </div>
  )
}
