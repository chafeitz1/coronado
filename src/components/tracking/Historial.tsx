'use client'
import { useMemo, useState } from 'react'
import { FAMILIAS, TIPOS_EVENTO, TrackingEvent, diaSemana, fmtFecha, hoyISO, nochesEntre } from '@/lib/tracking/constants'

interface Props {
  events: TrackingEvent[]
  onEdit: (ev: TrackingEvent) => void
  onGenerate: () => void
}

type Estado = 'todos' | 'con' | 'sin'
const COLS_FIJAS = [
  { key: 'fin',    label: 'Fin' },
  { key: 'tipo',   label: 'Tipo' },
  { key: 'noches', label: 'Noches' },
] as const

const sumNoches = (e: TrackingEvent) => Object.values(e.asistencia).reduce((s, n) => s + n, 0)
const huboVisita = (e: TrackingEvent) => Object.values(e.asistencia).some(n => n > 0)

/** Historial + Calendario en una sola tabla: una fila por evento (incluso los
 *  fines de semana en que nadie fue) con una columna por familia. */
export default function Historial({ events, onEdit, onGenerate }: Props) {
  const [search, setSearch]   = useState('')
  const [famFilter, setFam]   = useState('all')
  const [tipoFilter, setTipo] = useState('all')
  const [estado, setEstado]   = useState<Estado>('todos')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [open, setOpen]       = useState(false)
  const [hidden, setHidden]   = useState<Set<string>>(new Set())

  const toggleHidden = (k: string) => setHidden(prev => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })

  const filtered = useMemo(() => {
    let evs = events
    if (famFilter !== 'all')  evs = evs.filter(e => (e.asistencia[famFilter] || 0) > 0)
    if (tipoFilter !== 'all') evs = evs.filter(e => e.tipo === tipoFilter)
    if (estado === 'con')     evs = evs.filter(huboVisita)
    if (estado === 'sin')     evs = evs.filter(e => !huboVisita(e))
    if (search.trim())        evs = evs.filter(e => (e.evento || '').toLowerCase().includes(search.toLowerCase()))
    return [...evs].sort((a, b) => sortDir === 'desc' ? b.fecha_ini.localeCompare(a.fecha_ini) : a.fecha_ini.localeCompare(b.fecha_ini))
  }, [events, famFilter, tipoFilter, estado, search, sortDir])

  const famVisibles = FAMILIAS.filter(f => !hidden.has(f.key))
  const hoy = hoyISO()
  const sinVisitaPasados = events.filter(e => !huboVisita(e) && e.fecha_ini <= hoy).length
  const filtrosActivos = (famFilter !== 'all' ? 1 : 0) + (tipoFilter !== 'all' ? 1 : 0) + (estado !== 'todos' ? 1 : 0) + hidden.size

  const field = { background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 13, width: '100%' } as const
  const lbl = 'text-xs font-semibold uppercase tracking-wide'
  const th = 'px-2 py-2 text-left uppercase tracking-wide font-semibold whitespace-nowrap'

  const totales = FAMILIAS.map(f => ({
    key: f.key,
    noches: filtered.reduce((s, e) => s + (e.asistencia[f.key] || 0), 0),
    veces: filtered.filter(e => (e.asistencia[f.key] || 0) > 0).length,
  }))

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar evento..." style={{ ...field, width: 220 }} />

        {/* Filtros + columnas en un solo botón */}
        <div className="relative">
          <button onClick={() => setOpen(o => !o)}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
                  style={{ borderColor: filtrosActivos ? 'var(--primary)' : 'var(--hairline)', color: filtrosActivos ? 'var(--primary)' : 'var(--ink-muted)', background: 'var(--surface)' }}>
            Filtros y columnas{filtrosActivos ? ` · ${filtrosActivos}` : ''} ▾
          </button>
          {open && (
            <>
              <button aria-label="Cerrar" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-40 w-72 rounded-xl p-4 space-y-4"
                   style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-elevated)' }}>
                <div className="space-y-2">
                  <div className={lbl} style={{ color: 'var(--ink-muted)' }}>Filtros</div>
                  <select value={estado} onChange={e => setEstado(e.target.value as Estado)} style={field}>
                    <option value="todos">Todos los fines de semana</option>
                    <option value="con">Solo con visita</option>
                    <option value="sin">Solo sin visita</option>
                  </select>
                  <select value={famFilter} onChange={e => setFam(e.target.value)} style={field}>
                    <option value="all">Todas las familias</option>
                    {FAMILIAS.map(f => <option key={f.key} value={f.key}>{f.short}</option>)}
                  </select>
                  <select value={tipoFilter} onChange={e => setTipo(e.target.value)} style={field}>
                    <option value="all">Todos los tipos</option>
                    {Object.entries(TIPOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className={lbl} style={{ color: 'var(--ink-muted)' }}>Columnas visibles</div>
                  {COLS_FIJAS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink)' }}>
                      <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleHidden(c.key)} /> {c.label}
                    </label>
                  ))}
                  {FAMILIAS.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink)' }}>
                      <input type="checkbox" checked={!hidden.has(f.key)} onChange={() => toggleHidden(f.key)} />
                      <span className="w-2 h-2 rounded-full" style={{ background: f.color }} /> {f.short}
                    </label>
                  ))}
                </div>
                {filtrosActivos > 0 && (
                  <button className="text-xs underline" style={{ color: 'var(--ink-muted)' }}
                          onClick={() => { setFam('all'); setTipo('all'); setEstado('todos'); setHidden(new Set()) }}>
                    Quitar filtros y mostrar todo
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'var(--hairline)', color: 'var(--ink-muted)', background: 'var(--surface)' }}>
          Fecha {sortDir === 'desc' ? '↓' : '↑'}
        </button>
        <button onClick={onGenerate}
                className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'var(--hairline)', color: 'var(--ink-muted)', background: 'var(--surface)' }}>
          + Rellenar fines de semana
        </button>
        <span className="text-xs ml-auto" style={{ color: 'var(--ink-muted)' }}>
          {filtered.length} eventos · {sinVisitaPasados} fines de semana sin visita (hasta hoy)
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
        <table className="text-xs w-full" style={{ background: 'var(--surface)', minWidth: 720 }}>
          <thead>
            <tr style={{ background: 'var(--canvas-soft)', borderBottom: '1px solid var(--hairline)' }}>
              <th className={th} style={{ color: 'var(--ink-muted)' }}>Inicio</th>
              {!hidden.has('fin') && <th className={th} style={{ color: 'var(--ink-muted)' }}>Fin</th>}
              <th className={th} style={{ color: 'var(--ink-muted)' }}>Evento</th>
              {!hidden.has('tipo') && <th className={th} style={{ color: 'var(--ink-muted)' }}>Tipo</th>}
              {!hidden.has('noches') && <th className={`${th} text-right`} style={{ color: 'var(--ink-muted)' }}>Noches</th>}
              {famVisibles.map(f => (
                <th key={f.key} className="px-2 py-2 text-center font-semibold whitespace-nowrap" style={{ color: f.color }}>{f.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev, idx) => {
              const tipo = TIPOS_EVENTO[ev.tipo] as { label: string; color: string } | undefined
              const vacio = !huboVisita(ev)
              return (
                <tr key={ev.key} onClick={() => onEdit(ev)}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--hairline)' : 'none', opacity: vacio ? 0.6 : 1, cursor: 'pointer' }}
                    className="hover:bg-black/[0.03] transition-colors" title="Clic para editar">
                  <td className="px-2 py-2 tabular-nums whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                    {fmtFecha(ev.fecha_ini)} <span style={{ color: 'var(--ink-faint)' }}>{diaSemana(ev.fecha_ini)}</span>
                  </td>
                  {!hidden.has('fin') && (
                    <td className="px-2 py-2 tabular-nums whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>
                      {fmtFecha(ev.fecha_salida)} <span style={{ color: 'var(--ink-faint)' }}>{diaSemana(ev.fecha_salida)}</span>
                    </td>
                  )}
                  <td className="px-2 py-2 font-medium" style={{ color: 'var(--ink)' }}>
                    {ev.evento || '—'}{vacio && <span className="ml-1.5 text-[10px] font-normal" style={{ color: 'var(--ink-faint)' }}>sin visita</span>}
                  </td>
                  {!hidden.has('tipo') && (
                    <td className="px-2 py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ background: (tipo?.color || 'var(--ink-faint)') + '20', color: tipo?.color || 'var(--ink-muted)' }}>
                        {tipo?.label || ev.tipo}
                      </span>
                    </td>
                  )}
                  {!hidden.has('noches') && (
                    <td className="px-2 py-2 text-right tabular-nums" style={{ color: 'var(--ink)' }}>
                      {nochesEntre(ev.fecha_ini, ev.fecha_salida) || '—'}
                      {sumNoches(ev) > 0 && <span className="ml-1" style={{ color: 'var(--ink-faint)' }}>({sumNoches(ev)})</span>}
                    </td>
                  )}
                  {famVisibles.map(f => {
                    const n = ev.asistencia[f.key]
                    return (
                      <td key={f.key} className="px-2 py-2 text-center tabular-nums font-semibold"
                          style={n ? { color: f.color, background: f.color + '14' } : { color: 'var(--ink-faint)' }}>
                        {n ? n : '—'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center" style={{ color: 'var(--ink-muted)' }}>Sin resultados</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--hairline)', background: 'var(--canvas-soft)' }}>
                <td className="px-2 py-2 font-bold" style={{ color: 'var(--ink)' }} colSpan={1 + (hidden.has('fin') ? 0 : 1) + 1 + (hidden.has('tipo') ? 0 : 1) + (hidden.has('noches') ? 0 : 1)}>
                  Total (noches · veces)
                </td>
                {famVisibles.map(f => {
                  const t = totales.find(x => x.key === f.key)!
                  return <td key={f.key} className="px-2 py-2 text-center font-bold tabular-nums" style={{ color: f.color }}>{t.noches} · {t.veces}</td>
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>
        Noches = fecha fin − fecha inicio; entre paréntesis, la suma de noches de las familias. Haz clic en una fila para editarla.
      </p>
    </div>
  )
}
