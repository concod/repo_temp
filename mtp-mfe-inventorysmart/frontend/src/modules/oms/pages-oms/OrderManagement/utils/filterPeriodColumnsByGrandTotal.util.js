import { isEmptyOmsOrderQtyValue } from "./orderManagementColumns.util.js";

const ORDER_QTY_PREFIX = "order_quantity_";

/**
 * Case-insensitive lookup of a grand-total KPI field (extensible to other KPIs later).
 */
export function resolveGrandTotalField(grandTotal, fieldName) {
  if (!grandTotal || !fieldName) return null;
  if (Object.prototype.hasOwnProperty.call(grandTotal, fieldName)) {
    return fieldName;
  }
  const target = String(fieldName).toLowerCase();
  return (
    Object.keys(grandTotal).find((key) => key.toLowerCase() === target) || null
  );
}

/** Order-qty field for a BE period group (group column_name = period suffix). */
export function resolveOrderQtyFieldForPeriod(periodCol, grandTotal) {
  const suffix = periodCol?.column_name;
  if (!suffix) return null;
  return resolveGrandTotalField(grandTotal, `${ORDER_QTY_PREFIX}${suffix}`);
}

/**
 * True when the period has a meaningful order-qty grand total.
 * BE coalesces missing data to 0 — treat null/undefined/0 as empty.
 */
export function periodHasOrderQtyGrandTotal(periodCol, grandTotal) {
  const field = resolveOrderQtyFieldForPeriod(periodCol, grandTotal);
  if (!field) return false;
  const value = grandTotal[field];
  return !isEmptyOmsOrderQtyValue(value);
}

/**
 * Filter BE /columns period groups. Non-period entries (no sub_headers) pass through.
 * When hideEmptyPeriods is false or grandTotal is absent, returns the input unchanged.
 */
export function filterBePeriodColumnsByGrandTotal(
  beColDefs,
  grandTotal,
  { hideEmptyPeriods = false } = {}
) {
  if (!hideEmptyPeriods || !grandTotal || !Array.isArray(beColDefs)) {
    return beColDefs;
  }

  return beColDefs.filter((col) => {
    if (!col?.sub_headers?.length) return true;
    return periodHasOrderQtyGrandTotal(col, grandTotal);
  });
}
