import { combineReducers } from "redux";
import createNewPlanPage from "../pages/CreateNewPlan/createNewPlan.slice";
import masterPlan from "../pages/MasterPlan/masterPlan.slice";
import commonDashboard from "../pages/CommonDashboard/dashboard.slice";
import { planningScreenReducer } from "../pages/PlanningScreen/slice/planningScreen.slice";
import planningMetrics from "../pages/TenantConfiguration/slice/planningMetrics.slice";
import viewManagement from "../pages/ViewManagement/viewManagement.slice";
import tableViewConfigurationData from "../core/Utils/agGrid/TableViewManagement/table-view/table-view-panel-service";

export const plansmartReducer = combineReducers({
  planningScreen: planningScreenReducer,
  createNewPlanPage,
  masterPlan,
  commonDashboard,
  planningMetrics,
  viewManagement,
  tableViewConfigurationData
});
