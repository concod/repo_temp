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
export const GET_IN_STOCK_TABLE_DATA_SKU =
  "inventory-smart/reporting/in-stock/article";
export const GET_IN_STOCK_TABLE_DATA_STORE =
  "inventory-smart/reporting/in-stock/store";
export const GET_IN_STOCK_KPI_DATA = "inventory-smart/reporting/in-stock/kpi";

export const GET_IN_STOCK_KPI = "inventory-smart/reporting/in-stock/kpi";

export const GET_DC_AVAILABILITY_REPORT_TABLE_DETAILS =
  "inventory-smart/reporting/dc-availability-list";

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
