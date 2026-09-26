import {
  GET_STORE_TO_DC,
  GET_TABLE_DATA,
  GET_PRODUCT_TO_DC,
  DOWNLOAD_TABLE_DATA,
  SET_ALL_TABLE_DATA,
} from "config/api";
import {
  ARTICLE_INVENTORY_TABLE_DATA,
  DOWNLOAD_REPORT_DC_LEAD_TIME,
  GET_ADDITIONAL_REPORTS_DATA,
  GET_ALLOCATE,
  GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_ARTICLE_TO_STORE_VIEW,
  GET_DAILY_ALLOCATION_STORE_TO_ARTICLE_VIEW,
  GET_DAILY_ALLOCATION_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE,
  GET_EXCESS_INVENTORY_GRAPHDATA,
  GET_EXCESS_INVENTORY_TABLE_DETAILS,
  GET_EXCESS_INV_REPORT_TABLE_DATA,
  GET_FORECASTED_UNITS_TABLE_LIST,
  GET_FORECAST_REPORTS_TABLE_DATA,
  GET_IA_RECOMMENDED_TABLE_DATA,
  GET_IN_STOCK_TABLE_DATA,
  GET_LOST_SALES_GRAPHDATA,
  GET_LOST_SALES_TABLE_DETAILS,
  GET_MODEL_STOCK_DEEP_DIVE_TABLE_DATA,
  GET_ORDER_BATCHING_METRICS,
  GET_ORDER_BATCHING_TABLE_DATA,
  GET_PAST_ALLOCATION_TABLE_DATA,
  GET_PRODUCTS_STORE_SIZE_PENETRATION,
  GET_PRODUCTS_TO_SELECT,
  GET_REPORT_DOWNLOAD_REQUEST,
  GET_STORE_DC_CONFIG_TABLE_DATA,
  GET_STORE_GRADE_LEVEL_TABLE_DATA,
  GET_STORE_GROUP_LEVEL_TABLE_DATA,
  GET_STORE_LEVEL_TABLE_DATA,
  GET_STORE_SIZE_CONTRIBUTION_DATA,
  GET_STORE_STOCK_DRILL_DOWN_LIST,
  GET_STYLE_COLOR_DESCRIPTION_DATA,
  GET_USER_CREATED_TABLE_DATA,
  PRODUCT_RULE_DASHBOARD_TABLE_ROW_DATA,
  SAVE_STORE_DC_CONFIG_CHECKALL,
  VIEWPLANS_TABLE_DATA,
  PRODUCT_RULE_DOWNLOAD,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import theme from "core/Styles/theme";
/**
 * App Global Styles, Themes, Constants go below
 */

export const APP_PLATFORM = {
  APP_NAME: "[UAT] IA Smart Platform",
  DEMO_PAGE: "https://www.impactanalytics.co/schedule-demo/",
  CONTACT_PAGE: "https://www.impactanalytics.co/contact-us/",
};

export const POSTHOG_KEY = "phc_jdfaPUcheTjuLkcagCcjqQx4ebTtQLcSiq115zfZQJj";

/**
 * Constants for the App Attribute Smart are defined below
 */
export const APP_ATTRIBUTE_SMART = {
  APP_NAME: "AttributeSmart",
  ATTRIBUTE_SMART_SAMPLE_CSV:
    "https://storage.googleapis.com/generic-attribute-smart-public-test/sample_csv/dsg_sample.csv",
};

export const APP_MARKSMART = {
  APP_NAME: "MarkSmart",
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
  { label: "Others", id: "others" },
];
export const FILTER_DIMENSIONS = {
  product: [
    { label: "Ticket", value: 87 },
    { label: "Subticket", value: 88 },
  ],
  store: [
    { label: "Ticket", value: 87 },
    { label: "Subticket1", value: 89 },
  ],
  others: [
    { label: "Ticket", value: 87 },
    { label: "Subticket2", value: 90 },
  ],
};
export const FILTER_MODULES = {
  product: [
    {
      label: "Reporting",
      id: 1,
    },
    {
      label: "Admin",
      id: 2,
    },
    {
      label: "Notifications",
      id: 3,
    },
  ],
  store: [
    {
      label: "Reporting",
      id: 1,
    },
    {
      label: "Admin",
      id: 2,
    },
    {
      label: "Notifications",
      id: 3,
    },
  ],
  others: [
    {
      label: "Reporting",
      id: 1,
    },
    {
      label: "Admin",
      id: 2,
    },
    {
      label: "Notifications",
      id: 3,
    },
  ],
};

export const FORM_CONSTANT_FIELDS = [
  "dropdown",
  "radio",
  "checkbox",
  "TextField",
  "range_picker",
  "list",
];

export const FILTER_TYPES = [
  { label: "Cascaded", value: "cascaded" },
  { label: "NonCascaded", value: "non-cascaded" },
];

export const UNIT_TYPES = [
  {
    label: "Eaches",
    value: "eaches",
  },
  {
    label: "Packs",
    value: "packs",
  },
  {
    label: "Cartons",
    value: "cartons",
  },
  {
    label: "Boxes",
    value: "boxes",
  },
];

export const UNIT_DEFN_ATTRIBUTE_TYPES = [
  {
    label: "Single Size - All Colors",
    value: "single size - all colors",
  },
  {
    label: "All Size - Single Color",
    value: "all size - single color",
  },
  {
    label: "Different Size - Different Color",
    value: "different size - different color",
  },
];
export const MANUAL_GROUP_TYPE_FILTERS = [
  {
    label: "Product Hierarchy",
    value: "product_hierarchy",
  },
  {
    label: "Grouping Definitions",
    value: "grouping_definitions",
  },
];
export const MANUAL_GROUP_TYPE_FILTERS_FOR_INVENTORY = [
  {
    label: "Product Hierarchy",
    value: "product_hierarchy",
  },
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
    { label: "Renovation", id: "renovation", value: "renovation" },
  ],
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
  custom: "secondary",
};

export const API_META_BODY = {
  range: [],
  sort: [],
  search: [],
};
export const API_POST_BODY_META_DATA = {
  filters: [],
  ...API_META_BODY,
};
export const DEFAULT_DATE_FORMAT = "MM/DD/YYYY";
export const DATE_FORMATS = [
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY-MM-DD",
  "MM-DD-YYYY HH:mm:ss",
  "MM-DD-YYYYTHH:mm:ssZ",
  "YYYY-MM-DDTHH:mm:ssZ",
  "YYYY-MM-DD HH:mm:ss",
  "MM-DD-YYYY, HH:mm:ss",
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
  "Dec",
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
  GET_ORDER_BATCHING_METRICS,
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
  { url: "/inventory-smart/set-all/get-record-count/constraint" },
  {url:"/inventory-smart/product-rule/stores-allocation-schedulers"},
  {
    url: DOWNLOAD_TABLE_DATA,
    dimensions: [{ dimension: "store", key: ["table_payload", "filters"] }],
  },
  {
    url: `${GET_TABLE_DATA}/product`,
    dimensions: [{ dimension: "product", key: "filters" }],
  }, //Product Status
  {
    url: `${GET_TABLE_DATA}/store`,
    dimensions: [{ dimension: "store", key: "filters" }],
  }, //Store Status
  {
    url: `/master/products`,
    dimensions: [{ dimension: "product", key: "filters" }],
  }, //Product Mapping Dashboard Screen fetch products API
  {
    url: `/product-mapping/stores`,
    dimensions: [{ dimension: "store", key: "filters" }],
  }, //Product Mapping Modify screen fetch stores API
  {
    url: `/product-mapping/stores/download`,
    dimensions: [{ dimension: "store", key: "filters" }],
  }, //Product Mapping Modify screen download stores API
  {
    url: `/master/stores`,
    dimensions: [{ dimension: "store", key: "filters" }],
  }, //Store Mapping Dashboard screen fetch stores API
  {
    url: `/core/group/store/new`,
    dimensions: [
      { dimension: "store", key: ["store_ids", "filters"] },
      { dimension: "store", key: ["store_group_ids", "filters"] },
    ],
  }, //Store Group create API
  {
    url: `/product-mapping/mapped-stores`,
    dimensions: [{ dimension: "store", key: "filters" }],
  }, //Product Mapping view mapped stores API,
  {
    url: `/core/group/store/[0-9]+$`,
    dimensions: [
      { dimension: "store", key: ["store_ids", "filters"] },
      { dimension: "store", key: ["store_group_ids", "filters"] },
    ],
  }, //Store Group update API
  {
    url: `${GET_PRODUCT_TO_DC}`,
    dimensions: [{ dimension: "product", key: "filters" }],
  },
  {
    url: "/core/group/bulk/store",
    dimensions: [
      { dimension: "store", key: ["store_ids", "filters"] },
      { dimension: "store", key: ["store_group_ids", "filters"] },
    ],
  },
  {
    url: `/store-mapping/products`,
    dimensions: [{ dimension: "product", key: "filters" }],
  }, //Store Mapping Modify screen fetch products API
  {
    url: `/product-mapping/product-to-store/set-all`,
    dimensions: [{ dimension: "store", key: ["stores", "filters"] }],
  }, //set all API for product mapping
  {
    url: "/store-mapping/stores/pagination",
    dimensions: [{ dimension: "store", key: "filters" }],
  },
  {
    url: `${SET_ALL_TABLE_DATA}/product`,
    dimensions: [{ dimension: "product", key: ["codes", "filters"] }],
  },
  {
    url: `${SET_ALL_TABLE_DATA}/store`,
    dimensions: [{ dimension: "store", key: ["codes", "filters"] }],
  },
];

// add screen name in the list to ignore exclude filter feature in filter api calls.
export const screenNamesNotIncludedInFilterExclusion = [
  "Product Profile",
  "inventorysmart_loss_sales_reports",
];

export const appName = {
  WORKFLOW_INPUT_CENTER: "workflow input center",
  APPLICATION_ACCESS_MANAGEMENT: "application access management",
  HOME: "home",
};

export const MIN_VALUE = -99999999;
export const MAX_VALUE = 99999999;

export const DELAYED_ROUTES = ["/", "/login"]; //For these routes, dismissal of snacks will have a delay of 2 seconds

//Default levels aggregate levels for product and store dimensions
export const DEFAULT_LEVELS = {
  product: ["product", "style"],
  store: ["store"],
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
  __ia_char_32: "?",
  __ia_char_33: "\t"
};

export const TENANT_MAPPING = {
  SIGNET: "signet",
  VS: "victorias-secret",
  GENERIC: "generic",
  PRODUCTIVITY_HELPER: "productivityhelper",
  VB: "vb",
  PARTY_CITY: "partycity",
  PUMA: "puma",
  MNS: "marksandspencer",
  MNS_MENA: "marksandspencer-mena",
  RALPH_LAUREN: "ralph-lauren",
  RALPH_LAUREN_EU: "ralph-lauren-eu",
  BRISCOES: "briscoes",
  STEVE_MADDEN: "stevemadden",
  FIT: "fit",
  RL_APAC: "ralph-lauren-apac"
};

export const HMAC_INPUT_APIS = [
  "/user/verify-token",
  "/core/comment",
  "/core/get-comment",
  "/core/comment ",
  "/core/filter/screen/save-user-preference",
  "/core/filter/screen/update-user-preference",
];
export const SECRET_KEY = "b00982087de2a334be5752d6aeeb385f23716864dc9a119ab551bd1f2eb46d3a";

export const NEW_STORE_EXCLUDE_FILTER = {
  "attribute_name": "is_new",
  "operator": "not in",
  "values": [
      "True"
  ],
  "filter_type": "cascaded",
  "dimension": "store",
  "system_filter": true
}
