import { ORDER_MANAGEMENT_TAB_LIST } from "modules/oms/constants-oms/stringConstants.js";

/** Default for tenants without week tabs in screen config (AC-9). */
export const OMS_MATRIX_MONTH_ONLY_TAB_LIST = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
];

const HLS_TO_OM_TAB_VALUE = {
  month: "1m",
  three_months: "3m",
  six_months: "6m",
  week: "1w",
  three_weeks: "3w",
  six_weeks: "6w",
};

const WEEK_COUNT_BY_TAB = {
  "1w": 1,
  week: 1,
  "3w": 3,
  three_weeks: 3,
  "6w": 6,
  six_weeks: 6,
};

export function normalizeOmTabValue(value) {
  if (value == null || value === "") return value;
  return HLS_TO_OM_TAB_VALUE[value] || value;
}

export function normalizeDatepickerDisablingValues(values) {
  return (values || []).map((entry) => normalizeOmTabValue(entry));
}

function inferWeekCount(tabValue) {
  return WEEK_COUNT_BY_TAB[tabValue] ?? null;
}

export function resolveOrderManagementTabList(screenConfig) {
  const raw =
    screenConfig?.tab_list ?? screenConfig?.month_week_tab_list ?? null;
  if (!Array.isArray(raw) || raw.length === 0) {
    return OMS_MATRIX_MONTH_ONLY_TAB_LIST;
  }
  return raw.map((tab) => {
    const value = normalizeOmTabValue(tab?.value);
    return {
      ...tab,
      value,
      week_count: tab?.week_count ?? inferWeekCount(value),
    };
  });
}

export function resolveDefaultMonthTab(screenConfig, tabList) {
  const configured = normalizeOmTabValue(screenConfig?.default_tab_value);
  if (
    configured &&
    (tabList || []).some((tab) => tab?.value === configured)
  ) {
    return configured;
  }
  return tabList?.[0]?.value ?? "1m";
}

/**
 * Merge matrix_summary + high_level_summary toolbar keys.
 * Week tabs/date picker come from config (AC-9/10); placement/receipt toggle stays always on (AC-1).
 */
export function mergeOrderManagementToolbarScreenConfig(
  matrixSummaryConfig = {},
  highLevelSummaryConfig = {}
) {
  const placementDisabling =
    matrixSummaryConfig.placement_datepicker_disabling_values ??
    highLevelSummaryConfig.placement_datepicker_disabling_values ?? [
      "1m",
      "3m",
      "6m",
    ];
  const receiptDisabling =
    matrixSummaryConfig.receipt_datepicker_disabling_values ??
    highLevelSummaryConfig.receipt_datepicker_disabling_values ??
    [];

  return {
    ...highLevelSummaryConfig,
    ...matrixSummaryConfig,
    tab_list:
      matrixSummaryConfig.tab_list ??
      highLevelSummaryConfig.tab_list ??
      highLevelSummaryConfig.month_week_tab_list,
    default_tab_value:
      matrixSummaryConfig.default_tab_value ??
      highLevelSummaryConfig.default_tab_value,
    show_week_date_range:
      matrixSummaryConfig.show_week_date_range ??
      highLevelSummaryConfig.show_week_date_range ??
      false,
    placement_datepicker_disabling_values:
      normalizeDatepickerDisablingValues(placementDisabling),
    receipt_datepicker_disabling_values:
      normalizeDatepickerDisablingValues(receiptDisabling),
    order_placement_weeks_limit:
      matrixSummaryConfig.order_placement_weeks_limit ??
      highLevelSummaryConfig.order_placement_weeks_limit ??
      26,
    roq_date_options:
      matrixSummaryConfig.roq_date_options ??
      highLevelSummaryConfig.roq_date_options,
  };
}

/** Lovisa/GA-style full tab superset when config explicitly enables week range. */
export function resolveOrderManagementTabListWithFallback(screenConfig) {
  const resolved = resolveOrderManagementTabList(screenConfig);
  if (resolved !== OMS_MATRIX_MONTH_ONLY_TAB_LIST) {
    return resolved;
  }
  if (screenConfig?.show_week_date_range) {
    return ORDER_MANAGEMENT_TAB_LIST;
  }
  return resolved;
}
