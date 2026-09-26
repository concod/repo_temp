import moment from "moment";
import { cloneDeep } from "lodash";
import {
  ORDER_MANAGEMENT_ORDER_DETAILS,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  CREATE_NEW_ORDER,
  CONFIGURATION,
  ORDER_REPOSITORY,
  OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
  PO_REBALANCE,
} from "modules/oms/constants-oms/routeConstants";
import {
  REDIRECT_TO_CREATE_NEW_ORDER,
  REDIRECT_TO_MATRIX_SUMMARY,
  REDIRECT_TO_OMS,
  REDIRECT_TO_CONFIGURATION,
  REDIRECT_TO_ORDER_REPOSITORY,
  REDIRECT_TO_EXPEDITE_ORDERS,
  REDIRECT_TO_PO_REBALANCE,
  REDIRECT_TO_PRODUCT_DETAILS_APPROVE,
  REDIRECT_TO_PRODUCT_DETAILS_REVIEW,
} from "./constants";
import {
  OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD,
  OMS_CNO_REDIRECT_DASHBOARD_DCS,
  OMS_OM_REDIRECT_DASHBOARD_DCS,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import { REDIRECT_TO_STYLE_ORDER_SUMMARY } from "./constants";
import {
  EXPEDITE_LS_KEYS,
  overrideExpediteArticleFilter,
} from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";

//Opens the Alert in New Tab
export const openInNewTab = (redirect) => {
  const URL_WITH_QUERY_PARAMS = {
    [REDIRECT_TO_MATRIX_SUMMARY]: ORDER_MANAGEMENT_MATRIX_SUMMARY,
    [REDIRECT_TO_OMS]: ORDER_MANAGEMENT_MATRIX_SUMMARY,
    [REDIRECT_TO_CREATE_NEW_ORDER]: CREATE_NEW_ORDER,
    [REDIRECT_TO_CONFIGURATION]: CONFIGURATION,
    [REDIRECT_TO_ORDER_REPOSITORY]: ORDER_REPOSITORY,
    [REDIRECT_TO_PO_REBALANCE]: PO_REBALANCE,
  };

  const URL_WITHOUT_QUERY_PARAMS = {
    [REDIRECT_TO_EXPEDITE_ORDERS]: OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
    [REDIRECT_TO_PRODUCT_DETAILS_APPROVE]: ORDER_MANAGEMENT_PRODUCT_DETAILS,
    [REDIRECT_TO_PRODUCT_DETAILS_REVIEW]: ORDER_MANAGEMENT_PRODUCT_DETAILS,
  };

  const mappedUrlWithoutQueryParams = URL_WITHOUT_QUERY_PARAMS[redirect];
  if (mappedUrlWithoutQueryParams) {
    window.open(mappedUrlWithoutQueryParams, "_blank", "noopener,noreferrer");
    return;
  }

  const mappedUrl = URL_WITH_QUERY_PARAMS[redirect];
  if (mappedUrl) {
    const separator = mappedUrl.includes("?") ? "&" : "?";
    const query = "step=0&type=alerts";
    const finalUrl = `${mappedUrl}${separator}${query}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (redirect) {
    window.open(redirect, "_blank", "noopener,noreferrer");
  }
};

//Stores the SKU IDs if the redirect is to create new order
export const storeSkuIfCreateOrder = (redirect, selectedRows) => {
  if (redirect !== REDIRECT_TO_CREATE_NEW_ORDER) return;
  const skuIds = selectedRows.map((row) => row.product_code).filter(Boolean);
  localStorage.setItem("selectedSku", JSON.stringify(skuIds));
};

export const storeDashboardDcSelectionForRedirect = (
  orderingDashboardSelectedDcs,
  selectedFilters,
  storageKey
) => {
  let toStore = [];
  if (
    Array.isArray(orderingDashboardSelectedDcs) &&
    orderingDashboardSelectedDcs.length > 0
  ) {
    toStore = orderingDashboardSelectedDcs.map((dc) => ({
      label: dc.label ?? dc.value,
      value: dc.value,
    }));
  } else {
    const dcFilter = (selectedFilters || []).find(
      (f) => (f.dimension || "").toLowerCase() === "dc"
    );
    if (dcFilter?.values?.length) {
      toStore = dcFilter.values.map((v) => {
        if (typeof v === "object" && v != null) {
          const code = v.value ?? v.label;
          return { label: v.label ?? String(code), value: code };
        }
        const code = v;
        return { label: String(code), value: code };
      });
    }
  }
  if (toStore.length > 0) {
    localStorage.setItem(storageKey, JSON.stringify(toStore));
  } else {
    localStorage.removeItem(storageKey);
  }
};

export const storeDashboardDcSelectionForCreateNewOrder = (
  orderingDashboardSelectedDcs,
  selectedFilters
) =>
  storeDashboardDcSelectionForRedirect(
    orderingDashboardSelectedDcs,
    selectedFilters,
    OMS_CNO_REDIRECT_DASHBOARD_DCS
  );

export const storeDashboardDcSelectionForOrderManagementRedirect = (
  orderingDashboardSelectedDcs,
  selectedFilters
) =>
  storeDashboardDcSelectionForRedirect(
    orderingDashboardSelectedDcs,
    selectedFilters,
    OMS_OM_REDIRECT_DASHBOARD_DCS
  );

//Stores the Article IDs
export const storeSelectedArticles = (selectedRows) => {
  const articles = selectedRows.map((row) => row.product_code);
  localStorage.setItem("selectedArticles", JSON.stringify(articles));
};

//Builds and stores the filters
export const buildAndStoreFilters = (props, selectedRows) => {
  const extraFilterLevels = (props?.redirectionLevel || []).map((level) => ({
    filter_type: "cascaded",
    attribute_name: level,
    filter_id: level,
    operator: "in",
    dimension: "product",
    values: selectedRows.map((row) => row?.[level]),
  }));

  const sourceFilters =
    props.filterDashboardConfiguration || props.filterDependencyData || [];

  // Check if the extraFilterLevels is applied in Filter Configuration (attribute_name & filter_id)
  const filteredSourceFilters = sourceFilters.filter(
    (sourceFilter) =>
      !extraFilterLevels.some(
        (extraFilter) =>
          extraFilter.attribute_name === sourceFilter.attribute_name &&
          extraFilter.filter_id === sourceFilter.filter_id
      )
  );

  const filters = [...filteredSourceFilters, ...extraFilterLevels];

  localStorage.setItem("selectedFiltersDependency", JSON.stringify(filters));

  return { filters, extraFilterLevels };
};

/** Resolve alert table date-range picker values (same shape as buildRequestBody). */
export const getAlertTableDateRangePayload = (
  alertTopRightOptions = [],
  dateRange = {}
) => {
  const datePickerConfig = alertTopRightOptions.find(
    (opt) => opt.type === "date_range_picker"
  );
  if (
    !datePickerConfig ||
    !dateRange?.fiscalInfoStartDate ||
    !dateRange?.fiscalInfoEndDate
  ) {
    return null;
  }

  const start_date =
    dateRange.fiscalInfoStartDate?.actualSelectedDate ||
    dateRange.fiscalInfoStartDate?.calendar_week_start_date;
  const end_date =
    dateRange.fiscalInfoEndDate?.actualSelectedDate ||
    dateRange.fiscalInfoEndDate?.calendar_week_start_date;

  if (!start_date || !end_date) {
    return null;
  }

  return {
    attribute_name:
      datePickerConfig.filter_key || "first_projected_delivery_date",
    start_date,
    end_date,
  };
};

/**
 * Merge alert table top-right filters into a request payload.
 * Same shape as OrderAlertActionTable.buildRequestBody (filter_key at payload root).
 */
export const applyAlertTopRightFiltersToPayload = (
  payload,
  alertTopRightOptions = [],
  topRightFiltersState = {}
) => {
  if (!alertTopRightOptions?.length) return payload;

  const next = { ...payload };

  if (
    topRightFiltersState?.dateRange?.fiscalInfoStartDate &&
    topRightFiltersState?.dateRange?.fiscalInfoEndDate
  ) {
    const dateFilterKey =
      alertTopRightOptions.find((opt) => opt.type === "date_range_picker")
        ?.filter_key || "first_projected_delivery_date";
    next[dateFilterKey] = {
      start_date:
        topRightFiltersState.dateRange.fiscalInfoStartDate
          ?.actualSelectedDate ||
        topRightFiltersState.dateRange.fiscalInfoStartDate
          ?.calendar_week_start_date,
      end_date:
        topRightFiltersState.dateRange.fiscalInfoEndDate?.actualSelectedDate ||
        topRightFiltersState.dateRange.fiscalInfoEndDate
          ?.calendar_week_start_date,
    };
  }

  const dropdownConfig = alertTopRightOptions.find(
    (opt) => opt.type === "dropdown"
  );
  if (dropdownConfig) {
    const dropdownFilterKey = dropdownConfig.filter_key || "view_rows";
    const dropdownValue = getAlertTableDropdownValue(
      dropdownConfig,
      topRightFiltersState
    );
    if (dropdownValue) {
      next[dropdownFilterKey] = dropdownValue;
    }
  }

  return next;
};

/** Normalize impact-ui Select output to `{ label, value }`. */
export const normalizeAlertTableDropdownSelection = (
  selected,
  options = []
) => {
  if (selected == null) return null;

  const toOption = (value, label) => {
    if (value == null || value === "") return null;
    const match = options.find((opt) => opt.value === value);
    return match
      ? { label: match.label, value: match.value }
      : { label: label ?? String(value), value };
  };

  if (Array.isArray(selected)) {
    const item = selected[0];
    if (item == null) return null;
    if (typeof item === "string") return toOption(item);
    if (typeof item === "object") {
      return toOption(item.value ?? item.id, item.label);
    }
    return null;
  }

  if (typeof selected === "string") {
    return toOption(selected);
  }

  if (typeof selected === "object") {
    return toOption(selected.value ?? selected.id, selected.label);
  }

  return null;
};

/** Resolve selected view-rows value from filter state (matches OrderAlertActionTable). */
export const getAlertTableDropdownValue = (dropdownConfig, dropdownState) => {
  if (!dropdownConfig) return null;
  const selection = dropdownState?.dropdown;

  if (selection == null) {
    return dropdownConfig.default_value || null;
  }

  if (typeof selection === "string") {
    return selection;
  }

  if (Array.isArray(selection)) {
    const item = selection[0];
    if (item == null) return dropdownConfig.default_value || null;
    if (typeof item === "string") return item;
    if (typeof item === "object") {
      const value = item.value ?? item.id;
      if (value != null) return value;
    }
  } else if (typeof selection === "object") {
    const value = selection.value ?? selection.id;
    if (value != null) return value;
  }

  return dropdownConfig.default_value || null;
};

const applyAlertDateRangeToExpediteDateFilter = (
  dateFilter,
  alertTopRightOptions,
  dateRange
) => {
  const alertDateRange = getAlertTableDateRangePayload(
    alertTopRightOptions,
    dateRange
  );
  if (!alertDateRange) {
    return dateFilter;
  }

  const next = dateFilter.map((entry) => ({ ...entry }));
  const upsertDateRange = (attributeName) => {
    const idx = next.findIndex(
      (entry) => entry.attribute_name === attributeName
    );
    const payload = {
      attribute_name: attributeName,
      start_date: alertDateRange.start_date,
      end_date: alertDateRange.end_date,
    };
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...payload };
    } else {
      next.push(payload);
    }
  };

  upsertDateRange(alertDateRange.attribute_name);
  // Expedite chart/session APIs scope timeline via order_placement_recom_date.
  if (alertDateRange.attribute_name !== "order_placement_recom_date") {
    upsertDateRange("order_placement_recom_date");
  }

  return next;
};

/** Style-color value for an expedite alerts row (Style-Color column / article). */
export const getExpediteRowStyleColorValue = (row) => {
  if (!row || typeof row !== "object") return null;

  const styleColor =
    row.style_color ?? row.styleColor ?? row.article ?? row.style;
  if (styleColor == null || styleColor === "") return null;

  return String(styleColor);
};

/** Style-color label for an expedite alerts row (Style-Color column / article). */
export const getExpediteRowStyleColorLabel = (row) => {
  const styleColor = getExpediteRowStyleColorValue(row);
  if (!styleColor) return null;

  const description =
    row.style_color_description ??
    row.style_color_desc ??
    row.styleColorDescription ??
    row.article_description ??
    row.article_desc;

  if (description) {
    return `${styleColor} - ${description}`;
  }

  return styleColor;
};

/** Build expedite deep-dive chart request scoped to a single alert row. */
export const buildExpediteRecoveryWindowChartRequest = (
  row,
  selectedFilters = [],
  alertTopRightOptions = [],
  dateRange = {}
) => {
  const article = row?.article;
  if (!article) return null;

  const choiceDcCombinations = [article];
  const filters = [];
  selectedFilters.forEach((filter) => {
    const dim = filter.dimension?.toLowerCase() || "";
    if ((dim === "product" || dim === "dc") && filter?.values?.length > 0) {
      filters.push(cloneDeep(filter));
    }
  });

  const date_filter = applyAlertDateRangeToExpediteDateFilter(
    [
      {
        attribute_name: "order_placement_recom_date",
        start_date: null,
        end_date: null,
      },
      { attribute_name: "not_before_date", start_date: null, end_date: null },
    ],
    alertTopRightOptions,
    dateRange
  );

  return {
    filters: overrideExpediteArticleFilter(filters, choiceDcCombinations),
    date_filter,
    transform_flag: true,
    data: choiceDcCombinations,
  };
};

/** Expedite alert rows use current date for Approval Flow pre-selection. */
export const getExpediteAlertOrderPlacementDateRange = () => {
  const currentDate = moment().format(TENANT_DATE_FORMAT);
  return { start_date: currentDate, end_date: currentDate };
};

/** Extract and store order placement dates from selected alert rows for Product Details navigation. */
export const storeOrderPlacementDatesFromAlertRows = (selectedRows) => {
  if (!Array.isArray(selectedRows) || selectedRows.length === 0) {
    return null;
  }

  const dates = selectedRows
    .map((row) => row?.order_placement_date || row?.order_placement_recom_date)
    .filter(Boolean)
    .map((date) =>
      moment(date, TENANT_DATE_FORMAT, true).isValid() ? date : null
    )
    .filter(Boolean);

  if (dates.length === 0) {
    return null;
  }

  const sortedDates = dates.sort((a, b) => moment(a).diff(moment(b)));
  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];

  const dateRange = {
    column: "order_placement_date",
    min_val: minDate,
    max_val: maxDate,
    search_type: "inRange",
    type: "date",
  };

  return dateRange;
};

/** Persist dashboard filters for Approval Flow (same key as alerts action table). */
export const setExpediteApprovalFlowFiltersInStorage = (alertPayload) => {
  const filters = alertPayload?.dashboardFilters ?? alertPayload?.filters ?? [];
  localStorage.setItem("approvalFlowFilters", JSON.stringify(filters));
};

export const buildExpediteApprovalFlowRows = (
  articles,
  columnName = "article"
) => {
  return (Array.isArray(articles) ? articles : []).map((article) => {
    const row = { id: article, article };
    if (columnName && columnName !== "article") {
      row[columnName] = article;
    }
    return row;
  });
};

//Stores the week dates
export const storeWeekDates = () => {
  const startDate = moment().startOf("week").format(TENANT_DATE_FORMAT);
  const endDate = moment().endOf("week").day(14).format(TENANT_DATE_FORMAT);
  localStorage.setItem("startDate", JSON.stringify(startDate));
  localStorage.setItem("endDate", JSON.stringify(endDate));
};

/** Normalize alert table top-right filter config from tenant config. */
export const normalizeAlertTopRightOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) return [];
  return options
    .filter((option) => option?.is_enabled !== false)
    .map((option) => ({
      ...option,
      type: option.type || option.option_type,
      filter_key: option.filter_key || option.filterKey,
    }));
};

/**
 * Top-right filters for expedite orders step-1 alerts table.
 * Tenant config: `oms_offcycle_expedite_order_config` → `expedite_orders.topRightOptions`.
 */
export const getExpediteAlertsTopRightOptionsFromConfig = (
  expediteOrdersConfig
) => {
  return normalizeAlertTopRightOptions(
    expediteOrdersConfig?.expedite_orders?.topRightOptions ??
      expediteOrdersConfig?.expedite_orders?.top_right_options
  );
};

/**
 * Store the minimal expedite alert payload in localStorage for session bootstrap.
 * Extracts only choice combinations from parent rows (not child rows).
 * @param {Array} allowedArticles - Allowed articles to be processed.
 * @param {Array} filters - Applied dashboard filters.
 * @param {Object} dashboardFilters - Raw selectedFilters from the dashboard.
 */
export const storeExpediteAlertPayload = (
  allowedArticles,
  filters,
  dashboardFilters
) => {
  // Build choiceDcCombinations from allowedArticles.
  const choiceDcCombinations = allowedArticles;

  const dateFilter = [
    {
      attribute_name: "order_placement_recom_date",
      start_date: null,
      end_date: null,
    },
    { attribute_name: "not_before_date", start_date: null, end_date: null },
  ];

  const payload = {
    choiceDcCombinations,
    filters: filters || [],
    dateFilter,
    dashboardFilters: dashboardFilters || null,
  };

  localStorage.setItem(EXPEDITE_LS_KEYS.ALERT_PAYLOAD, JSON.stringify(payload));
};

/**
 * Store article+loc_code combinations for the expedite off-cycle bottom sheet.
 * Kept separate from ALERT_PAYLOAD (article-only) so deep-dive session bootstrap is unchanged.
 * @param {Array} rows - Selected alert rows from the action table.
 * @param {Array} filters - Applied dashboard filters.
 * @param {Object} dashboardFilters - Raw selectedFilters from the dashboard.
 */
export const storeExpediteOffCycleArticleLocPayload = (
  rows,
  filters,
  dashboardFilters
) => {
  const seen = new Set();
  const orders = [];

  (rows || []).forEach((row) => {
    const article = row?.article;
    const loc_code = row?.loc_code || row?.linked_store_code;
    if (!article || !loc_code) return;

    const key = `${article}|${loc_code}`;
    if (seen.has(key)) return;
    seen.add(key);
    orders.push({ article, loc_code });
  });

  const payload = {
    orders,
    is_expedite: true,
    filters: filters || [],
    dashboardFilters: dashboardFilters || null,
  };

  localStorage.setItem(
    EXPEDITE_LS_KEYS.OFF_CYCLE_ARTICLE_LOC_PAYLOAD,
    JSON.stringify(payload)
  );
};

export const PO_REBALANCE_MAX_START_WEEK_SPREAD = 8;

const START_WEEK_DATE_FORMATS = [
  "YYYY-MM-DD",
  "MM-DD-YYYY",
  "DD-MM-YYYY",
  "YYYY/MM/DD",
  moment.ISO_8601,
];

const normalizeFiscalYearWeekId = (value) => {
  if (value == null || value === "") return null;
  const str = String(value).trim();
  if (!/^\d{5,6}$/.test(str)) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
};

const parseStartWeekMoment = (value) => {
  if (value == null || value === "") return null;
  if (moment.isMoment(value)) return value.clone().startOf("day");
  if (value instanceof Date) return moment(value).startOf("day");

  const str = String(value).trim();
  if (!str) return null;

  for (const format of START_WEEK_DATE_FORMATS) {
    const parsed = moment(str, format, true);
    if (parsed.isValid()) {
      return parsed.startOf("day");
    }
  }

  const looseParsed = moment(str);
  return looseParsed.isValid() ? looseParsed.startOf("day") : null;
};

const getFiscalWeekRangeStart = (week) =>
  week?.fiscal_week_begin_date ??
  week?.calendar_week_start_date ??
  week?.week_start_date ??
  null;

const getFiscalWeekRangeEnd = (week) =>
  week?.fiscal_week_end_date ??
  week?.calendar_week_end_date ??
  week?.week_end_date ??
  null;

const getStartWeekCalendarIndex = (startWeekValue, fiscalCalendarDetails) => {
  if (
    !fiscalCalendarDetails?.length ||
    startWeekValue == null ||
    startWeekValue === ""
  ) {
    return -1;
  }

  const fiscalWeekId = normalizeFiscalYearWeekId(startWeekValue);
  if (fiscalWeekId != null) {
    const fiscalWeekIndex = fiscalCalendarDetails.findIndex(
      (week) => Number(week.fiscal_year_week) === fiscalWeekId
    );
    if (fiscalWeekIndex >= 0) return fiscalWeekIndex;
  }

  const startWeekDate = parseStartWeekMoment(startWeekValue);
  if (!startWeekDate) return -1;

  return fiscalCalendarDetails.findIndex((week) => {
    const rangeStart = getFiscalWeekRangeStart(week);
    const rangeEnd = getFiscalWeekRangeEnd(week);

    if (rangeStart && rangeEnd) {
      return (
        startWeekDate.isSameOrAfter(moment(rangeStart), "day") &&
        startWeekDate.isSameOrBefore(moment(rangeEnd), "day")
      );
    }

    if (rangeStart) {
      return startWeekDate.isSame(moment(rangeStart), "day");
    }

    return false;
  });
};

const getInclusiveCalendarWeekSpreadFromDates = (startWeekValues) => {
  const parsedDates = startWeekValues.map(parseStartWeekMoment).filter(Boolean);

  if (parsedDates.length <= 1) return 0;

  const minDate = moment.min(parsedDates);
  const maxDate = moment.max(parsedDates);
  return Math.floor(maxDate.diff(minDate, "days") / 7) + 1;
};

export const getStartWeekFromAlertRow = (row) =>
  row?.start_week ?? row?.start_week_id ?? row?.start_week_date ?? null;

/** Inclusive fiscal-week span between earliest and latest start_week values. */
export const getPoRebalanceStartWeekSpread = (
  selectedRows,
  fiscalCalendarDetails
) => {
  if (!Array.isArray(selectedRows) || selectedRows.length <= 1) return 0;

  const startWeeks = selectedRows
    .map(getStartWeekFromAlertRow)
    .filter((week) => week != null && week !== "");

  if (startWeeks.length <= 1) return 0;

  const weekIndices = startWeeks
    .map((week) => getStartWeekCalendarIndex(week, fiscalCalendarDetails))
    .filter((index) => index >= 0);

  if (weekIndices.length >= 2) {
    const minIndex = Math.min(...weekIndices);
    const maxIndex = Math.max(...weekIndices);
    return maxIndex - minIndex + 1;
  }

  return getInclusiveCalendarWeekSpreadFromDates(startWeeks);
};

export const isPoRebalanceStartWeekSpreadExceeded = (
  selectedRows,
  fiscalCalendarDetails,
  maxWeekSpread = PO_REBALANCE_MAX_START_WEEK_SPREAD
) =>
  getPoRebalanceStartWeekSpread(selectedRows, fiscalCalendarDetails) >
  maxWeekSpread;

export const storePoRebalanceAlertPayload = (
  selectedRows,
  filters,
  dashboardFilters
) => {
  const rows = Array.isArray(selectedRows) ? selectedRows : [];
  const selectedChoiceKeys = [
    ...new Set(
      rows
        .map(
          (row) =>
            row?.choice ?? row?.choice_id ?? row?.choice_code ?? row?.article
        )
        .filter(Boolean)
    ),
  ];

  const payload = {
    selectedRows: rows,
    selectedChoiceKeys,
    filters: filters || [],
    dashboardFilters: dashboardFilters || [],
  };

  localStorage.setItem("omsPoRebalanceAlertPayload", JSON.stringify(payload));
};

//Handles the deep dive redirection
export const handleDeepDiveRedirect = async (
  redirect,
  filters,
  selectedRows,
  props,
  returnPayload = false
) => {
  const selectedStyles = selectedRows.map(
    (row) => row?.[props?.redirectionLevel]
  );

  const payload = cloneDeep(OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD);
  const dcFilter = (props?.selectedFilters || []).find(
    (f) => (f.dimension || "").toLowerCase() === "dc"
  );
  const filtersBase = filters || [];
  payload.selectedFilters = dcFilter?.values?.length
    ? [
        ...filtersBase.filter(
          (f) => (f.dimension || "").toLowerCase() !== "dc"
        ),
        dcFilter,
      ]
    : filtersBase;
  payload.selectedRowIds = selectedStyles;
  payload.tabSelected =
    redirect === REDIRECT_TO_STYLE_ORDER_SUMMARY
      ? "style_order_summary"
      : "deep_dive";

  storeDashboardDcSelectionForOrderManagementRedirect(
    props?.orderingDashboardSelectedDcs,
    props?.selectedFilters
  );

  localStorage.setItem("omsRedirectionDetails", JSON.stringify(payload));
  localStorage.setItem(
    "omsDashboardSelectedFilters",
    JSON.stringify(props?.selectedFilters)
  );

  if (returnPayload) {
    return;
  }

  openInNewTab(
    props?.isCalledFromVendorStore
      ? ORDER_MANAGEMENT_ORDER_DETAILS
      : ORDER_MANAGEMENT_PRODUCT_DETAILS
  );
};
