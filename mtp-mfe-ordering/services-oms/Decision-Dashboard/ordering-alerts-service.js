import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  ORDER_ALERTS_TABLE_CONFIG,
  ORDER_ALERTS_TABLE_DATA,
  RECOMMENDED_ALERTS_TABLE_DATA,
  RECOMMENDED_POPUP_ALERTS_TABLE_DATA,
  UPDATE_RESOLVED_DATA,
  DECISION_DASHBOARD_ORDER_KPI_DATA,
  DECISION_DASHBOARD_ORDER_ALERT_DATA,
  OFF_CYCLE_ORDER_ALERT_DATA,
} from "modules/oms/constants-oms/apiConstants";

export const omsOrderingAlertsService = createSlice({
  name: "omsOrderingAlertsService",
  initialState: {
    orderAlertsTableConfigLoader: false,
    orderAlertsTableDataLoader: false,
    orderAlertsPopUpTableConfigLoader: false,
    orderAlertsPopUpTableDataLoader: false,
    orderVendorDCAlertCount: {},
    orderVendorStoreAlertCount: {},
    orderKPIConfigLoader: false,
    orderKPIDataLoader: false,
    orderAlertCount: {},
    offCycleOrderAlertCount: {},
    offCycleOrderAlertDataLoader: false,
  },
  reducers: {
    setOrderAlertsTableConfigLoader: (state, action) => {
      state.orderAlertsTableConfigLoader = action.payload;
    },
    setOrderAlertsTableDataLoader: (state, action) => {
      state.orderAlertsTableDataLoader = action.payload;
    },
    setOrderAlertsPopUpTableConfigLoader: (state, action) => {
      state.orderAlertsPopUpTableConfigLoader = action.payload;
    },
    setOrderAlertsPopUpTableDataLoader: (state, action) => {
      state.orderAlertsPopUpTableDataLoader = action.payload;
    },
    setOrderVendorDCAlertCount: (state, action) => {
      state.orderVendorDCAlertCount = action.payload;
    },
    setOrderVendorStoreAlertCount: (state, action) => {
      state.orderVendorStoreAlertCount = action.payload;
    },
    setOrderKPIConfigLoader: (state, action) => {
      state.orderKPIConfigLoader = action.payload;
    },
    setOrderKPIDataLoader: (state, action) => {
      state.orderKPIDataLoader = action.payload;
    },
    setOrderAlertCount: (state, action) => {
      state.orderAlertCount[action.payload.key] = action.payload.data;
    },
    setOffCycleOrderAlertCount: (state, action) => {
      state.offCycleOrderAlertCount = action.payload;
    },
    setOffCycleOrderAlertDataLoader: (state, action) => {
      state.offCycleOrderAlertDataLoader = action.payload;
    },
    resetOrderingAlertsData: (state) => {
      state.orderAlertsTableConfigLoader = false;
      state.orderAlertsTableDataLoader = false;
      state.orderAlertsPopUpTableConfigLoader = false;
      state.orderAlertsPopUpTableDataLoader = false;
      state.orderVendorDCAlertCount = {};
      state.orderVendorStoreAlertCount = {};
      state.orderKPIConfigLoader = false;
      state.orderKPIDataLoader = false;
      state.orderAlertCount = {};
      state.offCycleOrderAlertCount = {};
      state.offCycleOrderAlertDataLoader = false;
    },
  },
});

export const {
  setOrderAlertsTableConfigLoader,
  setOrderAlertsTableDataLoader,
  setOrderAlertsPopUpTableConfigLoader,
  setOrderAlertsPopUpTableDataLoader,
  setOrderVendorDCAlertCount,
  setOrderVendorStoreAlertCount,
  setOrderKPIConfigLoader,
  setOrderKPIDataLoader,
  setOrderAlertCount,
  setOffCycleOrderAlertCount,
  setOffCycleOrderAlertDataLoader,
  resetOrderingAlertsData,
} = omsOrderingAlertsService.actions;

export const getDashboardOrderKPIData = (postBody) => () => {
  return axiosInstance({
    url: DECISION_DASHBOARD_ORDER_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getDashboardOrderAlertData = (postBody) => () => {
  return axiosInstance({
    url: DECISION_DASHBOARD_ORDER_ALERT_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderAlertsTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getVendorStoreAlertsTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderAlertsTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getRecommendedOrderAlertsTableData = (postBody) => () => {
  return axiosInstance({
    url: `${RECOMMENDED_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
    method: "POST",
    data: postBody.data,
  });
};

export const getRecommendedOrderPopUpTableData = (postBody) => () => {
  return axiosInstance({
    url: `${RECOMMENDED_POPUP_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
    method: "GET",
  });
};

export const updateResolvedData = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_RESOLVED_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleOrderAlertData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_ALERT_DATA,
    method: "POST",
    data: postBody,
  });
};

export default omsOrderingAlertsService.reducer;
