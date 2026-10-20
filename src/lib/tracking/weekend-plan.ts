/** Lógica pura para crear fines de semana (viernes → domingo) que faltan. La usan
 *  el botón "Rellenar fines de semana" (navegador) y el cron diario (servidor). */

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
}

export interface Span { ini: string; fin: string }
export interface PlannedWeekend { evento: string; fecha_ini: string; fecha_salida: string; tipo: string; noches: number }

/** Un viernes por semana entre `from` y `to` que no se cruce con un evento ya registrado
 *  (así un feriado de jueves a domingo, o fiestas patrias de domingo a viernes, no se duplica). */
export function planWeekends(from: string, to: string, existing: Span[]): PlannedWeekend[] {
  let d = from
  while (new Date(Date.parse(d + 'T00:00:00Z')).getUTCDay() !== 5) d = addDays(d, 1)
  const out: PlannedWeekend[] = []
  for (; d <= to; d = addDays(d, 7)) {
    const end = addDays(d, 2)
    const overlaps = existing.some(s => s.ini < end && s.fin > d)
    if (!overlaps) out.push({ evento: 'Fin de semana', fecha_ini: d, fecha_salida: end, tipo: 'Weekend', noches: 2 })
  }
  return out
}
