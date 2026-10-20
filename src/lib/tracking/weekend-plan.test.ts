import { describe, expect, it } from 'vitest'
import { planWeekends } from './weekend-plan'

describe('planWeekends', () => {
  it('crea un viernes→domingo por semana', () => {
    const w = planWeekends('2026-10-19', '2026-11-08', [])
    expect(w.map(x => x.fecha_ini)).toEqual(['2026-10-23', '2026-10-30', '2026-11-06'])
    expect(w[0]).toMatchObject({ fecha_salida: '2026-10-25', noches: 2 })
  })
  it('salta fines de semana cubiertos por un feriado (jueves→domingo) o fiestas patrias (domingo→viernes)', () => {
    const w = planWeekends('2026-10-23', '2026-11-13', [
      { ini: '2026-10-29', fin: '2026-11-01' }, // jueves→domingo cubre el viernes 30
      { ini: '2026-11-01', fin: '2026-11-06' }, // domingo→viernes (sale el viernes 6)
    ])
    expect(w.map(x => x.fecha_ini)).toEqual(['2026-10-23', '2026-11-06', '2026-11-13'])
  })
})
