// ── Familias ─────────────────────────────────────────────────────────────────
export const FAMILIAS = [
  { key: 'Papi y Mami',          short: 'Papi/Mami',   color: '#0ea5e9' },
  { key: 'Flia Harari',          short: 'Harari',      color: '#14b8a6' },
  { key: 'Flia Hayo',            short: 'Hayo',        color: '#a78bfa' },
  { key: 'Flia Hafeitz Assis',   short: 'H.Assis',     color: '#f59e0b' },
  { key: 'Flia Hafeitz Abadi',   short: 'H.Abadi',     color: '#ec4899' },
  { key: 'Flia Hafeitz Hanono',  short: 'H.Hanono',    color: '#22c55e' },
  { key: 'Tio Musi',             short: 'Tío Musi',    color: '#d4a574' },
  { key: 'Invitados',            short: 'Invitados',   color: '#94a3b8' },
] as const

export type FamiliaKey = typeof FAMILIAS[number]['key']
export const FAMILIA_MAP = Object.fromEntries(FAMILIAS.map(f => [f.key, f])) as Record<string, typeof FAMILIAS[number]>

// ── Tipos de evento ───────────────────────────────────────────────────────────
export const TIPOS_EVENTO: Record<string, { label: string; color: string }> = {
  Sukkot:            { label: 'Sukkot',           color: '#f59e0b' },
  Pesaj:             { label: 'Pesaj',             color: '#3b82f6' },
  Shavuot:           { label: 'Shavuot',           color: '#8b5cf6' },
  'Fiestas Patrias': { label: 'Fiestas Patrias',   color: '#ef4444' },
  Navidad:           { label: 'Navidad',           color: '#22c55e' },
  Carnavales:        { label: 'Carnavales',        color: '#ec4899' },
  Weekend:           { label: 'Weekend',           color: '#0075de' },
  Vacaciones:        { label: 'Vacaciones',        color: '#14b8a6' },
  'Fin de Año':      { label: 'Fin de Año',        color: '#f97316' },
  Cumpleaños:        { label: 'Cumpleaños',        color: '#a855f7' },
  'Dia de la Madre': { label: 'Día de la Madre',   color: '#db2777' },
  'Dia del Padre':   { label: 'Día del Padre',     color: '#2563eb' },
  Feriado:           { label: 'Feriado',           color: '#78716c' },
}

export const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] as const

// ── Clasificador de tipo ──────────────────────────────────────────────────────
export function clasificarEvento(nombre: string): string {
  if (!nombre) return 'Weekend'
  const n = nombre.toLowerCase()
  if (/su[ck]+ot/.test(n))                                 return 'Sukkot'
  if (n.includes('pésaj') || n.includes('pesaj'))          return 'Pesaj'
  if (n.includes('shavuot'))                               return 'Shavuot'
  if (n.includes('fiestas patrias') || n.includes('independencia')) return 'Fiestas Patrias'
  if (n.includes('navidad') || n.includes('nochebuena'))   return 'Navidad'
  if (n.includes('fin de año') || n.includes('año nuevo')) return 'Fin de Año'
  if (n.includes('carnaval'))                              return 'Carnavales'
  if (n.includes('vacaciones') || n.includes('vaciones'))   return 'Vacaciones'
  if (n.includes('cumple'))                                return 'Cumpleaños'
  if (n.includes('madre'))                                 return 'Dia de la Madre'
  if (n.includes('padre'))                                 return 'Dia del Padre'
  if (/feriado|viernes santo|del trabajo|martires|mártires|posesion|posesión/.test(n)) return 'Feriado'
  return 'Weekend'
}

// ── Hebrew-year helpers ────────────────────────────────────────────────────────
export interface HebrewBucket {
  startYear: number
  start: string
  end: string
  label: string
}

export function computeHebrewYears(records: TrackingRecord[]): HebrewBucket[] {
  const sukkotStart: Record<number, string> = {}
  records.forEach(r => {
    if (/su[ck]+ot/i.test(r.evento) && r.fecha_ini) {
      const cy = r.year
      if (!sukkotStart[cy] || r.fecha_ini < sukkotStart[cy]) sukkotStart[cy] = r.fecha_ini
    }
  })
  const sorted = Object.keys(sukkotStart).map(Number).sort()
  return sorted.map((y, i) => ({
    startYear: y,
    start:     sukkotStart[y],
    end:       i + 1 < sorted.length ? sukkotStart[sorted[i + 1]] : '9999-12-31',
    label:     `${y}-${String(y + 1).slice(-2)}`,
  }))
}

// ── Shared record type ─────────────────────────────────────────────────────────
export interface TrackingRecord {
  eventoKey:  string
  rowIndex:   number
  evento:     string
  fecha_ini:  string
  fecha_salida: string | null
  year:       number
  month:      number
  familia:    string
  noches:     number
  tipo:       string
  notas:      string
}

// ── Evento (una fila por evento, incluso si nadie fue) ─────────────────────────
export interface TrackingEvent {
  key:          string
  evento:       string
  fecha_ini:    string
  fecha_salida: string | null
  tipo:         string
  notas:        string
  year:         number
  /** noches del evento según el Sheet; null = usar salida − llegada */
  noches:       number | null
  /** noches por familia; vacío = nadie fue */
  asistencia:   Record<string, number>
}

// ── Formato de fecha: 25-Sep-26 (como el Google Sheet) ─────────────────────────
const MES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export function fmtFecha(iso?: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return iso || '—'
  return `${Number(m[3])}-${MES_EN[Number(m[2]) - 1]}-${m[1].slice(2)}`
}

const DIAS = ['dom','lun','mar','mié','jue','vie','sáb']
export function diaSemana(iso?: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return ''
  return DIAS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()]
}

/** Noches entre dos fechas ISO (salida - llegada). */
export function nochesEntre(ini?: string | null, fin?: string | null): number {
  if (!ini || !fin) return 0
  const a = Date.parse(ini + 'T00:00:00Z'), b = Date.parse(fin + 'T00:00:00Z')
  return Number.isNaN(a) || Number.isNaN(b) ? 0 : Math.max(0, Math.round((b - a) / 86400000))
}

export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
