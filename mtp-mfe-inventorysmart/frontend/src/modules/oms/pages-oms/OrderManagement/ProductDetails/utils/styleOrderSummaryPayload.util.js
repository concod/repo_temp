import { cloneDeep } from "lodash";
import { tableConfigurationMetaData } from "modules/oms/constants-oms/stringConstants";
import { getPossibleMonthsAndWeeks } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import { resolveFiscalViewFromHlsDateFilter } from "../../utils/hlsTimeRangeSync.util.js";

/**
 * Week vs month from the matrix toolbar frequency (1w/3w/6w → week, 1m/3m/6m → month).
 */
export function resolveProductDetailsFiscalView(frequency) {
  return resolveFiscalViewFromHlsDateFilter(frequency, null);
}

/**
 * Seed week/month option lists from the matrix handoff date range + fiscal calendar.
 * Falls back to the legacy 26-week window when no range is set.
 */
export function buildProductDetailsPeriodOptions({
  selectedDateRange,
  fiscalCalendarRows,
  displaySnackMessages,
  formatWeeksAsEndDate = false,
} = {}) {
  const dateRanges = [];
  if (
    selectedDateRange?.start_date != null &&
    selectedDateRange?.end_date != null
  ) {
    dateRanges.push({
      start_date: selectedDateRange.start_date,
      end_date: selectedDateRange.end_date,
    });
  }

  return getPossibleMonthsAndWeeks(
    dateRanges,
    fiscalCalendarRows || [],
    displaySnackMessages || (() => {}),
    formatWeeksAsEndDate
  );
}

/**
 * Build the v3 style-order-summary request.
 * `dynamic_hierarchy` is always `{}` for now (not computed from the matrix
 * selection) — `selected_hierarchies` carries the per-row traces instead,
 * forward-compatible and currently ignored by the BE.
 */
export function buildStyleOrderSummaryV3Payload({
  handoff,
  styleFilterAttribute = "article",
  selectedStyles = [],
  periods = [],
  pageIndex = 0,
  pageSize = 50,
  metaOverrides = {},
} = {}) {
  const frequency = handoff?.frequency;
  const fiscalView = resolveProductDetailsFiscalView(frequency);
  const isWeek = fiscalView === "week";

  const globalFilters = Array.isArray(handoff?.globalFilters)
    ? cloneDeep(handoff.globalFilters)
    : [];

  if (Array.isArray(selectedStyles) && selectedStyles.length > 0) {
    const withoutStyle = globalFilters.filter(
      (entry) => entry?.attribute_name !== styleFilterAttribute
    );
    withoutStyle.push({
      attribute_name: styleFilterAttribute,
      operator: "in",
      values: selectedStyles,
    });
    globalFilters.splice(0, globalFilters.length, ...withoutStyle);
  }

  const meta = {
    ...cloneDeep(tableConfigurationMetaData.meta || {}),
    ...metaOverrides,
    limit: {
      limit: pageSize,
      page: pageIndex + 1,
    },
  };

  const body = {
    global_filters: globalFilters,
    dynamic_hierarchy:
      handoff?.dynamicHierarchy && typeof handoff.dynamicHierarchy === "object"
        ? handoff.dynamicHierarchy
        : {},
    // Forward-compatible — BE drops these until the model is extended.
    selected_hierarchies: Array.isArray(handoff?.selectedHierarchies)
      ? handoff.selectedHierarchies
      : [],
    meta,
    months: isWeek ? [] : periods,
    fiscal_weeks: isWeek ? periods : [],
    is_v3:
      typeof handoff?.isV3Schema === "boolean" ? handoff.isV3Schema : false,
  };

  return body;
}

/**
 * Build the v3 detailed-summary request (same shape as v2 detailed).
 */
export function buildStyleOrderDetailedSummaryV3Payload({
  filters = [],
  orderBy = "channel",
  orderGroupId,
  orderStatusId = 0,
  styles = [],
  periods = [],
  isWeekLevel = true,
  pageIndex = 0,
  pageSize = 50,
  metaOverrides = {},
  isV3Schema = false,
} = {}) {
  const meta = {
    ...cloneDeep(tableConfigurationMetaData.meta || {}),
    ...metaOverrides,
    limit: {
      limit: pageSize,
      page: pageIndex + 1,
    },
  };

  const body = {
    filters: Array.isArray(filters) ? filters : [],
    order_by: orderBy || "channel",
    order_group_id: orderGroupId,
    order_status_id: orderStatusId,
    styles: Array.isArray(styles) ? styles : [],
    meta,
    is_v3: Boolean(isV3Schema),
  };

  if (isWeekLevel) {
    body.fiscal_weeks = periods;
    body.months = [];
  } else {
    body.months = periods;
    body.fiscal_weeks = [];
  }

  return body;
}
