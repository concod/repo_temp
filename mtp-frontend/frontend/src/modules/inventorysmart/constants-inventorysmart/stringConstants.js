import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  ADA_VISUAL,
  ADA_VISUAL_MFP_DASHBOARD,
  CONFIGURATION,
  CONSTRAINTS,
  CREATE_ALLOCATION as CREATE_ALLOCATION_ROUTE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";

export const APP_NAME = "inventorysmart";
export const ERROR_MESSAGE = "Something Went Wrong!!";
export const CASE_PACK_ERROR_MESSAGE =
  "Edits can only be made in multiples of the vendor case quantity value!!";
export const DC_AVAILABILITY_BREACH_ERR_MSG =
  "The allocated eaches for atleast one of the sizes are more than the available units!!";
export const BLANK_LIST = "Select at least one value";
export const NO_DATA_FOUND = "No Data Found!";
export const RANGE_FILTER_ERROR_MESSAGE = "Select both start and end dates!!";
export const RANGE_FILTER_START_DATE_ERROR_MESSAGE =
  "Start Date can't be today's date!!";
export const SUCCESS_MESSAGE = "Successfully fetched";
export const UPDATED_MESSAGE = "Successfully Updated";
export const DELETED_MESSAGE =
  "Current date's orders deleted; historic orders remain unaffected";
export const NO_UPDATE = "Nothing to Update!";
export const API_SUCCESS_MESSAGE_FINALIZE = "Allocation Finalized Successfully";
export const PO_PARTIAL_ALLOCATION_FINALIZE_ERROR_MSG = "Total Allocated % is not 100 for all the Sizes";
export const API_SUCCESS_MESSAGE_FINALIZE_RL = "Allocation Finalization in progress";
export const API_SUCCESS_MESSAGE_SAVE = "Saved Successfully";
export const FUTURE_DATE_RANGE_ERROR =
  "Future dates selection are not applicable!!";
export const ALLOCATION_IN_EACHES_MESSAGE =
  "Allocation will be done in Eaches!!";
export const FILE_DOWNLOADING_MESSAGE = "Your file will be downloaded soon";
export const FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS =
  "Download Request is running in background. You will get a notification once it is ready to download";
export const INVALID_VALUE_MESSAGE = "Please input a valid value.";

export const FILL_MANDATORY_FIELDS = "Please fill mandatory fields.";
export const MIN_ARTICLE_SELECTION_MESSAGE =
  "Please select atleast one article to continue";
export const MIN_ARTICLE_SELECTION_MESSAGE_rl =
  "Please select atleast one material to continue";
export const DELETE_MESSAGE = "Are you sure you want to delete?";
export const DIALOG_REJECT_BTN_TEXT = "No";
export const DIALOG_CONFIRM_BTN_TEXT = "Yes";
export const DIALOG_APPLY_BTN_TEXT = "Apply";
export const DIALOG_CANCEL_BTN_TEXT = "Cancel";
export const DIALOG_FINALIZE_BTN_TEXT = "Finalize";
export const MIN_MAX_VALIDATION = "Min cannot be greater than Max!!";
export const CONTINUE_MESSAGE = "Are you sure you want to continue?";
export const SAVE_VALUE_MESSAGE = "Make sure to save the updated values first.";
export const USER_RESERVE_VALUE_VALIDATION_MESSAGE =
  "Enter the value for user reserve";
export const USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE =
  "Select the reservation date";

export const FAILED_TEXT = "Order already exists for ";
export const FAILED_ALL_TEXT = "Order already exists for all SKUs";
export const SUCCESS_TEXT =
  "Order created successfully, except those with 0 quantity";
export const SUCCESS_ALL_TEXT =
  "Order created successfully, except those with 0 quantity";
export const SUCCESS_APPROVAL = "Order Approval successfully";

// labels for headerbreadcrumbs
export const DECISION_DASHBOARD = "Decision Dashboard";
export const CREATE_ALLOCATION = "Create New Allocation";

// labels for dashboard filter
export const FILTER_BUTTON_LABEL = "Filter";
export const RESET_BUTTON_LABEL = "Reset";
export const DASHBOARD_FILTERS_HEADER = "Product Filters";
export const ORDER_BATCHING_FILTERS_HEADER = "Filters";

// labels for dashboard - view plan table
export const VIEW_PLANS = "View Plans";
export const STORE_INVENTORY_ALERT = "Store Inventory Alert";
export const DETAILS = "Details";
export const CREATE_NEW_PLAN = "Create New Allocation Plan";
export const NO_SAVED_FILTERS = "No Saved Filters Present to Preload Data";

//Sorting Order
export const DESC_ORDER = "desc";
export const ASC_ORDER = "asc";

// Create Allocation form fields
export const CREATE_ALLOCATION_FORM = [
  {
    accessor: "allocationName",
    field_type: "TextField",
    label: "Allocation Plan Name",
    required: false,
    isDisabled: false,
  },
];

export const CHECKALL_VALIDATION = "This feature doesnot support check all!!";

export const ARTICLE_TABLE_SIZE_PROFILE_VALIDATION_MESSAGE =
  "Some of the selected articles do not have a size profile mapped to them";

export const ALERT = "Alert!!";
export const ERROR = "Error!!";
export const INVALID_DRAFT = "Draft is not valid!!";
export const INVALID_DATE = "Invalid date";

export const FILTER_LEVELS = ["l0_name", "l1_name", "l2_name", "l3_name"];
export const OMS_REPORTS_TABLE_COLUMN_FILTER = [
  "vendor_code",
  "vendor_name",
  "sku_info",
  "actuals",
];

export const INVENTORY_SUBMODULES_NAMES = {
  INVENTORY_DASHBOARD_FORECAST_KPI: "Forecast KPI",
  INVENTORY_DASHBOARD_FORECAST_ALERTS: "Forecast Alert",
  INVENTORY_DASHBOARD_STORE_INVENTORY_KPI: "Store Inventory KPI",
  INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS: "Store Inventory Alert",
  INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI: "Order Inventory KPI",
  INVENTORY_DASHBOARD_ORDER_INVENTORY_ALERTS: "Order Inventory Alert",
  INVENTORY_DASHBOARD_VIEW_PLANS: "View Plan",
  INVENTORY_DASHBOARD_ARTICLE_DETAILS: "Article Details",
  INVENTORY_CREATE_ALLOCATION_STORE_TABLE: "Create Allocation Store Table",
  INVENTORY_FINALIZE_PRODUCT_STORE_TABLE: "Finalise Product Store View",
  INVENTORY_FINALIZE_STORE_TABLE: "Finalise Store View",
  INVENTORY_IA_RECOMMENDED_PRODUCT_PROFILE: "IA Recommended Product Profile",
  INVENTORY_USER_CREATED_PRODUCT_PROFILE: "User Created Product Profile",
  INVENTORY_IA_RECOMMENDED_STORE_SIZE_CONTRIBUTION:
    "IA Recommended Store Size Contribution",
  INVENTORY_USER_CREATED_STORE_SIZE_CONTRIBUTION:
    "User Created Store SIze Contribution",
  INVENTORY_CREATED_STYLE_DESCRIPTION: "User Created Style Description",
  INVENTORY_CREATE_PRODUCT_PROFILE_FORM: "Create Product Profile Form",
  INVENTORY_CREATE_PRODUCT_PROFILE_STYLE_DESCRIPTION:
    "Create Product Profile Style Description",
  INVENTORY_CREATE_PRODUCT_PROFILE_STORE_SIZE_CONTRIBUTION:
    "Create Product Profile STore Size Contribution",
  INVENTORY_STORE_CONSTRAINTS: "Store Constraints",
  INVENTORY_STORE_GRADE_CONSTRAINTS: "Store Grade Constraints",
  INVENTORY_STORE_GROUP_CONSTRAINTS: "Store Group Constraints",
  INVENTORY_ORDER_STATUS: "Order Status",
  INVENTORY_ORDER_DELIVERY: "Order Delivery",
  INVENTORY_ORDER_ORDERING: "Order Ordering",
  INVENTORY_ORDER_SAFETY_STOCK: "Order Safety Stock",
  INVENTORY_ORDER_POLICY: "Order Policy",
  INVENTORY_PO_CONVERSION: "PO Conversion",
  INVENTORY_USER_RESERVE: "User Reserve",
  INVENTORY_SMA: "SMA",
  INVENTORY_PRODUCT_RULES: "Product Rules",
  INVENTORY_PRODUCT_STATUS: "Product Status",
  INVENTORY_PRODUCT_MAPPING: "Product Mapping",
  INVENTORY_STORE_STATUS: "Store Status",
  INVENTORY_STORE_MAPPING: "Store Mapping",
  INVENTORY_DC_STATUS: "DC Status",
  INVENTORY_DC_MAPPING: "DC Mapping",
  INVENTORY_STORE_GROUPING: "Store Grouping",
  INVENTORY_PRODUCT_GROUPING: "Product Grouping",
  INVENTORY_NEW_STORE_SETUP: "New Store", // TO ADD THIS IN DB
  INVENTORY_ALLOCATION_REPORTING_MODEL_STOCK_DEEP_DIVE:
    "Report Model Stock Deep Dive",
  INVENTORY_ALLOCATION_REPORTING_STORE_STOCK: "Report Store Stock",
  INVENTORY_ALLOCATION_REPORTING_LOST_SALES: "Report Lost Sales",
  INVENTORY_ALLOCATION_REPORTING_LOST_SALES_WITH_FISCAL_CALENDAR:
    "Report Lost Sales With Fiscal Calendar",
  INVENTORY_ALLOCATION_REPORTING_EXCESS_INV: "Report Excess Inv",
  INVENTORY_ALLOCATION_REPORTING_EXCESS_REPORT: "Report Excess Report",
  INVENTORY_ALLOCATION_REPORTING_DEEP_DIVE: "Report Deep Dive",
  INVENTORY_ALLOCATION_REPORTING_DAILY_ALLOCATION: "Report Daily Allocation",
  INVENTORY_ALLOCATION_REPORTING_FORECASTED_UNITS: "Report Forecasted Units",
  INVENTORY_ALLOCATION_REPORTING_ADDITIONAL_REPORTS:
    "Report Additional Reports",
  INVENTORY_ALLOCATION_REPORTING_FUTURE_RECEIPTS: "Report Future Receipts",
  INVENTORY_ALLOCATION_REPORTING_FORECAST_REPORTS: "Report Forecast Reports",
  INVENTORY_ALLOCATION_REPORTING_IN_STOCK: "Report In Stock",
  INVENTORY_ALLOCATION_REPORTING_INTENTIONAL_MIN_REPORTS:
    "Report Intentional Min Reports",
  INVENTORY_ALLOCATION_REPORTING_DC_AVAILABILITY_REPORT:
    "Report DC Availability Report",
  INVENTORY_ALLOCATION_REPORTING_FORECAST_VARIANCE_REPORT:
    "Report Forecast Variance Report",
  INVENTORY_ALLOCATION_REPORTING_FORWARD_LOOKING_REPORT:
    "Report Forward Looking Report",
  INVENTORY_ORDER_VENDOR_PROJECTIONS: "Report Order Vendor Projections",
  INVENTORY_ORDER_DROP_SHIP: "Report Order Drop Ship",
  INVENTORY_ORDER_EXPEDITE_ORDERS: "Report Order Expedite Orders",
  INVENTORY_ORDER_LATE_ORDERS: "Report Order Late Orders",
  INVENTORY_ORDER_FUTURE_RECEIPTS: "Report Order Future Receipts",
  INVENTORY_ORDER_FORECAST_ACCURACY: "Report Order Forecast Accuracy",
  INVENTORY_STORE_MAPPING_STORE_DC_FC: "Store to DC/FC Mapping",
  INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC: "Product to DC/FC Mapping",
};

export const ROLES_ACCESS_MODULES_MAPPING = {
  dashboard: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_KPI,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_ALERTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_KPI,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ORDER_INVENTORY_ALERTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ARTICLE_DETAILS,
  ],
  inventorysmart_create_allocation: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_ALLOCATION_STORE_TABLE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_FINALIZE_PRODUCT_STORE_TABLE,
  ],
  inventorysmart_product_profile: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_IA_RECOMMENDED_PRODUCT_PROFILE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_IA_RECOMMENDED_STORE_SIZE_CONTRIBUTION,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_STORE_SIZE_CONTRIBUTION,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATED_STYLE_DESCRIPTION,
  ],
  inventorysmart_create_product_profile: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_PRODUCT_PROFILE_FORM,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_PRODUCT_PROFILE_STYLE_DESCRIPTION,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_PRODUCT_PROFILE_STORE_SIZE_CONTRIBUTION,
  ],
  inventorysmart_constraints: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GRADE_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUP_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_STATUS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_DELIVERY,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_ORDERING,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_SAFETY_STOCK,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_POLICY,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PO_CONVERSION,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_RESERVE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_SMA,
  ],
  inventorysmart_configuration: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_RULES,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_STATUS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_STATUS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING_STORE_DC_FC,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
  ],
  inventorysmart_store_eligibility_group: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
  ],
  inventorysmart_allocation_report: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_MODEL_STOCK_DEEP_DIVE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_STORE_STOCK,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_LOST_SALES,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_LOST_SALES_WITH_FISCAL_CALENDAR,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_EXCESS_INV,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_EXCESS_REPORT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_DEEP_DIVE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_DAILY_ALLOCATION,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_FORECASTED_UNITS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_ADDITIONAL_REPORTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_FUTURE_RECEIPTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_FORECAST_REPORTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_IN_STOCK,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_INTENTIONAL_MIN_REPORTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_DC_AVAILABILITY_REPORT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_FORECAST_VARIANCE_REPORT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ALLOCATION_REPORTING_FORWARD_LOOKING_REPORT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_VENDOR_PROJECTIONS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_DROP_SHIP,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_EXPEDITE_ORDERS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_LATE_ORDERS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_FUTURE_RECEIPTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_FORECAST_ACCURACY,
  ],
};

export const UPDATE_MODEL_STOCK_PAYLOAD_KEY = {
  product_code: "product_code",
  store_code: "store_code",
  ms_model_stock: "model_stock",
  ms_date: "date",
  model_stock: "model_stock",
  date: "date",
};

export const FULL_ACCESS_PERMISSIONS_LIST = [
  "create",
  "edit",
  "delete",
  "view",
  "approve",
];

export const SCREENS_LIST_MAP = {
  INVENTORYSMART_DASHBOARD_STORE_INVENTORY:
    "inventorysmart_dashboard_store_inventory",
  INVENTORYSMART_DASHBOARD_FORECAST: "inventorysmart_dashboard_forecast",
  INVENTORYSMART_DASHBOARD_ORDER: "inventorysmart_dashboard_order",
};

export const SCREENS_SUBCOMPONENT_LIST_MAP = {
  INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY: "dashboardWithStoreInventory",
  INVENTORYSMART_DASHBOARD_WITH_FORECAST_AND_STORE_INVENTORY:
    "dashboardWithForecastAndStoreInventory",
  INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY_AND_FORECAST:
    "dashboardWithStoreInventoryAndForecast",
  INVENTORYSMART_DASHBOARD_WITH_STORE_FORECAST_AND_ORDER:
    "dashboardWithStoreForecastAndOrder",
};

export const EXPECTED_FILTER_DIMENSIONS = {
  custom: { order: 1, label: "custom" },
  product: { order: 2, label: "product" },
  store: { order: 3, label: "store" },
  sales: { order: 4, label: "sales" },
  dc: { order: 5, label: "dc" },
};

export const TABLE_CONFIG = {
  sub_headers: [],
  tc_code: 490,
  type: "str",
  is_frozen: false,
  is_hidden: false,
  is_editable: false,
  is_aggregated: false,
  dimension: "Store",
  is_required: true,
  aggregate: null,
  formatter: null,
  is_row_span: false,
  footer: null,
  is_searchable: false,
  is_sortable: false,
  extra: null,
};

export const VIEW_PLANS_FILTER_EXCLUSION_LIST = [
  "sales_type",
  "store_group",
  "product_group",
  "product_channel_name",
  "dc_name",
  "clearance",
];

export const STORE_INVENTORY_ALERT_ORDER = {
  "auto allocation": 0,
  "kits allocation": 1,
  "launch products": 2,
  "top 25 articles": 3,
  clearance: 4,
  retirement: 5,
  excess: 6,
  shortfall: 7,
  stockout: 8,
  "selldown products": 9,
  "po to allocate": 10,
};

export const KITS_ALLOCATION_ALERT_CONFIG_NAME = "kta";

export const STORE_INVENTORY_LABEL_MAPPINGS = {
  stock_out: "Stock Out",
  stockout: "Stock Out",
  shortfall: "Shortfall",
  normal: "Normal",
  excess: "Excess",
  bulk_remaining: "DC On Hand",
  it: "In Transit to Store",
  oh: "Store On Hand",
  oo: "Store On Order",
  lw_qty: "LW Sales Units",
  lw_revenue: "LW Sales $",
  lw_margin: "LW Margin $",
  week_to_date_sales: "Week to Date Sales Units",
  last_day_sales: "Yesterday Sales Units",
  sales_1_ago: "1W Ago Sales Units",
  sales_2_ago: "2W Ago Sales Units",
  sales_3_ago: "3W Ago Sales Units",
  sales_4_ago: "4W Ago Sales Units",
  available_to_allocate: "DC Available to Allocate",
  dc_oh_1: "DC OH in 1 WMS Location",
  dc_oh_qcloc: "DC OH in QCLOC WMS Location",
  dc_oh_cwc: "DC OH in CWC WMS Location",
  oo_dc: "DC on Order",
  it_dc: "DC In-Transit",
};

export const STORE_INVENTORY_LINK_COLUMNS_RIGHT_ALIGNED = [
  "stock_out",
  "stockout",
  "shortfall",
  "normal",
  "excess",
];

export const defaultTableData = {
  data: [],
  totalCount: 0,
};

export const tableConfigurationMetaData = {
  meta: {
    search: [],
    sort: [],
    range: [],
  },
};

export const tableArticleFilter = {
  filter_type: "cascaded",
  attribute_name: "article",
  operator: "in",
  dimension: "Product",
  values: [],
};

export const tableStoreCodeFilter = {
  filter_type: "cascaded",
  attribute_name: "store_code",
  operator: "in",
  dimension: "Store",
  values: [],
};

export const productMappingTableArticleFilter = {
  filter_type: "cascaded",
  attribute_name: "product_code",
  operator: "in",
  dimension: "Product",
  values: [],
};

export const ACTUAL_PREDICTED = "Actual";
export const KPI_RECOMMENDED = "Recommended";
export const KPI_PLANNED = "Planned";

export const PRODUCT_RULE_POP_UP_TITLE = {
  store_group_mapped_display: "Store Groups/Store Mapped",
  dc_mapped: "DC Mapped",
  old_id: "Old Style Mapped",
  product_profile_name: `${dynamicLabelsBasedOnTenant(
    "product"
  )} Profile Mapped`,
  rule_name: "Scheduler Info",
};

export const POP_UP_TYPE = {
  store: "store",
  product_profile: "product_profile",
  dc: "dc",
  cross_country_allocation: "cross_country_allocation",
  auto_allocation: "auto_allocation_rule",
  approval_type: "approval_type",
  threshold: "threshold",
};

export const DEFAULT_THRESHOLD = 0.7;

export const TAB_TYPES_LABEL = {
  Level1Tab1: dynamicLabelsBasedOnTenant("product"),
  Level1Tab2: "Store",
  Level1Tab3: "DC",
  Level2Tab1: dynamicLabelsBasedOnTenant("product_rules"),
  Level2Tab2: dynamicLabelsBasedOnTenant("product_status"),
  Level2Tab3: dynamicLabelsBasedOnTenant("product_mapping"),
};

export const TAB_TYPES_VALUE = {
  Level1: "Level1",
  Level2: "Level2",
  Level3: "Level3",
  Level1Sector1Label: "Level1Sector1",
  Level1Sector2Label: "Level1Sector2",
  Level1Sector3Label: "Level1Sector3",
  Level1Sector1: dynamicLabelsBasedOnTenant("product_rules"),
  Level1Sector2: dynamicLabelsBasedOnTenant("product_status"),
  Level1Sector3: dynamicLabelsBasedOnTenant("product_mapping"),
};

// Create Product profile form fields
export const CREATE_PRODUCT_PROFILE_FORM = [
  {
    accessor: "profileName",
    field_type: "TextField",
    label: "Profile Name",
    required: true,
    isDisabled: false,
  },
  {
    accessor: "profileDescription",
    field_type: "TextField",
    label: "Profile Description",
    required: true,
    isDisabled: false,
  },
];

export const CREATE_PRODUCT_PROFILE_TIME_PERIOD_DROP_DOWN = [
  {
    accessor: "productProfileTimePeriod",
    field_type: "list",
    label: "Period",
    required: true,
    options: [
      { label: "Last 30 days", value: "Last 30 days", id: "Last 30 days" },
      { label: "Last 90 days", value: "Last 90 days", id: "Last 90 days" },
      { label: "Last 180 days", value: "Last 180 days", id: "Last 180 days" },
      { label: "Last 365 days", value: "Last 365 days", id: "Last 365 days" },
    ],
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];
export const CREATE_PRODUCT_PROFILE_TIME_PERIOD_DROP_DOWN_SIGNET = [
  {
    accessor: "productProfileTimePeriod",
    field_type: "list",
    label: "Period",
    required: true,
    options: [
      { label: "Last 4 weeks", value: "Last 4 weeks", id: "Last 4 weeks" },
      { label: "Last 12 weeks", value: "Last 12 weeks", id: "Last 12 weeks" },
      { label: "Last 26 weeks", value: "Last 26 weeks", id: "Last 26 weeks" },
      { label: "Last 52 weeks", value: "Last 52 weeks", id: "Last 52 weeks" },
    ],
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];
export const CREATE_PRODUCT_PROFILE_TIME_PERIOD_DATE_PICKER = [
  {
    required: true,
    label: "Period",
    field_type: "rangePicker",
    accessor: "productProfileRangePeriod",
    disableType: "disableOnlyFuture",
  },
];

export const PLAN_STATUS_TO_HIDE_BACK_BUTTON = ["Failure", null];

export const PLAN_TYPE_TO_HIDE_BACK_BUTTON = ["Auto Allocation"];

export const PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON = [
  "Finalized",
  "Failure",
  null,
];

export const FINALIZE_STORE_CAPACITY_GROUPED_COLUMN_NAMES = [
  "store_code",
  "store_name",
  "l1_name",
];

export const PAST_ALLOCATION_TIME_PERIOD_DATE_PICKER = [
  {
    required: false,
    label: "Period",
    field_type: "rangePicker",
    accessor: "pastAllocationRangePeriod",
    disableType: "disableOnlyFuture",
  },
];

export const CREATE_PRODUCT_PROFILE_SALE_ATTRIBUTE = {
  required: false,
  label: "",
  field_type: "BooleanField",
  accessor: "",
  disabled: false,
  value: true,
};

export const CREATE_PRODUCT_PROFILE_PRODUCT_ATTRIBUTE = [
  {
    label: "MIN",
    isDisabled: false,
    accessor: "min",
    field_type: "IntegerField",
    value_type: "number",
    required: true,
    no_negative_values: true,
  },
  {
    label: "MAX",
    isDisabled: false,
    accessor: "max",
    field_type: "IntegerField",
    value_type: "number",
    required: true,
    no_negative_values: true,
  },
];

export const STORE_INVENTORY_ALERT_ACTION_CONFIG = [
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
  },
];

export const LOST_SALES_FISCAL_WEEK = [
  {
    accessor: "fiscal_week",
    field_type: "dropdown",
    label: "Week",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: false,
  },
];

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK = {
  label: null,
  column_name: "fiscal_date_range",
  default_value: null,
  dimension: "custom",
  type: "non-cascaded",
  display_order: 0,
  display_type: "fiscalCalendar",
  filter_keyword: "fiscal_date_range",
  isDisabled: false,
  isMandatory: true,
  displayRow: false,
  showClearDates: true,
  maxOneWeekSelection: 1,
  reducerKey: "fiscalCalendar",
};

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK = {
  ...INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_OMS_FILTER_SINGLE_WEEK = {
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
export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_OMS_RECEIPT_DATE_FILTER_SINGLE_WEEK = {
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

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_MULTI_WEEK = {
  ...INVENTORY_DASHBOARD_FISCAL_CALENDAR_OMS_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};
export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK = {
  ...INVENTORY_DASHBOARD_FISCAL_CALENDAR_OMS_RECEIPT_DATE_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};

export const REPORT_SCREEN_TABS = [
  { label: "Model Stock Deep Dive", value: "model_stock_deep_dive" },
  { label: "Store Stock Drill Down", value: "store_stock" },
  { label: "Consolidated Report", value: "store_stock_rl" },
  { label: "Lost Sales", value: "lost_sales" },
  { label: "Lost Sales", value: "lost_sales_with_fiscal_calendar" },
  { label: "Excess Inventory", value: "excess_inv" },
  { label: "Excess Inventory", value: "excess_report" },
  { label: "Deep Dive Allocation", value: "deep_dive" },
  { label: "Daily Allocation Summary", value: "daily_allocation" },
  { label: "Forecasted units", value: "forecasted_units" },
  { label: "Additional Reports", value: "additional_reports" },
  { label: "Future Receipts", value: "future_receipts" },
  { label: "Forecast Reports", value: "forecast_reports" },
  { label: "In Stock", value: "in_stock" },
  { label: "Min Reports", value: "intentional_min_reports" },
  { label: "DC Availability", value: "dc_availability_report" },
  { label: "Variance to Forecast", value: "forecast_variance_report" },
  {
    label: "Forward Looking Allocation Est. Report",
    value: "forward_looking_report",
  },
];

export const MODEL_STOCK_DEEP_DIVE_TABS = [
  { label: "Product View", value: "article" },
  { label: "Store View", value: "store" },
];

export const INVENTORY_DASHBOARD_TAB_OPTIONS = {
  dashboardWithForecastAndStoreInventory: [
    {
      label: "Forecast",
      value: "forecast",
    },
    {
      label: "Store Inventory",
      value: "store_inventory",
    },
  ],
  dashboardWithStoreInventory: [
    {
      label: "Store Inventory",
      value: "store_inventory",
    },
  ],
  dashboardWithStoreInventoryAndForecast: [
    {
      label: "Store Inventory",
      value: "store_inventory",
    },
    {
      label: "Forecast",
      value: "forecast",
    },
  ],
  dashboardWithForecastStoreAndOrderInventory: [
    {
      label: "Forecast",
      value: "forecast",
    },
    {
      label: "Store Inventory",
      value: "store_inventory",
    },
    {
      label: "OMS",
      value: "oms",
    },
  ],
};

export const DAILY_ALLOCATION_VIEW_TYPE = [
  {
    field_type: "radioGroup",
    accessor: "productStore",
    options: [
      {
        value: "product",
        label: "",
        isDisabled: false,
      },
      { value: "store", label: "Store", isDisabled: false },
    ],
  },
];

export const DAILY_ALLOCATION_DATE_PICKER = [
  {
    required: true,
    label: "Date",
    field_type: "DateTimeField",
    accessor: "datePicker",
    disabled: true,
    disablePast: false,
    disableFuture: true,
  },
];

export const DEEP_DIVE_RANGE_PICKER = [
  {
    required: true,
    label: "Period",
    field_type: "rangePicker",
    accessor: "rangePicker",
    disableType: "disableOnlyFuture",
  },
];

export const FORECASTED_UNITS_DATE_PICKER = [
  {
    required: true,
    label: "Calendar",
    field_type: "rangePicker",
    accessor: "rangePicker",
    disableType: "disableOnlyFuture",
  },
];

export const UNDER_FORECASTING_PERCENTAGE = [
  {
    required: false,
    label: "",
    field_type: "IntegerField",
    accessor: "underForecastValue",
    value_type: "percentage",
    step_value: 5,
  },
];

export const OVER_FORECASTING_PERCENTAGE = [
  {
    required: false,
    label: "",
    field_type: "IntegerField",
    accessor: "overForecastValue",
    value_type: "percentage",
    step_value: 5,
  },
];

export const FORECASTING_PERCENTAGE = [
  {
    required: false,
    label: "",
    field_type: "IntegerField",
    accessor: "forecastValue",
    value_type: "percentage",
    step_value: 1,
  },
];

// displaying only these summary values for now
export const DEEP_DIVE_ALLOCATION_SUMMARY = [
  {
    label: "# of Allocation",
    key: "total_allocation_code",
  },
  {
    label: "# of Units Allocated",
    key: "allocated_total",
  },
  {
    label: "Qty Match % (Actual vs Sales)",
    key: "qty_match_per_actual_vs_sales",
  },
  {
    label: "Size Match % (Plan vs Actual)",
    key: "qty_size_match_per",
  },
];

export const ALERTS_ACTION_MAP = {
  NEW_TABLE: "new_table",
  PAGINATED_NEW_TABLE: "paginated_new_table",
  POP_UP: "pop_up",
  POP_UP_LINK: "pop_up_link",
  DYNAMIC_POP_UP: "dynamic_pop_up",
  PAGINATED_POP_UP: "paginated_pop_up",
  NEW_TABLE_0: "new_table_0"
};

export const ALERTS_REDIRECT_ACTION_MAPPING = {
  "Create Allocation": {
    label: "Create Allocation",
    permission: "create",
    redirectionType: 1,
    redirectionUrl: CREATE_ALLOCATION_ROUTE,
    redirectionParams: `step=0&type=alerts`,
  },
  Constraints: {
    label: "Go To Constraints",
    permission: "edit",
    redirectionType: 1,
    redirectionUrl: CONSTRAINTS,
    redirectionParams: `type=alerts`,
  },
  Finalize: {
    label: "Review",
    permission: "edit",
    redirectionType: 2,
    redirectionUrl: CREATE_ALLOCATION_ROUTE,
    redirectionParams: `step=1&type=alerts`,
  },
  ADA: {
    label: "Go To ADA Dashboard",
    permission: "edit",
    redirectionType: 3,
    redirectionUrl: ADA_VISUAL,
    redirectionParams: `type=alerts`,
  },
  "ADA MFP": {
    label: "Change Forecast",
    permission: "edit",
    redirectionType: 4,
    redirectionUrl: ADA_VISUAL_MFP_DASHBOARD,
    redirectionParams: `type=alerts`,
  },
  Configuration: {
    label: "Go To Configuration",
    permission: "edit",
    redirectionType: 1,
    redirectionUrl: CONFIGURATION,
    redirectionParams: `type=alerts`,
  },
};

export const UPDATE_MODAL_STOCK = [
  {
    label: "Model Stock",
    isDisabled: false,
    accessor: "model_stock",
    field_type: "IntegerField",
    value_type: "number",
  },
];

export const ADDITIONAL_REPORTS_FILTERS_WEEK = [
  {
    accessor: "fiscal_week",
    field_type: "dropdown",
    label: "Weeks",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
    isDisabled: true,
  },
];

export const FUTURE_RECEIPTS_RANGE_PICKER = [
  {
    required: true,
    label: "Calendar",
    field_type: "rangePicker",
    accessor: "rangePicker",
    disableType: "disableOnlyFuture",
  },
];

export const REPORTS_TARGET_WOS_PAYLOAD = [
  {
    filter_type: "cascaded",
    attribute_name: "channel",
    operator: "in",
    dimension: "Store",
    values: [],
  },
  {
    filter_type: "cascaded",
    attribute_name: "l0_name",
    operator: "in",
    dimension: "Product",
    values: [],
  },
  {
    filter_type: "cascaded",
    attribute_name: "l1_name",
    operator: "in",
    dimension: "Product",
    values: [],
  },
  {
    filter_type: "cascaded",
    attribute_name: "l2_name",
    operator: "in",
    dimension: "Product",
    values: [],
  },
  {
    filter_type: "cascaded",
    attribute_name: "style",
    operator: "in",
    dimension: "Product",
    values: [],
  },
  {
    filter_type: "cascaded",
    attribute_name: "style_description",
    operator: "in",
    dimension: "Product",
    values: [],
  },
  {
    filter_type: "cascaded",
    attribute_name: "store_code",
    operator: "in",
    dimension: "Store", // should be store
    values: [],
  },
];

export const FUTURE_RECEIPTS_SUB_ROWS_PAYLOAD = [
  {
    filter_type: "cascaded",
    attribute_name: "channel",
    operator: "in",
    dimension: "Store",
    values: "",
  },
  {
    filter_type: "cascaded",
    attribute_name: "l0_name",
    operator: "in",
    dimension: "Product",
    values: "",
  },
  {
    filter_type: "cascaded",
    attribute_name: "l1_name",
    operator: "in",
    dimension: "Product",
    values: "",
  },
  {
    filter_type: "non-cascaded",
    attribute_name: "store_code",
    operator: "in",
    dimension: "Store",
    values: "",
  },
];

export const IN_STOCK_TABS = [
  { label: "SKU View", value: "article" },
  { label: "Store View", value: "store" },
];
export const EXCESS_INVENTORY_TABS = [
  { label: "SKU View", value: "product_code" },
  { label: "Store View", value: "store" },
];

export const NEW_STORE_STEPPER = [
  {
    label: "Store Details",
    isEditable: false,
    isCompleted: false,
  },
  {
    label: "DC Config & Sister Stores Mapping",
    isEditable: false,
    isCompleted: false,
  },
  {
    label: "Demand & Constraints",
    isEditable: false,
    isCompleted: false,
  },
];

export const NEW_STORE_TWO_STEPPER = [
  {
    label: "Store Details",
    isEditable: false,
    isCompleted: false,
  },
  {
    label: "Sister Store Mapping",
    isEditable: false,
    isCompleted: false,
  },
];

export const PRODUCT_SUPERSESSION_MAPPING_SIGNET = [
  "Select SKU",
  "Review SKU Level Mapping",
];
export const PRODUCT_SUPERSESSION_MAPPING = [
  "Select Material",
  "Review Material Level Mapping",
];

export const PRODUCT_SUPERSESSION_SELECT_STORE = {
  label: "Select Store",
  accessor: "select_store",
  field_type: "dropdown",
  required: false,
  options: [],
  isMulti: true,
  isSearchable: true,
};

export const PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE = {
  column_name: "choice_type",
  sub: "Sub Choice",
  main: "Main Choice",
};

export const STORE_OPENING_FORM_CONSTANTS = [
  {
    required: true,
    label: "Reservation Start Date",
    field_type: "DateTimeField",
    accessor: "reservation_start_date",
    isDisabled: false,
    disablePast: true,
    disableFuture: false,
  },
  {
    required: true,
    label: "Store Opening Date",
    field_type: "DateTimeField",
    accessor: "store_opening_date",
    isDisabled: false,
    disablePast: true,
    disableFuture: false,
  },
];

export const STORE_OPENING_WITH_INSTORE_FORM = [
  {
    required: true,
    label: "Store Opening Date",
    field_type: "DateTimeField",
    accessor: "store_opening_date",
    isDisabled: true,
    disablePast: true,
    disableFuture: false,
  },
  {
    required: true,
    label: "Instore Date",
    field_type: "DateTimeField",
    accessor: "instore_date",
    isDisabled: false,
    disablePast: true,
    disableFuture: false,
  },
  {
    required: true,
    label: "Allocation Start Date",
    field_type: "DateTimeField",
    accessor: "allocation_start_date",
    isDisabled: false,
    disablePast: true,
    disableFuture: false,
  },
];

export const STORE_GROUP_MAPPING = [
  {
    accessor: "store_groups",
    field_type: "dropdown",
    label: "Store Groups Mapped",
    required: true,
    options: [],
    isMulti: true,
    isSearchable: true,
    isClearable: true,
  },
  {
    required: true,
    label: "Store Group Mapping Date",
    field_type: "DateTimeField",
    accessor: "store_group_mapping_date",
    disabled: false,
    disablePast: true,
    disableFuture: false,
  },
];

export const STORE_DETAILS_TABLE_DATA = [
  {
    dc: "",
    dc_options: [],
    lead_time: null,
    key: 0,
  },
];

export const SET_ALL_DEMAND_CONSTRAINTS_FORM = [
  {
    label: "Min",
    isDisabled: false,
    accessor: "min_stock",
    field_type: "IntegerField",
    value_type: "number",
    required: true,
    no_negative_values: true,
  },
  {
    label: "Max",
    isDisabled: false,
    accessor: "max_stock",
    field_type: "IntegerField",
    value_type: "number",
    required: true,
    no_negative_values: true,
  },
  {
    label: "Wos",
    isDisabled: false,
    accessor: "wos",
    field_type: "IntegerField",
    value_type: "number",
    required: true,
    no_negative_values: true,
  },
  {
    label: "Demand",
    isDisabled: false,
    accessor: "demand_estimated",
    field_type: "IntegerField",
    value_type: "number",
    required: true,
    no_negative_values: true,
  },
];

export const customDropDownConstant = [
  {
    fc_code: 176,
    label: "Max Supression",
    column_name: "max_supression_flag",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: true,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 18,
    is_required: false,
    extra: {},
    filter_keyword: "max_supression_flag",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "Yes",
        label: "Yes",
        id: "Yes",
      },
      {
        value: "No",
        label: "No",
        id: "No",
      },
    ],
    mappedKey: "",
  },
  {
    fc_code: 176,
    label: "Min Influenced",
    column_name: "min_influenced_allocation",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: true,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 19,
    is_required: false,
    extra: {},
    filter_keyword: "min_influenced_allocation",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "Yes",
        label: "Yes",
        id: "Yes",
      },
      {
        value: "No",
        label: "No",
        id: "No",
      },
    ],
    mappedKey: "",
  },
  {
    fc_code: 176,
    label: "Is Edited",
    column_name: "is_edited",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: true,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 20,
    is_required: false,
    extra: {},
    filter_keyword: "is_edited",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "Yes",
        label: "Yes",
        id: "Yes",
      },
      {
        value: "No",
        label: "No",
        id: "No",
      },
    ],
    mappedKey: "",
  },
];

export const customStoreStockReportFilterConstant = [
  {
    fc_code: 176,
    label: "Negative Store OH",
    column_name: "negative_inventory_oh",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: true,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 18,
    is_required: false,
    extra: {},
    filter_keyword: "negative_inventory_oh",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "TRUE",
        label: "TRUE",
        id: "TRUE",
      },
      {
        value: "FALSE",
        label: "FALSE",
        id: "FALSE",
      },
    ],
    mappedKey: "",
  },
];

export const datePickerConstant = [
  {
    fc_code: 176,
    label: "Date",
    column_name: "daily-allocation-date",
    type: "non-cascaded",
    display_type: "DateTimeField",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    required: true,
    is_multiple_selection: false,
    range_min: "",
    range_max: "",
    default_value: "",
    is_disabled: false,
    is_clearable: false,
    display_order: 1,
    is_required: false,
    extra: {},
    filter_keyword: "daily-allocation-date",
    accessor: "daily-allocation-date",
    field_type: "DateTimeField",
    disableFuture: true,
  },
];
export const rangePickerConstant = [
  {
    fc_code: 176,
    label: "Date",
    column_name: "range-picker",
    type: "non-cascaded",
    display_type: "rangePicker",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    required: true,
    is_multiple_selection: false,
    range_min: "",
    range_max: "",
    default_value: "",
    is_disabled: false,
    is_clearable: false,
    display_order: 1,
    is_required: false,
    extra: {},
    filter_keyword: "range-picker",
    accessor: "range-picker",
    field_type: "rangePicker",
    disableType: "disableOnlyFuture",
  },
];

export const dropDownConstant = [
  {
    fc_code: 176,
    label: "Weeks",
    column_name: "dropdown-values",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: true,
    default_value: "",
    is_clearable: false,
    display_order: 1,
    is_required: false,
    extra: {},
    filter_keyword: "dropdown-values",
    accessor: "dropdown-values",
    field_type: "dropdown",
    options: [],
    initialData: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
    isDisabled: true,
    is_disabled: true,
  },
];

export const TEXT_FIELD_FILTER_TEMPLATE = {
  fc_code: 176,
  label: "Value",
  column_name: "string-values",
  type: "non-cascaded",
  display_type: "TextField",
  level: 1,
  dimension: "custom",
  is_mandatory: false,
  default_value: "",
  is_clearable: false,
  display_order: 1,
  is_required: false,
  extra: {},
  filter_keyword: "string-values",
  accessor: "string-values",
  field_type: "TextField",
  isClearable: true,
  isDisabled: false,
  is_disabled: false,
};

export const ORDER_REPOSITORY_SCREEN_TABS = [
  {
    label: "Pending orders stage 1",
    value: "pending_orders 1",
    status: [1],
    isEditButton: true,
    isDeletedButton: true,
    isApprovalButton: {
      isVisible: true,
      actionCode: 4,
      name: "Approve",
      actionName: "Approve",
    },
    isPushBackButton: {
      isVisible: true,
      actionCode: 3,
      name: "Push Back",
      actionName: "Push_Back",
    },
    isSendForApprovalButton: {
      isVisible: true,
      actionCode: 2,
      name: "Send For Approval",
      actionName: "Send_for_Approval_1",
    },
    isDownloadButton: false,
    isMultiSelectRows: true,
    table_name: "inventorysmart_oms_sku_summary",
  },
  {
    label: "Pending orders stage 2",
    value: "pending_orders_2",
    status: [2],
    isEditButton: true,
    isDeletedButton: true,
    isApprovalButton: {
      isVisible: true,
      actionCode: 4,
      name: "Approve",
      actionName: "Approve",
    },
    isPushBackButton: {
      isVisible: true,
      actionCode: 3,
      name: "Push Back",
      actionName: "Push_Back",
    },
    isSendForApprovalButton: {
      isVisible: false,
      actionCode: null,
      name: "Send For Approval",
      actionName: "Send_for_Approval_2",
    },
    isDownloadButton: false,
    isMultiSelectRows: true,
    table_name: "inventorysmart_oms_sku_summary",
  },
  {
    label: "Orders under review",
    value: "order_under_review",
    status: [-1],
    isEditButton: true,
    isDeletedButton: true,
    isApprovalButton: {
      isVisible: false,
      actionCode: null,
      name: "Approve",
      actionName: "Approve",
    },
    isPushBackButton: {
      isVisible: false,
      actionCode: null,
      name: "Push Back",
      actionName: "Push_Back",
    },
    isSendForApprovalButton: {
      isVisible: true,
      actionCode: 2,
      name: "Send For Approval",
      actionName: "Send_for_Approval_1",
    },
    isDownloadButton: false,
    isMultiSelectRows: true,
    table_name: "inventorysmart_oms_sku_summary",
  },
  {
    label: "Approved orders",
    value: "approved_orders",
    status: [3],
    isEditButton: false,
    isDeletedButton: false,
    isApprovalButton: {
      isVisible: false,
      actionCode: null,
      name: "",
    },
    isPushBackButton: {
      isVisible: false,
      actionCode: null,
      name: "",
    },
    isSendForApprovalButton: {
      isVisible: false,
      actionCode: null,
      name: "Send For Approval",
    },
    isDownloadButton: true,
    isMultiSelectRows: false,
    table_name: "inventorysmart_oms_approved_sku_summary",
  },
];

export const ALLOCATION_REPORT_HEADER_TAB = [
  { label: "Allocation Reporting", value: "allocation_reporting" },
  { label: "OMS", value: "reports_oms" },
];

export const MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS = [
  {
    accessor: "sisterStoreTimePeriod",
    field_type: "list",
    label: "Sister Store Mapping Time Period",
    required: true,
    options: [
      { label: "3 Months", value: "3 Months", id: "3 Months" },
      { label: "6 Months", value: "6 Months", id: "6 Months" },
      { label: "12 Months", value: "12 Months", id: "12 Months" },
    ],
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];

export const MAPPED_STORE_PERIOD_DATE_PICKER = [
  {
    required: true,
    label: "Sister Store Mapping Time Period",
    field_type: "DateTimeField",
    accessor: "sisterStoreDatePicker",
    disablePast: true,
  },
];

export const INTENTIONAL_UNINTENTIONAL_MIN_VIEW_TYPE = [
  {
    field_type: "radioGroup",
    accessor: "typeOfMinConstraints",
    options: [
      {
        value: "intentional",
        label: "Intentional",
        isDisabled: false,
      },
    ],
  },
];

export const ALLOCATION_REPORT_OMS_SUBTAB = [
  { label: "Vendor Projections", value: "vendor_projections" },
  { label: "Drop Ship", value: "drop_ship" },
  { label: "Expedite Orders", value: "expedite_orders" },
  { label: "Late Orders", value: "late_orders" },
  { label: "Future Receipts", value: "future_receipts_reports" },
  { label: "Forecast Accuracy", value: "forecast_accuracy" },
];

export const CONSTRAINTS_HEADER_TAB = [
  { label: "Store Allocations", value: "store_allocations" },
  { label: "OMS", value: "constraints_oms" },
  { label: "User Reserve", value: "user_reserve" },
  { label: "SMA", value: "sma" },
];

export const CONSTRAINTS_OMS_SUBTAB = [
  { label: "Status", value: "constraints_status" },
  { label: "Delivery", value: "constraints_delivery" },
  { label: "Ordering", value: "constraints_ordering" },
  { label: "Safety Stock", value: "constraints_safety_stock" },
  { label: "Order Policy", value: "constraints_order_policy" },
  { label: "PO Conversion Tracker", value: "constraints_po_conversion" },
];

export const CONSTRAINTS_OMS_DELIVERY_SUBTAB = [
  { label: "Lead Time", value: "constraints_lead_time" },
  { label: "QC Time", value: "constraints_qc_time" },
];

export const CONSTRAINTS_OMS_SCREENNAME_KEYS = {
  LeadTime: "LeadTime",
  QcTime: "QcTime",
  Ordering: "Ordering",
  Status: "Status",
};

export const CONSTRAINTS_OMS_SETALL_DELIVERY_LEAD_TIME_FIELDS_TYPE = [
  {
    label: "Variance(weeks)",
    accessor: "variance",
    field_type: "IntegerField",
    value_type: "number",
    no_negative_values: true,
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

export const CONSTRAINTS_OMS_SETALL_ORDER_POLICY_FIELDS_TYPE = [
  {
    label: "Week",
    accessor: "week",
    field_type: "list",
    options: [
      {
        label: "1",
        value: "1",
      },
      {
        label: "2",
        value: "2",
      },
      {
        label: "3",
        value: "3",
      },
      {
        label: "4",
        value: "4",
      },
    ],
    required: true,
  },
];
export const NEW_STORE_DEMAND_CONSTRAINTS_EDITABLE_FIELDS = {
  min_stock: "",
  max_stock: "",
  wos: "",
  demand_estimated: "",
};

export const GO_BACK_MESSAGE =
  "Are you sure you want to go back to the previous step ? Changes made will be lost.";

export const GO_TO_NEW_STORE_DASHBOARD_MESSAGE =
  "Are you sure you want to go back to new store dashboard?";

export const CONFIRM_REVIEW_SUPERSESSION_MAPPING =
  "Are you sure you have reviewed all the mappings correctly?";
export const DISABLED_EDITING_SUPERSESSION_MAPPING =
  "Supersessiong Mapping is disabled here. Please share edit details to the IA Team from MOJO.";
export const CONFIRM_REMOVING_SUPERSESSION_MAPPING =
  "Are you sure want to remove the selected mappings?";

export const STORE_CODE_FILTER_DIMENSION_DETAILS = {
  dimension: "store",
  display_type: "dropdown",
  filter_id: "store_code",
  filter_type: "cascaded",
};

export const DRAFT_FLOW = "draft";

export const CACHE_BLOCKSIZE_STRATEGY = 10;

export const EDIT_PRODUCT_PROFILE_FILTER_PAYLOAD = {
  filter_id: "channel",
  filter_type: "cascaded",
  dimension: "store",
  display_type: "dropdown",
};

export const NEW_STORE_RELEASE_VALIDATION_MSG =
  "This Particular store cannot be released yet";

export const NEW_STORE_ALLOCATE_VALIDATION_MSG =
  "This Particular store has not yet been released to view the allocation";

export const NEW_STORE_APPROVE_VALIDATION_MSG =
  "You don't have permission to approve";

//OMS

export const APPROVE_CONFIRM_MESSAGE =
  "Are you sure you want to approve the selected SKU(s)?";
export const SEND_FOR_APPROVAL = "Send for Approval";
export const APPROVAL_LIST = ["Approve", "Send_for_Approval_1"];

export const OMS_EDITED_GRID_CELLS_BACKGROUND = {
  backgroundColor: "#0055AF36",
};

export const OMS_SKU_SUMMARY_NOT_APPROVED_ORDER_STATUS_SERIES = [0, -1, 1, 2];
export const OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES = [0, -1, 1, 2, 3];
export const OMS_SKU_SUMMARY_ALL_ORDERS_SORT_BY = {
  column: "order_status_id",
  order: "asc",
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

export const OMS_SERVICE_LEVEL_VALIDATION_ERROR =
  "Service Level must have a value between 50% and 99%";

export const EMPTY_ORDER_QTY = "Order quantity cannot be empty.";
export const INVALID_ORDER_QTY =
  "Order quantity must be a value between Min and Max Order Quantity.";
export const INVALID_ORDER_QTY_PACKSIZE =
  "Order quantity must be a multiple of Pack size.";

export const INVALID_DATE_ERROR_MESSAGE = "Enter a valid Date";
export const NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE =
  'Enter a "Not Before Date" and "Not After Date" after Order Placement Date';
export const NOT_BEFORE_DATE_ERROR_MESSAGE =
  'Enter a "Not Before Date" between Order Placement Date and "Not After Date"';
export const NOT_AFTER_DATE_ERROR_MESSAGE =
  'Enter a date after "Order Placement Date" and "Not Before Date" ';
export const ORDER_PLACEMENT_DATE_ERROR_MESSAGE =
  'Enter a date between Todays date and "Not Before Date"';
export const EMPTY_NOT_BEFORE_DATE_ERROR = 'Please fill the "Not Before Date"';

export const OMS_EMPTY_ADJUSTED_PREDICTIONS =
  "Adjusted Predictions cannot be null or empty";

export const OMS_FILE_UPLOAD_INSTRUCTIONS = [
  "Please ensure that the Order Qty is valid. (Quantities greater than or equal to 0 are acceptable.)",
  "Please ensure that DC NBD is between the Order Placement Date and DC NAD.",
  "Only Order Qty, DC NBD, and DC NAD can be updated. The rest of the updated values will be ignored.",
  "Ensure that the format for DC NBD, DC NAD, and Order Placement Recom. Date is YYYY-MM-DD.",
];

export const OMS_WAIT_FOR_UPLOAD_PROCESS =
  "Please wait for the notification to be received shortly.";

export const UPLOAD_SUCCESS_MESSAGE = "File uploaded successfully";

export const ACTIVE_STATUS_FILTER_PAYLOAD = {
  filter_id: "",
  attribute_name: "",
  operator: "in",
  dimension: "",
  values: [true, false],
  filter_type: "cascaded",
  display_type: "dropdown",
};

export const MAP_TO_DUMMY_STORE_FORM_FIELDS = [
  {
    accessor: "new_store",
    field_type: "list",
    label: "New Store",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
  {
    accessor: "existing_store",
    field_type: "list",
    label: "Existing Store",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];

export const DC_LEAD_TIME_COLUMNS = ["dc", "lead_time"];

export const IN_STOCK_ALLOCATION_SUMMARY = [
  {
    label: "IN-STOCK OH %",
    key: "instock_oh_percentage",
  },
  {
    label: "IN-STOCK OH % LY",
    key: "instock_oh_percentage_ly",
  },
  {
    label: "IN-STOCK OH + IT %",
    key: "instock_oh_it_percentage",
  },
  {
    label: "IN-STOCK OH + IT % LY",
    key: "instock_oh_it_percentage_ly",
  },
];
export const DEMAND_AND_CONSTRAINTS_DEMAND_VALIDATION =
  "Entered demand value should be within min and max value range";

export const DEMAND_AND_CONSTRAINTS_MAX_FIELD_VALIDATION =
  "Entered max stock value is less than min stock";

export const DEMAND_AND_CONSTRAINTS_MIN_FIELD_VALIDATION =
  "Entered min stock value is more than max stock";

export const NO_PRODUCT_PROFILE_MAPPED =
  "Product profile is not mapped to this";

export const NO_DUMMY_STORE_VALIDATION_MSG = "No dummy store present";

export const NO_NEW_STORE_VALIDATION_MSG = "No new stores to map";

export const MAP_TO_NEW_STORE_MSG =
  "Do you want to map a new store to an existing dummy store?";

export const TENANT_LOCALE = "en-US";
export const TENANT_DATE_FORMAT = "YYYY-MM-DD";

export const NO_STORE_GROUP_VALIDATION_MSG =
  "No store groups are present for the selected combination";

export const SAME_MIN_MAX_VALIDATION_MSG = "Min and Max cannot be the same";

export const USER_RESERVE_MANDATORY_FIELDS_MSG =
  "Enter all mandatory fields with proper values";

export const USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG =
  "Entered User Reserve cannot be more than DC Available";

export const USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG =
  "Cannot Enter User Reserve % as DC Available is less than or equals to 0";

export const USER_RESERVE_PERCENTAGE_VALIDATION_MSG =
  "% cannot be more than 100";

export const USER_RESERVE_NEGATIVE_PERCENTAGE_VALIDATION_MSG =
  "% cannot be less than -100";

export const USER_RESERVE_VALUE_VALIDATION_MSG =
  "Reservation exceeds available stock.";

export const USER_RESERVE_NEGATIVE_VALUE_VALIDATION_MSG =
  "Dereservation exceeds the current reserved quantity.";

export const USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG =
  "Enter a proper positive value";

export const USER_RESERVE_ROW_EDIT_VALIDATION_MSG =
  "Enter user reserve and select reservation date for the following SKU's -";

export const MANDATORY_FIELD_MSG = "Enter the value for at-least one field";

export const CONTRIBUTION_PERCENTAGE = [
  {
    required: false,
    label: "",
    field_type: "IntegerField",
    accessor: "contributionPercentage",
    value_type: "percentage",
    step_value: 1,
  },
];

export const ENTER_CONTRIBUTION_VAL_VALIDATION_MSG =
  "Enter contribution percentage";

export const SAMPLE_SIZE_OPTIONS = {
  product_mappings: {
    XS1: ["XS2"],
    S1: ["S2"],
  },
  size_mappings: {
    XS: ["XS"],
    S: ["S"],
  },
  mappings: ["XS2", "S2"],
  new_all_sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  old_all_sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  new_all_product_codes: ["XS1", "S1", "M1", "L1", "XL1", "XXL1", "XXXL1"],
  old_all_product_codes: ["XS2", "S2", "M2", "L2", "XL2", "XXL2", "XXXL2"],
};

const nonHierarchyFieldAccessors = {
  __Create_Plan_Plan_Name_Accessor: "plan_name",
  __Create_Plan_Compare_Year_Accessor: "year_comparision_metric",
  __Create_Plan_Selling_Period_Accessor: "assort_selling_period_value",
  __Create_Plan_Completion_Deadline_Accessor: "completion_deadline",
  __Create_Plan_Drops_Count_Accessor: "assort_drop_value",
  __Create_Plan_Season_Accessor: "assort_season_value",
  __Create_Plan_Prev_Season_Plan_Accessor: "bop_tag_plan_code",
  __Create_Plan_Year_Accessor: "assort_year_value",
  __Create_Core_Choice_Count: "all_door_cc",
  __Create_Plan_Cluster_Name_Accessor: "cluster_name",
  __Create_Plan_Cluster_Plan_Accessor: "cluster_plan_code",
  __Create_Plan_Cluster_Channel_Accessor: "channel",
  __Create_Plan_Cluster_Sub_Channel_Accessor: "sub_channel",
  __Create_Plan_Reference_Period_Accessor: "reference_period",
  __Create_Plan_Reference_Data_Accessor: "reference_data",
  __Create_Plan_Compare_Year_Value_Accessor: "compare_year_value",
  __Create_Plan_Compare_Season_Value_Accessor: "compare_season_value",
};
const nonHierarchyFieldLabels = {
  __Create_Plan_Plan_Name_Label: "Plan Name",
  __Create_Plan_Compare_Year_Label: "Compare year with",
  __Create_Plan_Selling_Period_Label: "Selling Period",
  __Create_Plan_Completion_Deadline_Label: "Plan Completion Deadline",
  __Create_Plan_Drops_Count_Label: "Select # of Drops",
  __Create_Plan_Season_Label: "Season",
  __Create_Plan_Prev_Season_Plan_Label: "Prev. season plan",
};

export const Dashboard = {
  __Dashboard_Heading: "Dashboard",
  __Dashboard_Deadline: "Calendar",
  __Create_New: "Create new",
  __Date_Format: "MM-DD-YYYY",
  ...nonHierarchyFieldAccessors,
  ...nonHierarchyFieldLabels,
  __Non_Hierarchy_Fields: [
    ...Object.keys(nonHierarchyFieldAccessors).map(
      (key) => nonHierarchyFieldAccessors[key]
    ),
  ],
  __plan_levels: ["l0_name", "l1_name", "l2_name", "l3_name"],
  __delete_confirm_text: "Are you sure you want to Delete?",
  __delete_confirm_header: "Delete Plan",
  __edit_confirm_header: "Edit Plan",
  __edit_confirm_text:
    "This cluster plan is already finalized. Do you want to continue to change?",
};

export const common = {
  __Multiple_Value: "(s)",
  __Assortment: "AssortSmart",
  __ConfirmBtnText: "Yes",
  __RejectBtnText: "No",
  __LaterBtnText: "Later",
  __Select_Drops: "Select # of drops",
  __Drop: "Drop",
  __Attribute_Text: "Attribute",
  __Month_Text: "Month",
  __Month_mapping_list: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  __compare_yr_constants: ["LY", "LLY", "LLLY"],
  __seed_with_constants: ["IAF", "LY", "LLY"],
  __number_of_drops: 2,
  __default_column_attributes: {
    is_aggregated: false,
    is_editable: false,
    is_frozen: false,
    is_hidden: false,
    is_required: false,
    is_row_span: false,
    is_searchable: false,
  },
  __create_plan_selling_period_enabled_start_days: ["Sunday"],
  __create_plan_selling_period_enabled_end_days: ["Saturday"],
  __create_plan_seasons: ["Summer", "Fall", "Spring", "Winter"],
  __sub_channel_wholesale: ["Amazon", "Key_Account", "Specialty"],
  __MojoHelpdesk_Link:
    "https://impactanalytics.mojohelpdesk.com/login/create_request#/ticket-form/66734",
  __Finalize_Steps: ["2.4", "3"],
  __Plan_stage: { "Working Plan": 0, "Scenario Plan": 2 },
  __reference_data_constants: ["Actual", "Planned"],
  __reference_period_constants: ["Compare Year", "Compare Season"],
};
export const REPORT_DOWNLOAD_VALIDATION_MSG =
  "Please select only one department to download the report";

export const SMA_ECOM_RESERVE_VALIDATION_MSG =
  "Cannot calculate SMA Reserve as ECOM Reserve is 0";

export const NEGATIVE_VALUE_VALIDATION_MSG = "Cannot enter value less than 0";

export const SMA_SET_ALL_FORM = [
  {
    label: "SMA Reserve %",
    isDisabled: false,
    accessor: "sma_reserve_percent",
    field_type: "IntegerField",
    value_type: "percentage",
    required: true,
    is_negative_value_allowed: false,
  },
];
export const ORDER_COST_COLUMN = "order_cost";
export const ORDER_QUANTITY_COLUMN = "order_quantity";
export const NOT_BEFORE_DATE_COLUMN = "editable_not_before_date";
export const NOT_AFTER_DATE_COLUMN = "editable_not_after_date";
export const PLACEMENT_DATE_COLUMN = "order_placement_date";
export const ERROR_MESSAGE_DATES_UPDATE = "Updating NBD and NAD Dates failed!";
export const ERROR_MESSAGE_QUANTITY_UPDATE = "Updating Order Quantity failed!";
export const MAP_DUMMY_STORE_SUCCESS_MSG = "Dummy Store Mapped Successfully";
//Plot Option categories for safety stock vs service level graph in OMS
export const PLOT_BANDS = [
  {
    color: "#CAE4BA", //"#FEF7F4",
    from: 45,
    to: 49,
    label: {
      text: "Grade A",
    },
  },
  {
    color: "#E2F0D9", //#FDEFE3",
    from: 30,
    to: 45,
    label: {
      text: "Grade B",
    },
  },
  {
    color: "#FBE5D6",
    from: 25,
    to: 30,
    label: {
      text: "Grade C",
    },
  },
  {
    color: "#F9D6BF",
    from: 0,
    to: 25,
    label: {
      text: "Grade D",
    },
  },
];

//OMS Deep Dive Table - Columns
export const DEEP_DIVE_TABLE_COLUMNS = [
  "exp_bop_dc_inv_without_qc",
  "po_receipts_without_qc",
  "roq_receipts_without_qc",
  "receipt_inventory_without_qc",
  "Immediate_without_qc",
  "Order_Cycle_without_qc",
];
export const DEEP_DIVE_ELT_TABLE_COLUMNS = [
  "exp_bop_dc_inv_with_qc",
  "po_receipts_with_qc",
  "roq_receipts_with_qc",
  "receipt_inventory_with_qc",
  "Immediate_with_qc",
  "Order_Cycle_with_qc",
];

//OMS Create Scenario Table - Columns
export const CREATE_SCENARIO_TABLE_COLUMNS = [
  "exp_bop_dc_inv_without_qc",
  "po_receipts_without_qc",
  "roq_receipts_without_qc",
  "receipt_pending_without_qc",
  "receipt_inventory_without_qc",
];
export const CREATE_SCENARIO_ELT_TABLE_COLUMNS = [
  "exp_bop_dc_inv_with_qc",
  "po_receipts_with_qc",
  "roq_receipts_with_qc",
  "receipt_pending_with_qc",
  "receipt_inventory_with_qc",
];

export const FORECAST_THRESHOLD_VALIDATION_MSG =
  "Enter a value for forecast threshold";

export const customFLAReportFilterConstant = [
  {
    fc_code: 176,
    label: "DC Out Of Stock Flag",
    column_name: "dc_out_of_stock",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: true,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 18,
    is_required: false,
    extra: {},
    filter_keyword: "dc_out_of_stock",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "TRUE",
        label: "TRUE",
        id: "TRUE",
      },
      {
        value: "FALSE",
        label: "FALSE",
        id: "FALSE",
      },
    ],
    mappedKey: "",
  },
];

export const customFRFilterConstant = [
  {
    fc_code: 186,
    label: "Store type",
    column_name: "store_type",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: false,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 2,
    is_required: false,
    extra: {},
    is_deleted: false,
    filter_keyword: "store_type",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "Brick & Mortar",
        label: "Brick & Mortar",
        id: "Brick & Mortar",
      },
      {
        value: "E-commerce",
        label: "E-commerce",
        id: "E-commerce",
      },
    ],
    mappedKey: "",
  },
];

export const BULK_EDIT_COLUMN = {
  column_name: "",
  sub_headers: [
    {
      column_name: "",
      sub_headers: [
        {
          column_name: "rowLabel",
          sub_headers: [],
          tc_code: 320,
          label: "",
          dimension: "Inventory",
          type: "str",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 1,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "9560",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          suppressMenu: true,
          lockPosition: "left",
          is_sortable: false,
          width: 200,
          is_deleted: false,
          is_master_group: false,
          parent_id: ["", 1],
          headerClass: "",
          field: "rowLabel",
          accessor: "rowLabel",
          id: "",
          headerName: "",
          pinned: null,
          required: false,
          resizable: true,
          headerTooltip: "",
          showRangeFilter: false,
          filter: "",
          floatingFilter: true,
          floatingFilterComponentParams: {
            suppressFilterButton: false,
          },
          filterParams: {},
          dynamicMaxKey: "",
          cellStyle: {
            textAlign: "right",
          },
          tooltipField: null,
        },
      ],
      tc_code: 320,
      label: "",
      dimension: "Inventory",
      type: "int",
      is_frozen: false,
      is_editable: false,
      is_aggregated: false,
      order_of_display: 1,
      is_hidden: false,
      is_required: false,
      tc_mapping_code: "9560",
      aggregate_type: null,
      formatter: null,
      is_row_span: false,
      footer: null,
      is_searchable: false,
      extra: {},
      is_sortable: false,
      width: 200,
      is_deleted: false,
      is_master_group: false,
      parent_id: ["rowLabel_0"],
      headerClass: "",
      field: 1,
      accessor: 1,
      id: 1,
      headerName: "",
      pinned: null,
      required: false,
      resizable: true,
      headerTooltip: "",
      showRangeFilter: false,
      filter: "",
      floatingFilter: true,
      floatingFilterComponentParams: {
        suppressFilterButton: false,
      },
      filterParams: {},
      children: [
        {
          column_name: "rowLabel",
          sub_headers: [],
          tc_code: 320,
          label: "",
          dimension: "Inventory",
          type: "int",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 1,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "9560",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: true,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
          parent_id: ["sizes_dynamic", 1],
          headerClass: "",
          field: "rowLabel",
          accessor: "rowLabel",
          id: "",
          headerName: "",
          pinned: null,
          required: false,
          resizable: true,
          headerTooltip: "",
          showRangeFilter: false,
          filter: "",
          floatingFilter: true,
          floatingFilterComponentParams: {
            suppressFilterButton: false,
          },
          filterParams: {},
          dynamicMaxKey: "",
          cellStyle: {
            textAlign: "right",
          },
          tooltipField: null,
        },
      ],
      dynamicMaxKey: "",
      cellStyle: {
        textAlign: "right",
      },
      tooltipField: null,
    },
  ],
  tc_code: 320,
  label: "",
  dimension: "Inventory",
  type: "str",
  is_frozen: false,
  is_editable: false,
  is_aggregated: false,
  order_of_display: 1,
  is_hidden: false,
  is_required: false,
  tc_mapping_code: "9560",
  aggregate_type: null,
  formatter: null,
  is_row_span: false,
  footer: null,
  is_searchable: false,
  extra: {},
  is_sortable: false,
  width: 200,
  is_deleted: false,
  is_master_group: false,
  headerClass: "",
  field: "",
  accessor: "",
  id: "",
  headerName: "",
  pinned: null,
  required: false,
  resizable: true,
  headerTooltip: "",
  showRangeFilter: false,
  filter: "",
  floatingFilter: true,
  floatingFilterComponentParams: {
    suppressFilterButton: false,
  },
  filterParams: {},
  children: [
    {
      column_name: 1,
      sub_headers: [
        {
          column_name: "rowLabel",
          sub_headers: [],
          tc_code: 320,
          label: "",
          dimension: "Inventory",
          type: "int",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 1,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "9560",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: true,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
          parent_id: ["", 1],
          headerClass: "",
          field: "rowLabel",
          accessor: "rowLabel",
          id: "",
          headerName: "",
          pinned: null,
          required: false,
          resizable: true,
          headerTooltip: "",
          showRangeFilter: false,
          filter: "",
          floatingFilter: true,
          floatingFilterComponentParams: {
            suppressFilterButton: false,
          },
          filterParams: {},
          dynamicMaxKey: "",
          cellStyle: {
            textAlign: "right",
          },
          tooltipField: null,
        },
      ],
      tc_code: 320,
      label: "",
      dimension: "Inventory",
      type: "int",
      is_frozen: false,
      is_editable: false,
      is_aggregated: false,
      order_of_display: 1,
      is_hidden: false,
      is_required: false,
      tc_mapping_code: "9560",
      aggregate_type: null,
      formatter: null,
      is_row_span: false,
      footer: null,
      is_searchable: false,
      extra: {},
      is_sortable: false,
      width: 200,
      is_deleted: false,
      is_master_group: false,
      parent_id: ["rowLabel_0"],
      headerClass: "",
      field: 1,
      accessor: 1,
      id: 1,
      headerName: "",
      pinned: null,
      required: false,
      resizable: true,
      headerTooltip: "",
      showRangeFilter: false,
      filter: "",
      floatingFilter: true,
      floatingFilterComponentParams: {
        suppressFilterButton: false,
      },
      filterParams: {},
      children: [
        {
          column_name: "rowLabel",
          sub_headers: [],
          tc_code: 320,
          label: "",
          dimension: "Inventory",
          type: "int",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 1,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "9560",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: true,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
          parent_id: ["sizes_dynamic", 1],
          headerClass: "",
          field: "rowLabel",
          accessor: "rowLabel",
          id: "",
          headerName: "",
          pinned: null,
          required: false,
          resizable: true,
          headerTooltip: "",
          showRangeFilter: false,
          filter: "",
          floatingFilter: true,
          floatingFilterComponentParams: {
            suppressFilterButton: false,
          },
          filterParams: {},
          dynamicMaxKey: "",
          cellStyle: {
            textAlign: "right",
          },
          tooltipField: null,
        },
      ],
      dynamicMaxKey: "",
      cellStyle: {
        textAlign: "right",
      },
      tooltipField: null,
    },
  ],
  dynamicMaxKey: "",
  cellStyle: {
    textAlign: "right",
  },
  tooltipField: null,
};
export const AllocationTypeFilterConstant = [
  {
    fc_code: 177,
    label: "Allocation Type",
    column_name: "allocation_type",
    type: "non-cascaded",
    display_type: "dropdown",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: false,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 2,
    is_required: false,
    extra: {},
    is_deleted: false,
    filter_keyword: "allocation_type",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "Uploaded Allocation",
        label: "Uploaded Allocation",
        id: "Uploaded Allocation",
      },
      {
        value: "Manual Allocation",
        label: "Manual Allocation",
        id: "Manual Allocation",
      },
      {
        value: "Auto Allocation - Review and Release",
        label: "Auto Allocation - Review and Release",
        id: "Auto Allocation - Review and Release",
      },
      {
        value: "Auto Allocation - Auto Release",
        label: "Auto Allocation - Auto Release",
        id: "Auto Allocation - Auto Release",
      },
    ],
    mappedKey: "",
  },
];

export const SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG =
  "The product hierarchy of the current row is already selected in previous row with similar combinations";
export const SISTER_STORE_COLUMN_VALIDATION_MSG =
  "This sister store is already mapped to another department, please select a different sister store";

export const DC_LEAD_TIME_DUPLICATE_VALIDATION_MSG =
  "This value is already selected, please select a new value";
export const DC_LEAD_TIME_ENTER_VALUES_MSG =
  "Fill in all the columns with proper values";
export const RESERVATION_DATE_VALIDATION_MSG =
  "Reservation date cannot be greater than store opening date";
export const DEMAND_CONSTRAINTS_ADD_PRODUCT_VALIDATION_MSG =
  "Cannot push multiple records with same product code";
export const DEMAND_CONSTRAINTS_DUPLICATE_PRODUCT_VALIDATION_MSG =
  "Some of the records with the same product code are already present in the table, cannot push the same";

export const TOTAL_INVENTORY_DC_COL = {
  column_name: "bulk_remaining",
  sub_headers: [],
  tc_code: 130,
  label: "Total Inventory",
  dimension: "store",
  type: "int",
  is_frozen: false,
  is_editable: false,
  is_aggregated: false,
  order_of_display: 1,
  is_hidden: false,
  is_required: false,
  tc_mapping_code: "65034",
  aggregate_type: null,
  formatter: null,
  is_row_span: false,
  footer: null,
  is_searchable: false,
  extra: {},
  is_sortable: false,
  width: 200,
  is_deleted: false,
  is_master_group: false,
  parent_id: ["DC Inventory"],
  headerClass: "Total_Inventory",
  field: "bulk_remaining",
  accessor: "bulk_remaining",
  id: "bulk_remaining",
  headerName: "Total Inventory",
  pinned: null,
  required: false,
  resizable: true,
  suppressColumnsToolPanel: true,
  headerTooltip: "Total Inventory",
  showRangeFilter: false,
  filter: false,
  columnGroupShow: "closed",
  floatingFilter: false,
  floatingFilterComponentParams: {
    suppressFilterButton: true,
  },
  headerComponent: null,
  cellStyle: {
    textAlign: "right",
  },
  tooltipField: null,
  suppressSizeToFit: true,
};

export const TOTAL_INVENTORY_DC_COL_ALERTS_RL = {
  column_name: "bulk_remaining",
  sub_headers: [],
  tc_code: 123,
  label: "Total Inventory",
  dimension: "store",
  type: "int",
  is_frozen: false,
  is_editable: false,
  is_aggregated: false,
  order_of_display: 1,
  is_hidden: false,
  is_required: false,
  tc_mapping_code: "10063",
  aggregate_type: null,
  formatter: null,
  is_row_span: false,
  footer: null,
  is_searchable: false,
  extra: {},
  is_sortable: false,
  width: 200,
  is_deleted: false,
  is_master_group: false,
  parent_id: ["DC Inventory"],
  headerClass: "Total_Inventory",
  field: "bulk_remaining",
  accessor: "bulk_remaining",
  id: "bulk_remaining",
  headerName: "Total Inventory",
  pinned: null,
  required: false,
  resizable: true,
  suppressColumnsToolPanel: true,
  headerTooltip: "Total Inventory",
  showRangeFilter: false,
  filter: false,
  columnGroupShow: "closed",
  floatingFilter: false,
  floatingFilterComponentParams: {
    suppressFilterButton: true,
  },
  headerComponent: null,
  cellStyle: {
    textAlign: "right",
  },
  tooltipField: null,
  suppressSizeToFit: true,
};

export const DOWNLOAD_LIMIT_CONSTANT = 100000;

export const DOWNLOAD_LIMIT_EXCEED_ERR_MSG = "The download limit of 100K records is being exceeded. Please ensure your selection is within the 100K records limit and try again.";

export const PO_MSG_FOR_ARTICLE_MISMATCH = "Not a 100% Push: Some materials are ineligible for PO allocation due to inactive material status or missing Product-to-Store mapping.";

export const PARTIAL_ARTICLE_SELECT_MSG_FOR_PO = "Partial select not allowed for PO";

export const COLUMNS_TO_DISABLE = ["product_profile_pen"];

export const AUTO_ALLOCATION_RULE_STEPS = [
  "Select Stores",
  "Auto Allocation Scheduler",
];

export const BULK_EDIT_MAPPING_TILL_DATE = 
  {
    required: true,
    label: "Mapping Till Date",
    field_type: "DateTimeField",
    accessor: "mapping_till_date",
  };

  export const END_DATE_BEFORE_START_DATE_MSG = "End date should be greater than or equal to start date";

  export const SAVE_REQUEST_BACKGROUND = "Saved request is running in background. Please refresh the table once a notification is received";

  export const SET_ALL_VALID_ROWS = "Set all being applied for all valid rows";

  export const NEGATIVE_USER_RESERVE_VALIDATION_MSG = "Entered Negative User Reserve cannot be more than Total Units Reserved";

  export const NEGATIVE_USER_RESERVE_PERCENT_MSG = "User Reserve % cannot be less than -100";

  export const RESERVE_UN_RESERVED_VALIDATION_MSG = "No units Reserved for this article to unreserve";