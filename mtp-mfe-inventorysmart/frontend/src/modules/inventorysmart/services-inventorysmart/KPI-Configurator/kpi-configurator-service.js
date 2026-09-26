import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  KPI_CONFIG_LIST,
  KPI_CONFIG_DETAILS,
  KPI_CONFIG_EDIT,
  KPI_CONFIG_DUPLICATE,
  KPI_CONFIG_DELETE,
  DELETE_DERIVED_FIELD,
  GET_DERIVED_FIELDS,
} from "../../constants-inventorysmart/apiConstants";

export const kpiConfiguratorService = createSlice({
  name: "kpiConfiguratorService",
  initialState: {
    kpiConfigLoader: false,
  },
  reducers: {
    setKpiConfigLoader: (state, action) => {
      state.kpiConfigLoader = action.payload;
    },
  },
});

export const { setKpiConfigLoader } = kpiConfiguratorService.actions;

// API endpoints for KPI Configurator
export const getKpiConfigList = () => () => {
  return axiosInstance({
    url: KPI_CONFIG_LIST,
    method: "GET",
  });
};

export const getKpiConfigDetails = (kpiId) => () => {
  return axiosInstance({
    url: `${KPI_CONFIG_DETAILS}/${kpiId}`,
    method: "GET",
  });
};

export const updateKpiConfig = (kpiId, data) => () => {
  return axiosInstance({
    url: `${KPI_CONFIG_EDIT}/${kpiId}`,
    method: "PUT",
    data,
  });
};

export const duplicateKpiConfig = (kpiId) => () => {
  return axiosInstance({
    url: KPI_CONFIG_DUPLICATE,
    method: "POST",
    data: { kpi_id: kpiId },
  });
};

export const deleteKpiConfig = (kpiIds) => () => {
  // Support both single ID (string/number) and multiple IDs (array)
  const ids = Array.isArray(kpiIds) ? kpiIds : [kpiIds];
  return axiosInstance({
    url: KPI_CONFIG_DELETE,
    method: "POST",
    data: { kpi_ids: ids },
  });
};

export const getCalculatedFields = () => () => {
  return axiosInstance({
    url: GET_DERIVED_FIELDS,
    method: "GET",
  });
}

export const deleteDerivedField = (derivedFieldIds) => () => {
  const ids = Array.isArray(derivedFieldIds) ? derivedFieldIds : [derivedFieldIds];
  return axiosInstance({
    url: DELETE_DERIVED_FIELD,
    method: "POST",
    data: { derived_field_ids: ids },
  });
}


export default kpiConfiguratorService.reducer;


