import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  KPI_FIELDS_LIST,
  GET_MODULE_MAPPINGS,
  SAVE_KPI,
  VALIDATE_KPI_NAME,
  EDIT_KPI,
  GET_KPI_DETAILS,
  SAMPLE_CALCULATION,
  CREATE_FIELD,
  UPDATE_DERIVED_FIELD
} from "../../constants-inventorysmart/apiConstants";

export const inventorySmartCreateKpiService = createSlice({
  name: "createKpiService",
  initialState: {
    fieldsLoader: false,
    moduleMappingLoader: false,
  },
  reducers: {
    setLoader: (state, action) => {
      state[action.payload.name] = action.payload.value;
    },
    resetCreateKpiStore: (state, _action) => {
      state.fieldsLoader = false;
      state.moduleMappingLoader = false;
    },
  },
});

export const { 
    setLoader,
    resetCreateKpiStore,
} = inventorySmartCreateKpiService.actions;

// API endpoints for KPI Configurator
export const getFieldsList = () => () => {
  return axiosInstance({
    url: KPI_FIELDS_LIST,
    method: "GET",
  });
};

export const getModuleMappings = () => () => {
  return axiosInstance({
    url: GET_MODULE_MAPPINGS,
    method: "GET",
  });
};

export const saveKPI = (data) => () => {
  const url = data?.kpi_id ? EDIT_KPI : SAVE_KPI;
  return axiosInstance({
    url,
    method: data?.kpi_id ? "PUT" : "POST",
    data,
  });
};

export const validateKPIName = (data) => () => {
  return axiosInstance({
    url: VALIDATE_KPI_NAME,
    method: "POST",
    data,
  });
};

export const getKPIDetails = (data) => () => {
  return axiosInstance({
    url: GET_KPI_DETAILS,
    method: "POST",
    data
  });
};

export const editKPI = (data) => () => {
  return axiosInstance({
    url: EDIT_KPI,
    method: "PUT",
    data
  });
};

export const getSampleCalculation = (data) => () => {
  return axiosInstance({
    url: SAMPLE_CALCULATION,
    method: "POST",
    data
  });
};

export const createField = (data) => () => {
    return axiosInstance({
    url: CREATE_FIELD,
    method: "POST",
    data
  });
}

export const updateDerivedField = (data) => () => {
  return axiosInstance({
    url: UPDATE_DERIVED_FIELD,
    method: "PUT",
    data
  });
}

export default inventorySmartCreateKpiService.reducer;