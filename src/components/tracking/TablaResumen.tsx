'use client'
import { useState } from 'react'
import { FAMILIAS, MESES, TrackingRecord, HebrewBucket } from '@/lib/tracking/constants'

const CIVIL_ORDER  = [0,1,2,3,4,5,6,7,8,9,10,11]
const HEBREW_ORDER = [8,9,10,11,0,1,2,3,4,5,6,7]
const HEBREW_MESES = ['Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago']

interface Props {
  data: TrackingRecord[]
  allData: TrackingRecord[]
  hebrewMode?: boolean
  hebrewYears?: HebrewBucket[]
}

export default function TablaResumen({ data, allData, hebrewMode = false, hebrewYears = [] }: Props) {
  const [metric, setMetric] = useState<'visitas'|'noches'>('visitas')
  const [view,   setView]   = useState<'mensual'|'anual'>('mensual')

  const monthOrder  = hebrewMode ? HEBREW_ORDER : CIVIL_ORDER
  const monthLabels = hebrewMode ? HEBREW_MESES : [...MESES]

  // ── Mensual: rows = familia, cols = months ────────────────────────────────
  const matrizMes: Record<string, Record<number, number>> = {}
  FAMILIAS.forEach(f => { matrizMes[f.key] = {} })
  data.forEach(r => {
    if (!matrizMes[r.familia]) matrizMes[r.familia] = {}
    const m = r.month
    if (m < 0) return
    if (metric === 'noches') {
      matrizMes[r.familia][m] = (matrizMes[r.familia][m] || 0) + r.noches
    } else {
      matrizMes[r.familia][m] = (matrizMes[r.familia][m] || 0) + 1
    }
  })

  // ── Anual: rows = familia, cols = years ───────────────────────────────────
  const yearsAll = hebrewMode
    ? hebrewYears.map(b => ({ key: b.startYear, label: b.label }))
    : [...new Set(allData.map(r => r.year))].filter(y => y > 0).sort().map(y => ({ key: y, label: String(y) }))

  const matrizYear: Record<string, Record<number, number>> = {}
  FAMILIAS.forEach(f => { matrizYear[f.key] = {} })
  allData.forEach(r => {
    let yKey = r.year
    if (hebrewMode) {
      const bucket = hebrewYears.find(b => r.fecha_ini >= b.start && r.fecha_ini < b.end)
      if (!bucket) return
      yKey = bucket.startYear
    }
    if (!matrizYear[r.familia]) matrizYear[r.familia] = {}
    if (metric === 'noches') {
      matrizYear[r.familia][yKey] = (matrizYear[r.familia][yKey] || 0) + r.noches
    } else {
      matrizYear[r.familia][yKey] = (matrizYear[r.familia][yKey] || 0) + 1
    }
  })

  const maxVal = view === 'mensual'
    ? Math.max(1, ...FAMILIAS.flatMap(f => monthOrder.map(mi => matrizMes[f.key]?.[mi] || 0)))
    : Math.max(1, ...FAMILIAS.flatMap(f => yearsAll.map(y  => matrizYear[f.key]?.[y.key] || 0)))

  const cellColor = (v: number, fam: typeof FAMILIAS[number]) => {
    if (!v) return 'transparent'
    const alpha = Math.max(0.08, (v / maxVal) * 0.85)
    return `${fam.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
  }

  const cols      = view === 'mensual' ? monthOrder.map((mi, i) => ({ key: mi, label: monthLabels[i] })) : yearsAll
  const getVal    = (fKey: string, colKey: number) =>
    view === 'mensual' ? (matrizMes[fKey]?.[colKey] || 0) : (matrizYear[fKey]?.[colKey] || 0)
  const rowTotal  = (fKey: string) => cols.reduce((s, c) => s + getVal(fKey, c.key), 0)
  const colTotal  = (colKey: number) => FAMILIAS.reduce((s, f) => s + getVal(f.key, colKey), 0)
  const grandTotal = FAMILIAS.reduce((s, f) => s + rowTotal(f.key), 0)

  const th = { background: 'var(--canvas-soft)', color: 'var(--ink-muted)', fontWeight: 600, fontSize: 11 }
  const td = { color: 'var(--ink)', fontSize: 12 }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-muted)' }}>
          Distribución por Familia y Mes
        </span>
        <div className="flex gap-1 ml-auto">
          {(['visitas','noches'] as const).map(m => (
            <button key={m} onClick={() => setMetric(m)}
                    className="px-2 py-0.5 rounded text-xs font-medium transition-all capitalize"
                    style={metric === m
                      ? { background: 'var(--primary)', color: 'var(--on-primary)' }
                      : { background: 'transparent', color: 'var(--ink-muted)', border: '1px solid var(--hairline)' }}>
              {m}
            </button>
          ))}
          {(['mensual','anual'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
                    className="px-2 py-0.5 rounded text-xs font-medium transition-all capitalize"
                    style={view === v
                      ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                      : { background: 'transparent', color: 'var(--ink-muted)', border: '1px solid var(--hairline)' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
        <div className="overflow-x-auto">
          <table className="text-xs w-full" style={{ background: 'var(--surface)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                <th className="px-3 py-2 text-left sticky left-0" style={{ ...th, background: 'var(--canvas-soft)', minWidth: 88 }}>Familia</th>
                {cols.map(c => (
                  <th key={c.key} className="px-1 py-2 text-center" style={{ ...th, minWidth: 36 }}>{c.label}</th>
                ))}
                <th className="px-2 py-2 text-center font-bold" style={{ ...th }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {FAMILIAS.filter(f => rowTotal(f.key) > 0).map(f => (
                <tr key={f.key} style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <td className="px-3 py-2 font-semibold sticky left-0" style={{ ...td, background: 'var(--surface)', color: f.color }}>
                    {f.short}
                  </td>
                  {cols.map(c => {
                    const v = getVal(f.key, c.key)
                    return (
                      <td key={c.key} className="px-1 py-2 text-center font-medium tabular-nums"
                          style={{ ...td, background: cellColor(v, f) }}>
                        {v || <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-center font-bold tabular-nums" style={{ ...td, color: f.color }}>{rowTotal(f.key)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ borderTop: '2px solid var(--hairline)', background: 'var(--canvas-soft)' }}>
                <td className="px-3 py-2 font-bold sticky left-0" style={{ ...td, background: 'var(--canvas-soft)' }}>TOTAL</td>
                {cols.map(c => (
                  <td key={c.key} className="px-1 py-2 text-center font-bold tabular-nums" style={td}>{colTotal(c.key) || '—'}</td>
                ))}
                <td className="px-2 py-2 text-center font-bold tabular-nums" style={{ ...td, color: 'var(--primary)' }}>{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
