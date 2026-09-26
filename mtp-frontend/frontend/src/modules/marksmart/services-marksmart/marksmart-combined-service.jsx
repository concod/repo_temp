import { combineReducers } from "redux";
import dashboardReducer from "./dashboard/dashboard-service";
export const marksmartReducer = combineReducers({
  dashboardReducer,
});
