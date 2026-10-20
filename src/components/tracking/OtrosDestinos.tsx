"use client";
import { FAMILIAS, TrackingEvent } from "@/lib/tracking/constants";
import { card, mutedText, sectionHeading } from "@/lib/ui";

/** Cuántas veces al año una familia fue a otro lugar (Santa Clara, Punta Chame…), según las notas
 *  del Sheet. Cuenta fines de semana (eventos) distintos por lugar y familia. */
export default function OtrosDestinos({ events }: { events: TrackingEvent[] }) {
  const famShort = (k: string) => FAMILIAS.find((f) => f.key === k)?.short ?? k;
  const famColor = (k: string) => FAMILIAS.find((f) => f.key === k)?.color ?? "var(--ink-faint)";

  // lugar -> familia -> año -> eventos
  const map = new Map<string, Map<string, Map<number, Set<string>>>>();
  const years = new Set<number>();
  for (const ev of events) {
    for (const o of ev.otros) {
      if (!o.lugar) continue;
      years.add(ev.year);
      const byFam = map.get(o.lugar) ?? new Map();
      const byYear = byFam.get(o.familia) ?? new Map();
      const set = byYear.get(ev.year) ?? new Set<string>();
      set.add(ev.key);
      byYear.set(ev.year, set);
      byFam.set(o.familia, byYear);
      map.set(o.lugar, byFam);
    }
  }
  const ys = [...years].sort();
  if (map.size === 0) return null;

  const rows = [...map.entries()]
    .flatMap(([lugar, byFam]) =>
      [...byFam.entries()].map(([familia, byYear]) => {
        const total = [...byYear.values()].reduce((s, set) => s + set.size, 0);
        return { lugar, familia, byYear, total };
      })
    )
    .sort((a, b) => a.lugar.localeCompare(b.lugar) || b.total - a.total);

  return (
    <div className={`${card} mt-4 p-4`}>
      <h3 className={sectionHeading}>Otros destinos — veces por año</h3>
      <p className={`${mutedText} mb-3`}>Fines de semana en que una familia fue a otro lugar en vez de (o además de) Coronado, según las notas.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="py-1.5 pr-2 font-semibold">Lugar</th>
              <th className="py-1.5 pr-2 font-semibold">Familia</th>
              {ys.map((y) => (
                <th key={y} className="px-2 py-1.5 text-center font-semibold">
                  {y}
                </th>
              ))}
              <th className="px-2 py-1.5 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.lugar}-${r.familia}`} className="border-b border-hairline last:border-0">
                <td className="py-1.5 pr-2 font-medium text-ink">{r.lugar}</td>
                <td className="py-1.5 pr-2 font-semibold" style={{ color: famColor(r.familia) }}>
                  {famShort(r.familia)}
                </td>
                {ys.map((y) => (
                  <td key={y} className="px-2 py-1.5 text-center tabular-nums text-ink">
                    {r.byYear.get(y)?.size || <span className="text-ink-faint">—</span>}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center font-bold tabular-nums text-ink">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
