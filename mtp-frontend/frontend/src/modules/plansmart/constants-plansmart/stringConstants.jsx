import {
  PLAN_SMART_IN_SEASON_DASHBOARD,
  PLAN_SMART_PRE_SEASON_DASHBOARD,
} from "./routesConstants";

export const CREATE_PLAN_PRE_SEASON = "pre-season";
export const CREATE_PLAN_IN_SEASON = "in-season";
export const PLAN_SMART_APPLICATION_CODE = 4;
export const PLAN_SMART_FILTER_START_YEAR = "2015";
export const PLAN_SMART_APPLICATION_CONFIG = "plansmart_configs";
export const PLAN_SMART_METRICS_FORMATTER = "plansmart_metric_formatter";
export const PLAN_SMART_SCREEN_CONFIGURATION =
  "plan_smart_screen_configuration";

// Planning screen Save As details

export const DRAFT = "draft";
export const REGULAR_PLAN = "regular_plan";
export const SCENARIO_PLAN = "scenario_plan";
export const FINAL_PLAN = "final_plan";
export const ACTIVE_FORECAST = "active_forecast";
export const SCENARIO_FORECAST = "scenario_forecast";
export const FINAL_FORECAST = "final_forecast";
export const RECEIPT_PLAN = "receipt_plan";

export const planTypeShortTxt = {
  [REGULAR_PLAN]: "WP",
  [FINAL_PLAN]: "OP",
  [SCENARIO_PLAN]: "SP",
  [SCENARIO_FORECAST]: "SF",
  [ACTIVE_FORECAST]: "WF",
  [FINAL_FORECAST]: "LF",
};

export const statusCodeBasedOnPlanType = {
  [REGULAR_PLAN]: 0,
  [FINAL_PLAN]: 1,
  [SCENARIO_PLAN]: 2,
  [SCENARIO_FORECAST]: 3,
  [ACTIVE_FORECAST]: 4,
  [FINAL_FORECAST]: 5,
  [RECEIPT_PLAN]: 0,
};

export const common = {
  __Multiple_Value: "(s)",
  __Assortment: "PlanSmart",
  __ConfirmBtnText: "Yes",
  __RejectBtnText: "No",
  __MonthList: [
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
  weekList: ["week1", "week2", "week3", "week4", "week5"],
  __compare_yr_constants: ["LY", "LLY", "LLLY"],
  __seed_with_constants: ["IAF", "LY", "LLY"],
  compare: "Compare",
  performance_analysis: "Performance Analysis",
  match_with_wp: `Match ${planTypeShortTxt[REGULAR_PLAN]} With:`,
  match_with_sp: `Match ${planTypeShortTxt[SCENARIO_PLAN]} with:`,
  match_with_af: `Seed ${planTypeShortTxt[ACTIVE_FORECAST]} with:`,
  match_with_sf: `Seed ${planTypeShortTxt[SCENARIO_FORECAST]} with:`,
};

export const plansmart_dashboard = {
  __overwrite_plan: "Overwrite the existing plan !",
  __overwrite_msg:
    "Plan already exists with same hierarchies and dates, Do you wish to overwrite the existing one !",
};

export const plan_stage = {
  "Scenario Plan": statusCodeBasedOnPlanType[SCENARIO_PLAN],
  "Working Plan": statusCodeBasedOnPlanType[REGULAR_PLAN],
  "Original Plan": statusCodeBasedOnPlanType[FINAL_PLAN],
  "Working Forecast": statusCodeBasedOnPlanType[ACTIVE_FORECAST],
  "Scenario Forecast": statusCodeBasedOnPlanType[SCENARIO_FORECAST],
  "Final Forecast": statusCodeBasedOnPlanType[FINAL_FORECAST],
  "Receipt Plan": statusCodeBasedOnPlanType[RECEIPT_PLAN],
};

// Hierarchy Levels
export const CreatePlan = {
  __plan_levels: ["l0_name", "l1_name", "l2_name", "l3_name"],
  __store_levels: [
    "channel",
    "region",
    "store_group",
    "group_id",
    "business_unit",
  ],
};

export const reportViewByOptions = [
  {
    label: "KPI",
    value: "kpi",
  },
  {
    label: "Timeline",
    value: "timeline",
  },
];

export const reportRadioList = [
  {
    label: "Global Template",
    value: "global",
  },
  {
    label: "Personal Template",
    value: "personal",
  },
];

export const plansmartLabelsForButtons = (isPreSeason) => {
  return {
    create_new_plan: !isPreSeason ? "Create New Plan" : "Review In-season",
    regular_plan: !isPreSeason ? "Active Plan" : "Active Forecast",
    scenario_plan: !isPreSeason ? "Scenario Plan" : "Scenario Forecast",
    regular_receipt_plan: "Active Receipt Plan",
    create_receipt_plan: "Create Receipt Plan",
  };
};

export const statusValueBasedOnTabSelection = {
  [PLAN_SMART_PRE_SEASON_DASHBOARD]: {
    [0]: [
      statusCodeBasedOnPlanType[REGULAR_PLAN],
      statusCodeBasedOnPlanType[FINAL_PLAN],
      statusCodeBasedOnPlanType[RECEIPT_PLAN],
    ], // Working Plan
    [1]: [statusCodeBasedOnPlanType[SCENARIO_PLAN]], // Scenario Plan
    [2]: [statusCodeBasedOnPlanType[RECEIPT_PLAN]],
  },
  [PLAN_SMART_IN_SEASON_DASHBOARD]: {
    [0]: [
      statusCodeBasedOnPlanType[ACTIVE_FORECAST],
      statusCodeBasedOnPlanType[FINAL_FORECAST],
    ], // Active Forecast
    [1]: [statusCodeBasedOnPlanType[SCENARIO_FORECAST]], // Scenario Forecast
  },
};

export const seasonTypesObj = {
  [PLAN_SMART_PRE_SEASON_DASHBOARD]: "pre-season",
  [PLAN_SMART_IN_SEASON_DASHBOARD]: "in-season",
};

export const saveAsWarningMsg = {
  [FINAL_PLAN]:
    "Existing final plan will be overwritten, do you want to proceed?",
  [REGULAR_PLAN]:
    "Existing working plan will be overwritten, do you want to proceed?",
  [FINAL_FORECAST]:
    "Existing final forecast will be overwritten, do you want to proceed?",
};

export const copyOptions = {
  [PLAN_SMART_PRE_SEASON_DASHBOARD]: [
    {
      label: "Working Plan",
      value: REGULAR_PLAN,
    },
    {
      label: "Scenario Plan",
      value: SCENARIO_PLAN,
    },
  ],
  [PLAN_SMART_IN_SEASON_DASHBOARD]: [
    {
      label: "Active Forecast",
      value: FINAL_FORECAST,
    },
    {
      label: "Scenario Forecast",
      value: SCENARIO_FORECAST,
    },
  ],
};

export const saveAsWarningMsgFn = (status) => {
  if (statusCodeBasedOnPlanType[SCENARIO_PLAN] === status) {
    return "Existing working plan will be overwritten, do you want to proceed?";
  }
  if (statusCodeBasedOnPlanType[SCENARIO_FORECAST] === status) {
    return "Existing working forecast will be overwritten, do you want to proceed?";
  }
  return "";
};

export const SAVE_SP = "save_sp";
export const SAVE_SF = "SAVE_SF";
export const SAVE_SP_TO_WP = "SAVE_SP_TO_WP";
export const SAVE_SF_TO_WF = "SAVE_SF_TO_WF";

export const save_as_dropdown_list = [
  {
    label: "Save as WP",
    value: SAVE_SP_TO_WP,
    status: [statusCodeBasedOnPlanType[SCENARIO_PLAN]],
    disableOption: true,
    viewMode: true,
  },
  {
    label: "Save as WF",
    value: SAVE_SF_TO_WF,
    disableOption: true,
    status: [statusCodeBasedOnPlanType[SCENARIO_FORECAST]],
    viewMode: true,
  },
];

export const disablePlanningScreen = [1, 5];

export const PRE_SEASON_STATUS_CODES = [0, 1, 2];
export const IN_SEASON_STATUS_CODES = [3, 4, 5];

export const isInSeasonPlan = (statusCode) => {
  return IN_SEASON_STATUS_CODES.includes(statusCode);
};
export const getPlanningScreenBreadCrumbsUrlAndStage = (statusCode) => {
  if (PRE_SEASON_STATUS_CODES.indexOf(statusCode) > -1) {
    return [PLAN_SMART_PRE_SEASON_DASHBOARD, "Pre-Season - Planning Screen"];
  } else if (IN_SEASON_STATUS_CODES.indexOf(statusCode) > -1) {
    return [PLAN_SMART_IN_SEASON_DASHBOARD, "In-Season - Planning Screen"];
  }
  return [];
};

export const getStatusCodeForImportPlan = {
  [statusCodeBasedOnPlanType[REGULAR_PLAN]]: [
    statusCodeBasedOnPlanType[FINAL_PLAN],
    statusCodeBasedOnPlanType[SCENARIO_PLAN],
  ],
  [statusCodeBasedOnPlanType[SCENARIO_PLAN]]: [
    statusCodeBasedOnPlanType[REGULAR_PLAN],
    statusCodeBasedOnPlanType[FINAL_PLAN],
    statusCodeBasedOnPlanType[SCENARIO_PLAN],
  ],
  [statusCodeBasedOnPlanType[ACTIVE_FORECAST]]: [
    statusCodeBasedOnPlanType[FINAL_FORECAST],
    statusCodeBasedOnPlanType[SCENARIO_FORECAST],
  ],
  [statusCodeBasedOnPlanType[SCENARIO_FORECAST]]: [
    statusCodeBasedOnPlanType[ACTIVE_FORECAST],
    statusCodeBasedOnPlanType[FINAL_FORECAST],
    statusCodeBasedOnPlanType[SCENARIO_FORECAST],
  ],
};

export const MAX_ROW_ALLOWED_FOR_COMPARE = 7;
export const MAX_ROW_ALLOWED_FOR_COMPARE_ERROR_MSG =
  "Max 7 rows can be viewed at a time!  You can hide the rows from show/hide metrics to view more rows !";
export const SHOW_METRIC_MAX_ROW_ALLOWED_ERROR_MSG = `Max ${MAX_ROW_ALLOWED_FOR_COMPARE} are allowed, Please hide metrics or remove version`;

export const pivotViewOptions = [
  {
    label: "KPI View",
    value: "kpi_view",
  },
  {
    label: "Timeline View",
    value: "tmln_view",
  },
  {
    label: "Product Hierarchy view",
    value: "prd_hier_view",
  },
  {
    label: "Version View",
    value: "ver_view",
  },
];

export const trackHiddenMetricOverallHierarchyKey = "overall";
export const trackHiddenMetricReferenceHierarchyKey = "reference";
export const trackHiddenMetricBucketKey = "bucket";

export const isScenarioPlan = (status) =>
  statusCodeBasedOnPlanType[SCENARIO_PLAN] === status;

export const getDashboardUrl = (status) => {
  if (
    statusCodeBasedOnPlanType[SCENARIO_PLAN] === status ||
    statusCodeBasedOnPlanType[REGULAR_PLAN] === status
  ) {
    return PLAN_SMART_PRE_SEASON_DASHBOARD;
  }
  return PLAN_SMART_IN_SEASON_DASHBOARD;
};

export const getMatchWithText = (status) => {
  if (statusCodeBasedOnPlanType[REGULAR_PLAN] === status) {
    return common.match_with_wp;
  } else if (statusCodeBasedOnPlanType[SCENARIO_PLAN] === status) {
    return common.match_with_sp;
  } else if (statusCodeBasedOnPlanType[ACTIVE_FORECAST] === status) {
    return common.match_with_af;
  } else if (statusCodeBasedOnPlanType[SCENARIO_FORECAST] === status) {
    return common.match_with_sf;
  }
};

export const typeOfFunctions = [
  "sum",
  "avg",
  "first",
  "last",
  "scaling_factor",
];

export const metricKeysList = [
  "qty",
  "sales",
  "margin",
  "cost",
  "disc",
  "rcpt_cost",
  "rcpt_dollars",
  "rcpt_units",
  "comp_dollars",
  "comp_units",
  "non_comp_dollars",
  "non_comp_units",
  "bop_auc",
  "bop_aur",
  "bop_cost",
  "bop_dollars",
  "bop_units",
  "oo_units",
  "oo_dollars",
  "oo_cost",
  "it_units",
  "it_dollars",
  "it_cost",
  "eop_auc",
  "eop_aur",
  "eop_cost",
  "eop_dollars",
  "eop_units",
  "msrp",
  "avg_inv",
  "st_perc",
  "rcpt_auc",
  "rcpt_aur",
  "non_comp_aur",
  "turn_cost",
  "turn_dollars",
  "turn_units",
  "gmroi",
  "wos",
  "qty_build_ratio",
  "dollar_build_ratio",
  "aps",
  "markup_per",
  "adj_units",
  "wos",
  "in_stock_per",
  "otb_dollars",
  "adj_units",
  "adj_cost",
  "rcpt_units",
  "rcpt_cost",
  "rcpt_auc",
  "turn_units",
  "turn_cost",
  "oo_units",
  "oo_cost",
  "oo_units_sys",
  "oo_units_add",
  "oo_cost_sys",
  "oo_cost_add",
  "otb_op",
  "eop_cost_op",
  "eop_cost_lf",
  "otb_lf",
];

// temperory constant to enable uncollaped by default functionality, going forward in version two,
//we will try to get this in response while fetching the budget response.

export const bucket_keys = ["clr_", "reg_", "total_"];

export const referencePercentArr = [
  "variance",
  "variance_fcst",
  "rel_variance_fcst",
];
export const referenceKeyMetrics = {
  current: "current",
  variance: "variance",
  forcasted: "forecasted",
  variance_fcst: "variance_fcst",
  compare: "compare",
  rel_forcasted: "rel_forcasted",
  rel_variance_fcst: "rel_variance_fcst",
};

export const downloadOptions = [
  {
    label: "This Page",
    value: "this_page",
  },
  {
    label: "High Level Plan",
    value: "high_level_plan",
  },
  {
    label: "Entire Plan",
    value: "entire_plan",
  },
];

export const planningScreenDownloadOption = ["this_page", "entire_plan"];

export const dashboardDownloadOption = ["high_level_plan", "entire_plan"];

export const webWorkerColOmitObjList = [
  "cellRenderer",
  "valueGetter",
  "tooltipValueGetter",
  "onCellValueChanged",
  "comparator",
  "onCellFocused",
  "suppressKeyboardEvent",
  "headerComponent",
];
// will move to DB layer in next PR
export const proportionateMetrics = [
  "qty",
  "sales",
  "bop_units",
  "rcpt_units",
  "adj_units",
  "margin",
  "oo_units_add",
  "oo_cost_add",
  "oo_units_cost",
  "rcpt_cost",
  "adj_cost",
  "bop_cost",
];
export const equalUpdateMetrics = [
  "aur",
  "auc",
  "disc",
  "sell_through",
  "msrp",
  "margin_per",
  "bop_auc",
  "rcpt_auc",
  "adj_auc",
  "oo_auc_add",
];

// need to move to db layer
export const firstLastBucketTotalColumn = ["bop_units", "eop_units"];

export const getMatchWithSeason = (statusCode) => {
  if (PRE_SEASON_STATUS_CODES.indexOf(statusCode) > -1) {
    return "pre";
  } else if (IN_SEASON_STATUS_CODES.indexOf(statusCode) > -1) {
    return "in";
  }
};

export const rowsWithoutEditablerenderer = [
  "compare",
  "forcasted",
  "variance_fcst",
  "rel_forcasted",
  "rel_variance_fcst",
];

export const manualCalculationHandledKpis = [
  "bop_units",
  "eop_units",
  "bop_cost",
  "eop_cost",
  "avg_inv",
  "st_perc",
  "wos",
  "turn_cost",
  "turn_units",
  "gmroi",
  "otb_lf",
  "otb_op",
];

export const updatePlanAddAllWeeksKpis = [
  ...manualCalculationHandledKpis,
  "bop_auc",
  "eop_auc"
]