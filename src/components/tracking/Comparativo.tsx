"use client";
import { FAMILIAS, TrackingRecord } from "@/lib/tracking/constants";
import { card, mutedText, sectionHeading } from "@/lib/ui";

interface Props {
  data: TrackingRecord[];
  activeYear: number;
}

export default function Comparativo({ data, activeYear }: Props) {
  const today = new Date();
  const curY = activeYear > 0 ? activeYear : today.getFullYear();
  const prevY = curY - 1;
  const isCurrentYear = curY === today.getFullYear();
  const ytdCutoff = isCurrentYear
    ? `${prevY}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    : null;

  const cur = data.filter((r) => r.year === curY);
  const prev = data.filter((r) => r.year === prevY && (!ytdCutoff || r.fecha_ini <= ytdCutoff));

  if (prev.length === 0) {
    return (
      <div className="mb-6">
        <p className={mutedText}>No hay datos de {prevY}.</p>
      </div>
    );
  }

  function Arrow({ d }: { d: number }) {
    return (
      <span
        className={`ml-1 text-xs font-bold ${
          d > 0 ? "text-status-done-fg" : d < 0 ? "text-status-overdue-fg" : "text-ink-faint"
        }`}
      >
        {d > 0 ? `+${d}▲` : d < 0 ? `${d}▼` : "—"}
      </span>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <span className={sectionHeading}>
          Comparativo {curY} vs {prevY}
        </span>
        {ytdCutoff && (
          <span className="rounded-full border border-primary bg-primary-soft px-2 py-0.5 text-xs text-primary">
            mismo período YTD
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {FAMILIAS.map((f) => {
          const curV = cur.filter((r) => r.familia === f.key).length;
          const curN = cur.filter((r) => r.familia === f.key).reduce((s, r) => s + r.noches, 0);
          const prevV = prev.filter((r) => r.familia === f.key).length;
          const prevN = prev.filter((r) => r.familia === f.key).reduce((s, r) => s + r.noches, 0);
          if (curV === 0 && prevV === 0) return null;
          return (
            <div key={f.key} className={`p-3 ${card}`}>
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: f.color }} />
                <span className="text-xs font-bold text-ink">{f.short}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">{curY}</span>
                  <span className="text-sm font-bold text-ink">
                    {curV}v · {curN}n
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-faint">{prevY}</span>
                  <span className="text-xs text-ink-muted">
                    {prevV}v · {prevN}n
                  </span>
                </div>
                <div className="flex justify-end border-t border-hairline pt-0.5">
                  <Arrow d={curV - prevV} />
                  <span className="mx-1 text-xs text-ink-faint">/</span>
                  <Arrow d={curN - prevN} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
