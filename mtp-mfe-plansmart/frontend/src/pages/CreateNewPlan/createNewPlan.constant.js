export const PLAN_VIEW_PAGE_URL = "/plan-smart/plan/view/";
export const PLAN_EDIT_PAGE_URL = "/plan-smart/plan/edit";

export const CREATE_PLAN_API_URL = "/plan-smart/plan/create_plan";
export const FETCH_FORM_FIELDS_PLANSMART_API_URL =
  "/core/attribute-filter/product";

export const CREATE_PLAN = "create-plan";
export const REVIEW_IN_SEASON = "review-in-season";
export const CREATE_TARGET_PLAN = "create-target-plan";

export const PLAN_CREATE_SUCCESS_MESSAGE = "plan created successfully.";
export const MIN_DATE_SELECTION_ERROR_MESSAGE =
  "Start date should be before the end date";
export const MAX_DATE_SELECTION_ERROR_MESSAGE =
  "Duration of plan should be less than 2 years.";
export const MAX_YEAR_SELECTION_ERROR_MESSAGE = "Please select 2 or less years";
export const SEQUENTIAL_SELECTION_ERROR_MESSAGE =
  "Please select only sequential values";
export const ERROR_MESSAGE = "Error in fetching form fields";
export const OPTION_SET = "OPTION_SET";

export const CREATE_PLAN_FILTER_CONFIG_URL =
  "/core/filter-configuration/screen/plansmart%20create%20plan";
export const CREATE_TARGET_PLAN_FILTER_CONFIG_URL =
  "/core/filter-configuration/screen/plansmart%20target%20plan";

export const PLAN_STAGE_CONSTANTS = {
  "Working Plan": 0,
  "Scenario Plan": 2,
  "Working Forecast": 4,
  "Scenario Forecast": 3
};

export const API_CALL_TYPE = {
  MODEL: "MODEL",
  PLANSMART: "PLANSMART"
};

export const FORM_FIELDS = {
  START_YEAR: "start_year",
  START_MONTH: "start_month",
  END_YEAR: "end_year",
  END_MONTH: "end_month",
  PLAN_STAGE: "plan_stage",
  L0_NAME: "l0_name",
  L1_NAME: "l1_name",
  L2_NAME: "l2_name",
  L3_NAME: "l3_name"
};

export const CREATE_TARGET_PLAN_STATUS_PAYLOAD = {
  attribute_name: "status",
  attribute_value: 9,
  dimension: "plan"
};

export const DATATYPE = {
  ARRAY: "array",
  MOMENT: "moment"
};

export const YYYY_MM_DD = "YYYY-MM-DD";

export const CLIENT = {
  PARTYCITY: "Partycity",
  ARHAUS: "Arhaus",
  TOMMYBAHAMA: "Tommybahama"
};
