import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  DEMAND_CONSTRAINTS_ADD_NEW_STORE,
  DEMAND_CONSTRAINTS_DATA,
  DEMAND_CONSTRAINTS_ALL_FILTERS_DATA,
  DEMAND_CONSTRAINTS_UPDATE_NEW_STORE,
  FETCH_UPDATED_DEMAND_AND_CONSTRAINTS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const newStoreDemandConstraintsService = createSlice({
  name: "newStoreDemandConstraintsService",
  initialState: {
    demandConstraintsScreenLoader: false,
    demandConstraintsFilterConfig: [],
    demandConstraintsPopupFilterConfig: [],
    demandConstraintsTableData: [],
    subDemandConstraintsTableData: [],
  },
  reducers: {
    setDemandConstraintsScreenLoader: (state, action) => {
      state.demandConstraintsScreenLoader = action.payload;
    },
    setDemandConstraintsFilterConfiguration: (state, action) => {
      state.demandConstraintsFilterConfig = action.payload;
    },
    setDemandConstraintsPopupFilterConfiguration: (state, action) => {
      state.demandConstraintsPopupFilterConfig = action.payload;
    },
    setDemandAndConstraintsTableData: (state, action) => {
      state.demandConstraintsTableData = action.payload;
    },
    setSubDemandAndConstraintsTableData: (state, action) => {
      state.subDemandConstraintsTableData = action.payload?.map((item) => {
        return {
          ...item,
          is_demand_calculated: false,
        };
      });
    },
    clearDemandConstraintsStates: (state) => {
      state.demandConstraintsScreenLoader = false;
      state.demandConstraintsFilterConfig = [];
      state.demandConstraintsTableData = [];
      state.demandConstraintsPopupFilterConfig = [];
      state.subDemandConstraintsTableData = [];
    },
  },
});

export const {
  setDemandConstraintsScreenLoader,
  setDemandConstraintsFilterConfiguration,
  clearDemandConstraintsStates,
  setDemandAndConstraintsTableData,
  setDemandConstraintsPopupFilterConfiguration,
  setSubDemandAndConstraintsTableData,
} = newStoreDemandConstraintsService.actions;

export const fetchDemandAndConstraintsTableData = (postbody) => () => {
  return axiosInstance({
    url: DEMAND_CONSTRAINTS_DATA,
    method: "POST",
    data: postbody,
  });
};

export const fetchDemandAndConstraintsAllFiltersTableData =
  (postbody) => () => {
    return axiosInstance({
      url: DEMAND_CONSTRAINTS_ALL_FILTERS_DATA,
      method: "POST",
      data: postbody,
    });
  };

export const saveNewStoreDetails = (postbody) => () => {
  return axiosInstance({
    url: DEMAND_CONSTRAINTS_ADD_NEW_STORE,
    method: "POST",
    data: postbody,
  });
};

export const updateNewStoreDetails = (postbody) => () => {
  return axiosInstance({
    url: DEMAND_CONSTRAINTS_UPDATE_NEW_STORE,
    method: "POST",
    data: postbody,
  });
};

export const fetchUpdatedDemandAndConstraints = (postbody) => () => {
  return axiosInstance({
    url: FETCH_UPDATED_DEMAND_AND_CONSTRAINTS,
    method: "POST",
    data: postbody,
  });
};

export default newStoreDemandConstraintsService.reducer;
