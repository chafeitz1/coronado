/**
 * queries.ts — Supabase data layer para Tracking de Visitas
 * Reemplaza sheets.js de Casa Bonsai.
 */
import { createClient } from '@/lib/supabase/client'
import { clasificarEvento, TrackingEvent, TrackingRecord } from './constants'
import { addDays, planWeekends } from './weekend-plan'

interface EventRow {
  id: string
  evento: string
  fecha_ini: string | null
  fecha_salida: string | null
  tipo: string | null
  notas: string | null
  noches?: number | null
  tracking_asistencia: { familia: string; noches: number | null; llegada: string | null; salida: string | null }[] | null
}

// ── Trae todo: registros planos (familia × evento) Y eventos (incluso vacíos) ──
export async function fetchTrackingData(): Promise<{ records: TrackingRecord[]; events: TrackingEvent[] }> {
  const supabase = createClient()

  const run = (cols: string) =>
    supabase
      .from('tracking_events')
      .select(`${cols}, tracking_asistencia ( familia, noches, llegada, salida )`)
      .order('fecha_ini', { ascending: true })
      .range(0, 4999)
  let { data, error } = await run('id, evento, fecha_ini, fecha_salida, tipo, notas, noches')
  // Si la migración de "noches" aún no se aplicó, la columna no existe: se lee sin ella.
  if (error && (error.code === '42703' || /noches/.test(error.message))) {
    ;({ data, error } = await run('id, evento, fecha_ini, fecha_salida, tipo, notas'))
  }
  if (error) throw new Error(error.message)

  const records: TrackingRecord[] = []
  const events: TrackingEvent[] = []
  let rowIndex = 0

  for (const ev of (data ?? []) as unknown as EventRow[]) {
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
      noches: ev.noches ?? null,
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
  noches?:     number
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
      ...(input.noches != null ? { noches: input.noches } : {}),
    })
    .select('id')
    .single()

  if (evErr) throw new Error(evErr.message)

  const rows = asistenciaRows(ev.id, input)
  if (rows.length > 0) {
    const { error: aErr } = await supabase.from('tracking_asistencia').insert(rows)
    if (aErr) throw new Error(aErr.message)
  }
  await removeOverlappingPlaceholders(ev.id, input.fecha_ini, input.fecha_salida)
}

/** Un evento nuevo (fiesta, feriado, semana larga) reemplaza a los "Fin de semana" vacíos
 *  automáticos que cubre, para no tener dos filas para las mismas fechas. */
async function removeOverlappingPlaceholders(keepId: string, ini: string, fin?: string | null): Promise<void> {
  const supabase = createClient()
  const end = fin ?? addDays(ini, 1)
  const { data } = await supabase
    .from('tracking_events')
    .select('id, evento, fecha_ini, fecha_salida, notas, tracking_asistencia ( familia )')
    .gte('fecha_ini', addDays(ini, -7))
    .lte('fecha_ini', end)
  const ids = (data ?? [])
    .filter((e: { id: string; evento: string; fecha_ini: string; fecha_salida: string | null; notas: string | null; tracking_asistencia: unknown[] | null }) =>
      e.id !== keepId &&
      e.evento === 'Fin de semana' &&
      !e.notas &&
      (e.tracking_asistencia ?? []).length === 0 &&
      e.fecha_ini < end &&
      (e.fecha_salida ?? addDays(e.fecha_ini, 1)) > ini)
    .map((e: { id: string }) => e.id)
  if (ids.length > 0) await supabase.from('tracking_events').delete().in('id', ids)
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
      ...(input.noches != null ? { noches: input.noches } : {}),
    })
    .eq('id', eventId)
  if (evErr) throw new Error(evErr.message)

  const { error: delErr } = await supabase.from('tracking_asistencia').delete().eq('evento_id', eventId)
  if (delErr) throw new Error(delErr.message)

  const rows = asistenciaRows(eventId, input)
  if (rows.length > 0) {
    const { error: aErr } = await supabase.from('tracking_asistencia').insert(rows)
    if (aErr) throw new Error(aErr.message)
  }
  await removeOverlappingPlaceholders(eventId, input.fecha_ini, input.fecha_salida)
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tracking_events').delete().eq('id', eventId)
  if (error) throw new Error(error.message)
}

// ── Rellenar fines de semana vacíos ───────────────────────────────────────────
/**
 * Crea un fin de semana normal (viernes → domingo, 2 noches, sin familias) por cada viernes
 * entre `from` y `to` que no se cruce con un evento ya registrado — así un feriado de jueves a
 * domingo no se duplica. Devuelve cuántos creó. (Hacia adelante lo hace solo el cron diario.)
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
  const planned = planWeekends(from, to, spans)
  if (planned.length === 0) return 0
  let { error: insErr } = await supabase.from('tracking_events').insert(planned)
  if (insErr && (insErr.code === '42703' || /noches/.test(insErr.message))) {
    ;({ error: insErr } = await supabase.from('tracking_events').insert(planned.map((w) => ({ evento: w.evento, fecha_ini: w.fecha_ini, fecha_salida: w.fecha_salida, tipo: w.tipo }))))
  }
  if (insErr) throw new Error(insErr.message)
  return planned.length
}
