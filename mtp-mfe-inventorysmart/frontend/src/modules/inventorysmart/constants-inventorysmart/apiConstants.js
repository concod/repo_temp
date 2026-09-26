import { TENANT_ENV } from "config/api";

export const DASHBOARD_FILTER_CONFIG =
  "core/filter-configuration/screen/InventoryDashboard";
export const VIEWPLANS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_plans_table";
export const STORE_INVENTORY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_details_store_table";
export const STORE_INVENTORY_ALERTS_TABLE_CONFIG =
  "core/table-fields?table_name=store_inventory_forecast";
export const FETCH_TABLE_CONFIG = "core/table-fields?table_name=";
export const ARTICLE_INVENTORY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_details_table";
export const VIEWPLANS_TABLE_DATA = "inventory-smart/plan/search";
// View Plans - Store to Store (S2S)
export const STORE_TRANSFER_VIEWPLANS_TABLE_CONFIG =
  "core/table-fields?table_name=store_transfer_allocation_plans";
export const STORE_TRANSFER_VIEWPLANS_TABLE_DATA =
  "inventory-smart/plan/store-allocation-plans";
export const STORE_TRANSFER_VIEWPLANS_TABLE_DELETE =
  "inventory-smart/store-transfer/allocation-plans/delete";
export const DATA_REFRESH_DATE_DETAILS =
  "inventory-smart/dashboard/refresh-date";
export const FETCH_DC_TRANSFER_RECOMMENDATION =
  "/inventory-smart/transfer-recommendation/article-level";
export const FETCH_DC_TRANSFER_SIZE_LEVEL =
  "/inventory-smart/transfer-recommendation/size-level";
export const UPDATE_DC_TRANSFER_STATUS =
  "/inventory-smart/transfer-recommendation/status/update";
export const EDIT_DC_TRANSFER_SIZE_LEVEL =
  "/inventory-smart/transfer-recommendation/edit-article-size";
export const PLAN_SUMMARY = "/inventory-smart/plan/summary";

// Create Allocation
export const CREATE_PLANS_FILTER_CONFIG =
  "core/filter-configuration/screen/Allocation";
export const GET_ALLOCATE = "inventory-smart/strategy/get-strategy-data";
export const CREATE_SCENARIO =
  "inventory-smart/simulation/check-create-scenario";
export const GET_SCENARIO_INPUTS =
  "inventory-smart/simulation/get-scenario-inputs";
export const GET_STOREGROUP_OPTIONS =
  "inventory-smart/strategy/get-store-groups";
export const GET_COLUMN = "core/table-fields?";
export const GET_APS_WOS = "inventory-smart/strategy/plan/get-aps-wos";
export const GET_STOREGROUP_STORE_MAP =
  "inventory-smart/strategy/plan/get-storegroup-store-map";
export const GET_STOREGROUP_STORE_MAP_DATA =
  "/inventory-smart/strategy/plan/fetch-eligible-stores-for-article";
export const GET_SETALL_DCS = "inventory-smart/strategy/get-setall-defaults";

export const GET_STORES =
  "inventory-smart/strategy/simulation/strategy-constraints";
export const GET_DCS = "inventory-smart/strategy/simulation/dc-level-metrics";
export const CREATE_ALLOCATION_API =
  "inventory-smart/simulation/create-allocation";
export const SAVE_PALN_FOR_DRAFT = "inventory-smart/strategy/draft/create";
export const GET_OH_STORE_SIZE =
  "inventory-smart/simulation/oh-size-distribution";
export const SAVE_DRAFT = "inventory-smart/strategy/draft";
export const UPDATE_RES_QTY = "inventory-smart/simulation/update-reserve-qty";
export const WARMUP_ALLOCATION = "inventory-smart/simulation/warmup";

export const STORE_INVENTORY_TABLE_DATA =
  "inventory-smart/dashboard/get-store-inventory";
export const STORE_DETAILS_AT_SIZES =
  "inventory-smart/dashboard/article-store-and-size-level";
export const STORE_INVENTORY_ALERTS_TABLE_DATA =
  "inventory-smart/dashboard/alerts/";
export const FORECAST_ALERTS_TABLE_DATA =
  "inventory-smart/dashboard/alerts/forecast";
export const FORECAST_ALERTS_AVAILABLE_CHANNELS =
  "inventory-smart/dashboard/alerts/forecast/available-channels";
export const ARTICLE_INVENTORY_TABLE_DATA =
  "inventory-smart/dashboard/get-article-inventory";
export const GET_INVENTORY_DETAILS =
  "inventory-smart/dashboard/get-inventory-details";
export const DELETE_PLANS = "inventory-smart/plan/delete";
export const INVENTORY_DASHBOARD_KPI_DATA = "/core/kpi-data";
export const INVENTORY_DASHBOARD_FORECAST_KPI_DATA =
  "inventory-smart/dashboard/kpi/forecast";
export const INVENTORY_DASHBOARD_STORE_INVENTORY_KPI_DATA =
  "inventory-smart/kpi/";
export const INVENTORY_DASHBOARD_FORECAST_KPI_DRILLDOWN =
  "inventory-smart/kpi/forecast-kpi/drilldown";

export const INVENTORY_DASHBOARD_ALERTS_REVIEW =
  "inventory-smart/dashboard/alerts/view";
export const FETCH_INVENTORY_DASHBOARD_ALERTS_STORE_CODES =
  "inventory-smart/dashboard/alerts/constraints";
export const DELETE_AUTO_ALLOCATION_ARTICLES =
  "inventory-smart/dashboard/alerts/auto-allocation";
export const SET_REVIEWED_ALERTS = "inventory-smart/dashboard/alert-review-proceed";
export const ALERT_REVIEW = "inventory-smart/dashboard/alert-review";
export const CHECK_INGESTION_STATUS = "inventory-smart/dashboard/check-ingestion-status";
export const RE_CREATE_ALLOCATION_API =
  "inventory-smart/simulation/retrigger-allocation";
export const SAVE_APPLIED_FILTERS =
  "inventory-smart/dashboard/save_dashboard_redirect_filters";
export const GET_APPLIED_FILTERS_DASHBOARD =
  "inventory-smart/dashboard/get_dashboard_redirect_filters";
export const RENAME_PALNS_BY_LEVELS =
  "inventory-smart/dashboard/rename-plans-by-level";
export const DOWNLOAD_INVENTORY_DETAILS =
  "inventory-smart/dashboard/get-article-inventory/download";
export const MOVE_TO_ORDER_BATCHING = "inventory-smart/plan/finalize/bulk";
// PRODUCT PROFILE SCREEN API'S
export const GET_IA_RECOMMENDED_TABLE_DATA =
  "inventory-smart/product-profile/ia";
export const GET_USER_CREATED_TABLE_DATA =
  "inventory-smart/product-profile/user";
export const GET_STORE_SIZE_CONTRIBUTION_DATA =
  "inventory-smart/product-profile/contribution/store-size/";
export const GET_STYLE_COLOR_DESCRIPTION_DATA =
  "inventory-smart/product-profile/contribution/style-color";
export const DELETE_USER_PRODUCT_PROFILE = "inventory-smart/product-profile";
// CREATE PRODUCT PROFILE SCREEN API'S
export const GET_PRODUCTS_TO_SELECT =
  "inventory-smart/product-profile/style-color";
export const GET_PRODUCTS_STORE_SIZE_PENETRATION =
  "inventory-smart/product-profile/store-size";
export const SAVE_NEW_PRODUCT_PROFILE = "inventory-smart/product-profile";
export const GET_STORE_BAND_CONTRIBUTION_DATA =
  "inventory-smart/product-profile/contribution/store-size-aggregated";
export const UPDATE_STORE_CONTRIBUTION_DATA =
  "inventory-smart/product-profile/contribution/store-size-edit/";
export const CLEAR_NOTIFICATION = "/notifications/event-id/delete";
export const UPDATE_SET_ALL_STORE_CONTRIBUTION =
  "inventory-smart/product-profile/contribution/store-size-edit/set-all";
export const UPDATE_IA_STORE_CONTRIBUTION =
  "inventory-smart/product-profile/contribution/save-ia-edit";
export const FETCH_IA_EDITS_SAVED_DATA =
  "inventory-smart/product-profile/ia-edited";

// Product Rules
export const PRODUCT_RULE_DASHBOARD_FILTER_CONFIG =
  "core/filter-configuration/screen/inventorysmart_product_rules";
export const PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG = "core/table-fields";
export const PRODUCT_RULE_DASHBOARD_TABLE_ROW_DATA =
  "inventory-smart/product-rule/search";
export const PRODUCT_RULE_POP_UP_TABLE_ROW_DATA =
  "/inventory-smart/product-rule/mapping-details";
export const PRODUCT_RULE_Store_Group_TABLE_ROW_DATA =
  "/inventory-smart/product-rule/list-store-groups";
export const PRODUCT_RULE_DC_Mapped_TABLE_ROW_DATA =
  "/inventory-smart/product-rule/list-dc";

export const SAVE_PRODUCT_RULE_POP_UP_TABLE_ROW_DATA =
  "inventory-smart/product-rule/update-mapping-selection";
export const SAVE_PRODUCT_RULE_SET_ALL_TABLE_ROW_DATA =
  "/inventory-smart/product-rule/set-all";

// Constraints
export const GET_STORE_LEVEL_TABLE_DATA =
  "/inventory-smart/constraints/store-search";
export const POST_STORE_LEVEL_TABLE_DATA =
  "/inventory-smart/constraints/single-update";
export const GET_STORE_GRADE_LEVEL_TABLE_DATA =
  "/inventory-smart/constraints/store-grade-search";
export const GET_STORE_GROUP_LEVEL_TABLE_DATA =
  "/inventory-smart/constraints/store-group-search";
export const GET_STORE_MODAL_TABLE_DATA =
  "/inventory-smart/constraints/mapping-details";
export const SET_ALL_TABLE_DATA =
  "/inventory-smart/constraints/filter-store-update";
export const GET_STORE_GROUP_AGGREGATE =
  "/inventory-smart/constraints/store-group-aggregate";
export const GET_STORE_GRADE_AGGREGATE =
  "/inventory-smart/constraints/store-grade-aggregate";
export const USER_RESERVE_INV_LIST =
  "/inventory-smart/inventory-hold/user-reserve-and-instock-list";
export const USER_RESERVE_INV_UPDATE =
  "/inventory-smart/inventory-hold/user-reserve-update";
export const USER_RESERVE_SET_ALL_UPDATE =
  "/inventory-smart/inventory-hold/user-reserve-update-setall";
export const SMA_VIEW_TABLE = "/inventory-smart/sma/view";
export const SMA_TABLE_ROW_UPDATE = "/inventory-smart/sma/update";
export const SMA_TABLE_SET_ALL_UPDATE = "/inventory-smart/sma/update-setall";
export const SAVE_RULE_NAME = "/inventory-smart/constraint/rule/set-rule-name";
export const STORE_USER_RESERVE_INV_LIST =
  "/inventory-smart/inventory-hold/store-reserve";
export const DC_USER_RESERVE_INV_LIST =
  "/inventory-smart/inventory-hold/user-reserve-and-instock-list";
export const DOWNLOAD_STORE_CONSTRAINSTS =
  "/inventory-smart/constraint/rule/list/download";
export const GET_DISTRIBUTION_STRATEGY =
  "inventory-smart/constraint/distribution-strategy/min";
export const GET_STYLE_DISTRIBUTION_STRATEGY =
  "inventory-smart/constraint/distribution-strategy/min/style";
export const CALCULATE_STYLE_PREVIEW =
  "inventory-smart/constraint/distribution-strategy/min/calculate-style-preview";
export const GET_SIZE_DISTRIBUTION_STRATEGY =
  "inventory-smart/constraint/distribution-strategy/min/size";
export const RCL_CONSTRAINT_SIZES =
  "/inventory-smart/constraint/rcl/sizes";
export const CALCULATE_SIZE_PREVIEW =
  "inventory-smart/constraint/distribution-strategy/min/calculate-size-preview";
export const CALCULATE_SIZE_DISTRIBUTION =
  "inventory-smart/constraint/distribution-strategy/calculate-min-value";
// Finalize
export const GET_PRODUCT_VIEW_SUMMARY =
  "/inventory-smart/finalize/finalize-product-view-summary";
export const GET_STORE_VIEW_SUMMARY =
  "/inventory-smart/finalize/finalize-store-view-summary";
export const GET_PRODUCT_VIEWS =
  "/inventory-smart/finalize/finalize-product-view-data";
export const DOWNLOAD_SELECTED_PRODUCT_STORE_DETAILS =
  "/inventory-smart/finalize/finalize-selected-product-store-view-data";
export const DOWNLOAD_MASTER_PRODUCT_STORE_SIZE_VIEW =
  "/inventory-smart/finalize/download-product-store-size-view-data";
export const GET_STORE_VIEW =
  "/inventory-smart/finalize/finalize-store-view-data";
export const GET_STORE_PRODUCT_VIEW =
  "/inventory-smart/finalize/finalize-store-product-view-data";
export const SAVE_DELIVERY_DATE = "/inventory-smart/finalize/shipping-date";
export const SAVE_CANCEL_DATE = "/inventory-smart/finalize/cancel-date";
export const SAVE_PRIORITY = "/inventory-smart/finalize/store-priorities";
export const GET_PRODUCT_STORE_VIEW =
  "/inventory-smart/finalize/finalize-product-store-view-data";
export const GET_PRODUCT_SIZE_VIEW =
  "/inventory-smart/finalize/finalize-product-size-view-data";
export const GET_STORE_SIZE_VIEW =
  "/inventory-smart/finalize/finalize-store-size-view-data";
export const GET_VIEW_PACK_CONFIGURATION =
  "/inventory-smart/finalize/finalize-view-pack-configurations";
export const GET_PRODUCT_SIZE_STORE_VIEW =
  "/inventory-smart/finalize/finalize-product-size-store-view-data";
export const GET_PRODUCT_STORE_VIEW_CREATE_SCENARIO =
  "/inventory-smart/simulation/get-scenario-inputs";
export const EDIT_SCENARIO_INPUT =
  "/inventory-smart/simulation/edit-scenario-inputs";
export const GET_SCENARIO_KPI_TILES =
  "/inventory-smart/simulation/scenario-kpi-tiles";
export const TRIGGER_SCENARIO = "/inventory-smart/simulation/trigger-scenario";
export const FINALIZE_SCENARIO =
  "/inventory-smart/simulation/scenario-finalize";
export const DELETE_SCENARIO =
  "/inventory-smart/simulation/delete-scenario-plan";
export const CHECK_SCENARIO_STATUS =
  "/inventory-smart/simulation/check-scenario-status";
export const GET_ALLOCATION_SUMMARY =
  "/inventory-smart/simulation/scenario-allocation-summary";
export const GET_PRODUCT_VIEW_IN_RECOMENDATION =
  "inventory-smart/simulation/scenario-product-view";
export const GET_STORE_VIEW_IN_RECOMENDATION =
  "inventory-smart/simulation/scenario-store-view";
export const GET_PRODUCT_STORE_DETAILS_IN_RECOMENDATION =
  "inventory-smart/simulation/scenario-product-store-view";
export const GET_PRODUCT_SIZE_DETAILS_IN_RECOMENDATION =
  "inventory-smart/simulation/scenario-product-size-view";
export const GET_STORE_PRODUCT_DETAILS_IN_RECOMENDATION =
  "inventory-smart/simulation/scenario-store-product-view";
export const GET_SCENARIO_STORE_SIZE_VIEW =
  "inventory-smart/simulation/scenario-store-size-view-data";
export const GET_SCENARIO_PRODUCT_SIZE_STORE_VIEW =
  "inventory-smart/simulation/scenario-product-size-store-view-data";
export const GET_PRODUCT_STORE_SIZE_VIEW =
  "/inventory-smart/finalize/finalize-product-store-size-view-data";
export const GET_DRAFTS = "/inventory-smart/strategy/draft";
export const CHANGE_PLAN_STATUS = "/inventory-smart/plan/finalize";
export const UPLOAD_PO = "/inventory-smart/finalize/upload/po";
export const UPLOAD_INV = "/inventory-smart/finalize/upload/inventory";
export const SAVE_ALLOCATION = "/inventory-smart/finalize/edit/save-allocation";
export const FINALIZE_EDIT_APPLY = "/inventory-smart/finalize/edit/apply";
export const FINALIZE_API = "/inventory-smart/finalize/finalize";
export const GET_PACKAGE_DETAILS =
  "/inventory-smart/finalize/edit/get-package-details";
export const GET_PACKAGE_DETAILS_FOR_BULK_EDIT =
  "/inventory-smart/finalize/edit/get-package-details-bulk";
export const UPDATE_ALLOCATED_UNITS =
  "/inventory-smart/finalize/edit/update-allocated-units";
export const BULK_UPDATE_ALLOCATED_UNITS =
  "inventory-smart/finalize/edit/update-allocated-units-multi";
export const STORE_CAPACITY_TABLE_CONFIG =
  "core/table-fields?table_name=store-capacity-breach";
export const STORE_CAPACITY_DATA =
  "/inventory-smart/finalize/capacity-breach/article-store-level";
export const STORE_CAPACITY_POPUP_DATA =
  "/inventory-smart/finalize/finalize-product-store-size-view-data";
export const UPDATE_STORE_CAPACITY_DATA =
  "inventory-smart/finalize/edit/update-allocated-units-multi-v2";
export const GET_STORE_LEVEL_CAPACITY_DATA =
  "inventory-smart/finalize/capacity-breach/store-level";
export const GET_STORE_CAPACITY_STORE_DETAIL =
  "inventory-smart/finalize/capacity-breach/store-detail";
export const GET_PRODUCT_STORE_LEVEL_CAPACITY_DATA =
  "inventory-smart/finalize/capacity-breach/article-level";
export const SESSION_BASED_UPDATE_ON_FINALIZE =
  "inventory-smart/finalize/hle-save-edit";
// Order Triaging
export const GET_ORDER_BATCHING_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_triaging";
export const GET_ORDER_BATCHING_SUMMARY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_triaging_summary";
export const GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_triaging_summary_style";
export const GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_triaging_summary_store";
export const PREPARE_ORDER_BATCHING_BASE_DATA =
  "inventory-smart/order_batching/prepare-base-data";
export const GET_ORDER_BATCHING_TABLE_DATA =
  "inventory-smart/order_batching/search";
export const GET_ORDER_BATCHING_TABLE_DATA_UPDATE_MODE =
  "inventory-smart/order_batching/session/search";
export const GET_ORDER_BATCHING_TABLE_STYLE_STORE_DATA =
  "inventory-smart/order_batching/search-style-store";
export const GET_ORDER_BATCHING_SUMMARY_TABLE_DATA =
  "inventory-smart/order_batching/summary";
export const GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_DATA =
  "inventory-smart/order_batching/summary-store";
export const GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_DATA_UPDATE_MODE =
  "inventory-smart/order_batching/session/summary-store";
export const GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_DATA =
  "inventory-smart/order_batching/summary-style";
export const GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_DATA_UPDATE_MODE =
  "inventory-smart/order_batching/session/summary-style";
export const GET_ORDER_BATCHING_METRICS =
  "inventory-smart/order_batching/metrics";
export const GET_ORDER_BATCHING_METRICS_UPDATE_MODE =
  "inventory-smart/order_batching/session/metrics";
export const UPDATE_ORDER_BATCHING_DATA =
  "inventory-smart/order_batching/update";
export const FINALIZE_BATCHING_DATA =
  "inventory-smart/order_batching/order-finalise";
export const AUTO_FINALIZE_BATCHING_DATA =
  "inventory-smart/order_batching/auto-finalized";
export const FETCH_LOCK_STATUS = "inventory-smart/order_batching/get-lock";
export const RELEASE_LOCK = "inventory-smart/order_batching/release-lock";

export const GET_ALLOCATION_PLANS =
  "inventory-smart/order_batching/fetch-allocation-plans";
export const GET_ORDER_BATCHING_SUMMARY =
  "inventory-smart/order_batching/session/updates";
export const UPDATE_TOGGLE_API =
  "inventory-smart/order_batching/update-mode-toggle";
export const RESET_ALL_TABLES_TO_DEFAULT =
  "inventory-smart/order_batching/reset-to-original";
export const GET_OUTBOUND_EXPORT =
  "inventory-smart/order_batching/order-batching-export/download";

export const SAVE_ORDER_BATCHING_SESSION =
  "inventory-smart/order_batching/session/save-summary";
export const ATA_EXCEEDANCE_CHECK =
  "inventory-smart/order_batching/session/ata-exceedance-check";
export const ATA_AUTO_ADJUST =
  "inventory-smart/order_batching/session/ata-auto-adjust";
export const POLL_ORDER_BATCHING_SAVE_STATUS =
  "/inventory-smart/order_batching/session/save/poll/";
// S2S Order Batching
export const GET_S2S_ORDER_BATCHING_SUMMARY_STORE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_batching_s2s_store";
export const GET_S2S_ORDER_BATCHING_SUMMARY_STYLE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_batching_s2s_style";
export const GET_S2S_ORDER_BATCHING_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_batching_s2s";
export const GET_S2S_ORDER_BATCHING_SUMMARY_STORE_DATA =
  "inventory-smart/order_batching/s2s/summary-store";
export const GET_S2S_ORDER_BATCHING_SUMMARY_STYLE_DATA =
  "inventory-smart/order_batching/s2s/summary-style";
export const GET_S2S_ORDER_BATCHING_TABLE_DATA =
  "inventory-smart/order_batching/s2s/search";
export const GET_S2S_ORDER_BATCHING_METRICS =
  "inventory-smart/order_batching/s2s/metrics";

// Product Supersession
export const GET_SUPERSESSION_MAPPED_PRODUCTS =
  "inventory-smart/supersession/mapped-products";
export const GET_SUPERSESSION_PRODUCTS_MAPPING_LIST =
  "inventory-smart/supersession/products";
export const GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA =
  "inventory-smart/supersession/mappings";
export const UPDATE_SUPERSESSION_PRODUCTS_MAPPING =
  "inventory-smart/supersession/mappings/update";
export const SUPERSESSION_DOWNLOAD_LINK =
  "inventory-smart/supersession/mapped-products/download-trigger";
export const GET_SUPERSESSION_PRODUCTS_PRIORITY_REVIEW_DATA =
  "inventory-smart/supersession/view-priority";
export const GET_SUPERSESSION_PRIORITY_VIEW_TABLE_CONFIG =
  "product_supersession_priority_view";
export const GET_SUPERSESSION_PRIORITY_CHOICE_VIEW_TABLE_CONFIG =
  "product_supersession_priority_choice_view";
export const GET_SUPERSESSION_PRIORITY_CHOICE_EDIT_TABLE_CONFIG =
  "product_supersession_priority_choice_editable";
export const EDIT_PRIORITY_AND_EXCEPTIONS =
  "inventory-smart/supersession/edit-priority";

//Product Store Grade Mapping
export const PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_LIST =
  "inventory-smart/article-store/list";
export const PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_INDIVIDUAL_ROWS =
  "inventory-smart/article-store/update";

//Past Allocation
export const GET_PAST_ALLOCATION_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_past_plans_table";
export const GET_PAST_ALLOCATION_TABLE_DATA =
  "inventory-smart/plan/view-past-plans";
//Past Allocation - Store to Store
export const GET_S2S_PAST_ALLOCATION_TABLE_DATA =
  "inventory-smart/plan/store-past-plans";

// Store DC Config
export const GET_STORE_DC_CONFIG_TABLE_CONFIG =
  "core/table-fields?table_name=store_dc_transit_time";
export const GET_STORE_DC_CONFIG_TABLE_DATA = "inventory-smart/store-dc/list";
export const SAVE_STORE_DC_CONFIG = "inventory-smart/store-dc/update";
export const SAVE_STORE_DC_CONFIG_CHECKALL = "inventory-smart/store-dc/set-all";
export const DOWNLOAD_REPORT_DC_LEAD_TIME =
  "inventory-smart/store-dc/generate_reports";

// REPORT SCREEN APIs
export const GET_LOST_SALES_GRAPHDATA =
  "inventory-smart/reporting/lost-sales-fiscal-week-graph";

export const GET_LOST_SALES_TABLE_DETAILS =
  "inventory-smart/reporting/lost-sales-fiscal-week-list";

export const GET_LOST_SALES_STORE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/lost-sales-list/store";

export const GET_LOST_SALES_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/lost-sales-list/size";

export const GET_REPORT_DOWNLOAD_REQUEST =
  "/inventory-smart/reporting/generate_reports";

export const GET_EXCESS_INVENTORY_GRAPHDATA =
  "inventory-smart/reporting/excess-inventory/fiscal-week-graph";

export const GET_EXCESS_INVENTORY_TABLE_DETAILS =
  "inventory-smart/reporting/excess-inventory/fiscal-week-list";

export const GET_EXCESS_INVENTORY_STORE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/excess-inv-list/store";

export const GET_EXCESS_INVENTORY_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/excess-inventory/fiscal-week-list";

export const GET_DAILY_ALLOCATION_TABLE_DETAILS =
  "inventory-smart/reporting/daily-allocation/article";

export const GET_DAILY_ALLOCATION_ARTICLE_TO_STORE_VIEW =
  "inventory-smart/reporting/daily-allocation/article-to-store";

export const GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE =
  "inventory-smart/reporting/daily-allocation/dc";
export const GET_DAILY_ALLOCATION_STORE_TO_ARTICLE_VIEW =
  "inventory-smart/reporting/daily-allocation/store-to-article";

export const GET_DAILY_ALLOCATION_SUMMARY_PRODUCT_VIEW =
  "inventory-smart/reporting/daily-allocation/product";

export const GET_DAILY_ALLOCATION_SUMMARY_STORE_VIEW =
  "inventory-smart/reporting/daily-allocation/store";
export const GET_STORE_STOCK_DRILL_DOWN_LIST =
  "inventory-smart/reporting/store-stock-drill-down-list";

export const GET_STORE_STOCK_DRILL_DOWN_SIZE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down-size-details";

export const GET_STORE_STOCK_DRILL_DOWN_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/article-store-size-level";

export const GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS =
  "inventory-smart/reporting/allocation-deep-dive";

export const GET_FORECAST_ACCURACY_TABLE_DETAILS =
  "inventory-smart/reporting/forecast-accuracy";

export const GET_READINESS_TABLE_DETAILS =
  "inventory-smart/reporting/readiness";

export const GET_DC_OUTBOUND_PROJECTION_CHOICE_CHANNEL_TABLE_DETAILS =
  "inventory-smart/reporting/dc-outbound-projection/choice-week-channel-list";

export const GET_DC_OUTBOUND_PROJECTION_CHOICE_TABLE_DETAILS =
  "inventory-smart/reporting/dc-outbound-projection/choice-week-list";

export const GET_DC_OUTBOUND_PROJECTION_GRAPH =
  "inventory-smart/reporting/dc-outbound-projection/fiscal-week-graph";

export const GET_FORECASTED_UNITS_TABLE_LIST =
  "inventory-smart/reporting/forecast-under-over-units";

export const GET_ADDITIONAL_REPORTS_DATA =
  "inventory-smart/reporting/rolling-forecast";

export const FETCH_FISCAL_WEEK_DROPDOWN_VALUE =
  "inventory-smart/reporting/rolling-forecast-available-week-list";

export const GET_FUTURE_RECEIPTS_TABLE_DATA =
  "inventory-smart/reporting/future-receipt-store-list";

export const GET_FUTURE_RECEIPTS_SUB_ROWS_DATA =
  "inventory-smart/reporting/future-receipt-store-aggregate-list";

export const SAVE_FUTURE_RECEIPTS_TARGET_WOS =
  "inventory-smart/reporting/update-future-receipt-target-wos";

export const GET_MODEL_STOCK_DEEP_DIVE_POP_UP_TABLE_CONFIG =
  "core/table-fields?table_name=model_stock_deep_dive_level_1";
export const GET_MODEL_STOCK_DEEP_DIVE_TABLE_DATA =
  "inventory-smart/reporting/model-stock-deep-dive";

export const GET_FORECAST_REPORTS_TABLE_CONFIG =
  "core/table-fields?table_name=forecast_report";
export const GET_FORECAST_REPORTS_TABLE_DATA =
  "inventory-smart/reporting/forecast-report";
export const GET_IN_STOCK_TABLE_DATA = "inventory-smart/reporting/in-stock";
export const GET_IN_STOCK_TABLE_DATA_SKU =
  "inventory-smart/reporting/in-stock/article";
export const GET_IN_STOCK_TABLE_DATA_STORE =
  "inventory-smart/reporting/in-stock/store";
export const GET_IN_STOCK_KPI_DATA = "inventory-smart/reporting/in-stock/kpi";
export const GET_EXCESS_INV_REPORT_TABLE_DATA =
  "inventory-smart/reporting/excess-invt-fiscal-week-list";
export const GET_INTENTIONAL_MIN_REPORTS =
  "inventory-smart/reporting/intentional-min";
export const GET_UNINTENTIONAL_MIN_REPORTS =
  "inventory-smart/reporting/unintentional-min";

export const GET_IN_STOCK_KPI = "inventory-smart/reporting/in-stock/kpi";

export const GET_DC_AVAILABILITY_REPORT_TABLE_DETAILS =
  "inventory-smart/reporting/dc-availability-list";

// NEW STORE SETUP APIs
export const NEW_STORE_STORE_LIST = "/inventory-smart/new-store/store-list/all";
export const GET_SISTER_STORE_EXCLUSION_LIST = "/inventory-smart/new-store/sister-store-exclusion-list";
export const NEW_STORE_DC_LIST = "/inventory-smart/new-store/dc-list";
export const NEW_STORE_STORE_LIST_EDIT =
  "/inventory-smart/new-store/store-list";

export const GET_SISTER_STORE_DC_DETAILS =
  "/inventory-smart/new-store/sister-store-and-dc";
export const DEMAND_CONSTRAINTS_DATA =
  "/inventory-smart/new-store/demand-and-constraint";
export const DEMAND_CONSTRAINTS_ALL_FILTERS_DATA =
  "/inventory-smart/new-store/demand-and-constraint/all";

export const NEW_STORE_RESERVE_LIST = "/inventory-smart/new-store/reserve/";
export const NEW_STORE_DASHBOARD_LIST = "/inventory-smart/new-store/list/all";
export const CONFIGURATION_ADD_NEW_STORE = "/inventory-smart/new-store/insert";
export const DELETE_NEW_STORE = "/inventory-smart/new-store";
export const CONFIGURATION_UPDATE_NEW_STORE =
  "/inventory-smart/new-store/update";
export const GET_UPDATED_NEW_STORE_SUMMARY_FOR_SUPER_USER =
  "/inventory-smart/new-store/approval-summary";
export const APPROVAL_FLOW_RESERVE_LIST =
  "/inventory-smart/new-store/approve-product";
export const APPROVAL_FLOW_STORE_LIST =
  "/inventory-smart/new-store/approve-store";
export const EDIT_NEW_STORE = "/inventory-smart/new-store";
export const EDIT_DEMAND_AND_CONSTRAINTS =
  "/inventory-smart/new-store/demand-and-constraint/store_code";
export const RELEASE_FLOW_ARTICLE_LIST =
  "/inventory-smart/new-store/release-product";
export const RELEASE_FLOW_STORE_LIST =
  "/inventory-smart/new-store/release-store";
export const RESERVE_DEMAND_EDIT = "/inventory-smart/new-store/demand";
export const GET_STORE_GROUP_LIST =
  "/inventory-smart/new-store/store-group-list";
export const MAP_DUMMY_STORE_TO_NEW_STORE = "/inventory-smart/new-store/map";
export const FETCH_UPDATED_DEMAND_AND_CONSTRAINTS =
  "/inventory-smart/new-store/demand-and-constraint/demand";
export const SISTER_STORE_TABLE_VALIDATION_CHECK =
  "/inventory-smart/new-store/store-group-duplicate-filter-check";
export const APPROVE_NEW_STORE_PRODUCTS = "/inventory-smart/new-store/approve";
export const RELEASE_NEW_STORE_PRODUCTS = "/inventory-smart/new-store/release";
export const NEW_STORE_ALLOCATION_PROJECTIONS =
  "/inventory-smart/new-store/projections/allocations/";
export const CONFIRM_APPROVAL_OF_STORE =
  "/inventory-smart/new-store/approve-store";

export const ATTRIBUTE_STORE_LIST = "core/attribute-filter/store";

export const STORE_GRADE_LIST_INVENTORY =
  "/inventory-smart/constraints/store-grade-list";

// Store Capacity
export const STORE_CAPACITY_TABLE_DATA = "/inventory-smart/store-capacity";
export const UPDATE_STORE_CAPACITY_BULK_DATA =
  "/inventory-smart/update-store-capacity";

// Application Life Cycle
export const PRODUCT_LIFE_CYCLE_LIST =
  "/inventory-smart/product-life-cycle/list";
export const PRODUCT_LIFE_CYCLE_UPDATE =
  "/inventory-smart/product-life-cycle/update-product-life-cycle";
export const UPDATE_AUTO_ALLOCATION =
  "/inventory-smart/product-rule/auto-allocation-status";
export const UPDATE_AUTO_ALLOCATION_SETALL =
  "/inventory-smart/product-rule/auto-allocation-status-set-all";
export const DOWNLOAD_STORECAPACITY_DATA =
  "/inventory-smart/reporting/download/store-capacity?report_type=store_capacity";
export const DOWNLOAD_USER_MAINTAINED_DATES =
  "/inventory-smart/reporting/download/product-lifecycle";

// Rules/Exception constraints
export const RULES_LIST = "/inventory-smart/constraint/rule/list";
export const RULES_SUMMARY = "/inventory-smart/constraint/rule/summary";

// Rule Groups
export const RULE_GROUPS_LIST = "/inventory-smart/constraint/rule-groups/list";
export const RULE_GROUPS_CREATE = "/inventory-smart/constraint/rule-groups/create";
export const RULE_GROUPS_DETAIL = "/inventory-smart/constraint/rule-groups";
export const RULE_GROUPS_RULE = "/inventory-smart/constraint/rule-groups/rule";
export const RULE_GROUPS_EXCEPTION = "/inventory-smart/constraint/rule-groups/exception";
export const RULE_GROUPS_DELETE = "/inventory-smart/constraint/rule-groups/delete";
export const RULE_GROUPS_SUMMARY = "/inventory-smart/constraint/rule-groups/summary";
export const RULE_GROUPS_UPDATE = "/inventory-smart/constraint/rule-groups/update";
export const RULE_GROUPS_UPDATE_CONSTRAINTS = "/inventory-smart/constraint/rule-groups/update-constraints";
export const EXCEPTION_LIST = "/inventory-smart/constraint/exception/list";
export const EXCEPTION_LIST_ONCLICK = "/inventory-smart/constraint/exception/list-onclick";
export const EXCEPTION_PRODUCT_LIST =
  "/inventory-smart/constraint/exception/product-list";
export const EXCEPTION_STORE_LIST =
  "/inventory-smart/constraint/exception/store-list";
export const EXCEPTION_PRODUCT_STORE_LIST =
  "/inventory-smart/constraint/exception/product-store-list";
export const EXCEPTION_PRODUCT_RULE_STORE_LIST =
  "/inventory-smart/constraint/exception/{rule_code}/store-list";
export const EXCEPTION_DELETE = "/inventory-smart/constraint/exception/delete";
export const RULES_DELETE = "/inventory-smart/constraint/rule/delete";
export const RULE_SET_ALL = "/inventory-smart/constraint/rule/set-all";
export const SAVE_SET_ALL_MODAL_CONSTRAINTS =
  "/inventory-smart/constraint/rule/creation/set-all";
export const DELETE_RULES_CONSTRAINTS_EXCEPTIONS_FROM_TABLE =
  "/inventory-smart/constraint/rule/creation/delete";

export const EXCEPTION_SET_ALL =
  "/inventory-smart/constraint/exception/set-all";
export const EXCEPTION_CREATE_SET_ALL =
  "/inventory-smart/constraint/exception/creation/set-all";
export const EXCEPTION_CREATE_PARTIAL_SET_ALL =
  "/inventory-smart/constraint/exception/creation/partial/set-all";
export const EXCEPTION_CONSTRAINTS_CREATE =
  "/inventory-smart/constraint/exception/creation";
export const SET_ALL_RULES_TABLE = "/inventory-smart/constraint/rule/set-all";
export const PARTIAL_SET_ALL_FOR_RULES =
  "/inventory-smart/constraint/rule/partial/set-all";
export const SET_ALL_EXCEPTION_TABLE =
  "/inventory-smart/constraint/exception/set-all";
export const SET_ALL_PARTIAL_EXCEPTION_TABLE =
  "/inventory-smart/constraint/exception/partial/set-all";
export const SAVE_EXCEPTION_TABLE =
  "/inventory-smart/constraint/exception/creation/save";
export const DELETE_FROM_EXCEPTION_TABLE =
  "/inventory-smart/constraint/exception/creation/delete";
export const SAVE_EXCEPTION_RULE_NAME =
  "inventory-smart/constraint/rule/set-exception-rule-name";
export const DOWNLOAD_EXCEPTION_CONSTRAINTS = "inventory-smart/constraint/exception/list/download";
export const EXCEPTION_SUMMARY = "inventory-smart/constraint/exception/summary";
export const RCL_LIST = "/inventory-smart/constraint/rcl/list";
export const RCL_HIERARCHY_LIST =
  "/inventory-smart/constraint/rcl/hierarchy-list";
export const RCL_RULE_LIST = "/inventory-smart/constraint/rcl/rule-list";
export const RCL_RESET_TO_DEFAULT =
  "/inventory-smart/constraint/rule/set-default";
export const RCL_CREATION = "/inventory-smart/constraint/rcl/creation";
export const RCL_SAVE = "inventory-smart/constraint/rcl/creation/save";
export const RCL_RULES_DELETE = "inventory-smart/constraint/rcls";
export const RCL_FETCH_HIERARCHIES = "inventory-smart/constraint/rcl/list";
export const RCL_EXISITING_UPDATE =
  "inventory-smart/constraint/rcl/rule-list/add";

// Manage RCL Dc Store Policy
export const DC_STORE_RCL_RULE_LIST =
  "/inventory-smart/configuration/rcl/rule-list";
export const DC_STORE_RCL_NETWORK_RULE_LIST =
  "/inventory-smart/supply-route/rcl-network/rule-list";
export const DC_STORE_RCL_LIST = "/inventory-smart/configuration/rcl/list";
export const DC_STORE_NETWORK_RCL_LIST =
  "/inventory-smart/supply-route/rcl-network/list";
export const DC_STORE_HIERARCHY_LIST =
  "inventory-smart/configuration/rcl/hierarchy-list";
export const DC_STORE_NETWORK_HIERARCHY_LIST =
  "inventory-smart/supply-route/rcl-network/hierarchy-list";
export const DC_STORE__NETWORK_RCL_CREATION =
  "inventory-smart/supply-route/rcl-network/creation";
export const DC_STORE_RCL_FETCH_HIERARCHIES =
  "/inventory-smart/configuration/rcl/list";
export const DC_STORE_RCL_CREATION =
  "/inventory-smart/configuration/rcl/creation";
export const DC_STORE_RCL_SAVE =
  "inventory-smart/configuration/rcl/creation/save";
export const DC_STORE__NETWORK_RCL_SAVE =
  "inventory-smart/supply-route/rcl-network/creation/save";
export const DC_STORE_RCL_RULES_DELETE = "inventory-smart/configuration/rcls";
export const DC_STORE_RCL_NETWORK_RULES_DELETE =
  "inventory-smart/supply-route/rcl-network/rcl";
export const DC_STORE_RCL_HIERARCHY_LIST =
  "/inventory-smart/configuration/rcl/hierarchy-list";
export const DC_STORE_RCL_EXISITING_UPDATE =
  "inventory-smart/configuration/rcl/rule-list/add";
export const DC_STORE__SUPPLY_RCL_EXISITING_UPDATE =
  "inventory-smart/supply-route/rcl-network/rule-list/add";
export const MANAGE_RCL_SAVE_DC_STORE_DATA =
  "/inventory-smart/configuration/rule/creation/set-all";
export const MANAGE_RCL_NETWORK_SAVE_DC_STORE_DATA =
  "/inventory-smart/supply-route/rcl-network/creation/set-all";
export const GET_RCL_AUTO_SCHEDULER =
  "/inventory-smart/configuration/auto-allocation-scheduler/list";
export const GET_RCL_AUTO_STORE_SCHEDULER =
  "inventory-smart/configuration/rcl/store-list";

export const CHOICE_VIEW_DATA = "/inventory-smart/constraint/choiceview/list";
export const CHOICE_VIEW_DATA_V2 = "/inventory-smart/constraint/choiceview_v2/list";

// Plan Configuration
export const FETCH_PLAN_CONFIGURATION_INFO =
  "inventory-smart/configurations/plan-info";
export const SAVE_PLAN_CONFIGURATION_EDITS =
  "inventory-smart/configurations/update/plan-info";

export const STORE_DATA = "core/group/store/filter";
// export const MODEL_MOCK_API = "inventory-smart/model-data"; // to test locally with dummy data
export const POST_STORE_LEVEL_TIME_BASED_TABLE_DATA =
  "/inventory-smart/constraints/time-based-single-update";
export const UPDATE_CONSTRAINTS_SET_ALL_WITH_JOBID = "/inventory-smart/set-all";
export const USER_RESERVE_SET_ALL_FIELDS =
  "/inventory-smart/inventory-hold/user-reserve-set-all-form";
export const DOWNLOAD_STORE_CONSTRAINTS_DATA =
  "/inventory-smart/reporting/generate_reports?report_type=constraints-store-search";
export const DOWNLOAD_CHECK_FOR_USER_RESERVE =
  "/inventory-smart/inventory-hold/download_check";
// Report Configuration
export const CHECK_DOWNLOAD_REQUEST =
  "inventory-smart/reporting/download_check";

export const GET_LOST_SALES_LIST_OF_WEEKS =
  "inventory-smart/reporting/lost-sales-available-weeks-list";

export const GET_LOST_SALES_TABLE_DATA =
  "inventory-smart/reporting/lost-sales-data";

export const GET_STORE_STOCK_DRILL_DOWN_BAND_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/store-aggregate-level";

export const GET_STORE_STOCK_DRILL_DOWN_ARTICLE_STORE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/article-store-level";

export const GET_STORE_STOCK_DRILL_DOWN_STORE_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/store-size-level";

export const GET_STORE_STOCK_DRILL_DOWN_ARTICLE_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/article-size-level";

export const GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/store-code-level";

  export const GET_STORE_STOCK_DRILL_DOWN_PRODUCT_VIEW_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/product-view";

// Store-DC-Policy
export const GET_RCL_STORE_GROUP_MAPPINGS =
  "inventory-smart/configuration/rcl-store-groups-mapping";
export const GET_RCL_PRODUCT_PROFILE_MAPPINGS =
  "inventory-smart/product-profile";
export const GET_STORE_DC_POLICY_RULES_LIST =
  "/inventory-smart/configuration/rcl-dc-store-policy-rule";
export const GET_STORE_DC_POLICY_NETWORK_RULES_LIST =
  "/inventory-smart/supply-route/rcl-network-list";
export const GET_RCL_STORE_STRATEGY =
  "inventory-smart/configuration/list-dc-store-policy-rule/dc-store-rule";
export const GET_RCL_ALLOCATIONS =
  "inventory-smart/configuration/list-dc-store-policy-rule/auto-allocation";
export const SAVE_DC_STORE_DATA =
  "inventory-smart/configuration/rcl-dc-store-policy-rule/set-all";
export const PARTIAL_SAVE_DC_STORE_DATA =
  "inventory-smart/configuration/rcl-dc-store-policy-rule/partial/set-all";
export const SAVE_RULE_NAME_DC =
  "inventory-smart/configuration/rcl-dc-store-policy-rule/set-rule-name";
export const SAVE_NETWORK_RULE_NAME_DC =
  "inventory-smart/supply-route/rcl-network/set-rule-name";
export const DOWNLOAD_DC_STORE_STRATEGY =
  "inventory-smart/configuration/rcl-dc-store-policy-rule/download";
export const DOWNLOAD_DC_NETWORKSTORE_STRATEGY =
  "inventory-smart/supply-route/rcl-network-list/download";
export const DELETE_RULES_DC =
  "inventory-smart/configuration/dc-store-policy-rule/delete";
export const DELETE_NEWTORK_RULES_DC =
  "/inventory-smart/supply-route/rcl-network/rule";

// Auto Allocation rules
export const GET_ALLOCATION_RULES_LIST =
  "inventory-smart/configuration/list-dc-store-policy-rule/auto-allocation";
export const GET_ALLOCATION_RULES_SET =
  "inventory-smart/configuration/dc-store-policy-rule/auto-allocation";
export const CREATE_AUTO_ALLOCATION_RULE =
  "inventory-smart/configuration/add-dc-store-policy-rule/auto-allocation";
export const DELETE_AUTO_ALLOCATION_RULE =
  "inventory-smart/configuration/delete-dc-store-policy-rule/auto-allocation";
export const GET_SELECTED_AUTO_ALLOCATION_RULE_DETAILS =
  "inventory-smart/configuration/dc-store-policy-rule-by-id/auto-allocation";
export const SAVE_EDIT_AUTO_ALLOCATION_RULE_CHANGES =
  "inventory-smart/configuration/update-dc-store-policy-rule/auto-allocation";

//Auto Allocation Scheduler

export const GET_ALLOCATION_SCHEDULER_LIST =
  "inventory-smart/configuration/auto-allocation-scheduler/list";
export const DELETE_ALLOCATION_SCHEDULER =
  "inventory-smart/configuration/auto-allocation-scheduler/delete";
export const CREATE_ALLOCATION_SCHEDULER =
  "inventory-smart/configuration/auto-allocation-scheduler/create";
export const GET_SELECTED_ALLOCATION_SCHEDULER =
  "inventory-smart/configuration/auto-allocation-scheduler/get";
export const UPDATE_ALLOCATION_SCHEDULER =
  "inventory-smart/configuration/auto-allocation-scheduler/update";

//DC Store Strategy Rules

export const GET_DC_STORE_STRATEGY_RULES_LIST =
  "inventory-smart/configuration/list-dc-store-policy-rule/dc-store-rule";
export const GET_DC_STORE_STRATEGY_RULES_SET =
  "inventory-smart/configuration/dc-store-policy-rule/dc-store-rule";
export const CREATE_DC_STORE_STRATEGY_RULE =
  "inventory-smart/configuration/add-dc-store-policy-rule/dc-store-rule";
export const DELETE_DC_STORE_STRATEGY_RULE =
  "inventory-smart/configuration/delete-dc-store-policy-rule/dc-store-rule";
export const GET_SELECTED_DC_STORE_STRATEGY_RULE_DETAILS =
  "inventory-smart/configuration/dc-store-policy-rule-by-id/dc-store-rule";
export const SAVE_EDIT_DC_STORE_STRATEGY_RULE_CHANGES =
  "inventory-smart/configuration/update-dc-store-policy-rule/dc-store-rule";

// Supply Route Api's

export const DC_DATA = "master/dc";
export const STORE_GROUP_DATA = "core/group/store";
export const STORE_LIST_FROM_STORE_GROUP = "core/group/store/list";
export const CREATE_SUPPLY_ROUTE_COLUMN_CONFIG =
  "core/table-fields?table_name=create_supply_routes";
export const SUPPLY_ROUTE_COLUMN_CONFIG =
  "core/table-fields?table_name=supply_route_";
export const CREATE_SUPPLY_ROUTE_SAVE = "inventory-smart/supply_route/create";
export const SUPPLY_ROUTE_TABLE_DATA = "inventory-smart/supply_route/dashboard";
export const DELETE_SUPPLY_ROUTE = "inventory-smart/supply_route/delete";
export const EDIT_SUPPLY_ROUTE_NAME = "inventory-smart/supply_route/edit";

//Network tab
export const NETWORK_DROPDOWN_OPTIONS = "/inventory-smart/inventory-filter";
export const CREATE_NETWORK_ROUTE = "/inventory-smart/supply-route/create";
export const UPDATE_NETWORK_ROUTE = "/inventory-smart/supply-route/update";
export const GET_NETWORK_LIST = "/inventory-smart/supply-route/list";
export const GET_NETWORK_BY_ID = "/inventory-smart/supply-route/";

//Map Supply Route Api's

export const MAP_SUPPLY_ROUTE_PRODUCT_GROUP_COLUMN_CONFIG =
  "core/table-fields?table_name=supply_route_pg_mapping";
export const GET_PRODUCT_GROUPS =
  "inventory-smart/supply_route/map/get/product_group";
export const GET_PRODUCT_GROUP = "core/group/product";
export const MAPPED_SUPPLY_ROUTE_TABLE_CONFIG =
  "core/table-fields?table_name=get_mapped_supply_route";
export const GET_SUPPLY_ROUTE_FROM_PRODUCT_GROUP =
  "inventory-smart/supply_route/map/get_route/product_group";
export const GET_DC = "master/dc_status/dc";
export const MANAGE_PRIORITY_TABLE_COLUMN_CONFIG =
  "core/table-fields?table_name=manage_priority";
export const MANAGE_PRIORITY_TABLE_DATA =
  "inventory-smart/supply_route/get_mapped_sources";
export const DELETE_MAPPED_SUPPLY_ROUTE =
  "inventory-smart/supply_route/delete_mapped_sr";
export const CREATE_PRODUCT_GROUP =
  "inventory-smart/supply_route/map/create/product_group";
export const PRODUCT_GROUP_IN_SUPPLY_ROUTE_TABLE_CONFIG =
  "core/table-fields?table_name=product_groups_in_sr";
export const PRODUCT_GROUP_IN_SR =
  "inventory-smart/supply_route/get_supply_routes_pg";
export const PRODUCT_GROUP_MAPPING_TABLE_COLUMN_CONFIG =
  "core/table-fields?table_name=product_group_map";
export const SAVE_SUPPLY_ROUTE_PRIORITY =
  "inventory-smart/supply_route/save_priority";
export const DOWNLOAD_FINALIZE_SUMMARY =
  "inventory-smart/finalize/get-finalize-summary/download";
export const MOVE_TO_ORDER_BATCHING_STATUS =
  "inventory-smart/order_batching/validate-lock?allocation_code=";

export const DC_TRANSFER_CONSTRAINTS_TABLE_DATA =
  "inventory-smart/dc-transfer/constraint-list";

export const DC_TRANSFER_CONSTRAINTS_SET_ALL_UPDATE =
  "inventory-smart/dc-transfer/constraint/set-all";

export const DC_TO_DC_TRANSFER_DATA =
  "inventory-smart/dc-transfer/dc-transfer-list";

export const DC_TO_DC_REVIEW_SIZE_DATA =
  "inventory-smart/dc-transfer/dc-review-size-list";

export const DC_TO_DC_RECOMMENDATION_SIZE_DATA =
  "inventory-smart/dc-transfer/dc-review-recommendation/list";

export const SAVE_AS_DRAFT_OR_APPROVE_DC_TRANSFER =
  "inventory-smart/dc-transfer/dc-review-recommendation/approve";

export const SAVE_DC_TRANSFER =
  "inventory-smart/dc-transfer/dc-review-recommendation/save";

export const DOWNLOAD_DC_TRANSFERS =
  "inventory-smart/dc-transfer/dc-transfer-download-all-sizes/download";

export const DOWNLOAD_DC_REVIEWS =
  "inventory-smart/dc-transfer/dc-review-recommendation/list/download";

export const DOWNLOAD_DC_SIZES =
  "inventory-smart/dc-transfer/dc-review-size-list/download";

export const DC_SERVICE_LEVELS_TABLE_DATA =
  "inventory-smart/dc-transfer/service-level-list";

export const DC_SERVICE_LEVELS_UPDATE =
  "inventory-smart/dc-transfer/service-level/set-all";

export const CONFIGURATION_ADD_NEW_REMODEL_STORE =
  "inventory-smart/new-store/remodel-store/insert";
export const GET_REMODEL_STORE_LIST =
  "inventory-smart/new-store/remodel-store-list/all";
export const CONFIGURATION_UPDATE_NEW_REMODEL_STORE =
  "inventory-smart/new-store/remodel-store/update";
export const REMODEL_STORE_DASHBOARD_LIST =
  "inventory-smart/new-store/remodel-store/list/all";
export const REMODEL_STORE_RESERVED_INVENTORY_LIST =
  "inventory-smart/new-store/remodel-store/product-level";
export const REMODEL_STORE_DETAILS_LIST =
  "inventory-smart/new-store/remodel-store/list";
export const EDIT_REMODEL_STORE = "/inventory-smart/new-store/remodel-store";
export const DELETE_REMODEL_STORE = "/inventory-smart/new-store";
export const REMODEL_STORE_LIST_EDIT =
  "/inventory-smart/new-store/remodel-store-list";
export const NEW_STORE_PERFORMANCE_KPI_VIEW =
  "inventory-smart/reporting/new-store-performance/kpi";
export const NEW_STORE_PERFORMANCE_DETAILS_TABLE =
  "inventory-smart/reporting/new-store-performance/details_table";
export const NEW_STORE_PERFORMANCE_GRAPH =
  "inventory-smart/reporting/new-store-performance/graph";

//Review Forecast Panel in CNA
export const GET_REVIEW_FORECAST_DATA = "ada-visual/table/common-forecast";

// Store Transfer Rule API endpoints
export const STORE_TRANSFER_RULES_LIST =
  "inventory-smart/store-transfer/store-transfer-rules";
export const STORE_TRANSFER_RULES_INFO =
  "inventory-smart/store-transfer/store-transfer-rules/info";
export const CREATE_STORE_TRANSFER_RULE =
  "inventory-smart/store-transfer/store-transfer-rules/save";
export const CREATE_STORE_TRANSFER_RULE_V2 = STORE_TRANSFER_RULES_LIST;
export const COPY_STORE_TRANSFER_RULE =
  "inventory-smart/store-transfer/store-transfer-rules/copy";
export const DC_TRANSFER_RULES_LIST =
  "inventory-smart/dc-transfer/rule/list";
export const DC_TRANSFER_RULE_CREATION =
  "inventory-smart/dc-transfer/rule/creation";
export const DC_TRANSFER_RULE_MAPPING =
  "inventory-smart/dc-transfer/rule/mapping";
export const DC_TRANSFER_RULE_SET_ALL =
  "inventory-smart/dc-transfer/rule/set-all";
export const DC_TRANSFER_RULE_SAVE =
  "inventory-smart/dc-transfer/rule/save";
export const DC_TRANSFER_RULE_DELETE =
  "inventory-smart/dc-transfer/rule/delete";
export const DC_TRANSFER_RULE_DUPLICATE =
  "inventory-smart/dc-transfer/rule/duplicate";
export const DC_TRANSFER_RULE_UPDATE =
  "inventory-smart/dc-transfer/rule/update";
export const DC_TRANSFER_CONFIGURATIONS_LIST =
  "inventory-smart/dc-transfer/configurations/list";
export const DC_TRANSFER_CONFIGURATIONS_CREATION =
  "inventory-smart/dc-transfer/configurations/creation";
export const DC_TRANSFER_CONFIGURATIONS_SET_ALL =
  "inventory-smart/dc-transfer/configurations/set-all";
export const DC_TRANSFER_CONFIGURATIONS_SAVE =
  "inventory-smart/dc-transfer/configurations/save";
export const DC_TRANSFER_CONFIGURATIONS_DC_MAPPING =
  "inventory-smart/dc-transfer/configurations/dc-mapping";
export const DC_TRANSFER_CONFIGURATION_FILTER_SCREEN = "DC Transfer Configuration";
export const DC_TRANSFER_CONFIGURATION_FILTER_CONFIGURATION = `core/filter-configuration/screen/${DC_TRANSFER_CONFIGURATION_FILTER_SCREEN}`;
export const DC_SELECTION_FILTER_SCREEN = "DC Transfer Rule";
export const DC_SELECTION_FILTER_CONFIGURATION = `core/filter-configuration/screen/${DC_SELECTION_FILTER_SCREEN}`;
export const PREVIEW_STORE_TRANSFER_RULE =
  "inventory-smart/store-transfer/store-transfer-rules/preview";
export const VIEW_PREVIEW_STORE_TRANSFER_RULE =
  "inventory-smart/store-transfer/store-transfer-rules/preview/view";
//Finalize HLE
export const HLE_ENABLE_EDIT = "inventory-smart/finalize/hle-enable-edit";
export const FINALIZE_ENABLE_EDIT = "inventory-smart/finalize/enable-edit";
export const HLE_RESET_TO_ORIGINAL =
  "inventory-smart/finalize/hle-reset-to-original";
// Store Transfer Configuration
export const STORE_TRANSFER_LIST = "inventory-smart/store-transfer/list";
export const STORE_TRANSFER_CREATION =
  "inventory-smart/store-transfer/creation";
export const STORE_TRANSFER_SET_ALL = "inventory-smart/store-transfer/set-all";
export const STORE_TRANSFER_SAVE = "inventory-smart/store-transfer/save";
export const STORE_TRANSFER_OPTIONS = "inventory-smart/store-transfer/options";
export const LOGISTIC_CONFIGURATION =
  "inventory-smart/store-transfer/logistic-configuration";
export const LOGISTIC_CONFIGURATION_OPTIONS =
  "inventory-smart/store-transfer/logistic-configuration/options";
export const LOGISTIC_STORE_GROUP_VALUES =
  "inventory-smart/store-transfer/store-transfer-filter";
export const STORE_TRANSFER_DRAFT = "/inventory-smart/strategy/draft";
export const CREATE_STORE_TRANSFER_API = "inventory-smart/store-transfer/create-store-transfer";

// Store Transfer Recommendations
export const STORE_TRANSFER_KPI = "inventory-smart/store-transfer/kpi";
export const STORE_TRANSFER_STORE_VIEW = "inventory-smart/store-transfer/store-view";
export const STORE_TRANSFER_PRODUCT_VIEW = "inventory-smart/store-transfer/product-view-detail";
export const STORE_TRANSFER_PRODUCT_VIEW_DRILLDOWN = "inventory-smart/store-transfer/product-view-drilldown";
export const STORE_TRANSFER_PRODUCT_VIEW_DRILLDOWN_PRODUCTS = "inventory-smart/store-transfer/product-view-drilldown/products";
export const PRODUCT_STORE_TRANSFER_VIEW = "inventory-smart/store-transfer/product-view-detail/transfer-view";
export const STORE_TRANSFER_EDIT =
  "inventory-smart/store-transfer/save-transfer-units";
export const STORE_TRANSFER_PRODUCT_VIEW_SUMMARY = "inventory-smart/store-transfer/product-view";
export const STORE_TRANSFER_STORE_VIEW_DETAIL = "inventory-smart/store-transfer/store-view-detail";
export const STORE_TRANSFER_VIEW =
  "inventory-smart/store-transfer/transfer-view";
export const STORE_TRANSFER_VIEW_PRODUCTS =
  "inventory-smart/store-transfer/transfer-view/products";
export const STORE_TRANSFER_STORE_VIEW_DETAIL_TRANSFER =
  "inventory-smart/store-transfer/store-view-detail/transfer-view";
export const PRODUCT_RESET_TRANSFER_UNITS = "inventory-smart/store-transfer/reset-transfer-units";
export const STORE_TRANSFER_STORE_VIEW_DRILLDOWN = "inventory-smart/store-transfer/store-view-drilldown";
export const STORE_TRANSFER_STORE_VIEW_DRILLDOWN_PRODUCTS =
  "inventory-smart/store-transfer/store-view-drilldown/products";
export const STORE_TRANSFER_SIZE_VIEW = "inventory-smart/store-transfer/size-view";
export const STORE_TRANSFER_ACQUIRE_EDIT = "inventory-smart/store-transfer/edit-mode/acquire";
export const STORE_TRANSFER_RELEASE_EDIT = "inventory-smart/store-transfer/edit-mode/release";
export const STORE_TRANSFER_HEARTBEAT = "inventory-smart/store-transfer/edit-mode/heartbeat";
export const STORE_TRANSFER_UPDATE_REVIEW_STATUS = "inventory-smart/store-transfer/update-review-status";
export const ADD_TRANSFER_OPTIONS = "inventory-smart/store-transfer/add-transfer-options";
export const ADD_TRANSFER_SIZES = "inventory-smart/store-transfer/add-transfer-sizes";
export const EXPORT_PRODUCT_VIEW = "inventory-smart/store-transfer/export";

// KPI Configurator APIs
export const KPI_CONFIG_LIST = 
"/inventory-smart/kpi-configurator/kpi-config/list";

export const KPI_CONFIG_DETAILS = 
"/inventory-smart/kpi-configurator/kpi-config";

export const KPI_CONFIG_EDIT = 
"/inventory-smart/kpi-configurator/kpi-config/edit";

export const KPI_CONFIG_DUPLICATE = 
"/inventory-smart/kpi-configurator/kpi-config/duplicate";

export const KPI_CONFIG_DELETE =
 "/inventory-smart/kpi-configurator/kpi-config/delete";
 
export const KPI_CONFIG_DOWNLOAD = 
"/inventory-smart/kpi-configurator/kpi-config/download";

//Create/Edit KPI APIs
export const KPI_FIELDS_LIST = 
"/inventory-smart/kpi-configurator/kpi-config/kpi-fields-list";
export const GET_MODULE_MAPPINGS = 
"/inventory-smart/kpi-configurator/kpi-config/get-components-list";
export const SAVE_KPI = 
"/inventory-smart/kpi-configurator/kpi-config/create";
export const VALIDATE_KPI_NAME = 
"/inventory-smart/kpi-configurator/kpi-config/validate-kpi-name";
export const GET_KPI_DETAILS = 
"/inventory-smart/kpi-configurator/kpi-config/detail";
export const EDIT_KPI = 
"/inventory-smart/kpi-configurator/kpi-config/edit";
export const SAMPLE_CALCULATION = 
"/inventory-smart/kpi-configurator/kpi-config/kpi-sample-calculation";
export const CREATE_FIELD = 
"/inventory-smart/kpi-configurator/kpi-config/create-field";
export const GET_DERIVED_FIELDS =
'/inventory-smart/kpi-configurator/kpi-config/get-derived-field';
export const DELETE_DERIVED_FIELD =
'/inventory-smart/kpi-configurator/kpi-config/delete-derived-field';
export const UPDATE_DERIVED_FIELD =
'/inventory-smart/kpi-configurator/kpi-config/update-derived-field';

// Cloud functions APIs for Alan Summary
export const CLOUD_FUNCTIONS_BASE_URL =
  "https://us-central1-primark-demo-07032025.cloudfunctions.net";
export const GET_ALAN_SUMMARY =
  "/inv-primark-allocation-summary-test";
export const GET_ALAN_SUMMARY_PROD =
  "/inv-primark-allocation-summary-prod";
export const AGGREGATE_INSIGHTS_SUMMARY =
  "/aggregate-insights/summary";
export const AGGREGATE_DIAGNOSTIC_INSIGHTS =
  "/aggregate-insights/diagnostic-insights";
export const ALAN_PRODUCT_INSIGHT =
  "/inventorysmart-primark-product-insight-dev";
export const FILTER_PLANS_PRIMARK =
  "/inv-primark-advance-filtering-test";
export const FILTER_PLANS_PRIMARK_PROD =
  "/inv-primark-advance-filtering-prod";

// AI Smart Filter (advance-filtering) cloud-function URL per client + environment,
// keyed by TENANT_ENV (derived from localStorage.baseUrl in config/api).
// To onboard a new client/env (e.g. Tapestry UAT), add a single entry here:
//   "tapestry.uat": "https://.../inv-tapestry-advance-filtering-uat",
// Unmapped tenants/envs (incl. local "localhost") fall back to the Primark URL.
/** @type {Record<string, string>} */
export const ADVANCE_FILTERING_URL_BY_TENANT_ENV = {
  "inventorysmart":
    "https://us-central1-primark-demo-07032025.cloudfunctions.net/inv-primark-advance-filtering-prod",
  "tapestry.test":
    "https://us-central1-tapestry-10052024.cloudfunctions.net/inv-tapestry-advance-filtering-test",
  "tapestry.uat":
    "https://us-central1-tapestry-10052024.cloudfunctions.net/inv-tapestry-advance-filtering-uat",
};

export const getAdvanceFilteringUrl = (isProdCloudFunction = false) =>
  ADVANCE_FILTERING_URL_BY_TENANT_ENV[TENANT_ENV] ||
  `${CLOUD_FUNCTIONS_BASE_URL}${isProdCloudFunction ? FILTER_PLANS_PRIMARK_PROD : FILTER_PLANS_PRIMARK
  }`;

// AI Summary (aggregate-insights) cloud-function BASE URL (domain + summary
// function) per client + environment, keyed by TENANT_ENV. The
// /aggregate-insights/* path suffixes are appended by the callers and are
// identical across clients. To onboard a new client/env, add one entry here.
// Unmapped tenants/envs (incl. local "localhost") fall back to the Primark base.
/** @type {Record<string, string>} */
export const ALAN_SUMMARY_BASE_URL_BY_TENANT_ENV = {
  "inventorysmart":
    "https://us-central1-primark-demo-07032025.cloudfunctions.net/inv-primark-allocation-summary-prod",
  "tapestry.test":
    "https://us-central1-tapestry-10052024.cloudfunctions.net/inv-tapestry-allocation-summary-test",
  "tapestry.uat":
    "https://us-central1-tapestry-10052024.cloudfunctions.net/inv-tapestry-allocation-summary-uat",
};

export const getAlanSummaryBaseUrl = (isProdCloudFunction = false) =>
  ALAN_SUMMARY_BASE_URL_BY_TENANT_ENV[TENANT_ENV] ||
  `${CLOUD_FUNCTIONS_BASE_URL}${isProdCloudFunction ? GET_ALAN_SUMMARY_PROD : GET_ALAN_SUMMARY
  }`;
  export const CLOUD_FUNCTIONS_URL =
  "https://us-central1-tapestry-10052024.cloudfunctions.net";
export const ALAN_SUMMARY =
  "/inv-tapestry-allocation-summary-test";

// Ship Allocation Calendar
export const SHIP_ALLOCATION_CALENDAR_LIST =
  "/store-mapping/ship-allocation";
export const FILTER_PLAN =
  "/inv-tapestry-advance-filtering-test";
export const ALAN_EXPLAINATORY =
  "/inv-tapestry-allocation-explainability-test";

// SBCNA Allocation Preview
export const SBCNA_ALLOCATION_PREVIEW =
  "inventory-smart/sbcna/allocation-preview";
export const SBCNA_SHIP_LEVEL_RECOMMENDATIONS =
  "inventory-smart/sbcna/ship-level-recommendations";
export const SBCNA_REPLENISHMENT_MATRIX =
  "inventory-smart/sbcna/replenishment-matrix";
export const SBCNA_SHIP_PRODUCTS =
  "inventory-smart/sbcna/ship-products";
export const SBCNA_FINALISE =
  "inventory-smart/sbcna/finalise";
export const SBCNA_PRODUCT_BREAKDOWN =
  "inventory-smart/sbcna/product-breakdown";

// UAM Configurator APIs
export const UAM_LIST_ROLES = "/core/uam-configurator/roles/list";
export const UAM_CREATE_ROLE = "/core/uam-configurator/roles/create";
export const UAM_UPDATE_ROLE = "/core/uam-configurator/roles/update";
export const UAM_UPDATE_MODULE_ACCESS = "/core/uam-configurator/module-access/update";
export const UAM_DELETE_ROLE = "/core/uam-configurator/roles";
export const UAM_MODULE_ACCESS_MATRIX = "/core/uam-configurator/module-access-matrix";

// AI Daily Brief (navbot Cloud Function).
// Default endpoint (Primark prod) used unless a client/env override is mapped.
export const DAILY_BRIEF_API =
  "https://us-central1-primark-demo-07032025.cloudfunctions.net/navbot-primark-daily-brief-prod";

// AI Daily Brief (navbot) cloud-function URL per client + environment, keyed by
// TENANT_ENV (derived from localStorage.baseUrl in config/api). To onboard a new
// client/env, add a single entry here, e.g.:
//   "briscoes.uat": "https://.../navbot-briscoes-daily-brief-uat",
// Unmapped tenants/envs (incl. Primark UAT and local "localhost") fall back to
// the default Primark prod URL above.
/** @type {Record<string, string>} */
export const DAILY_BRIEF_URL_BY_TENANT_ENV = {
  "briscoes.uat":
    "https://australia-southeast1-briscoes-01082024.cloudfunctions.net/navbot-briscoes-daily-brief-uat",
};

export const getDailyBriefUrl = () =>
  DAILY_BRIEF_URL_BY_TENANT_ENV?.[TENANT_ENV] || DAILY_BRIEF_API;

export const RETAIL_EVENTS = "inventory-smart/oms/retail-events";
export const RETAIL_EVENTS_TEMPLATE = `${RETAIL_EVENTS}/template`;
export const RETAIL_EVENTS_UPLOAD = `${RETAIL_EVENTS}/upload`;
export const RETAIL_EVENTS_ERROR_RECORDS = `${RETAIL_EVENTS}/staging`;
export const RETAIL_EVENTS_ACTIVATE_OR_DEACTIVATE = `${RETAIL_EVENTS}/activate-or-deactivate`;
