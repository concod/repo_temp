import { combineReducers } from "redux";
import adaDashboardReducer from "./ada-dashboard/ada-dashboard-services";
import adaEditForecastReducer from "./ada-dashboard/ada-edit-forecast-services";
import adaForecastMultiplierReducer from "./ada-dashboard/ada-forecastmultiplier-services";
import adaModuleConfiguratorReducer from "./ada-dashboard/ada-module-configurator-service";
import createAllocationService from "./ada-dashboard/createAllocationService"

export const adaReducer = combineReducers({
  adaDashboardReducer,
  adaEditForecastReducer,
  adaForecastMultiplierReducer,
  adaModuleConfiguratorReducer,
  createAllocationService
});
