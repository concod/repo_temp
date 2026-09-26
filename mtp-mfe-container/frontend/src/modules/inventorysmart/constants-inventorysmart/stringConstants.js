export const APP_NAME = "inventorysmart";
export const ERROR_MESSAGE = "Something Went Wrong!!";
export const NO_DATA_FOUND = "No Data Found!";

// labels for headerbreadcrumbs
export const CREATE_ALLOCATION = "Create New Allocation";

// labels for dashboard - view plan table
export const DETAILS = "Details";

//Sorting Order
export const DESC_ORDER = "desc";
export const ASC_ORDER = "asc";

export const ERROR = "Error!!";

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
  INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD: "Product Supersession Dashboard",
  INVENTORY_CREATE_NEW_PRODUCT_MAPPING: "Create New Product Mapping",
};

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

export const productMappingTableArticleFilter = {
  filter_type: "cascaded",
  attribute_name: "product_code",
  operator: "in",
  dimension: "Product",
  values: [],
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
