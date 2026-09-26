import { combineReducers } from "redux";
import planDashboardReducer from "./PlanSmart-Dashboard/plansmart-dashboard-services";
import planCreateNewPlanReducer from "./CreateNewPlan/create-new-plan-service";
import planBudgetTableReducer from "./BudgetPlanTable/budget-plan-table-service";
import masterPlanReducer from "./Master-Plan/master-plan-services";
import comparePlanReducer from "./ComparePlan/compare-plan-service";
import reportReducer from "./Report/report-services";
import plansmartTenantConfig from "../../../core/reducers/tenantConfigService";
import planSmartCommonReducer from "./common/plansmart-common-service";

export const plansmartReducer = combineReducers({
  planDashboardReducer,
  planCreateNewPlanReducer,
  planBudgetTableReducer,
  masterPlanReducer,
  comparePlanReducer,
  reportReducer,
  tenantConfigs: plansmartTenantConfig,
  planSmartCommonReducer,
});
