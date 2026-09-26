import { createSlice } from "@reduxjs/toolkit";
import {
  GET_MODULE_LEVEL_ACCESS,
  GET_TENANT_CONFIG,
  GET_OMS_COMMON_CONFIG,
} from "config/api";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartCommonService = createSlice({
  name: "inventorySmartCreateAllocationService",
  initialState: {
    inventorySmartPermissionLoader: false,
    inventorysmartScreenConfigLoader: false,
    inventorysmartScreenConfig: null,
    inventorysmartScreenConfigForInfiniteScrolling: [],
    inventorysmartModulesPermission: {},
    inventorysmartOmsRepoConfig: [],
    inventorysmartOmsCommonConfig: {},
    inventorysmartReportsGBQConfig: {}
  },
  reducers: {
    setInventorySmartPermissionLoader: (state, action) => {
      state.inventorySmartPermissionLoader = action.payload;
    },
    setInventorysmartScreenConfigLoader: (state, action) => {
      state.inventorysmartScreenConfigLoader = action.payload;
    },
    setInventorysmartScreenConfig: (state, action) => {
      state.inventorysmartScreenConfig = action.payload;
      state.inventorysmartScreenConfigForInfiniteScrolling =
        action.payload.infiniteScrolling;
    },
    setInventorySmartModulesPermissions: (state, action) => {
      state.inventorysmartModulesPermission = {
        ...state.inventorysmartModulesPermission,
        ...action.payload,
      };
    },
    setInventorySmartOmsRepoConfig: (state, action) => {
      state.inventorysmartOmsRepoConfig = action.payload;
    },
    setInventorySmartOmsCommonConfig: (state, action) => {
      state.inventorysmartOmsCommonConfig = action.payload;
    },
    setInventorySmartReportsGBQConfig:(state, action)=>{
      state.inventorysmartReportsGBQConfig = action.payload;
    },
    resetCommonStoreState: (state, _action) => {
      state.inventorySmartPermissionLoader = false;
      state.inventorysmartScreenConfigLoader = false;
      state.inventorysmartScreenConfig = null;
      state.inventorysmartScreenConfigForInfiniteScrolling = [];
      state.inventorysmartModulesPermission = {};
      state.inventorysmartOmsRepoConfig = [];
      state.inventorysmartOmsCommonConfig = {};
      state.inventorysmartReportsGBQConfig= {};
    },
  },
});

export const {
  setInventorySmartPermissionLoader,
  setInventorysmartScreenConfigLoader,
  setInventorysmartScreenConfig,
  setInventorySmartModulesPermissions,
  setInventorySmartOmsRepoConfig,
  setInventorySmartOmsCommonConfig,
  setInventorySmartReportsGBQConfig,
  resetCommonStoreState,
} = inventorySmartCommonService.actions;

export const getInventorySmartAttributes = (
  applicationCode,
  attributeName
) => () => {
  const queryParam = {
    attribute_name: attributeName,
  };
  return axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}`,
    params: queryParam,
    method: "GET",
  });
};

export const getModuleLevelAccess = ({ app, module }) => () => {
  const queryParam = {
    app,
    module,
  };
  return axiosInstance({
    url: `${GET_MODULE_LEVEL_ACCESS}`,
    params: queryParam,
    method: "GET",
  });
};

export const downloadItemRequest = (
  url,
  postbody,
  includeExclusionFilter,
  excludeURLObject
) => () => {
  return axiosInstance({
    url,
    method: "POST",
    data: postbody,
    includeExclusionFilter,
    excludeURLObject,
  });
};

export const getOmsModuleCommonConfig = () => () => {
  return axiosInstance({
    url: GET_OMS_COMMON_CONFIG,
    method: "GET",
  });
};

export default inventorySmartCommonService.reducer;
