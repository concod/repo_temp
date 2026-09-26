import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { DC_TRANSFER_CONFIGURATIONS_CREATION, DC_TRANSFER_CONFIGURATIONS_LIST, DC_TRANSFER_CONFIGURATIONS_SET_ALL, DC_TRANSFER_CONFIGURATIONS_SAVE, DC_TRANSFER_CONFIGURATIONS_DC_MAPPING, DC_TRANSFER_CONFIGURATION_FILTER_CONFIGURATION, GET_COLUMN } from "../../constants-inventorysmart/apiConstants";
import { DC_TRANSFER_CONFIGURATION_TABLE_NAME } from "../../pages-inventorysmart/DC-Transfer-Configuration/constants";
import { fetchDCTransferRules } from "../DC-Transfer-Rule/dc-transfer-rule";

export const dcTransferConfigurationService = createSlice({
  name: "dcTransferConfigurationService",
  initialState: {
    loader: false,
    filterConfiguration: [],
    appliedFilters: null,
    configurationTableName: "",
  },
  reducers: {
    setDCTransferConfigurationLoader: (state, action) => {
      state.loader = action.payload;
    },
    setDCTransferConfigurationFilterConfiguration: (state, action) => {
      state.filterConfiguration = action.payload;
    },
    setDCTransferConfigurationAppliedFilters: (state, action) => {
      state.appliedFilters = action.payload;
    },
    setDCTransferConfigurationTableName: (state, action) => {
      state.configurationTableName = action.payload;
    },
    resetDCTransferConfiguration: (state) => {
      state.loader = false;
      state.filterConfiguration = [];
      state.appliedFilters = null;
      state.configurationTableName = "";
    },
  },
});

export const {
  setDCTransferConfigurationLoader,
  setDCTransferConfigurationFilterConfiguration,
  setDCTransferConfigurationAppliedFilters,
  setDCTransferConfigurationTableName,
  resetDCTransferConfiguration,
} = dcTransferConfigurationService.actions;

export const fetchDCTransferConfigurationFilterConfiguration = () => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONFIGURATION_FILTER_CONFIGURATION,
    method: "GET",
  });
};

export const createDCTransferConfiguration = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONFIGURATIONS_CREATION,
    method: "POST",
    data: postBody,
  });
};

export const fetchDCTransferConfigurationsList = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONFIGURATIONS_LIST,
    method: "POST",
    data: postBody,
  });
};

export const applyDCTransferConfigurationSetAll = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONFIGURATIONS_SET_ALL,
    method: "POST",
    data: postBody,
  });
};

export const saveDCTransferConfiguration = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_CONFIGURATIONS_SAVE,
    method: "POST",
    data: postBody,
  });
};

export const fetchDCTransferDcMapping = (ruleId) => () => {
  return axiosInstance({
    url: `${DC_TRANSFER_CONFIGURATIONS_DC_MAPPING}?rule_id=${ruleId}`,
    method: "GET",
  });
};

export const fetchDCTransferConfigurationColumns = () => () => {
  return axiosInstance({
    url: `${GET_COLUMN}table_name=${DC_TRANSFER_CONFIGURATION_TABLE_NAME}`,
    method: "GET",
  });
};

export const fetchDCTransferConfigurationTableInit = () => async (dispatch) => {
  const [columnsResponse, rulesResponse] = await Promise.all([
    dispatch(fetchDCTransferConfigurationColumns()),
    dispatch(fetchDCTransferRules()),
  ]);

  return { columnsResponse, rulesResponse };
};

export default dcTransferConfigurationService.reducer;
