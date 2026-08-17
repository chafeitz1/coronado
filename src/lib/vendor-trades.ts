import type { Locale, VendorTrade } from "@/lib/types/database";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const TRADE_VALUES: VendorTrade[] = [
  "plumbing",
  "electrical",
  "hvac",
  "gardening",
  "pool",
  "cleaning",
  "carpentry",
  "painting",
  "locksmith",
  "pest_control",
  "roofing",
  "appliances",
  "security",
  "internet",
  "general",
];

export function getTradeLabels(locale: Locale): Record<VendorTrade, string> {
  return getDictionary(locale).tradeLabels;
}

export function getTradeOptions(locale: Locale): { value: VendorTrade; label: string }[] {
  const labels = getTradeLabels(locale);
  return TRADE_VALUES.map((value) => ({ value, label: labels[value] }));
}
