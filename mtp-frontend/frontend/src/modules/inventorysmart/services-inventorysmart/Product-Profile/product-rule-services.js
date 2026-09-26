import { createSlice } from "@reduxjs/toolkit";
import { GET_APPLICATION_MASTER } from "config/api";
import {
  PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG,
  PRODUCT_RULE_DASHBOARD_TABLE_ROW_DATA,
  PRODUCT_RULE_DC_Mapped_TABLE_ROW_DATA,
  PRODUCT_RULE_POP_UP_TABLE_ROW_DATA,
  PRODUCT_RULE_Store_Group_TABLE_ROW_DATA,
  SAVE_PRODUCT_RULE_POP_UP_TABLE_ROW_DATA,
  SAVE_PRODUCT_RULE_SET_ALL_TABLE_ROW_DATA,
  UPDATE_AUTO_ALLOCATION,
  UPDATE_AUTO_ALLOCATION_SETALL,
  MATERIAL_RULE_DOWNLOAD_CHECK,
  PRODUCT_RULES_GRID_UPDATE,
  AUTO_ALLOC_SCH_RULE_DOWNLOAD_CHECK,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import axiosInstance from "../../../../core/Utils/axios/index";

export const productRuleService = createSlice({
  name: "productRuleService",
  initialState: {
    inventoryProductFilterLoader: false,
    productRuleTableLoader: false,
    productRulePopUpLoader: false,
    selectedRuleFilters: [],
    selectedStoreGroupDataPopUp: [],
    savePayloadForPopUp: [],
    selectedRulesArticles: [],
    productRulesFilterConfig: [],
    inventorysmartRulesFilterDependency: [],
    showGridContainer: false,
    applicationObjectList: null,
    popUpLinkFromDashbaord: null,
    filteredSelection: [],
  },
  reducers: {
    setProductRuleFilterLoader: (state, action) => {
      state.inventoryProductFilterLoader = action.payload;
    },
    setProductRuleTableLoader: (state, action) => {
      state.productRuleTableLoader = action.payload;
    },
    setProductRulePopUpLoader: (state, action) => {
      state.productRulePopUpLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedRuleFilters = action.payload;
    },
    setSavePayloadForPopUp: (state, action) => {
      state.savePayloadForPopUp = action.payload;
    },
    setSelectedStoreGroupDataPopUp: (state, action) => {
      state.selectedStoreGroupDataPopUp = action.payload;
    },
    setShowGridContainer: (state, action) => {
      state.showGridContainer = action.payload;
    },
    setApplicationObjectList: (state, action) => {
      state.applicationObjectList = action.payload;
    },
    setSelectedRulesArticles: (state, action) => {
      state.selectedRulesArticles = action.payload;
    },
    setProductRulesFilterConfig: (state, action) => {
      state.productRulesFilterConfig = action.payload;
    },
    setInventorysmartRulesFilterDependency: (state, action) => {
      state.inventorysmartRulesFilterDependency = action.payload;
    },
    setFilteredSelection: (state, action) => {
      state.filteredSelection = action.payload;
    },
    setPopUpLinkFromDashbaord: (state, action) => {
      state.popUpLinkFromDashbaord = action.payload;
    },
    resetProductRuleStoreState: (state, _action) => {
      state.inventoryProductFilterLoader = false;
      state.productRuleTableLoader = false;
      state.productRulePopUpLoader = false;
      state.selectedRuleFilters = [];
      state.selectedStoreGroupDataPopUp = [];
      state.savePayloadForPopUp = [];
      state.selectedRulesArticles = [];
      state.productRulesFilterConfig = [];
      state.inventorysmartRulesFilterDependency = [];
      state.showGridContainer = false;
      state.applicationObjectList = null;
      state.popUpLinkFromDashbaord = null;
      state.filteredSelection= [];
    },
  },
});

export const {
  setProductRuleFilterLoader,
  setProductRuleTableLoader,
  setProductRulePopUpLoader,
  setSelectedFilters,
  setSelectedStoreGroupDataPopUp,
  setSavePayloadForPopUp,
  setShowGridContainer,
  setApplicationObjectList,
  setSelectedRulesArticles,
  setProductRulesFilterConfig,
  setInventorysmartRulesFilterDependency,
  resetProductRuleStoreState,
  setPopUpLinkFromDashbaord,
  setFilteredSelection,
} = productRuleService.actions;

export const getRuleHeaderConfiguration = (
  queryParams,
  levelsJson = {},
  formatSetAllLabel = false
) => async () => {
  const { data } = await axiosInstance({
    url: `${PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG}?table_name=${queryParams}`,
    method: "GET",
  });
  return agGridColumnFormatter(data.data, levelsJson, formatSetAllLabel);
};

export const getProductRuleTableData = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: PRODUCT_RULE_DASHBOARD_TABLE_ROW_DATA,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getProductRulePOPUPTableData = (postBody, screen) => async () => {
  const { data } = await axiosInstance({
    url: `${PRODUCT_RULE_POP_UP_TABLE_ROW_DATA}/${screen}`,
    method: "POST",
    data: postBody,
  });
  return data;
};
export const getProductRuleStoreGroupTableData = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: PRODUCT_RULE_Store_Group_TABLE_ROW_DATA,
    method: "POST",
    data: postBody,
  });
  return data;
};
export const getProductRuleDcMappedTableData = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: PRODUCT_RULE_DC_Mapped_TABLE_ROW_DATA,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const saveProductRulePOPUPTableData = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: SAVE_PRODUCT_RULE_POP_UP_TABLE_ROW_DATA,
    method: "PUT",
    data: postBody,
  });
  return data;
};
export const saveProductRuleSetAllTableData = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: SAVE_PRODUCT_RULE_SET_ALL_TABLE_ROW_DATA,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getApplicationMaster = (postBody) => async () => {
  return axiosInstance({
    url: GET_APPLICATION_MASTER,
    method: "GET",
    data: postBody,
  });
};

export const updateAutoAllocation = (postBody) => async () => {
  return axiosInstance({
    url: UPDATE_AUTO_ALLOCATION,
    method: "POST",
    data: postBody,
  });
};
export const updateAutoAllocationSetAll = (postBody) => async () => {
  return axiosInstance({
    url: UPDATE_AUTO_ALLOCATION_SETALL,
    method: "POST",
    data: postBody,
  });
};
export const materialRuleDownloadCheck = (postBody) => async () => {
  return axiosInstance({
    url:  MATERIAL_RULE_DOWNLOAD_CHECK,
    method: "POST",
    data: postBody,
  });}

export const autoAllocSchRuleDownloadCheck = (postBody) => async () => {
  return axiosInstance({
    url: AUTO_ALLOC_SCH_RULE_DOWNLOAD_CHECK,
    method: "POST",
    data: postBody,
  });
};

export const updateCrossCountryAllocation = (postBody) => async () => {
  return axiosInstance({
    url: PRODUCT_RULES_GRID_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export default productRuleService.reducer;
