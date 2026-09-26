import { createSlice } from "@reduxjs/toolkit";
import {
  FORECAST_ALERTS_TABLE_DATA,
  FORECAST_ALERTS_AVAILABLE_CHANNELS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartStoreForecastAlerts = createSlice({
  name: "inventorySmartStoreForecastAlerts",
  initialState: {
    storeForecastAlertsTableLoader: false,
  },
  reducers: {
    setStoreForecastAlertsTableLoader: (state, action) => {
      state.storeForecastAlertsTableLoader = action.payload;
    },
  },
});

export const {
  setStoreForecastAlertsTableLoader,
} = inventorySmartStoreForecastAlerts.actions;

export const getStoreForecastAlertsTableData = (postBody) => () => {
  return axiosInstance({
    url: FORECAST_ALERTS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getForecastMissingChannels = (postBody) => () => {
  return axiosInstance({
    url: FORECAST_ALERTS_AVAILABLE_CHANNELS,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartStoreForecastAlerts.reducer;
