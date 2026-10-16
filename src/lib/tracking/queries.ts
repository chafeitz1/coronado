/**
 * queries.ts — Supabase data layer para Tracking de Visitas
 * Reemplaza sheets.js de Casa Bonsai.
 */
import { createClient } from '@/lib/supabase/client'
import { clasificarEvento, TrackingRecord } from './constants'

// ── Fetch all tracking data (flat records, one per family × event) ─────────
export async function fetchTracking(): Promise<TrackingRecord[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tracking_events')
    .select(`
      id,
      evento,
      fecha_ini,
      fecha_salida,
      tipo,
      notas,
      tracking_asistencia (
        familia,
        noches,
        llegada,
        salida
      )
    `)
    .order('fecha_ini', { ascending: true })

  if (error) throw new Error(error.message)

  const records: TrackingRecord[] = []
  let rowIndex = 0

  for (const ev of data ?? []) {
    const fecha_ini   = ev.fecha_ini ?? ''
    const fecha_salida = ev.fecha_salida ?? null
    const year  = fecha_ini ? new Date(fecha_ini + 'T00:00:00').getFullYear() : 0
    const month = fecha_ini ? new Date(fecha_ini + 'T00:00:00').getMonth()    : -1

    for (const a of ev.tracking_asistencia ?? []) {
      records.push({
        eventoKey:   ev.id,
        rowIndex:    rowIndex++,
        evento:      ev.evento ?? '',
        fecha_ini,
        fecha_salida,
        year,
        month,
        familia:     a.familia,
        noches:      a.noches ?? 0,
        tipo:        ev.tipo ?? clasificarEvento(ev.evento ?? ''),
        notas:       ev.notas ?? '',
      })
    }
  }

  return records
}

// ── Insert a new event with attendance ────────────────────────────────────────
export interface NewEventInput {
  evento:      string
  fecha_ini:   string   // ISO date
  fecha_salida?: string
  tipo?:       string
  notas?:      string
  asistencia:  Array<{ familia: string; noches: number; llegada?: string; salida?: string }>
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

  const rows = input.asistencia.map(a => ({
    evento_id: ev.id,
    familia:   a.familia,
    noches:    a.noches,
    llegada:   a.llegada ?? null,
    salida:    a.salida  ?? null,
  }))

  const { error: aErr } = await supabase.from('tracking_asistencia').insert(rows)
  if (aErr) throw new Error(aErr.message)
}

// ── Update event ──────────────────────────────────────────────────────────────
export async function updateEvent(
  eventId: string,
  updates: Partial<{ evento: string; fecha_ini: string; fecha_salida: string | null; tipo: string; notas: string }>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tracking_events')
    .update(updates)
    .eq('id', eventId)
  if (error) throw new Error(error.message)
}

// ── Update family attendance for an event ────────────────────────────────────
export async function upsertAsistencia(
  eventoId: string,
  familia:  string,
  noches:   number,
  llegada?: string,
  salida?:  string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tracking_asistencia')
    .upsert({ evento_id: eventoId, familia, noches, llegada: llegada ?? null, salida: salida ?? null },
             { onConflict: 'evento_id,familia' })
  if (error) throw new Error(error.message)
}

// ── Delete event ──────────────────────────────────────────────────────────────
export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tracking_events').delete().eq('id', eventId)
  if (error) throw new Error(error.message)
}
