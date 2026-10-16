/**
 * import_desde_sheets.mjs
 * Importación única de datos históricos desde Google Sheets → Supabase.
 *
 * Uso:
 *   export GOOGLE_SHEET_ID=19FV1GMbOmLC3OtuAjiDHuJgstXEQcI1Wyh_wViGf3cI
 *   export GOOGLE_API_KEY=<api_key>
 *   export SUPABASE_URL=https://xxx.supabase.co
 *   export SUPABASE_SERVICE_KEY=<service_role_key>
 *   node scripts/import_desde_sheets.mjs
 *
 * El sheet debe tener acceso público de lectura ("Anyone with the link can view")
 * para que funcione con API key. Si no, usar Service Account en su lugar.
 */

import { createClient } from '@supabase/supabase-js'

const SHEET_ID   = process.env.GOOGLE_SHEET_ID
const API_KEY    = process.env.GOOGLE_API_KEY
const SUPA_URL   = process.env.SUPABASE_URL
const SUPA_KEY   = process.env.SUPABASE_SERVICE_KEY

if (!SHEET_ID || !API_KEY || !SUPA_URL || !SUPA_KEY) {
  console.error('Faltan variables de entorno. Ver comentario al inicio del script.')
  process.exit(1)
}

const supabase = createClient(SUPA_URL, SUPA_KEY)

// ── Nombres de familia exactamente como aparecen en el sheet ────────────────
const FAMILIA_HEADERS = [
  'Papi y Mami', 'Flia Harari', 'Flia Hayo',
  'Flia Hafeitz Assis', 'Flia. Hafeitz Abadi', 'Flia Hafeitz Hanono',
  'Tio Musi', 'Invitados',
]
// Mapa de headers del sheet → clave canónica en Supabase
const FAMILIA_CANON = {
  'Papi y Mami':          'Papi y Mami',
  'Flia Harari':          'Flia Harari',
  'Flia Hayo':            'Flia Hayo',
  'Flia Hafeitz Assis':   'Flia Hafeitz Assis',
  'Flia. Hafeitz Abadi':  'Flia Hafeitz Abadi',
  'Flia Hafeitz Hanono':  'Flia Hafeitz Hanono',
  'Tio Musi':             'Tio Musi',
  'Invitados':            'Invitados',
}

// ── Helpers de fecha ────────────────────────────────────────────────────────
const MONTH_MAP = {
  jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
  ene:1,abr:4,ago:8,dic:12,
}
function toISO(str) {
  if (!str || typeof str !== 'string') return null
  str = str.trim()
  if (!str) return null
  // DD-Mon-YY or DD-Mon-YYYY
  const m1 = str.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3,})[-\/\s](\d{2,4})$/)
  if (m1) {
    const [, d, mon, y] = m1
    const mo = MONTH_MAP[mon.toLowerCase().slice(0,3)]
    if (!mo) return null
    const year = y.length === 2 ? 2000 + Number(y) : Number(y)
    return `${year}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return null
}

// ── Clasificar tipo de evento ───────────────────────────────────────────────
function clasificar(nombre) {
  if (!nombre) return 'Weekend'
  const n = nombre.toLowerCase()
  if (n.includes('sucot') || n.includes('sukkot')) return 'Sukkot'
  if (n.includes('pésaj') || n.includes('pesaj'))  return 'Pesaj'
  if (n.includes('shavuot'))                        return 'Shavuot'
  if (n.includes('fiestas patrias') || n.includes('independencia')) return 'Fiestas Patrias'
  if (n.includes('navidad') || n.includes('nochebuena')) return 'Navidad'
  if (n.includes('fin de año') || n.includes('año nuevo')) return 'Fin de Año'
  if (n.includes('carnaval'))                       return 'Carnavales'
  if (n.includes('vacaciones'))                     return 'Vacaciones'
  if (n.includes('cumpleaños'))                     return 'Cumpleaños'
  if (n.includes('madre'))                          return 'Dia de la Madre'
  if (n.includes('padre'))                          return 'Dia del Padre'
  if (n.includes('feriado') || n.includes('viernes santo')) return 'Feriado'
  return 'Weekend'
}

// ── Fetch del sheet ─────────────────────────────────────────────────────────
async function fetchSheet() {
  const range = 'A1:Z300'
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google Sheets error: ${res.status} ${await res.text()}`)
  const { values } = await res.json()
  return values || []
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Leyendo Google Sheet...')
  const rows = await fetchSheet()

  // Encontrar fila de headers (row 4, index 3)
  const headerRow = rows[3] || []
  // Encontrar columnas de familia (solo primera ocurrencia de cada nombre)
  const familyCols = []
  const seenFamilies = new Set()
  headerRow.forEach((cell, col) => {
    const fam = cell?.trim()
    if (fam && FAMILIA_CANON[fam] && !seenFamilies.has(fam)) {
      seenFamilies.add(fam)
      familyCols.push({ col, familia: FAMILIA_CANON[fam] })
    }
  })
  console.log(`Columnas de familia encontradas: ${familyCols.map(f => f.familia).join(', ')}`)

  // Procesar filas de datos (a partir de row 7, index 6)
  const events = []
  for (let i = 6; i < rows.length; i++) {
    const row     = rows[i]
    if (!row || !row[0]) continue
    const evento   = row[0]?.trim() || ''
    const llegada  = toISO(row[1])
    const salida   = toISO(row[2])
    if (!llegada) continue  // skip rows without a date

    const tipo = clasificar(evento)
    const asistencia = []
    familyCols.forEach(({ col, familia }) => {
      const noches = parseInt(row[col] || '0', 10)
      if (noches > 0) asistencia.push({ familia, noches })
    })
    if (asistencia.length === 0) continue  // skip events with no attendance

    events.push({ evento, fecha_ini: llegada, fecha_salida: salida, tipo, asistencia })
  }
  console.log(`Eventos a importar: ${events.length}`)

  // Insertar en Supabase (en lotes de 50)
  let inserted = 0
  let skipped  = 0
  for (const ev of events) {
    // Check if already exists (idempotent)
    const { data: existing } = await supabase
      .from('tracking_events')
      .select('id')
      .eq('fecha_ini', ev.fecha_ini)
      .eq('evento', ev.evento)
      .maybeSingle()

    if (existing) { skipped++; continue }

    const { data: newEv, error: evErr } = await supabase
      .from('tracking_events')
      .insert({ evento: ev.evento, fecha_ini: ev.fecha_ini, fecha_salida: ev.fecha_salida, tipo: ev.tipo })
      .select('id')
      .single()
    if (evErr) { console.error('Error insertando evento:', ev.evento, evErr.message); continue }

    const asRows = ev.asistencia.map(a => ({ evento_id: newEv.id, familia: a.familia, noches: a.noches }))
    const { error: aErr } = await supabase.from('tracking_asistencia').insert(asRows)
    if (aErr) console.error('Error insertando asistencia para', ev.evento, aErr.message)
    else inserted++
  }

  console.log(`\n✅ Importación completa: ${inserted} eventos insertados, ${skipped} ya existían.`)
}

main().catch(err => { console.error(err); process.exit(1) })
