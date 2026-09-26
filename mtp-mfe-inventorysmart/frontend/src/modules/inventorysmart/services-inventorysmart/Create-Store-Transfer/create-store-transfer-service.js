import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  STORE_TRANSFER_LIST,
  STORE_TRANSFER_CREATION,
  STORE_TRANSFER_SET_ALL,
  STORE_TRANSFER_DRAFT,
  CREATE_STORE_TRANSFER_API,
} from "../../constants-inventorysmart/apiConstants";

const initialState = {
  createStoreTransferLoader: false,
  createStoreTransferTableName: "",
  createStoreTransferData: [],
  createStoreTransferFilterConfiguration: [],
  createStoreTransferFiltersState: {},
  transferName: "",
  editedRows: new Map(),
  createStoreTransferModuleConfig: null,
  allocationId: null,
  allocationName: null,
  mandatoryFilter: null,
  createStoreTransferArticles: [],
  // Filter dependency for redirection flow
  createStoreTransferFilterDependency: [],
  createStoreTransferRecommFilterDependency: [],
  createStoreTransferFilterDetails: {},
  selectedFiltersCreateStoreTransfer: {},
  microStep1SelectedFilters: [],
};

const createStoreTransferSlice = createSlice({
  name: "createStoreTransferService",
  initialState,
  reducers: {
    setCreateStoreTransferLoader: (state, action) => {
      state.createStoreTransferLoader = action.payload;
    },
    setCreateStoreTransferTableName: (state, action) => {
      state.createStoreTransferTableName = action.payload;
    },
    setCreateStoreTransferData: (state, action) => {
      state.createStoreTransferData = action.payload;
    },
    setTransferName: (state, action) => {
      state.transferName = action.payload;
    },
    setEditedRows: (state, action) => {
      state.editedRows = action.payload;
    },
    setCreateStoreTransferFilterConfiguration: (state, action) => {
      state.createStoreTransferFilterConfiguration = action.payload;
    },
    setCreateStoreTransferModuleConfig: (state, action) => {
      state.createStoreTransferModuleConfig = action.payload;
    },
    setAllocationId: (state, action) => {
      state.allocationId = action.payload;
    },
    setAllocationName: (state, action) => {
      state.allocationName = action.payload;
    },
    setMandatoryFilter: (state, action) => {
      state.mandatoryFilter = action.payload;
    },
    setCreateStoreTransferArticles: (state, action) => {
      state.createStoreTransferArticles = action.payload;
    },
    setCreateStoreTransferFilterDependency: (state, action) => {
      state.createStoreTransferFilterDependency = action.payload;
    },
    setCreateStoreTransferFilterDetails: (state, action) => {
      state.createStoreTransferFilterDetails = action.payload;
    },
    setSelectedFiltersCreateStoreTransfer: (state, action) => {
      state.selectedFiltersCreateStoreTransfer = action.payload;
    },
    setCreateStoreTransferRecommFilterDependency: (state, action) => {
      state.createStoreTransferRecommFilterDependency = action.payload;
    },
    setMicroStep1SelectedFilters: (state, action) => {
      state.microStep1SelectedFilters = action.payload;
    },
    resetCreateStoreTransferState: (state) => {
      return initialState;
    },
  },
});

export const {
  setCreateStoreTransferLoader,
  setCreateStoreTransferTableName,
  setCreateStoreTransferData,
  setCreateStoreTransferVisible,
  setTransferName,
  setEditedRows,
  setCreateStoreTransferFilterConfiguration,
  setCreateStoreTransferModuleConfig,
  setAllocationId,
  setAllocationName,
  setMandatoryFilter,
  setCreateStoreTransferArticles,
  setCreateStoreTransferFilterDependency,
  setCreateStoreTransferFilterDetails,
  setSelectedFiltersCreateStoreTransfer,
  resetCreateStoreTransferState,
  setCreateStoreTransferRecommFilterDependency,
  setMicroStep1SelectedFilters,
} = createStoreTransferSlice.actions;

export default createStoreTransferSlice.reducer;

// API Actions
// API endpoints for Create Store Transfer
export const getCreateStoreTransferList = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_LIST,
    method: "POST",
    data: postbody,
  });
};

export const getCreateStoreTransferData = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_CREATION,
    method: "POST",
    data: postbody,
  });
};

export const setCreateStoreTransferSetAll = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_SET_ALL,
    method: "POST",
    data: postbody,
  });
};

export const saveStoreTransferDraft = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_DRAFT,
    method: "POST",
    data: postbody,
  });
};

export const createStoreTransferApi = (postbody, isV3) => () => {
  return axiosInstance({
    url: CREATE_STORE_TRANSFER_API,
    method: "POST",
    data: postbody,
    isV3,
  });
};
