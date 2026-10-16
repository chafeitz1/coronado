'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FAMILIAS, MESES, TrackingRecord, HebrewBucket } from '@/lib/tracking/constants'

const CORE_KEYS = ['Papi y Mami','Flia Harari','Flia Hayo','Flia Hafeitz Assis','Flia Hafeitz Abadi','Flia Hafeitz Hanono']
const PAPI = 'Papi y Mami'
const HEBREW_MESES = ['Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago']
const HEBREW_ORDER = [8,9,10,11,0,1,2,3,4,5,6,7]

const TT = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--ink)', fontSize: 12 },
  labelStyle:   { color: 'var(--ink-muted)', fontWeight: 600 },
  itemStyle:    { color: 'var(--ink)' },
}

function famColor(k: string) { return FAMILIAS.find(f => f.key === k)?.color || 'var(--ink-faint)' }
function famShort(k: string) { return FAMILIAS.find(f => f.key === k)?.short || k }

function buildEventos(records: TrackingRecord[]) {
  const map: Record<string, { key: string; evento: string; fecha_ini: string; year: number; month: number; familias: Set<string> }> = {}
  records.forEach(r => {
    if (!map[r.eventoKey]) map[r.eventoKey] = { key: r.eventoKey, evento: r.evento, fecha_ini: r.fecha_ini, year: r.year, month: r.month, familias: new Set() }
    map[r.eventoKey].familias.add(r.familia)
  })
  return Object.values(map)
}

interface Props { data: TrackingRecord[]; allData: TrackingRecord[]; hebrewMode?: boolean; hebrewYears?: HebrewBucket[] }

export default function DatosCuriosos({ data, allData, hebrewMode = false }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null)
  const [expandedEvt,  setExpandedEvt]  = useState<number | null>(null)

  const eventosAll      = buildEventos(allData)
  const eventosFiltrado = buildEventos(data)

  const yearsAll = [...new Set(eventosAll.map(e => e.year))].sort()

  // Todos juntos (cross-year)
  const todosJuntosEvts = eventosAll.filter(e => CORE_KEYS.every(k => e.familias.has(k))).sort((a,b) => b.fecha_ini.localeCompare(a.fecha_ini))
  const tjByYear: Record<number, typeof todosJuntosEvts> = {}
  todosJuntosEvts.forEach(e => { if (!tjByYear[e.year]) tjByYear[e.year] = []; tjByYear[e.year].push(e) })
  const lastTJ = todosJuntosEvts[0]

  // Co-asistencia (filtered)
  const coMap: Record<string, typeof eventosFiltrado> = {}
  CORE_KEYS.filter(k => k !== PAPI).forEach(k => { coMap[k] = [] })
  eventosFiltrado.forEach(e => {
    if (!e.familias.has(PAPI)) return
    const others = CORE_KEYS.filter(k => k !== PAPI && e.familias.has(k))
    if (others.length !== 1) return
    coMap[others[0]].push(e)
  })
  const coRank = Object.entries(coMap).map(([key, evts]) => ({
    key, n: evts.length,
    last: [...evts].sort((a,b) => b.fecha_ini.localeCompare(a.fecha_ini))[0]?.fecha_ini || '',
  })).sort((a,b) => b.n - a.n)

  // Mes popular (filtered)
  const mesCounts = Array(12).fill(0)
  data.forEach(r => { if (r.month >= 0) mesCounts[r.month]++ })
  const monthOrder  = hebrewMode ? HEBREW_ORDER : [0,1,2,3,4,5,6,7,8,9,10,11]
  const monthLabels = hebrewMode ? HEBREW_MESES : [...MESES]
  const mesData = monthOrder.map((mi, i) => ({ name: monthLabels[i], visitas: mesCounts[mi] }))

  // Invitados (filtered)
  const invEvts = eventosFiltrado.filter(e => e.familias.has('Invitados')).sort((a,b) => b.fecha_ini.localeCompare(a.fecha_ini))

  const card = { background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Todos juntos */}
        <div className="rounded-xl p-4" style={card}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--ink-muted)' }}>✨ Todos Juntos (6 de 6)</div>
          <div className="flex items-center gap-4 mb-3 pb-3" style={{ borderBottom: '1px solid var(--hairline)' }}>
            <div><span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{todosJuntosEvts.length}</span><span className="text-xs ml-1" style={{ color: 'var(--ink-muted)' }}>veces</span></div>
            {lastTJ && (
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>Último</div>
                <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{lastTJ.evento}</div>
                <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>{lastTJ.fecha_ini}</div>
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            {yearsAll.filter(y => tjByYear[y]).map(y => {
              const evts = tjByYear[y]; const isOpen = expandedYear === y
              return (
                <div key={y}>
                  <button className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-black/5 transition-colors"
                          onClick={() => setExpandedYear(isOpen ? null : y)}>
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{y}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: 'var(--primary)' }}>{evts.length}×</span>
                      <span style={{ color: 'var(--ink-faint)', fontSize: 9 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isOpen && evts.map((e,i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5 pl-4" style={{ color: 'var(--ink-muted)' }}>
                      <span className="truncate pr-2">{e.evento || '—'}</span>
                      <span className="shrink-0">{e.fecha_ini}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Co-asistencia */}
        <div className="rounded-xl p-4" style={card}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--ink-muted)' }}>🤝 Solos con Papi y Mami</div>
          <div className="text-xs mb-3" style={{ color: 'var(--ink-faint)' }}>Solo una familia extra (Musi no cuenta)</div>
          <div className="space-y-2">
            {coRank.map(({ key, n, last }, i) => (
              <div key={key} className="flex items-center gap-2">
                <div className="text-xs w-3 text-right font-bold" style={{ color: 'var(--ink-faint)' }}>{i+1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: famColor(key) }}>{famShort(key)}</span>
                    <div>
                      <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{n}</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--ink-muted)' }}>v</span>
                      {last && <span className="text-xs ml-2" style={{ color: 'var(--ink-faint)' }}>{last}</span>}
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--canvas-soft)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(n/(coRank[0]?.n||1))*100}%`, background: famColor(key) }} />
                  </div>
                </div>
              </div>
            ))}
            {coRank.every(c => c.n === 0) && <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Sin datos para el período.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mes popular */}
        <div className="rounded-xl p-4" style={card}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--ink-muted)' }}>📅 Mes Más Popular</div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mesData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--ink-muted)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 9 }} />
                <Tooltip {...TT} formatter={(v) => [`${v} visitas`, '']} />
                <Bar dataKey="visitas" radius={[2,2,0,0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invitados */}
        <div className="rounded-xl p-4" style={card}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-muted)' }}>🎉 Eventos con Invitados</div>
            <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{invEvts.length}</span>
          </div>
          <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 160 }}>
            {invEvts.length === 0 && <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Sin eventos con invitados.</p>}
            {invEvts.map((e, i) => {
              const others = CORE_KEYS.filter(k => e.familias.has(k))
              const isOpen = expandedEvt === i
              const notes = allData.filter(r => r.eventoKey === e.key).map(r => r.notas).filter(Boolean)
              return (
                <div key={i} className="rounded overflow-hidden" style={{ border: '1px solid var(--hairline)' }}>
                  <button className="w-full flex items-start justify-between gap-2 p-2 hover:bg-black/5 transition-colors text-left"
                          onClick={() => setExpandedEvt(isOpen ? null : i)}>
                    <div className="min-w-0">
                      <div className="text-xs truncate" style={{ color: 'var(--ink)' }}>{e.evento}</div>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {others.map(k => <span key={k} className="text-xs px-1 rounded" style={{ background: famColor(k) + '20', color: famColor(k) }}>{famShort(k)}</span>)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{e.fecha_ini}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>{isOpen ? '▲' : '▼'}</div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-2 text-xs" style={{ borderTop: '1px solid var(--hairline)', color: 'var(--ink-muted)' }}>
                      {notes.length > 0
                        ? notes.map((n, j) => <div key={j} className="mt-1">{n}</div>)
                        : <div className="mt-1 italic" style={{ color: 'var(--ink-faint)' }}>Sin notas registradas.</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
