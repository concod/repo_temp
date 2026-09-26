export const DEPARTMENT = "department";
export const CLASS = "class";

export const DASHBOARD_PAGES = {
  PRE_SEASON: "pre-season",
  IN_SEASON: "in-season",
  TARGET_PLAN: "target-plan"
};

export const FORM_FIELDS = {
  START_YEAR: "start_year",
  START_MONTH: "start_month",
  END_YEAR: "end_year",
  END_MONTH: "end_month",
  PLAN_STAGE: "plan_stage",
  L0_NAME: "l0_name",
  L1_NAME: "l1_name",
  L2_NAME: "l2_name"
};

// Dashboard API URLs
export const PLANS_LIST_COLUMN_API_URL = "/plan-smart/dashboard/table_conf";
export const PLANS_LIST_TABLE_API_URL = "/plan-smart/dashboard/data/list";

//Target PlanSList API URLs
export const TARGET_PLANS_LIST_COLUMN_API_URL =
  "plan-smart/target-dashboard/table_conf";

//plans status values
export const PLANS_LIST_STATUS_VALUE = {
  ACTIVE_PLAN: 0,
  SCENARIO_PLAN: 2,
  ACTIVE_FORECAST: [4, 5],
  SCENARIO_FORECAST: 3,
  TARGET_PLAN: 9
};

//plan list filter payload
export const PLANS_LIST_FILTER_PAYLOAD = [
  {
    attribute_name: "l0_name",
    operator: "in",
    filter_type: "cascaded",
    values: []
  },
  {
    attribute_name: "l1_name",
    operator: "in",
    filter_type: "cascaded",
    values: []
  },
  {
    attribute_name: "l2_name",
    operator: "in",
    filter_type: "cascaded",
    values: []
  }
];

//plans list filter payload
export const PLANS_LIST_STATUS_FILTER_PAYLOAD = {
  activePlan: {
    attribute_name: "status",
    filter_type: "non-cascaded",
    operator: "in",
    values: [PLANS_LIST_STATUS_VALUE.ACTIVE_PLAN]
  },
  scenarioPlan: {
    attribute_name: "status",
    filter_type: "non-cascaded",
    operator: "in",
    values: [PLANS_LIST_STATUS_VALUE.SCENARIO_PLAN]
  },
  activeForecast: {
    attribute_name: "status",
    filter_type: "non-cascaded",
    operator: "in",
    values: [...PLANS_LIST_STATUS_VALUE.ACTIVE_FORECAST]
  },
  scenarioForecast: {
    attribute_name: "status",
    filter_type: "non-cascaded",
    operator: "in",
    values: [PLANS_LIST_STATUS_VALUE.SCENARIO_FORECAST]
  },
  targetPlan: {
    attribute_name: "status",
    filter_type: "non-cascaded",
    operator: "in",
    values: [PLANS_LIST_STATUS_VALUE.TARGET_PLAN]
  }
};

export const BUTTON_MASTER_PLAN = "Master Plan";
