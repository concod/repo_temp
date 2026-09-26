import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  REMODEL_STORE_DETAILS_LIST,
  REMODEL_STORE_DASHBOARD_LIST,
  REMODEL_STORE_RESERVED_INVENTORY_LIST,
  DELETE_REMODEL_STORE,
  EDIT_REMODEL_STORE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const remodelStoreDashboardService = createSlice({
  name: "remodelStoreDashboardService",
  initialState: {
    remodelStoreDashboardLoader: false,
    editRemodelStoreData: false,
    remodelStoreModuleConfig: {},
    remodelStoreDetailsForEditFlow: {},
  },
  reducers: {
    setRemodelStoreDashboardLoader: (state, action) => {
      state.remodelStoreDashboardLoader = action.payload;
    },
    clearRemodelStoreDashboard: (state) => {
      state.remodelStoreDashboardLoader = false;
      state.remodelStoreDetailsForEditFlow = {};
      state.editRemodelStoreData = false;
    },
    setEditRemodelStoreData: (state, action) => {
      state.editRemodelStoreData = action.payload;
    },
    setRemodelStoreModuleConfig: (state, action) => {
      state.remodelStoreModuleConfig = action.payload;
    },
    saveEditFlowData: (state, action) => {
      state.remodelStoreDetailsForEditFlow = action.payload;
    },
  },
});

export const {
  setRemodelStoreDashboardLoader,
  clearRemodelStoreDashboard,
  setEditRemodelStoreData,
  setRemodelStoreModuleConfig,
  saveEditFlowData,
} = remodelStoreDashboardService.actions;

export const fetchRemodelStoreReserveList = (id) => () => {
  return axiosInstance({
    url: REMODEL_STORE_DETAILS_LIST + "/" + id,
    method: "GET",
  });
};

export const fetchRemodelStoreDashboardList = () => () => {
  return axiosInstance({
    url: REMODEL_STORE_DASHBOARD_LIST,
    method: "GET",
  });
};

export const fetchReservedInventoryList = (store_code, hierarchy_level) => () => {
  return axiosInstance({
    url: REMODEL_STORE_RESERVED_INVENTORY_LIST + "/" + store_code + "/" + hierarchy_level,
    method: "GET",
  });
};
export const downloadReservedInventoryList = (store_code, hierarchy_level, postBody) => () => {
  return axiosInstance({
    url: REMODEL_STORE_RESERVED_INVENTORY_LIST + "/" + store_code + "/" + hierarchy_level + "/download",
    method: "POST",
    data: postBody
  });
};

export const deleteRemodelStore = (id) => () => {
  return axiosInstance({
    url: DELETE_REMODEL_STORE + "/" + id,
    method: "DELETE",
  });
};

export const editRemodelStore = (id) => () => {
  return axiosInstance({
    url: `${EDIT_REMODEL_STORE}/${id}`,
    method: "GET",
  });
};

export default remodelStoreDashboardService.reducer;
