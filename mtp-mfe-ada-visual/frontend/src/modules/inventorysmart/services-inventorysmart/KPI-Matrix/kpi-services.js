import { createSlice } from "@reduxjs/toolkit";
import {
  INVENTORY_DASHBOARD_FORECAST_KPI_DATA,
  INVENTORY_DASHBOARD_KPI_DATA,
  INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_ALERT_DATA,
  INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_DATA,
  INVENTORY_DASHBOARD_STORE_INVENTORY_KPI_DATA,
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
    inventoryDashboardOMSAlertCount: [],
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
    setInventoryDashboardOMSAlertCount: (state, action) => {
      state.inventoryDashboardOMSAlertCount = action.payload;
    },
  },
});

export const {
  setInventoryDashboardKPIConfigLoader,
  setInventoryDashboardKPIDataLoader,
  setInventoryDashboardForecastKPIDataLoader,
  setInventoryDashboardOrderKPIDataLoader,
  setInventoryDashboardAlertCount,
  setInventoryDashboardOMSAlertCount,
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
    url: INVENTORY_DASHBOARD_STORE_INVENTORY_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getInventoryDashboardForecastKPIData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_FORECAST_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getInventoryDashboardOrderKPIData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getInventoryDashboardOrderKPIAlertData = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_ORDER_INVENTORY_KPI_ALERT_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartKPIService.reducer;
