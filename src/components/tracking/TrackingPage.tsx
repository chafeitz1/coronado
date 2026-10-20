"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchTrackingData } from "@/lib/tracking/queries";
import { computeHebrewYears, TrackingRecord, TrackingEvent, HebrewBucket } from "@/lib/tracking/constants";
import KPICards from "./KPICards";
import TablaResumen from "./TablaResumen";
import Estadisticas from "./Estadisticas";
import Historial from "./Historial";
import Comparativo from "./Comparativo";
import DatosCuriosos from "./DatosCuriosos";
import NuevaVisitaModal from "./NuevaVisitaModal";
import RellenarModal from "./RellenarModal";
import type { ResumenMetric, ResumenView } from "./TablaResumen";
import { Pill } from "@/components/ui/pill";
import { buttonPrimary, buttonUtility, mutedText, pageHeading } from "@/lib/ui";

const CIVIL_YEARS = [0, 2021, 2022, 2023, 2024, 2025, 2026, 2027];

const VIEWS = [
  { id: "resumen", label: "📊 Resumen" },
  { id: "estadisticas", label: "📈 Estadísticas" },
  { id: "historial", label: "📋 Historial / Calendario" },
  { id: "curiosidades", label: "✨ Datos Curiosos" },
];

// Vista predeterminada (se guarda en este navegador). Por defecto: Resumen,
// anual, año fiscal, todos los años.
interface ViewPrefs {
  activeView: string;
  tablaView: ResumenView;
  metric: ResumenMetric;
  hebrewMode: boolean;
  activeYear: number;
}
const DEFAULT_PREFS: ViewPrefs = { activeView: "resumen", tablaView: "anual", metric: "visitas", hebrewMode: false, activeYear: 0 };
const PREFS_KEY = "coronado:visitas-default-view";

function readPrefs(): ViewPrefs {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PREFS_KEY) : null;
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ViewPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function TrackingPage() {
  const [data, setData] = useState<TrackingRecord[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialPrefs] = useState<ViewPrefs>(readPrefs);
  const [activeYear, setActiveYear] = useState(initialPrefs.activeYear);
  const [activeView, setActiveView] = useState(initialPrefs.activeView);
  const [tablaView, setTablaView] = useState<ResumenView>(initialPrefs.tablaView);
  const [metric, setMetric] = useState<ResumenMetric>(initialPrefs.metric);
  const [savedPrefs, setSavedPrefs] = useState<ViewPrefs>(initialPrefs);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TrackingEvent | null>(null);
  const [showFill, setShowFill] = useState(false);
  const [hebrewMode, setHebrewMode] = useState(initialPrefs.hebrewMode);

  const loadData = useCallback(async () => {
    try {
      const r = await fetchTrackingData();
      setData(r.records);
      setEvents(r.events);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTrackingData()
      .then((r) => {
        if (!cancelled) {
          setData(r.records);
          setEvents(r.events);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error desconocido");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPrefs: ViewPrefs = { activeView, tablaView, metric, hebrewMode, activeYear };
  const isDefault = JSON.stringify(currentPrefs) === JSON.stringify(savedPrefs);
  const saveDefault = () => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(currentPrefs));
    } catch {
      /* sin almacenamiento */
    }
    setSavedPrefs(currentPrefs);
  };

  const reload = () => {
    setLoading(true);
    setError(null);
    loadData();
  };
  const changeMode = (mode: boolean) => {
    setHebrewMode(mode);
    setActiveYear(0);
  };

  const hebrewYears = useMemo<HebrewBucket[]>(() => computeHebrewYears(data), [data]);

  const yearOptions = hebrewMode
    ? [{ value: 0, label: "Todos" }, ...hebrewYears.map((b) => ({ value: b.startYear, label: b.label }))]
    : [{ value: 0, label: "Todos" }, ...CIVIL_YEARS.filter((y) => y > 0).map((y) => ({ value: y, label: String(y) }))];

  const filtered = useMemo<TrackingRecord[]>(() => {
    if (activeYear === 0) return data;
    if (!hebrewMode) return data.filter((r) => r.year === activeYear);
    const bucket = hebrewYears.find((b) => b.startYear === activeYear);
    if (!bucket) return data;
    return data.filter((r) => r.fecha_ini >= bucket.start && r.fecha_ini < bucket.end);
  }, [data, activeYear, hebrewMode, hebrewYears]);

  const filteredEvents = useMemo<TrackingEvent[]>(() => {
    if (activeYear === 0) return events;
    if (!hebrewMode) return events.filter((e) => e.year === activeYear);
    const bucket = hebrewYears.find((b) => b.startYear === activeYear);
    if (!bucket) return events;
    return events.filter((e) => e.fecha_ini >= bucket.start && e.fecha_ini < bucket.end);
  }, [events, activeYear, hebrewMode, hebrewYears]);

  const totalEventos = events.length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-3 animate-pulse text-4xl">🏖️</div>
          <p className={mutedText}>Cargando visitas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-3 text-4xl">⚠️</div>
          <p className="mb-2 font-medium text-status-overdue-fg">Error al cargar datos</p>
          <p className={`mb-4 ${mutedText}`}>{error}</p>
          <button type="button" onClick={reload} className={buttonPrimary}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    // Plain content flow, same as every other module (WorkOrdersShell,
    // AssetsExplorer, DirectoryExplorer) — the page scrolls with the
    // document, inside <main>'s own padding. This used to be its own
    // h-full/overflow-auto app shell with a fixed header, which fought the
    // rest of the app in two concrete ways on mobile: PullToRefresh gates
    // its gesture on `window.scrollY`, which never moves when the page has
    // its own internal scroll container, so pulling down inside a long
    // table could misfire the pull-to-refresh animation instead of just
    // scrolling the list; and the header/toolbar's own px-6 stacked on top
    // of <main>'s px-4, eating ~40px of width per side on a phone screen.
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageHeading}>Tracking Assist.</h1>
          <p className={mutedText}>
            {totalEventos} eventos (fines de semana y fiestas) · {data.length} registros de asistencia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={reload} className={buttonUtility}>
            ↻ Actualizar
          </button>
          <button
            type="button"
            onClick={saveDefault}
            disabled={isDefault}
            title="Guarda la vista actual (pestaña, anual/mensual, fiscal/hebreo, año) como la que se abre por defecto"
            className={buttonUtility}
          >
            {isDefault ? "★ Vista predeterminada" : "☆ Guardar como predeterminada"}
          </button>
          <button type="button" onClick={() => setShowModal(true)} className={buttonPrimary}>
            + Nueva Visita
          </button>
        </div>
      </div>

      {/* Year bar — breaks out of <main>'s padding to scroll edge-to-edge on
          mobile, same convention as the filter-chip rows in
          assets-explorer.tsx/directory-explorer.tsx, since this row can run
          to 9+ pills (8 years + "Todos") plus the fiscal/hebreo toggle. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
        {/* Fiscal / Hebreo toggle */}
        <div className="mr-2 flex shrink-0 items-center overflow-hidden rounded-md border border-hairline">
          {([["fiscal", false], ["hebreo", true]] as const).map(([label, mode]) => (
            <button
              key={label}
              type="button"
              onClick={() => changeMode(mode)}
              className={`shrink-0 px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                hebrewMode === mode ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface-hover active:bg-surface-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Year pills */}
        {yearOptions.map(({ value, label }) => (
          <Pill key={value} label={label} active={activeYear === value} onClick={() => setActiveYear(value)} small noShrink />
        ))}
      </div>

      {/* View tabs — same breakout, so the 4 tabs (one with a long label)
          scroll instead of wrapping onto a second line on a phone. */}
      <div className="-mx-4 overflow-x-auto border-b border-hairline px-4 sm:mx-0 sm:px-0">
        <div className="flex">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveView(v.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeView === v.id ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink active:text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeView !== "curiosidades" && <KPICards data={filtered} allData={data} events={filteredEvents} activeYear={activeYear} />}

        {activeView === "resumen" && (
          <>
            <TablaResumen
              data={filtered}
              allData={data}
              hebrewMode={hebrewMode}
              hebrewYears={hebrewYears}
              metric={metric}
              onMetricChange={setMetric}
              view={tablaView}
              onViewChange={setTablaView}
            />
            <Comparativo data={data} activeYear={activeYear} />
          </>
        )}
        {activeView === "estadisticas" && <Estadisticas data={filtered} allData={data} />}
        {activeView === "historial" && <Historial events={filteredEvents} onEdit={setEditing} onGenerate={() => setShowFill(true)} />}
        {activeView === "curiosidades" && <DatosCuriosos data={filtered} allData={data} hebrewMode={hebrewMode} hebrewYears={hebrewYears} />}
      </div>

      {(showModal || editing) && (
        <NuevaVisitaModal
          evento={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            reload();
          }}
        />
      )}
      {showFill && (
        <RellenarModal
          onClose={() => setShowFill(false)}
          onSaved={() => {
            setShowFill(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
