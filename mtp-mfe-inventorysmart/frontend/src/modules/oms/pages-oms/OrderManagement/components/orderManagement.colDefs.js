import { ORDER_QTY_HEADER } from "../constants.js";
import { getKpiLabel } from "../utils/kpiSelection.util.js";
import { OMS_GRAND_TOTAL_ROW_BG } from "../utils/orderManagementColumns.util.js";
import { buildNestedTimeColumnGroups } from "../utils/timeColumnStructure.util.js";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import LegacyOrderQtyInputCell from "./LegacyOrderQtyInputCell.jsx";
import HierarchyCellRenderer from "./HierarchyCellRenderer.jsx";
import {
  approvalFlagCellStyle,
  OMS_PERIOD_FLAG_STATUS,
  resolvePeriodApprovalFlag,
} from "../utils/periodApprovalFlag.util.js";

export const GRAND_TOTAL_ROW_ID = "__matrix_summary_grand_total__";
export const GRAND_TOTAL_LABEL = "Grand Total";

export function isGrandTotalRow(rowData) {
  return Boolean(rowData?.meta?.__isGrandTotal);
}

function fiscalViewArrayKey(fiscalView) {
  return fiscalView === "month" ? "monthData" : "weekData";
}

// Member-aware lookup: returns every granular period entry on the row that the
// descriptor clubs together. For a single-member descriptor this is one entry;
// for a clubbed bucket (3M / 6M) it is the member months that the column sums.
function findPeriodEntries(data, fiscalView, members) {
  if (!data || !Array.isArray(members) || members.length === 0) return [];
  const arrayKey = fiscalViewArrayKey(fiscalView);
  const array = data[arrayKey];
  if (!Array.isArray(array)) return [];
  const memberSet = new Set(members.map((memberId) => String(memberId)));
  return array.filter((entry) => memberSet.has(String(entry.periodId)));
}

function orderQtyEntryValue(entry) {
  if (typeof entry.adjusted_manual === "number") return entry.adjusted_manual;
  return Number(entry.adjusted) || 0;
}

function periodOrderQtyValueGetter(fiscalView, members) {
  return (params) => {
    const entries = findPeriodEntries(params.data, fiscalView, members);
    if (entries.length === 0) return null;
    return entries.reduce((total, entry) => total + orderQtyEntryValue(entry), 0);
  };
}

// valueSetter only ever runs for single-member (editable) columns — clubbed
// buckets are rendered read-only. Guard on a single member so a future regress
// that wires a setter onto a bucket cannot silently corrupt member months.
function periodOrderQtyValueSetter(fiscalView, members) {
  return (params) => {
    if (!params.data || members.length !== 1) return false;
    const nextNumber = Number(params.newValue);
    if (Number.isNaN(nextNumber)) return false;
    const arrayKey = fiscalViewArrayKey(fiscalView);
    const array = params.data[arrayKey];
    if (!Array.isArray(array)) return false;
    const entryIndex = array.findIndex(
      (entry) => entry.periodId === members[0]
    );
    if (entryIndex < 0) return false;
    array[entryIndex] = {
      ...array[entryIndex],
      adjusted_manual: nextNumber,
      adjusted: nextNumber,
    };
    return true;
  };
}

function periodKpiValueGetter(fiscalView, members) {
  return (params) => {
    const entries = findPeriodEntries(params.data, fiscalView, members);
    if (entries.length === 0) return null;
    return entries.reduce((total, entry) => {
      const value =
        typeof entry.kpi?.adjusted === "number"
          ? entry.kpi.adjusted
          : entry.kpi?.IA ?? 0;
      return total + (Number(value) || 0);
    }, 0);
  };
}

// Generic per-period valueGetter for an arbitrary measure name. Sums the
// member entries (one for a single month/week, N for a clubbed bucket),
// preferring `adjusted` over `IA`, then falling back to the per-period
// `kpi.*` slot. Returns `null` (not `undefined`) so AG-Grid renders a blank
// cell rather than printing "undefined" when no member entry exists.
function periodMeasureValueGetter(fiscalView, members, measureName) {
  return (params) => {
    const entries = findPeriodEntries(params.data, fiscalView, members);
    if (entries.length === 0) return null;
    return entries.reduce((total, entry) => {
      const direct = entry[measureName];
      if (direct && typeof direct === "object") {
        if (typeof direct.adjusted === "number") return total + direct.adjusted;
        if (typeof direct.IA === "number") return total + direct.IA;
      }
      if (typeof direct === "number") return total + direct;
      if (typeof entry.kpi?.adjusted === "number") {
        return total + entry.kpi.adjusted;
      }
      if (typeof entry.kpi?.IA === "number") return total + entry.kpi.IA;
      return total;
    }, 0);
  };
}

// Color rules ported from legacy `editHierarchyWrapper.js:1023–1045`:
//   approval_flag === 2 → grey ("approved, cannot be edited")
//   approval_flag === 1 → yellow ("partially approved")
//   selectedKpi === "min_order_quantity_style" AND adjusted < MOQ → red
// Returns null when no special highlight applies so callers can layer their
// own styles (e.g. Grand Total background).
export function getRoqStatusCellStyle(params, selectedKpi) {
  const data = params.data;
  if (!data) return null;
  const field = params?.colDef?.field || params?.colDef?.colId || "";
  if (typeof field === "string" && field.startsWith("order_quantity_")) {
    const approvalStyle = approvalFlagCellStyle(
      resolvePeriodApprovalFlag(data, field)
    );
    if (approvalStyle) return approvalStyle;
  }
  if (selectedKpi === "min_order_quantity_style") {
    const adjusted = Number(data.order_qty?.adjusted);
    const moq = Number(data.min_order_quantity_style);
    if (Number.isFinite(adjusted) && Number.isFinite(moq) && adjusted < moq) {
      return { backgroundColor: "#F6CCCC" };
    }
  }
  return null;
}

// Shared gate for Order Qty value edits — used by the impact-ui Input cell
// renderer (blur commit) and kept aligned with the legacy ag-grid editable
// callback if we re-enable it later.
// Per-period adaptation of getRoqStatusCellStyle. Reads the period entry's
// own flag (which carries a per-period approval state seeded by the mock),
// falling back to the row-level approval_flag so non-period code paths still
// light up correctly. Grand Total rows keep their `#f5f5f5` background.
export function getPeriodCellStyle(params, members, fiscalView, selectedKpi) {
  const data = params.data;
  if (!data) return null;

  // Grand Total only ever shows the topline-edit affordance and never
  // surfaces per-period approval / MOQ / partial-approval semantics
  // (those are descendant concerns). Keep the row neutral so the user
  // doesn't read a colored Grand Total as an action signal.
  if (isGrandTotalRow(data)) {
    return { fontWeight: 600, backgroundColor: OMS_GRAND_TOTAL_ROW_BG };
  }

  const entries = findPeriodEntries(data, fiscalView, members);
  const memberIds =
    Array.isArray(members) && members.length > 0
      ? members
      : entries.map((entry) => entry?.periodId).filter(Boolean);

  let allFullyApproved = memberIds.length > 0;
  let anyPartialOrFull = false;
  let summedAdjusted = 0;
  for (const memberId of memberIds) {
    const entryFlag = resolvePeriodApprovalFlag(
      data,
      `order_quantity_${memberId}`
    );
    if (entryFlag !== OMS_PERIOD_FLAG_STATUS.FULL) allFullyApproved = false;
    if (entryFlag >= OMS_PERIOD_FLAG_STATUS.PARTIAL) anyPartialOrFull = true;
    const entry = entries.find((candidate) => candidate?.periodId === memberId);
    summedAdjusted += Number(entry?.adjusted) || 0;
  }
  const rolledFlag =
    memberIds.length > 0
      ? allFullyApproved
        ? OMS_PERIOD_FLAG_STATUS.FULL
        : anyPartialOrFull
          ? OMS_PERIOD_FLAG_STATUS.PARTIAL
          : OMS_PERIOD_FLAG_STATUS.NONE
      : OMS_PERIOD_FLAG_STATUS.NONE;

  const approvalStyle = approvalFlagCellStyle(rolledFlag);
  if (approvalStyle) {
    return approvalStyle;
  }

  if (selectedKpi === "min_order_quantity_style") {
    const moq = Number(data.min_order_quantity_style);
    if (
      Number.isFinite(summedAdjusted) &&
      Number.isFinite(moq) &&
      moq > 0 &&
      summedAdjusted < moq
    ) {
      return { backgroundColor: "#F6CCCC" };
    }
  }

  return null;
}

export function buildOrderManagementColDefs({
  pivotOrder,
  selectedKpi,
  kpiOptions,
  orderQtyEditableLevels = null,
  fiscalView = "week",
  // periodDescriptors drive the period columns: one column group per
  // descriptor, header = descriptor.label, value = sum of descriptor.members
  // off the row's granular weekData/monthData. See utils/periodDescriptors.util.js.
  periodDescriptors = [],
  onToggleLock,
  onOrderQtyCommit,
  selectedRoqDateTab = null,
  // showHideMetrics is the v2 view_details.show_hide_metrics array
  // ([{ key, hidden }]); when an entry has `hidden: true`, the matching
  // colId will be created with `hide: true` so the user can toggle it
  // back on via TableSettings without rebuilding colDefs. Default empty
  // = nothing hidden (v1 behavior preserved).
  showHideMetrics = [],
  // selectedMeasures is the v2 view_details.measures array
  // ([{ name, version, label }]). When the user picks measures via the
  // Measures axis card, one column per measure is appended inside every
  // period column group, sitting next to Order Qty. Empty array falls
  // back to a single-measure list derived from selectedKpi so the v1
  // single-KPI behaviour is preserved.
  selectedMeasures = [],
  columnTimeSubDimensions = [],
  fiscalCalendar = null,
  selectedDateRange = null,
  // Opens PackConfigBottomSheet for a pack SKU row; threaded into the
  // hierarchy column's pack hyperlink. Stable wrapper from the table (rule #58).
  onPackClick = null,
}) {
  const hiddenMetricKeys = new Set(
    (showHideMetrics || [])
      .filter((entry) => entry?.hidden && entry?.key)
      .map((entry) => entry.key)
  );
  const isMetricHidden = (metricKey) => hiddenMetricKeys.has(metricKey);
  // treeData + groupDisplayType="custom" (the AgGridComponent wrapper path):
  // there are NO AG-Grid rowGroup columns and NO auto-group column. The whole
  // hierarchy — every group level AND the leaf — is fetched lazily via the
  // datasource's getSubRowsRequest and rendered through one pinned hierarchy
  // column that carries the expand/collapse chevron (agGroupCellRenderer).
  // This covers the single-dimension pivot too (the column just renders a flat
  // list of leaf rows with no chevron). See buildHierarchyColumn.
  const hierarchyColumn = buildHierarchyColumn({ pivotOrder, onPackClick });

  const kpiLabel = getKpiLabel(selectedKpi, kpiOptions);

  // Resolve the measure list rendered alongside Order Qty inside each
  // period column group. If the user has not placed a Measures card,
  // fall back to a one-entry list driven by selectedKpi so the v1
  // single-KPI layout still renders. Drop `order_qty` from the measure
  // list because it is already rendered as the dedicated Order Qty
  // column with its own renderer / editor / lock toggle.
  const resolvedMeasures = (() => {
    const list = Array.isArray(selectedMeasures) ? selectedMeasures : [];
    if (list.length > 0) {
      return list.filter(
        (measure) => measure?.name && measure.name !== "order_qty"
      );
    }
    if (selectedKpi) {
      return [{ name: selectedKpi, version: "current", label: kpiLabel }];
    }
    return [];
  })();

  // Clubbed buckets (3M / 6M) sum N member months and are read-only — a single
  // edit on a multi-month aggregate is ambiguous about which month absorbs the
  // delta. Single-member columns (weeks, 1M) keep the editable Input + lock.
  const buildOrderQtyChild = (descriptor) => {
    const { periodId, members } = descriptor;
    const isEditableColumn = !descriptor.isBucket && members.length === 1;
    const baseColumn = {
      colId: `period.${periodId}.orderQty`,
      headerName: ORDER_QTY_HEADER,
      editable: false,
      // Metric columns are not searchable and carry no useful column menu;
      // suppress it so only the hierarchy column surfaces a (hover-only) icon.
      suppressMenu: true,
      valueGetter: periodOrderQtyValueGetter(fiscalView, members),
      headerClass: "ag-right-aligned-header",
      cellStyle: (cellParams) =>
        getPeriodCellStyle(cellParams, members, fiscalView, selectedKpi),
      flex: 0,
      hide: isMetricHidden("order_qty"),
    };
    if (!isEditableColumn) {
      // Plain read-only aggregate cell — no Input, no lock toggle.
      return { ...baseColumn, cellClass: "ag-right-aligned-cell" };
    }
    return {
      ...baseColumn,
      // impact-ui-v3 Input owns editing; blur calls onOrderQtyCommit.
      cellClass: "cell-renderer",
      cellRenderer: LegacyOrderQtyInputCell,
      cellRendererParams: {
        orderQtyEditableLevels,
        pivotOrder,
        fiscalView,
        periodId,
        onToggleLock,
        onOrderQtyCommit,
      },
      valueSetter: periodOrderQtyValueSetter(fiscalView, members),
    };
  };

  const buildMeasureChild = (descriptor, measure) => {
    const { periodId, members } = descriptor;
    const version = measure.version || "current";
    const isLegacyKpi = measure.name === selectedKpi;
    return {
      colId: `period.${periodId}.${measure.name}_${version}`,
      headerName: measure.label || measure.name,
      editable: false,
      suppressMenu: true,
      valueGetter: isLegacyKpi
        ? periodKpiValueGetter(fiscalView, members)
        : periodMeasureValueGetter(fiscalView, members, measure.name),
      cellClass: "ag-right-aligned-cell",
      headerClass: "ag-right-aligned-header",
      cellStyle: (cellParams) =>
        isGrandTotalRow(cellParams.data)
          ? { fontWeight: 600, background: "#f5f5f5" }
          : null,
      flex: 0,
      hide: isMetricHidden(measure.name),
    };
  };

  const buildPeriodLeafGroup = (descriptor) => ({
    headerName: descriptor.label,
    marryChildren: true,
    headerClass: "ag-right-aligned-header",
    children: [
      buildOrderQtyChild(descriptor),
      ...resolvedMeasures.map((measure) =>
        buildMeasureChild(descriptor, measure)
      ),
    ],
  });

  const periodColumnGroups = buildNestedTimeColumnGroups({
    timeSubDimensions: columnTimeSubDimensions,
    fiscalView,
    periodDescriptors,
    fiscalCalendar,
    selectedRoqDateTab,
    selectedDateRange,
    buildPeriodLeafGroup,
  });

  return [hierarchyColumn, ...periodColumnGroups];
}

export function buildHierarchyColumnLabel(pivotOrder = []) {
  if (!pivotOrder?.length) return "Hierarchy";
  return pivotOrder.map((dimension) => dimension.label).join(" - ");
}

// Returns true when the row data represents an aggregated leaf row (one row
// per SKU after DC fold-in). Leaf rows are produced by aggregateGroupRow at
// the bottom of the pivot stack and are decorated with `dcList`/`dcCount` to
// surface the DCs that contribute to the SKU's order. Group rows have a
// `leafId` prefix of `group::` and no `dcList`.
function isAggregatedLeafRow(data) {
  if (!data) return false;
  if (isGrandTotalRow(data)) return false;
  return Array.isArray(data.dcList);
}

// Compose the multi-line SKU-detail tooltip shown on hover at the leaf
// level. Pulls every distinguishing field that the leaf exposes (DC list,
// MOQ, style description, supplier) and skips empties so a sparse mock
// doesn't render dangling labels.
function buildSkuDetailTooltip(data) {
  if (!data) return "";
  const lines = [];
  const lastDim = data.L5;
  if (lastDim) lines.push(`SKU: ${lastDim}`);
  if (data.style_description) lines.push(`Style: ${data.style_description}`);
  if (data.style_color_desc) lines.push(`Color: ${data.style_color_desc}`);
  if (data.supplier_name) lines.push(`Supplier: ${data.supplier_name}`);
  if (Array.isArray(data.dcList) && data.dcList.length) {
    lines.push(`DCs (${data.dcList.length}): ${data.dcList.join(", ")}`);
  }
  if (Number.isFinite(Number(data.min_order_quantity_style))) {
    lines.push(`MOQ: ${data.min_order_quantity_style}`);
  }
  return lines.join("\n");
}

// treeData hierarchy column for the AgGridComponent wrapper (groupDisplayType
// "custom"). One pinned-left column renders every depth — group rows AND the
// aggregated leaf — with the expand/collapse chevron supplied by
// `agGroupCellRenderer`. The displayed label is the row's OWN dimension value,
// read from the server-stamped `dimensionPath` (its last entry), so each level
// shows the correct text (L1 value at depth 0 ... SKU at the leaf) without the
// AG-Grid auto-group column, which treeData/custom mode does not render.
export function buildHierarchyColumn({
  pivotOrder,
  onPackClick,
  showBudgetHierarchyBadge = true,
} = {}) {
  return {
    colId: "hierarchy",
    headerName: buildHierarchyColumnLabel(pivotOrder),
    pinned: "left",
    minWidth: 220,
    cellRenderer: "agGroupCellRenderer",
    // agGroupCellRenderer owns the chevron; HierarchyCellRenderer renders the
    // label and, for pack-enabled size/pack rows, the "View Pack Details" hyperlink.
    cellRendererParams: {
      suppressCount: false,
      innerRenderer: HierarchyCellRenderer,
      innerRendererParams: {
        onPackClick,
        pivotOrder,
        showBudgetHierarchyBadge,
      },
    },
    // Search/value-picker is parked (see docs/handoff.md). Keep the menu
    // suppressed so the header stays a plain label until search is revived.
    suppressMenu: true,
    valueGetter: (params) => {
      if (isGrandTotalRow(params.data)) return GRAND_TOTAL_LABEL;
      const path = params.data?.dimensionPath;
      let label =
        Array.isArray(path) && path.length ? path[path.length - 1] : "";
      if (typeof label === "string" && label) {
        label = replaceSpecialCharacter(label);
      }
      if (isAggregatedLeafRow(params.data) && params.data.dcCount > 0) {
        const dcCount = params.data.dcCount;
        label = `${label} (${dcCount} ${dcCount === 1 ? "DC" : "DCs"})`;
      }
      return label;
    },
    tooltipValueGetter: (params) => buildSkuDetailTooltip(params.data),
    // The depth-fade accent border used to live here; it now renders on the
    // checkbox column instead (see customSelectCellStyle in OrderManagement.jsx)
    // so the hierarchy column stays plain.
    cellStyle: (cellParams) => {
      if (isGrandTotalRow(cellParams.data)) {
        return { fontWeight: 600, backgroundColor: OMS_GRAND_TOTAL_ROW_BG };
      }
      return null;
    },
  };
}

export function buildAutoGroupColumnDef({ pivotOrder } = {}) {
  const lastDimension = pivotOrder?.[pivotOrder.length - 1];
  return {
    headerName: buildHierarchyColumnLabel(pivotOrder),
    minWidth: 280,
    // `valueGetter` decides what the cell SHOWS:
    //   - pinned Grand Total row: literal "Grand Total".
    //   - leaf rows (one row per SKU after DC aggregation): the SKU id with
    //     a parenthetical DC count, e.g. "TSH-M-001 (3 DCs)" — surfaces the
    //     primary distinguishing fact at a glance. The full DC list, MOQ,
    //     style description, and supplier come through as a tooltip.
    //   - group rows: handled by AG-Grid's internal group renderer via
    //     `node.key`; this valueGetter is bypassed for them.
    valueGetter: (params) => {
      if (isGrandTotalRow(params.data)) return GRAND_TOTAL_LABEL;
      if (!lastDimension?.id) return "";
      const rawValue = params.data?.[lastDimension.id] ?? "";
      let displayValue =
        typeof rawValue === "string" && rawValue
          ? replaceSpecialCharacter(rawValue)
          : rawValue;
      if (isAggregatedLeafRow(params.data)) {
        const dcCount = params.data.dcCount;
        if (dcCount > 0) {
          return `${displayValue} (${dcCount} ${dcCount === 1 ? "DC" : "DCs"})`;
        }
      }
      return displayValue;
    },
    tooltipValueGetter: (params) => buildSkuDetailTooltip(params.data),
    cellRendererParams: { suppressCount: false },
    cellStyle: (cellParams) =>
      isGrandTotalRow(cellParams.data)
        ? { fontWeight: 600, backgroundColor: OMS_GRAND_TOTAL_ROW_BG }
        : null,
  };
}
