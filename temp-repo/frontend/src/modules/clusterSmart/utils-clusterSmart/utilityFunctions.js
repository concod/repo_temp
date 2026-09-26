import { BREAD_CRUMB_TITLES } from "../constants-clustersmart/stringConstants";

export const getBreadCrumbHeaderClusterSmart = (planStep, location) => {
    if (planStep === 0) {
      return BREAD_CRUMB_TITLES[0];
    }
    if (planStep >= 1.1 && planStep <= 1.2) {
      return BREAD_CRUMB_TITLES[1];
    }
};