import { combineReducers } from "redux";
import adaDashboardReducer from "./ada-dashboard/ada-dashboard-services";
import adaForecastMultiplierReducer from "./ada-dashboard/ada-forecastmultiplier-services";
import createAllocationService from "./ada-dashboard/createAllocationService";

export const adaReducer = combineReducers({
  adaDashboardReducer,
  adaForecastMultiplierReducer,
  createAllocationService,
});
