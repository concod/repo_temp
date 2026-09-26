import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  GET_CORE_CHOICE_DASHBOARD,
  CORE_CHOICE_DASHBOARD_TABLE_CONFIG,
  CREATE_CORE_CHOICE,
  CREATE_CORE_CHOICE_FILTERS,
  DELETE_CORE_CHOICE
} from "modules/assortsmart/constants-assortsmart/apiConstants";

export const coreChoiceConfigurationService = createSlice({
  name: "coreChoiceConfigurationService",
  initialState: {
    coreChoiceLoading: false,
    coreChoiceTableCols: [],
    coreChoiceTableData: []
  },
  reducers: {
    setCoreChoiceLoader: (state, action) => {
      state.coreChoiceLoading = action.payload;
    },
    setCoreChoiceTableColumns: (state, action) => {
      state.coreChoiceTableCols = action.payload;
    },
    setCoreChoiceTableData: (state, action) => {
      state.coreChoiceTableData = action.payload;
    }
  },
});
export const {
  setCoreChoiceLoader,
  setCoreChoiceTableColumns,
  setCoreChoiceTableData
} = coreChoiceConfigurationService.actions;

//API to get core-choice table cols
export const getCoreChoiceTableColumns = () => () => {
  return axiosInstance({
    url: CORE_CHOICE_DASHBOARD_TABLE_CONFIG,
    method: "GET"
  });
}

//API to get core-choice table data
export const getCoreChoiceTableData = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_CORE_CHOICE_DASHBOARD,
    method: "POST",
    data: reqBody
  });
}

//API to create core choice
export const createCoreChoiceConfiguration = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + CREATE_CORE_CHOICE,
    method: "POST",
    data: reqBody
  });
}

//API to delete core choice
export const DeleteCoreChoiceConfiguration = (reqBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + DELETE_CORE_CHOICE,
    method: "POST",
    data: reqBody
  });
}

//API to get create core choice filters
export const createCoreChoiceFilters = () => () => {
  return axiosInstance({
    url: CREATE_CORE_CHOICE_FILTERS,
    method:"GET",
  });
}

export default coreChoiceConfigurationService.reducer;