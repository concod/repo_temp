import { combineReducers } from "redux";
import matrixSummaryDashboardReducer from "./ordering-marix-summary/matrix-summary-dashboard-services";
import matrixSummaryEditForecastReducer from "./ordering-marix-summary/matrix-summary-edit-forecast-services";
import matrixSummaryMultiplierReducer from "./ordering-marix-summary/matrix-summary-multiplier-services";
import orderManagementViewReducer from "modules/oms/pages-oms/OrderManagement/slices/orderManagementView.slice";

export const matrixSummaryReducer = combineReducers({
  matrixSummaryDashboardReducer,
  matrixSummaryEditForecastReducer,
  matrixSummaryMultiplierReducer,
  orderManagementViewReducer,
});
