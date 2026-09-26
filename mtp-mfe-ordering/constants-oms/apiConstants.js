export const FETCH_TABLE_CONFIG = "core/table-fields?table_name=";

//Pack Config Client Config
export const GET_PACK_CONFIG_COLUMN_DATA =
  "inventory-smart/oms/pack-config/table-columns";
export const GET_PACK_CONFIG_ROW_DATA = "inventory-smart/oms/pack-config/data";
export const GET_FISCAL_WEEKS = "inventory-smart/oms/pack-config/fiscal-week";

export const GET_FISCAL_CALENDAR = `/core/timeline/fiscal-calendar-data`;

export const OMS_FISCAL_WEEKS = "inventory-smart/oms/timeline/date-range";

export const CNO_OFFCYCLE_ORDER_CONFIGURATION = "oms_offcycle_order_config";

//Gets the Data for Safety Stock Chart
export const SAFETY_STOCK_GRAPH_VIEW_DATA =
  "inventory-smart/oms/safety-stock-graph";
export const SAFETY_STOCK_GRAPH_VIEW_DATA_VENDOR_STORE =
  "inventory-smart/oms/safety-stock-graph-store";

//Start of Order Repository APIs
export const ORDER_REPOSITORY_FILTER_CONFIG_FOR_VENDOR_DC =
  "Inventorysmart Oms Order Repository";
export const ORDER_REPOSITORY_FILTER_CONFIG_FOR_VENDOR_STORE =
  "Inventorysmart Oms Order Repository Vendor Store";
export const ORDER_REPOSITORY_ORDER_STATUS_SUMMARY_FOR_VENDOR_DC =
  "inventory-smart/oms/get-order-status-summary";
export const ORDER_REPOSITORY_ORDER_STATUS_SUMMARY_FOR_VENDOR_STORE =
  "inventory-smart/oms/get-order-status-store-summary";
export const ORDER_REPOSITORY_ORDERS_TABLE_CONFIG =
  "core/table-fields?table_name=";
export const ORDER_REPOSITORY_TABLE_DATA_FOR_VENDOR_DC =
  "inventory-smart/oms/get-orders-sku-summary";
export const ORDER_REPOSITORY_TABLE_DATA_FOR_VENDOR_STORE =
  "inventory-smart/oms/get-orders-sku-store-summary";
export const ORDER_REPOSITORY_DELETE_ORDERS_FOR_VENDOR_DC =
  "inventory-smart/oms/delete-order";
export const ORDER_REPOSITORY_DELETE_ORDERS_FOR_VENDOR_STORE =
  "inventory-smart/oms/delete-order-store";
export const ORDER_REPOSITORY_UPDATE_ORDERS_FOR_VENDOR_DC =
  "inventory-smart/oms/edit-orders";
export const ORDER_REPOSITORY_UPDATE_ORDERS_FOR_VENDOR_STORE =
  "inventory-smart/oms/edit-orders-vendor-store";
export const ORDER_REPOSITORY_COMMENT_HISTORY =
  "inventory-smart/oms/get-orders-sku-comments";
export const ORDER_REPOSITORY_SAVE_COMMENT =
  "inventory-smart/oms/update-order-comment";
export const ORDER_REPOSITORY_APPROVE_ORDERS_FOR_VENDOR_DC =
  "inventory-smart/oms/order-action";
export const ORDER_REPOSITORY_APPROVE_ORDERS_FOR_VENDOR_STORE =
  "inventory-smart/oms/order-action-store";
//End of Order Repository APIs

//Start of PO Rebalance APIs
export const PO_REBALANCE_FILTER_CONFIG = "PO-Rebalance";
export const PO_REBALANCE_TABLE_FIELDS =
  "inventory-smart/oms/po-rebalancing-choice-channel-table-fields";
export const PO_REBALANCE_SIZE_CHOICE_TABLE_FIELDS =
  "inventory-smart/oms/po-rebalancing-size-channel-table-fields";
export const PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_FIELDS =
  "core/table-fields?table_name=Inventorysmart_oms_po_rebalance";
export const PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_DATA =
  "inventory-smart/oms/get-po-rebalancing-review-recommendation-data";
export const SAVE_DRAFT_PAYLOAD =
  "inventory-smart/oms/save-po-rebalancing-data";
export const PO_BASE_UNIT_KPI_DATA =
  "inventory-smart/oms/get-po-units-before-rebalance";
export const PO_REBALANCE_PROJECTED_BOP_DATA =
  "inventory-smart/oms/get-projected-bop-before-rebalance";
export const PO_REBALANCE_SIZE_CHOICE_TABLE_DATA =
  "inventory-smart/oms/get-po-rebalancing-size-level-data";
export const PO_REBALANCE_TABLE_DATA =
  "inventory-smart/oms/get-po-rebalancing-channel-level-data";
export const DROPDOWN_DATA_FOR_PO = "/inventory-smart/oms/get-po-dropdown-list";
export const OMS_WEEK_LEVEL_SAVETYPE_API =
  "inventory-smart/oms/week-level-savetype";
//End of PO Rebalance APIs

//Start of Create New Order APIs
export const CREATE_NEW_ORDER_FILTER_CONFIG = "Oms Create Order";
export const CREATE_NEW_ORDER_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_new_order";
export const CREATE_NEW_ORDER_TABLE_DATA = "inventory-smart/oms/new-order";
export const CREATE_NEW_ORDER_EDIT_TABLE_DATA = "";
export const CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA =
  "inventory-smart/oms/create-new-order";

//Start of Create New Off Cycle Order APIs
export const CREATE_NEW_OFF_CYCLE_ORDER_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_off_cycle_orders";
export const CREATE_NEW_OFF_CYCLE_ORDER_TABLE_DATA =
  "inventory-smart/oms/new-off-cycle-order";
export const SAVE_OFF_CYCLE_DRAFT = "inventory-smart/oms/save-off-cycle-draft";
export const RUN_OFF_CYCLE_RECOMMENDATION_CALCULATION =
  "inventory-smart/oms/run-off-cycle-recommendation-calculation-cloud";

export const OFF_CYCLE_ORDER_VIEW_DRAFTS =
  "core/table-fields?table_name=oms_offcycle_order_view_drafts";

//Create New Order Vendor Store APIs
export const CREATE_NEW_ORDER_VENDOR_STORE_FILTER_CONFIG =
  "Oms Create Order Store";
export const CREATE_NEW_ORDER_VENDOR_STORE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_new_order_store";
export const CREATE_NEW_ORDER_STORE_TABLE_DATA =
  "inventory-smart/oms/new-order-store";
export const CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA_STORE =
  "inventory-smart/oms/create-new-order-store";

//Off Cycle Order Deep Dive APIs
export const CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_CONFIGURATION =
  "core/table-fields?table_name=inventorysmart_oms_offcycle_deep_dive_download";
export const CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_DATA =
  "inventory-smart/oms/offcycle-deep-dive";
export const CNO_OFFCYCLE_DEEP_DIVE_FILTERS_DATA =
  "inventory-smart/oms/oms-deep-dive-filters-data-by-draft";
export const CNO_OFFCYCLE_DEEP_DIVE_TABLE_CONFIGURATION =
  "core/table-fields?table_name=inventorysmart_oms_offcycle_deep_dive_download";
export const CNO_OFFCYCLE_DEEP_DIVE_TABLE_DATA =
  "inventory-smart/oms/offcycle-deep-dive";

//End of Create New Order APIs

//REPORTS
export const REPORTS_FILTER_CONFIG = "Inventorysmart Oms Reporting";

//Start of Late Orders APIs
export const LATE_ORDERS_PROJECTIONS_TABLE_CONFIG =
  "core/table-fields?table_name=Inventorysmart_oms_late_orders_report";
export const LATE_ORDERS_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/late-orders-report";
//End of Late Orders APIs

//Start of Expedite Orders APIs
export const EXPEDITE_ORDERS_PROJECTIONS_TABLE_CONFIG =
  "core/table-fields?table_name=Inventorysmart_oms_expedite_orders_report";
export const EXPEDITE_ORDERS_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/expedite-orders-report";
//End of Expedite Orders APIs

//Start of Vendor Projections Receipts APIs
export const RECEIPTS_PROJECTIONS_GRAPH =
  "inventory-smart/oms/reporting/vendor-projection/receipts/total-projection";
export const RECEIPTS_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/receipts/vendor-level-projection";
export const RECEIPTS_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/receipts/vendor-level-projection/total-columns";
export const RECEIPTS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/receipts/sku-vendor-level-projection/total-columns";
export const RECEIPTS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/receipts/sku-vendor-level-projection";
export const RECEIPTS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/receipts/dc-size-level-projection/total-columns";
export const RECEIPTS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/receipts/dc-size-level-projection";
//End of Vendor Projections Receipts APIs

//Start of Vendor Projections Orders APIs
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
export const ORDERS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/orders/dc-size-level-projection/total-columns";
export const ORDERS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/orders/dc-size-level-projection";
//End of Vendor Projections Orders APIs

//Start of Vendor Projections Forecasts APIs
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
export const FORECASTING_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/dc-size-level-projection/total-columns";
export const FORECASTING_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/vendor-projection/forecasting/dc-size-level-projection";
//End of Vendor Projections Forecasts APIs

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

export const FUTURE_RECEIPTS_PROJECTIONS_CHART_DATA =
  "inventory-smart/oms/reporting/future-order/total-projection";
export const FUTURE_RECEIPTS_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/future-order/vendor-level-projection";
export const FUTURE_RECEIPTS_SKU_VENDOR_PROJECTIONS_TABLE_DATA =
  "inventory-smart/oms/reporting/future-order/sku-vendor-level-projection";

//Start of Decision Dashboard  APIs
export const DECISION_DASHBOARD_ORDER_KPI_DATA =
  "inventory-smart/oms/dashboard/kpi/orders";
export const DECISION_DASHBOARD_ORDER_ALERT_DATA =
  "inventory-smart/oms/oms_decision_dashboard/alerts_count";

export const ORDER_ALERTS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_alerts";
export const VENDOR_STORE_ALERTS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_alerts_store";
export const ORDER_ALERTS_TABLE_DATA =
  "inventory-smart/oms/oms_decision_dashboard/alerts";
export const OFF_CYCLE_ORDER_ALERT_DATA =
  "inventory-smart/oms/get-all-off-cycle-drafts";
export const RECOMMENDED_ALERTS_TABLE_DATA = "inventory-smart";
export const RECOMMENDED_POPUP_ALERTS_TABLE_DATA = "inventory-smart/oms";
export const UPDATE_RESOLVED_DATA =
  "inventory-smart/oms/oms_decision_dashboard/update-alerts";

//End of Decision Dashboard  APIs

//Start of ORDER MANAGEMENT APIs

//High Level Summary APIs
export const ORDER_MANAGEMENT_FILTER_CONFIG =
  "Inventorysmart Oms Order Management";
export const ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG =
  "Inventorysmart Oms Order Management Vendor Store";

export const ORDER_MANAGEMENT_VIEW_BY_HIERARCHY_OPTIONS =
  "inventory-smart/oms/high-level-summary-hierarchy";
export const ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_CONFIG =
  "inventory-smart/oms/high-level-summary-table-fields";
export const ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_NAME =
  "inventorysmart_oms_high_level_summary";
export const ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/get-oms-high-level-summary";
export const ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_CONFIG_STORE =
  "inventory-smart/oms/high-level-summary-store-table-fields";
export const ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE =
  "inventorysmart_oms_high_level_summary_store";
export const ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA_STORE =
  "inventory-smart/oms/get-oms-high-level-summary-store";
export const ORDER_MANAGEMENT_MAX_EDITABLE_RECEIPT_DATE =
  "inventory-smart/oms/max_editable_expected_receipt_date";

//Matrix Summary APIs
export const l0_TABLE_COLUMN_DATA = "inventory-smart/oms/table/table-columns";
export const l0_TABLE_DATA = "inventory-smart/oms/get-oms-matrix-summary";
export const MATRIX_SUMMARY_TABLE_EDIT_API =
  "inventory-smart/oms/update-matrix-summary";
export const GET_KPI_VALUES =
  "core/tenant-config/1?attribute_name=inv_oms_kpi_config";
export const GET_SETALL_KPI_VALUES =
  "core/tenant-config/1?attribute_name=inv_oms_setall_config";
export const SETALL_MATRIX_SUMMARY_DATA_API =
  "inventory-smart/oms/set-all-matrix-summary";
export const GET_MATRIX_SUMMARY_TABLE_NAME =
  "core/tenant-config/1?attribute_name=inv_oms_hieraracy_config";

//Order Details APIs
export const ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_DATA =
  "inventory-smart/oms/get-store-order-details";
export const ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_order_details";
export const ORDER_MANAGEMENT_ORDER_DETAIL_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/get-store-order-detailed-summary";
export const ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_EDIT =
  "inventory-smart/oms/edit-orders-store";
export const OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE =
  "core/table-fields?table_name=inventorysmart_Store_matrix_summary_orders_store";
export const OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE_TIER =
  "core/table-fields?table_name=inventorysmart_matrix_summary_orders_store";
export const OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_SIZE =
  "core/table-fields?table_name=inventorysmart_Store_matrix_summary_orders_size";
export const OMS_ORDER_DETAIL_SUMMARY_FILTERS_DATA =
  "inventory-smart/oms/oms-vendor-store-filters-data";

export const ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_sku_summary";
export const ORDER_MANAGEMENT_SKU_SUMMARY_DEEP_DIVE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive_recomm";

export const CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA =
  "inventory-smart/oms/table/create_scenario/safety_stock";

export const CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA_STORE =
  "inventory-smart/oms/table/create_scenario/safety-stock-store";
export const ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_sc_recomm";
export const ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/get-recomm-orders-sku-summary";
export const ORDER_MANAGEMENT_EDIT_SKU_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/edit-order-qty";
export const ORDER_MANAGEMENT_UPDATE_SKU_SUMMARY_NOT_BEFORE_AFTER_DATES =
  "inventory-smart/oms/edit-not-before-after-date";
export const ORDER_MANAGEMENT_APPROVE_ORDERS_FOR_VENDOR_DC =
  "inventory-smart/oms/order-action";
export const ORDER_MANAGEMENT_APPROVE_ORDERS_FOR_VENDOR_STORE =
  "inventory-smart/oms/order-action-store";

export const ORDER_MANAGEMENT_ORDER_SUMMARY_BY_GRADES =
  "inventory-smart/oms/kpi/get-orders-summary-by-grades";

//Deep Dive Vendor DC
export const ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive";
export const ORDER_MANAGEMENT_DEEP_DIVE_DOWNLOAD_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive_download";
export const ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA =
  "inventory-smart/oms/table/deep-dive";
export const ORDER_MANAGEMENT_DEEP_DIVE_DOWNLOAD_TABLE_DATA =
  "inventory-smart/oms/table/deep-dive-download";
export const ORDER_MANAGEMENT_DEEP_DIVE_FILTERS =
  "inventory-smart/oms/oms-deep-dive-filters";
export const ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA =
  "inventory-smart/oms/oms-deep-dive-filters-data";

//Deep Dive Vendor To Store
export const OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_CONFIG_FOR_WEEK =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive_vendor_store";
export const OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_CONFIG_FOR_MONTH =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive_vendor_store_month";
export const OMS_VENDOR_TO_STORE_DEEP_DIVE_DOWNLOAD_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_deep_dive_vendor_store";
export const OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_DATA =
  "inventory-smart/oms/table/store-deep-dive";
export const OMS_VENDOR_TO_STORE_DEEP_DIVE_DOWNLOAD_TABLE_DATA =
  "inventory-smart/oms/table/store-deep-dive";
export const OMS_VENDOR_TO_STORE_DEEP_DIVE_FILTERS_DATA =
  "inventory-smart/oms/oms-deep-dive-filters-data-store";

export const ORDER_MANAGEMENT_CREATE_SCENARIO_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_sc_safety_stock";
export const ORDER_MANAGEMENT_CREATE_SCENARIO_STORE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_create_sc_safety_stock_store";
export const ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA =
  "inventory-smart/oms/simulate-scenario";
export const ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA_STORE =
  "inventory-smart/oms/simulate-scenario-store";

export const ORDER_MANAGEMENT_CREATE_SCENARIO_DOWNLOAD_TABLE_DATA =
  "inventory-smart/oms/simulate-scenario?is_download=true";

export const ORDER_MANAGEMENT_CREATE_SCENARIO_DOWNLOAD_TABLE_DATA_STORE =
  "inventory-smart/oms/simulate-scenario-store?is_download=false";

export const CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_scenario_deep_dive_org";
export const SCENARIO_VIEW_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_scenario_deep_dive_sce";
export const SCENARIO_VIEW_TABLE_CONFIG_STORE =
  "core/table-fields?table_name=inventorysmart_oms_scenario_deep_dive_sce_store";
export const CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG_STORE =
  "core/table-fields?table_name=inventorysmart_oms_scenario_deep_dive_org_store";
export const ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG_STORE =
  "core/table-fields?table_name=inventorysmart_oms_create_sc_recomm_store";

export const ORDER_MANAGEMENT_SKU_SUMMARY_UPLOAD_TABLE_CONFIG =
  "core/table-fields?table_name=Inventorysmart_oms_recomm_upload";
export const ORDER_MANAGEMENT_SKU_SUMMARY_UPLOAD =
  "inventory-smart/oms/bulk-recomm-update";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_approval_order";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_CONFIG_FOR_STORE =
  "core/table-fields?table_name=inventorysmart_oms_approval_order_store";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_DATA =
  "inventory-smart/oms/filter-approval-orders";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_STORE_DATA =
  "inventory-smart/oms/filter-approval-orders-store";

export const ORDER_MANAGEMENT_APPROVAL_FLOW_SEND_FOR_APPROVAL =
  "inventory-smart/oms/send_for_approval";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_SEND_FOR_APPROVAL_VENDOR_STORE =
  "inventory-smart/oms/send-for-approval-store";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_APPROVE =
  "inventory-smart/oms/approve_order";
export const ORDER_MANAGEMENT_APPROVAL_FLOW_APPROVE_VENDOR_STORE =
  "inventory-smart/oms/approve-order-store";

export const OMS_APPROVAL_FLOW_CUSTOM_FILTER_FOR_VENDOR_DC =
  "inventory-smart/oms/approval-cross-filter";
export const OMS_APPROVAL_FLOW_CUSTOM_FILTER_FOR_VENDOR_STORE =
  "inventory-smart/oms/approval-cross-filter-store";

//ORDER MANAGEMENT STYLE ORDER SUMMARY APIs
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_style_order_summary";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_TABLE_DATA =
  "inventory-smart/oms/get-style-order-summary";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_UPDATE_DATA =
  "inventory-smart/oms/update-style-order-quantity";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_CHANNEL_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_style_order_channel_summary";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_SIZE_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_style_order_size_summary";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_TABLE_DATA =
  "inventory-smart/oms/get-style-order-detailed-summary";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_UPDATE_DATA =
  "inventory-smart/oms/edit-orders";
export const ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SET_ALL_UPDATE_DATA =
  "inventory-smart/oms/set-all-style-order-summary";

export const ORDER_MANAGEMENT_ORDER_DETAILS_SET_ALL_UPDATE_DATA =
  "inventory-smart/oms/set-all-order-details";
//Off-Cycle Order APIs step 2
export const OFF_CYCLE_ORDER_PRODUCT_DETAILS_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_off_cycle_product_details";
export const OFF_CYCLE_ORDER_PRODUCT_DETAILS_TABLE_DATA =
  "inventory-smart/oms/get-off-cycle-product-details";
export const OFF_CYCLE_ARTICLE_DC_LEVEL_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_off_cycle_dc_level";
export const OFF_CYCLE_ARTICLE_SIZE_LEVEL_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_off_cycle_size_level";
export const OFF_CYCLE_ARTICLE_DC_SIZE_LEVEL_TABLE_DATA =
  "inventory-smart/oms/get-off-cycle-article-dc-size-details";
export const OFF_CYCLE_PRODUCT_DETAILS_UPDATE_DATA =
  "inventory-smart/oms/update-product-details-data";
export const OFF_CYCLE_DC_SIZE_LEVEL_UPDATE_DATA =
  "inventory-smart/oms/update-dc-size-level-data";
export const OFF_CYCLE_ORDER_DELETE_DRAFT =
  "inventory-smart/oms/delete-off-cycle-draft";
export const OFF_CYCLE_ORDER_SET_ALL = "inventory-smart/oms/offcycle-set-all";
export const OFF_CYCLE_ORDER_DC_LIST = "inventory-smart/oms/offcycle-dc-list";
export const OFF_CYCLE_APPROVAL_FLOW_TABLE_CONFIG =
  "core/table-fields?table_name=inventorysmart_oms_off_cycle_approve_order";
export const OFF_CYCLE_APPROVAL_FLOW_TABLE_DATA =
  "inventory-smart/oms/offcycle-approval-flow-data";
export const OFF_CYCLE_APPROVE_ORDERS =
  "inventory-smart/oms/create-offcycle-order";
export const OFF_CYCLE_HIGH_LEVEL_AGGREGATE_TABLE_CONFIG =
  "inventory-smart/oms/get-offcycle-aggr-columns";
export const OFF_CYCLE_HIGH_LEVEL_AGGREGATE_TABLE_DATA =
  "inventory-smart/oms/get-offcycle-aggr-data";
export const OFF_CYCLE_HIGH_LEVEL_AGGREGATE_UPDATE_DATA =
  "inventory-smart/oms/update-offcycle-aggr-data";


   //Ordering Module Configurator
 
 export const GET_ORDERING_MODULE_CONFIGURATOR = 
 "inventory-smart/oms/configurations/module-configurator"

 export const GET_ORDERING_MODULE_PRODUCT_FILTERS =
 "inventory-smart/oms/configurations/filter-configuration/product"

 export const SAVE_ORDERING_MODULE_CONFIGURATION =
 "inventory-smart/oms/configurations/save-configurations"

 export const GET_KPI_DATA = "inventory-smart/oms/configurations/module-configurator";
  export const SAVE_KPI_DATA = "inventory-smart/oms/configurations/save-configurations";