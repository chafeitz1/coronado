'use client'
import { useMemo, useState } from 'react'
import { FAMILIAS, TIPOS_EVENTO, TrackingRecord } from '@/lib/tracking/constants'

function fmtDate(iso: string) { return iso?.length >= 10 ? `${iso.slice(8,10)}/${iso.slice(5,7)}` : iso || '' }
function fmtDateFull(iso: string | null | undefined) {
  if (!iso || iso.length < 10) return iso || '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

interface EventRow { key: string; evento: string; fecha_ini: string; year: number; month: number; tipo: string; familias: Record<string, TrackingRecord> }

function buildCalendario(records: TrackingRecord[]): EventRow[] {
  const map = new Map<string, EventRow>()
  records.forEach(r => {
    if (!map.has(r.eventoKey)) map.set(r.eventoKey, { key: r.eventoKey, evento: r.evento, fecha_ini: r.fecha_ini, year: r.year, month: r.month, tipo: r.tipo, familias: {} })
    map.get(r.eventoKey)!.familias[r.familia] = r
  })
  return [...map.values()].sort((a,b) => (b.fecha_ini || '').localeCompare(a.fecha_ini || ''))
}

interface Props { allData: TrackingRecord[]; activeYear: number }

export default function CalendarioView({ allData, activeYear }: Props) {
  const [yearFilter, setYearFilter] = useState(activeYear || 0)
  const [search,     setSearch]     = useState('')

  const eventos = useMemo(() => {
    let evs = buildCalendario(allData)
    if (yearFilter > 0) evs = evs.filter(e => e.year === yearFilter)
    if (search.trim()) evs = evs.filter(e => (e.evento || '').toLowerCase().includes(search.toLowerCase()))
    return evs
  }, [allData, yearFilter, search])

  const years = [0, ...new Set(allData.map(r => r.year))].sort()
  const inputStyle = { background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 13 }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))} style={inputStyle}>
          {years.map(y => <option key={y} value={y}>{y === 0 ? 'Todos los años' : y}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar evento..." style={{ ...inputStyle, minWidth: 200 }} />
        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{eventos.length} eventos</span>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
        <table className="text-xs" style={{ background: 'var(--surface)', minWidth: 900, width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--canvas-soft)', borderBottom: '1px solid var(--hairline)' }}>
              <th className="px-3 py-3 text-left uppercase tracking-wide font-semibold sticky left-0"
                  style={{ color: 'var(--ink-muted)', background: 'var(--canvas-soft)', minWidth: 160 }}>Evento</th>
              <th className="px-2 py-3 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)', minWidth: 70 }}>Inicio</th>
              <th className="px-2 py-3 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)', minWidth: 70 }}>Fin</th>
              <th className="px-2 py-3 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)', minWidth: 80 }}>Tipo</th>
              {FAMILIAS.map(f => (
                <th key={f.key} className="px-2 py-3 text-center font-semibold" style={{ minWidth: 72, color: f.color }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                    <span>{f.short}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventos.map((ev, idx) => {
              const tipo    = TIPOS_EVENTO[ev.tipo] as { label: string; color: string } | undefined
              const recs    = Object.values(ev.familias)
              const minDate = recs.map(r => r.fecha_ini).filter(Boolean).sort()[0]
              const maxDate = recs.map(r => r.fecha_salida).filter(Boolean).sort().at(-1)
              return (
                <tr key={ev.key} style={{ borderBottom: idx < eventos.length-1 ? '1px solid var(--hairline)' : 'none' }}
                    className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-3 py-2 font-medium sticky left-0"
                      style={{ color: 'var(--ink)', background: 'var(--surface)', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.evento || '—'}
                  </td>
                  <td className="px-2 py-2 tabular-nums whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>{fmtDateFull(minDate)}</td>
                  <td className="px-2 py-2 tabular-nums whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>{fmtDateFull(maxDate)}</td>
                  <td className="px-2 py-2">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ background: (tipo?.color || '#64748b') + '20', color: tipo?.color || 'var(--ink-muted)' }}>
                      {tipo?.label || ev.tipo}
                    </span>
                  </td>
                  {FAMILIAS.map(f => {
                    const r = ev.familias[f.key]
                    if (!r) return <td key={f.key} className="px-2 py-2 text-center" style={{ color: 'var(--ink-faint)' }}>—</td>
                    return (
                      <td key={f.key} className="px-1 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span style={{ color: f.color }}>✓</span>
                          {r.fecha_ini && <span className="tabular-nums" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{fmtDate(r.fecha_ini)}{r.fecha_salida ? `–${fmtDate(r.fecha_salida)}` : ''}</span>}
                          {r.noches > 0 && <span className="font-bold" style={{ color: f.color, fontSize: 10 }}>{r.noches}n</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {eventos.length === 0 && (
              <tr><td colSpan={4 + FAMILIAS.length} className="px-4 py-10 text-center" style={{ color: 'var(--ink-muted)' }}>Sin eventos para el período seleccionado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
