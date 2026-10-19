/**
 * queries.ts — Supabase data layer para Tracking de Visitas
 * Reemplaza sheets.js de Casa Bonsai.
 */
import { createClient } from '@/lib/supabase/client'
import { clasificarEvento, TrackingEvent, TrackingRecord } from './constants'

interface EventRow {
  id: string
  evento: string
  fecha_ini: string | null
  fecha_salida: string | null
  tipo: string | null
  notas: string | null
  tracking_asistencia: { familia: string; noches: number | null; llegada: string | null; salida: string | null }[] | null
}

// ── Trae todo: registros planos (familia × evento) Y eventos (incluso vacíos) ──
export async function fetchTrackingData(): Promise<{ records: TrackingRecord[]; events: TrackingEvent[] }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tracking_events')
    .select(`
      id, evento, fecha_ini, fecha_salida, tipo, notas,
      tracking_asistencia ( familia, noches, llegada, salida )
    `)
    .order('fecha_ini', { ascending: true })
    .range(0, 4999)

  if (error) throw new Error(error.message)

  const records: TrackingRecord[] = []
  const events: TrackingEvent[] = []
  let rowIndex = 0

  for (const ev of (data ?? []) as EventRow[]) {
    const fecha_ini = ev.fecha_ini ?? ''
    const year = fecha_ini ? Number(fecha_ini.slice(0, 4)) : 0
    const month = fecha_ini ? Number(fecha_ini.slice(5, 7)) - 1 : -1
    const tipo = ev.tipo ?? clasificarEvento(ev.evento ?? '')
    const asistencia: Record<string, number> = {}

    for (const a of ev.tracking_asistencia ?? []) {
      asistencia[a.familia] = a.noches ?? 0
      records.push({
        eventoKey: ev.id,
        rowIndex: rowIndex++,
        evento: ev.evento ?? '',
        fecha_ini,
        fecha_salida: ev.fecha_salida,
        year,
        month,
        familia: a.familia,
        noches: a.noches ?? 0,
        tipo,
        notas: ev.notas ?? '',
      })
    }
    events.push({
      key: ev.id,
      evento: ev.evento ?? '',
      fecha_ini,
      fecha_salida: ev.fecha_salida,
      tipo,
      notas: ev.notas ?? '',
      year,
      asistencia,
    })
  }

  return { records, events }
}

// ── Insert / update an event with attendance (attendance may be empty) ────────
export interface NewEventInput {
  evento:      string
  fecha_ini:   string   // ISO date
  fecha_salida?: string
  tipo?:       string
  notas?:      string
  asistencia:  Array<{ familia: string; noches: number; llegada?: string; salida?: string }>
}

function asistenciaRows(eventoId: string, input: NewEventInput) {
  return input.asistencia.map(a => ({
    evento_id: eventoId,
    familia:   a.familia,
    noches:    a.noches,
    llegada:   a.llegada ?? null,
    salida:    a.salida  ?? null,
  }))
}

export async function insertEvent(input: NewEventInput): Promise<void> {
  const supabase = createClient()

  const { data: ev, error: evErr } = await supabase
    .from('tracking_events')
    .insert({
      evento:       input.evento,
      fecha_ini:    input.fecha_ini,
      fecha_salida: input.fecha_salida ?? null,
      tipo:         input.tipo ?? clasificarEvento(input.evento),
      notas:        input.notas ?? null,
    })
    .select('id')
    .single()

  if (evErr) throw new Error(evErr.message)

  const rows = asistenciaRows(ev.id, input)
  if (rows.length === 0) return // fin de semana sin visita
  const { error: aErr } = await supabase.from('tracking_asistencia').insert(rows)
  if (aErr) throw new Error(aErr.message)
}

/** Reemplaza un evento completo: datos del evento + su asistencia. */
export async function updateEventFull(eventId: string, input: NewEventInput): Promise<void> {
  const supabase = createClient()
  const { error: evErr } = await supabase
    .from('tracking_events')
    .update({
      evento:       input.evento,
      fecha_ini:    input.fecha_ini,
      fecha_salida: input.fecha_salida ?? null,
      tipo:         input.tipo ?? clasificarEvento(input.evento),
      notas:        input.notas ?? null,
    })
    .eq('id', eventId)
  if (evErr) throw new Error(evErr.message)

  const { error: delErr } = await supabase.from('tracking_asistencia').delete().eq('evento_id', eventId)
  if (delErr) throw new Error(delErr.message)

  const rows = asistenciaRows(eventId, input)
  if (rows.length === 0) return
  const { error: aErr } = await supabase.from('tracking_asistencia').insert(rows)
  if (aErr) throw new Error(aErr.message)
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tracking_events').delete().eq('id', eventId)
  if (error) throw new Error(error.message)
}

// ── Rellenar fines de semana vacíos ───────────────────────────────────────────
function addDays(iso: string, n: number): string {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000)
  return d.toISOString().slice(0, 10)
}

/**
 * Crea un fin de semana normal (viernes → domingo, 2 noches, sin familias)
 * por cada viernes entre `from` y `to` que no se cruce con un evento ya
 * registrado — así un feriado de jueves a domingo no se duplica. Devuelve
 * cuántos creó.
 */
export async function generateWeekends(from: string, to: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tracking_events')
    .select('fecha_ini, fecha_salida')
    .gte('fecha_ini', addDays(from, -10))
    .lte('fecha_ini', addDays(to, 10))
    .range(0, 4999)
  if (error) throw new Error(error.message)

  const spans = (data ?? []).map((e: { fecha_ini: string; fecha_salida: string | null }) => ({
    ini: e.fecha_ini,
    fin: e.fecha_salida ?? addDays(e.fecha_ini, 1),
  }))

  // primer viernes >= from
  let d = from
  while (new Date(Date.parse(d + 'T00:00:00Z')).getUTCDay() !== 5) d = addDays(d, 1)

  const rows: { evento: string; fecha_ini: string; fecha_salida: string; tipo: string }[] = []
  for (; d <= to; d = addDays(d, 7)) {
    const end = addDays(d, 2)
    const overlaps = spans.some(s => s.ini <= end && s.fin > d)
    if (!overlaps) rows.push({ evento: 'Fin de semana', fecha_ini: d, fecha_salida: end, tipo: 'Weekend' })
  }
  if (rows.length === 0) return 0
  const { error: insErr } = await supabase.from('tracking_events').insert(rows)
  if (insErr) throw new Error(insErr.message)
  return rows.length
}
