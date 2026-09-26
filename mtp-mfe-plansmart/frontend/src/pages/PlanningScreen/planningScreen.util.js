import {
  CHILDREN,
  PRE_SEASON_STATUS_CODES,
  IN_SEASON_STATUS_CODES,
  TARGET_PLAN_STATUS_CODES
} from "./planningScreen.constant";
import {
  PRE_SEASON_DASHBOARD_ROUTE,
  IN_SEASON_DASHBOARD_ROUTE,
  TARGET_PLAN_ROUTE
} from "constants/route.constant";

export const getFormattedData = (showHideData) => {
  return showHideData.map((row) => {
    return row.map((item) => {
      const updatedItem = {
        ...item,
        isChecked: item.is_checked,
        isEditable: item.is_editable,
        isVisible: item.is_visible
      };
      if (updatedItem.hasOwnProperty(CHILDREN)) {
        updatedItem.children = updatedItem.children.map((child) => {
          return {
            ...child,
            isChecked: child.is_checked,
            isEditable: item.is_editable,
            isVisible: item.is_visible
          };
        });
      }
      return updatedItem;
    });
  });
};

export const resetBudgetTable = (
  setLockedCells,
  setTrackBudgetTableChanges,
  setBudgeTableRowData,
  rowData
) => {
  setLockedCells({});
  setTrackBudgetTableChanges([]);
  setBudgeTableRowData(rowData);
};

export const getPlanningScreenBreadCrumbsDetails = (planStatus) => {
  if (PRE_SEASON_STATUS_CODES.includes(planStatus)) {
    return {
      dashboardRedirectionUrl: PRE_SEASON_DASHBOARD_ROUTE,
      label: "Pre-Season Dashboard",
      seasonType: "pre-season"
    };
  } else if (IN_SEASON_STATUS_CODES.includes(planStatus)) {
    return {
      dashboardRedirectionUrl: IN_SEASON_DASHBOARD_ROUTE,
      label: "In-Season Dashboard",
      seasonType: "in-season"
    };
  } else if (TARGET_PLAN_STATUS_CODES.includes(planStatus)) {
    return {
      dashboardRedirectionUrl: TARGET_PLAN_ROUTE,
      label: "Target Planning Dashboard",
      seasonType: "target-plan"
    };
  }
  return {};
};
