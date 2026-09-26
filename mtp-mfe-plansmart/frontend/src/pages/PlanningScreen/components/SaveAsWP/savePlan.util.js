import {
  PLANS_LIST_STATUS_VALUE,
  MODAL_SUB_HEADING,
  SAVE_PLAN
} from "./savePlan.constant.js";
import {
  IN_SEASON_DASHBOARD_ROUTE,
  PRE_SEASON_DASHBOARD_ROUTE
} from "../../../../constants/route.constant";

export const getButtonName = (planStatus) => {
  return planStatus === PLANS_LIST_STATUS_VALUE.SCENARIO_PLAN
    ? SAVE_PLAN.SAVE_AS_WP
    : SAVE_PLAN.SAVE_AS_WF;
};

export const getSubHeading = (planStatus) => {
  return planStatus === PLANS_LIST_STATUS_VALUE.SCENARIO_PLAN
    ? MODAL_SUB_HEADING.SAVE_AS_WP
    : MODAL_SUB_HEADING.SAVE_AS_WF;
};

export const getDashBoardUrl = (planStatus) => {
  return planStatus === PLANS_LIST_STATUS_VALUE.SCENARIO_PLAN
    ? PRE_SEASON_DASHBOARD_ROUTE
    : IN_SEASON_DASHBOARD_ROUTE;
};
