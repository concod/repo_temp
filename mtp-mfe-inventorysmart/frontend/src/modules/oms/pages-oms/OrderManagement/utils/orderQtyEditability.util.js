import {
  approvalFlagBlocksEdit,
  resolvePeriodApprovalFlag,
} from "./periodApprovalFlag.util.js";

export function isGrandTotalRow(data) {
  return data?.meta?.__isGrandTotal === true;
}

/**
 * Tenant config on `orderingScreensConfig.oms_dashboard.matrix_summary`:
 * `editable_from_level` — dimension id (e.g. `l1_name`, `article`). That level
 * and every ancestor are read-only; only strictly deeper hierarchy rows may edit
 * BE `is_editable` fields. When absent, every depth is eligible (view-mode +
 * approval / lock gates still apply).
 */
export function parseEditableFromLevel(screenConfig) {
  const raw =
    screenConfig?.editable_from_level ?? screenConfig?.editableFromLevel;
  if (raw == null || raw === "") return null;
  return typeof raw === "string" ? raw.trim() : null;
}

/** @deprecated use parseEditableFromLevel — kept for any stale imports */
export function parseOrderQtyEditableLevels(screenConfig) {
  return parseEditableFromLevel(screenConfig);
}

export function resolveRowHierarchyLevelId({ node, data, pivotOrder }) {
  if (isGrandTotalRow(data) || node?.rowPinned === "top") {
    return null;
  }
  if (!Array.isArray(pivotOrder) || pivotOrder.length === 0) {
    return null;
  }
  const dimensionPath = data?.dimensionPath;
  if (Array.isArray(dimensionPath) && dimensionPath.length > 0) {
    const depthIndex = Math.min(
      dimensionPath.length - 1,
      pivotOrder.length - 1
    );
    return pivotOrder[depthIndex]?.id ?? null;
  }
  return pivotOrder[pivotOrder.length - 1]?.id ?? null;
}

/** @deprecated use resolveRowHierarchyLevelId */
export const resolveRowOrderQtyEditLevel = resolveRowHierarchyLevelId;

/**
 * BE /columns response carries `is_hierarchy_editable` per ROW dimension
 * (`row_dimensions[]`, keyed by dimension id — e.g. `l0_name`, `article`),
 * never on the order-qty columns themselves. Build a lookup map once per
 * /columns response; missing/unknown dimension ids default to editable so an
 * incomplete BE payload fails open rather than bricking every cell.
 */
export function buildRowDimensionsEditableMap(rowDimensions = []) {
  const map = {};
  for (const dim of rowDimensions || []) {
    const id = typeof dim === "string" ? dim : dim?.id;
    if (!id) continue;
    map[id] = dim?.is_hierarchy_editable !== false;
  }
  return map;
}

/**
 * True unless the row's own hierarchy level (per pivotOrder depth) is
 * explicitly marked `is_hierarchy_editable: false` in the BE row_dimensions
 * map. Grand Total / rows with no resolvable level fail open (editable) —
 * hierarchy-level gating only concerns real child rows.
 */
export function isHierarchyLevelEditable({
  node,
  data,
  pivotOrder,
  rowDimensionsEditableMap,
}) {
  if (!rowDimensionsEditableMap) return true;
  const levelId = resolveRowHierarchyLevelId({ node, data, pivotOrder });
  if (!levelId) return true;
  if (!Object.prototype.hasOwnProperty.call(rowDimensionsEditableMap, levelId)) {
    return true;
  }
  return rowDimensionsEditableMap[levelId] !== false;
}

/**
 * True when the row sits strictly below `editableFromLevel` in the pivot order.
 * Misconfigured / unknown boundary → fail open (editable) so a typo does not
 * brick the whole grid.
 */
export function isRowLevelBelowEditableFrom({
  node,
  data,
  pivotOrder,
  editableFromLevel,
}) {
  if (!editableFromLevel) return true;
  if (isGrandTotalRow(data) || node?.rowPinned === "top") return false;
  if (!Array.isArray(pivotOrder) || pivotOrder.length === 0) return false;

  const dimensionPath = data?.dimensionPath;
  if (!Array.isArray(dimensionPath) || dimensionPath.length === 0) {
    return false;
  }

  const rowDepthIndex = Math.min(
    dimensionPath.length - 1,
    pivotOrder.length - 1
  );
  const fromIndex = pivotOrder.findIndex((d) => d.id === editableFromLevel);
  if (fromIndex < 0) return true;
  return rowDepthIndex > fromIndex;
}

/** @deprecated use isRowLevelBelowEditableFrom */
export function isOrderQtyLevelEditable(levelId, editableLevels) {
  if (!editableLevels || editableLevels.length === 0) return true;
  if (!levelId) return false;
  return editableLevels.includes(levelId);
}

function passesOrderQtyApprovalGate(data, field) {
  if (
    typeof field === "string" &&
    field.startsWith("order_quantity_") &&
    approvalFlagBlocksEdit(resolvePeriodApprovalFlag(data, field))
  ) {
    return false;
  }
  return true;
}

function passesPeriodEntryGates(data, fiscalView, periodId) {
  const orderQtyField = `order_quantity_${periodId}`;
  if (approvalFlagBlocksEdit(resolvePeriodApprovalFlag(data, orderQtyField))) {
    return false;
  }

  const arrayKey = fiscalView === "month" ? "monthData" : "weekData";
  const periodArray = data?.[arrayKey];
  if (!Array.isArray(periodArray)) return false;

  const periodEntry = periodArray.find(
    (entry) => entry.periodId === periodId
  );
  if (!periodEntry) return false;
  if (periodEntry.isLocked === true) return false;
  if ((periodEntry.flag ?? 0) === 2) return false;
  return true;
}

export function isOrderQtyCellEditable(
  params,
  { editableFromLevel, pivotOrder, periodId, fiscalView, viewMode }
) {
  if (viewMode && viewMode !== "edit") return false;
  if (params.node?.footer) return false;

  const data = params.data;
  if (!data) return false;

  const isHierarchyEditable =
    params?.colDef?.extra?.is_hierarchy_editable ??
    params?.colDef?.context?.extra?.is_hierarchy_editable;
  if (isHierarchyEditable === false) {
    return false;
  }

  if (
    !isRowLevelBelowEditableFrom({
      node: params.node,
      data,
      pivotOrder,
      editableFromLevel,
    })
  ) {
    return false;
  }

  if (data.order_qty?.isLocked) return false;

  if (periodId) {
    return passesPeriodEntryGates(data, fiscalView, periodId);
  }

  const field = params?.colDef?.field || params?.colDef?.colId || "";
  return passesOrderQtyApprovalGate(data, field);
}
