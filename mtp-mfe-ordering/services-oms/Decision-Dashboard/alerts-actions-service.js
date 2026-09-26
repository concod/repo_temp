import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { FETCH_TABLE_CONFIG } from "modules/oms/constants-oms/apiConstants";

export const omsAlertsActionsService = createSlice({
  name: "omsAlertsActionsService",
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
} = omsAlertsActionsService.actions;

export const getAlertsActionPopupData = (postBody) => () => {
  return axiosInstance({
    url: postBody.url,
    method: "POST",
    data: postBody.data,
  });
};

export const getAlertsActionPopupConfiguration = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const getAlertsActionTableConfiguration = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export default omsAlertsActionsService.reducer;
