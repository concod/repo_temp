import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { SAVE_TABLE_VIEW } from "config/api";

export const tableViewConfigurationData = createSlice({
  name: "tableViewConfigurationData",
  initialState: {
    tableViewConfigData: [],
    selectedViewName: 0,
    selectedViewSettingsPayload: [],
    selectedMetricsPayload: [],
  },
  reducers: {
    setSelectedMetricsPayload: (state, action) => {
      state.selectedMetricsPayload = action.payload;
    },
    setSelectedTableViewName: (state, action) => {
      state.selectedViewName = action.payload;
    },
    setSelectedViewSettingsPayload: (state, action) => {
      state.selectedViewSettingsPayload = action.payload;
    },
    setTableViewConfigData: (state, action) => {
      state.tableViewConfigData = action.payload;
    },
  },
});

export const {
  setSelectedMetricsPayload,
  setSelectedTableViewName,
  setSelectedViewSettingsPayload,
  setTableViewConfigData,
} = tableViewConfigurationData.actions;

export const selectedMetricsPayloadSelector = createSelector(
  (state) => state,
  (state) => state.tableViewConfigurationReducer?.selectedMetricsPayload
);

export const selectedTableViewNameSelector = createSelector(
  (state) => state,
  (state) => state.tableViewConfigurationReducer?.selectedViewName
);

export const selectedViewSettingsPayloadSelector = createSelector(
  (state) => state,
  (state) => state.tableViewConfigurationReducer?.selectedViewSettingsPayload
);

export const tableViewConfigurationSelector = createSelector(
  (state) => state,
  (state) => state.tableViewConfigurationReducer?.tableViewConfigData
);

export const deleteTableView = async (viewId) => {
  let { data } = await axiosInstance({
    url: `core/table/view/${viewId}`,
    method: "DELETE",
  });
  return data.data;
};

export const getTableViewConfigData = async (tableName) => {
  let { data } = await axiosInstance({
    url: `core/table/view/fetch?table_name=${tableName}`,
    method: "GET",
  });
  return data.data;
};

export const getDefaultTableViewConfigData = async (tableName) => {
  let { data } = await axiosInstance({
    url: `core/table/view/default?table_name=${tableName}`,
    method: "GET",
  });
  return data.data;
};

export const saveTableView = (postBody) => async () => {
  return axiosInstance({
    url: `${SAVE_TABLE_VIEW}`,
    method: "POST",
    data: postBody,
  });
};

export const setDefaultTableView = async (postBody) => {
  await axiosInstance({
    url: `core/table/view/default`,
    method: "POST",
    data: postBody,
  });
};

export default tableViewConfigurationData.reducer;
