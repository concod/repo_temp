import { createSlice } from "@reduxjs/toolkit";
import {
  FETCH_TABLE_CONFIG,
  INVENTORY_DASHBOARD_ALERTS_REVIEW,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartAlertsActionService = createSlice({
  name: "inventorySmartAlertsActionService",
  initialState: {
    alertsActionTableConfigLoader: false,
    alertsActionPopupConfigLoader: false,
    alertsActionPopupDataLoader: false,
    alertsActionTableConfig: [],
    alertsActionPopupConfig: [],
  },
  reducers: {
    setAlertsActionTableConfigLoader: (state, action) => {
      state.alertsActionTableConfigLoader = action.payload;
    },
    setAlertsActionTableConfiguration: (state, action) => {
      state.alertsActionTableConfig = action.payload;
    },
    setAlertsActionPopupDataLoader: (state, action) => {
      state.alertsActionPopupDataLoader = action.payload;
    },
    setAlertsActionPopupConfigLoader: (state, action) => {
      state.alertsActionPopupConfigLoader = action.payload;
    },
    setAlertsActionPopupConfiguration: (state, action) => {
      state.alertsActionPopupConfig = action.payload;
    },
  },
});

export const {
  setAlertsActionTableConfigLoader,
  setAlertsActionTableConfiguration,
  setAlertsActionPopupDataLoader,
  setAlertsActionPopupConfigLoader,
  setAlertsActionPopupConfiguration,
} = inventorySmartAlertsActionService.actions;

export const getAlertsActionTableConfiguration = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const getAlertsActionPopupConfiguration = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const getAlertsActionPopupData = (postBody) => () => {
  return axiosInstance({
    url: postBody.url,
    method: "POST",
    data: postBody.data,
  });
};

export const getServerSideAlertsData = (postBody) => () => {
  return axiosInstance({
    url: postBody.url,
    method: "POST",
    data: postBody.data,
    includeExclusionFilter: postBody.includeExclusionFilter,
    excludeURLObject: postBody.excludeURLObject,
  });
};

export const reviewAlerts = (postBody) => () => {
  return axiosInstance({
    url: INVENTORY_DASHBOARD_ALERTS_REVIEW,
    method: "PATCH",
    data: postBody,
  });
};

export default inventorySmartAlertsActionService.reducer;
