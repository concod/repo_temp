import { createSlice } from "@reduxjs/toolkit";
import {
  GET_MODULE_LEVEL_ACCESS,
  GET_TENANT_CONFIG,
  MODULES_CONFIG,
} from "config/api";
import { STORE_GRADE_LIST_INVENTORY } from "../../constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";
import { tenantConfigApiCache } from "../../../../core/actions/tenantConfigActions";

export const inventorySmartCommonService = createSlice({
  name: "inventorySmartCreateAllocationService",
  initialState: {
    inventorySmartPermissionLoader: false,
    inventorysmartScreenConfigLoader: false,
    inventorysmartScreenConfig: null,
    inventorysmartCreateAllocationConfig: null,
    inventorysmartFinalizeAllocationConfig: null,
    inventorysmartScreenConfigForInfiniteScrolling: [],
    inventorysmartModulesPermission: {},
    fiscalCalendarData: null,
    no_of_buttons_next_to_tab: undefined,
    productStoreMappingConfig: null,
    orderBatchingConfig: null,
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
        action?.payload?.infiniteScrolling;
    },
    setInventorysmartCreateAllocationConfig: (state, action) => {
      state.inventorysmartCreateAllocationConfig = action.payload;
    },
    setProductStoreMappingConfig: (state, action) => {
      state.productStoreMappingConfig = action.payload;
    },
    setInventorysmartFinalizeAllocationConfig: (state, action) => {
      state.inventorysmartFinalizeAllocationConfig = action.payload;
    },
    setInventorySmartModulesPermissions: (state, action) => {
      state.inventorysmartModulesPermission = {
        ...state.inventorysmartModulesPermission,
        ...action.payload,
      };
    },
    setFiscalCalendarData: (state, action) => {
      state.fiscalCalendarData = action.payload;
    },
    setNoOfButtonsNextToTab: (state, action) => {
      state.no_of_buttons_next_to_tab = action.payload;
    },
    setOrderBatchingConfig: (state, action) => {
      state.orderBatchingConfig = action.payload;
    },
    resetCommonStoreState: (state, _action) => {
      state.inventorySmartPermissionLoader = false;
      state.inventorysmartScreenConfigLoader = false;
      state.inventorysmartScreenConfig = null;
      state.inventorysmartCreateAllocationConfig = null;
      state.productStoreMappingConfig = null;
      state.inventorysmartFinalizeAllocationConfig = null;
      state.inventorysmartScreenConfigForInfiniteScrolling = [];
      state.inventorysmartModulesPermission = {};
      state.no_of_buttons_next_to_tab = undefined;
      state.orderBatchingConfig = null;
    },
  },
});

export const {
  setInventorySmartPermissionLoader,
  setInventorysmartScreenConfigLoader,
  setInventorysmartScreenConfig,
  setInventorysmartCreateAllocationConfig,
  setProductStoreMappingConfig,
  setInventorysmartFinalizeAllocationConfig,
  setInventorySmartModulesPermissions,
  resetCommonStoreState,
  setFiscalCalendarData,
  setNoOfButtonsNextToTab,
  setOrderBatchingConfig,
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

export const fetchGradeListInventory = async () => {
  return axiosInstance({
    url: `${STORE_GRADE_LIST_INVENTORY}`,
    method: "GET",
  });
};

export const getModuleBasedTenantConfig = (postBody) => async () => {
  const { module_name } = postBody;
  const response = await tenantConfigApiCache(1, {
    attribute_name: module_name,
  })();
  const configs = response?.data?.data[0]?.attribute_value || {};
  return configs;
};

export default inventorySmartCommonService.reducer;
