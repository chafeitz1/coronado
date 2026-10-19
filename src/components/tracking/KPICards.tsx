'use client'
import { FAMILIAS, TrackingEvent, TrackingRecord, hoyISO } from '@/lib/tracking/constants'

interface Props { data: TrackingRecord[]; allData: TrackingRecord[]; events: TrackingEvent[]; activeYear: number }

export default function KPICards({ data, allData, events, activeYear }: Props) {
  const totalVisitas   = data.length
  const totalNoches    = data.reduce((s, r) => s + (r.noches || 0), 0)
  const famActivas     = new Set(data.map(r => r.familia)).size
  const mesesConVisita = new Set(data.filter(r => r.year > 0).map(r => `${r.year}-${String(r.month+1).padStart(2,'0')}`)).size
  const totalMeses     = activeYear === 0
    ? (new Set(allData.filter(r => r.year > 0).map(r => `${r.year}-${String(r.month+1).padStart(2,'0')}`)).size || 1)
    : 12
  const util = Math.round(mesesConVisita / totalMeses * 100)
  const hoy = hoyISO()
  const pasados = events.filter(e => e.fecha_ini <= hoy)
  const sinVisita = pasados.filter(e => !Object.values(e.asistencia).some(n => n > 0)).length

  const cards = [
    { label: 'Total Visitas',    value: totalVisitas,                          sub: 'registros de asistencia',   color: '#0ea5e9' },
    { label: 'Total Noches',     value: totalNoches,                           sub: 'noches acumuladas',          color: '#14b8a6' },
    { label: 'Familias Activas', value: `${famActivas}/${FAMILIAS.length}`,    sub: 'familias con visitas',       color: '#a78bfa' },
    { label: 'Fines sin visita', value: sinVisita,                           sub: `de ${pasados.length} fines de semana/eventos`, color: '#94a3b8' },
    { label: '% Utilización',    value: `${util}%`,                            sub: `${mesesConVisita} meses con visita`, color: '#f59e0b' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl p-4"
             style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--ink-muted)' }}>{c.label}</div>
          <div className="text-3xl font-bold leading-none mb-1" style={{ color: c.color }}>{c.value}</div>
          <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
