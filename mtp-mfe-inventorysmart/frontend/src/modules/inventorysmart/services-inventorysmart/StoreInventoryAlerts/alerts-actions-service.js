import { createSlice } from "@reduxjs/toolkit";
import {
  FETCH_TABLE_CONFIG,
  INVENTORY_DASHBOARD_ALERTS_REVIEW,
  FETCH_DC_TRANSFER_RECOMMENDATION,
  FETCH_DC_TRANSFER_SIZE_LEVEL,
  UPDATE_DC_TRANSFER_STATUS,
  EDIT_DC_TRANSFER_SIZE_LEVEL,
} from "../../constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartAlertsActionService = createSlice({
  name: "inventorySmartAlertsActionService",
  initialState: {
    alertsActionTableConfigLoader: false,
    alertsActionPopupConfigLoader: false,
    alertsActionPopupDataLoader: false,
    alertsActionTableConfig: [],
    alertsActionPopupConfig: [],
    dcTransferRecommendationLoader: false,
    dcTransferRecommendationData: [],
    customAllocationAlertFilterConfig: [],
    dcTransferSizeLevelData: [],
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
    setDCTransferRecommendationLoader: (state, action) => {
      state.dcTransferRecommendationLoader = action.payload;
    },
    setDCTransferRecommendationData: (state, action) => {
      state.dcTransferRecommendationData = action.payload;
    },
    setCustomAllocationAlertFilterConfig: (state, action) => {
      state.customAllocationAlertFilterConfig = action.payload;
    },
    setDCTransferSizeLevelData: (state, action) => {
      state.dcTransferSizeLevelData = action.payload;
    },
  },
});

export const {
  setAlertsActionTableConfigLoader,
  setAlertsActionTableConfiguration,
  setAlertsActionPopupDataLoader,
  setAlertsActionPopupConfigLoader,
  setAlertsActionPopupConfiguration,
  setDCTransferRecommendationLoader,
  setDCTransferRecommendationData,
  setCustomAllocationAlertFilterConfig,
  setDCTransferSizeLevelData,
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

export const fetchDCTransferRecommendation = (postBody) => () => {
  return axiosInstance({
    url: FETCH_DC_TRANSFER_RECOMMENDATION,
    method: "POST",
    data: postBody,
  });
};

export const fetchDCTransferSizeLevel = (postBody) => () => {
  return axiosInstance({
    url: FETCH_DC_TRANSFER_SIZE_LEVEL,
    method: "POST",
    data: postBody,
  });
};

export const updateDCTransferStatus = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_DC_TRANSFER_STATUS,
    method: "POST",
    data: postBody,
  });
};

export const editDCTransferSizeLevel = (postBody) => () => {
  return axiosInstance({
    url: EDIT_DC_TRANSFER_SIZE_LEVEL,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartAlertsActionService.reducer;
