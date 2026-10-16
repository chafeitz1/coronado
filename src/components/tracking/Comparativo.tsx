'use client'
import { FAMILIAS, TrackingRecord } from '@/lib/tracking/constants'

interface Props { data: TrackingRecord[]; activeYear: number }

export default function Comparativo({ data, activeYear }: Props) {
  const today = new Date()
  const curY  = activeYear > 0 ? activeYear : today.getFullYear()
  const prevY = curY - 1
  const isCurrentYear = curY === today.getFullYear()
  const ytdCutoff = isCurrentYear
    ? `${prevY}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    : null

  const cur  = data.filter(r => r.year === curY)
  const prev = data.filter(r => r.year === prevY && (!ytdCutoff || r.fecha_ini <= ytdCutoff))

  if (prev.length === 0) return (
    <div className="mb-6">
      <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>No hay datos de {prevY}.</p>
    </div>
  )

  const Arrow = ({ d }: { d: number }) => (
    <span className="text-xs ml-1 font-bold"
          style={{ color: d > 0 ? 'var(--status-done-fg)' : d < 0 ? 'var(--status-overdue-fg)' : 'var(--ink-faint)' }}>
      {d > 0 ? `+${d}▲` : d < 0 ? `${d}▼` : '—'}
    </span>
  )

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-muted)' }}>
          Comparativo {curY} vs {prevY}
        </div>
        {ytdCutoff && (
          <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
            mismo período YTD
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {FAMILIAS.map(f => {
          const curV  = cur .filter(r => r.familia === f.key).length
          const curN  = cur .filter(r => r.familia === f.key).reduce((s,r) => s + r.noches, 0)
          const prevV = prev.filter(r => r.familia === f.key).length
          const prevN = prev.filter(r => r.familia === f.key).reduce((s,r) => s + r.noches, 0)
          if (curV === 0 && prevV === 0) return null
          return (
            <div key={f.key} className="rounded-xl p-3"
                 style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-soft)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{f.short}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{curY}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{curV}v · {curN}n</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{prevY}</span>
                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{prevV}v · {prevN}n</span>
                </div>
                <div className="flex justify-end pt-0.5" style={{ borderTop: '1px solid var(--hairline)' }}>
                  <Arrow d={curV - prevV} /><span className="text-xs mx-1" style={{ color: 'var(--ink-faint)' }}>/</span><Arrow d={curN - prevN} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
