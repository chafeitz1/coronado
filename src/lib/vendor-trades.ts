import type { VendorTrade } from "@/lib/types/database";

export const TRADE_LABELS: Record<VendorTrade, string> = {
  plumbing: "Plomería",
  electrical: "Electricidad",
  hvac: "Aire acondicionado",
  gardening: "Jardinería",
  pool: "Piscina",
  cleaning: "Limpieza",
  carpentry: "Carpintería",
  painting: "Pintura",
  locksmith: "Cerrajería",
  pest_control: "Fumigación",
  roofing: "Techado",
  appliances: "Electrodomésticos",
  security: "Seguridad",
  internet: "Internet / Cable",
  general: "General",
};

export const TRADE_OPTIONS = Object.entries(TRADE_LABELS).map(([value, label]) => ({
  value: value as VendorTrade,
  label,
}));
