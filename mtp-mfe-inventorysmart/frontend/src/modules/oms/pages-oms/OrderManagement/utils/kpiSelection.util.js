import { DEFAULT_KPI_FALLBACK } from "../constants.js";

export function resolveKpi(selectedKpi, kpiOptions) {
  if (selectedKpi && kpiOptions.some((option) => option.id === selectedKpi)) {
    return selectedKpi;
  }
  if (kpiOptions[0]?.id) return kpiOptions[0].id;
  return DEFAULT_KPI_FALLBACK;
}

export function getKpiLabel(selectedKpi, kpiOptions) {
  const match = kpiOptions.find((option) => option.id === selectedKpi);
  return match?.label || selectedKpi || "";
}
