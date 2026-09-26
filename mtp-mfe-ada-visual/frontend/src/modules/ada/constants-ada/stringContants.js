import { Home } from "@mui/icons-material";
import { ADA_DASHBOARD } from "./routesContants";

export const HOME_BREAD_CRUMB = {
  label: "AdaVisual",
  route: ADA_DASHBOARD,
  icon: <Home />,
};

export const BREAD_CRUMB_TITLES = {
  0: [HOME_BREAD_CRUMB],
};

export const COMPARE_WITH_CONSTANTS = [
  { value: "Historic Actuals", label: "Historic Actuals", disabled: false },
  { value: "Plan", label: "Plan", disabled: true },
  { value: "Similar styles", label: "Similar styles", disabled: true },
];

export const DefaultProductSeasonFilters = [
  {
    attribute_name: "fiscal_year",
    dimension: "fiscal_date",
    filter_type: "cascaded",
    label: "Product Year",
    options: [],
    selectedOptions: [],
  },
  {
    attribute_name: "product_season_name",
    dimension: "fiscal_date",
    filter_type: "cascaded",
    label: "Product Season",
    options: [],
    selectedOptions: [],
  },
  {
    attribute_name: "product_sub_season",
    dimension: "fiscal_date",
    filter_type: "cascaded",
    label: "Product Subseason",
    options: [],
    selectedOptions: [],
  },

  {
    attribute_name: "fiscal_week", // in date range and aggregation level filter it is fiscal_year_week
    dimension: "fiscal_date",
    filter_type: "cascaded",
    label: "Product Week",
    options: [],
    selectedOptions: [],
  },
];

export const FISCAL_KEY_MAPPING = {
  W: "fiscal_year_week",
  M: "fiscal_year_month",
  Q: "fiscal_year_quarter",
  PS: "fiscal_season_name",
  PSS: "fiscal_sub_season",
  PW: "fiscal_year_week",
};

export const EXPECTED_ADA_FILTER_DIMENSIONS = {
  product_store: { order: 1, label: "product_store" },
  product: { order: 2, label: "product" },
  store: { order: 3, label: "store" },
};

// Edit Hierarchy Levels
export const LEVEL_0 = "l0";
export const LEVEL_1 = "l1";
export const LEVEL_2 = "l2";

export const ACCORDION_TITLES = {
  overview: "Forecast Overview",
  kpi: "Forecast KPIs",
  summary: "Forecast Summary Table",
  visual: "Forecast Visualization",
  decisionDashboard: "Demand Selection - Details Table",
};

export const NO_DATA_FOUND = {
  title: "No data found",
  description: "Click on select filters to filter and view data",
};

export const MANDATORY_FIELD_ERROR_MESSAGE = "Select all mandatory filters";

export const DISABLING_MULTIPLIER_MESSAGE =
  "Since the Adjusted IA Forecast is 0, the edit on the multiplier is disabled.";

export const DISABLE_SAVE_AFTER_8_WEEK_CHANGE =
  "Please save before proceeding, save button will be disabled, if you will make changes for more than";

export const DISABLING_EDIT_HIERARCHY_MESSAGE =
  "Since the forecast is not available for some or all of the cells, editing on these cells is disabled.";

export const DISABLING_DISCOUNT_VALUE_MESSAGE =
  "Since the discount value is not available for some or all of the cells, editing on these cells is disabled.";

export const DOWNLOAD_TEMPLATE_FILENAME =
  "ADA_Visual_Bulk_Upload_Template.xlsm";

export const DOWNLOAD_TEMPLATE_FILEPATH =
  "https://storage.cloud.google.com/ralph-lauren-ada-visual-upload/ADA_Visual_Bulk_Upload_Template.xlsm";

//macros cloud file .
export const DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH =
  "https://storage.cloud.google.com/ralph-lauren-ada-visual-upload-dev/RL_ADA_Visual_Bulk_Upload_Template.xlsm";

// export const DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_LOCAL =
//   "../../../assets/macros/rl_eu/ADA_Visual_Bulk_Upload_Template_Harmonise.xlsm";

export const ADA_VISUAL_FILE_UPLOAD_INSTRUCTIONS = [
  'Allowed discount types are "%Off" and "PP"',
  'If discount type is "%Off", then the discount value should be between 1 and 100 (inclusive).',
  "The book price must be greater than 0.",
  "Include and exclude are to be provided as I and E, respectively.",
  "The end date should be greater than the start date.",
];

export const INVALID_MULTIPLIER_VALUE =
  "Invalid input: Zero and Negative values are not allowed for the multiplier. The multiplier has been reset to last updated value.";

export const INVALID_ADJUSTED_USER_FORECAST_VALUE =
  "Invalid input: Zero and Negative values are not allowed for the adjusted user forecast. The adjusted user forecast has been reset to last updated value.";

export const SAVE_IN_PROGRESS_STATUS = "IN_PROGRESS";
export const SAVE_COMPLETED_STATUS = "COMPLETED";

export const DISABLING_ZERO_TOTAL_ROW =
  "Since the Forecast is 0, the edit on the Total Row is disabled.";

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

export const UNIQUE_ROW_KEY = [
  "product_code",
  "primary_sku",
  "style",
  "l6_id",
  "article",
  "article_orig",
  "l5_name",
];

export const ADA_VISUAL_EDIT_FORECAST_UPLOAD_VALIDATIONS = [
  "The Material Number, country_code , channel, must be valid and cannot be blank.",
  "Start Date,Input Type,Discount Type must be valid and cannot be blank",
  'Start Date and End Date should be in the format "mm-dd-yyyy"',
  "End Date should be greater than or equal to Start Date",
  'Input Type should be in ("P", "FS","C", "M","PM")',
  'Discount type should be in  ("%Off", "PP")',
  'Include/Exclude should be present in the expected list ("E", "I") or blank',
  "Store cannot be blank if Include/Exclude is I,E",
  'End Date should be null if input_type="FS"',
  "Discount Value should be either blank or between 1 and 100",
  "Delete column can be either 0,1 or blank",
];

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
    "inventorysmart_super_admin",
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
