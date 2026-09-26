import { PLANS_LIST_STATUS_VALUE } from "../CommonDashboard/dashboard.constant";

export const BUDGET_TABLE_ROW_HEIGHT = 29;

export const BUDGET_LIST_API = "/plan-smart/plan/listing";
export const TARGET_PLAN_BUDGET_LIST_API = "/plan-smart/targetplan/listing";

export const UPDATE_PLAN_API = "/plan-smart/budget/update-v4";

export const PLAN_UPDATE_SUCCESS_MSG = "Plan Updated SuccessFully";
export const KPI_CONFIG_API = "/plan-smart/config/kpi_configs";
export const KPI_CONFIG_API_V2 = "/plan-smart/config/kpi_configs_v2";

export const PLAN_ACTUALIZED_WEEKS =
  "/plan-smart/budget/get-actualised-timeline";

export const CHILDREN = "children";
export const PLANNING_SCREEN = "PLANNING_SCREEN";
export const RESET_WARNING_MESSAGE =
  "Values would be reverted to the last saved state";

export const EOP_BOH_SYNC_TOOLTIP = "BOH and EOH flow sync";

export const DEPARTMENT = "l1_name";
export const CLASS = "l2_name";
export const PLAN_LOCK_MESSAGE = "Plan is locked";

// TODO: REMOVE IN SP 63
export const targetPlanVisibleKpis = [
  "written_sales_dollars",
  "written_comp_spread_perc",
  "written_sales_comp",
  "written_sales_noncomp",
  "written_gm_perc",
  "written_gm_dollar"
];

export const NON_ACTUALIZED_PLAN_STATUS = [
  PLANS_LIST_STATUS_VALUE.ACTIVE_PLAN,
  PLANS_LIST_STATUS_VALUE.SCENARIO_PLAN,
  PLANS_LIST_STATUS_VALUE.TARGET_PLAN
];

export const PRE_SEASON_STATUS_CODES = [0, 1, 2];
export const IN_SEASON_STATUS_CODES = [3, 4, 5];
export const TARGET_PLAN_STATUS_CODES = [9];
export const SERVER_CALCULATION_API = "/plan-smart/plan/calculation";
export const SERVER_COPY_PASTE_API = "/plan-smart/plan/multi-cell-calculation";
export const UPDATE_PLAN_API_V5 = "/plan-smart/budget/update-plan";
export const PLAN_UNDO_API_URL = "/plan-smart/plan/undo";
export const PLAN_RESET_API_URL = "/plan-smart/plan/reset";

export const calcOnServer = () => {
  if (!localStorage.getItem("calcOnServer")) {
    localStorage.setItem("calcOnServer", true);
  }
  return localStorage.getItem("calcOnServer") === "true";
};
