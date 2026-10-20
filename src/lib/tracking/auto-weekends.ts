import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, planWeekends } from "@/lib/tracking/weekend-plan";

/**
 * Registra solo cada fin de semana (viernes → domingo, 2 noches, sin familias) de las próximas
 * `weeksAhead` semanas que todavía no tenga un evento. Corre en el cron diario. Si hay una
 * fiesta o feriado con otras fechas (jueves → domingo, domingo → viernes…), el fin de semana
 * normal que cubre no se crea; y si ya existía, al guardar la fiesta se reemplaza.
 */
export async function ensureUpcomingWeekends(supabase: SupabaseClient, today: string, weeksAhead = 10): Promise<number> {
  const to = addDays(today, weeksAhead * 7);
  const { data, error } = await supabase
    .from("tracking_events")
    .select("fecha_ini, fecha_salida")
    .gte("fecha_ini", addDays(today, -10))
    .lte("fecha_ini", addDays(to, 10));
  if (error) {
    // La tabla aún no existe (migración pendiente): nada que hacer.
    if (error.code === "42P01" || error.code === "PGRST205") return 0;
    throw new Error(error.message);
  }
  const spans = (data ?? []).map((e: { fecha_ini: string; fecha_salida: string | null }) => ({
    ini: e.fecha_ini,
    fin: e.fecha_salida ?? addDays(e.fecha_ini, 1),
  }));
  const planned = planWeekends(today, to, spans);
  if (planned.length === 0) return 0;
  let { error: insErr } = await supabase.from("tracking_events").insert(planned);
  if (insErr && (insErr.code === "42703" || /noches/.test(insErr.message))) {
    ({ error: insErr } = await supabase
      .from("tracking_events")
      .insert(planned.map((w) => ({ evento: w.evento, fecha_ini: w.fecha_ini, fecha_salida: w.fecha_salida, tipo: w.tipo }))));
  }
  if (insErr) throw new Error(insErr.message);
  return planned.length;
}
