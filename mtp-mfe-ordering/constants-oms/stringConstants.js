export const OMS_MODULE_CONFIGURATION = {
  is_oms_enabled: false,
  hiddenModules: [
    "inventorysmart_order_management",
    "inventorySmart_order_management_deep_drive",
    "inventorySmart_order_management_create_scenario",
    "inventorysmart_order_repository",
    "inventorysmart_create_new_order",
    "inventorysmart_oms_constraints",
    "inventorysmart_oms_configuration",
    "reports_oms",
    "inventorysmart_oms_dashboard",
    "inventorysmart_po_rebalance",
    "inventorysmart_super_admin"
  ],
  screenName: [
    "inventorysmart_order_management",
    "inventorySmart_order_management_deep_drive",
    "inventorySmart_order_management_create_scenario",
    "inventorysmart_order_repository",
    "inventorysmart_create_new_order",
    "inventorysmart_oms_constraints",
    "inventorysmart_oms_configuration",
    "reports_oms",
    "inventorysmart_oms_dashboard",
    "inventorysmart_po_rebalance",
    "inventorysmart_super_admin",
    "Inventorysmart Oms Order Management",
  ],
};

export const OMS_ORDER_MANAGEMENT_SCREENNAME =
  "Inventorysmart Oms Order Management";
export const OMS_ORDER_MANAGEMENT_SCREENNAME_KEY =
  "inventorysmart_order_management";
export const OMS_DEEP_DIVE_SCREENNAME_KEY =
  "inventorySmart_order_management_deep_drive";
export const OMS_CREATE_SCENARIO_SCREENNAME_KEY =
  "inventorySmart_order_management_create_scenario";

export const OMS_CREATE_NEW_ORDER_SCREENNAME_KEY =
  "inventorysmart_create_new_order";

export const OMS_DECISION_DASHBOARD_SCREENNAME_KEY =
  "inventorysmart_oms_dashboard";

export const OMS_CONSTRAINTS_SCREENNAME_KEY = "inventorysmart_oms_constraints";
export const OMS_CONFIGURATION_SCREENNAME_KEY =
  "inventorysmart_oms_configuration";

export const OMS_SHIPMENT_CONSTRAINTS_SCREENNAME =
  "Inventorysmart Oms Shipment Constraints";
export const OMS_SHIPMENT_CONSTRAINTS_FILTER_CONFIG_KEY =
  "InventorysmartOmsShipmentConstraints";

export const OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY =
  "inventorysmart_vendor_projections";

export const OMS_USER_ACCESS_CONTROL = {
  isEditButton: {
    isVisible: true,
  },
};

export const TENANT_LOCALE = "en-US";
export const TENANT_DATE_FORMAT = "YYYY-MM-DD";

export const NO_DATA_FOUND = "No Data Found!";
export const ERROR_MESSAGE = "Something Went Wrong!!";
export const INVALID_VALUE_MESSAGE = "Please input a valid value.";
export const INVALID_DATE = "Invalid date";
export const RANGE_FILTER_ERROR_MESSAGE = "Select both start and end dates!!";

export const SELECT_FILTERS_MESSAGE =
  "Click on select filters to filter and view data";

export const EMPTY_ORDER_QTY = "Order quantity cannot be empty.";
export const INVALID_ORDER_QTY =
  "Order quantity must be a value between Min and Max Order Quantity.";

export const SUCCESS_MESSAGE = "Successfully fetched";
export const UPDATED_MESSAGE = "Successfully Updated";
export const DELETED_MESSAGE = "Successfully Deleted";

export const NO_UPDATE = "Nothing to Update!";
export const BLANK_LIST = "Select at least one value";

export const FILE_DOWNLOADING_MESSAGE = "Your file will be downloaded soon.";

export const defaultTableData = {
  data: [],
  totalCount: 0,
};

export const tableConfigurationMetaData = {
  meta: {
    search: [],
    sort: [],
    range: [],
    limit: { limit: 10, page: 1 },
  },
};

export const TABLE_COLUMN_GROUPING_EXTRA = {
  columnGroupShow: "open",
  enableColumnExpand: true,
};

export const tableArticleFilter = {
  filter_type: "cascaded",
  attribute_name: "primary_sku",
  operator: "in",
  dimension: "Product",
  values: [],
};

export const ORDER_TYPE_GROUPING_BGCOLOR_MAPPER = {
  rop: "success",
  zero_roq: "warning",
  immediate: "error",
};

export const ORDER_STATUS_GROUPING_BGCOLOR_MAPPER = {
  recommended: "success",
  scenario: "primary",
  edited: "warning",
  manual: "error",
};

export const OMS_ORDER_TYPE_CHIP_KEY = "order_type";
export const OMS_ORDER_GEN_TYPE_CHIP_KEY = "order_gen_type";
export const OMS_ORDER_STATUS_CHIP_KEY = "order_status";

export const EXPECTED_FILTER_DIMENSIONS = {
  custom: { order: 1, label: "custom" },
  product: { order: 2, label: "product" },
  store: { order: 3, label: "store" },
  sales: { order: 4, label: "sales" },
  dc: { order: 5, label: "dc" },
  product_store: { order: 6, label: "product_store" },
  new_sku: { order: 7, label: "new_sku" },
  old_sku: { order: 8, label: "old_sku" },
};

export const DESC_ORDER = "desc";
export const ASC_ORDER = "asc";

export const OMS_RECEIPT_DATE_FILTER_SINGLE_WEEK = {
  label: null,
  column_name: "fiscal_date_range_receipt",
  default_value: null,
  dimension: "Order Receipt Date",
  type: "non-cascaded",
  display_order: 0,
  display_type: "fiscalCalendar",
  filter_keyword: "fiscal_date_range_receipt",
  disabledType: "customRange",
  isDisabled: false,
  isMandatory: false,
  displayRow: false,
  showClearDates: false,
  hideLabel: true,
  maxOneWeekSelection: 1,
  reducerKey: "fiscalCalendar",
  defaultExpanded: false,
};
export const OMS_RECEIPT_DATE_MULTI_WEEK = {
  ...OMS_RECEIPT_DATE_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};

export const OMS_PLACEMENT_DATE_FILTER_SINGLE_WEEK = {
  label: null,
  column_name: "fiscal_date_range",
  default_value: null,
  dimension: "Reco Order Placement Date",
  type: "non-cascaded",
  display_order: 0,
  display_type: "fiscalCalendar",
  filter_keyword: "fiscal_date_range",
  disabledType: "customRange",
  isDisabled: false,
  isMandatory: false,
  displayRow: false,
  showClearDates: false,
  hideLabel: true,
  maxOneWeekSelection: 1,
  reducerKey: "fiscalCalendar",
  defaultExpanded: false,
};
export const OMS_PLACEMENT_DATE_MULTI_WEEK = {
  ...OMS_PLACEMENT_DATE_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};

export const OMS_REPORTS_FISCAL_CALENDAR_FILTER_SINGLE_WEEK = {
  label: null,
  column_name: "fiscal_date_range",
  default_value: null,
  dimension: "custom",
  type: "non-cascaded",
  display_order: 0,
  display_type: "rangePicker",
  filter_keyword: "fiscal_date_range",
  isDisabled: false,
  isMandatory: true,
  displayRow: false,
  showClearDates: true,
  maxOneWeekSelection: 1,
  reducerKey: "rangePicker",
};

export const OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION = "custom";

export const ORDER_COST_COLUMN = "order_cost";
export const ORDER_QUANTITY_COLUMN = "order_quantity";
export const ORDER_QUANTITY_EACHES_COLUMN = "order_quantity_eaches";
export const ORDER_RETAIL_COLUMN = "order_retail";
export const ORDER_REASON_COLUMN = "order_reason";
export const SHIP_MODE_COLUMN = "ship_mode";
export const SIZE_COLUMN = "size_column";

export const ORDER_PLACEMENT_DATE_COLUMN = "order_placement_date";
export const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";
export const EXPECTED_RECEIPT_DATE_COLUMN = "expected_receipt_date";
export const EXPECTED_RECEIPT_DATE_COLUMN_STORE =
  "editable_expected_receipt_date";

export const INVALID_DATE_ERROR_MESSAGE = "Enter a valid Date";
export const NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE =
  'Enter a "Not Before Date" and "Not After Date" after Order Placement Date';
export const NOT_BEFORE_DATE_ERROR_MESSAGE =
  'Enter a "Not Before Date" between Order Placement Date and "Not After Date"';
export const NOT_AFTER_DATE_ERROR_MESSAGE =
  'Enter a date after "Order Placement Date" and "Not Before Date" ';
export const ORDER_PLACEMENT_DATE_ERROR_MESSAGE =
  'Enter a date between Todays date and "Not Before Date"';
export const INVALID_RECEIPT_DATE =
  "Expected Receipt Date should be greater than Order Placement Date";
export const INVALID_EDITABLE_RECEIPT_DATE =
  "User Adjusted Delivery Date should be greater than Order Placement Date";

export const APPROVE_CONFIRM_MESSAGE =
  "Are you sure you want to approve the selected SKU(s)?";
export const SEND_FOR_APPROVAL = "Send for Approval";
export const APPROVAL_LIST = ["Approve", "Send_for_Approval_1"];
export const FAILED_TEXT = "Order already exists for ";
export const FAILED_ALL_TEXT = "Order already exists for all SKUs";
export const SUCCESS_TEXT =
  "Order created successfully, except those with 0 quantity";
export const SUCCESS_ALL_TEXT =
  "Order created successfully, except those with 0 quantity";
export const SUCCESS_APPROVAL = "Order Approval successfully";

export const OMS_CNO_DATA_DATE_FORMAT = "YYYY/MM/DD";

export const INVALID_ORDER_QTY_PACKSIZE =
  "Order quantity must be a multiple of the order multiple.";

export const OMS_REPORTS_TABS = [
  { label: "Vendor Projections", value: "vendor_projections" },
  { label: "Drop Ship", value: "drop_ship" },
  { label: "Expedite Orders", value: "expedite_orders" },
  { label: "Late Orders", value: "late_orders" },
  { label: "Future Receipts", value: "future_receipts_reports" },
  { label: "Forecast Accuracy", value: "forecast_accuracy" },
];

export const OMS_REPORTS_TABLE_COLUMN_FILTER = [
  "vendor_code",
  "vendor",
  "primary_vendor_name",
  "vendor_name",
  "sku_info",
  "product_info",
  "product_attribute_8",
  "actuals",
  "channel",
  "size",
  "loc_code",
  "label_code",
  "dimension_pack",
  "view_pack_config",
];

export const OMS_VENDOR_PROJECTIONS_INFO_BANNER_MESSAGE =
  "Order quantity to be placed with the vendor from the current week to 26 weeks out is refreshed daily and will be in sync with the order management screens unless edited by the user. Data from week 27 onwards is refreshed every week.";

export const ALERTS_ACTION_MAPPING = {
  NEW_TABLE: "new_table",
  PAGINATED_NEW_TABLE: "paginated_new_table",
  POP_UP: "pop_up",
  POP_UP_LINK: "pop_up_link",
  DYNAMIC_POP_UP: "dynamic_pop_up",
  PAGINATED_POP_UP: "paginated_pop_up",
  CUSTOM_ALERT: "dropdown_table",
};

export const OMS_ORDERING_SUBMODULES_NAMES = {
  OMS_DASHBOARD_ORDER_KPI: "Order Inventory KPI",
  OMS_DASHBOARD_ORDER_ALERTS: "Order Inventory Alert",
  OMS_DASHBOARD_OMS_VENDOR_STORE_KPI: "Oms Vendor Store KPI",
  OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS: "Oms Vendor Store Alert",
  OMS_ORDER_STATUS: "Order Status",
  OMS_ORDER_DELIVERY: "Order Delivery",
  OMS_ORDER_ORDERING: "Order Ordering",
  OMS_ORDER_SAFETY_STOCK: "Order Safety Stock",
  OMS_ORDER_POLICY: "Order Policy",
  OMS_VENDOR_DC_POLICY: "Vendor DC Policy",
  OMS_PO_CONVERSION: "PO Conversion",
  OMS_RULES_CONSTRAINTS: "Oms Rules Constraints",
  OMS_SHIPMENT_CONSTRAINTS: "Oms Shipment Constraints",
  INVENTORY_RULES_CONSTRAINTS: "Inventorysmart Rules Constraints",
  INVENTORY_CREATE_RULES_CONSTRAINT: "Inventorysmart Create Rules Constraints",
};

export const OMS_ORDERING_DASHBOARD_TABS = {
  ORDERING_DASHBOARD_ORDER: "inventorysmart_dashboard_order",
  ORDERING_DASHBOARD_ORDER_VENDOR_STORE:
    "inventorysmart_dashboard_oms_vendor_store",
};

export const CONSTRAINTS_OMS_SUBTAB = [
  { label: "Replenishment Status", value: "constraints_status" },
  { label: "Vendor-DC Delivery", value: "constraints_delivery" },
  { label: "Ordering", value: "constraints_ordering" },
  { label: "Service Levels", value: "constraints_safety_stock" },
  { label: "Order Policy", value: "constraints_order_policy" },
  {
    label: "Vendor DC Policy",
    value: "constraints_vendor_dc_policy",
  },
  { label: "PO Conversion Tracker", value: "constraints_po_conversion" },
  {
    label: "Vendor Constraints",
    value: "vendor_constraints",
  },
  {
    label: "Shipment Constraints",
    value: "shipment_constraints",
  },
];

export const CONSTRAINTS_OMS_DELIVERY_SUBTAB = [
  { label: "Lead Time", value: "constraints_lead_time" },
  //{ label: "QC Time", value: "constraints_qc_time" },
];

export const CONFIGURATIONS_OMS_SUBTAB = [
  { label: "Replenishment Status", value: "constraints_status" },
  {
    label: "Vendor DC Policy",
    value: "constraints_vendor_dc_policy",
  },
];

export const CONSTRAINTS_OMS_SCREENNAME_KEYS = {
  LeadTime: "LeadTime",
  QcTime: "QcTime",
  Ordering: "Ordering",
  Status: "Status",
};

export const CONSTRAINTS_OMS_SETALL_DELIVERY_LEAD_TIME_FIELDS_TYPE = [
  {
    label: "Variance To Dc lead time (weeks)",
    accessor: "leadTime",
    field_type: "IntegerField",
    value_type: "number",
    no_negative_values: true,
  },
  {
    label: "Order to Processing Time (Frequency)",
    accessor: "orderProcessing",
    field_type: "IntegerField",
    value_type: "number",
    no_negative_values: true,
  },
];

export const CONSTRAINTS_OMS_SETALL_DELIVERY_QC_TIME_FIELDS_TYPE = [
  {
    label: "Qc Time(days)",
    accessor: "qcTime",
    field_type: "IntegerField",
    value_type: "number",
    no_negative_values: true,
  },
];

export const CONSTRAINTS_OMS_SETALL_ORDERING_TIME_FIELDS_TYPE = [
  {
    label: "Min Order Qty",
    accessor: "min_order_quantity",
    field_type: "IntegerField",
    value_type: "number",
  },
  {
    label: "Max Order Qty",
    accessor: "max_order_quantity",
    field_type: "IntegerField",
    value_type: "number",
  },
];

export const CONSTRAINTS_OMS_SETALL_STATUS_FIELDS_TYPE = [
  {
    label: "Status",
    accessor: "status",
    field_type: "list",
    options: [
      {
        label: "Active",
        value: "Active",
        id: "Active",
      },
      {
        label: "Inactive",
        value: "Inactive",
        id: "Inactive",
      },
    ],
  },
];

export const OMS_POSTGRES_INTEGER_MAX = 2147483647;

export const CONSTRAINTS_OMS_SHIPMENT_STATUS = [
  {
    label: "Min. Order Quantity",
    accessor: "min_replenishment_quantity",
    field_type: "IntegerField",
    no_negative_values: true,
    value_type: "number",
    required: true,
    min_value: 0,
    max_value: OMS_POSTGRES_INTEGER_MAX,
  },
  {
    label: "Max. Order Quantity",
    accessor: "max_replenishment_quantity",
    field_type: "IntegerField",
    no_negative_values: true,
    value_type: "number",
    required: true,
    min_value: 0,
    max_value: OMS_POSTGRES_INTEGER_MAX,
  },
  {
    label: "Order Multiple",
    accessor: "order_multiple",
    field_type: "IntegerField",
    no_negative_values: true,
    value_type: "number",
    required: true,
    min_value: 1,
    max_value: OMS_POSTGRES_INTEGER_MAX,
  },
  {
    label: "MOQ Tolerance",
    accessor: "moq_tolerance",
    field_type: "IntegerField",
    no_negative_values: true,
    value_type: "number",
    required: true,
    min_value: 0,
    max_value: 100,
  },
];

export const OMS_DASHBOARD_ALERT_ACTION_CONFIG = [
  {
    sub_headers: [],
    tc_code: 301,
    column_name: "action",
    type: "review_btn",
    label: "Action",
    is_frozen: false,
    is_hidden: false,
    is_editable: true,
    is_aggregated: false,
    order_of_display: 4,
    dimension: "Store Inventory Alert",
    is_required: false,
    tc_mapping_code: 55002,
    aggregate: "",
    formatter: "",
    is_row_span: false,
    footer: "",
    is_searchable: false,
    is_sortable: true,
    extra: null,
    pinned: null,
    width: 280,
    suppressMenu: true,
    lockPosition: "right",
  },
  {
    sub_headers: [],
    tc_code: 362,
    column_name: "action",
    type: "review_btn",
    label: "Action",
    is_frozen: false,
    is_hidden: false,
    is_editable: true,
    is_aggregated: false,
    order_of_display: 5,
    dimension: "Order Inventory Alert",
    is_required: false,
    tc_mapping_code: 7446,
    aggregate: "",
    formatter: "",
    is_row_span: false,
    footer: "",
    is_searchable: false,
    is_sortable: false,
    extra: null,
    pinned: null,
    width: 200,
    suppressMenu: true,
    lockPosition: "right",
  },
];

export const OMS_DASHBOARD_CACHE = "dashboard";

export const OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD = {
  isRedirection: true,
  selectedFilters: [],
  dateFilters: [],
  selectedRowIds: [],
  tabSelected: "style_order_summary",
  isRedirectedFromISModules: true,
};

export const OMS_DASHBOARD_ALERTS_REDIRECT_ROUTES = {
  "Order Management": "Order Management",
  "Matrix Summary": "Review Recommendation",
  "Style Order Summary": "Review Recommendation",
  "Deep Dive": "Deep Dive",
  "Create New Order": "Create New Order",
  Configuration: "Configuration",
  "Approval Flow": "Approve Orders",
  "Order Repository": "Review Pending Order",
};

//OMS Create Scenario Table - Columns
export const CREATE_SCENARIO_TABLE_COLUMNS = [
  "exp_bop_dc_inv_without_qc",
  "po_receipts_without_qc",
  "roq_receipts_without_qc",
  "receipt_pending_without_qc",
  "receipt_inventory_without_qc",
  "exp_bop_dc_inv",
  "po_receipts",
  "roq_receipts",
  "receipt_pending",
  "receipt_inventory",
];
export const CREATE_SCENARIO_ELT_TABLE_COLUMNS = [
  "exp_bop_dc_inv_with_qc",
  "po_receipts_with_qc",
  "roq_receipts_with_qc",
  "receipt_pending_with_qc",
  "receipt_inventory_with_qc",
];

export const OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE = {
  message:
    "Clicking Apply under Create Scenario overrides recommendations for the first upcoming order cycle only.",
};

export const OMS_SERVICE_LEVEL_VALIDATION_ERROR =
  "Service Level must have a value between 50% and 99%";
export const OMS_SET_ALL_SAFETY_STOCK_VALIDATION_ERROR =
  "Please enter at least value for the selected method.";
export const OMS_SET_ALL_SAFETY_STOCK_METHOD_VALIDATION_ERROR =
  "Please select a Safety Stock Method";
export const OMS_WOS_VALIDATION_ERROR =
  "WOS (Safety Stock) should be less than WOS (Demand)";

export const OMS_CREATE_SCENARIO_CONDITION_MESSAGE =
  "Select a single style in Select Styles to enable Create Scenario";

export const OMS_STYLE_ORDER_SUMMARY_FOOTNOTES = [
  {
    message:
      "The projected DC inventory shown here is static and does not reflect any ROQ adjustments. To view updated inventory values after adjustments,",
    link: "Go to Deep Dive",
  },
  {
    message:
      "Additional on-order quantities apart from the receipt weeks may be included in the order calculation.",
    link: "Go to Deep Dive",
  },
];

export const OMS_HIGH_LEVEL_SUMMARY_TAB_LIST = [
  { label: "1M", value: "month" },
  { label: "3M", value: "three_months" },
  { label: "6M", value: "six_months" },
];

export const OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS = [
  {
    label: "Placement Timeline",
    value: "roq_placement_date",
  },
  {
    label: "Receipt Timeline",
    value: "roq_receipt_date",
  },
];

export const OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS = [
  { label: "By size", value: "By size" },
  { label: "By DC", value: "By DC" },
];

export const OMS_STYLE_CHANNEL_PACK_TOGGLE_OPTIONS = [
  { label: "By DC", value: "loc_code" },
  { label: "By pack", value: "pack_id" },
];

export const OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE = [
  { label: "By Size", value: "vendor_size", id: "size" },
  { label: "By Store", value: "vendor_store", id: "store_code" },
];

export const OMS_STYLE_ORDER_SUMMARY_SWITCH_OPTIONS_FOR_VENDOR_STORE = {
  left: {
    label: "By Sales Organisation",
    value: "vendor_store_tier",
    id: "store_tier",
    groupId: "sales_org_name",
  },
  right: {
    label: "By Store",
    value: "vendor_store",
    id: "store_code",
    groupId: "store_code",
  },
};

export const DEEP_DIVE_TABLE_COLUMNS = [
  "exp_bop_dc_inv_without_qc",
  "po_receipts_without_qc",
  "roq_receipts_without_qc",
  "receipt_inventory_without_qc",
  "Immediate_without_qc",
  "Order_Cycle_without_qc",
  "exp_bop_dc_inv",
  "po_receipts",
  "roq_receipts",
  "receipt_inventory",
  "Immediate",
  "Order_Cycle",
  "receipt_pending"
];
export const DEEP_DIVE_ELT_TABLE_COLUMNS = [
  "exp_bop_dc_inv_with_qc",
  "po_receipts_with_qc",
  "roq_receipts_with_qc",
  "receipt_inventory_with_qc",
  "Immediate_with_qc",
  "Order_Cycle_with_qc",
  "exp_bop_dc_inv",
  "po_receipts",
  "roq_receipts",
  "receipt_pending",
  "receipt_inventory",
];

export const REDIRECTION_ALERTS_LOCAL_STORAGE_KEYS = [
  "selectedSku",
  "selectedFiltersDependency",
  "startDate",
  "endDate",
  "isRedirectedFromDashboardToOms",
  "redirect_filter_level",
  "omsRedirectionDetails",
  "selectedArticles",
];

export const OMS_EDITED_GRID_CELLS_BACKGROUND = {
  backgroundColor: "#0055AF36",
};

export const NO_EDIT_TO_SAVE = "No edits to save.";

export const FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS =
  "Download Request is running in background. You will get a notification once it is ready to download";

export const INVALID_SETALL_VALUES_FOR_LEVEL_OF_APPLICATION_PARTIAL_EDIT =
  "Please enter at least one of the following: Min Order Qty, Maximum Order Qty, or MOQ Tolerance.";
export const INVALID_SETALL_VALUES_FOR_LEVEL_OF_APPLICATION =
  "Please enter the following with valid values: Level Of Application, Min Order Qty, Maximum Order Qty and MOQ Tolerance.";
export const INVALID_VALUE_FOR_LEVEL_OF_APPLICATION =
  "Please select 'Level Of Application' to proceed";

export const FILL_MANDATORY_FIELDS = "Please fill mandatory fields.";

export const MIN_MAX_VALIDATION = "Min cannot be greater than or equal to Max!";
export const MAX_MIN_VALIDATION = "Max cannot be lesser than Min!";
export const INVALID_ORDER_MULTIPLE =
  "Order Multiple must be a integer value greater than 0";
export const INVALID_MIN_QTY =
  "Minimum Qty must be a integer value greater than 0";

export const OMS_CONSTRAINTS_SCREENNAME = "Inventorysmart Oms Constraints";
export const OMS_VENDOR_CONSTRAINTS_SCREENNAME =
  "Inventorysmart Oms Vendor Constraints";

export const DASHBOARD = "Dashboard";

export const OMS_OFF_CYCLE_ORDER_TOGGLE_OPTIONS = [
  { label: "By size", value: "By size" },
  { label: "By DC", value: "By DC" },
];
