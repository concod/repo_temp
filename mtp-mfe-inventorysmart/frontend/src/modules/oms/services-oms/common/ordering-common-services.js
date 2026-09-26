import { createSlice } from "@reduxjs/toolkit";
import { GET_OMS_COMMON_CONFIG } from "config/api";
import axiosInstance from "../../../../core/Utils/axios/index";

export const orderingCommonService = createSlice({
  name: "orderingCommonService",
  initialState: {
    orderingScreensConfig: {}, //This is the config for the screens (hide/show buttons)
    orderingModuleConfig: {}, //This is the config for hiding /showing a whole module
    orderingAccessControl: {},
    orderingUserAccess: {},
    orderingVendorToStoreConfig: {},
    orderingPackOrderConfig: {},
    orderRepositoryScreenConfig: {},
    orderRepositoryVendorDCConfig: [],
    orderRepositoryVendorToStoreConfig: [],
    // TAM inv_oms_budget_config — null means "not loaded / missing" (feature defaults ON).
    omsBudgetConfig: null,
    genericTenantConfig: {},
    orderingRoleConfigSuccess: false,
  },
  reducers: {
    setOrderingScreensConfig: (state, action) => {
      state.orderingScreensConfig = action.payload;
    },
    setOmsBudgetConfig: (state, action) => {
      state.omsBudgetConfig = action.payload ?? null;
    },
    setOrderingModuleConfig: (state, action) => {
      state.orderingModuleConfig = action.payload;
    },
    setOrderingAccessControl: (state, action) => {
      state.orderingAccessControl = action.payload;
    },
    setOrderingUserAccess: (state, action) => {
      state.orderingUserAccess = action.payload;
    },
    setOrderingVendorToStoreConfig: (state, action) => {
      state.orderingVendorToStoreConfig = action.payload;
    },
    setOrderingPackOrderConfig: (state, action) => {
      state.orderingPackOrderConfig = action.payload;
    },
    setOrderRepositoryScreenConfig: (state, action) => {
      state.orderRepositoryScreenConfig = action.payload;
    },
    setOrderRepositoryVendorDCConfig: (state, action) => {
      state.orderRepositoryVendorDCConfig = action.payload;
    },
    setOrderRepositoryVendorToStoreConfig: (state, action) => {
      state.orderRepositoryVendorToStoreConfig = action.payload;
    },
    setGenericTenantConfig: (state, action) => {
      state.genericTenantConfig = action.payload;
    },
    setOrderingRoleConfigSuccess: (state, action) => {
      state.orderingRoleConfigSuccess = action.payload;
    },
    resetOrderingCommonStates: (state, _action) => {
      state.orderingScreensConfig = {};
      state.orderingModuleConfig = {};
      state.orderingAccessControl = {};
      state.orderingUserAccess = {};
      state.orderingVendorToStoreConfig = {};
      state.orderingPackOrderConfig = {};
      state.orderRepositoryScreenConfig = {};
      state.orderRepositoryVendorDCConfig = [];
      state.orderRepositoryVendorToStoreConfig = [];
      state.omsBudgetConfig = null;
      state.genericTenantConfig = {};
      state.orderingRoleConfigSuccess = false;
    },
  },
});

export const {
  setOrderingScreensConfig,
  setOmsBudgetConfig,
  setOrderingModuleConfig,
  setOrderingAccessControl,
  setOrderingUserAccess,
  setOrderingVendorToStoreConfig,
  setOrderingPackOrderConfig,
  setOrderRepositoryScreenConfig,
  setOrderRepositoryVendorDCConfig,
  setOrderRepositoryVendorToStoreConfig,
  setGenericTenantConfig,
  setOrderingRoleConfigSuccess,
  resetOrderingCommonStates,
} = orderingCommonService.actions;

export const getOrderingRoleConfig = () => () => {
  return axiosInstance({
    url: GET_OMS_COMMON_CONFIG,
    method: "GET",
  });
};

export default orderingCommonService.reducer;
