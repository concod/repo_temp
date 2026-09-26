import { IN_SEASON, PRE_SEASON, TARGET_PLAN } from "../constants/constant";
import {
  PRE_SEASON_STATUS_CODES,
  IN_SEASON_STATUS_CODES,
  TARGET_PLAN_STATUS_CODES
} from "../pages/PlanningScreen/planningScreen.constant";

const getPlanningScreenSeasonType = (planStatus) => {
  if (PRE_SEASON_STATUS_CODES.includes(planStatus)) {
    return PRE_SEASON;
  } else if (IN_SEASON_STATUS_CODES.includes(planStatus)) {
    return IN_SEASON;
  } else if (TARGET_PLAN_STATUS_CODES.includes(planStatus)) {
    return TARGET_PLAN;
  }
};

export default getPlanningScreenSeasonType;
