import { Home } from "@mui/icons-material";
import {
  DASHBOARD,
  OMNI_DASHBOARD,
  CORE_CHOICE_CONFIGURATION_DASHBOARD,
  CORE_STYLE_CONFIGURATION_DASHBOARD,
  ASSORT_CLUSTER_DASHBOARD,
  MASTER_PLAN_DASHBOARD,
  MFP_DASHBOARD,
  HINDSIGHT_DASHBOARD,
  PRE_SEASON_DASHBOARD,
} from "./routesContants";

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
  __Create_Plan_Weightage: "weightage",
  __Carryover_Accessor: "carryover",
  __Clearance_Accessor: "clearance",
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
  // paste
};

export const Plan = {
  __Plan: "2.1",
  __Plan_Details: "Plan Details",
  __Depth_Choice: "2.2",
  __Wedge: "2.3",
  __Wedge_Text: "Wedge",
  __Finalize_Buy: "2.4",
  __Budget_Allocation: "Review Receipt $ across ",
  __Level3_Plan: " Level Plan",
  __Cluster_Level_Plan: "Cluster Level Plan Pen",
  __Existing_Level3: "Add existing ",
  __Create_New: "Create new ",
  __Scale_Up_Down: "Scale up/down",
  __Table_View: "Table view",
  __Chart_View: "Chart view",
  __Add_L3_Name: "Enter Name",
  __Depth: "Depth",
  __Choice: "Choice Count",
  __Default_Placeholder: "Select value",
  __Bop_Generate: " Generate BOP",
  __Copy_Current_Plan: " Copy to Current plan",
  __Lock_Choice_Option: ["Yes", "No"],
  __Flow_To_Next_option: ["Yes", "No", "No Buy"],
  __Wedge_Column_Type_disable: ["list", "str", "dollar"],
  __Ecom_Channel: ["Ecom", "ECOMM", "ecomm_outlet", "ecomm_fullprice", "Web"],
  __Index_Factor:"Index Factor",
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
  __strategy_reference_data_constants: ["Assortsmart", "Planned Targets"],
  __strategy_data_selector_constants: [
    "Planning Season",
    "Planning Date Range",
  ],
};

export const Store = {
  __Store_Attr_Info: [
    {
      label: "Channel",
      column_name: "channel",
      level: 1,
    },
    {
      label: "State",
      column_name: "s3_name",
      level: 2,
    },
    {
      label: "Region",
      column_name: "region",
      level: 3,
    },
    {
      label: "District",
      column_name: "s4_name",
      level: 4,
    },
  ],
  __Non_Store_Attr_Arr: ["store_code", "store_name"],
};

export const Clustering = {
  __cluster_input: "1.1",
  __finalize_cluster: "1.2",
  __clustering_type: 1, //For now hardcoding till we integrate it with tenant config
  __ecom_cluster_name: "Ecom",
  __ecom_store_code: "STB",
};

export const DepthChoice = {
  _channel_Change_confirm_header: "Channel Change",
};

// maintaining individual cluster bucket id states within attr and perf graph form
// to avoid overridding of same cluster bucket id values for both grapgs
export const ATTRIBUTE_GRADE_FORM = [
  {
    accessor: "clusterBucketId",
    field_type: "dropdown",
    label: "Cluster Bucket",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: false,
  },
  {
    accessor: "attribute",
    field_type: "dropdown",
    label: "Attribute",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
];

export const PERFORMANCE_CLUSTER_FORM = [
  {
    accessor: "clusterBucketId",
    field_type: "dropdown",
    label: "Cluster Bucket",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: false,
  },
  {
    accessor: "x-axis",
    field_type: "dropdown",
    label: "X Axis",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
  {
    accessor: "y-axis",
    field_type: "dropdown",
    label: "Y Axis",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
  {
    accessor: "z-axis",
    field_type: "dropdown",
    label: "Z Axis",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
];
export const PERFORMANCE_CLUSTER_UPLOAD_FORM = [
  {
    accessor: "x-axis",
    field_type: "dropdown",
    label: "X Axis",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
  {
    accessor: "y-axis",
    field_type: "dropdown",
    label: "Y Axis",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
  {
    accessor: "z-axis",
    field_type: "dropdown",
    label: "Z Axis",
    required: true,
    options: [],
    isMulti: false,
    isSearchable: true,
    isClearable: true,
  },
];

export const NON_CHART_METRIC_KEYS = [
  "store_code",
  "store_name",
  "bucket_id",
  "is_optimal",
  "cluster_code",
  "store_code1",
  "cluster_name",
  "backgroundColor",
  "weightage",
];

// confirm as the table dispalys only few metrics
export const L3_CHART_METRICS = [
  "air_ly",
  "air_ty",
  "aur_ly",
  "aur_ty",
  "pen_ly",
  "pen_ty",
  "rcpt_units_ly",
  "rcpt_units_ty",
  "recom_rcpt_ly",
  "recom_rcpt_ty",
  "budget_ly",
  "budget_ty",
  "imu_ly",
  "imu_ty",
  "penetration_ly",
  "penetration_ty",
  "receipts_quantity_ly",
  "receipts_quantity_ty",
  "total_receipts_cost_ly",
  "total_receipts_cost_ty",
];

export const SWAP_STORE_CLUSTER_DROPDOWN = [
  {
    accessor: "swapStoreCluster",
    field_type: "list",
    label: "Transfer from",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];

export const MASTER_STORE_ATTRIBUTES = [
  "store_code",
  "store_name",
  "special_classification",
];

export const HOME_BREAD_CRUMN = {
  label: "AssortSmart",
  route: DASHBOARD,
  icon: <Home />,
};

export const CLUSTER_BREAD_CRUMN = {
  label: "AssortSmart",
  route: ASSORT_CLUSTER_DASHBOARD,
  icon: <Home />,
};

export const OMNI_BREAD_CRUMN = {
  label: "AssortSmart",
  route: OMNI_DASHBOARD,
  icon: <Home />,
};

export const CORE_CHOICE_BREAD_CRUMN = {
  label: "AssortSmart",
  route: CORE_CHOICE_CONFIGURATION_DASHBOARD,
  icon: <Home />,
};

export const CORE_STYLE_BREAD_CRUMN = {
  label: "AssortSmart",
  route: CORE_STYLE_CONFIGURATION_DASHBOARD,
  icon: <Home />,
};

export const MASTER_PLAN_BREAD_CRUMN = {
  label: "AssortSmart",
  route: MASTER_PLAN_DASHBOARD,
  icon: <Home />,
};

export const MFP_UPLOAD_BREAD_CRUMN = {
  label: "AssortSmart",
  route: MFP_DASHBOARD,
  icon: <Home />,
};

export const HINDSIGHT_BREAD_CRUMN = {
  label: "Assortsmart",
  route: HINDSIGHT_DASHBOARD,
  icon: <Home />,
};

export const PRE_SEASON_BREAD_CRUM = {
  label: "Assortsmart",
  route: PRE_SEASON_DASHBOARD,
  icon: <Home />,
};

export const BREAD_CRUMB_TITLES = {
  0: [HOME_BREAD_CRUMN, { label: "Dashboard", route: null }],
  1: [HOME_BREAD_CRUMN, { label: "Intelligent Clustering", route: null }],
  2: [HOME_BREAD_CRUMN, { label: "New Plan", route: null }],
  3: [OMNI_BREAD_CRUMN, { label: "Omni-Dashboard", route: null }],
  4: [OMNI_BREAD_CRUMN, { label: "Omni-Mapping", route: null }],
  5: [
    CORE_CHOICE_BREAD_CRUMN,
    { label: "All-door Choice Configuration", route: null },
  ],
  6: [CLUSTER_BREAD_CRUMN, { label: "Cluster-Dashboard", route: null }],
  7: [CLUSTER_BREAD_CRUMN, { label: "Intelligent Clustering", route: null }],
  8: [
    CORE_CHOICE_BREAD_CRUMN,
    { label: "All-door Style Configuration", route: null },
  ],
  9: [MASTER_PLAN_BREAD_CRUMN, { label: "Master Plan Dashboard", route: null }],
  10: [MASTER_PLAN_BREAD_CRUMN, { label: "Master plan view", route: null }],
  11: [MFP_UPLOAD_BREAD_CRUMN, { label: "MFP Upload Dashboard", route: null }],
  12: [HINDSIGHT_BREAD_CRUMN, { label: "Hindsight Dashboard", route: null }],
  13: [
    HINDSIGHT_BREAD_CRUMN,
    { label: "Create New Hindsight View", route: null },
  ],
  14: [HINDSIGHT_BREAD_CRUMN, { label: "Edit Hindsight View", route: null }],
  15: [PRE_SEASON_BREAD_CRUM, { label: "Strategy Dashboard", route: null }],
  16: [
    PRE_SEASON_BREAD_CRUM,
    { label: "Create New Strategy View", route: null },
  ],
};

export const SUB_CHANNEL_FORM = {
  accessor: "sub_channel_list",
  field_type: "dropdown",
  label: "Sub Channel",
  key: "sub_channel_list",
  required: false,
  isMulti: false,
  isSearchable: true,
};

export const CHANNEL_FORM = {
  accessor: "channel_list",
  field_type: "dropdown",
  label: "Channel",
  key: "channel_list",
  required: false,
  isMulti: false,
  isSearchable: true,
};

export const REVIEW_BY_SIZE_FORM = [
  {
    accessor: "l1_name_list",
    field_type: "dropdown",
    label: "l1_name",
    key: "l1-name",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "l2_name_list",
    field_type: "dropdown",
    label: "l2_name",
    key: "l2-name",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "l3_name_list",
    field_type: "dropdown",
    label: "l3_name",
    key: "l3-name",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "flow_list",
    field_type: "dropdown",
    label: "Flow",
    key: "flow",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];

export const REVIEW_BY_ATTRIBUTE_GRADE_FORM = [
  {
    accessor: "l1_name_list",
    field_type: "dropdown",
    label: "l1_name",
    key: "l1-name",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
  },
  {
    accessor: "l2_name_list",
    field_type: "dropdown",
    label: "l2_name",
    key: "l2-name",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
  },
  {
    accessor: "grade_list",
    field_type: "dropdown",
    label: "Cluster grade",
    key: "cluster_grade",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
  },
  {
    accessor: "flow_list",
    field_type: "dropdown",
    label: "Flow",
    key: "flow",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
  },
];

export const PARAMETERS_FORM = [
  {
    accessor: "sub_channel_list",
    field_type: "dropdown",
    label: "Sub Channel",
    key: "sub_channel_list",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "channel_list",
    field_type: "dropdown",
    label: "Channel",
    key: "channel_list",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];

export const PERCENTAGE_METRICS = ["st"];

export const SUBCAT_LEVEL_PLAN_FORM = [
  {
    accessor: "l3_optimization_constraint",
    field_type: "dropdown",
    label: "",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "sub_channel",
    field_type: "dropdown",
    label: "",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  // {
  //   accessor: "drop",
  //   field_type: "dropdown",
  //   label: "Drop",
  //   required: false,
  //   options: [],
  //   isMulti: false,
  //   isSearchable: true,
  // },
  {
    accessor: "carryover_flag",
    field_type: "dropdown",
    label: "Carryover Tag",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];

export const DEPTH_CLUSTER_FORM = [
  {
    accessor: "depth_cluster",
    field_type: "dropdown",
    key: "l3_name",
    label: "",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "drop",
    field_type: "dropdown",
    label: "Drop",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "carryover_flag",
    field_type: "dropdown",
    label: "Carryover Tag",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];
export const CHOICE_CLUSTER_FORM = [
  {
    accessor: "choice_cluster",
    field_type: "dropdown",
    key: "l3_name",
    label: "",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "drop",
    field_type: "dropdown",
    label: "Drop",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "carryover_flag",
    field_type: "dropdown",
    label: "Carryover Tag",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];
export const PLAN_FINALIZE_REVIEW_BY_ATTRIBUTE_METRICS = [
  "aps_ly",
  "aps_ty",
  "avg_depth_ly",
  "avg_depth_ty",
  "cc_ly",
  "cc_ty",
  "pen_ly",
  "pen_ty",
  "receipt$_ly",
  "receipt$_ty",
  "receipt_units_ly",
  "receipt_units_ty",
  "st_ly",
  "st_ty",
];

export const BUDGET_CLUSTER_SPLIT_FORM = [
  {
    accessor: "l3_name",
    key: "l3_name",
    field_type: "dropdown",
    label: "L3 Name",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  // {
  //   accessor: "drop",
  //   key: "drop",
  //   field_type: "dropdown",
  //   label: "Drop",
  //   required: false,
  //   options: [],
  //   isMulti: false,
  //   isSearchable: true,
  // },
  {
    accessor: "carryover_flag",
    key: "carryover_flag",
    field_type: "dropdown",
    label: "Carryover Tag",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];
export const BUDGET_ATTRIBUTE_SPLIT_FORM = [
  {
    accessor: "l3_name",
    key: "l3_name",
    field_type: "dropdown",
    label: "L3 Name",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "cluster_code",
    key: "cluster_code",
    field_type: "dropdown",
    label: "Cluster",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "attribute_name",
    key: "attribute_name",
    field_type: "dropdown",
    label: "Attribute",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  // {
  //   accessor: "drop",
  //   key: "drop",
  //   field_type: "dropdown",
  //   label: "Drop",
  //   required: false,
  //   options: [],
  //   isMulti: false,
  //   isSearchable: true,
  // },
  {
    accessor: "carryover_flag",
    key: "carryover_flag",
    field_type: "dropdown",
    label: "Carryover Tag",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
];

export const DOWNLOAD_PO_METRICS = {
  choice_name: "Choice",
  Quantity: "Total Buy Units",
  cost: "Cost",
  article_number: "Article Number",
  style_number: "Style Number",
  style_des: "Style Desc",
};

export const COMPARE_PLAN_L3_METRICS = [
  "receipt_",
  "receipt_unit_",
  "choice_count_",
  "avg_depth_",
  "st_grade_",
  "aur_",
  "imu_",
  "aps_",
];

export const COMPARE_PLAN_CLUSTER_METRICS = [
  "receipt_",
  "choice_",
  "avg_depth_",
  "st_grade_",
  "aps_",
];

export const OMNI_WEDGE_MAPPING_METRICS = {
  overall_buy_units: "buy_units",
  parent_style: "parent_style",
  style_no: "style_no",
  style_name: "style_name",
  style_des: "style_des",
  color_code: "color_code",
  color_name: "color_name",
  suggested_size_range: "suggested_size_range",
  size: "size",
  actual_msrp: "actual_msrp",
  cost: "cost",
  colorway_season_id: "colorway_season_id",
  style_carryover_flag: "style_carryover_flag",
  choice_carryover_flag: "choice_carryover_flag",
  placeholder_name: "placeholder_name",
  placeholder_description: "placeholder_description",
};

// constants for PLAN WEDGE
export const PLAN_WEDGE_TABLE_COLUMNS = {
  style_no: "style_no",
  color_code: "color_code",
};

export const CORE_CHOICE_CONFIGURATION_METRICS = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "channel",
  "sub_channel",
  "season_name",
  "year",
  "all_door_cc",
  "is_finalised_plan",
  "core_choice_id",
  "season_id",
  "sub_channel",
  "mapped",
  "unmapped",
  "created_by",
];

export const createCoreChoiceLevels = [
  {
    label: "Price Band",
    column_name: "l3_name",
    level: 3,
  },
  {
    label: "Channel",
    column_name: "channel",
    level: 4,
  },
  {
    label: "Sub Channel",
    column_name: "sub_channel",
    level: 5,
  },
  {
    label: "Choice Count",
    column_name: "all_door_cc",
    level: 6,
  },
];

export const coreChoicePlanLevels = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "l5_name",
  "channel",
  "sub_channel",
  "year",
  "season_id",
];

export const newVsCarryOverOptions = [
  "New",
  "Carryover",
  "New Carryover",
  "Dropped",
  "Roll In Change",
  "Trend Translation",
  "Oppourtunity",
];

export const channelFilterFinalizeCluster = {
  label: "Channels",
  column_name: "channels",
  type: "cascaded",
  display_type: "dropdown",
  level: 1,
  dimension: "channel",
  is_mandatory: true,
  is_multiple_selection: false,
  default_value: "",
  is_disabled: false,
  is_clearable: true,
  display_order: 1,
  is_required: false,
  extra: {},
  filter_keyword: "channels",
  isClearable: true,
  isDisabled: false,
};

export const omniFileUploadValidation = [
  "All the choices within one style should have unique New_VS_Carryover tagging",
  "Carryover to be written as Carry-Over to mark a style as carryover",
  "Colorwayseason ID mapped to be present in string format without exponential form",
  "Add choice in omni option is to alter the mapping from other channels and to create unique choice for a channel and not to add extra choice for individual plan",
  "Change in forecasted units in omni will not reflect in the plan as forecast update should be done in base plans, omni plan can be used solely for the purpose of mapping choices across channels",
];

export const PLAN_STEP_BGCOLOR_MAPPER = {
  complete: "success",
  incomplete: "warning",
};

export const attributeToBeRemovedFromCarryover = [
  "style_id",
  "style_color_id",
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "channel",
  "is_active",
  "new_store_list",
  "old_store_list",
  "plan_code",
  "store_codes",
];

export const mfpDataMetrics = [
  "ty_rcpt_cost",
  "ty_rcpt_rtl",
  "ty_rcpt_units",
  "target_cost",
  "target_rev",
  "target_unit",
];
export const WEDGE_STYLE_MAPPING_FORM = [
  {
    accessor: "l3_name",
    field_type: "dropdown",
    label: "l3_name",
    key: "l3_name",
    required: false,
    options: [],
    isMulti: false,
    isSearchable: true,
  },
  {
    accessor: "year",
    field_type: "dropdown",
    label: "year",
    key: "l3-year",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
  },
  {
    accessor: "season",
    field_type: "dropdown",
    label: "Season",
    key: "season",
    required: false,
    options: [],
    isMulti: true,
    isSearchable: true,
  },
];

export const RECEIPT_DRAWER_METRICS = [
  "initial_units",
  "default_units",
  "updated_units",
  "units_diff",
  "budget_diff",
  "receipts_quantity_ty",
  "initial_budget",
  "default_budget",
  "updated_budget",
  "initial_sales",
  "default_sales",
  "updated_sales",
  "initial_margin",
  "default_margin",
  "updated_margin",
  "initial_buy_units",
  "default_buy_units",
  "updated_buy_units",
];

export const RECEIPT_DRAWER_QUARTER_MONTH_METRICS = [
  "planned_units",
  "updated_units",
  "units_diff",
  "units_diff_per",
  "planned_budget",
  "updated_budget",
  "budget_diff",
  "budget_diff_per",
  "planned_sales_units",
  "updated_sales_units",
  "sales_units_diff",
  "sales_units_diff_per",
  "planned_revenue",
  "updated_revenue",
  "revenue_diff",
  "revenue_diff_per",
  "planned_aur",
  "updated_aur",
  "planned_auc",
  "updated_auc",
];

export const DEFAULT_IMAGE_LINK =
  "https://storage.cloud.google.com/custom_uploads_dev/vb/assort_image_gen/invalid_image.jpg";
export const omniMappingMetrics = [
  "source_plan_code",
  "source_choice_id",
  "destination_plan_code",
];

export const sellingPeriodObj = {
  filter_id: "range-picker",
  filter_type: "non-cascaded",
  dimension: "custom",
  display_type: "rangePicker",
  values: [],
};

//TODO: to be replaced with api response
export const clearanceData = [
  {
    key: "clearance",
    value: "clearance",
    column_name: "Only Clearance Sales",
  },
  {
    key: "clearance",
    value: "regular",
    column_name: "Only Regular sales",
  },
];

export const carryoverData = [
  {
    key: "carryover_new_flag",
    value: "new",
    column_name: "Only New sales",
  },
  {
    key: "carryover_new_flag",
    value: "carryover",
    column_name: "Only Carryover sales",
  },
];

export const xAxisDataParetoGraph = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "style",
  "stylecolor",
  "size",
  "store_code",
  "region",
  "district",
  "channel",
];

export const showGraphData = {
  pareto: "Top Performing Hierarchies",
  performance_review: "Review Performance By",
  st_margin_discount: "ST Margin and Discount",
  clearance_carryover: "Clearance and Carryover Graph",
  size_review: "Size Level Graph",
};

export const bubbleColor = [
  { ABOVE_AVG: "#08bdba", BELOW_AVG: "#9ef0f0" },
  { ABOVE_AVG: "#33b1ff", BELOW_AVG: "#bae6ff" },
  { ABOVE_AVG: "#ff8389", BELOW_AVG: "#ffd7d9" },
  { ABOVE_AVG: "#be95ff", BELOW_AVG: "#e8daff" },
  { ABOVE_AVG: "#78a9ff", BELOW_AVG: "#d0e2ff" },
  { ABOVE_AVG: "#61CEF2", BELOW_AVG: "#C0E1F9" },
  { ABOVE_AVG: "#C6BB76", BELOW_AVG: "#D5CFAC" },
  { ABOVE_AVG: "#89E5D4", BELOW_AVG: "#D0EEE8" },
  { ABOVE_AVG: "#E89AC7", BELOW_AVG: "#FCC1CF" },
  { ABOVE_AVG: "#EEABC7", BELOW_AVG: "#EED1E8" },
  { ABOVE_AVG: "#DFCD8F", BELOW_AVG: "#D5DFAC" },
  { ABOVE_AVG: "#F0AD83", BELOW_AVG: "#F7DECC" },
  { ABOVE_AVG: "#F2A89C", BELOW_AVG: "#FAE9E5" },
  { ABOVE_AVG: "#F29C9C", BELOW_AVG: "#FAE6E5" },
  { ABOVE_AVG: "#D1C28A", BELOW_AVG: "#F1F0E0" },
  { ABOVE_AVG: "#6D8FC5", BELOW_AVG: "#DFE9F2" },
  { ABOVE_AVG: "#6DAEC5", BELOW_AVG: "#C3DFE7" },
  { ABOVE_AVG: "#6DC6A3", BELOW_AVG: "#C3E8D9" },
  { ABOVE_AVG: "#95D18A", BELOW_AVG: "#E2F4E0" },
];

export const graphColors = [
  { column1: "#318CE7", column2: "#ff7f00" },
  { line1: "#fb607f", line2: "#5218fa" },
];

export const filterHierarchyValues = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "channel",
  "clearance",
  "carryover_new_flag",
  "carryover",
];

export const reviewPerformanceGraphTabs = {
  Attribute: "Attribute",
  "Geographical Location": "Geographical Location",
  "Week/Month Wise Comparison": "Week/Month Wise Comparison",
};

export const STMarginAndDiscounteGraphTabs = {
  "Sell through and margin analysis": "Sell through and margin analysis",
  "Discount margin and sold quantity analysis":
    "Discount margin and sold quantity analysis",
};

export const addSubDepartmentTabs={
  "Style View": "Style View"
}

//TODO: to be replaced with api response
export const attributeMetrics = {
  fit: "Fit",
  lfestyle: "Lifestyle",
  logo: "Logo",
  silhouette: "Silhouette",
};

export const comaprisonMetric = {
  LY: "LY",
  season: "Last Season",
};

export const geoGraphicalAttribute = {
  s1_name: "Territory",
  s2_name: "Region",
  s3_name: "State",
  s4_name: "City",
  zipcode: "Zip Code",
  store_code: "Store Code",
  store_name: "Store Name",
};

export const timelineAttributes = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
};

export const reviewMetrics = {
  revenue: "Revenue",
  qty_sold: "Qty sold",
  receipts_dollar: "Receipts $",
  receipts_quantity: "Receipt units",
  avg_weekly_invt: "Avg weekly inventory",
  styles_colors_sold: "Style colors sold",
  styles_sold: "Styles Sold",
  bop: "BOP",
  eop: "EOP",
};

export const nleRevampMetrics = {
  receipt$: "Receipt $",
  penetration: "Receipt Pen %",
  receipts_quantity: "Receipt Units",
};

export const receiptQuantityMetrics = [
  {
    key: "All Buy",
    value: "All Buy",
  },
  {
    key: "Style with Buy",
    value: "Style With Buy",
  },
];

export const stMarginXAxis = [
  "l0_name",
  "l1_name",
  "l2_name",
  "l3_name",
  "channel",
  "region",
  "city",
  "state",
  "week",
  "month",
  "quarter",
];

export const stMarginGraphMetrics = [
  "line_y",
  "line_y_sec",
  "x_axis",
  "y_axis",
  "y_axis_secondary",
];

export const clearanceYAxisMetrics = {
  revenue: "Revenue",
  qty: "Sold Quantity",
};

export const clearanceAttributeData = {
  clearance: "Clearance",
  carryover: "Carryover",
};

export const MetricsOptions = [
  {
    label: "Budget $",
    value: "budget",
    id: "budget",
  },
  {
    label: "Penetration %",
    value: "pen",
    id: "pen",
  },
  {
    label: "Units",
    value: "unit",
    id: "unit",
  },
];

export const DepthMetricsOptions = [
  {
    label: "Productivity $",
    value: "Productivity",
    id: "Productivity",
  },
  {
    label: "Depth",
    value: "depth",
    id: "depth",
  },
];

export const wedgeFileOptions = [
  {
    label: "Planning Metrics",
    id: 1,
    value: 1,
  },
  {
    label: "Style Color Assignment",
    id: 2,
    value: 2,
  },
];

export const hindsightFilterMetrics = {
  graph_levels: "tile_group",
  size: "tree_size_group",
  geographical_attribute: "geo_matrics_group",
  attribute: "attr_matrics_group",
  bubble_size: "bubble_size_group",
  y_axis_secondary: "pareto_y_axis_group",
  bubble_points: "bubble_point_values",
  review_metric: "attr_graph_group",
};

export const graphAxisMetrics = {
  x_axis: {
    timeline: "weekly_matrics_group",
    STMargin: "st_discount_clearance_carryover_x_axis_group",
    clearance: "st_discount_clearance_carryover_x_axis_group",
    pareto: "tile_group",
    bubble: "bubble_size_group",
  },
  y_axis: {
    size_review: "size_graph_y_axis_group",
    pareto: "pareto_y_axis_group",
    bubble: "bubble_size_group",
  },
};

export const bubbleGraphDollarMetrics = [
  "revenue",
  "margin",
  "receipts_price",
  "discount_percent",
];

export const USER_RESERVE_MANDATORY_FIELDS_MSG =
  "Enter all mandatory fields with proper values";
export const GO_TO_NEW_STORE_DASHBOARD_MESSAGE =
  "Are you sure you want to go back to new store dashboard?";
export const RESERVATION_DATE_VALIDATION_MSG =
  "Reservation date cannot be greater than store opening date";
export const STORE_OPENING_FORM_CONSTANTS = [
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

export const NO_DUMMY_STORE_VALIDATION_MSG = "No dummy store present";
export const NO_NEW_STORE_VALIDATION_MSG = "No new stores to map";
export const MAP_TO_NEW_STORE_MSG =
  "Do you want to map a new store to an existing dummy store?";

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
];

export const SEASON_FILTER_FOR_STORE = [
  {
    required: true,
    label: "Seson",
    field_type: "list",
    accessor: "season",
    isDisabled: false,
    disablePast: true,
    disableFuture: false,
  },
];

export const nleChoiceOption = [
  {
    label: "Depth",
    value: "Depth",
  },
  {
    label: "Choice",
    value: "Choice",
  },
];

export const NonEditableFooterApsSt = [
  "max_cc",
  "all_door_cc",
  "cc_threshold",
  "moq",
  "min_cc_threshold",
];

export const ERROR_MESSAGE = "Something Went Wrong!!";
export const SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG =
  "The product hierarchy of the current row is already selected in previous row with similar combinations";
export const SISTER_STORE_COLUMN_VALIDATION_MSG =
  "This sister store is already mapped to another department, please select a different sister store";
export const GO_BACK_MESSAGE =
  "Are you sure you want to go back to the previous step ? Changes made will be lost.";
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
