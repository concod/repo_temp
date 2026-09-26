import { TENANT } from "config/api";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  ADA_VISUAL,
  ADA_VISUAL_MFP_DASHBOARD,
  ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
  ADA_VISUAL_STANDALONE,
  CONFIGURATION,
  CONSTRAINTS,
  CREATE_ALLOCATION as CREATE_ALLOCATION_ROUTE,
  CREATE_STORE_TRANSFER,
  MANAGE_EXCEPTIONS,
  AUTO_ALLOCATION_RECOMMENDATION,
} from "./routesConstants";

// common string constants
export const APP_NAME = "inventorysmart";
export const ERROR_MESSAGE = "Something Went Wrong!!";
export const BLANK_LIST = "Select at least one value";
export const NO_DATA_FOUND = "No Data Found!";
export const RANGE_FILTER_ERROR_MESSAGE = "Select both start and end dates!!";
export const RANGE_FILTER_START_DATE_ERROR_MESSAGE =
  "Start Date can't be today's date!!";
export const SUCCESS_MESSAGE = "Successfully fetched";
export const UPDATED_MESSAGE = "Successfully Updated";
export const DELETED_MESSAGE = "Successfully Deleted";
export const NO_UPDATE = "Nothing to Update!";
export const API_SUCCESS_MESSAGE_FINALIZE = "Allocation Finalized Successfully";
export const API_SUCCESS_MESSAGE_SAVE = "Saved Successfully";
export const FUTURE_DATE_RANGE_ERROR =
  "Future dates selection are not applicable!!";
export const FILE_DOWNLOADING_MESSAGE = "Your file will be downloaded soon.";
export const FILL_MANDATORY_FIELDS = "Please fill mandatory fields.";
export const MIN_ARTICLE_SELECTION_MESSAGE =
  "Please select atleast one article to continue";
export const DELETE_MESSAGE = "Are you sure you want to delete?";
export const DIALOG_REJECT_BTN_TEXT = "No";
export const DIALOG_CONFIRM_BTN_TEXT = "Yes";
export const DIALOG_APPLY_BTN_TEXT = "Apply";
export const DIALOG_CANCEL_BTN_TEXT = "Cancel";
export const DIALOG_FINALIZE_BTN_TEXT = "Finalize";
export const DIALOG_PROCEED_BTN_TEXT = "Proceed";
export const MIN_MAX_VALIDATION = "Min cannot be greater than Max!";
export const MAX_MIN_VALIDATION = "Max cannot be lesser than Min!";
export const CONTINUE_MESSAGE = "Are you sure you want to continue?";
export const SAVE_VALUE_MESSAGE = "Make sure to save the updated values first.";
export const CURRENT_DATE_START_DATE_VALIDATION =
  "Start date cannot be lesser than or equal to current date";
export const ALLOCATION_IN_EACHES_MESSAGE =
  "Allocation will be done in Eaches!!";
export const MANDATORY_FIELD_MSG = "Enter the value for at-least one field";
export const DC_STORE_STRATEGY_RULES_DELETE_WARNING =
  "Deleting this rule will result in its removal for all products linked to it. Are you sure you want to delete?";
export const EDIT_DELIVERY_DATE_PROMPT_SUBHEADING =
  "You are trying to edit Delivery Date/DC Ship Date within 1 Allocation plan at a Store level. This can yield to multiple Delivery Date/DC Ship Date inside one Allocation plan. Are you sure you want to proceed?";
//Sorting Order
export const DESC_ORDER = "desc";
export const ASC_ORDER = "asc";

// Forecast alerts - missing channel validation (blocks AOA navigation)
// User-facing strings are resolved via i18n; labelKey maps to a translation key.
export const MISSING_CHANNELS_COLUMN_CONFIG = [
  {
    column_name: "style_color_id",
    labelKey: "inventorysmart.missingChannelsStyleColorId",
    type: "str",
  },
  {
    column_name: "description",
    labelKey: "inventorysmart.missingChannelsDescription",
    type: "str",
  },
  {
    column_name: "selected_channel",
    labelKey: "inventorysmart.missingChannelsSelectedChannel",
    type: "str",
  },
  {
    column_name: "missing_channel",
    labelKey: "inventorysmart.missingChannel",
    type: "str",
  },
];

// Permissions and list of modules for Role Based Access
export const FULL_ACCESS_PERMISSIONS_LIST = [
  "create",
  "edit",
  "delete",
  "view",
  "approve",
];

export const INVENTORY_SUBMODULES_NAMES = {
  INVENTORY_DASHBOARD_FORECAST_KPI: "Forecast KPI",
  INVENTORY_DASHBOARD_FORECAST_ALERTS: "Forecast Alert",
  INVENTORY_DASHBOARD_STORE_INVENTORY_KPI: "Store Inventory KPI",
  INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS: "Store Inventory Alert",
  OMS_DASHBOARD_ORDER_INVENTORY_KPI: "Order Inventory KPI",
  OMS_DASHBOARD_ORDER_INVENTORY_ALERTS: "Order Inventory Alert",
  OMS_DASHBOARD_OMS_VENDOR_STORE_KPI: "Oms Vendor Store KPI",
  OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS: "Oms Vendor Store Alert",
  INVENTORY_DASHBOARD_VIEW_PLANS: "View Plan",
  INVENTORY_DASHBOARD_ARTICLE_DETAILS: "Article Details",
  INVENTORY_DASHBOARD_STORE_KPI: "Store KPI", //NEW to check if its needed
  INVENTORY_DASHBOARD_DC_KPI: "DC KPI",
  INVENTORY_CREATE_ALLOCATION_STORE_TABLE: "Create Allocation Store Table",
  INVENTORY_FINALIZE_PRODUCT_STORE_TABLE: "Finalise Product Store View",
  INVENTORY_FINALIZE_STORE_TABLE: "Finalise Store View",
  INVENTORY_IA_RECOMMENDED_PRODUCT_PROFILE: "IA Recommended Product Profile",
  INVENTORY_USER_CREATED_PRODUCT_PROFILE: "User Created Product Profile",
  INVENTORY_IA_RECOMMENDED_STORE_SIZE_CONTRIBUTION:
    "IA Recommended Store Size Contribution",
  INVENTORY_USER_CREATED_STORE_SIZE_CONTRIBUTION:
    "User Created Store Size Contribution",
  INVENTORY_CREATED_STYLE_DESCRIPTION: "User Created Style Description",
  INVENTORY_CREATE_PRODUCT_PROFILE_FORM: "Create Product Profile Form",
  INVENTORY_CREATE_PRODUCT_PROFILE_STYLE_DESCRIPTION:
    "Create Product Profile Style Description",
  INVENTORY_CREATE_PRODUCT_PROFILE_STORE_SIZE_CONTRIBUTION:
    "Create Product Profile STore Size Contribution",
  INVENTORY_STORE_CONSTRAINTS: "Store Constraints",
  INVENTORY_STORE_GRADE_CONSTRAINTS: "Store Grade Constraints",
  INVENTORY_STORE_GROUP_CONSTRAINTS: "Store Group Constraints",
  OMS_ORDER_STATUS: "Order Status",
  OMS_ORDER_DELIVERY: "Order Delivery",
  OMS_ORDER_ORDERING: "Order Ordering",
  OMS_ORDER_SAFETY_STOCK: "Order Safety Stock",
  OMS_ORDER_POLICY: "Order Policy",
  OMS_VENDOR_DC_POLICY: "Vendor DC Policy",
  OMS_PO_CONVERSION: "PO Conversion",
  OMS_RULES_CONSTRAINTS: "Oms Rules Constraints",
  OMS_SHIPMENT_CONSTRAINTS: "Oms Shipment Constraints",
  INVENTORY_USER_RESERVE: "User Reserve",
  INVENTORY_SMA: "SMA",
  INVENTORY_PRODUCT_RULES: "Product Rules",
  INVENTORY_PRODUCT_STATUS: "Product Status",
  INVENTORY_PRODUCT_PORT_OF_CALL: "Product Port Of Call",
  INVENTORY_PRODUCT_MAPPING: "Product Mapping",
  INVENTORY_STORE_STATUS: "Store Status",
  INVENTORY_STORE_MAPPING: "Store Mapping",
  INVENTORY_DC_STATUS: "DC Status",
  INVENTORY_DC_MAPPING: "DC Mapping",
  INVENTORY_STORE_GROUPING: "Store Grouping",
  INVENTORY_PRODUCT_GROUPING: "Product Grouping",
  INVENTORY_NEW_STORE_SETUP: "New Store",
  INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD: "Product Supersession Dashboard",
  INVENTORY_CREATE_NEW_PRODUCT_MAPPING: "Create New Product Mapping",
  INVENTORY_RULES_CONSTRAINTS: "Inventorysmart Rules Constraints",
  INVENTORY_EXCEPTION_CONSTRAINTS: "Inventorysmart Exception Constraints",
  INVENTORY_EXCEPTION_TAB_COMPONENT: "Inventorysmart Add Exception Constraints",
  INVENTORY_CREATE_RULES_CONSTRAINT: "Inventorysmart Create Rules Constraints",
  INVENTORY_PLAN_CONFIG: "Plan Config",
  INVENTORY_ALLOCATION_REPORTING_LOST_SALES: "Report Lost Sales",
  INVENTORY_ALLOCATION_REPORTING_STORE_STOCK: "Report Store Stock",
  INVENTORY_STORE_MAPPING_STORE_DC_FC: "Store to DC/FC Mapping",
  INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC: "Product to DC/FC Mapping",
  INVENTORY_STORE_TRANSFER_CONFIG:
    "Inventorysmart Configurations Store Transfer Configuration",
  INVENTORY_DC_TRANSFER_CONFIG: "DC Transfer Configuration",
  INVENTORY_DC_STORE_POLICY_STRATEGY: "Dc Store Policy Strategy",
  INVENTORY_ORDER_BATCHING: "Order Batching",
  INVENTORY_DC_STORE_AUTO_ALLOCATION_RULES: "Auto Allocation Rules",
  INVENTORY_DC_STORE_POLICY_STRATEGY_RULES: "Dc Store Policy Strategy Rules",
  INVENTORY_DC_STORE_SCHEDULER: "Allocation Scheduler",
  INVENTORY_DC_MAPPING_DC_PRODUCT: "Dc to Product Mapping",
  INVENTORY_DC_MAPPING_DC_STORE: "Dc to Store Mapping",
  INVENTORY_DC_TRANSFER_CONSTRAINTS: "Dc Transfer Constraints",
  INVENTORY_DC_TO_DC_TRANSFER: "Inventory-Dc-To-DC-Transfer",
  INVENTORY_DC_SERVICE_LEVELS: "Dc Service Levels",
  INVENTORY_REMODEL_STORE_SETUP: "New Remodel Store",
  INVENTORY_STORE_TRANSFER_RULE: "Inventorysmart Configurations Store Transfer",
  INVENTORY_CREATE_STORE_TRANSFER: "Create Store Transfer",
  INVENTORY_CREATE_DC_TRANSFER: "Create DC Transfer",
  INVENTORY_RULE_GROUP_CONSTRAINTS: "RulesGroupConstraint",
  INVENTORY_KPI_CUSTOM_KPIS: "Custom KPIs",
  INVENTORY_KPI_CALCULATED_FIELDS: "Calculated Fields",
  INVENTORY_RETAIL_EVENTS: "Retail Events",
};

export const ROLES_ACCESS_MODULES_MAPPING = {
  dashboard: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_KPI,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_ALERTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_KPI,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
    INVENTORY_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_INVENTORY_KPI,
    INVENTORY_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_INVENTORY_ALERTS,
    INVENTORY_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_KPI,
    INVENTORY_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS,
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
    INVENTORY_SUBMODULES_NAMES.OMS_ORDER_STATUS,
    INVENTORY_SUBMODULES_NAMES.OMS_ORDER_DELIVERY,
    INVENTORY_SUBMODULES_NAMES.OMS_ORDER_ORDERING,
    INVENTORY_SUBMODULES_NAMES.OMS_VENDOR_DC_POLICY,
    INVENTORY_SUBMODULES_NAMES.OMS_ORDER_SAFETY_STOCK,
    INVENTORY_SUBMODULES_NAMES.OMS_ORDER_POLICY,
    INVENTORY_SUBMODULES_NAMES.OMS_PO_CONVERSION,
    INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_RESERVE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_SMA,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_EXCEPTION_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.OMS_SHIPMENT_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TRANSFER_CONSTRAINTS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_SERVICE_LEVELS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_RULE_GROUP_CONSTRAINTS,
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
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PLAN_CONFIG,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING_STORE_DC_FC,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_AUTO_ALLOCATION_RULES,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY_RULES,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_SCHEDULER,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_REMODEL_STORE_SETUP,
    INVENTORY_SUBMODULES_NAMES.OMS_ORDER_STATUS,
    INVENTORY_SUBMODULES_NAMES.OMS_VENDOR_DC_POLICY,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_CONFIG,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TRANSFER_CONFIG,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_RETAIL_EVENTS,
  ],
  inventorysmart_store_eligibility_group: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
  ],
  inventorysmart_rules_constraint: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_RULES_CONSTRAINTS,
  ],
  inventorysmart_exception_constraint: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_EXCEPTION_CONSTRAINTS,
  ],
  inventorysmart_add_exception: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_EXCEPTION_TAB_COMPONENT,
  ],
  inventorysmart_create_rules: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
    INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
  ],
  inventorysmart_add_rules: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY,
    INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
  ],
  inventorysmart_create_new_rule: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY,
    INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
  ],
  inventorysmart_order_batching: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_BATCHING,
  ],
  inventorysmart_dc_to_dc_transfer: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TO_DC_TRANSFER,
  ],
  inventorysmart_create_store_transfer: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_STORE_TRANSFER,
  ],
  inventorysmart_create_dc_transfer: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_DC_TRANSFER,
  ],
  inventorysmart_kpi_configurator: [
    INVENTORY_SUBMODULES_NAMES.INVENTORY_KPI_CUSTOM_KPIS,
    INVENTORY_SUBMODULES_NAMES.INVENTORY_KPI_CALCULATED_FIELDS,
  ],
};

// Cache Module constants.
export const DASHBOARD_CACHE = "dashboard";
export const PRODUCT_PROFILE_CACHE = "inventorysmart_product_profile";
export const CNA_CACHE = "inventorysmart_create_allocation";
export const CREATE_STORE_TRANSFER_CACHE =
  "inventorysmart_create_store_transfer";
export const CREATE_DC_TRANSFER_CACHE = "inventorysmart_create_dc_transfer";
export const STORE_TRANSFER_CONFIG_CACHE =
  "inventorysmart_store_transfer_config";
export const GROUPING_CACHE = "inventorysmart_store_eligibility_group";
export const CONFIGUTAIONS_CACHE = "inventorysmart_configuration";
export const CONSTRAINTS_CACHE = "inventorysmart_constraints";
export const REPORTS_CACHE = "inventorysmart_allocation_report";
export const VIEW_PAST_ALLOCATION_CACHE = "inventorysmart_view_past_allocation";
export const ORDER_BACHING_CACHE = "inventorysmart_order_batching";

export const tableConfigurationMetaData = {
  meta: {
    search: [],
    sort: [],
    range: [],
  },
};

export const ALLOCATION_REPORT_HEADER_TAB = [
  { label: "Reporting", value: "allocation_reporting" },
];

// Decision Dashboard Constants and labels
export const NO_SAVED_FILTERS = "No Saved Filters Present to Preload Data";
export const CREATE_NEW_PLAN = "Create Allocation Plan";
export const STORE_INVENTORY_LABEL = `${
  dynamicLabelsBasedOnTenant("store", "core") || "Store"
} Inventory`;
export const INVENTORY_DASHBOARD_TAB_OPTIONS = {
  // to use this later
  dashboardWithForecastAndStoreInventory: [
    {
      label: "Forecast",
      value: "forecast",
    },
    {
      label: STORE_INVENTORY_LABEL,
      value: "store_inventory",
    },
  ],
  dashboardWithStoreInventory: [
    // {
    //   label: "Store Inventory",
    //   value: "store_inventory",
    // },
    {
      label: "",
      value: "store_inventory",
    },
  ],
  dashboardWithStoreInventoryAndForecast: [
    {
      label: STORE_INVENTORY_LABEL,
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
      label: STORE_INVENTORY_LABEL,
      value: "store_inventory",
    },
    {
      label: "Vendor-DC",
      value: "oms",
    },
  ],
  dashboardWithStoreAndOrderInventory: [
    {
      label: STORE_INVENTORY_LABEL,
      value: "store_inventory",
    },
    {
      label: "Vendor-DC",
      value: "oms",
    },
  ],
  dashboardWithStoreAndOmsDCStoreInventory: [
    {
      label: STORE_INVENTORY_LABEL,
      value: "store_inventory",
    },
    {
      label: "Vendor-DC",
      value: "oms",
    },
    {
      label: "Vendor-Store",
      value: "vendor_store",
    },
  ],
  dashboardWithOrderInventory: [
    {
      label: "Vendor-DC",
      value: "oms",
    },
  ],
  dashboardWithVendorDCAndVendorStoreOms: [
    {
      label: "Vendor-DC",
      value: "oms",
    },
    {
      label: "Vendor-Store",
      value: "vendor_store",
    },
  ],
  dashboardWithForecast: [
    {
      label: "Forecast",
      value: "forecast",
    },
  ],
};

export const INVENTORY_DASHBOARD_ALLOCATION_TABS = [
  { label: "DC to Store", value: "dc_to_store" },
  { label: "Store to Store", value: "store_to_store" },
];

export const SCREENS_LIST_MAP = {
  INVENTORYSMART_DASHBOARD_STORE_INVENTORY:
    "inventorysmart_dashboard_store_inventory",
  INVENTORYSMART_DASHBOARD_FORECAST: "inventorysmart_dashboard_forecast",
  INVENTORYSMART_DASHBOARD_ORDER: "inventorysmart_dashboard_order",
  INVENTORYSMART_DASHBOARD_ORDER_VENDOR_STORE:
    "inventorysmart_dashboard_oms_vendor_store",
};

export const SCREENS_SUBCOMPONENT_LIST_MAP = {
  INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY: "dashboardWithStoreInventory",
  INVENTORYSMART_DASHBOARD_WITH_FORECAST_AND_STORE_INVENTORY:
    "dashboardWithForecastAndStoreInventory",
  INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY_AND_FORECAST:
    "dashboardWithStoreInventoryAndForecast",
  INVENTORYSMART_DASHBOARD_WITH_STORE_FORECAST_AND_ORDER:
    "dashboardWithStoreForecastAndOrder",
  INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY_AND_OMS:
    "dashboardWithStoreAndOrderInventory",
  INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY_AND_OMS_DC_STORE:
    "dashboardWithStoreAndOmsDCStoreInventory",
  INVENTORYSMART_DASHBOARD_WITH_OMS: "dashboardWithOrderInventory",
  INVENTORYSMART_DASHBOARD_WITH_FORECAST: "dashboardWithForecast",
};

export const ACTUAL_PREDICTED = "Actual";
export const KPI_RECOMMENDED = "Recommended";
export const KPI_PLANNED = "Planned";

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
  "po allocation exclusion alert": 11,
};

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

export const UPDATE_MODAL_STOCK = [
  {
    label: "Model Stock",
    isDisabled: false,
    accessor: "model_stock",
    field_type: "IntegerField",
    value_type: "number",
  },
];

export const ALERTS_ACTION_MAP = {
  NEW_TABLE: "new_table",
  PAGINATED_NEW_TABLE: "paginated_new_table",
  POP_UP: "pop_up",
  POP_UP_LINK: "pop_up_link",
  DYNAMIC_POP_UP: "dynamic_pop_up",
  PAGINATED_POP_UP: "paginated_pop_up",
  CUSTOM_ALERT: "dropdown_table",
};

const getAdaLinks = () => {
  return {
    ADA_VISUAL: ADA_VISUAL_STANDALONE,
    ADA_VISUAL_MFP_DASHBOARD: ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
  };
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
    redirectionUrl: getAdaLinks().ADA_VISUAL,
    redirectionParams: `type=alerts`,
  },
  "ADA MFP": {
    label: "Change Forecast",
    permission: "edit",
    redirectionType: 4,
    redirectionUrl: getAdaLinks().ADA_VISUAL_MFP_DASHBOARD,
    redirectionParams: `type=alerts`,
  },
  Configuration: {
    label: "Go To Configuration",
    permission: "edit",
    redirectionType: 1,
    redirectionUrl: CONFIGURATION,
    redirectionParams: `type=alerts`,
  },
  "New Store Setup Review": {
    label: "Review",
    permission: "edit",
    redirectionType: 5,
    redirectionUrl: CONFIGURATION,
    redirectionParams: `tab0=1&tab1=2&type=alerts`,
    selectionRequired: false,
  },
  "PSME Exception": {
    label: "Manage Exception",
    permission: "edit",
    redirectionType: 1,
    redirectionUrl: MANAGE_EXCEPTIONS,
    redirectionParams: `type=alerts`,
  },
  "Create New Store Transfer": {
    label: "Create New Store Transfer",
    permission: "edit",
    redirectionType: 1,
    redirectionUrl: CREATE_STORE_TRANSFER,
    redirectionParams: `step=0&type=alerts`,
  },
  "Auto Allocation": {
    label: "Auto Allocation",
    permission: "edit",
    redirectionType: 1,
    redirectionUrl: AUTO_ALLOCATION_RECOMMENDATION,
    redirectionParams: `type=alerts`,
  },
};

export const UPDATE_MODEL_STOCK_PAYLOAD_KEY = {
  product_code: "product_code",
  store_code: "store_code",
  ms_model_stock: "model_stock",
  ms_date: "date",
  model_stock: "model_stock",
  date: "date",
};

export const KITS_ALLOCATION_ALERT_CONFIG_NAME = "kta";

// Product Profile Constants and labels
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
      { label: "Last 60 days", value: "Last 60 days", id: "Last 60 days" },
      { label: "Last 90 days", value: "Last 90 days", id: "Last 90 days" },
      { label: "Last 120 days", value: "Last 120 days", id: "Last 120 days" },
      { label: "Last 150 days", value: "Last 150 days", id: "Last 150 days" },
      { label: "Last 180 days", value: "Last 180 days", id: "Last 180 days" },
      { label: "Last 210 days", value: "Last 210 days", id: "Last 210 days" },
      { label: "Last 240 days", value: "Last 240 days", id: "Last 240 days" },
      { label: "Last 270 days", value: "Last 270 days", id: "Last 270 days" },
      { label: "Last 300 days", value: "Last 300 days", id: "Last 300 days" },
      { label: "Last 330 days", value: "Last 330 days", id: "Last 330 days" },
      { label: "Last 360 days", value: "Last 360 days", id: "Last 360 days" },
      { label: "Last 390 days", value: "Last 390 days", id: "Last 390 days" },
      { label: "Last 420 days", value: "Last 420 days", id: "Last 420 days" },
      { label: "Last 450 days", value: "Last 450 days", id: "Last 450 days" },
      { label: "Last 480 days", value: "Last 480 days", id: "Last 480 days" },
      { label: "Last 510 days", value: "Last 510 days", id: "Last 510 days" },
      { label: "Last 540 days", value: "Last 540 days", id: "Last 540 days" },
      { label: "Last 570 days", value: "Last 570 days", id: "Last 570 days" },
      { label: "Last 600 days", value: "Last 600 days", id: "Last 600 days" },
      { label: "Last 630 days", value: "Last 630 days", id: "Last 630 days" },
      { label: "Last 660 days", value: "Last 660 days", id: "Last 660 days" },
      { label: "Last 690 days", value: "Last 690 days", id: "Last 690 days" },
      { label: "Last 720 days", value: "Last 720 days", id: "Last 720 days" },
      { label: "Last 750 days", value: "Last 750 days", id: "Last 750 days" },
    ],
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];

export const DC_OUTBOUND_PRODUCTION_DROP_DOWN = [
  {
    accessor: "channel",
    field_type: "list",
    label: "Channel",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
    isClearable: true,
  },
  {
    accessor: "article",
    field_type: "list",
    label: "Choice",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
    isClearable: true,
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
    headerOrientation: "top",
    inputPosition: "bottom",
    label: "Price",
    range_max: 0,
    range_min: 0,
    variant: "ranged",
    is_required: true,
    field_type: "sliderRange",
    accessor: "price",
  },
];

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

export const defaultTableData = {
  data: [],
  totalCount: 0,
};

export const ACTIVE_STATUS_FILTER_PAYLOAD = {
  filter_id: "",
  attribute_name: "",
  operator: "in",
  dimension: "",
  values: [true, false],
  filter_type: "cascaded",
  display_type: "dropdown",
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

// Configuration constants and labels
export const POP_UP_TYPE = {
  store: "store",
  product_profile: "product_profile",
  dc: "dc",
};

export const ALERTS_CONFIGURATION_CHANNEL_FILTER = {
  attribute_name: "channel",
  display_type: "dropdown",
  filter_id: "channel",
  dimension: "store",
  filter_type: "cascaded",
  operator: "in",
};

export const tableArticleFilter = {
  filter_type: "cascaded",
  attribute_name: "primary_sku",
  operator: "in",
  dimension: "Product",
  values: [],
};

export const tablel6Filter = {
  filter_type: "cascaded",
  attribute_name: "l6_id",
  operator: "in",
  dimension: "Product",
  values: [],
};

export const PRODUCT_RULE_POP_UP_TITLE = {
  store_group_mapped_display: "Store Groups/Store Mapped",
  dc_mapped: "DC Mapped",
  old_id: "Old Style Mapped",
  product_profile_name: "Product Profiled Mapped",
};

export const SET_ALL_MODAL = [
  {
    accessor: "min_stock",
    field_type: "TextField",
    label: "Min",
    isDisabled: false,
  },
  {
    accessor: "max_stock",
    field_type: "TextField",
    label: "Max",
    isDisabled: false,
  },
  {
    accessor: "wos",
    field_type: "TextField",
    label: "WOS",
    isDisabled: false,
  },
  {
    accessor: "st_perc",
    field_type: "TextField",
    label: "ST%",
    isDisabled: false,
  },
];

export const PLAN_CONFIG_START_DATE_VALIDATION =
  "Start date cannot be greater than or equal to end date";
export const PLAN_CONFIG_END_DATE_VALIDATION =
  "End date cannot be lesser than or equal to Start date";

export const EXCEPTION_TABS_DETAIL = [
  {
    label: "Select Products",
    primaryButtonLabel: "Next",
    primaryButtonLabelOnRclRedirect: "Go To Select Exception Stores",
    secondaryButtonLabel: "Back",
    secondaryButtonLabelOnRclRedirect: "Back",
    activeState: 0,
    reducerKeyToCheck: "selectedProductList",
  },
  {
    label: "Select Store",
    primaryButtonLabel: "Add",
    primaryButtonLabelOnRclRedirect: "Go To Set Exceptions Constraints",
    secondaryButtonLabel: "Back",
    secondaryButtonLabelOnRclRedirect: "Back To Review Products",
    activeState: 1,
    reducerKeyToCheck: "selectedStoreList",
  },
  {
    label: "Set Constraints",
    primaryButtonLabel: "Save",
    primaryButtonLabelOnRclRedirect: "Save Rules With Exceptions",
    secondaryButtonLabel: "Back",
    secondaryButtonLabelOnRclRedirect: "Back To Select Exception Stores",
    activeState: 2,
    reducerKeyToCheck: "exceptionConstraintTableData",
  },
];

export const EXCEPTION_RCL_LABEL_MAP = {
  "Select Products": "Review Products",
  "Select Store": "Select Exception Stores",
  "Set Constraints": "Set Exception Constraints",
};

export const ADD_RCL_TABS_DATA = [
  {
    label: "Select Levels",
    primaryButtonLabel: "Next",
    secondaryButtonLabel: "Cancel",
    activeState: 0,
    reducerKeyToCheck: "selectedRclLevel",
  },
  {
    label: "Select Products",
    primaryButtonLabel: "Next",
    secondaryButtonLabel: "Back",
    activeState: 1,
    reducerKeyToCheck: "allFiltersSelectedRclProduct",
    callFunctionOnVefication: true,
  },
  {
    label: "Set Constraints",
    primaryButtonLabel: "Save Rule",
    secondaryButtonLabel: "Back",
    activeState: 2,
    reducerKeyToCheck: "rclConstraintsTableData",
  },
];

export const ALERT = "Alert!!";
export const ERROR = "Error!!";
export const INVALID_DRAFT = "Draft is not valid!!";
export const INVALID_DATE = "Invalid date";

export const DRAFT_FLOW = "draft";

export const CACHE_BLOCKSIZE_STRATEGY = 10;

export const CONFIRM_REVIEW_SUPERSESSION_MAPPING =
  "Are you sure you have reviewed all the mappings correctly?";
export const DISABLED_EDITING_SUPERSESSION_MAPPING =
  "Supersessiong Mapping is disabled here. Please share edit details to the IA Team from MOJO.";

export const ARTICLE_TABLE_SIZE_PROFILE_VALIDATION_MESSAGE =
  "Some of the selected articles do not have a size profile mapped to them";

export const GO_BACK_MESSAGE =
  "Are you sure you want to go back to the previous step ? Changes made will be lost.";

export const GO_BACK_MESSAGE_SUPERSESSION =
  "Are you sure you want to go back to the previous step ? Changes made will be lost. And the saved mappings would show up selected on the screen.";

export const GO_BACK_MESSAGE_DELETE_SCENARIO =
  "Are you sure you want to delete the scenario? This action cannot be undone.";

export const GO_BACK_MESSAGE_FINALIZE_SCENARIO =
  "Scenario allocation qty will override original allocation qty for the selected style. Do you want to proceed?";

export const ALLOCATION_COMPARE_EMPTY_HEADING =
  "Comparison not available";
export const ALLOCATION_COMPARE_COUNT_EMPTY_DESCRIPTION =
  "This comparison supports exactly two allocation codes.";

export const PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE = {
  column_name: "choice_type",
  sub: "Sub Choice",
  main: "Main Choice",
};

export const PRODUCT_SUPERSESSION_MAPPING = [
  "Select Products",
  "Review SKU Level Mapping",
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

export const FINALIZE_STORE_CAPACITY_GROUPED_COLUMN_NAMES = [
  "store_code",
  "store_name",
  "l1_name",
];

export const DEFAULT_CNA_OPTIMIZATION_SCREEN_HEADER =
  "Optimizing allocation for smarter inventory decisions";
export const DEFAULT_CNA_OPTIMIZATION_SCREEN_DESCRIPTION =
  "We're analyzing your SKU, store, and DC data to create an optimized allocation plan. You can stay here or return later. The run will continue in the background.";
export const FINALIZE_STORE_CAPACITY_PARENT_LEVEL_COLUMNS = [
  "store_code",
  "store_name",
  "store_tier",
];

export const TENANT_LOCALE = "en-US";
export const TENANT_DATE_FORMAT = "YYYY-MM-DD";

export const ORDER_PLACEMENT_DATE_COLUMN = "order_placement_date";
export const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";

export const EMPTY_NOT_BEFORE_DATE_ERROR = 'Please fill the "Not Before Date"';
export const START_END_DATE_ERROR_MESSAGE =
  "Please select a Start Date before the End Date";

export const PLAN_STATUS_TO_HIDE_BACK_BUTTON = ["Failure", null];
export const PLAN_TYPE_TO_HIDE_BACK_BUTTON = ["Auto Allocation"];
export const PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON = [
  "Finalized",
  "Failure",
  null,
];

export const CHECKALL_VALIDATION = "This feature doesnot support check all!!";

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

export const singleDatePickerConstant = [
  {
    fc_code: 176,
    label: "Allocation Finalised Date",
    column_name: "range-picker",
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
    filter_keyword: "range-picker",
    accessor: "range-picker",
    field_type: "DateTimeField",
    disableFuture: true,
  },
];

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK = {
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

export const FORECAST_ACCURACY_FISCAL_CALENDAR_FILTER_SINGLE_WEEK = {
  label: "Date Range",
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
    labelOrientation: "left",
  },
];

export const REPORT_DOWNLOAD_VALIDATION_MSG =
  "Please select only one department to download the report";

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

export const REPORT_SCREEN_TABS = [
  { label: "Lost Sales", value: "lost_sales" },
  { label: "Lost Sales", value: "lost_sales_with_graph" },
  { label: "Excess Inventory", value: "excess_inventory" },
  { label: "Excess Inventory", value: "excess_inv" },
  {
    label: `${
      dynamicLabelsBasedOnTenant("store", "core") || "Store"
    } Stock Drill Down`,
    value: "store_stock",
  },
  { label: "Daily Allocation Summary", value: "daily_allocation_summary" },
  { label: "Deep Dive", value: "deep_dive" },
  { label: "Forecast Accuracy", value: "forecast_accuracy" },
  { label: "Readiness Report", value: "readiness" },
  { label: "In Stock", value: "in_stock" },
  { label: "DC Outbound Projection", value: "dc_outbound_projection" },
  { label: "New Stores Tracking", value: "new_stores_tracking" },
];

export const MIN_MAX_ACCESSOR = {
  min_stock: "max_stock",
  max_stock: "min_stock",
  category_minimum: "category_maximum",
  category_maximum: "category_minimum",
};

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_MULTI_WEEK = {
  ...INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};

export const EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK = {
  label: "Date",
  column_name: "fiscal_date_range",
  default_value: null,
  dimension: "custom",
  type: "non-cascaded",
  display_order: 0,
  display_type: "fiscalCalendar",
  filter_keyword: "fiscal_date_range",
  isDisabled: false,
  is_mandatory: true,
  displayRow: false,
  showClearDates: true,
  reducerKey: "fiscalCalendar",
  maxOneWeekSelection: 0,
};
export const FORECAST_ACCURACY_FISCAL_CALENDAR_FILTER_MULTI_WEEK = {
  label: "Date",
  column_name: "fiscal_date_range",
  default_value: null,
  dimension: "custom",
  type: "non-cascaded",
  display_order: 0,
  display_type: "fiscalCalendar",
  filter_keyword: "fiscal_date_range",
  isDisabled: false,
  is_mandatory: true,
  displayRow: false,
  showClearDates: true,
  reducerKey: "fiscalCalendar",
  maxOneWeekSelection: 1,
};
export const IN_STOCK_FISCAL_CALENDAR_FILTER_SINGLE_WEEK = {
  label: "Date",
  column_name: "fiscal_date_range",
  default_value: null,
  dimension: "custom",
  type: "non-cascaded",
  display_order: 0,
  display_type: "fiscalCalendar",
  filter_keyword: "fiscal_date_range",
  isDisabled: false,
  is_mandatory: true,
  displayRow: false,
  showClearDates: true,
  reducerKey: "fiscalCalendar",
  maxOneWeekSelection: 0,
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
      { value: "store", label: "DC", isDisabled: false },
    ],
  },
];
export const DAILY_ALLOCATION_SUMMARY_VIEW_TYPE = [
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

export const DAILY_ALLOCATION_SUMMARY_DEFAULT_BUTTON_GROUP_OPTIONS = [
  {
    value: "product",
    label: "Product View",
    isDisabled: false,
  },
  { value: "store", label: "DC View", isDisabled: false },
];

export const DAILY_ALLOCATION_SUMMARY_DC_OPTIONS = [
  {
    value: "product",
    label: "Product View",
    isDisabled: false,
  },
  {
    value: "store",
    label: `${dynamicLabelsBasedOnTenant("store", "core") || "Store"} View`,
    isDisabled: false,
  },
];

export const EXCESS_INVENTORY_BUTTON_GROUP_OPTIONS = [
  { label: "Product View", value: "product-view" },
  { label: "Product Store View", value: "product-store-view" },
];

export const EXCESS_INVENTORY_DEFAULT_BUTTON_GROUP_OPTIONS = [
  { label: "Product Store View", value: "product-store-view" },
];

export const CREAT_RULES_COLUMN_CONFIG = [
  {
    label: "Select Level",
    accessor: "rcl_options",
    field_type: "checkBoxGroup",
    is_mandatory: true,
  },
];

export const CREATE_RULES_SELECT_PRODUCTS_CONFIG = {
  type: "cascaded",
  display_type: "dropdown",
  dimension: "product",
  is_multiple_selection: true,
  range_min: null,
  range_max: null,
  default_value: null,
  is_disabled: false,
  is_clearable: true,
  display_order: null,
  is_required: true,
  is_deleted: false,
};

export const CREATE_RULES_AUTOSELECT_PARENT_HIERARCHY =
  "Higher levels are selected automatically for a complete hierarchy.";

// Constraints module constants and labels
export const CONSTRAINTS_HEADER_TAB = [
  { label: "Store Allocations", value: "store_allocations" },
  { label: "OMS", value: "constraints_oms" },
  { label: "User Reserve", value: "user_reserve" },
  { label: "SMA", value: "sma" },
  { label: "DC to DC Transfer", value: "dc_transfer" }, // Add this new tab
];

export const USER_RESERVE_MANDATORY_FIELDS_MSG =
  "Enter all mandatory fields with proper values";

export const USER_RESERVE_AND_DC_AVAILABLE_VALIDATION_MSG =
  "Entered User Reserve cannot be more than DC Available";

export const USER_RESERVE_PERCENTAGE_AND_DC_AVAILABLE_VALIDATION_MSG =
  "Cannot Enter User Reserve % as DC Available is less than or equals to 0";

export const USER_RESERVE_PERCENTAGE_VALIDATION_MSG =
  "% cannot be more than 100";

export const USER_RESERVE_POSITIVE_NUMBER_VALIDATION_MSG =
  "Enter a proper positive value";

export const USER_RESERVE_ROW_EDIT_VALIDATION_MSG =
  "Enter user reserve and select reservation date for the following";

export const USER_RESERVE_VALUE_VALIDATION_MESSAGE =
  "Enter the value for user reserve";
export const USER_RESERVE_RESERVATION_DATE_VALIDATION_MESSAGE =
  "Select the reservation date";

// New store constants
export const NEW_STORE_STEPPER = [
  {
    label: "Store Details",
    description: "",
  },
  {
    label: "DC Config & Sister Stores Mapping",
    description: "",
  },
];

export const GO_TO_NEW_STORE_DASHBOARD_MESSAGE =
  "Are you sure you want to go back to new store dashboard?";

export const STORE_OPENING_FORM_CONSTANTS = [
  {
    required: true,
    label: "Reservation Date",
    field_type: "DateTimeField",
    accessor: "reservation_date",
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

export const NO_NEW_STORE_VALIDATION_MSG = "No new stores to map";

export const MAPPED_STORE_PERIOD_DATE_PICKER = [
  {
    required: true,
    label: "Sister Store Mapping Time Period",
    field_type: "DateTimeField",
    accessor: "sisterStoreDatePicker",
    disablePast: true,
  },
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
export const NO_STORE_GROUP_VALIDATION_MSG =
  "No store groups are present for the selected combination";

export const SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG =
  "The product hierarchy of the current row is already selected in previous row with similar combinations";

// DC Store Policy
export const COLUMN_TYPE_MAPPING = {
  store_groups_names: "storeName",
  store_store_groups_mapped: "store",
  product_profile: "product",
  dc_store_rule_name: "strategy",
  auto_allocation_rule_name: "allocation",
  auto_allocation_schedular_name: "scheduler",
  auto_allocation_schedular_store_level_name: "scheduler",
};
export const DC_STORE_CONFIG = {
  store: {
    table: "store_store_groups",
    label: "Store Mappings",
    attributeType: "default_store_groups",
    attributeName: "store_store_groups_mapped",
    selectIdentifier: "sg_code",
    selectionType: "multiple",
    nameIdentifier: "name",
    defaultValue: "0/0",
    defaultValueKey: "_default_store_groups_mapped",
  },
  storeName: {
    table: "store_store_groups",
    label: "Store Mappings",
    attributeType: "default_store_groups",
    attributeName: "store_groups_names",
    selectIdentifier: "sg_code",
    selectionType: "multiple",
    nameIdentifier: "name",
    defaultValue: "0/0",
    defaultValueKey: "_store_groups_names",
  },
  product: {
    table: {
      ia: "product_profile_store_policy",
      user: "product_profile_user_store_policy",
    },
    label: "Product Profile Mappings",
    attributeType: "default_product_profile",
    attributeName: "product_profile",
    selectIdentifier: "pp_code",
    selectionType: "single",
    nameIdentifier: "name",
    defaultValue: "ia-recommended",
    defaultValueKey: "_default_product_profile_name",
  },
  strategy: {
    table: "dc_store_rule_store_policy",
    label: "Strategy Mappings",
    attributeType: "dc_store_rule",
    attributeName: "dc_store_rule_name",
    selectIdentifier: "rule_code",
    selectionType: "single",
    nameIdentifier: "rule_name",
    defaultValue: "Default Rule",
    defaultValueKey: "_default_dc_store_rule_rule_name",
  },
  allocation: {
    table: "auto_allocation_rule_store_policy",
    label: "Allocation Mappings",
    attributeType: "auto_allocation_rule",
    attributeName: "auto_allocation_rule_name",
    selectIdentifier: "rule_code",
    selectionType: "single",
    nameIdentifier: "rule_name",
    defaultValue: "No Rule",
    defaultValueKey: "_default_auto_allocation_rule_name",
  },
  scheduler: {
    table: "auto_allocation_scheduler_store_policy",
    label: "Auto Allocation Scheduler Mappings",
    attributeType: "auto_allocation_schedular",
    selectIdentifier: "sh_code",
    attributeName: "auto_allocation_schedular_name",
    selectionType: "single",
    nameIdentifier: "sh_name",
    defaultValue: "No Rule",
    defaultValueKey: "_default_auto_allocation_scheduler_name",
  },
};

export const SET_ALL_FUNCTIONALITY_TABS = [
  { label: "Set All", value: "set-all" },
  { label: "Partial Set All", value: "partial-set-all" },
];

export const SET_ALL_FUNCTIONALITY_TABS_STORE_DC = [
  { label: "Set All", value: "set-all" },
];

export const OrderBatchingCustomFilters = [
  {
    fc_code: 174,
    label: "Po Type",
    column_name: "po_type",
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
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "L",
        label: "L",
        id: "L",
      },
      {
        value: "B",
        label: "B",
        id: "B",
      },
      {
        value: "S",
        label: "S",
        id: "S",
      },
    ],
    mappedKey: "",
    filter_keyword: "po_type",
  },
  {
    fc_code: 174,
    label: "Allocation Type",
    column_name: "allocation_type",
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
    filter_keyword: "allocation_type",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "Manual",
        label: "Manual",
        id: "Manual",
      },
      {
        value: "Auto",
        label: "Auto",
        id: "Auto",
      },
    ],
    mappedKey: "",
  },
  {
    fc_code: 174,
    label: "Allocation Plan Name",
    column_name: "allocation_code",
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
    filter_keyword: "allocation_code",
    levelLabel: "Hierarchy",
    initialData: [],
    mappedKey: "",
  },
];

export const OrderBatchingCustomFiltersS2S = [
  {
    fc_code: 174,
    label: "Transfer Plan Name",
    column_name: "allocation_code",
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
    filter_keyword: "allocation_code",
    levelLabel: "Hierarchy",
    initialData: [],
    mappedKey: "",
  },
  {
    fc_code: 174,
    label: "Created Date",
    column_name: "created_at",
    type: "non-cascaded",
    display_type: "rangePicker",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    is_multiple_selection: false,
    range_min: null,
    range_max: null,
    default_value: null,
    is_disabled: false,
    is_clearable: true,
    display_order: 18,
    is_required: false,
    extra: {},
    filter_keyword: "created_at",
    levelLabel: "Hierarchy",
    field_type: "rangePicker",
    mappedKey: "",
    disableType: "disableOnlyFuture",
  },
];

export const MFP_ADA_SCREENNAME = "MFP ADA Dashboard";

export const ALLOCATION_DETAILS_CUSTOM_FILTERS = [
  {
    fc_code: 177,
    label: "Allocation Type",
    column_name: "type",
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
    filter_keyword: "type",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "[0,3,4,5]",
        label: "Manual",
        id: "[0,3,4,5]",
      },
      {
        value: "[2]",
        label: "Auto",
        id: "[2]",
      },
    ],
    mappedKey: "",
  },
  {
    fc_code: 177,
    label: "Allocation Plan Name",
    column_name: "plan_code",
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
    filter_keyword: "plan_code",
    levelLabel: "Hierarchy",
    initialData: [],
    mappedKey: "",
  },
];

export const DEEP_DIVE_CUSTOM_DROPDOWNS = [
  {
    type: "non-cascaded",
    extra: {},
    label: "Max Supression",
    level: 1,
    fc_code: 176,
    dimension: "custom",
    mappedKey: "",
    range_max: null,
    range_min: null,
    levelLabel: "Hierarchy",
    column_name: "max_supression_flag",
    initialData: [
      {
        id: "Yes",
        label: "Yes",
        value: "Yes",
      },
      {
        id: "No",
        label: "No",
        value: "No",
      },
    ],
    is_disabled: false,
    is_required: false,
    display_type: "dropdown",
    is_clearable: true,
    is_mandatory: false,
    default_value: null,
    display_order: 18,
    filter_keyword: "max_supression_flag",
    is_multiple_selection: true,
  },
  {
    type: "non-cascaded",
    extra: {},
    label: "Min Influenced",
    level: 1,
    fc_code: 176,
    dimension: "custom",
    mappedKey: "",
    range_max: null,
    range_min: null,
    levelLabel: "Hierarchy",
    column_name: "min_influenced_allocation",
    initialData: [
      {
        id: "Yes",
        label: "Yes",
        value: "Yes",
      },
      {
        id: "No",
        label: "No",
        value: "No",
      },
    ],
    is_disabled: false,
    is_required: false,
    display_type: "dropdown",
    is_clearable: true,
    is_mandatory: false,
    default_value: null,
    display_order: 19,
    filter_keyword: "min_influenced_allocation",
    is_multiple_selection: true,
  },
  {
    type: "non-cascaded",
    extra: {},
    label: "Is Edited",
    level: 1,
    fc_code: 176,
    dimension: "custom",
    mappedKey: "",
    range_max: null,
    range_min: null,
    levelLabel: "Hierarchy",
    column_name: "is_edited",
    initialData: [
      {
        id: "Yes",
        label: "Yes",
        value: "Yes",
      },
      {
        id: "No",
        label: "No",
        value: "No",
      },
    ],
    is_disabled: false,
    is_required: false,
    display_type: "dropdown",
    is_clearable: true,
    is_mandatory: false,
    default_value: null,
    display_order: 20,
    filter_keyword: "is_edited",
    is_multiple_selection: true,
  },
];

export const APPROVE_CONFIRM_MESSAGE =
  "Are you sure you want to approve the selected SKU(s)?";
export const SEND_FOR_APPROVAL = "Send for Approval";
export const APPROVAL_LIST = ["Approve", "Send_for_Approval_1"];

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

export const INVALID_ORDER_MULTIPLE =
  "Order Multiple must be a integer value greater than 0";
export const INVALID_MIN_QTY =
  "Minimum Qty must be a integer value greater than 0";
export const NUMERIC_FIELD = "IntegerField";

export const EMPTY_ORDER_QTY = "Order quantity cannot be empty.";
export const INVALID_ORDER_QTY =
  "Order quantity must be a value between Min and Max Order Quantity.";
export const INVALID_ORDER_QTY_PACKSIZE =
  "Order quantity must be a multiple of Pack size.";
export const INVALID_RECEIPT_DATE =
  "Expected Receipt Date should be greater than Order Placement Date";
export const INVALID_EDITABLE_RECEIPT_DATE =
  "User Adjusted Delivery Date should be greater than Order Placement Date";

export const INVALID_DATE_ERROR_MESSAGE = "Enter a valid Date";
export const NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE =
  'Enter a "Not Before Date" and "Not After Date" after Order Placement Date';
export const NOT_BEFORE_DATE_ERROR_MESSAGE =
  'Enter a "Not Before Date" between Order Placement Date and "Not After Date"';
export const NOT_AFTER_DATE_ERROR_MESSAGE =
  'Enter a date after "Order Placement Date" and "Not Before Date" ';
export const ORDER_PLACEMENT_DATE_ERROR_MESSAGE =
  'Enter a date between Todays date and "Not Before Date"';

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

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK = {
  ...INVENTORY_DASHBOARD_FISCAL_CALENDAR_OMS_RECEIPT_DATE_FILTER_SINGLE_WEEK,
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

export const INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_MULTI_WEEK = {
  ...INVENTORY_DASHBOARD_FISCAL_CALENDAR_OMS_FILTER_SINGLE_WEEK,
  maxOneWeekSelection: 0,
};

export const FAILED_TEXT = "Order already exists for ";
export const FAILED_ALL_TEXT = "Order already exists for all SKUs";
export const SUCCESS_TEXT =
  "Order created successfully, except those with 0 quantity";
export const SUCCESS_ALL_TEXT =
  "Order created successfully, except those with 0 quantity";
export const SUCCESS_APPROVAL = "Order Approval successfully";

//OMS Deep Dive
export const OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD = {
  isRedirection: true,
  selectedFilters: [],
  dateFilters: [],
  selectedRowIds: [],
  tabSelected: "style_order_summary",
  isRedirectedFromISModules: true,
};

export const ORDER_COST_COLUMN = "order_cost";
export const ORDER_QUANTITY_COLUMN = "order_quantity";
export const ORDER_QUANTITY_EACHES_COLUMN = "order_quantity_eaches";
export const ORDER_RETAIL_COLUMN = "order_retail";
export const NOT_BEFORE_DATE_COLUMN = "editable_not_before_date";
export const NOT_AFTER_DATE_COLUMN = "editable_not_after_date";
export const PLACEMENT_DATE_COLUMN = "order_placement_date";
export const EXPECTED_RECEIPT_DATE_COLUMN = "expected_receipt_date";
export const EXPECTED_RECEIPT_DATE_COLUMN_STORE =
  "editable_expected_receipt_date";
export const ERROR_MESSAGE_DATES_UPDATE = "Updating NBD and NAD Dates failed!";
export const ERROR_MESSAGE_QUANTITY_UPDATE = "Updating Order Quantity failed!";
export const INVALID_VALUE_MESSAGE = "Please input a valid value.";
export const ORDER_REASON_COLUMN = "order_reason";
export const SHIP_MODE_COLUMN = "ship_mode";
export const SIZE_COLUMN = "size_column";

export const SELECT_FILTERS_MESSAGE =
  "Click on select filters to filter and view data";

export const MAX_VALIDATION_MESSAGE = "Max cannot be greater than - ";
export const PRODUCT_PROFILE_NAME_VALIDATION =
  "Profile name and profile description cannot have special characters";

export const NEW_STORE_APPROVE_PERMISSION_MSG =
  "You don't have permission to approve";
export const NEW_STORE_RELEASE_VALIDATION_MSG = "This store cannot be released";
export const RESERVATION_DATE_VALIDATION_MSG =
  "Reservation date cannot be greater than or equal to store opening date";
export const RESERVATION_STORE_OPENING_GAP_VALIDATION_MSG =
  "The maximum gap between the Reservation Start Date and the Store Opening Date cannot exceed 90 days";
export const NEW_STORE_EDIT_VALIDATION_MSG =
  "This store cannot be edited as the reservation date has crossed";
export const NEW_STORE_DELETE_VALIDATION_MSG =
  "This store cannot be deleted as the reservation date has crossed";
export const NEW_STORE_APPROVE_VALIDATION_MSG = "This store cannot be reserved";
export const NO_TABLE_DATA_MESSAGE = "No data applicable for selected filters";
export const NO_CHANGES_SAVED = "No changes to be saved";
export const PDQ_SKU_VALIDATION =
  "You are trying to allocate a PDQ. Please create the allocation through the alerts section or deselect the following SKU's to proceed with creating an allocation";

// Remodel store constants
export const REMODEL_STORE_STEPPER = [
  {
    label: "Store Attributes",
    isEditable: false,
    isCompleted: false,
  },
  {
    label: "Manage Demand",
    isEditable: false,
    isCompleted: false,
  },
];
export const REMODEL_RESERVATION_STORE_OPENING_GAP_VALIDATION_MSG =
  "The maximum gap between the Remodel Store Reservation Date and the Remodel Store Opening Date cannot exceed 90 days";

export const GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE =
  "Are you sure you want to go back to Remodel store dashboard?";

export const REMODEL_STORE_LEGACY_CLOSING_DATE_VALIDATION =
  "Legacy closing date and Temp Open date should be greater than Temp Effective date";
export const REMODEL_STORE_TEMP_OPENING_DATE_VALIDATION =
  "Legacy closing date should be one day prior to Temp Open date";
export const REMODEL_STORE_TEMP_OPEN_DATE_MAX_VALIDATION =
  "Temp Open date should be prior to Remodel Effective date";
export const REMODEL_STORE_TEMP_CLOSING_DATE_VALIDATION =
  "Temp closing date lies between Remodel Effective date and Remodel Open date";
export const REMODEL_STORE_RESERVATION_DATE_VALIATION =
  "Remodel Reservation date should be between Remodel Effective date and Temp Closing date";

const LEGACY_STORE_TIME_PERIOD_OPTIONS = [
  { label: "30 days", value: "30 days", id: "30 days" },
  { label: "60 days", value: "60 days", id: "60 days" },
  { label: "90 days", value: "90 days", id: "90 days" },
];

export const LEGACY_STORE_TIME_PERIOD_OPTIONS_FOR_TEMP_STORE = [
  {
    accessor: "tempStoreTimePeriod",
    field_type: "list",
    label: "Legacy Store Mapping Time Period",
    required: true,
    options: LEGACY_STORE_TIME_PERIOD_OPTIONS,
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];

export const REMODEL_TEMP_STORE_DATE_PICKER = [
  {
    required: true,
    label: "Legacy Store Mapping Time Period",
    field_type: "DateTimeField",
    accessor: "tempStoreDatePicker",
    disablePast: true,
  },
];

export const LEGACY_STORE_TIME_PERIOD_OPTIONS_FOR_REMODEL_STORE = [
  {
    accessor: "remodelStoreTimePeriod",
    field_type: "list",
    label: "Legacy Store Mapping Time Period",
    required: true,
    options: LEGACY_STORE_TIME_PERIOD_OPTIONS,
    isMulti: false,
    isSearchable: false,
    isClearable: false,
  },
];

export const REMODEL_STORE_DATE_PICKER = [
  {
    required: true,
    label: "Legacy Store Mapping Time Period",
    field_type: "DateTimeField",
    accessor: "remodelStoreDatePicker",
    disablePast: true,
  },
];

export const TEMP_STORE_TABLE_ROW_ATTRIBUTES_EMPTY_VALIDATION =
  "Please select all hierarchies in the temp demand multiplier table ";
export const REMODEL_STORE_EDIT_VALIDATION_MSG =
  "This store cannot be edited as the reservation date has crossed";
export const REMODEL_STORE_TABLE_ROW_ATTRIBUTES_EMPTY_VALIDATION =
  "Please select all hierarchies in the remodel demand multiplier table";
export const TEMP_STORE_DATE_PICKER_VALIDATION =
  "Please select the Temp-Legacy Store Mapping Static Time Period";
export const TEMP_STORE_TIME_PERIOD_VALIDATION =
  "Please select the Temp-Legacy Store Mapping Dynamic Time Period";
export const REMODEL_STORE_DATE_PICKER_VALIDATION =
  "Please select the Remodel-Legacy Store Mapping Static Time Period";
export const REMODEL_STORE_TIME_PERIOD_VALIDATION =
  "Please select the Remodel-Legacy Store Mapping Dynamic Time Period";
export const REMODEL_STORE_APPROVE_PERMISSION_MSG =
  "You don't have permission to approve";
export const REMODEL_STORE_APPROVE_VALIDATION_MSG =
  "Reserve flow can only be accessed after Remodel Effective Date and before Remodel Deploy Date.";
export const REMODEL_STORE_RELEASE_VALIDATION_MSG =
  "This store cannot be released";
export const NO_TABLE_DATA_MSG = "No data found for selected store";
export const NO_NEW_LEGACY_STORE_VALIDATION_MSG = "No legacy stores to map";

export const BACKDOOR_CSV_CONFIG_CARTERS = [
  { label: "PO Type", key: "po_id" },
  { label: "Blanket Number (Bulk PO)", key: "sizes" },
  { label: "Style Code", key: "style" },
  { label: "Dim CODE", key: "dim_code" },
  { label: "Ordered Units/Number of Packs", key: "pack_count" },
  { label: "DC code", key: "dc_code" },
  { label: "Location Code", key: "location" },
  { label: "Primary Size Label", key: "size_label" },
];

export const BACKDOOR_FILE_UPLOAD_INSTRUCTIONS_CARTERS = [
  "For B type allocations, except Blanket Number all fields are mandatory",
  "For L type allocations, except DC code all fields are mandatory",
  "For S type allocations, except  Blanket Number and DC code all fields are mandatory",
  "The Style, Location Code, and DC Code must all be active.",
  "In the case of pack allocation, the Primary Size Label must be designated as MIX.",
  "The Number of packs uploaded must be a positive integer; otherwise, an error will be generated.",
  "All the fields provided in the input must be valid.",
  "If the DC inventory for a Style-Size combination is less than the total allocation quantity across all stores in the uploaded sheet, an error will be generated.",
  "The system accepts only Main Styles during the allocation upload (Supersession substyles cannot be part of this upload)",
  "Duplicate records are not permitted.",
  "Each allocation must contain only a single PO type (B, L, or S).",
  "Files should not contain records from multiple countries or channels.",
];

export const CHOICE_VIEW_CUSTOM_FILTER_CONFIG = [
  {
    fc_code: 185,
    label: "Metric",
    column_name: "view_metric",
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
    display_order: 2,
    is_required: false,
    extra: {},
    filter_keyword: "view_metric",
    levelLabel: "Hierarchy",
    initialData: [
      {
        value: "MIN",
        label: "MIN",
        id: "MIN",
      },
      {
        value: "MAX",
        label: "MAX",
        id: "MAX",
      },
      {
        value: "WOS",
        label: "WOS",
        id: "WOS",
      },
    ],
    mappedKey: "",
  },
];
export const AUTO_ALLOCATION_RULE_DELETE_VALIDATION_MESSAGE =
  "Deleting this rule will result in its removal for all products linked to it";

export const IN_STOCK_BUTTON_GROUP_OPTIONS = [
  { label: "SKU View", value: "article" },
  { label: "SKU-Store View", value: "store" },
];

export const DC_TRANSFER_SUBTABS = [
  { label: "DC Transfer Constraints", value: "dc_transfer_constraints" },
  { label: "DC Service Levels", value: "dc_service_levels" },
];

export const REMODEL_STORE_HYPERLINK_VALIDATION =
  "You can view reserved inventory only after the Remodel Effective Date has been reached.";

export const NEW_STORE_SETUP_USER_ACTION_REQUIRED_MESSAGE =
  "You do not have access to complete setup for this store";

export const NEW_STORE_SETUP_PROJECTIONS_VALIDATION =
  "Allocation projections can be viewed once the new store setup is complete";

export const NEW_STORE_STORE_DETAILS_FORM_CONFIG = [
  {
    accessor: "store_code",
    field_type: "list",
    required: true,
    label: "Store Code",
    is_store_attribute_column: true,
    isDisabled: false,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: false,
    labelOrientation: "left",
  },
];

export const NEW_STORE_STORE_GROUP_MAPPING_FORM_CONFIG = [
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

export const NEW_STORE_MAPPED_STORE_PERIOD_DATE_PICKER = [
  {
    required: true,
    label: "",
    field_type: "DateTimeField",
    accessor: "sisterStoreDatePicker",
    disablePast: true,
  },
];

export const NEW_STORE_MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS = [
  {
    accessor: "sisterStoreTimePeriod",
    field_type: "list",
    label: "",
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

export const NEW_STORE_NO_FURTHER_ACTION_REQUIRED_MESSAGE =
  "No further action required";

export const OMS_CNO_DATA_DATE_FORMAT = "YYYY/MM/DD";

export const uploadedOption = {
  value: "[9,10,11]",
  label: "Uploaded",
  id: "[9,10,11]",
};
export const ORDER_BATCHING_NEW_VALUE_GREATER_THAN_OLD_VALUE_MESSAGE =
  "New value cannot be greater than initial value";

export const INPUT_CAPPED_TO_MAX_LIMIT_MESSAGE =
  "Input capped to maximum available limit.";

export const NEW_STORE_RELEASE_FLOW_EDIT_VALIDATION_MESSAGE =
  "Release quantity cannot be greater than DC OH Net Available(Cyclic)";

export const OB_SSE_CONNECTION_ERROR_MESSAGE =
  "Error while establishing SSE connection(for notification)";

export const ORDER_BATCHING_TABS = [
  { label: "DC to Store", value: "dc_to_store" },
  { label: "Store to Store", value: "store_to_store" },
];

export const VIEW_PAST_ALLOCATION_TABS = [
  { label: "DC to Store", value: "dc_to_store" },
  { label: "Store to Store", value: "store_to_store" },
];

export const VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY =
  "viewPastAllocationFilterConfiguration";
export const VIEW_PAST_ALLOCATION_FILTER_CONFIG_KEY_S2S =
  "viewPastAllocationFilterConfigurationS2S";
export const VIEW_PAST_ALLOCATION_FILTER_CONFIG_NAME =
  "Inventorysmart View Past Allocations";
export const VIEW_PAST_ALLOCATION_FILTER_CONFIG_NAME_S2S =
  "Inventorysmart View Past Allocations S2S";

export const OB_SSE_NOTIFICATION_ERROR_MESSAGE =
  "Issue in sending refresh notification, please try again";

export const OB_DATA_REFRESH_SUCCESS_MESSAGE =
  "Data has been updated successfully, refreshing data...";

export const DISTRIBUTION_STRATEGY_TABLE_CONFIG = {
  sub_headers: [],
  tc_code: 5051,
  dimension: "product",
  type: "str",
  is_frozen: false,
  is_editable: false,
  is_aggregated: false,
  order_of_display: 1,
  is_hidden: false,
  is_required: false,
  tc_mapping_code: "5051001",
  aggregate_type: null,
  formatter: null,
  is_row_span: false,
  footer: null,
  is_searchable: false,
  extra: {},
  is_sortable: true,
  width: 200,
  is_deleted: false,
  is_master_group: false,
};
export const TRANSFER_TYPE_OPTIONS = [
  { value: "WITHIN CHANNEL REBALANCING", label: "Within Channel Rebalancing" },
  { value: "CROSS CHANNEL REBALANCING", label: "Cross Channel Rebalancing" },
  { value: "CROSS CHANNEL PUSH", label: "Cross Channel Push" },
];

export const MIN_DISTRIBUTION_MAP = {
  same_min: "Same minimum for all sizes",
  equal_distribute: "Equally distribute across sizes",
  product_profile: "Product profile",
  x_units_per_size: "Atleast X units per size",
};

/** Grid display labels for create-new-rule min distribution (style + size). */
export const STYLE_DISTRIBUTION_DISPLAY_MAP = {
  same_min: "Same Min For All Style Color IDs",
  equal_distribute: "Equally Distribute",
  demand_profile: "Demand Profile",
  x_units_per_article: "Atleast X Per Style Color ID",
};

export const SIZE_DISTRIBUTION_DISPLAY_MAP = {
  same_min: "Same Min For All Sizes",
  equal_distribute: "Equally Distribute",
  product_profile: "Product Profile",
  x_units_per_size: "Atleast X Per Size",
};

export const REDIRECT_FROM_VIEW_PAST_ALLOCATION = "viewPastAllocation";
