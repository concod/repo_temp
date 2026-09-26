import { isGrandTotalRow } from "./orderQtyEditability.util.js";

/**
 * Build dimensionFilter from a row's dimensionPath and the active pivot order.
 */
export function buildDimensionFilterFromRow(data, pivotOrder = []) {
  const path = data?.dimensionPath;
  if (!Array.isArray(path) || !pivotOrder?.length) {
    return {};
  }
  const filter = {};
  path.forEach((value, index) => {
    const dim = pivotOrder[Math.min(index, pivotOrder.length - 1)];
    const dimId = typeof dim === "string" ? dim : dim?.id;
    if (dimId) filter[dimId] = value;
  });
  return filter;
}

/**
 * Parse order_quantity_<periodId> field names from BE column defs.
 */
export function parseOrderQtyFieldName(fieldOrColId) {
  if (typeof fieldOrColId !== "string") return null;
  const field = fieldOrColId;
  if (!field.startsWith("order_quantity_")) return null;
  return field.slice("order_quantity_".length);
}

/**
 * Build edit intent for POST /order-management/edit from an InputCell blur.
 */
export function buildEditIntentFromCell({
  data,
  column,
  newValue,
  pivotOrder,
  fiscalView,
  priorValue,
}) {
  const colId = column?.colId || column?.field || column?.column_name;
  const periodId = parseOrderQtyFieldName(colId);
  const isGrandTotal = isGrandTotalRow(data);

  const intent = {
    kind: "order_qty",
    fiscalView: fiscalView || "week",
    periodId: periodId || null,
    value: Number(newValue),
    priorValue:
      priorValue !== undefined && priorValue !== null
        ? Number(priorValue)
        : undefined,
    isLocked: null,
    isTopLineEdit: isGrandTotal,
    dimensionFilter: isGrandTotal
      ? {}
      : buildDimensionFilterFromRow(data, pivotOrder),
  };
  return intent;
}
