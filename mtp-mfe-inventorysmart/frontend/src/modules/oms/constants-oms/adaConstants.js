//api constants

// Dashboard API URLs
export const ADA_DASHBOARD_TABLE_DATA = "/";
export const ADA_DASHBOARD_CHART_DATA = "/ada-visual/graph/forecast";
export const ADA_DASHBOARD_PRODUCT_DATA =
  "/ada-visual/timeline/graph-sku-dropdown";

export const ADA_DASHBOARD_FILTER_CONFIG = "ada-visual";
export const ADA_DASHBOARD_FISCAL_WEEKS = "/ada-visual/timeline/date-range";
export const ADA_DASHBOARD_HISTORICAL_WEEKS =
  "/ada-visual/timeline/historical-snapshot-weeks-dynamic-dropdown";
export const ADA_DASHBOARD_TENANT_FILTERS = "/ada-visual/graph/tenant-filters";
export const ADA_DASHBOARD_COMPARE_FISCAL_WEEKS =
  "/ada-visual/timeline/comparison-data";
export const ADA_DASHBOARD_GET_FISCAL_CALENDAR =
  "/ada-visual/timeline/cal-to-fiscal";
export const ADA_DASHBOARD_GET_FISCAL_WEEKS_MONTH =
  "/ada-visual/timeline/fsweeks-fsmonths";

export const ADA_DASHBOARD_GET_DRIVER_FORECAST_DATA =
  "/ada-visual/table/drivers-forecast";

export const ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_DATA =
  "/ada-visual/table/drivers-significance";

export const ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_RANK_DATA =
  "/ada-visual/table/drivers-significance-new";

export const ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_CHANNEL_DETAIL_TABLE_DATA =
  "/ada-visual/table/drivers-significance-channel-level";

export const ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_AGG_LEVEL_DATA =
  "/ada-visual/table/drivers-significance-agg-level";

export const ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_RANK_DATA_NEW =
  "/ada-visual/table/drivers-significance-rank";

export const ADA_DASHBOARD_COLUMNS = "/ada-visual/table/table-columns";
export const ADA_DASHBOARD_GET_FORECAST_MULTIPLIER_DATA =
  "/ada-visual/table/forecast-multiplier";

export const get_status_check_for_user_level_update =
  "/ada-visual/table/status-check-for-user-level-updates";

export const ADA_DASHBOARD_AGGREGATION_LEVEL_DATA =
  "/ada-visual/table/aggregation-level-forecast";

export const ADA_SAVE_DETAILED_FORECAST =
  "ada-visual/table/update-detail-level-forecast";
export const ADA_SAVE_DRIVER_FORECAST =
  "ada-visual/table/update-drivers-forecast";
export const ADA_SAVE_MULTIPLIER =
  "ada-visual/table/update-forecast-multiplier";
export const ADA_HISTORIC_YEARS = "ada-visual/timeline/last-years-dropdown";
export const DOWNLOAD_ADA_FORECAST_REPORT =
  "ada-visual/table/download-detail-level-forecast-cloud";

export const ADA_CLIENT_CONFIG =
  "/core/tenant-config/11?attribute_name=ada_visual_detail_config";

// Forecast related ada config details
export const FORECASTSMART_ADA_CLIENT_CONFIG =
  "/core/tenant-config/11?attribute_name=ada_visual_detail_forecastsmart_config";

export const ADA_USER_CONFIG =
  "/master/user-management/module-hierarchy?app=ADA&module=Ada%20Visual%20Screen";

export const ADA_GET_FORECAST_AXIS_DATA =
  "/ada-visual/timeline/fiscal-ids-graph-xaxis";

export const ADA_GET_GRAPH_KPI_DATA = "ada-visual/graph/kpis";

export const ADA_UPLOAD_DRIVERS_FORECAST_BULK_DATA = "ada-visual/upload";

//MFP
export const ADA_DEMAND_SELECTION_TABLE_DATA = "ada-visual/table/mfp-data";
export const ADA_DEMAND_SELECTION_UPDATE_MFP_DATA =
  "ada-visual/update/mfp-data";

export const FILTERED_PRODUCT_STORE_CODE =
  "ada-visual/get-filtered-product-store-codes";

export const COMPARE_WITH_CONSTANTS = [
  { value: "Historic Actuals", label: "Historic Actuals", disabled: false },
  { value: "Plan", label: "Plan", disabled: true },
  { value: "Similar styles", label: "Similar styles", disabled: true },
];

export const EXPECTED_ADA_FILTER_DIMENSIONS = {
  product_store: { order: 1, label: "product_store" },
  product: { order: 2, label: "product" },
  store: { order: 3, label: "store" },
};

export const LEVEL_0 = "l0";
export const LEVEL_1 = "l1";
export const LEVEL_2 = "l2";

export const FISCAL_KEY_MAPPING = {
  W: "fiscal_year_week",
  M: "fiscal_year_month",
  Q: "fiscal_year_quarter",
};

export const KEYS_USED_OTHER_THAN_FISCAL_WEEK = [
  "is_selected",
  "isEdited",
  "last_updated_data",
  "row",
  "total_rows",
  "s3_name",
  "store_code",
  "l6_name",
  "l6_id",
];
