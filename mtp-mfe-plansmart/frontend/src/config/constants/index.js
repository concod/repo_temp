import {
  GET_STORE_TO_DC,
  GET_TABLE_DATA,
  GET_PRODUCT_TO_DC,
  DOWNLOAD_TABLE_DATA,
  SET_ALL_TABLE_DATA
} from "config/api";
import { ENV } from "config/api";

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
export const DATA_REFRESH_DATE_DETAILS =
  "inventory-smart/dashboard/refresh-date";

// Create Allocation
export const CREATE_PLANS_FILTER_CONFIG =
  "core/filter-configuration/screen/Allocation";
export const GET_ALLOCATE = "inventory-smart/plan/get-allocation-strategy";
export const GET_COLUMN =
  "core/table-fields?table_name=inventorysmart_strategy_table";
export const GET_APS_WOS = "inventory-smart/plan/get-aps-wos";
export const GET_STOREGROUP_STORE_MAP =
  "inventory-smart/plan/get-storegroup-store-map";
export const GET_SETALL_DCS = "inventory-smart/plan/get-setall-defaults";

export const GET_STORES = "inventory-smart/simulation/strategy-constraints";
export const GET_DCS = "inventory-smart/simulation/dc-level-metrics";
export const CREATE_ALLOCATION_API =
  "inventory-smart/simulation/create-allocation";
export const SAVE_PALN_FOR_DRAFT = "inventory-smart/plan/draft/create";
export const GET_OH_STORE_SIZE =
  "inventory-smart/simulation/oh-size-distribution";
export const SAVE_DRAFT = "inventory-smart/plan/draft";
export const UPDATE_RES_QTY = "inventory-smart/simulation/update-reserve-qty";
export const WARMUP_ALLOCATION = "inventory-smart/simulation/warmup";

export const STORE_INVENTORY_TABLE_DATA =
  "inventory-smart/dashboard/getStoreInventory";
export const STORE_DETAILS_AT_SIZES =
  "inventory-smart/dashboard/article-store-and-size-level";
export const STORE_INVENTORY_ALERTS_TABLE_DATA =
  "inventory-smart/dashboard/alerts";
export const FORECAST_ALERTS_TABLE_DATA =
  "inventory-smart/dashboard/alerts/forecast";
export const ARTICLE_INVENTORY_TABLE_DATA =
  "inventory-smart/dashboard/getArticleInventory";
export const DELETE_PLANS = "inventory-smart/plan/delete";
export const INVENTORY_DASHBOARD_KPI_DATA = "/core/kpi-data";
export const INVENTORY_DASHBOARD_FORECAST_KPI_DATA =
  "inventory-smart/dashboard/kpi/forecast";
export const INVENTORY_DASHBOARD_STORE_INVENTORY_KPI_DATA =
  "inventory-smart/dashboard/kpi/store-inventory";
export const INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_DATA =
  "inventory-smart/oms/dashboard/kpi/orders";
export const INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_ALERT_DATA =
  "inventory-smart/oms/oms_decision_dashboard/alerts_count";
export const INVENTORY_DASHBOARD_ALERTS_REVIEW =
  "inventory-smart/dashboard/alerts/view";
export const FETCH_INVENTORY_DASHBOARD_ALERTS_STORE_CODES =
  "inventory-smart/dashboard/alerts/constraints";
export const DELETE_AUTO_ALLOCATION_ARTICLES =
  "inventory-smart/dashboard/alerts/auto-allocation";

// PRODUCT PROFILE SCREEN API'S
export const GET_IA_RECOMMENDED_TABLE_DATA =
  "inventory-smart/product-profile/ia";
export const GET_USER_CREATED_TABLE_DATA =
  "inventory-smart/product-profile/user";
export const GET_STORE_SIZE_CONTRIBUTION_DATA =
  "inventory-smart/product-profile/contribution/store-size";
export const GET_STORE_SIZE_CONTRIBUTION_FOR_USER_DATA =
  "inventory-smart/product-profile/contribution/store-size/user";
export const GET_STYLE_COLOR_DESCRIPTION_DATA =
  "inventory-smart/product-profile/contribution/style-color";
export const DELETE_USER_PRODUCT_PROFILE = "inventory-smart/product-profile";
// CREATE PRODUCT PROFILE SCREEN API'S
export const GET_PRODUCTS_TO_SELECT =
  "inventory-smart/product-profile/style-color";
export const GET_PRODUCTS_STORE_SIZE_PENETRATION =
  "inventory-smart/product-profile/store-size";
export const SAVE_NEW_PRODUCT_PROFILE = "inventory-smart/product-profile";

// Product Rules
export const PRODUCT_RULE_DASHBOARD_FILTER_CONFIG =
  "core/filter-configuration/screen/inventorysmart_product_rules";

export const PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG = "core/table-fields";

export const PRODUCT_RULE_DASHBOARD_TABLE_ROW_DATA =
  "inventory-smart/product-rule/search";

export const PRODUCT_RULE_DOWNLOAD =
  "/inventory-smart/reporting/generate_reports?=report_type=product_rule";

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
export const DOWNLOAD_STORE_CONSTRAINTS_DATA =
  "/inventory-smart/constraints/download/store-search";
export const DOWNLOAD_STORE_GRADE_CONSTRAINTS_DATA =
  "/inventory-smart/constraints/download/store-grade-search";
export const DOWNLOAD_STORE_GROUP_CONSTRAINTS_DATA =
  "/inventory-smart/constraints/download/store-group-search";
export const FETCH_SKU_COUNT_AND_JOB_ID =
  "/inventory-smart/set-all/get-record-count/constraint";
export const UPDATE_CONSTRAINTS_SET_ALL_WITH_JOBID = "/inventory-smart/set-all";

// Finalize
export const GET_PRODUCT_VIEW_SUMMARY =
  "/inventory-smart/finalize/finalize-product-view-summary";
export const GET_STORE_VIEW_SUMMARY =
  "/inventory-smart/finalize/finalize-store-view-summary";
export const GET_PRODUCT_VIEWS =
  "/inventory-smart/finalize/finalize-product-view-data";
export const GET_STORE_VIEW =
  "/inventory-smart/finalize/finalize-store-view-data";
export const SAVE_DELIVERY_DATE = "/inventory-smart/finalize/shipping-date";
export const SAVE_CANCEL_DATE = "/inventory-smart/finalize/cancel-date";
export const SAVE_PRIORITY = "/inventory-smart/finalize/store-priorities";
export const GET_PRODUCT_STORE_VIEW =
  "/inventory-smart/finalize/finalize-product-store-view-data";
export const GET_PRODUCT_STORE_SIZE_VIEW =
  "/inventory-smart/finalize/finalize-product-store-size-view-data";
export const GET_DRAFTS = "/inventory-smart/plan/draft";
export const CHANGE_PLAN_STATUS = "/inventory-smart/plan/finalize";
export const UPLOAD_PO = "/inventory-smart/finalize/upload/po";
export const UPLOAD_INV = "/inventory-smart/finalize/upload/inventory";
export const SAVE_ALLOCATION = "/inventory-smart/finalize/edit/save-allocation";
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
export const STORE_CAPACITY_DATA = "/inventory-smart/finalize/capacity-breach";
export const STORE_CAPACITY_POPUP_DATA =
  "/inventory-smart/finalize/finalize-product-store-size-view-data";
export const UPDATE_STORE_CAPACITY_DATA =
  "inventory-smart/finalize/edit/update-allocated-units-multi-v2";

// Order Triaging
export const GET_ORDER_BATCHING_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_triaging";
export const GET_ORDER_BATCHING_SUMMARY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_order_triaging_summary";
export const GET_ORDER_BATCHING_TABLE_DATA = "inventory-smart/order/search";
export const GET_ORDER_BATCHING_SUMMARY_TABLE_DATA =
  "inventory-smart/order/summary";
export const GET_ORDER_BATCHING_METRICS = "inventory-smart/order/metrics";
export const UPDATE_ORDER_BATCHING_DATA = "inventory-smart/order/update";
export const FINALIZE_BATCHING_DATA = "inventory-smart/order/finalise";

// Product Supersession
export const GET_SUPERSESSION_MAPPED_PRODUCTS =
  "inventory-smart/supersession/mapped-products";
export const GET_SUPERSESSION_PRODUCTS_MAPPING_LIST =
  "inventory-smart/supersession/products";
export const GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA =
  "inventory-smart/supersession/mappings";
export const SUPERSESSION_DOWNLOAD_LINK =
  "inventory-smart/supersession/mapped-products/download-trigger";

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
  "inventory-smart/reporting/excess-inv-fiscal-week-graph";
export const GET_EXCESS_INVENTORY_TABLE_DETAILS =
  "inventory-smart/reporting/excess-invt-fiscal-week-list";

export const GET_EXCESS_INVENTORY_STORE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/excess-inv-list/store";

export const GET_EXCESS_INVENTORY_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/excess-inv-list/size";

export const GET_DAILY_ALLOCATION_TABLE_DETAILS =
  "inventory-smart/reporting/daily-allocation-article";

export const GET_DAILY_ALLOCATION_ARTICLE_TO_STORE_VIEW =
  "inventory-smart/reporting/daily-allocation-article-to-store";

export const GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE =
  "inventory-smart/reporting/daily-allocation-store";
export const GET_DAILY_ALLOCATION_STORE_TO_ARTICLE_VIEW =
  "inventory-smart/reporting/daily-allocation-store-to-article";

export const GET_STORE_STOCK_DRILL_DOWN_LIST =
  "inventory-smart/reporting/store-stock-drill-down-list";

export const GET_STORE_STOCK_DRILL_DOWN_SIZE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down-size-details";

export const GET_STORE_STOCK_DRILL_DOWN_SIZE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/article-store-size-level";
export const GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS =
  "inventory-smart/reporting/store-stock-drill-down/article-store-level";

export const GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS =
  "inventory-smart/reporting/allocation-deep-dive";

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
export const GET_EXCESS_INV_REPORT_TABLE_DATA =
  "inventory-smart/reporting/excess-invt-fiscal-week-list";
export const GET_INTENTIONAL_MIN_REPORTS =
  "inventory-smart/reporting/intentional-min";
export const GET_UNINTENTIONAL_MIN_REPORTS =
  "inventory-smart/reporting/unintentional-min";

export const GET_IN_STOCK_KPI = "inventory-smart/reporting/in-stock/kpi";

export const GET_DC_AVAILABILITY_REPORT_TABLE_DETAILS =
  "inventory-smart/reporting/dc-availability-list";

export const GET_FORECAST_VARIANCE_TABLE_DATA =
  "/inventory-smart/reporting/variance-forecast-list";

export const GET_FUTURE_LOOKING_ALLOCATION_SUMMARY =
  "inventory-smart/reporting/allocation-estimate-summary";
export const GET_FUTURE_LOOKING_ALLOCATION_DETAILS =
  "inventory-smart/reporting/allocation-estimate-details";

// NEW STORE SETUP APIs
export const NEW_STORE_STORE_LIST = "/inventory-smart/new-store/store-list/all";
export const NEW_STORE_DC_LIST = "/inventory-smart/new-store/dc-list";
export const NEW_STORE_STORE_LIST_EDIT =
  "/inventory-smart/new-store/store-list";

export const GET_SISTER_STORE_DC_DETAILS =
  "/inventory-smart/new-store/sister-store-and-dc";
export const DEMAND_CONSTRAINTS_DATA =
  "/inventory-smart/new-store/demand-and-constraint";
export const DEMAND_CONSTRAINTS_ALL_FILTERS_DATA =
  "/inventory-smart/new-store/demand-and-constraint/all";

export const NEW_STORE_RESERVE_LIST = "/inventory-smart/new-store/reserve/all";
export const NEW_STORE_DASHBOARD_LIST = "/inventory-smart/new-store/list/all";
export const DEMAND_CONSTRAINTS_ADD_NEW_STORE =
  "/inventory-smart/new-store/demand-and-constraint/insert";
export const DELETE_NEW_STORE = "/inventory-smart/new-store";
export const DEMAND_CONSTRAINTS_UPDATE_NEW_STORE =
  "/inventory-smart/new-store/demand-and-constraint/update";

export const APPROVAL_FLOW_RESERVE_LIST = "/inventory-smart/new-store/reserve";
export const APPROVAL_FLOW_STORE_LIST = "/inventory-smart/new-store/list";
export const EDIT_NEW_STORE = "/inventory-smart/new-store/edit";
export const EDIT_DEMAND_AND_CONSTRAINTS =
  "/inventory-smart/new-store/demand-and-constraint/store_code";
export const RELEASE_FLOW_ARTICLE_LIST = "/inventory-smart/new-store/release";
export const RESERVE_DEMAND_EDIT = "/inventory-smart/new-store/demand";
export const GET_STORE_GROUP_LIST =
  "/inventory-smart/new-store/store-group-list";
export const MAP_DUMMY_STORE_TO_NEW_STORE = "/inventory-smart/new-store/map";
export const FETCH_UPDATED_DEMAND_AND_CONSTRAINTS =
  "/inventory-smart/new-store/demand-and-constraint/demand";

//ORDER MANAGEMENT APIs
export const ORDER_MANAGEMENT_FILTER_CONFIG =
  "Inventorysmart Oms Order Management";
export const ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_sku_summary";
export const ORDER_MANAGEMENT_SKU_SUMMARY_DEEP_DIVE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive_recomm";
export const ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_sc_recomm";
export const ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/get-recomm-orders-sku-summary";
export const ORDER_MANAGEMENT_EDIT_SKU_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/edit-order-qty";
export const ORDER_MANAGEMENT_UPDATE_SKU_SUMMARY_NOT_BEFORE_AFTER_DATES =
  "inventory-smart/oms/edit-not-before-after-date";
export const ORDER_MANAGEMENT_SET_SKU_SUMMARY_APPROVE_REQUEST_DATA =
  "inventory-smart/oms/order-action ";
export const ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_TABLE_CONFIG =
  "inventory-smart/oms/subclass-summary-oms/table-columns";
export const ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_NEW_VIEW_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_subclass_sku_summary_pivoted";
export const ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/table/subclass-sku-summary";
export const ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_NEW_TABLE_DATA =
  "inventory-smart/oms/table/subclass-sku-summary-monthly";
export const ORDER_MANAGEMENT_ORDER_SUMMARY_BY_GRADES =
  "inventory-smart/oms/kpi/get-orders-summary-by-grades";
export const ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive";
export const ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA =
  "inventory-smart/oms/table/deep-dive";
export const ORDER_MANAGEMENT_CREATE_SCENARIO_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_sc_safety_stock";
export const ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA =
  "inventory-smart/oms/simulate-scenario";
export const CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_scenario_deep_dive_org";
export const SCENARIO_VIEW_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_scenario_deep_dive_sce";
export const SAFETY_STOCK_GRAPH_VIEW_DATA =
  "inventory-smart/oms/safety-stock-graph";

export const ATTRIBUTE_STORE_LIST = "core/attribute-filter/store";
//ORDER REPOSITORY APIs
export const ORDER_REPOSITORY_FILTER_CONFIG =
  "Inventorysmart Oms Order Repository";
export const ORDER_REPOSITORY_ORDER_STATUS_SUMMARY =
  "inventory-smart/oms/get-order-status-summary";
export const ORDER_REPOSITORY_SUBCLASS_LEVEL_SUMMARY_TABLE_CONFIG =
  "inventory-smart/oms/sku-summary-order-repo/table-columns";
export const ORDER_REPOSITORY_SUBCLASS_LEVEL_SUMMARY_NEW_VIEW_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_subclass_sku_summary_pivoted_or";

export const ORDER_REPOSITORY_ORDERS_TABLE_CONFIG =
  "core/table-fields?table_name=";
export const ORDER_REPOSITORY_APPROVED_PENDING_ORDERS_TABLE_DATA =
  "inventory-smart/oms/get-orders-sku-summary";
export const ORDER_REPOSITORY_DELETE_ORDERS =
  "inventory-smart/oms/delete-order";

//CONSTRAINTS OMS APIs
export const CONSTRAINTS_ORDER_POLICY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_constraint_order_policy";
export const CONSTRAINTS_ORDER_POLICY_TABLE_DATA =
  "inventory-smart/oms/table/order_policy";
export const SAVE_CONSTRAINTS_ORDER_POLICY =
  "inventory-smart/oms/edit-order-policy";

export const CONSTRAINTS_ORDERING_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_constraint_ordering";
export const CONSTRAINTS_ORDERING_TABLE_DATA =
  "inventory-smart/oms/table/ordering";
export const SAVE_CONSTRAINTS_ORDERING =
  "inventory-smart/oms/edit-ordering-constraint";

export const CONSTRAINTS_SAFETY_STOCK_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_constraint_safety_stock";
export const CONSTRAINTS_SAFETY_STOCK_TABLE_DATA =
  "inventory-smart/oms/table/safety_stock";
export const SAVE_CONSTRAINTS_SAFETY_STOCK =
  "inventory-smart/oms/edit-safety-stock";

export const CONSTRAINTS_STATUS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_constraint_status";
export const CONSTRAINTS_STATUS_TABLE_DATA = "inventory-smart/oms/table/status";
export const SAVE_CONSTRAINTS_STATUS = "inventory-smart/oms/edit-status";

export const CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_constraint_delivery_lead_time";
export const CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_DATA =
  "inventory-smart/oms/table/delivery_lead_time";
export const SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME =
  "inventory-smart/oms/edit-delivery-lead-time";
export const SAVE_CONSTRAINTS_DELIVERY_QC_TIME =
  "inventory-smart/oms/edit-delivery-qc-time";

export const CONSTRAINTS_DELIVERY_QC_TIME_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_constraint_delivery_qc_time";
export const CONSTRAINTS_DELIVERY_QC_TIME_TABLE_DATA =
  "inventory-smart/oms/table/delivery_qc_time";

export const CONSTRAINTS_OMS_FILTER_CONFIG =
  "core/filter-configuration/screen/Inventorysmart Oms Constraints";

//CREATE NEW ORDER APIs
export const CREATE_NEW_ORDER_FILTER_CONFIG = "Oms Create Order";
export const CREATE_NEW_ORDER_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_new_order";
export const CREATE_NEW_ORDER_TABLE_DATA = "inventory-smart/oms/new-order";
export const CREATE_NEW_ORDER_EDIT_TABLE_DATA = "";
export const CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA =
  "inventory-smart/oms/create-new-order";

//OMS DASHBOARD ORDER ALERT APIs
export const ORDER_ALERTS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_alerts";
export const ORDER_ALERTS_TABLE_DATA =
  "inventory-smart/oms/oms_decision_dashboard/alerts";
export const RECOMMENDED_ALERTS_TABLE_DATA = "inventory-smart";
export const RECOMMENDED_POPUP_ALERTS_TABLE_DATA = "inventory-smart/oms";
export const UPDATE_RESOLVED_DATA =
  "inventory-smart/oms/oms_decision_dashboard/update-alerts";

//OMS REPORTS APIs
export const ORDERS_TOTAL_PROJECTIONS_GRAPH =
  "inventory-smart/oms/reporting/vendor-projection/orders/total-projection";

export const ORDERS_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/orders/vendor-level-projection/total-columns";
export const ORDERS_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/orders/vendor-level-projection";

export const ORDERS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/orders/sku-vendor-level-projection/total-columns";
export const ORDERS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/orders/sku-vendor-level-projection";

export const FORECASTING_TOTAL_PROJECTIONS_GRAPH =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/total-projection";

export const FORECASTING_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/vendor-level-projection/total-columns";
export const FORECASTING_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/vendor-level-projection";

export const FORECASTING_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/sku-vendor-level-projection/total-columns";
export const FORECASTING_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/sku-vendor-level-projection";

export const DROPSHIP_TOTAL_PROJECTIONS_GRAPH =
  "inventory-smart/oms/reporting/dropship/total-projection";

export const DROPSHIP_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/dropship/vendor-level-projection/total-columns";
export const DROPSHIP_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/dropship/vendor-level-projection";

export const DROPSHIP_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/dropship/sku-vendor-level-projection/total-columns";
export const DROPSHIP_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/dropship/sku-vendor-level-projection";

export const DROPSHIP_VENDOR_COST_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/dropship/vendor-level-projection/cost";
export const DROPSHIP_VENDOR_UNIT_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/dropship/vendor-level-projection/unit";

export const DROPSHIP_SKU_VENDOR_COST_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/dropship/sku-vendor-level-projection/cost";
export const DROPSHIP_SKU_VENDOR_UNIT_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/dropship/sku-vendor-level-projection/unit";
export const DROPSHIP_SKU_VENDOR_PROJECTIONS_UPDATE =
  "inventory-smart/oms/reporting/dropship/update";
export const DROPSHIP_SKU_VENDOR_PROJECTIONS_RESET =
  "inventory-smart/oms/reporting/dropship/revert";

export const EXPEDITE_ORDERS_PROJECTIONS_TABLE_CONFIG =
  "core/table-fields?table_name=Inventorysmart_oms_expedite_orders_report";
export const EXPEDITE_ORDERS_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/expedite-orders-report";

export const LATE_ORDERS_PROJECTIONS_TABLE_CONFIG =
  "core/table-fields?table_name=Inventorysmart_oms_late_orders_report";
export const LATE_ORDERS_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/late-orders-report";

export const FUTURE_RECEIPTS_PROJECTIONS_CHART_DATA =
  "inventory-smart/oms/reporting/future-order/total-projection";
export const FUTURE_RECEIPTS_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/future-order/vendor-level-projection";
export const FUTURE_RECEIPTS_SKU_VENDOR_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/future-order/sku-vendor-level-projection";

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

import theme from "Styles/theme";
/**
 * App Global Styles, Themes, Constants go below
 */
const ENV_LABEL = ["dev", "test", "uat", "sandbox"].includes(ENV)
  ? `[${ENV.toUpperCase()}]`
  : "";
export const APP_PLATFORM = {
  APP_NAME: `${ENV_LABEL} PlanSmart`,
  DEMO_PAGE: "https://www.impactanalytics.co/schedule-demo/",
  CONTACT_PAGE: "https://www.impactanalytics.co/contact-us/"
};

export const POSTHOG_KEY = "phc_jdfaPUcheTjuLkcagCcjqQx4ebTtQLcSiq115zfZQJj";

/**
 * Constants for the App Attribute Smart are defined below
 */
export const APP_ATTRIBUTE_SMART = {
  APP_NAME: "AttributeSmart",
  ATTRIBUTE_SMART_SAMPLE_CSV:
    "https://storage.googleapis.com/generic-attribute-smart-public-test/sample_csv/dsg_sample.csv"
};

export const APP_MARKSMART = {
  APP_NAME: "MarkSmart"
};

/**
 * Constants for Field Types
 */
export const TEXT_FIELDS = ["str", "CharField", "int", "list"];
export const TEXT_FIELDS_SETALL = ["str", "CharField", "int"];
export const NUMERIC_FIELDS = ["int", "IntegerField"];
export const EMPTY_ON_ZERO_COLUMNS = ["max_cc"];
export const EMPTY_ON_NULL_COLUMNS = ["moq"];

/**
 * constants for Filters Screen are defined below
 */
export const FILTER_TABS = [
  { label: "Product Filters", id: "product" },
  { label: "Store Filters", id: "store" },
  { label: "Others", id: "others" }
];
export const FILTER_DIMENSIONS = {
  product: [
    { label: "Ticket", value: 87 },
    { label: "Subticket", value: 88 }
  ],
  store: [
    { label: "Ticket", value: 87 },
    { label: "Subticket1", value: 89 }
  ],
  others: [
    { label: "Ticket", value: 87 },
    { label: "Subticket2", value: 90 }
  ]
};
export const FILTER_MODULES = {
  product: [
    {
      label: "Reporting",
      id: 1
    },
    {
      label: "Admin",
      id: 2
    },
    {
      label: "Notifications",
      id: 3
    }
  ],
  store: [
    {
      label: "Reporting",
      id: 1
    },
    {
      label: "Admin",
      id: 2
    },
    {
      label: "Notifications",
      id: 3
    }
  ],
  others: [
    {
      label: "Reporting",
      id: 1
    },
    {
      label: "Admin",
      id: 2
    },
    {
      label: "Notifications",
      id: 3
    }
  ]
};

export const FORM_CONSTANT_FIELDS = [
  "dropdown",
  "radio",
  "checkbox",
  "TextField",
  "range_picker",
  "list"
];

export const FILTER_TYPES = [
  { label: "Cascaded", value: "cascaded" },
  { label: "NonCascaded", value: "non-cascaded" }
];

export const UNIT_TYPES = [
  {
    label: "Eaches",
    value: "eaches"
  },
  {
    label: "Packs",
    value: "packs"
  },
  {
    label: "Cartons",
    value: "cartons"
  },
  {
    label: "Boxes",
    value: "boxes"
  }
];

export const UNIT_DEFN_ATTRIBUTE_TYPES = [
  {
    label: "Single Size - All Colors",
    value: "single size - all colors"
  },
  {
    label: "All Size - Single Color",
    value: "all size - single color"
  },
  {
    label: "Different Size - Different Color",
    value: "different size - different color"
  }
];
export const MANUAL_GROUP_TYPE_FILTERS = [
  {
    label: "Product Hierarchy",
    value: "product_hierarchy"
  },
  {
    label: "Grouping Definitions",
    value: "grouping_definitions"
  }
];
export const MANUAL_GROUP_TYPE_FILTERS_FOR_INVENTORY = [
  {
    label: "Product Hierarchy",
    value: "product_hierarchy"
  }
];
export const END_DATE = "2050-12-31";
export const START_DATE = "2000-01-01";
export const SKU_STORE_STATUS_START_DATE = "2022-12-01";

export const STORE_STATUS_FILTER = {
  column_name: "status",
  default_value: null,
  dimension: "store",
  display_type: "dropdown",
  fc_code: 100,
  filter_keyword: "status",
  is_mandatory: false,
  is_multiple_selection: false,
  label: "Store Status",
  level: 2,
  type: "non-cascaded",
  initialData: [
    { label: "Open", id: "open", value: "open" },
    { label: "Deactivated", id: "deactivated", value: "deactivated" },
    { label: "Close", id: "close", value: "close" },
    { label: "Renovation", id: "renovation", value: "renovation" }
  ]
};

export const NUMBER_OF_EXTRA_YEARS_IN_DATE_PICKER = 5;
export const DC_DROPDOWN_STORE = ["master_store_code", "store_name"];

export const STORE_CODE = "store_code";
export const STORE_NAME = "store_name";
export const MASTER_STORE_CODE = "master_store_code";
export const MASTER_STORE_NAME = "master_store_name";
export const FLAG = "flag";
export const EXISTING = "existing";

/**
 * Constant for Tenant (for temporary hardcoding)
 * 1. TENANT_ID - We hardcode the tenant ID provided by the Google Identity platform
 * 2. TENANT_SIGN_IN_OPTIONS - hardcode the tenant sign in options
 *    type - array - first option corresponds to Enable Google Sign IN
 *                   second option corresponds to Enable SAML
 *                   third option corresponds to Enable Email Sign IN
 * 3. TENANT_SAML_PROVIDERID - If SAML option is enabled, hardcode its provider id
 *
 * These settings are configured to vb-staging-client ID
 */

export const TENANT_CLOUD_ID = "vera-bradley-s8aac";
export const TENANT_SIGN_IN_OPTIONS = [false, false, false];
export const TENANT_SAML_PROVIDERID = "saml.saml.vb-config";
export const TENANT_SAML_PROVIDER_BUTTON_LABEL = "Login with SSO";
export const TENANT_SAML_ICON_URL =
  "https://www.okta.com/sites/default/files/Dev_Logo-02_Large.png";
export const TEANT_SAML_PROVIDER_NAME = "Okta SSO";

/**
 * Store Grouping Constants
 */
export const STORE_GROUPING_CHANNEL_BGCOLOR_MAPPER = {
  manual: "success",
  objective: "warning",
  custom: "secondary"
};

export const API_META_BODY = {
  range: [],
  sort: [],
  search: []
};
export const API_POST_BODY_META_DATA = {
  filters: [],
  ...API_META_BODY
};
export const DEFAULT_DATE_FORMAT = "MM/DD/YYYY";
export const DATE_FORMATS = [
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY-MM-DD",
  "MM-DD-YYYY HH:mm:ss",
  "MM-DD-YYYYTHH:mm:ssZ",
  "YYYY-MM-DDTHH:mm:ssZ",
  "YYYY-MM-DD HH:mm:ss"
];

export const Month_mapping_list = [
  "Jan",
  "Feb",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec"
];

// add table data's api endpoint if we need to ignore exclude filter feature in table api calls.
export const screenUrlsNotIncludedInFilterExclusion = [
  GET_LOST_SALES_GRAPHDATA,
  GET_LOST_SALES_TABLE_DETAILS,
  GET_EXCESS_INVENTORY_GRAPHDATA,
  GET_EXCESS_INVENTORY_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_ARTICLE_TO_STORE_VIEW,
  GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE,
  GET_DAILY_ALLOCATION_STORE_TO_ARTICLE_VIEW,
  GET_STORE_STOCK_DRILL_DOWN_LIST,
  GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS,
  GET_FORECASTED_UNITS_TABLE_LIST,
  GET_ADDITIONAL_REPORTS_DATA,
  GET_IA_RECOMMENDED_TABLE_DATA,
  GET_USER_CREATED_TABLE_DATA,
  GET_STORE_SIZE_CONTRIBUTION_DATA,
  GET_STYLE_COLOR_DESCRIPTION_DATA,
  GET_PRODUCTS_TO_SELECT,
  GET_PRODUCTS_STORE_SIZE_PENETRATION,
  GET_PAST_ALLOCATION_TABLE_DATA,
  VIEWPLANS_TABLE_DATA,
  GET_ORDER_BATCHING_TABLE_DATA,
  GET_ORDER_BATCHING_METRICS
];

export const screenUrlsIncludedInFilterExclusion = [
  { url: PRODUCT_RULE_DOWNLOAD },
  { url: SAVE_STORE_DC_CONFIG_CHECKALL },
  { url: DOWNLOAD_REPORT_DC_LEAD_TIME },
  { url: GET_STORE_DC_CONFIG_TABLE_DATA },
  { url: ARTICLE_INVENTORY_TABLE_DATA },
  { url: GET_ALLOCATE },
  { url: PRODUCT_RULE_DASHBOARD_TABLE_ROW_DATA },
  { url: GET_STORE_LEVEL_TABLE_DATA },
  { url: GET_STORE_GRADE_LEVEL_TABLE_DATA },
  { url: GET_STORE_GROUP_LEVEL_TABLE_DATA },
  { url: GET_LOST_SALES_TABLE_DETAILS },
  { url: GET_LOST_SALES_GRAPHDATA },
  { url: GET_LOST_SALES_TABLE_DETAILS },
  { url: GET_EXCESS_INVENTORY_GRAPHDATA },
  { url: GET_EXCESS_INVENTORY_TABLE_DETAILS },
  { url: GET_STORE_STOCK_DRILL_DOWN_LIST },
  { url: GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS },
  { url: GET_FORECASTED_UNITS_TABLE_LIST },
  { url: GET_ADDITIONAL_REPORTS_DATA },
  { url: GET_MODEL_STOCK_DEEP_DIVE_TABLE_DATA },
  { url: GET_FORECAST_REPORTS_TABLE_DATA },
  { url: GET_IN_STOCK_TABLE_DATA },
  { url: GET_EXCESS_INV_REPORT_TABLE_DATA },
  { url: GET_STORE_TO_DC },
  { url: "/core/group/store/filter" },
  { url: GET_REPORT_DOWNLOAD_REQUEST },
  {
    url: DOWNLOAD_TABLE_DATA,
    dimensions: [{ dimension: "store", key: ["table_payload", "filters"] }]
  },
  {
    url: `${GET_TABLE_DATA}/product`,
    dimensions: [{ dimension: "product", key: "filters" }]
  }, //Product Status
  {
    url: `${GET_TABLE_DATA}/store`,
    dimensions: [{ dimension: "store", key: "filters" }]
  }, //Store Status
  {
    url: `/master/products`,
    dimensions: [{ dimension: "product", key: "filters" }]
  }, //Product Mapping Dashboard Screen fetch products API
  {
    url: `/product-mapping/stores`,
    dimensions: [{ dimension: "store", key: "filters" }]
  }, //Product Mapping Modify screen fetch stores API
  {
    url: `/product-mapping/stores/download`,
    dimensions: [{ dimension: "store", key: "filters" }]
  }, //Product Mapping Modify screen download stores API
  {
    url: `/master/stores`,
    dimensions: [{ dimension: "store", key: "filters" }]
  }, //Store Mapping Dashboard screen fetch stores API
  {
    url: `/core/group/store/new`,
    dimensions: [
      { dimension: "store", key: ["store_ids", "filters"] },
      { dimension: "store", key: ["store_group_ids", "filters"] }
    ]
  }, //Store Group create API
  {
    url: `/product-mapping/mapped-stores`,
    dimensions: [{ dimension: "store", key: "filters" }]
  }, //Product Mapping view mapped stores API,
  {
    url: `/core/group/store/[0-9]+$`,
    dimensions: [
      { dimension: "store", key: ["store_ids", "filters"] },
      { dimension: "store", key: ["store_group_ids", "filters"] }
    ]
  }, //Store Group update API
  {
    url: `${GET_PRODUCT_TO_DC}`,
    dimensions: [{ dimension: "product", key: "filters" }]
  },
  {
    url: "/core/group/bulk/store",
    dimensions: [
      { dimension: "store", key: ["store_ids", "filters"] },
      { dimension: "store", key: ["store_group_ids", "filters"] }
    ]
  },
  {
    url: `/store-mapping/products`,
    dimensions: [{ dimension: "product", key: "filters" }]
  }, //Store Mapping Modify screen fetch products API
  {
    url: `/product-mapping/product-to-store/set-all`,
    dimensions: [{ dimension: "store", key: ["stores", "filters"] }]
  }, //set all API for product mapping
  {
    url: "/store-mapping/stores/pagination",
    dimensions: [{ dimension: "store", key: "filters" }]
  },
  {
    url: `${SET_ALL_TABLE_DATA}/product`,
    dimensions: [{ dimension: "product", key: ["codes", "filters"] }]
  },
  {
    url: `${SET_ALL_TABLE_DATA}/store`,
    dimensions: [{ dimension: "store", key: ["codes", "filters"] }]
  }
];

// add screen name in the list to ignore exclude filter feature in filter api calls.
export const screenNamesNotIncludedInFilterExclusion = [
  "Product Profile",
  "inventorysmart_loss_sales_reports"
];

export const appName = {
  WORKFLOW_INPUT_CENTER: "workflow input center",
  APPLICATION_ACCESS_MANAGEMENT: "application access management"
};

// This data Will be removed & come from the api, once approved
export const fiscalCalendarData = {
  signet: [
    {
      calendar_week_start_date: "2017-01-29",
      fiscal_year_week: "201801",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-05",
      fiscal_year_week: "201802",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-12",
      fiscal_year_week: "201803",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-19",
      fiscal_year_week: "201804",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-26",
      fiscal_year_week: "201805",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-05",
      fiscal_year_week: "201806",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-12",
      fiscal_year_week: "201807",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-19",
      fiscal_year_week: "201808",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-26",
      fiscal_year_week: "201809",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-02",
      fiscal_year_week: "201810",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-09",
      fiscal_year_week: "201811",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-16",
      fiscal_year_week: "201812",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-23",
      fiscal_year_week: "201813",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-30",
      fiscal_year_week: "201814",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-07",
      fiscal_year_week: "201815",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-14",
      fiscal_year_week: "201816",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-21",
      fiscal_year_week: "201817",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-28",
      fiscal_year_week: "201818",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-04",
      fiscal_year_week: "201819",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-11",
      fiscal_year_week: "201820",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-18",
      fiscal_year_week: "201821",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-25",
      fiscal_year_week: "201822",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-02",
      fiscal_year_week: "201823",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-09",
      fiscal_year_week: "201824",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-16",
      fiscal_year_week: "201825",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-23",
      fiscal_year_week: "201826",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-30",
      fiscal_year_week: "201827",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-06",
      fiscal_year_week: "201828",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-13",
      fiscal_year_week: "201829",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-20",
      fiscal_year_week: "201830",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-27",
      fiscal_year_week: "201831",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-03",
      fiscal_year_week: "201832",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-10",
      fiscal_year_week: "201833",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-17",
      fiscal_year_week: "201834",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-24",
      fiscal_year_week: "201835",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-01",
      fiscal_year_week: "201836",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-08",
      fiscal_year_week: "201837",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-15",
      fiscal_year_week: "201838",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-22",
      fiscal_year_week: "201839",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-29",
      fiscal_year_week: "201840",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-05",
      fiscal_year_week: "201841",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-12",
      fiscal_year_week: "201842",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-19",
      fiscal_year_week: "201843",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-26",
      fiscal_year_week: "201844",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-03",
      fiscal_year_week: "201845",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-10",
      fiscal_year_week: "201846",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-17",
      fiscal_year_week: "201847",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-24",
      fiscal_year_week: "201848",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-31",
      fiscal_year_week: "201849",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-07",
      fiscal_year_week: "201850",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-14",
      fiscal_year_week: "201851",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-21",
      fiscal_year_week: "201852",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-28",
      fiscal_year_week: "201853",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-02-04",
      fiscal_year_week: "201901",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-02-11",
      fiscal_year_week: "201902",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-02-18",
      fiscal_year_week: "201903",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-02-25",
      fiscal_year_week: "201904",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-04",
      fiscal_year_week: "201905",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-11",
      fiscal_year_week: "201906",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-18",
      fiscal_year_week: "201907",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-25",
      fiscal_year_week: "201908",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-01",
      fiscal_year_week: "201909",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-08",
      fiscal_year_week: "201910",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-15",
      fiscal_year_week: "201911",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-22",
      fiscal_year_week: "201912",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-29",
      fiscal_year_week: "201913",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-05-06",
      fiscal_year_week: "201914",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-05-13",
      fiscal_year_week: "201915",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-05-20",
      fiscal_year_week: "201916",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-05-27",
      fiscal_year_week: "201917",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-03",
      fiscal_year_week: "201918",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-10",
      fiscal_year_week: "201919",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-17",
      fiscal_year_week: "201920",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-24",
      fiscal_year_week: "201921",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-01",
      fiscal_year_week: "201922",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-08",
      fiscal_year_week: "201923",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-15",
      fiscal_year_week: "201924",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-22",
      fiscal_year_week: "201925",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-29",
      fiscal_year_week: "201926",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-08-05",
      fiscal_year_week: "201927",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-08-12",
      fiscal_year_week: "201928",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-08-19",
      fiscal_year_week: "201929",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-08-26",
      fiscal_year_week: "201930",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-02",
      fiscal_year_week: "201931",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-09",
      fiscal_year_week: "201932",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-16",
      fiscal_year_week: "201933",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-23",
      fiscal_year_week: "201934",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-30",
      fiscal_year_week: "201935",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-07",
      fiscal_year_week: "201936",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-14",
      fiscal_year_week: "201937",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-21",
      fiscal_year_week: "201938",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-28",
      fiscal_year_week: "201939",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-11-04",
      fiscal_year_week: "201940",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-11-11",
      fiscal_year_week: "201941",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-11-18",
      fiscal_year_week: "201942",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-11-25",
      fiscal_year_week: "201943",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-02",
      fiscal_year_week: "201944",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-09",
      fiscal_year_week: "201945",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-16",
      fiscal_year_week: "201946",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-23",
      fiscal_year_week: "201947",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-30",
      fiscal_year_week: "201948",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-06",
      fiscal_year_week: "201949",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-13",
      fiscal_year_week: "201950",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-20",
      fiscal_year_week: "201951",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-27",
      fiscal_year_week: "201952",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-02-03",
      fiscal_year_week: "202001",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-02-10",
      fiscal_year_week: "202002",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-02-17",
      fiscal_year_week: "202003",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-02-24",
      fiscal_year_week: "202004",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-03",
      fiscal_year_week: "202005",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-10",
      fiscal_year_week: "202006",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-17",
      fiscal_year_week: "202007",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-24",
      fiscal_year_week: "202008",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-31",
      fiscal_year_week: "202009",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-07",
      fiscal_year_week: "202010",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-14",
      fiscal_year_week: "202011",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-21",
      fiscal_year_week: "202012",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-28",
      fiscal_year_week: "202013",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-05-05",
      fiscal_year_week: "202014",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-05-12",
      fiscal_year_week: "202015",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-05-19",
      fiscal_year_week: "202016",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-05-26",
      fiscal_year_week: "202017",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-02",
      fiscal_year_week: "202018",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-09",
      fiscal_year_week: "202019",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-16",
      fiscal_year_week: "202020",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-23",
      fiscal_year_week: "202021",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-30",
      fiscal_year_week: "202022",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-07",
      fiscal_year_week: "202023",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-14",
      fiscal_year_week: "202024",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-21",
      fiscal_year_week: "202025",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-28",
      fiscal_year_week: "202026",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-08-04",
      fiscal_year_week: "202027",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-08-11",
      fiscal_year_week: "202028",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-08-18",
      fiscal_year_week: "202029",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-08-25",
      fiscal_year_week: "202030",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-01",
      fiscal_year_week: "202031",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-08",
      fiscal_year_week: "202032",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-15",
      fiscal_year_week: "202033",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-22",
      fiscal_year_week: "202034",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-29",
      fiscal_year_week: "202035",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-06",
      fiscal_year_week: "202036",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-13",
      fiscal_year_week: "202037",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-20",
      fiscal_year_week: "202038",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-27",
      fiscal_year_week: "202039",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-11-03",
      fiscal_year_week: "202040",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-11-10",
      fiscal_year_week: "202041",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-11-17",
      fiscal_year_week: "202042",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-11-24",
      fiscal_year_week: "202043",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-01",
      fiscal_year_week: "202044",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-08",
      fiscal_year_week: "202045",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-15",
      fiscal_year_week: "202046",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-22",
      fiscal_year_week: "202047",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-29",
      fiscal_year_week: "202048",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-05",
      fiscal_year_week: "202049",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-12",
      fiscal_year_week: "202050",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-19",
      fiscal_year_week: "202051",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-26",
      fiscal_year_week: "202052",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-02-02",
      fiscal_year_week: "202101",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-02-09",
      fiscal_year_week: "202102",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-02-16",
      fiscal_year_week: "202103",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-02-23",
      fiscal_year_week: "202104",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-01",
      fiscal_year_week: "202105",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-08",
      fiscal_year_week: "202106",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-15",
      fiscal_year_week: "202107",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-22",
      fiscal_year_week: "202108",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-29",
      fiscal_year_week: "202109",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-05",
      fiscal_year_week: "202110",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-12",
      fiscal_year_week: "202111",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-19",
      fiscal_year_week: "202112",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-26",
      fiscal_year_week: "202113",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-05-03",
      fiscal_year_week: "202114",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-10",
      fiscal_year_week: "202115",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-17",
      fiscal_year_week: "202116",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-24",
      fiscal_year_week: "202117",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-31",
      fiscal_year_week: "202118",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-07",
      fiscal_year_week: "202119",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-14",
      fiscal_year_week: "202120",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-21",
      fiscal_year_week: "202121",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-28",
      fiscal_year_week: "202122",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-05",
      fiscal_year_week: "202123",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-12",
      fiscal_year_week: "202124",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-19",
      fiscal_year_week: "202125",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-26",
      fiscal_year_week: "202126",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-08-02",
      fiscal_year_week: "202127",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-09",
      fiscal_year_week: "202128",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-16",
      fiscal_year_week: "202129",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-23",
      fiscal_year_week: "202130",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-30",
      fiscal_year_week: "202131",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-06",
      fiscal_year_week: "202132",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-13",
      fiscal_year_week: "202133",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-20",
      fiscal_year_week: "202134",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-27",
      fiscal_year_week: "202135",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-04",
      fiscal_year_week: "202136",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-11",
      fiscal_year_week: "202137",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-18",
      fiscal_year_week: "202138",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-25",
      fiscal_year_week: "202139",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-11-01",
      fiscal_year_week: "202140",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-08",
      fiscal_year_week: "202141",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-15",
      fiscal_year_week: "202142",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-22",
      fiscal_year_week: "202143",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-29",
      fiscal_year_week: "202144",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-06",
      fiscal_year_week: "202145",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-13",
      fiscal_year_week: "202146",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-20",
      fiscal_year_week: "202147",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-27",
      fiscal_year_week: "202148",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-03",
      fiscal_year_week: "202149",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-10",
      fiscal_year_week: "202150",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-17",
      fiscal_year_week: "202151",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-24",
      fiscal_year_week: "202152",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-31",
      fiscal_year_week: "202201",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-07",
      fiscal_year_week: "202202",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-14",
      fiscal_year_week: "202203",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-21",
      fiscal_year_week: "202204",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-28",
      fiscal_year_week: "202205",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-07",
      fiscal_year_week: "202206",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-14",
      fiscal_year_week: "202207",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-21",
      fiscal_year_week: "202208",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-28",
      fiscal_year_week: "202209",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-04",
      fiscal_year_week: "202210",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-11",
      fiscal_year_week: "202211",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-18",
      fiscal_year_week: "202212",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-25",
      fiscal_year_week: "202213",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-05-02",
      fiscal_year_week: "202214",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-09",
      fiscal_year_week: "202215",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-16",
      fiscal_year_week: "202216",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-23",
      fiscal_year_week: "202217",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-30",
      fiscal_year_week: "202218",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-06",
      fiscal_year_week: "202219",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-13",
      fiscal_year_week: "202220",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-20",
      fiscal_year_week: "202221",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-27",
      fiscal_year_week: "202222",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-04",
      fiscal_year_week: "202223",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-11",
      fiscal_year_week: "202224",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-18",
      fiscal_year_week: "202225",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-25",
      fiscal_year_week: "202226",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-08-01",
      fiscal_year_week: "202227",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-08",
      fiscal_year_week: "202228",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-15",
      fiscal_year_week: "202229",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-22",
      fiscal_year_week: "202230",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-29",
      fiscal_year_week: "202231",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-05",
      fiscal_year_week: "202232",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-12",
      fiscal_year_week: "202233",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-19",
      fiscal_year_week: "202234",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-26",
      fiscal_year_week: "202235",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-03",
      fiscal_year_week: "202236",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-10",
      fiscal_year_week: "202237",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-17",
      fiscal_year_week: "202238",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-24",
      fiscal_year_week: "202239",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-31",
      fiscal_year_week: "202240",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-07",
      fiscal_year_week: "202241",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-14",
      fiscal_year_week: "202242",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-21",
      fiscal_year_week: "202243",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-28",
      fiscal_year_week: "202244",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-05",
      fiscal_year_week: "202245",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-12",
      fiscal_year_week: "202246",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-19",
      fiscal_year_week: "202247",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-26",
      fiscal_year_week: "202248",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-02",
      fiscal_year_week: "202249",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-09",
      fiscal_year_week: "202250",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-16",
      fiscal_year_week: "202251",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-23",
      fiscal_year_week: "202252",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-30",
      fiscal_year_week: "202301",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-06",
      fiscal_year_week: "202302",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-13",
      fiscal_year_week: "202303",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-20",
      fiscal_year_week: "202304",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-27",
      fiscal_year_week: "202305",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-06",
      fiscal_year_week: "202306",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-13",
      fiscal_year_week: "202307",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-20",
      fiscal_year_week: "202308",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-27",
      fiscal_year_week: "202309",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-03",
      fiscal_year_week: "202310",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-10",
      fiscal_year_week: "202311",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-17",
      fiscal_year_week: "202312",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-24",
      fiscal_year_week: "202313",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-05-01",
      fiscal_year_week: "202314",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-08",
      fiscal_year_week: "202315",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-15",
      fiscal_year_week: "202316",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-22",
      fiscal_year_week: "202317",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-29",
      fiscal_year_week: "202318",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-05",
      fiscal_year_week: "202319",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-12",
      fiscal_year_week: "202320",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-19",
      fiscal_year_week: "202321",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-26",
      fiscal_year_week: "202322",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-03",
      fiscal_year_week: "202323",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-10",
      fiscal_year_week: "202324",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-17",
      fiscal_year_week: "202325",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-24",
      fiscal_year_week: "202326",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-31",
      fiscal_year_week: "202327",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-07",
      fiscal_year_week: "202328",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-14",
      fiscal_year_week: "202329",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-21",
      fiscal_year_week: "202330",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-28",
      fiscal_year_week: "202331",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-04",
      fiscal_year_week: "202332",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-11",
      fiscal_year_week: "202333",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-18",
      fiscal_year_week: "202334",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-25",
      fiscal_year_week: "202335",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-02",
      fiscal_year_week: "202336",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-09",
      fiscal_year_week: "202337",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-16",
      fiscal_year_week: "202338",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-23",
      fiscal_year_week: "202339",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-30",
      fiscal_year_week: "202340",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-06",
      fiscal_year_week: "202341",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-13",
      fiscal_year_week: "202342",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-20",
      fiscal_year_week: "202343",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-27",
      fiscal_year_week: "202344",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-04",
      fiscal_year_week: "202345",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-11",
      fiscal_year_week: "202346",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-18",
      fiscal_year_week: "202347",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-25",
      fiscal_year_week: "202348",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-01",
      fiscal_year_week: "202349",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-08",
      fiscal_year_week: "202350",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-15",
      fiscal_year_week: "202351",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-22",
      fiscal_year_week: "202352",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-29",
      fiscal_year_week: "202401",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-05",
      fiscal_year_week: "202402",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-12",
      fiscal_year_week: "202403",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-19",
      fiscal_year_week: "202404",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-26",
      fiscal_year_week: "202405",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-05",
      fiscal_year_week: "202406",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-12",
      fiscal_year_week: "202407",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-19",
      fiscal_year_week: "202408",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-26",
      fiscal_year_week: "202409",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-02",
      fiscal_year_week: "202410",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-09",
      fiscal_year_week: "202411",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-16",
      fiscal_year_week: "202412",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-23",
      fiscal_year_week: "202413",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-30",
      fiscal_year_week: "202414",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-07",
      fiscal_year_week: "202415",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-14",
      fiscal_year_week: "202416",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-21",
      fiscal_year_week: "202417",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-28",
      fiscal_year_week: "202418",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-04",
      fiscal_year_week: "202419",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-11",
      fiscal_year_week: "202420",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-18",
      fiscal_year_week: "202421",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-25",
      fiscal_year_week: "202422",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-02",
      fiscal_year_week: "202423",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-09",
      fiscal_year_week: "202424",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-16",
      fiscal_year_week: "202425",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-23",
      fiscal_year_week: "202426",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-30",
      fiscal_year_week: "202427",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-06",
      fiscal_year_week: "202428",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-13",
      fiscal_year_week: "202429",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-20",
      fiscal_year_week: "202430",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-27",
      fiscal_year_week: "202431",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-03",
      fiscal_year_week: "202432",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-10",
      fiscal_year_week: "202433",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-17",
      fiscal_year_week: "202434",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-24",
      fiscal_year_week: "202435",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-01",
      fiscal_year_week: "202436",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-08",
      fiscal_year_week: "202437",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-15",
      fiscal_year_week: "202438",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-22",
      fiscal_year_week: "202439",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-29",
      fiscal_year_week: "202440",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-05",
      fiscal_year_week: "202441",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-12",
      fiscal_year_week: "202442",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-19",
      fiscal_year_week: "202443",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-26",
      fiscal_year_week: "202444",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-03",
      fiscal_year_week: "202445",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-10",
      fiscal_year_week: "202446",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-17",
      fiscal_year_week: "202447",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-24",
      fiscal_year_week: "202448",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-31",
      fiscal_year_week: "202449",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-07",
      fiscal_year_week: "202450",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-14",
      fiscal_year_week: "202451",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-21",
      fiscal_year_week: "202452",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-28",
      fiscal_year_week: "202453",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    }
  ],
  vb: [
    {
      calendar_week_start_date: "2015-02-01",
      fiscal_year_week: "201601",
      fiscal_year_month: "201601",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-02-08",
      fiscal_year_week: "201602",
      fiscal_year_month: "201601",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-02-15",
      fiscal_year_week: "201603",
      fiscal_year_month: "201601",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-02-22",
      fiscal_year_week: "201604",
      fiscal_year_month: "201601",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-03-01",
      fiscal_year_week: "201605",
      fiscal_year_month: "201602",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-03-08",
      fiscal_year_week: "201606",
      fiscal_year_month: "201602",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-03-15",
      fiscal_year_week: "201607",
      fiscal_year_month: "201602",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-03-22",
      fiscal_year_week: "201608",
      fiscal_year_month: "201602",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-03-29",
      fiscal_year_week: "201609",
      fiscal_year_month: "201602",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-04-05",
      fiscal_year_week: "201610",
      fiscal_year_month: "201603",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-04-12",
      fiscal_year_week: "201611",
      fiscal_year_month: "201603",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-04-19",
      fiscal_year_week: "201612",
      fiscal_year_month: "201603",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-04-26",
      fiscal_year_week: "201613",
      fiscal_year_month: "201603",
      fiscal_year_quarter: "201601"
    },
    {
      calendar_week_start_date: "2015-05-03",
      fiscal_year_week: "201614",
      fiscal_year_month: "201604",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-05-10",
      fiscal_year_week: "201615",
      fiscal_year_month: "201604",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-05-17",
      fiscal_year_week: "201616",
      fiscal_year_month: "201604",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-05-24",
      fiscal_year_week: "201617",
      fiscal_year_month: "201604",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-05-31",
      fiscal_year_week: "201618",
      fiscal_year_month: "201605",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-06-07",
      fiscal_year_week: "201619",
      fiscal_year_month: "201605",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-06-14",
      fiscal_year_week: "201620",
      fiscal_year_month: "201605",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-06-21",
      fiscal_year_week: "201621",
      fiscal_year_month: "201605",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-06-28",
      fiscal_year_week: "201622",
      fiscal_year_month: "201605",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-07-05",
      fiscal_year_week: "201623",
      fiscal_year_month: "201606",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-07-12",
      fiscal_year_week: "201624",
      fiscal_year_month: "201606",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-07-19",
      fiscal_year_week: "201625",
      fiscal_year_month: "201606",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-07-26",
      fiscal_year_week: "201626",
      fiscal_year_month: "201606",
      fiscal_year_quarter: "201602"
    },
    {
      calendar_week_start_date: "2015-08-02",
      fiscal_year_week: "201627",
      fiscal_year_month: "201607",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-08-09",
      fiscal_year_week: "201628",
      fiscal_year_month: "201607",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-08-16",
      fiscal_year_week: "201629",
      fiscal_year_month: "201607",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-08-23",
      fiscal_year_week: "201630",
      fiscal_year_month: "201607",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-08-30",
      fiscal_year_week: "201631",
      fiscal_year_month: "201608",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-09-06",
      fiscal_year_week: "201632",
      fiscal_year_month: "201608",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-09-13",
      fiscal_year_week: "201633",
      fiscal_year_month: "201608",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-09-20",
      fiscal_year_week: "201634",
      fiscal_year_month: "201608",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-09-27",
      fiscal_year_week: "201635",
      fiscal_year_month: "201608",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-10-04",
      fiscal_year_week: "201636",
      fiscal_year_month: "201609",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-10-11",
      fiscal_year_week: "201637",
      fiscal_year_month: "201609",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-10-18",
      fiscal_year_week: "201638",
      fiscal_year_month: "201609",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-10-25",
      fiscal_year_week: "201639",
      fiscal_year_month: "201609",
      fiscal_year_quarter: "201603"
    },
    {
      calendar_week_start_date: "2015-11-01",
      fiscal_year_week: "201640",
      fiscal_year_month: "201610",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-11-08",
      fiscal_year_week: "201641",
      fiscal_year_month: "201610",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-11-15",
      fiscal_year_week: "201642",
      fiscal_year_month: "201610",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-11-22",
      fiscal_year_week: "201643",
      fiscal_year_month: "201610",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-11-29",
      fiscal_year_week: "201644",
      fiscal_year_month: "201611",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-12-06",
      fiscal_year_week: "201645",
      fiscal_year_month: "201611",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-12-13",
      fiscal_year_week: "201646",
      fiscal_year_month: "201611",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-12-20",
      fiscal_year_week: "201647",
      fiscal_year_month: "201611",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2015-12-27",
      fiscal_year_week: "201648",
      fiscal_year_month: "201611",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2016-01-03",
      fiscal_year_week: "201649",
      fiscal_year_month: "201612",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2016-01-10",
      fiscal_year_week: "201650",
      fiscal_year_month: "201612",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2016-01-17",
      fiscal_year_week: "201651",
      fiscal_year_month: "201612",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2016-01-24",
      fiscal_year_week: "201652",
      fiscal_year_month: "201612",
      fiscal_year_quarter: "201604"
    },
    {
      calendar_week_start_date: "2016-01-31",
      fiscal_year_week: "201701",
      fiscal_year_month: "201701",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-02-07",
      fiscal_year_week: "201702",
      fiscal_year_month: "201701",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-02-14",
      fiscal_year_week: "201703",
      fiscal_year_month: "201701",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-02-21",
      fiscal_year_week: "201704",
      fiscal_year_month: "201701",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-02-28",
      fiscal_year_week: "201705",
      fiscal_year_month: "201702",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-03-06",
      fiscal_year_week: "201706",
      fiscal_year_month: "201702",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-03-13",
      fiscal_year_week: "201707",
      fiscal_year_month: "201702",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-03-20",
      fiscal_year_week: "201708",
      fiscal_year_month: "201702",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-03-27",
      fiscal_year_week: "201709",
      fiscal_year_month: "201702",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-04-03",
      fiscal_year_week: "201710",
      fiscal_year_month: "201703",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-04-10",
      fiscal_year_week: "201711",
      fiscal_year_month: "201703",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-04-17",
      fiscal_year_week: "201712",
      fiscal_year_month: "201703",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-04-24",
      fiscal_year_week: "201713",
      fiscal_year_month: "201703",
      fiscal_year_quarter: "201701"
    },
    {
      calendar_week_start_date: "2016-05-01",
      fiscal_year_week: "201714",
      fiscal_year_month: "201704",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-05-08",
      fiscal_year_week: "201715",
      fiscal_year_month: "201704",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-05-15",
      fiscal_year_week: "201716",
      fiscal_year_month: "201704",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-05-22",
      fiscal_year_week: "201717",
      fiscal_year_month: "201704",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-05-29",
      fiscal_year_week: "201718",
      fiscal_year_month: "201705",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-06-05",
      fiscal_year_week: "201719",
      fiscal_year_month: "201705",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-06-12",
      fiscal_year_week: "201720",
      fiscal_year_month: "201705",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-06-19",
      fiscal_year_week: "201721",
      fiscal_year_month: "201705",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-06-26",
      fiscal_year_week: "201722",
      fiscal_year_month: "201705",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-07-03",
      fiscal_year_week: "201723",
      fiscal_year_month: "201706",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-07-10",
      fiscal_year_week: "201724",
      fiscal_year_month: "201706",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-07-17",
      fiscal_year_week: "201725",
      fiscal_year_month: "201706",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-07-24",
      fiscal_year_week: "201726",
      fiscal_year_month: "201706",
      fiscal_year_quarter: "201702"
    },
    {
      calendar_week_start_date: "2016-07-31",
      fiscal_year_week: "201727",
      fiscal_year_month: "201707",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-08-07",
      fiscal_year_week: "201728",
      fiscal_year_month: "201707",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-08-14",
      fiscal_year_week: "201729",
      fiscal_year_month: "201707",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-08-21",
      fiscal_year_week: "201730",
      fiscal_year_month: "201707",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-08-28",
      fiscal_year_week: "201731",
      fiscal_year_month: "201708",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-09-04",
      fiscal_year_week: "201732",
      fiscal_year_month: "201708",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-09-11",
      fiscal_year_week: "201733",
      fiscal_year_month: "201708",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-09-18",
      fiscal_year_week: "201734",
      fiscal_year_month: "201708",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-09-25",
      fiscal_year_week: "201735",
      fiscal_year_month: "201708",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-10-02",
      fiscal_year_week: "201736",
      fiscal_year_month: "201709",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-10-09",
      fiscal_year_week: "201737",
      fiscal_year_month: "201709",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-10-16",
      fiscal_year_week: "201738",
      fiscal_year_month: "201709",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-10-23",
      fiscal_year_week: "201739",
      fiscal_year_month: "201709",
      fiscal_year_quarter: "201703"
    },
    {
      calendar_week_start_date: "2016-10-30",
      fiscal_year_week: "201740",
      fiscal_year_month: "201710",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-11-06",
      fiscal_year_week: "201741",
      fiscal_year_month: "201710",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-11-13",
      fiscal_year_week: "201742",
      fiscal_year_month: "201710",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-11-20",
      fiscal_year_week: "201743",
      fiscal_year_month: "201710",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-11-27",
      fiscal_year_week: "201744",
      fiscal_year_month: "201711",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-12-04",
      fiscal_year_week: "201745",
      fiscal_year_month: "201711",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-12-11",
      fiscal_year_week: "201746",
      fiscal_year_month: "201711",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-12-18",
      fiscal_year_week: "201747",
      fiscal_year_month: "201711",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2016-12-25",
      fiscal_year_week: "201748",
      fiscal_year_month: "201711",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2017-01-01",
      fiscal_year_week: "201749",
      fiscal_year_month: "201712",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2017-01-08",
      fiscal_year_week: "201750",
      fiscal_year_month: "201712",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2017-01-15",
      fiscal_year_week: "201751",
      fiscal_year_month: "201712",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2017-01-22",
      fiscal_year_week: "201752",
      fiscal_year_month: "201712",
      fiscal_year_quarter: "201704"
    },
    {
      calendar_week_start_date: "2017-01-29",
      fiscal_year_week: "201801",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-05",
      fiscal_year_week: "201802",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-12",
      fiscal_year_week: "201803",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-19",
      fiscal_year_week: "201804",
      fiscal_year_month: "201801",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-02-26",
      fiscal_year_week: "201805",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-05",
      fiscal_year_week: "201806",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-12",
      fiscal_year_week: "201807",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-19",
      fiscal_year_week: "201808",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-03-26",
      fiscal_year_week: "201809",
      fiscal_year_month: "201802",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-02",
      fiscal_year_week: "201810",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-09",
      fiscal_year_week: "201811",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-16",
      fiscal_year_week: "201812",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-23",
      fiscal_year_week: "201813",
      fiscal_year_month: "201803",
      fiscal_year_quarter: "201801"
    },
    {
      calendar_week_start_date: "2017-04-30",
      fiscal_year_week: "201814",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-07",
      fiscal_year_week: "201815",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-14",
      fiscal_year_week: "201816",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-21",
      fiscal_year_week: "201817",
      fiscal_year_month: "201804",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-05-28",
      fiscal_year_week: "201818",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-04",
      fiscal_year_week: "201819",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-11",
      fiscal_year_week: "201820",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-18",
      fiscal_year_week: "201821",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-06-25",
      fiscal_year_week: "201822",
      fiscal_year_month: "201805",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-02",
      fiscal_year_week: "201823",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-09",
      fiscal_year_week: "201824",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-16",
      fiscal_year_week: "201825",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-23",
      fiscal_year_week: "201826",
      fiscal_year_month: "201806",
      fiscal_year_quarter: "201802"
    },
    {
      calendar_week_start_date: "2017-07-30",
      fiscal_year_week: "201827",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-06",
      fiscal_year_week: "201828",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-13",
      fiscal_year_week: "201829",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-20",
      fiscal_year_week: "201830",
      fiscal_year_month: "201807",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-08-27",
      fiscal_year_week: "201831",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-03",
      fiscal_year_week: "201832",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-10",
      fiscal_year_week: "201833",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-17",
      fiscal_year_week: "201834",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-09-24",
      fiscal_year_week: "201835",
      fiscal_year_month: "201808",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-01",
      fiscal_year_week: "201836",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-08",
      fiscal_year_week: "201837",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-15",
      fiscal_year_week: "201838",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-22",
      fiscal_year_week: "201839",
      fiscal_year_month: "201809",
      fiscal_year_quarter: "201803"
    },
    {
      calendar_week_start_date: "2017-10-29",
      fiscal_year_week: "201840",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-05",
      fiscal_year_week: "201841",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-12",
      fiscal_year_week: "201842",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-19",
      fiscal_year_week: "201843",
      fiscal_year_month: "201810",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-11-26",
      fiscal_year_week: "201844",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-03",
      fiscal_year_week: "201845",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-10",
      fiscal_year_week: "201846",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-17",
      fiscal_year_week: "201847",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-24",
      fiscal_year_week: "201848",
      fiscal_year_month: "201811",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2017-12-31",
      fiscal_year_week: "201849",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-07",
      fiscal_year_week: "201850",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-14",
      fiscal_year_week: "201851",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-21",
      fiscal_year_week: "201852",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-01-28",
      fiscal_year_week: "201853",
      fiscal_year_month: "201812",
      fiscal_year_quarter: "201804"
    },
    {
      calendar_week_start_date: "2018-02-04",
      fiscal_year_week: "201901",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-02-11",
      fiscal_year_week: "201902",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-02-18",
      fiscal_year_week: "201903",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-02-25",
      fiscal_year_week: "201904",
      fiscal_year_month: "201901",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-04",
      fiscal_year_week: "201905",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-11",
      fiscal_year_week: "201906",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-18",
      fiscal_year_week: "201907",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-03-25",
      fiscal_year_week: "201908",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-01",
      fiscal_year_week: "201909",
      fiscal_year_month: "201902",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-08",
      fiscal_year_week: "201910",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-15",
      fiscal_year_week: "201911",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-22",
      fiscal_year_week: "201912",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-04-29",
      fiscal_year_week: "201913",
      fiscal_year_month: "201903",
      fiscal_year_quarter: "201901"
    },
    {
      calendar_week_start_date: "2018-05-06",
      fiscal_year_week: "201914",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-05-13",
      fiscal_year_week: "201915",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-05-20",
      fiscal_year_week: "201916",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-05-27",
      fiscal_year_week: "201917",
      fiscal_year_month: "201904",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-03",
      fiscal_year_week: "201918",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-10",
      fiscal_year_week: "201919",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-17",
      fiscal_year_week: "201920",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-06-24",
      fiscal_year_week: "201921",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-01",
      fiscal_year_week: "201922",
      fiscal_year_month: "201905",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-08",
      fiscal_year_week: "201923",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-15",
      fiscal_year_week: "201924",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-22",
      fiscal_year_week: "201925",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-07-29",
      fiscal_year_week: "201926",
      fiscal_year_month: "201906",
      fiscal_year_quarter: "201902"
    },
    {
      calendar_week_start_date: "2018-08-05",
      fiscal_year_week: "201927",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-08-12",
      fiscal_year_week: "201928",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-08-19",
      fiscal_year_week: "201929",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-08-26",
      fiscal_year_week: "201930",
      fiscal_year_month: "201907",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-02",
      fiscal_year_week: "201931",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-09",
      fiscal_year_week: "201932",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-16",
      fiscal_year_week: "201933",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-23",
      fiscal_year_week: "201934",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-09-30",
      fiscal_year_week: "201935",
      fiscal_year_month: "201908",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-07",
      fiscal_year_week: "201936",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-14",
      fiscal_year_week: "201937",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-21",
      fiscal_year_week: "201938",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-10-28",
      fiscal_year_week: "201939",
      fiscal_year_month: "201909",
      fiscal_year_quarter: "201903"
    },
    {
      calendar_week_start_date: "2018-11-04",
      fiscal_year_week: "201940",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-11-11",
      fiscal_year_week: "201941",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-11-18",
      fiscal_year_week: "201942",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-11-25",
      fiscal_year_week: "201943",
      fiscal_year_month: "201910",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-02",
      fiscal_year_week: "201944",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-09",
      fiscal_year_week: "201945",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-16",
      fiscal_year_week: "201946",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-23",
      fiscal_year_week: "201947",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2018-12-30",
      fiscal_year_week: "201948",
      fiscal_year_month: "201911",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-06",
      fiscal_year_week: "201949",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-13",
      fiscal_year_week: "201950",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-20",
      fiscal_year_week: "201951",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-01-27",
      fiscal_year_week: "201952",
      fiscal_year_month: "201912",
      fiscal_year_quarter: "201904"
    },
    {
      calendar_week_start_date: "2019-02-03",
      fiscal_year_week: "202001",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-02-10",
      fiscal_year_week: "202002",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-02-17",
      fiscal_year_week: "202003",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-02-24",
      fiscal_year_week: "202004",
      fiscal_year_month: "202001",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-03",
      fiscal_year_week: "202005",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-10",
      fiscal_year_week: "202006",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-17",
      fiscal_year_week: "202007",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-24",
      fiscal_year_week: "202008",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-03-31",
      fiscal_year_week: "202009",
      fiscal_year_month: "202002",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-07",
      fiscal_year_week: "202010",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-14",
      fiscal_year_week: "202011",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-21",
      fiscal_year_week: "202012",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-04-28",
      fiscal_year_week: "202013",
      fiscal_year_month: "202003",
      fiscal_year_quarter: "202001"
    },
    {
      calendar_week_start_date: "2019-05-05",
      fiscal_year_week: "202014",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-05-12",
      fiscal_year_week: "202015",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-05-19",
      fiscal_year_week: "202016",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-05-26",
      fiscal_year_week: "202017",
      fiscal_year_month: "202004",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-02",
      fiscal_year_week: "202018",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-09",
      fiscal_year_week: "202019",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-16",
      fiscal_year_week: "202020",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-23",
      fiscal_year_week: "202021",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-06-30",
      fiscal_year_week: "202022",
      fiscal_year_month: "202005",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-07",
      fiscal_year_week: "202023",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-14",
      fiscal_year_week: "202024",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-21",
      fiscal_year_week: "202025",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-07-28",
      fiscal_year_week: "202026",
      fiscal_year_month: "202006",
      fiscal_year_quarter: "202002"
    },
    {
      calendar_week_start_date: "2019-08-04",
      fiscal_year_week: "202027",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-08-11",
      fiscal_year_week: "202028",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-08-18",
      fiscal_year_week: "202029",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-08-25",
      fiscal_year_week: "202030",
      fiscal_year_month: "202007",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-01",
      fiscal_year_week: "202031",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-08",
      fiscal_year_week: "202032",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-15",
      fiscal_year_week: "202033",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-22",
      fiscal_year_week: "202034",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-09-29",
      fiscal_year_week: "202035",
      fiscal_year_month: "202008",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-06",
      fiscal_year_week: "202036",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-13",
      fiscal_year_week: "202037",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-20",
      fiscal_year_week: "202038",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-10-27",
      fiscal_year_week: "202039",
      fiscal_year_month: "202009",
      fiscal_year_quarter: "202003"
    },
    {
      calendar_week_start_date: "2019-11-03",
      fiscal_year_week: "202040",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-11-10",
      fiscal_year_week: "202041",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-11-17",
      fiscal_year_week: "202042",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-11-24",
      fiscal_year_week: "202043",
      fiscal_year_month: "202010",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-01",
      fiscal_year_week: "202044",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-08",
      fiscal_year_week: "202045",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-15",
      fiscal_year_week: "202046",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-22",
      fiscal_year_week: "202047",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2019-12-29",
      fiscal_year_week: "202048",
      fiscal_year_month: "202011",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-05",
      fiscal_year_week: "202049",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-12",
      fiscal_year_week: "202050",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-19",
      fiscal_year_week: "202051",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-01-26",
      fiscal_year_week: "202052",
      fiscal_year_month: "202012",
      fiscal_year_quarter: "202004"
    },
    {
      calendar_week_start_date: "2020-02-02",
      fiscal_year_week: "202101",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-02-09",
      fiscal_year_week: "202102",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-02-16",
      fiscal_year_week: "202103",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-02-23",
      fiscal_year_week: "202104",
      fiscal_year_month: "202101",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-01",
      fiscal_year_week: "202105",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-08",
      fiscal_year_week: "202106",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-15",
      fiscal_year_week: "202107",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-22",
      fiscal_year_week: "202108",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-03-29",
      fiscal_year_week: "202109",
      fiscal_year_month: "202102",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-05",
      fiscal_year_week: "202110",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-12",
      fiscal_year_week: "202111",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-19",
      fiscal_year_week: "202112",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-04-26",
      fiscal_year_week: "202113",
      fiscal_year_month: "202103",
      fiscal_year_quarter: "202101"
    },
    {
      calendar_week_start_date: "2020-05-03",
      fiscal_year_week: "202114",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-10",
      fiscal_year_week: "202115",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-17",
      fiscal_year_week: "202116",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-24",
      fiscal_year_week: "202117",
      fiscal_year_month: "202104",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-05-31",
      fiscal_year_week: "202118",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-07",
      fiscal_year_week: "202119",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-14",
      fiscal_year_week: "202120",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-21",
      fiscal_year_week: "202121",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-06-28",
      fiscal_year_week: "202122",
      fiscal_year_month: "202105",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-05",
      fiscal_year_week: "202123",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-12",
      fiscal_year_week: "202124",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-19",
      fiscal_year_week: "202125",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-07-26",
      fiscal_year_week: "202126",
      fiscal_year_month: "202106",
      fiscal_year_quarter: "202102"
    },
    {
      calendar_week_start_date: "2020-08-02",
      fiscal_year_week: "202127",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-09",
      fiscal_year_week: "202128",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-16",
      fiscal_year_week: "202129",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-23",
      fiscal_year_week: "202130",
      fiscal_year_month: "202107",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-08-30",
      fiscal_year_week: "202131",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-06",
      fiscal_year_week: "202132",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-13",
      fiscal_year_week: "202133",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-20",
      fiscal_year_week: "202134",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-09-27",
      fiscal_year_week: "202135",
      fiscal_year_month: "202108",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-04",
      fiscal_year_week: "202136",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-11",
      fiscal_year_week: "202137",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-18",
      fiscal_year_week: "202138",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-10-25",
      fiscal_year_week: "202139",
      fiscal_year_month: "202109",
      fiscal_year_quarter: "202103"
    },
    {
      calendar_week_start_date: "2020-11-01",
      fiscal_year_week: "202140",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-08",
      fiscal_year_week: "202141",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-15",
      fiscal_year_week: "202142",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-22",
      fiscal_year_week: "202143",
      fiscal_year_month: "202110",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-11-29",
      fiscal_year_week: "202144",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-06",
      fiscal_year_week: "202145",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-13",
      fiscal_year_week: "202146",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-20",
      fiscal_year_week: "202147",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2020-12-27",
      fiscal_year_week: "202148",
      fiscal_year_month: "202111",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-03",
      fiscal_year_week: "202149",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-10",
      fiscal_year_week: "202150",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-17",
      fiscal_year_week: "202151",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-24",
      fiscal_year_week: "202152",
      fiscal_year_month: "202112",
      fiscal_year_quarter: "202104"
    },
    {
      calendar_week_start_date: "2021-01-31",
      fiscal_year_week: "202201",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-07",
      fiscal_year_week: "202202",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-14",
      fiscal_year_week: "202203",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-21",
      fiscal_year_week: "202204",
      fiscal_year_month: "202201",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-02-28",
      fiscal_year_week: "202205",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-07",
      fiscal_year_week: "202206",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-14",
      fiscal_year_week: "202207",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-21",
      fiscal_year_week: "202208",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-03-28",
      fiscal_year_week: "202209",
      fiscal_year_month: "202202",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-04",
      fiscal_year_week: "202210",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-11",
      fiscal_year_week: "202211",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-18",
      fiscal_year_week: "202212",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-04-25",
      fiscal_year_week: "202213",
      fiscal_year_month: "202203",
      fiscal_year_quarter: "202201"
    },
    {
      calendar_week_start_date: "2021-05-02",
      fiscal_year_week: "202214",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-09",
      fiscal_year_week: "202215",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-16",
      fiscal_year_week: "202216",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-23",
      fiscal_year_week: "202217",
      fiscal_year_month: "202204",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-05-30",
      fiscal_year_week: "202218",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-06",
      fiscal_year_week: "202219",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-13",
      fiscal_year_week: "202220",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-20",
      fiscal_year_week: "202221",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-06-27",
      fiscal_year_week: "202222",
      fiscal_year_month: "202205",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-04",
      fiscal_year_week: "202223",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-11",
      fiscal_year_week: "202224",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-18",
      fiscal_year_week: "202225",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-07-25",
      fiscal_year_week: "202226",
      fiscal_year_month: "202206",
      fiscal_year_quarter: "202202"
    },
    {
      calendar_week_start_date: "2021-08-01",
      fiscal_year_week: "202227",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-08",
      fiscal_year_week: "202228",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-15",
      fiscal_year_week: "202229",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-22",
      fiscal_year_week: "202230",
      fiscal_year_month: "202207",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-08-29",
      fiscal_year_week: "202231",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-05",
      fiscal_year_week: "202232",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-12",
      fiscal_year_week: "202233",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-19",
      fiscal_year_week: "202234",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-09-26",
      fiscal_year_week: "202235",
      fiscal_year_month: "202208",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-03",
      fiscal_year_week: "202236",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-10",
      fiscal_year_week: "202237",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-17",
      fiscal_year_week: "202238",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-24",
      fiscal_year_week: "202239",
      fiscal_year_month: "202209",
      fiscal_year_quarter: "202203"
    },
    {
      calendar_week_start_date: "2021-10-31",
      fiscal_year_week: "202240",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-07",
      fiscal_year_week: "202241",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-14",
      fiscal_year_week: "202242",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-21",
      fiscal_year_week: "202243",
      fiscal_year_month: "202210",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-11-28",
      fiscal_year_week: "202244",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-05",
      fiscal_year_week: "202245",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-12",
      fiscal_year_week: "202246",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-19",
      fiscal_year_week: "202247",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2021-12-26",
      fiscal_year_week: "202248",
      fiscal_year_month: "202211",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-02",
      fiscal_year_week: "202249",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-09",
      fiscal_year_week: "202250",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-16",
      fiscal_year_week: "202251",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-23",
      fiscal_year_week: "202252",
      fiscal_year_month: "202212",
      fiscal_year_quarter: "202204"
    },
    {
      calendar_week_start_date: "2022-01-30",
      fiscal_year_week: "202301",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-06",
      fiscal_year_week: "202302",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-13",
      fiscal_year_week: "202303",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-20",
      fiscal_year_week: "202304",
      fiscal_year_month: "202301",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-02-27",
      fiscal_year_week: "202305",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-06",
      fiscal_year_week: "202306",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-13",
      fiscal_year_week: "202307",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-20",
      fiscal_year_week: "202308",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-03-27",
      fiscal_year_week: "202309",
      fiscal_year_month: "202302",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-03",
      fiscal_year_week: "202310",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-10",
      fiscal_year_week: "202311",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-17",
      fiscal_year_week: "202312",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-04-24",
      fiscal_year_week: "202313",
      fiscal_year_month: "202303",
      fiscal_year_quarter: "202301"
    },
    {
      calendar_week_start_date: "2022-05-01",
      fiscal_year_week: "202314",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-08",
      fiscal_year_week: "202315",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-15",
      fiscal_year_week: "202316",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-22",
      fiscal_year_week: "202317",
      fiscal_year_month: "202304",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-05-29",
      fiscal_year_week: "202318",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-05",
      fiscal_year_week: "202319",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-12",
      fiscal_year_week: "202320",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-19",
      fiscal_year_week: "202321",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-06-26",
      fiscal_year_week: "202322",
      fiscal_year_month: "202305",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-03",
      fiscal_year_week: "202323",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-10",
      fiscal_year_week: "202324",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-17",
      fiscal_year_week: "202325",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-24",
      fiscal_year_week: "202326",
      fiscal_year_month: "202306",
      fiscal_year_quarter: "202302"
    },
    {
      calendar_week_start_date: "2022-07-31",
      fiscal_year_week: "202327",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-07",
      fiscal_year_week: "202328",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-14",
      fiscal_year_week: "202329",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-21",
      fiscal_year_week: "202330",
      fiscal_year_month: "202307",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-08-28",
      fiscal_year_week: "202331",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-04",
      fiscal_year_week: "202332",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-11",
      fiscal_year_week: "202333",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-18",
      fiscal_year_week: "202334",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-09-25",
      fiscal_year_week: "202335",
      fiscal_year_month: "202308",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-02",
      fiscal_year_week: "202336",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-09",
      fiscal_year_week: "202337",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-16",
      fiscal_year_week: "202338",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-23",
      fiscal_year_week: "202339",
      fiscal_year_month: "202309",
      fiscal_year_quarter: "202303"
    },
    {
      calendar_week_start_date: "2022-10-30",
      fiscal_year_week: "202340",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-06",
      fiscal_year_week: "202341",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-13",
      fiscal_year_week: "202342",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-20",
      fiscal_year_week: "202343",
      fiscal_year_month: "202310",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-11-27",
      fiscal_year_week: "202344",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-04",
      fiscal_year_week: "202345",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-11",
      fiscal_year_week: "202346",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-18",
      fiscal_year_week: "202347",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2022-12-25",
      fiscal_year_week: "202348",
      fiscal_year_month: "202311",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-01",
      fiscal_year_week: "202349",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-08",
      fiscal_year_week: "202350",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-15",
      fiscal_year_week: "202351",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-22",
      fiscal_year_week: "202352",
      fiscal_year_month: "202312",
      fiscal_year_quarter: "202304"
    },
    {
      calendar_week_start_date: "2023-01-29",
      fiscal_year_week: "202401",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-05",
      fiscal_year_week: "202402",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-12",
      fiscal_year_week: "202403",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-19",
      fiscal_year_week: "202404",
      fiscal_year_month: "202401",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-02-26",
      fiscal_year_week: "202405",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-05",
      fiscal_year_week: "202406",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-12",
      fiscal_year_week: "202407",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-19",
      fiscal_year_week: "202408",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-03-26",
      fiscal_year_week: "202409",
      fiscal_year_month: "202402",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-02",
      fiscal_year_week: "202410",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-09",
      fiscal_year_week: "202411",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-16",
      fiscal_year_week: "202412",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-23",
      fiscal_year_week: "202413",
      fiscal_year_month: "202403",
      fiscal_year_quarter: "202401"
    },
    {
      calendar_week_start_date: "2023-04-30",
      fiscal_year_week: "202414",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-07",
      fiscal_year_week: "202415",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-14",
      fiscal_year_week: "202416",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-21",
      fiscal_year_week: "202417",
      fiscal_year_month: "202404",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-05-28",
      fiscal_year_week: "202418",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-04",
      fiscal_year_week: "202419",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-11",
      fiscal_year_week: "202420",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-18",
      fiscal_year_week: "202421",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-06-25",
      fiscal_year_week: "202422",
      fiscal_year_month: "202405",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-02",
      fiscal_year_week: "202423",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-09",
      fiscal_year_week: "202424",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-16",
      fiscal_year_week: "202425",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-23",
      fiscal_year_week: "202426",
      fiscal_year_month: "202406",
      fiscal_year_quarter: "202402"
    },
    {
      calendar_week_start_date: "2023-07-30",
      fiscal_year_week: "202427",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-06",
      fiscal_year_week: "202428",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-13",
      fiscal_year_week: "202429",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-20",
      fiscal_year_week: "202430",
      fiscal_year_month: "202407",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-08-27",
      fiscal_year_week: "202431",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-03",
      fiscal_year_week: "202432",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-10",
      fiscal_year_week: "202433",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-17",
      fiscal_year_week: "202434",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-09-24",
      fiscal_year_week: "202435",
      fiscal_year_month: "202408",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-01",
      fiscal_year_week: "202436",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-08",
      fiscal_year_week: "202437",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-15",
      fiscal_year_week: "202438",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-22",
      fiscal_year_week: "202439",
      fiscal_year_month: "202409",
      fiscal_year_quarter: "202403"
    },
    {
      calendar_week_start_date: "2023-10-29",
      fiscal_year_week: "202440",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-05",
      fiscal_year_week: "202441",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-12",
      fiscal_year_week: "202442",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-19",
      fiscal_year_week: "202443",
      fiscal_year_month: "202410",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-11-26",
      fiscal_year_week: "202444",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-03",
      fiscal_year_week: "202445",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-10",
      fiscal_year_week: "202446",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-17",
      fiscal_year_week: "202447",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-24",
      fiscal_year_week: "202448",
      fiscal_year_month: "202411",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2023-12-31",
      fiscal_year_week: "202449",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-07",
      fiscal_year_week: "202450",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-14",
      fiscal_year_week: "202451",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-21",
      fiscal_year_week: "202452",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-01-28",
      fiscal_year_week: "202453",
      fiscal_year_month: "202412",
      fiscal_year_quarter: "202404"
    },
    {
      calendar_week_start_date: "2024-02-04",
      fiscal_year_week: "202501",
      fiscal_year_month: "202501",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-02-11",
      fiscal_year_week: "202502",
      fiscal_year_month: "202501",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-02-18",
      fiscal_year_week: "202503",
      fiscal_year_month: "202501",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-02-25",
      fiscal_year_week: "202504",
      fiscal_year_month: "202501",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-03-03",
      fiscal_year_week: "202505",
      fiscal_year_month: "202502",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-03-10",
      fiscal_year_week: "202506",
      fiscal_year_month: "202502",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-03-17",
      fiscal_year_week: "202507",
      fiscal_year_month: "202502",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-03-24",
      fiscal_year_week: "202508",
      fiscal_year_month: "202502",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-03-31",
      fiscal_year_week: "202509",
      fiscal_year_month: "202502",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-04-07",
      fiscal_year_week: "202510",
      fiscal_year_month: "202503",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-04-14",
      fiscal_year_week: "202511",
      fiscal_year_month: "202503",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-04-21",
      fiscal_year_week: "202512",
      fiscal_year_month: "202503",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-04-28",
      fiscal_year_week: "202513",
      fiscal_year_month: "202503",
      fiscal_year_quarter: "202501"
    },
    {
      calendar_week_start_date: "2024-05-05",
      fiscal_year_week: "202514",
      fiscal_year_month: "202504",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-05-12",
      fiscal_year_week: "202515",
      fiscal_year_month: "202504",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-05-19",
      fiscal_year_week: "202516",
      fiscal_year_month: "202504",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-05-26",
      fiscal_year_week: "202517",
      fiscal_year_month: "202504",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-06-02",
      fiscal_year_week: "202518",
      fiscal_year_month: "202505",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-06-09",
      fiscal_year_week: "202519",
      fiscal_year_month: "202505",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-06-16",
      fiscal_year_week: "202520",
      fiscal_year_month: "202505",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-06-23",
      fiscal_year_week: "202521",
      fiscal_year_month: "202505",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-06-30",
      fiscal_year_week: "202522",
      fiscal_year_month: "202505",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-07-07",
      fiscal_year_week: "202523",
      fiscal_year_month: "202506",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-07-14",
      fiscal_year_week: "202524",
      fiscal_year_month: "202506",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-07-21",
      fiscal_year_week: "202525",
      fiscal_year_month: "202506",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-07-28",
      fiscal_year_week: "202526",
      fiscal_year_month: "202506",
      fiscal_year_quarter: "202502"
    },
    {
      calendar_week_start_date: "2024-08-04",
      fiscal_year_week: "202527",
      fiscal_year_month: "202507",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-08-11",
      fiscal_year_week: "202528",
      fiscal_year_month: "202507",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-08-18",
      fiscal_year_week: "202529",
      fiscal_year_month: "202507",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-08-25",
      fiscal_year_week: "202530",
      fiscal_year_month: "202507",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-09-01",
      fiscal_year_week: "202531",
      fiscal_year_month: "202508",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-09-08",
      fiscal_year_week: "202532",
      fiscal_year_month: "202508",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-09-15",
      fiscal_year_week: "202533",
      fiscal_year_month: "202508",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-09-22",
      fiscal_year_week: "202534",
      fiscal_year_month: "202508",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-09-29",
      fiscal_year_week: "202535",
      fiscal_year_month: "202508",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-10-06",
      fiscal_year_week: "202536",
      fiscal_year_month: "202509",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-10-13",
      fiscal_year_week: "202537",
      fiscal_year_month: "202509",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-10-20",
      fiscal_year_week: "202538",
      fiscal_year_month: "202509",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-10-27",
      fiscal_year_week: "202539",
      fiscal_year_month: "202509",
      fiscal_year_quarter: "202503"
    },
    {
      calendar_week_start_date: "2024-11-03",
      fiscal_year_week: "202540",
      fiscal_year_month: "202510",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-11-10",
      fiscal_year_week: "202541",
      fiscal_year_month: "202510",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-11-17",
      fiscal_year_week: "202542",
      fiscal_year_month: "202510",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-11-24",
      fiscal_year_week: "202543",
      fiscal_year_month: "202510",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-12-01",
      fiscal_year_week: "202544",
      fiscal_year_month: "202511",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-12-08",
      fiscal_year_week: "202545",
      fiscal_year_month: "202511",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-12-15",
      fiscal_year_week: "202546",
      fiscal_year_month: "202511",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-12-22",
      fiscal_year_week: "202547",
      fiscal_year_month: "202511",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2024-12-29",
      fiscal_year_week: "202548",
      fiscal_year_month: "202511",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2025-01-05",
      fiscal_year_week: "202549",
      fiscal_year_month: "202512",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2025-01-12",
      fiscal_year_week: "202550",
      fiscal_year_month: "202512",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2025-01-19",
      fiscal_year_week: "202551",
      fiscal_year_month: "202512",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2025-01-26",
      fiscal_year_week: "202552",
      fiscal_year_month: "202512",
      fiscal_year_quarter: "202504"
    },
    {
      calendar_week_start_date: "2025-02-02",
      fiscal_year_week: "202601",
      fiscal_year_month: "202601",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-02-09",
      fiscal_year_week: "202602",
      fiscal_year_month: "202601",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-02-16",
      fiscal_year_week: "202603",
      fiscal_year_month: "202601",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-02-23",
      fiscal_year_week: "202604",
      fiscal_year_month: "202601",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-03-02",
      fiscal_year_week: "202605",
      fiscal_year_month: "202602",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-03-09",
      fiscal_year_week: "202606",
      fiscal_year_month: "202602",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-03-16",
      fiscal_year_week: "202607",
      fiscal_year_month: "202602",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-03-23",
      fiscal_year_week: "202608",
      fiscal_year_month: "202602",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-03-30",
      fiscal_year_week: "202609",
      fiscal_year_month: "202602",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-04-06",
      fiscal_year_week: "202610",
      fiscal_year_month: "202603",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-04-13",
      fiscal_year_week: "202611",
      fiscal_year_month: "202603",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-04-20",
      fiscal_year_week: "202612",
      fiscal_year_month: "202603",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-04-27",
      fiscal_year_week: "202613",
      fiscal_year_month: "202603",
      fiscal_year_quarter: "202601"
    },
    {
      calendar_week_start_date: "2025-05-04",
      fiscal_year_week: "202614",
      fiscal_year_month: "202604",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-05-11",
      fiscal_year_week: "202615",
      fiscal_year_month: "202604",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-05-18",
      fiscal_year_week: "202616",
      fiscal_year_month: "202604",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-05-25",
      fiscal_year_week: "202617",
      fiscal_year_month: "202604",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-06-01",
      fiscal_year_week: "202618",
      fiscal_year_month: "202605",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-06-08",
      fiscal_year_week: "202619",
      fiscal_year_month: "202605",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-06-15",
      fiscal_year_week: "202620",
      fiscal_year_month: "202605",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-06-22",
      fiscal_year_week: "202621",
      fiscal_year_month: "202605",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-06-29",
      fiscal_year_week: "202622",
      fiscal_year_month: "202605",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-07-06",
      fiscal_year_week: "202623",
      fiscal_year_month: "202606",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-07-13",
      fiscal_year_week: "202624",
      fiscal_year_month: "202606",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-07-20",
      fiscal_year_week: "202625",
      fiscal_year_month: "202606",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-07-27",
      fiscal_year_week: "202626",
      fiscal_year_month: "202606",
      fiscal_year_quarter: "202602"
    },
    {
      calendar_week_start_date: "2025-08-03",
      fiscal_year_week: "202627",
      fiscal_year_month: "202607",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-08-10",
      fiscal_year_week: "202628",
      fiscal_year_month: "202607",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-08-17",
      fiscal_year_week: "202629",
      fiscal_year_month: "202607",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-08-24",
      fiscal_year_week: "202630",
      fiscal_year_month: "202607",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-08-31",
      fiscal_year_week: "202631",
      fiscal_year_month: "202608",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-09-07",
      fiscal_year_week: "202632",
      fiscal_year_month: "202608",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-09-14",
      fiscal_year_week: "202633",
      fiscal_year_month: "202608",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-09-21",
      fiscal_year_week: "202634",
      fiscal_year_month: "202608",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-09-28",
      fiscal_year_week: "202635",
      fiscal_year_month: "202608",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-10-05",
      fiscal_year_week: "202636",
      fiscal_year_month: "202609",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-10-12",
      fiscal_year_week: "202637",
      fiscal_year_month: "202609",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-10-19",
      fiscal_year_week: "202638",
      fiscal_year_month: "202609",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-10-26",
      fiscal_year_week: "202639",
      fiscal_year_month: "202609",
      fiscal_year_quarter: "202603"
    },
    {
      calendar_week_start_date: "2025-11-02",
      fiscal_year_week: "202640",
      fiscal_year_month: "202610",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-11-09",
      fiscal_year_week: "202641",
      fiscal_year_month: "202610",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-11-16",
      fiscal_year_week: "202642",
      fiscal_year_month: "202610",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-11-23",
      fiscal_year_week: "202643",
      fiscal_year_month: "202610",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-11-30",
      fiscal_year_week: "202644",
      fiscal_year_month: "202611",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-12-07",
      fiscal_year_week: "202645",
      fiscal_year_month: "202611",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-12-14",
      fiscal_year_week: "202646",
      fiscal_year_month: "202611",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-12-21",
      fiscal_year_week: "202647",
      fiscal_year_month: "202611",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2025-12-28",
      fiscal_year_week: "202648",
      fiscal_year_month: "202611",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2026-01-04",
      fiscal_year_week: "202649",
      fiscal_year_month: "202612",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2026-01-11",
      fiscal_year_week: "202650",
      fiscal_year_month: "202612",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2026-01-18",
      fiscal_year_week: "202651",
      fiscal_year_month: "202612",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2026-01-25",
      fiscal_year_week: "202652",
      fiscal_year_month: "202612",
      fiscal_year_quarter: "202604"
    },
    {
      calendar_week_start_date: "2026-02-01",
      fiscal_year_week: "202701",
      fiscal_year_month: "202701",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-02-08",
      fiscal_year_week: "202702",
      fiscal_year_month: "202701",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-02-15",
      fiscal_year_week: "202703",
      fiscal_year_month: "202701",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-02-22",
      fiscal_year_week: "202704",
      fiscal_year_month: "202701",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-03-01",
      fiscal_year_week: "202705",
      fiscal_year_month: "202702",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-03-08",
      fiscal_year_week: "202706",
      fiscal_year_month: "202702",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-03-15",
      fiscal_year_week: "202707",
      fiscal_year_month: "202702",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-03-22",
      fiscal_year_week: "202708",
      fiscal_year_month: "202702",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-03-29",
      fiscal_year_week: "202709",
      fiscal_year_month: "202702",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-04-05",
      fiscal_year_week: "202710",
      fiscal_year_month: "202703",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-04-12",
      fiscal_year_week: "202711",
      fiscal_year_month: "202703",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-04-19",
      fiscal_year_week: "202712",
      fiscal_year_month: "202703",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-04-26",
      fiscal_year_week: "202713",
      fiscal_year_month: "202703",
      fiscal_year_quarter: "202701"
    },
    {
      calendar_week_start_date: "2026-05-03",
      fiscal_year_week: "202714",
      fiscal_year_month: "202704",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-05-10",
      fiscal_year_week: "202715",
      fiscal_year_month: "202704",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-05-17",
      fiscal_year_week: "202716",
      fiscal_year_month: "202704",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-05-24",
      fiscal_year_week: "202717",
      fiscal_year_month: "202704",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-05-31",
      fiscal_year_week: "202718",
      fiscal_year_month: "202705",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-06-07",
      fiscal_year_week: "202719",
      fiscal_year_month: "202705",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-06-14",
      fiscal_year_week: "202720",
      fiscal_year_month: "202705",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-06-21",
      fiscal_year_week: "202721",
      fiscal_year_month: "202705",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-06-28",
      fiscal_year_week: "202722",
      fiscal_year_month: "202705",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-07-05",
      fiscal_year_week: "202723",
      fiscal_year_month: "202706",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-07-12",
      fiscal_year_week: "202724",
      fiscal_year_month: "202706",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-07-19",
      fiscal_year_week: "202725",
      fiscal_year_month: "202706",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-07-26",
      fiscal_year_week: "202726",
      fiscal_year_month: "202706",
      fiscal_year_quarter: "202702"
    },
    {
      calendar_week_start_date: "2026-08-02",
      fiscal_year_week: "202727",
      fiscal_year_month: "202707",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-08-09",
      fiscal_year_week: "202728",
      fiscal_year_month: "202707",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-08-16",
      fiscal_year_week: "202729",
      fiscal_year_month: "202707",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-08-23",
      fiscal_year_week: "202730",
      fiscal_year_month: "202707",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-08-30",
      fiscal_year_week: "202731",
      fiscal_year_month: "202708",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-09-06",
      fiscal_year_week: "202732",
      fiscal_year_month: "202708",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-09-13",
      fiscal_year_week: "202733",
      fiscal_year_month: "202708",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-09-20",
      fiscal_year_week: "202734",
      fiscal_year_month: "202708",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-09-27",
      fiscal_year_week: "202735",
      fiscal_year_month: "202708",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-10-04",
      fiscal_year_week: "202736",
      fiscal_year_month: "202709",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-10-11",
      fiscal_year_week: "202737",
      fiscal_year_month: "202709",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-10-18",
      fiscal_year_week: "202738",
      fiscal_year_month: "202709",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-10-25",
      fiscal_year_week: "202739",
      fiscal_year_month: "202709",
      fiscal_year_quarter: "202703"
    },
    {
      calendar_week_start_date: "2026-11-01",
      fiscal_year_week: "202740",
      fiscal_year_month: "202710",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-11-08",
      fiscal_year_week: "202741",
      fiscal_year_month: "202710",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-11-15",
      fiscal_year_week: "202742",
      fiscal_year_month: "202710",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-11-22",
      fiscal_year_week: "202743",
      fiscal_year_month: "202710",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-11-29",
      fiscal_year_week: "202744",
      fiscal_year_month: "202711",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-12-06",
      fiscal_year_week: "202745",
      fiscal_year_month: "202711",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-12-13",
      fiscal_year_week: "202746",
      fiscal_year_month: "202711",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-12-20",
      fiscal_year_week: "202747",
      fiscal_year_month: "202711",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2026-12-27",
      fiscal_year_week: "202748",
      fiscal_year_month: "202711",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2027-01-03",
      fiscal_year_week: "202749",
      fiscal_year_month: "202712",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2027-01-10",
      fiscal_year_week: "202750",
      fiscal_year_month: "202712",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2027-01-17",
      fiscal_year_week: "202751",
      fiscal_year_month: "202712",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2027-01-24",
      fiscal_year_week: "202752",
      fiscal_year_month: "202712",
      fiscal_year_quarter: "202704"
    },
    {
      calendar_week_start_date: "2027-01-31",
      fiscal_year_week: "202801",
      fiscal_year_month: "202801",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-02-07",
      fiscal_year_week: "202802",
      fiscal_year_month: "202801",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-02-14",
      fiscal_year_week: "202803",
      fiscal_year_month: "202801",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-02-21",
      fiscal_year_week: "202804",
      fiscal_year_month: "202801",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-02-28",
      fiscal_year_week: "202805",
      fiscal_year_month: "202802",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-03-07",
      fiscal_year_week: "202806",
      fiscal_year_month: "202802",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-03-14",
      fiscal_year_week: "202807",
      fiscal_year_month: "202802",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-03-21",
      fiscal_year_week: "202808",
      fiscal_year_month: "202802",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-03-28",
      fiscal_year_week: "202809",
      fiscal_year_month: "202802",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-04-04",
      fiscal_year_week: "202810",
      fiscal_year_month: "202803",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-04-11",
      fiscal_year_week: "202811",
      fiscal_year_month: "202803",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-04-18",
      fiscal_year_week: "202812",
      fiscal_year_month: "202803",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-04-25",
      fiscal_year_week: "202813",
      fiscal_year_month: "202803",
      fiscal_year_quarter: "202801"
    },
    {
      calendar_week_start_date: "2027-05-02",
      fiscal_year_week: "202814",
      fiscal_year_month: "202804",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-05-09",
      fiscal_year_week: "202815",
      fiscal_year_month: "202804",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-05-16",
      fiscal_year_week: "202816",
      fiscal_year_month: "202804",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-05-23",
      fiscal_year_week: "202817",
      fiscal_year_month: "202804",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-05-30",
      fiscal_year_week: "202818",
      fiscal_year_month: "202805",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-06-06",
      fiscal_year_week: "202819",
      fiscal_year_month: "202805",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-06-13",
      fiscal_year_week: "202820",
      fiscal_year_month: "202805",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-06-20",
      fiscal_year_week: "202821",
      fiscal_year_month: "202805",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-06-27",
      fiscal_year_week: "202822",
      fiscal_year_month: "202805",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-07-04",
      fiscal_year_week: "202823",
      fiscal_year_month: "202806",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-07-11",
      fiscal_year_week: "202824",
      fiscal_year_month: "202806",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-07-18",
      fiscal_year_week: "202825",
      fiscal_year_month: "202806",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-07-25",
      fiscal_year_week: "202826",
      fiscal_year_month: "202806",
      fiscal_year_quarter: "202802"
    },
    {
      calendar_week_start_date: "2027-08-01",
      fiscal_year_week: "202827",
      fiscal_year_month: "202807",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-08-08",
      fiscal_year_week: "202828",
      fiscal_year_month: "202807",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-08-15",
      fiscal_year_week: "202829",
      fiscal_year_month: "202807",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-08-22",
      fiscal_year_week: "202830",
      fiscal_year_month: "202807",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-08-29",
      fiscal_year_week: "202831",
      fiscal_year_month: "202808",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-09-05",
      fiscal_year_week: "202832",
      fiscal_year_month: "202808",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-09-12",
      fiscal_year_week: "202833",
      fiscal_year_month: "202808",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-09-19",
      fiscal_year_week: "202834",
      fiscal_year_month: "202808",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-09-26",
      fiscal_year_week: "202835",
      fiscal_year_month: "202808",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-10-03",
      fiscal_year_week: "202836",
      fiscal_year_month: "202809",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-10-10",
      fiscal_year_week: "202837",
      fiscal_year_month: "202809",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-10-17",
      fiscal_year_week: "202838",
      fiscal_year_month: "202809",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-10-24",
      fiscal_year_week: "202839",
      fiscal_year_month: "202809",
      fiscal_year_quarter: "202803"
    },
    {
      calendar_week_start_date: "2027-10-31",
      fiscal_year_week: "202840",
      fiscal_year_month: "202810",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-11-07",
      fiscal_year_week: "202841",
      fiscal_year_month: "202810",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-11-14",
      fiscal_year_week: "202842",
      fiscal_year_month: "202810",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-11-21",
      fiscal_year_week: "202843",
      fiscal_year_month: "202810",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-11-28",
      fiscal_year_week: "202844",
      fiscal_year_month: "202811",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-12-05",
      fiscal_year_week: "202845",
      fiscal_year_month: "202811",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-12-12",
      fiscal_year_week: "202846",
      fiscal_year_month: "202811",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-12-19",
      fiscal_year_week: "202847",
      fiscal_year_month: "202811",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2027-12-26",
      fiscal_year_week: "202848",
      fiscal_year_month: "202811",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2028-01-02",
      fiscal_year_week: "202849",
      fiscal_year_month: "202812",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2028-01-09",
      fiscal_year_week: "202850",
      fiscal_year_month: "202812",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2028-01-16",
      fiscal_year_week: "202851",
      fiscal_year_month: "202812",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2028-01-23",
      fiscal_year_week: "202852",
      fiscal_year_month: "202812",
      fiscal_year_quarter: "202804"
    },
    {
      calendar_week_start_date: "2028-01-30",
      fiscal_year_week: "202901",
      fiscal_year_month: "202901",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-02-06",
      fiscal_year_week: "202902",
      fiscal_year_month: "202901",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-02-13",
      fiscal_year_week: "202903",
      fiscal_year_month: "202901",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-02-20",
      fiscal_year_week: "202904",
      fiscal_year_month: "202901",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-02-27",
      fiscal_year_week: "202905",
      fiscal_year_month: "202902",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-03-05",
      fiscal_year_week: "202906",
      fiscal_year_month: "202902",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-03-12",
      fiscal_year_week: "202907",
      fiscal_year_month: "202902",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-03-19",
      fiscal_year_week: "202908",
      fiscal_year_month: "202902",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-03-26",
      fiscal_year_week: "202909",
      fiscal_year_month: "202902",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-04-02",
      fiscal_year_week: "202910",
      fiscal_year_month: "202903",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-04-09",
      fiscal_year_week: "202911",
      fiscal_year_month: "202903",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-04-16",
      fiscal_year_week: "202912",
      fiscal_year_month: "202903",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-04-23",
      fiscal_year_week: "202913",
      fiscal_year_month: "202903",
      fiscal_year_quarter: "202901"
    },
    {
      calendar_week_start_date: "2028-04-30",
      fiscal_year_week: "202914",
      fiscal_year_month: "202904",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-05-07",
      fiscal_year_week: "202915",
      fiscal_year_month: "202904",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-05-14",
      fiscal_year_week: "202916",
      fiscal_year_month: "202904",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-05-21",
      fiscal_year_week: "202917",
      fiscal_year_month: "202904",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-05-28",
      fiscal_year_week: "202918",
      fiscal_year_month: "202905",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-06-04",
      fiscal_year_week: "202919",
      fiscal_year_month: "202905",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-06-11",
      fiscal_year_week: "202920",
      fiscal_year_month: "202905",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-06-18",
      fiscal_year_week: "202921",
      fiscal_year_month: "202905",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-06-25",
      fiscal_year_week: "202922",
      fiscal_year_month: "202905",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-07-02",
      fiscal_year_week: "202923",
      fiscal_year_month: "202906",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-07-09",
      fiscal_year_week: "202924",
      fiscal_year_month: "202906",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-07-16",
      fiscal_year_week: "202925",
      fiscal_year_month: "202906",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-07-23",
      fiscal_year_week: "202926",
      fiscal_year_month: "202906",
      fiscal_year_quarter: "202902"
    },
    {
      calendar_week_start_date: "2028-07-30",
      fiscal_year_week: "202927",
      fiscal_year_month: "202907",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-08-06",
      fiscal_year_week: "202928",
      fiscal_year_month: "202907",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-08-13",
      fiscal_year_week: "202929",
      fiscal_year_month: "202907",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-08-20",
      fiscal_year_week: "202930",
      fiscal_year_month: "202907",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-08-27",
      fiscal_year_week: "202931",
      fiscal_year_month: "202908",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-09-03",
      fiscal_year_week: "202932",
      fiscal_year_month: "202908",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-09-10",
      fiscal_year_week: "202933",
      fiscal_year_month: "202908",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-09-17",
      fiscal_year_week: "202934",
      fiscal_year_month: "202908",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-09-24",
      fiscal_year_week: "202935",
      fiscal_year_month: "202908",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-10-01",
      fiscal_year_week: "202936",
      fiscal_year_month: "202909",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-10-08",
      fiscal_year_week: "202937",
      fiscal_year_month: "202909",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-10-15",
      fiscal_year_week: "202938",
      fiscal_year_month: "202909",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-10-22",
      fiscal_year_week: "202939",
      fiscal_year_month: "202909",
      fiscal_year_quarter: "202903"
    },
    {
      calendar_week_start_date: "2028-10-29",
      fiscal_year_week: "202940",
      fiscal_year_month: "202910",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-11-05",
      fiscal_year_week: "202941",
      fiscal_year_month: "202910",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-11-12",
      fiscal_year_week: "202942",
      fiscal_year_month: "202910",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-11-19",
      fiscal_year_week: "202943",
      fiscal_year_month: "202910",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-11-26",
      fiscal_year_week: "202944",
      fiscal_year_month: "202911",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-12-03",
      fiscal_year_week: "202945",
      fiscal_year_month: "202911",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-12-10",
      fiscal_year_week: "202946",
      fiscal_year_month: "202911",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-12-17",
      fiscal_year_week: "202947",
      fiscal_year_month: "202911",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-12-24",
      fiscal_year_week: "202948",
      fiscal_year_month: "202911",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2028-12-31",
      fiscal_year_week: "202949",
      fiscal_year_month: "202912",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2029-01-07",
      fiscal_year_week: "202950",
      fiscal_year_month: "202912",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2029-01-14",
      fiscal_year_week: "202951",
      fiscal_year_month: "202912",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2029-01-21",
      fiscal_year_week: "202952",
      fiscal_year_month: "202912",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2029-01-28",
      fiscal_year_week: "202953",
      fiscal_year_month: "202912",
      fiscal_year_quarter: "202904"
    },
    {
      calendar_week_start_date: "2029-02-04",
      fiscal_year_week: "203001",
      fiscal_year_month: "203001",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-02-11",
      fiscal_year_week: "203002",
      fiscal_year_month: "203001",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-02-18",
      fiscal_year_week: "203003",
      fiscal_year_month: "203001",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-02-25",
      fiscal_year_week: "203004",
      fiscal_year_month: "203001",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-03-04",
      fiscal_year_week: "203005",
      fiscal_year_month: "203002",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-03-11",
      fiscal_year_week: "203006",
      fiscal_year_month: "203002",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-03-18",
      fiscal_year_week: "203007",
      fiscal_year_month: "203002",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-03-25",
      fiscal_year_week: "203008",
      fiscal_year_month: "203002",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-04-01",
      fiscal_year_week: "203009",
      fiscal_year_month: "203002",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-04-08",
      fiscal_year_week: "203010",
      fiscal_year_month: "203003",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-04-15",
      fiscal_year_week: "203011",
      fiscal_year_month: "203003",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-04-22",
      fiscal_year_week: "203012",
      fiscal_year_month: "203003",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-04-29",
      fiscal_year_week: "203013",
      fiscal_year_month: "203003",
      fiscal_year_quarter: "203001"
    },
    {
      calendar_week_start_date: "2029-05-06",
      fiscal_year_week: "203014",
      fiscal_year_month: "203004",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-05-13",
      fiscal_year_week: "203015",
      fiscal_year_month: "203004",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-05-20",
      fiscal_year_week: "203016",
      fiscal_year_month: "203004",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-05-27",
      fiscal_year_week: "203017",
      fiscal_year_month: "203004",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-06-03",
      fiscal_year_week: "203018",
      fiscal_year_month: "203005",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-06-10",
      fiscal_year_week: "203019",
      fiscal_year_month: "203005",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-06-17",
      fiscal_year_week: "203020",
      fiscal_year_month: "203005",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-06-24",
      fiscal_year_week: "203021",
      fiscal_year_month: "203005",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-07-01",
      fiscal_year_week: "203022",
      fiscal_year_month: "203005",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-07-08",
      fiscal_year_week: "203023",
      fiscal_year_month: "203006",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-07-15",
      fiscal_year_week: "203024",
      fiscal_year_month: "203006",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-07-22",
      fiscal_year_week: "203025",
      fiscal_year_month: "203006",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-07-29",
      fiscal_year_week: "203026",
      fiscal_year_month: "203006",
      fiscal_year_quarter: "203002"
    },
    {
      calendar_week_start_date: "2029-08-05",
      fiscal_year_week: "203027",
      fiscal_year_month: "203007",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-08-12",
      fiscal_year_week: "203028",
      fiscal_year_month: "203007",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-08-19",
      fiscal_year_week: "203029",
      fiscal_year_month: "203007",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-08-26",
      fiscal_year_week: "203030",
      fiscal_year_month: "203007",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-09-02",
      fiscal_year_week: "203031",
      fiscal_year_month: "203008",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-09-09",
      fiscal_year_week: "203032",
      fiscal_year_month: "203008",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-09-16",
      fiscal_year_week: "203033",
      fiscal_year_month: "203008",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-09-23",
      fiscal_year_week: "203034",
      fiscal_year_month: "203008",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-09-30",
      fiscal_year_week: "203035",
      fiscal_year_month: "203008",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-10-07",
      fiscal_year_week: "203036",
      fiscal_year_month: "203009",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-10-14",
      fiscal_year_week: "203037",
      fiscal_year_month: "203009",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-10-21",
      fiscal_year_week: "203038",
      fiscal_year_month: "203009",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-10-28",
      fiscal_year_week: "203039",
      fiscal_year_month: "203009",
      fiscal_year_quarter: "203003"
    },
    {
      calendar_week_start_date: "2029-11-04",
      fiscal_year_week: "203040",
      fiscal_year_month: "203010",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-11-11",
      fiscal_year_week: "203041",
      fiscal_year_month: "203010",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-11-18",
      fiscal_year_week: "203042",
      fiscal_year_month: "203010",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-11-25",
      fiscal_year_week: "203043",
      fiscal_year_month: "203010",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-12-02",
      fiscal_year_week: "203044",
      fiscal_year_month: "203011",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-12-09",
      fiscal_year_week: "203045",
      fiscal_year_month: "203011",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-12-16",
      fiscal_year_week: "203046",
      fiscal_year_month: "203011",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-12-23",
      fiscal_year_week: "203047",
      fiscal_year_month: "203011",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2029-12-30",
      fiscal_year_week: "203048",
      fiscal_year_month: "203011",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2030-01-06",
      fiscal_year_week: "203049",
      fiscal_year_month: "203012",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2030-01-13",
      fiscal_year_week: "203050",
      fiscal_year_month: "203012",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2030-01-20",
      fiscal_year_week: "203051",
      fiscal_year_month: "203012",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2030-01-27",
      fiscal_year_week: "203052",
      fiscal_year_month: "203012",
      fiscal_year_quarter: "203004"
    },
    {
      calendar_week_start_date: "2030-02-03",
      fiscal_year_week: "203101",
      fiscal_year_month: "203101",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-02-10",
      fiscal_year_week: "203102",
      fiscal_year_month: "203101",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-02-17",
      fiscal_year_week: "203103",
      fiscal_year_month: "203101",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-02-24",
      fiscal_year_week: "203104",
      fiscal_year_month: "203101",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-03-03",
      fiscal_year_week: "203105",
      fiscal_year_month: "203102",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-03-10",
      fiscal_year_week: "203106",
      fiscal_year_month: "203102",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-03-17",
      fiscal_year_week: "203107",
      fiscal_year_month: "203102",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-03-24",
      fiscal_year_week: "203108",
      fiscal_year_month: "203102",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-03-31",
      fiscal_year_week: "203109",
      fiscal_year_month: "203102",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-04-07",
      fiscal_year_week: "203110",
      fiscal_year_month: "203103",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-04-14",
      fiscal_year_week: "203111",
      fiscal_year_month: "203103",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-04-21",
      fiscal_year_week: "203112",
      fiscal_year_month: "203103",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-04-28",
      fiscal_year_week: "203113",
      fiscal_year_month: "203103",
      fiscal_year_quarter: "203101"
    },
    {
      calendar_week_start_date: "2030-05-05",
      fiscal_year_week: "203114",
      fiscal_year_month: "203104",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-05-12",
      fiscal_year_week: "203115",
      fiscal_year_month: "203104",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-05-19",
      fiscal_year_week: "203116",
      fiscal_year_month: "203104",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-05-26",
      fiscal_year_week: "203117",
      fiscal_year_month: "203104",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-06-02",
      fiscal_year_week: "203118",
      fiscal_year_month: "203105",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-06-09",
      fiscal_year_week: "203119",
      fiscal_year_month: "203105",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-06-16",
      fiscal_year_week: "203120",
      fiscal_year_month: "203105",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-06-23",
      fiscal_year_week: "203121",
      fiscal_year_month: "203105",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-06-30",
      fiscal_year_week: "203122",
      fiscal_year_month: "203105",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-07-07",
      fiscal_year_week: "203123",
      fiscal_year_month: "203106",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-07-14",
      fiscal_year_week: "203124",
      fiscal_year_month: "203106",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-07-21",
      fiscal_year_week: "203125",
      fiscal_year_month: "203106",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-07-28",
      fiscal_year_week: "203126",
      fiscal_year_month: "203106",
      fiscal_year_quarter: "203102"
    },
    {
      calendar_week_start_date: "2030-08-04",
      fiscal_year_week: "203127",
      fiscal_year_month: "203107",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-08-11",
      fiscal_year_week: "203128",
      fiscal_year_month: "203107",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-08-18",
      fiscal_year_week: "203129",
      fiscal_year_month: "203107",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-08-25",
      fiscal_year_week: "203130",
      fiscal_year_month: "203107",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-09-01",
      fiscal_year_week: "203131",
      fiscal_year_month: "203108",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-09-08",
      fiscal_year_week: "203132",
      fiscal_year_month: "203108",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-09-15",
      fiscal_year_week: "203133",
      fiscal_year_month: "203108",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-09-22",
      fiscal_year_week: "203134",
      fiscal_year_month: "203108",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-09-29",
      fiscal_year_week: "203135",
      fiscal_year_month: "203108",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-10-06",
      fiscal_year_week: "203136",
      fiscal_year_month: "203109",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-10-13",
      fiscal_year_week: "203137",
      fiscal_year_month: "203109",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-10-20",
      fiscal_year_week: "203138",
      fiscal_year_month: "203109",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-10-27",
      fiscal_year_week: "203139",
      fiscal_year_month: "203109",
      fiscal_year_quarter: "203103"
    },
    {
      calendar_week_start_date: "2030-11-03",
      fiscal_year_week: "203140",
      fiscal_year_month: "203110",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-11-10",
      fiscal_year_week: "203141",
      fiscal_year_month: "203110",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-11-17",
      fiscal_year_week: "203142",
      fiscal_year_month: "203110",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-11-24",
      fiscal_year_week: "203143",
      fiscal_year_month: "203110",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-12-01",
      fiscal_year_week: "203144",
      fiscal_year_month: "203111",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-12-08",
      fiscal_year_week: "203145",
      fiscal_year_month: "203111",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-12-15",
      fiscal_year_week: "203146",
      fiscal_year_month: "203111",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-12-22",
      fiscal_year_week: "203147",
      fiscal_year_month: "203111",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2030-12-29",
      fiscal_year_week: "203148",
      fiscal_year_month: "203111",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2031-01-05",
      fiscal_year_week: "203149",
      fiscal_year_month: "203112",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2031-01-12",
      fiscal_year_week: "203150",
      fiscal_year_month: "203112",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2031-01-19",
      fiscal_year_week: "203151",
      fiscal_year_month: "203112",
      fiscal_year_quarter: "203104"
    },
    {
      calendar_week_start_date: "2031-01-26",
      fiscal_year_week: "203152",
      fiscal_year_month: "203112",
      fiscal_year_quarter: "203104"
    }
  ]
};

export const MIN_VALUE = -99999999;
export const MAX_VALUE = 99999999;

export const DELAYED_ROUTES = ["/", "/login"]; //For these routes, dismissal of snacks will have a delay of 2 seconds

//Default levels aggregate levels for product and store dimensions
export const DEFAULT_LEVELS = {
  product: ["product", "style"],
  store: ["store"]
};
export const SPECIAL_CHARACTER_MAPPING = {
  __ia_char_01: "'",
  __ia_char_02: '"',
  __ia_char_03: "/",
  __ia_char_04: "\\",
  __ia_char_05: "`",
  __ia_char_06: "~",
  __ia_char_07: "!",
  __ia_char_08: "@",
  __ia_char_09: "#",
  __ia_char_10: "$",
  __ia_char_11: "%",
  __ia_char_12: "^",
  __ia_char_13: "&",
  __ia_char_14: "*",
  __ia_char_15: "(",
  __ia_char_16: ")",
  __ia_char_19: "=",
  __ia_char_20: "+",
  __ia_char_21: "{",
  __ia_char_22: "}",
  __ia_char_23: "[",
  __ia_char_24: "]",
  __ia_char_25: "|",
  __ia_char_26: ":",
  __ia_char_27: ";",
  __ia_char_28: "<",
  __ia_char_29: ">",
  __ia_char_30: ",",
  __ia_char_31: ".",
  __ia_char_32: "?"
};

export const TENANT_MAPPING = {
  SIGNET: "signet",
  VS: "victorias-secret",
  GENERIC: "generic",
  PRODUCTIVITY_HELPER: "productivityhelper",
  VB: "vb",
  PARTY_CITY: "partycity",
  PUMA: "puma",
  ARHAUS: "arhaus",
  ARHAUS_REPLICA: "arhaus-replica",
  TOMMY_BAHAMA: "tommy-bahama",
  PLATFORM_INTERNAL: "mtp-internal",
  OOTB_PLANSMART: "ootb-plansmart",
  ARHAUS_PIVOT: "arhaus-pivot",
  PETER_MILLAR: "petermillar"
};

export const ENV_LIST = ["prod", "uat"];

export const HMAC_APIS = [
  "/core/user-role-mgmt/applications",
  "/core/user-role-mgmt/mappings"
];
