"use client";
import { FAMILIAS, TrackingEvent } from "@/lib/tracking/constants";
import { card, mutedText, sectionHeading } from "@/lib/ui";

/** Cuántas veces al año se fue a otro lugar (Santa Clara, Punta Chame, Playa Escondida…) en vez de
 *  Coronado, según las notas. Cada número = fines de semana (eventos) distintos. */
export default function OtrosDestinos({ events }: { events: TrackingEvent[] }) {
  const famShort = (k: string) => FAMILIAS.find((f) => f.key === k)?.short ?? k;
  const famColor = (k: string) => FAMILIAS.find((f) => f.key === k)?.color ?? "var(--ink-faint)";

  // lugar -> año -> eventos ; lugar -> familia -> año -> eventos
  const lugares = new Map<string, { byYear: Map<number, Set<string>>; byFam: Map<string, Map<number, Set<string>>> }>();
  const years = new Set<number>();
  for (const ev of events) {
    for (const o of ev.otros) {
      if (!o.lugar) continue;
      years.add(ev.year);
      const L = lugares.get(o.lugar) ?? { byYear: new Map(), byFam: new Map() };
      const setY = L.byYear.get(ev.year) ?? new Set<string>();
      setY.add(ev.key);
      L.byYear.set(ev.year, setY);
      const fam = L.byFam.get(o.familia) ?? new Map<number, Set<string>>();
      const setF = fam.get(ev.year) ?? new Set<string>();
      setF.add(ev.key);
      fam.set(ev.year, setF);
      L.byFam.set(o.familia, fam);
      lugares.set(o.lugar, L);
    }
  }
  if (lugares.size === 0) return null;
  const ys = [...years].sort();
  const sum = (m: Map<number, Set<string>>) => [...m.values()].reduce((s, set) => s + set.size, 0);
  const blocks = [...lugares.entries()]
    .map(([lugar, L]) => ({ lugar, ...L, total: sum(L.byYear) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className={`${card} p-4`}>
      <h3 className={sectionHeading}>Otros destinos — fines de semana por año</h3>
      <p className={`${mutedText} mb-3`}>
        Cada número es la cantidad de fines de semana en que se fue a ese lugar en vez de Coronado (según las notas del Sheet).
        Debajo de cada lugar, quién fue.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-xs">
          <thead>
            <tr className="border-b border-hairline text-ink-muted">
              <th className="py-1.5 pr-2 text-left font-semibold" />
              {ys.map((y) => (
                <th key={y} className="px-2 py-1.5 text-center font-semibold">
                  {y}
                </th>
              ))}
              <th className="px-2 py-1.5 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <FragmentRows key={b.lugar} b={b} ys={ys} famShort={famShort} famColor={famColor} sum={sum} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({
  b,
  ys,
  famShort,
  famColor,
  sum,
}: {
  b: { lugar: string; byYear: Map<number, Set<string>>; byFam: Map<string, Map<number, Set<string>>>; total: number };
  ys: number[];
  famShort: (k: string) => string;
  famColor: (k: string) => string;
  sum: (m: Map<number, Set<string>>) => number;
}) {
  const fams = [...b.byFam.entries()].map(([f, m]) => ({ f, m, t: sum(m) })).sort((x, y) => y.t - x.t);
  return (
    <>
      <tr className="border-b border-hairline bg-canvas-soft">
        <td className="py-1.5 pr-2 font-semibold text-ink">{b.lugar}</td>
        {ys.map((y) => (
          <td key={y} className="px-2 py-1.5 text-center font-semibold tabular-nums text-ink">
            {b.byYear.get(y)?.size || <span className="font-normal text-ink-faint">—</span>}
          </td>
        ))}
        <td className="px-2 py-1.5 text-center font-bold tabular-nums text-ink">{b.total}</td>
      </tr>
      {fams.map(({ f, m, t }) => (
        <tr key={f} className="border-b border-hairline last:border-0">
          <td className="py-1 pl-4 pr-2" style={{ color: famColor(f) }}>
            {famShort(f)}
          </td>
          {ys.map((y) => (
            <td key={y} className="px-2 py-1 text-center tabular-nums text-ink-muted">
              {m.get(y)?.size || <span className="text-ink-faint">—</span>}
            </td>
          ))}
          <td className="px-2 py-1 text-center tabular-nums text-ink-muted">{t}</td>
        </tr>
      ))}
    </>
  );
}
