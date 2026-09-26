import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  CREATE_NEW_ORDER_TABLE_DATA,
  CREATE_NEW_ORDER_STORE_TABLE_DATA,
  CREATE_NEW_ORDER_TABLE_CONFIG,
  CREATE_NEW_ORDER_VENDOR_STORE_TABLE_CONFIG,
  CREATE_NEW_ORDER_EDIT_TABLE_DATA,
  CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA,
  CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA_STORE,
} from "modules/oms/constants-oms/apiConstants";

export const createNewOrderService = createSlice({
  name: "createNewOrderService",
  initialState: {
    createNewOrderFilterLoader: false,
    createNewOrderFilterElements: [],
    createNewOrderFilterDependency: [],
    selectedFilters: [],
    isFiltersValid: false,
    backButtonClicked: false,
    formFilters: {},
    createNewOrderTableConfigLoader: false,
    createNewOrderTableConfig: [],
    createNewOrderTableDataLoader: false,
    createNewOrderTableData: [],
    createNewOrderTableDataEditSuccess: false,
    createNewOrderTableDataEditFailed: false,
    createNewOrderApproveRequestSuccess: false,
    createNewOrderApproveRequestFailed: false,
    selectedSku: [],
  },
  reducers: {
    setCreateNewOrderFilterLoader: (state, action) => {
      state.createNewOrderFilterLoader = action.payload;
    },
    setCreateNewOrderFilterElements: (state, action) => {
      state.createNewOrderFilterElements = action.payload;
    },
    setCreateNewOrderFilterDependency: (state, action) => {
      state.createNewOrderFilterDependency = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setFormData: (state, action) => {
      state.formFilters = action.payload;
    },
    setCreateNewOrderTableConfig: (state, action) => {
      state.createNewOrderTableConfig = action.payload;
    },
    setCreateNewOrderTableConfigLoader: (state, action) => {
      state.createNewOrderTableConfigLoader = action.payload;
    },
    setCreateNewOrderTableDataLoader: (state, action) => {
      state.createNewOrderTableDataLoader = action.payload;
    },
    setCreateNewOrderTableData: (state, action) => {
      state.createNewOrderTableData = action.payload;
    },
    setCreateNewOrderTableDataEditSuccess: (state, action) => {
      state.createNewOrderTableDataEditSuccess = action.payload;
    },
    setCreateNewOrderTableDataEditFailed: (state, action) => {
      state.createNewOrderTableDataEditFailed = action.payload;
    },
    setCreateNewOrderApproveRequestSuccess: (state, action) => {
      state.createNewOrderApproveRequestSuccess = action.payload;
    },
    setCreateNewOrderApproveRequestFailed: (state, action) => {
      state.createNewOrderApproveRequestFailed = action.payload;
    },
    setCreateNewOrderSku: (state, action) => {
      state.selectedSku = action.payload;
    },
    resetCreateNewOrderState: (state) => {
      state.createNewOrderFilterLoader = false;
      state.createNewOrderFilterElements = [];
      state.createNewOrderFilterDependency = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.formFilters = {};
      state.backButtonClicked = false;
      state.createNewOrderTableConfigLoader = false;
      state.createNewOrderTableConfig = [];
      state.createNewOrderTableDataLoader = false;
      state.createNewOrderTableData = [];
      state.createNewOrderTableDataEditSuccess = false;
      state.createNewOrderTableDataEditFailed = false;
      state.createNewOrderApproveRequestSuccess = false;
      state.createNewOrderApproveRequestFailed = false;
      state.selectedSku = [];
    },
  },
});

export const {
  setCreateNewOrderFilterLoader,
  setCreateNewOrderFilterElements,
  setCreateNewOrderFilterDependency,
  setSelectedFilters,
  setBackButtonClicked,
  setIsFiltersValid,
  setFormData,
  setCreateNewOrderTableConfig,
  setCreateNewOrderTableConfigLoader,
  setCreateNewOrderTableDataLoader,
  setCreateNewOrderTableData,
  setCreateNewOrderTableDataEditSuccess,
  setCreateNewOrderTableDataEditFailed,
  setCreateNewOrderApproveRequestSuccess,
  setCreateNewOrderApproveRequestFailed,
  resetCreateNewOrderState,
  setCreateNewOrderSku,
} = createNewOrderService.actions;

export const getOmsCreateNewOrderTableConfiguration = () => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsCreateNewOrderVendorStoreTableConfiguration = () => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_VENDOR_STORE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsCreateNewOrderTableData = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsCreateNewOrderStoreTableData = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_STORE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};
export const editOmsCreateNewOrderTableData = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_EDIT_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const setOmsCreateNewOrderApproveRequestData = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA,
    method: "POST",
    data: postBody,
  });
};

export const setOmsCreateNewOrderApproveRequestDataStore = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NEW_ORDER_SET_APPROVE_REQUEST_DATA_STORE,
    method: "POST",
    data: postBody,
  });
};

export default createNewOrderService.reducer;
