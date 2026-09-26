import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { parseOrderQtyFieldName } from "./buildEditIntent.util.js";
import { resolveColumnFiscalMembers } from "./orderManagementColumns.util.js";

const DC_DIMENSION_IDS = new Set(["loc_code", "dc_or_channel", "channel", "DC"]);

export function encodeHierarchyValueForBackend(value) {
  if (value == null) return value;
  return replaceSpecialCharToCharCode(String(value));
}

function calendarTabKey(selectedRoqDateTab) {
  return selectedRoqDateTab === "roq_placement_date" ? "placement" : "receipt";
}

function weekSuffixFromCalendarRow(row) {
  return `w${row.fiscal_week}_${row.fiscal_year}`.toLowerCase();
}

function monthSuffixFromCalendarRow(row) {
  return `${String(row.fiscal_month_name || "").toLowerCase()}_${row.fiscal_year}`;
}

function dimensionKey(dimension) {
  return dimension?.id || dimension?.field || null;
}

/** Edit/set-all send week_list as integers — budget fiscal_weeks must match. */
function toFiscalWeekIds(members) {
  if (!Array.isArray(members) || !members.length) return [];
  return members
    .map((memberId) => Number(memberId))
    .filter((memberId) => Number.isFinite(memberId));
}

/**
 * Map BE `order_quantity_{suffix}` suffix → fiscal period ids for the budget
 * API. Prefers a direct match against descriptor periodId / members (modern
 * `order_quantity_202612` columns), then falls back to legacy calendar label
 * suffixes (`w12_2026`). Clubbed month descriptors return all member ids.
 */
export function resolveFiscalMembersForPeriodSuffix({
  periodSuffix,
  fiscalView = "week",
  periodDescriptors = [],
  fiscalCalendar,
  selectedRoqDateTab = "roq_receipt_date",
}) {
  const suffix = String(periodSuffix || "").toLowerCase();
  if (!suffix) return [];

  // Modern drilldown columns use the fiscal id itself as the field suffix
  // (`order_quantity_202612`). Match that before the legacy label path.
  for (const descriptor of periodDescriptors || []) {
    const periodId = String(descriptor?.periodId || "").toLowerCase();
    const members = descriptor?.members || [];
    if (
      periodId === suffix ||
      members.some((memberId) => String(memberId).toLowerCase() === suffix)
    ) {
      const resolved = members.length
        ? members
        : descriptor?.periodId != null
        ? [descriptor.periodId]
        : [];
      return toFiscalWeekIds(resolved);
    }
  }

  const calendarRows =
    fiscalCalendar?.[calendarTabKey(selectedRoqDateTab)]?.fiscalCalendarData ||
    [];
  const isWeek = fiscalView === "week";

  for (const descriptor of periodDescriptors || []) {
    const members = descriptor?.members || [];
    const memberSuffixes = members.map((memberId) => {
      const row = calendarRows.find((calendarRow) =>
        isWeek
          ? String(calendarRow.fiscal_year_week) === String(memberId)
          : String(calendarRow.fiscal_year_month) === String(memberId)
      );
      if (!row) return null;
      return isWeek
        ? weekSuffixFromCalendarRow(row)
        : monthSuffixFromCalendarRow(row);
    });
    if (memberSuffixes.some((memberSuffix) => memberSuffix === suffix)) {
      return toFiscalWeekIds(members);
    }
  }

  const matchedRow = calendarRows.find((calendarRow) => {
    const rowSuffix = isWeek
      ? weekSuffixFromCalendarRow(calendarRow)
      : monthSuffixFromCalendarRow(calendarRow);
    return rowSuffix === suffix;
  });
  if (!matchedRow) return [];

  return toFiscalWeekIds(
    isWeek
      ? [matchedRow.fiscal_year_week]
      : [matchedRow.fiscal_year_month]
  );
}

/**
 * Resolve the hierarchy the row is ACTUALLY grouped at — not a fixed
 * configured level. Walks `dimensionPath` from the row's own depth back
 * toward the root and returns the deepest non-DC/channel dimension that has
 * a real value, e.g. a row pivoted to `l1_name` → `{ selected_hierarchy:
 * "l1_name", hierarchy_values: ["Apparel"] }`, matching whatever hierarchy
 * level the user is currently drilled into (l0_name, l1_name, article, ...).
 * `dc_or_channels` is resolved separately since it's never itself the
 * product hierarchy, even when it appears deeper in `pivotOrder` than the
 * row's current depth.
 */
function resolveBudgetHierarchyForRow(pivotOrder, dimensionPath) {
  const dcOrChannels = [];
  let selectedHierarchy = null;
  let hierarchyValue = null;

  if (
    Array.isArray(pivotOrder) &&
    Array.isArray(dimensionPath) &&
    dimensionPath.length
  ) {
    const depth = dimensionPath.length - 1;

    const dcIdx = pivotOrder.findIndex((dimension) =>
      DC_DIMENSION_IDS.has(dimensionKey(dimension))
    );
    if (dcIdx >= 0 && depth >= dcIdx) {
      const dcValue = dimensionPath[dcIdx];
      if (dcValue != null && dcValue !== "") {
        dcOrChannels.push(String(dcValue));
      }
    }

    for (let idx = depth; idx >= 0; idx -= 1) {
      const dimension = pivotOrder[idx];
      const key = dimensionKey(dimension);
      if (!dimension || !key || DC_DIMENSION_IDS.has(key)) continue;
      const value = dimensionPath[idx];
      if (value == null || value === "") continue;
      selectedHierarchy = key;
      hierarchyValue = encodeHierarchyValueForBackend(String(value));
      break;
    }
  }

  return {
    selected_hierarchy: selectedHierarchy,
    hierarchy_values: hierarchyValue != null ? [hierarchyValue] : [],
    dc_or_channels: dcOrChannels,
  };
}

function resolveFiscalWeeksForBudget({
  column,
  colDef,
  orderQtyField,
  fiscalView,
  periodDescriptors,
  fiscalCalendar,
  selectedRoqDateTab,
}) {
  // Same source the edit blur path uses — BE stamps fiscal_buckets on the
  // group and beColToMtpConfig copies it onto each leaf's extra.
  const fromColumn = resolveColumnFiscalMembers(column, colDef);
  if (Array.isArray(fromColumn) && fromColumn.length) {
    return toFiscalWeekIds(fromColumn);
  }

  const periodSuffix = parseOrderQtyFieldName(orderQtyField);
  return resolveFiscalMembersForPeriodSuffix({
    periodSuffix,
    fiscalView,
    periodDescriptors,
    fiscalCalendar,
    selectedRoqDateTab,
  });
}

/**
 * Resolve period-scoped order cost from row data for the clicked order-qty cell.
 * `order_quantity_december_2027` → `order_cost_december_2027` (same for week ids
 * like `order_quantity_202612`). Falls back to flat `order_cost` when absent.
 */
export function resolvePeriodOrderCost(rowData, orderQtyField) {
  if (!rowData || typeof rowData !== "object") return null;

  let periodSuffix = parseOrderQtyFieldName(orderQtyField);
  if (periodSuffix?.startsWith("eaches_")) {
    periodSuffix = periodSuffix.slice("eaches_".length);
  }

  if (periodSuffix) {
    const periodKey = `order_cost_${periodSuffix}`;
    if (Object.prototype.hasOwnProperty.call(rowData, periodKey)) {
      return rowData[periodKey];
    }
  }

  return rowData.order_cost ?? null;
}

/**
 * Build POST /get-budget-data payload for an Order Management order-qty cell.
 * BE takes a single `fiscal_weeks` array (week or month period ids),
 * `global_filters`, and the hierarchy level the row is actually grouped at.
 */
export function buildOrderManagementBudgetPayload({
  rowData,
  pivotOrder = [],
  orderQtyField,
  column = null,
  colDef = null,
  fiscalView = "week",
  periodDescriptors = [],
  fiscalCalendar,
  selectedRoqDateTab = "roq_receipt_date",
  selectedHierarchyL0 = "article",
  highLevelSummaryState = null,
  filters = [],
}) {
  const fiscalMembers = resolveFiscalWeeksForBudget({
    column,
    colDef,
    orderQtyField,
    fiscalView,
    periodDescriptors,
    fiscalCalendar,
    selectedRoqDateTab,
  });

  const roq_date_option = selectedRoqDateTab || "roq_receipt_date";
  const isGrandTotal = rowData?.meta?.__isGrandTotal === true;
  const global_filters = Array.isArray(filters) ? filters : [];

  if (isGrandTotal) {
    const selected_hierarchy =
      highLevelSummaryState?.level_of_hierarchy_id || selectedHierarchyL0;
    const hierarchy_value = highLevelSummaryState?.level_of_hierarchy_value;
    return {
      selected_hierarchy,
      hierarchy_values:
        hierarchy_value != null
          ? [encodeHierarchyValueForBackend(hierarchy_value)]
          : [],
      dc_or_channels: [],
      fiscal_weeks: fiscalMembers,
      roq_date_option,
      global_filters,
    };
  }

  const {
    selected_hierarchy,
    hierarchy_values,
    dc_or_channels,
  } = resolveBudgetHierarchyForRow(pivotOrder, rowData?.dimensionPath);

  return {
    // Prefer the row's actual pivot dimension; fall back to the configured
    // default only when no dimension key could be resolved.
    selected_hierarchy: selected_hierarchy || selectedHierarchyL0,
    hierarchy_values,
    dc_or_channels,
    fiscal_weeks: fiscalMembers,
    roq_date_option,
    global_filters,
  };
}
