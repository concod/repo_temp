import { cloneDeep, isEmpty, uniq } from "lodash";
import moment from "moment";
import { buildGlobalFilters } from "./drilldownMatrixPayload.util.js";
import { buildSelectionTrace } from "./selectionTrace.util.js";

export const APPROVAL_PANE_FILTER_CONFIG_NAME = "OMS Approval Flow filters";
export const ISO_DATE_FORMAT = "YYYY-MM-DD";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SIZE_SORT_ORDER = "ASC";

function resolveDimId(pivotOrder, index) {
  const dim = pivotOrder?.[index];
  if (dim == null) return null;
  return typeof dim === "string" ? dim : dim?.id ?? null;
}

export function resolveAvailableHierarchies(pivotOrder = []) {
  return (pivotOrder || [])
    .map((dim, index) => resolveDimId(pivotOrder, index))
    .filter(Boolean);
}

/**
 * Merge matrix panel global_filters with approval-pane filter selections
 * (order_type, product attribute, etc.) — same role as legacy approval_filters.
 */
export function mergeApprovalPaneGlobalFilters({
  matrixGlobalFilters = [],
  approvalPaneFilters = [],
} = {}) {
  const merged = Array.isArray(matrixGlobalFilters)
    ? cloneDeep(matrixGlobalFilters)
    : [];
  const byAttribute = new Map(
    merged.map((entry) => [entry.attribute_name, entry])
  );

  (approvalPaneFilters || []).forEach((filter) => {
    if (!filter?.attribute_name || filter.attribute_name === "fiscal_date_range") {
      return;
    }
    const values = Array.isArray(filter.values) ? filter.values : [];
    if (values.length === 0) return;
    byAttribute.set(filter.attribute_name, {
      attribute_name: filter.attribute_name,
      operator: filter.operator || "in",
      values,
    });
  });

  return [...byAttribute.values()];
}

/** Normalize any parsed date to ISO 8601 calendar date (YYYY-MM-DD) for v3 APIs. */
export function toIsoDateString(dateValue) {
  if (dateValue == null || dateValue === "") return null;
  const parsed = moment.isMoment(dateValue) ? dateValue : moment(dateValue);
  if (!parsed.isValid()) return null;
  return parsed.utc().format(ISO_DATE_FORMAT);
}

export function buildOrderPlacementDateParams({ startDate, endDate } = {}) {
  const startIso = toIsoDateString(startDate);
  const endIso = toIsoDateString(endDate);
  if (!startIso || !endIso) return null;
  return {
    attribute_name: "order_placement_date",
    start_date: startIso,
    end_date: endIso,
  };
}

/** Empty date_range sent before order placement dates are applied. */
export const EMPTY_APPROVAL_PANE_DATE_RANGE = {
  start_date: null,
  end_date: null,
};

/** Build approval filter entry for applied fiscal calendar date range. */
export function buildFiscalDateRangeApprovalFilter(filterRecommDates = {}) {
  if (!filterRecommDates?.values) {
    return null;
  }

  const rawValues = filterRecommDates.values;
  let values;

  if (rawValues.fiscalInfoStartDate && rawValues.fiscalInfoEndDate) {
    values = [rawValues.fiscalInfoStartDate, rawValues.fiscalInfoEndDate];
  } else if (Array.isArray(rawValues) && rawValues.length >= 2) {
    values = rawValues;
  } else {
    values = Object.values(rawValues).filter(Boolean);
  }

  if (!values || values.length < 2) {
    return null;
  }

  return {
    attribute_name: "fiscal_date_range",
    filter_type: filterRecommDates.filter_type || "non-cascaded",
    dimension: filterRecommDates.dimension,
    operator: "in",
    values,
  };
}

/** Build order placement dates from fiscal calendar week selection (ISO format). */
export function buildOrderPlacementDateFromFiscalSelection(fiscalValues) {
  if (!fiscalValues?.fiscalInfoStartDate || !fiscalValues?.fiscalInfoEndDate) {
    return null;
  }

  const startSource =
    fiscalValues.fiscalInfoStartDate?.calendar_week_start_date ??
    fiscalValues.fiscalInfoStartDate?.fiscal_week_begin_date ??
    fiscalValues.fiscalInfoStartDate?.week_start_date;
  const endSource =
    fiscalValues.fiscalInfoEndDate?.calendar_week_start_date ??
    fiscalValues.fiscalInfoEndDate?.fiscal_week_end_date ??
    fiscalValues.fiscalInfoEndDate?.week_end_date;

  if (!startSource || !endSource) return null;

  return buildOrderPlacementDateParams({
    startDate: moment(startSource).utc().startOf("week"),
    endDate: moment(endSource).utc().endOf("week"),
  });
}

/** Resolve ISO order-placement dates from any fiscal calendar value shape. */
export function resolveOrderPlacementDateFromFiscalValues(rawValues) {
  if (!rawValues) {
    return null;
  }

  if (rawValues.start_date && rawValues.end_date) {
    return buildOrderPlacementDateParams({
      startDate: rawValues.start_date,
      endDate: rawValues.end_date,
    });
  }

  if (rawValues.fiscalInfoStartDate && rawValues.fiscalInfoEndDate) {
    return buildOrderPlacementDateFromFiscalSelection(rawValues);
  }

  if (Array.isArray(rawValues) && rawValues.length >= 2) {
    return resolveOrderPlacementDateForPayload(null, [
      { attribute_name: "fiscal_date_range", values: rawValues },
    ]);
  }

  return null;
}

/**
 * Resolve order placement dates for v3 approval-pane payloads.
 * Prefers explicit state/ref, then fiscal_date_range in approval filters.
 */
export function resolveOrderPlacementDateForPayload(
  orderPlacementDate,
  selectedApprovalFilters = []
) {
  if (orderPlacementDate?.start_date && orderPlacementDate?.end_date) {
    return orderPlacementDate;
  }

  const fiscalFilter = (selectedApprovalFilters || []).find(
    (filter) =>
      filter?.attribute_name === "fiscal_date_range" ||
      filter?.filter_id === "fiscal_date_range"
  );
  const values = fiscalFilter?.values;
  if (!values) {
    return null;
  }

  if (values.fiscalInfoStartDate && values.fiscalInfoEndDate) {
    return buildOrderPlacementDateFromFiscalSelection(values);
  }

  if (
    Array.isArray(values) &&
    values.length >= 2 &&
    typeof values[0] === "string" &&
    typeof values[1] === "string"
  ) {
    return buildOrderPlacementDateParams({
      startDate: values[0],
      endDate: values[1],
    });
  }

  if (
    Array.isArray(values) &&
    values.length >= 2 &&
    typeof values[0] === "object" &&
    values[0] != null
  ) {
    return buildOrderPlacementDateFromFiscalSelection({
      fiscalInfoStartDate: values[0],
      fiscalInfoEndDate: values[1],
    });
  }

  return null;
}

/** Always returns date_range — empty when no dates, ISO strings when applied. */
export function buildApprovalPaneDateRange(orderPlacementDate) {
  if (!orderPlacementDate?.start_date || !orderPlacementDate?.end_date) {
    return { ...EMPTY_APPROVAL_PANE_DATE_RANGE };
  }

  const startIso = toIsoDateString(orderPlacementDate.start_date);
  const endIso = toIsoDateString(orderPlacementDate.end_date);

  if (!startIso || !endIso) {
    return { ...EMPTY_APPROVAL_PANE_DATE_RANGE };
  }

  return {
    start_date: startIso,
    end_date: endIso,
  };
}

/** Shared base payload without date_range (cross-filter). */
export function buildApprovalPaneBasePayload({
  screenId,
  drilldownSelection = [],
  availableHierarchies = [],
  globalFilters = [],
  approvalPaneFilters = [],
  orderIdentifiers = [],
} = {}) {
  const payload = {
    ...(screenId != null ? { screen_id: screenId } : {}),
    drilldown_selection: Array.isArray(drilldownSelection)
      ? drilldownSelection
      : [],
    global_filters: mergeApprovalPaneGlobalFilters({
      matrixGlobalFilters: globalFilters,
      approvalPaneFilters,
    }),
    available_hierarchies: Array.isArray(availableHierarchies)
      ? availableHierarchies
      : [],
  };

  if (Array.isArray(orderIdentifiers) && orderIdentifiers.length > 0) {
    payload.order_identifiers = orderIdentifiers;
  }

  return payload;
}

/** filter-orders / send-for-approval — always includes date_range. */
export function buildApprovalPaneOrdersPayload({
  orderPlacementDate,
  ...baseOptions
} = {}) {
  return {
    ...buildApprovalPaneBasePayload(baseOptions),
    date_range: buildApprovalPaneDateRange(orderPlacementDate),
  };
}

export function buildApprovalPaneCrossFilterPayload(options = {}) {
  const { orderPlacementDate, ...baseOptions } = options;
  return {
    ...buildApprovalPaneBasePayload(baseOptions),
    filter_config_name: APPROVAL_PANE_FILTER_CONFIG_NAME,
  };
}

function wrapIlikePattern(pattern) {
  if (pattern == null || pattern === "") return "%";
  const text = String(pattern);
  if (text.startsWith("%") || text.endsWith("%")) {
    return text;
  }
  return `%${text}%`;
}

function parseListValues(pattern) {
  if (Array.isArray(pattern)) {
    return pattern.filter((value) => value != null && value !== "");
  }
  if (pattern == null || pattern === "") return [];
  return String(pattern)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Map AG Grid manualbody.search + manualbody.range into v3 column_filters.
 */
export function mapAgGridMetaToColumnFilters(manualbody = {}) {
  const columnFilters = [];

  (manualbody.search || []).forEach((entry) => {
    if (!entry?.column) return;

    if (entry.type === "list" || Array.isArray(entry.pattern)) {
      const values = parseListValues(entry.pattern);
      if (values.length > 0) {
        columnFilters.push({
          column: entry.column,
          operator: "in",
          values,
        });
      }
      return;
    }

    const searchType = entry.search_type || entry.type || "contains";
    if (
      searchType === "equals" ||
      searchType === "equal" ||
      searchType === "exact"
    ) {
      columnFilters.push({
        column: entry.column,
        operator: "eq",
        value: entry.pattern,
      });
      return;
    }

    columnFilters.push({
      column: entry.column,
      operator: "ilike",
      value: wrapIlikePattern(entry.pattern),
    });
  });

  (manualbody.range || []).forEach((entry) => {
    if (!entry?.column) return;

    const searchType = entry.search_type || entry.type;
    const minVal = entry.min_val;
    const maxVal = entry.max_val;

    if (searchType === "greaterThanOrEqual" || searchType === "greaterThan") {
      columnFilters.push({
        column: entry.column,
        operator: searchType === "greaterThan" ? "gt" : "gte",
        value: minVal,
      });
      return;
    }

    if (searchType === "lessThanOrEqual" || searchType === "lessThan") {
      columnFilters.push({
        column: entry.column,
        operator: searchType === "lessThan" ? "lt" : "lte",
        value: maxVal ?? minVal,
      });
      return;
    }

    if (searchType === "inRange") {
      if (minVal != null && minVal !== "") {
        columnFilters.push({
          column: entry.column,
          operator: "gte",
          value: minVal,
        });
      }
      if (maxVal != null && maxVal !== "") {
        columnFilters.push({
          column: entry.column,
          operator: "lte",
          value: maxVal,
        });
      }
      return;
    }

    if (minVal != null && minVal !== "") {
      columnFilters.push({
        column: entry.column,
        operator: "eq",
        value: minVal,
      });
    }
  });

  return columnFilters;
}

export function mapAgGridMetaToSort(manualbody = {}) {
  return (manualbody.sort || [])
    .filter((entry) => entry?.column)
    .map((entry) => ({
      column: entry.column,
      order: String(entry.order || "asc").toUpperCase(),
    }));
}

export function buildApprovalPaneFilterOrdersPayload({
  manualbody,
  pageIndex = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  ...baseOptions
} = {}) {
  return {
    ...buildApprovalPaneOrdersPayload(baseOptions),
    column_filters: mapAgGridMetaToColumnFilters(manualbody),
    sort: mapAgGridMetaToSort(manualbody),
    size_sort_order: DEFAULT_SIZE_SORT_ORDER,
    page: pageIndex + 1,
    page_size: pageSize,
  };
}

export function buildApprovalPaneSendForApprovalPayload(options = {}) {
  return buildApprovalPaneOrdersPayload(options);
}

/**
 * Product filter for Style Order Summary approve — selected article/style values.
 */
export function buildStyleOrderProductSelectionFilter(
  selectedRows = [],
  productDetailsFilter = {}
) {
  const attributeName =
    productDetailsFilter?.column_name ||
    productDetailsFilter?.attribute_name ||
    "article";
  const values = uniq(
    (selectedRows || [])
      .map((row) => row?.[attributeName])
      .filter((value) => value != null && value !== "")
  );

  return {
    attribute_name: attributeName,
    dimension: productDetailsFilter?.dimension || "Product",
    filter_type:
      productDetailsFilter?.filter_type ||
      productDetailsFilter?.type ||
      "cascaded",
    operator: "in",
    values,
  };
}

/**
 * v3 approval-pane order_identifiers for Style Order Summary approve flow.
 */
export function buildStyleOrderSummaryOrderIdentifiers(
  selectedStyleRows = [],
  productDetailsFilter = {}
) {
  const articleKey =
    productDetailsFilter?.column_name ||
    productDetailsFilter?.attribute_name ||
    "article";

  return (selectedStyleRows || [])
    .map((row) => {
      const orderGroupId = row?.order_group_id;
      const article = row?.[articleKey] ?? row?.article;
      const placementDate = toIsoDateString(
        row?.order_placement_date ?? row?.order_placement_recom_date
      );

      if (!orderGroupId || article == null || article === "" || !placementDate) {
        return null;
      }

      return {
        order_group_id: orderGroupId,
        article: String(article),
        order_placement_date: placementDate,
      };
    })
    .filter(Boolean);
}

/**
 * Approval-pane context for Style Order Summary — matrix handoff + article selection.
 */
export function buildStyleOrderSummaryApprovalPaneContext({
  handoff = {},
  selectedStyleRows = [],
  productDetailsFilter,
  screenId,
} = {}) {
  const articleFilter = buildStyleOrderProductSelectionFilter(
    selectedStyleRows,
    productDetailsFilter
  );
  const orderIdentifiers = buildStyleOrderSummaryOrderIdentifiers(
    selectedStyleRows,
    productDetailsFilter
  );

  const baseGlobalFilters = Array.isArray(handoff.globalFilters)
    ? cloneDeep(handoff.globalFilters)
    : [];
  const byAttribute = new Map(
    baseGlobalFilters.map((entry) => [entry.attribute_name, entry])
  );

  if (articleFilter.values.length > 0) {
    byAttribute.set(articleFilter.attribute_name, {
      attribute_name: articleFilter.attribute_name,
      operator: articleFilter.operator,
      values: articleFilter.values,
    });
  }

  return {
    ...(screenId != null ? { screenId } : {}),
    drilldownSelection: Array.isArray(handoff.selectedHierarchies)
      ? handoff.selectedHierarchies
      : [],
    availableHierarchies: Array.isArray(handoff.availableHierarchies)
      ? handoff.availableHierarchies
      : [],
    globalFilters: [...byAttribute.values()],
    orderIdentifiers,
  };
}

/**
 * Build approval-pane context from matrix view state (RowSelectionActionCluster).
 */
export function buildMatrixApprovalPaneContext({
  screenId,
  pivotOrder,
  selectedRowTraces,
  isSelectAll,
  selectedFilters,
  selectedDateRange,
  selectedRoqDateTab,
} = {}) {
  const availableHierarchies = resolveAvailableHierarchies(pivotOrder);
  const drilldownSelection = isSelectAll
    ? []
    : buildSelectionTrace({ traces: selectedRowTraces, pivotOrder });

  const activeTab = selectedRoqDateTab || "roq_placement_date";
  const matrixDateRange =
    selectedDateRange?.[activeTab] ||
    selectedDateRange?.roq_placement_date ||
    null;

  return {
    screenId,
    drilldownSelection,
    availableHierarchies,
    globalFilters: buildGlobalFilters(selectedFilters),
    matrixDateRange,
    isSelectAll: Boolean(isSelectAll),
  };
}

export function isApprovalPaneActionReady({
  rowCount = 0,
  isLoading = false,
  isOrderTypePresent = false,
  orderPlacementDate,
} = {}) {
  return (
    rowCount > 0 &&
    !isLoading &&
    isOrderTypePresent &&
    !isEmpty(orderPlacementDate)
  );
}
