import { createSlice } from "@reduxjs/toolkit";
import {
  INVENTORY_DASHBOARD_FORECAST_KPI_DATA,
  INVENTORY_DASHBOARD_KPI_DATA,
  INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_ALERT_DATA,
  INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_DATA,
  INVENTORY_DASHBOARD_STORE_INVENTORY_KPI_DATA,
  INVENTORY_DASHBOARD_FORECAST_KPI_DRILLDOWN,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartKPIService = createSlice({
  name: "inventorySmartKPIService",
  initialState: {
    inventoryDashboardKPIConfigLoader: false,
    inventoryDashboardKPIDataLoader: false,
    inventoryDashboardForecastKPIDataLoader: false,
    inventoryDashboardOrderKPIDataLoader: false,
    inventoryDashboardAlertCount: {},
    inventoryDashboardForecastDrilldownLoader: false,
  },
  reducers: {
    setInventoryDashboardKPIConfigLoader: (state, action) => {
      state.inventoryDashboardKPIConfigLoader = action.payload;
    },
    setInventoryDashboardKPIDataLoader: (state, action) => {
      state.inventoryDashboardKPIDataLoader = action.payload;
    },
    setInventoryDashboardForecastKPIDataLoader: (state, action) => {
      state.inventoryDashboardForecastKPIDataLoader = action.payload;
    },
    setInventoryDashboardOrderKPIDataLoader: (state, action) => {
      state.inventoryDashboardOrderKPIDataLoader = action.payload;
    },
    setInventoryDashboardAlertCount: (state, action) => {
      state.inventoryDashboardAlertCount[action.payload.key] =
        action.payload.data;
    },
    setInventoryDashboardForecastDrilldownLoader: (state, action) => {
      state.inventoryDashboardForecastDrilldownLoader = action.payload;
    },
  },
});

export const {
  setInventoryDashboardKPIConfigLoader,
  setInventoryDashboardKPIDataLoader,
  setInventoryDashboardForecastKPIDataLoader,
  setInventoryDashboardOrderKPIDataLoader,
  setInventoryDashboardAlertCount,
  setInventoryDashboardForecastDrilldownLoader,
} = inventorySmartKPIService.actions;

export const getInventoryDashboardKPIData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getInventoryDashboardStoreInventoryKPIData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_STORE_INVENTORY_KPI_DATA + postBody.type,
    method: "POST",
    data: postBody.body,
  });
};

export const getInventoryDashboardForecastKPIData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_FORECAST_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getForecastKPIDrilldownData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_FORECAST_KPI_DRILLDOWN,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartKPIService.reducer;
