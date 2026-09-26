import { OMS_HIERARCHY_LEVEL_BORDER_COLOR } from "modules/oms/constants-oms/stringConstants.js";
import { isGrandTotalRow } from "./orderQtyEditability.util.js";

const BORDER_WIDTH = "3px";

function colorWithOpacityPercent(hexColor, opacityPercent) {
  const normalized = String(hexColor).trim();
  if (!normalized.startsWith("#") || normalized.length < 7) {
    return normalized;
  }
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
}

export function getHierarchyLevelIndex(data, pivotOrder = []) {
  if (!data || isGrandTotalRow(data)) return -1;
  const path = data.dimensionPath;
  if (!Array.isArray(path) || path.length === 0) return -1;
  return Math.min(path.length - 1, Math.max(pivotOrder.length - 1, 0));
}

export function getHierarchyLevelBorderStyle(data, pivotOrder = []) {
  const depth = getHierarchyLevelIndex(data, pivotOrder);
  if (depth < 0) return null;
  const color = OMS_HIERARCHY_LEVEL_BORDER_COLOR;
  if (!color) return null;
  const opacityPercent = 100 - depth * 10;
  return {
    borderLeft: `${BORDER_WIDTH} solid ${colorWithOpacityPercent(color, opacityPercent)}`,
  };
}
