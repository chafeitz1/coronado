'use client'
import { useState, useMemo } from 'react'
import { FAMILIAS, TIPOS_EVENTO, TrackingRecord } from '@/lib/tracking/constants'

interface Props { data: TrackingRecord[] }

export default function Historial({ data }: Props) {
  const [search,   setSearch]   = useState('')
  const [famFilter, setFamFilter] = useState('all')
  const [sortDir,  setSortDir]  = useState<'desc'|'asc'>('desc')

  // Deduplicate: one row per event (using first record per eventoKey)
  const eventos = useMemo(() => {
    const map: Record<string, { key: string; evento: string; fecha_ini: string; year: number; tipo: string; familias: string[]; noches: number }> = {}
    data.forEach(r => {
      if (!map[r.eventoKey]) map[r.eventoKey] = { key: r.eventoKey, evento: r.evento, fecha_ini: r.fecha_ini, year: r.year, tipo: r.tipo, familias: [], noches: 0 }
      map[r.eventoKey].familias.push(r.familia)
      map[r.eventoKey].noches += r.noches
    })
    return Object.values(map)
  }, [data])

  const filtered = useMemo(() => {
    let evs = eventos
    if (famFilter !== 'all') evs = evs.filter(e => e.familias.includes(famFilter))
    if (search.trim()) evs = evs.filter(e => (e.evento || '').toLowerCase().includes(search.toLowerCase()))
    return [...evs].sort((a,b) => sortDir === 'desc' ? b.fecha_ini.localeCompare(a.fecha_ini) : a.fecha_ini.localeCompare(b.fecha_ini))
  }, [eventos, famFilter, search, sortDir])

  const inputStyle = { background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 13 }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar evento..." style={{ ...inputStyle, minWidth: 200 }} />
        <select value={famFilter} onChange={e => setFamFilter(e.target.value)} style={inputStyle}>
          <option value="all">Todas las familias</option>
          {FAMILIAS.map(f => <option key={f.key} value={f.key}>{f.short}</option>)}
        </select>
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'var(--hairline)', color: 'var(--ink-muted)', background: 'var(--surface)' }}>
          Fecha {sortDir === 'desc' ? '↓' : '↑'}
        </button>
        <span className="text-xs ml-auto" style={{ color: 'var(--ink-muted)' }}>{filtered.length} eventos</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
        <table className="text-xs w-full" style={{ background: 'var(--surface)' }}>
          <thead>
            <tr style={{ background: 'var(--canvas-soft)', borderBottom: '1px solid var(--hairline)' }}>
              <th className="px-3 py-2 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)' }}>Fecha</th>
              <th className="px-3 py-2 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)' }}>Evento</th>
              <th className="px-3 py-2 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)' }}>Tipo</th>
              <th className="px-3 py-2 text-left uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)' }}>Familias</th>
              <th className="px-3 py-2 text-right uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-muted)' }}>Noches</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev, idx) => {
              const tipo = TIPOS_EVENTO[ev.tipo] as { label: string; color: string } | undefined
              return (
                <tr key={ev.key} style={{ borderBottom: idx < filtered.length-1 ? '1px solid var(--hairline)' : 'none' }}
                    className="hover:bg-black/[0.02] transition-colors">
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>{ev.fecha_ini}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--ink)' }}>{ev.evento || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ background: (tipo?.color || 'var(--ink-faint)') + '20', color: tipo?.color || 'var(--ink-muted)' }}>
                      {tipo?.label || ev.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-0.5">
                      {ev.familias.map(k => {
                        const f = FAMILIAS.find(ff => ff.key === k)
                        return f ? <span key={k} className="px-1 rounded text-xs" style={{ background: f.color + '20', color: f.color }}>{f.short}</span> : null
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{ev.noches}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: 'var(--ink-muted)' }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
