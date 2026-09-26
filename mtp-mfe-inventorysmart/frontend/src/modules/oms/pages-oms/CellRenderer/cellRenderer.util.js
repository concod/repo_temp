import { get, isNumber } from "lodash";
import { PERCENTAGE } from "./cellRenderer.constants";

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

export const numberFormatter = (value = "", roundToDigits = null) => {
  const strNumber = String(value).replace(/[^\d.-\s]/g, "");
  let num = !isNaN(Number(strNumber)) ? Number(strNumber) : 0;
  if (roundToDigits !== null && typeof roundToDigits === "number" && !isNaN(num)) {
    num = Number(num.toFixed(roundToDigits));
  }
  return num;
};

export const getRoundedStringForEditing = (val, digits) => {
  const strNumber = String(val).replace(/[^\d.-\s]/g, "");
  let num = !isNaN(Number(strNumber)) ? Number(strNumber) : 0;
  if (typeof digits === "number" && digits >= 0) {
    try { return num.toFixed(digits); } catch (e) { return String(num); }
  }
  return String(num);
};

export const formatPercentageValue = (value, roundOff = 2) => {
  if (value == null || value === "") return "";
  const num = parseFloat(String(value).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toFixed(roundOff);
};

export const getFormattedValue = ({ inputValue, planKpiConfig, metricKey, isContribution, cellMetaData }) => {
  if (inputValue == null || inputValue === "") return "";
  const { round_off = 0, contribution_fix_to = 2, variance_fix_to = 2, type } = planKpiConfig?.[metricKey] ?? {};
  const isPercentageVariance = get(cellMetaData, "is_variance_percent", false);
  const isAbsoluteVariance = get(cellMetaData, "is_variance_absolute", false);
  const isPercentageCell = isPercentageVariance || isAbsoluteVariance || isContribution || type === PERCENTAGE;

  if (isPercentageCell) {
    const effectiveRoundOff = isPercentageVariance ? variance_fix_to : contribution_fix_to;
    return `${formatPercentageValue(inputValue, effectiveRoundOff)}%`;
  }

  const num = numberFormatter(inputValue, round_off);
  return isNumber(num) ? num.toLocaleString() : inputValue;
};

// ---------------------------------------------------------------------------
// Lock state utility
// ---------------------------------------------------------------------------

export const isCellLockedUtil = (pkey, lockedCells = []) => {
  if (!pkey) return false;
  return lockedCells.includes(String(pkey));
};

// ---------------------------------------------------------------------------
// Group node total value (for non-paginated client-side grids)
// ---------------------------------------------------------------------------

export const getGroupNodeTotalValue = (node, colDef, rowDimensions, returnDataObj = false) => {
  let total = 0;
  let firstChildData = null;

  const walkLeaves = (treeNode) => {
    if (!treeNode) return;
    if (!treeNode.group) {
      const cellValue = get(treeNode, `data.${colDef.accessor}`);
      if (typeof cellValue === "object" && cellValue !== null) {
        if (firstChildData === null) firstChildData = treeNode.data;
        if (typeof cellValue.value === "number") total += cellValue.value;
      } else if (typeof cellValue === "number") {
        total += cellValue;
      }
      return;
    }
    treeNode.childrenAfterGroup?.forEach(walkLeaves);
  };

  walkLeaves(node);

  if (returnDataObj) return firstChildData;
  return total;
};

// ---------------------------------------------------------------------------
// Cell validation — determines rendering mode for a given cell
// ---------------------------------------------------------------------------

export const cellRenderedValidation = ({
  isColumnEditable,
  isGrandTotal,
  props,
  kpiConfig,
  data,
  colDef,
  isKPIWiseRows,
  cellMetaData,
}) => {
  const isActualized = get(cellMetaData, "is_actualized", false);
  const isLockableCell = get(kpiConfig, "is_lockable", true);
  const isStaticCell = get(colDef, "extra.is_static", false);

  const shouldRenderInputCell =
    isColumnEditable &&
    !isGrandTotal &&
    !isActualized &&
    !isStaticCell;

  const staticLabel = get(data, `${colDef.accessor}.label`, null);
  const displayStaticValue = !isColumnEditable && staticLabel !== null ? staticLabel : null;

  const shouldRenderLockIcon = isLockableCell && !get(cellMetaData, "is_contribution", false) && !get(cellMetaData, "is_variance_percent", false) && !get(cellMetaData, "is_variance_absolute", false);

  return { shouldRenderInputCell, displayStaticValue, shouldRenderLockIcon };
};

// ---------------------------------------------------------------------------
// Pagination flag (simplified — no global singleton needed in OMS)
// ---------------------------------------------------------------------------

export const getIsPaginationEnabled = () => {
  // OMS Order Management always uses Server-Side Row Model (SSRM) for drilldown.
  // Default to true so the grid initialises in serverSide mode without requiring
  // a manual localStorage flag to be set.
  const stored = localStorage.getItem("oms_pagination_enabled");
  return stored === null ? true : stored === "true";
};
