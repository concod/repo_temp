import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { DOWNLOAD_USER_MAINTAINED_DATES, FETCH_TABLE_CONFIG, PRIORITY_CODE_LIST, PRIORITY_CODE_UPDATE } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const priorityCodeConfigurations = createSlice({
  name: "inventorySmartapplicationLifecycle",
  initialState: {
    priorityCodeConfigLoader: false,
    priorityCodeConfigTableData: [],
    priorityCodeFilterConfiguration: [],
  },
  reducers: {
    setPriorityCodeConfigLoader: (state, action) => {
      state.priorityCodeConfigLoader = action.payload;
    },
    setPriorityCodeConfigTableData: (state, action) => {
      state.priorityCodeConfigTableData = action.payload;
    },
    setPriorityCodesFilterConfiguration: (
      state,
      action
    ) => {
      state.priorityCodeFilterConfiguration =
        action.payload;
    },
  },
});

export const {
  setPriorityCodeConfigLoader,
  setPriorityCodeConfigTableData,
  setPriorityCodesFilterConfiguration,
} = priorityCodeConfigurations.actions;

export const getPriorityCodeList = (postBody) => () => {
  return axiosInstance({
    url: PRIORITY_CODE_LIST,
    method: "POST",
    data: postBody
  });
};


export const updatePriorityCode = (postbody) => () => {
  return axiosInstance({
    url: `${PRIORITY_CODE_UPDATE}`,
    method: "POST",
    data: postbody,
  });
};

export const DownloadRequest = (postBody) => () => {
  return axiosInstance({
    url: DOWNLOAD_USER_MAINTAINED_DATES,
    method: "POST",
    data: postBody,
  });
};

export const getPriorityCodeTableConfig = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export default priorityCodeConfigurations.reducer;
