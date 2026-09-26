import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  NEW_STORE_STORE_LIST,
  ATTRIBUTE_STORE_LIST,
  NEW_STORE_STORE_LIST_EDIT,
  GET_SISTER_STORE_EXCLUSION_LIST,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const newStoreDetailsService = createSlice({
  name: "newStoreDetailsService",
  initialState: {
    newStoreDetailsScreenLoader: false,
    newStoreListItems: {},
    finalStoreDetailsStateValues: {},
    newStoreFilterConfiguration: [],
    saveNewStoreDetailsForBackFlow: {},
  },
  reducers: {
    setNewStoreDetailsScreenLoader: (state, action) => {
      state.newStoreDetailsScreenLoader = action.payload;
    },
    setNewStoreFilterConfiguration: (state, action) => {
      state.newStoreFilterConfiguration = action.payload;
    },
    setNewStoreListItems: (state, action) => {
      state.newStoreListItems = action.payload;
    },
    clearNewStoreDetails: (state) => {
      state.newStoreDetailsScreenLoader = false;
      state.newStoreListItems = {};
      state.finalStoreDetailsStateValues = {};
      state.newStoreFilterConfiguration = [];
      state.saveNewStoreDetailsForBackFlow = {};
    },
    saveStepOneFinalValues: (state, action) => {
      state.finalStoreDetailsStateValues = action.payload;
    },
    setNewStoreDetailsForBackFlow: (state, action) => {
      state.saveNewStoreDetailsForBackFlow = action.payload;
    },
  },
});

export const {
  setNewStoreDetailsScreenLoader,
  setNewStoreListItems,
  clearNewStoreDetails,
  saveStepOneFinalValues,
  setNewStoreFilterConfiguration,
  setNewStoreDetailsForBackFlow,
} = newStoreDetailsService.actions;

export const getNewStoreListDetails = () => () => {
  return axiosInstance({
    url: NEW_STORE_STORE_LIST,
    method: "GET",
    data: "",
  });
};

export const getSisterStoreExclusionList = () => () => {
  return axiosInstance({
    url: GET_SISTER_STORE_EXCLUSION_LIST,
    method: "GET",
    data: "",
  });
};

export const getStoreListDetails = (id) => () => {
  return axiosInstance({
    url: NEW_STORE_STORE_LIST_EDIT + "/" + id,
    method: "GET",
    data: "",
  });
};

export const fetchStoreAttributeList = (postbody) => () => {
  return axiosInstance({
    url: ATTRIBUTE_STORE_LIST,
    method: "POST",
    data: postbody,
  });
};

export default newStoreDetailsService.reducer;