import { createSlice, createSelector } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

import {
  NEW_STORE_STORE_LIST,
  SAVE_NEW_STORE_DETAILS,
} from "../../constants-assortsmart/apiConstants";

export const newStoreDetailsService = createSlice({
  name: "newStoreDetailsService",
  initialState: {
    newStoreDetailsScreenLoader: false,
    newStoreListItems: {},
  },
  reducers: {
    setNewStoreDetailsScreenLoader: (state, action) => {
      state.newStoreDetailsScreenLoader = action.payload;
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

export const saveNewStoreListDetails = (body) => () => {
  return axiosInstance({
    url: SAVE_NEW_STORE_DETAILS,
    method: "POST",
    data: body,
  });
};

export const newStoreReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.newStoreDetailsReducer
);

export const newStoreLoaderSelector = createSelector(
  newStoreReducerSelector,
  (state) => state.newStoreDetailsScreenLoader
);

export const newStoreListItemsSelector = createSelector(
  newStoreReducerSelector,
  (state) => state.newStoreListItems
);

export default newStoreDetailsService.reducer;
