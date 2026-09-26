import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  NEW_STORE_RESERVE_LIST,
  NEW_STORE_DASHBOARD_LIST,
  DELETE_NEW_STORE,
  EDIT_NEW_STORE,
  EDIT_DEMAND_AND_CONSTRAINTS,
  MAP_DUMMY_STORE_TO_NEW_STORE,
  NEW_STORE_ALLOCATION_PROJECTIONS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const newStoreDashboardService = createSlice({
  name: "newStoreDashboardService",
  initialState: {
    newStoreDashboardLoader: false,
    editNewStoreData: false,
    editDemandConstraints: [],
    newStoreModuleConfig: {},
    disableEditStoreDetails: undefined,
    storeStatusValue: "",
  },
  reducers: {
    setNewStoreDashboardLoader: (state, action) => {
      state.newStoreDashboardLoader = action.payload;
    },
    clearNewStoreDashboard: (state) => {
      state.newStoreDashboardLoader = false;
    },
    setEditNewStoreData: (state, action) => {
      state.editNewStoreData = action.payload;
    },
    setEditDemandConstraints: (state, action) => {
      state.editDemandConstraints = action.payload;
    },
    setNewStoreModuleConfig: (state, action) => {
      state.newStoreModuleConfig = action.payload;
    },
    setStoreStatusValue: (state, action) => {
      state.storeStatusValue = action.payload;
    },
    clearEditNewStoreData: (state, _action) => {
      state.editNewStoreData = false;
      state.newStoreDashboardLoader = false;
      state.editDemandConstraints = [];
      state.disableEditStoreDetails = undefined;
      state.storeStatusValue = "";
    },
    clearNewStoreModuleConfig: (state, _action) => {
      state.newStoreModuleConfig = {};
    },
    // for levis - User cannot edit step 1 admin can edit
    setDisableEditStoreDetails: (state, action) => {
      state.disableEditStoreDetails = action.payload;
    },
  },
});

export const {
  setNewStoreDashboardLoader,
  clearNewStoreDashboard,
  setEditNewStoreData,
  setEditDemandConstraints,
  clearEditNewStoreData,
  setNewStoreModuleConfig,
  clearNewStoreModuleConfig,
  setDisableEditStoreDetails,
  setStoreStatusValue,
} = newStoreDashboardService.actions;

export const fetchNewStoreReserveList = (id) => () => {
  return axiosInstance({
    url: NEW_STORE_RESERVE_LIST + id,
    method: "GET",
  });
};

export const fetchNewStoreDashboardList = () => () => {
  return axiosInstance({
    url: NEW_STORE_DASHBOARD_LIST,
    method: "GET",
    data: {},
  });
};

export const deleteNewStore = (id) => () => {
  return axiosInstance({
    url: DELETE_NEW_STORE + "/" + id,
    method: "DELETE",
  });
};

export const editNewStore = (id) => () => {
  return axiosInstance({
    url: `${EDIT_NEW_STORE}/${id}`,
    method: "GET",
    data: {},
  });
};

export const editDemandAndConstraints = (body) => () => {
  return axiosInstance({
    url: `${EDIT_DEMAND_AND_CONSTRAINTS}/${body.id}/attribute/${body.attr}`,
    method: "POST",
    data: body.data,
  });
};

export const mapDummyStore = (req) => () => {
  return axiosInstance({
    url: `${MAP_DUMMY_STORE_TO_NEW_STORE}/${req.new_store}/store/${req.existing_store}`,
    method: "GET",
  });
};

export const fetchNewStoreAllocationProjections = (id) => () => {
  return axiosInstance({
    url: NEW_STORE_ALLOCATION_PROJECTIONS + id,
    method: "GET",
  });
};

export const downloadNewStoreAllocationProjections = (id) => () => {
  return axiosInstance({
    url: `${NEW_STORE_ALLOCATION_PROJECTIONS}${id}/download`,
    method: "GET",
  });
};

export default newStoreDashboardService.reducer;
