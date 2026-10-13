const MONTH_ABBREVIATIONS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2024-01-05" -> "05-Ene-2024". Presentación solamente: lo guardado
 *  sigue siendo ISO, así que ordenar y filtrar no cambia. */
export function formatDisplayDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  const abbrev = MONTH_ABBREVIATIONS[Number(month) - 1];
  return abbrev ? `${day}-${abbrev}-${year}` : isoDate;
}
