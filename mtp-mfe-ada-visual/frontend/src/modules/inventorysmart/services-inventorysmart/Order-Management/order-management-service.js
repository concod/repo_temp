import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  ORDER_MANAGEMENT_FILTER_CONFIG,
  ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_CONFIG,
  ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_TABLE_CONFIG,
  ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG,
  ORDER_MANAGEMENT_ORDER_SUMMARY_BY_GRADES,
  ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA,
  ORDER_MANAGEMENT_EDIT_SKU_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_SET_SKU_SUMMARY_APPROVE_REQUEST_DATA,
  ORDER_MANAGEMENT_CREATE_SCENARIO_TABLE_CONFIG,
  ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA,
  ORDER_MANAGEMENT_SKU_SUMMARY_DEEP_DIVE_TABLE_CONFIG,
  ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG,
  ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_NEW_VIEW_TABLE_CONFIG,
  ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_NEW_TABLE_DATA,
  ORDER_MANAGEMENT_UPDATE_SKU_SUMMARY_NOT_BEFORE_AFTER_DATES,
  CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG,
  SCENARIO_VIEW_TABLE_CONFIG,
  SAFETY_STOCK_GRAPH_VIEW_DATA
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { GET_FISCAL_CALENDAR } from "config/api";

export const inventoryOrderManagementService = createSlice({
  name: "inventoryOrderManagementService",
  initialState: {
    inventoryOrderManagementFilterLoader: false,
    inventoryOrderManagementTableConfigLoader: false,
    inventoryOrderManagementTableDataLoader: false,
    inventoryOrderManagementFilterElements: [],
    inventoryOrderManagementFilterDependency: [],
    orderManagementSkuSummaryTableData: [],
    orderManagementSubClassLevelSummaryTableData: [],
    selectedFilters: [],
    isFiltersValid: false,
    orderManagementSubClassLevelSummaryTableConfigLoader: false,
    orderManagementSubClassLevelSummaryTableConfig: false,
    orderManagementSubClassLevelSummaryConfigLoader: false,
    orderManagementSubClassLevelSummaryTableLoader: false,
    orderManagementSkuSummaryTableConfig: false,
    orderManagementSkuSummaryTableLoader: false,
    orderManagementDeepDiveTableConfig: false,
    orderManagementDeepDiveTableConfigLoader: false,
    orderManagementDeepDiveTableLoader: false,
    orderManagementDeepDiveTableData: [],
    createScenarioViewTableData: [],
    orderManagementKpiSummaryLoader: false,
    orderManagementTableConfig: [],
    orderManagementTableData: [],
    backButtonClicked: false,
    editOmsSkuSummaryTableDataSuccess: false,
    editOmsSkuSummaryTableDataFailed: false,
    omsSkuSummaryApproveRequestSuccess: false,
    setOmsSkuSummaryApproveRequestFailed: false,
    redirectFromDeepDive: false,
    recommRecieptDate: {},
    ropDate: {},
    formFilters: {},
    selectedSku: [],
    orderCreateScenarioTableConfigLoader: false,
    orderScenarioApplyTableConfigLoader: false,
    orderScenarioApplyTableDataLoader: false,
    orderManagementSubClassLevelSummaryNewViewTableConfigLoader: false,
    orderManagementSubClassLevelSummaryNewViewTableDataLoader: false,
  },
  reducers: {
    setInventoryOrderManagementFilterLoader: (state, action) => {
      state.inventoryOrderManagementFilterLoader = action.payload;
    },
    setInventoryOrderManagementTableDataLoader: (state, action) => {
      state.inventoryOrderManagementTableDataLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInventoryOrderManagementFilterElements: (state, action) => {
      state.inventoryOrderManagementFilterElements = action.payload;
    },
    setInventoryOrderManagementFilterDependency: (state, action) => {
      state.inventoryOrderManagementFilterDependency = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    setFormData: (state, action) => {
      state.formFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setOrderManagementTableConfig: (state, action) => {
      state.orderManagementTableConfig = action.payload;
    },
    setOrderManagementTableData: (state, action) => {
      state.orderManagementTableData = action.payload;
    },
    setOrderManagementSkuSummaryTableConfigLoader: (state, action) => {
      state.orderManagementSkuSummaryTableConfig = action.payload;
    },
    setOrderManagementSkuSummaryTableData: (state, action) => {
      state.orderManagementSkuSummaryTableData = action.payload;
    },
    setOrderManagementSkuSummaryTableLoader: (state, action) => {
      state.orderManagementSkuSummaryTableLoader = action.payload;
    },
    setOrderManagementSubClassLevelSummaryTableConfigLoader: (
      state,
      action
    ) => {
      state.orderManagementSubClassLevelSummaryTableConfigLoader =
        action.payload;
    },
    setOrderManagementSubClassLevelSummaryTableConfig: (state, action) => {
      state.orderManagementSubClassLevelSummaryTableConfig = action.payload;
    },
    setOrderManagementSubClassLevelSummaryTableData: (state, action) => {
      state.orderManagementSubClassLevelSummaryTableData = action.payload;
    },
    setOrderManagementSubClassLevelSummaryConfigLoader: (state, action) => {
      state.orderManagementSubClassLevelSummaryConfigLoader = action.payload;
    },
    setOrderManagementSubClassLevelSummaryTableLoader: (state, action) => {
      state.orderManagementSubClassLevelSummaryTableLoader = action.payload;
    },
    setOrderManagementDeepDiveTableConfig: (state, action) => {
      state.orderManagementDeepDiveTableConfig = action.payload;
    },
    setOrderManagementDeepDiveTableConfigLoader: (state, action) => {
      state.orderManagementDeepDiveTableConfigLoader = action.payload;
    },
    setOrderManagementDeepDiveTableData: (state, action) => {
      state.orderManagementDeepDiveTableData = action.payload;
    },
    setCreateScenarioViewTableData: (state, action) => {
      state.createScenarioViewTableData = action.payload;
    },
    setOrderManagementDeepDiveTableLoader: (state, action) => {
      state.orderManagementDeepDiveTableLoader = action.payload;
    },
    setOrderManagementKpiSummaryLoader: (state, action) => {
      state.orderManagementKpiSummaryLoader = action.payload;
    },
    setEditSkuSummaryTableDataFailed: (state, action) => {
      state.editOmsSkuSummaryTableDataFailed = action.payload;
    },
    setEditSkuSummaryTableDataSuccess: (state, action) => {
      state.editOmsSkuSummaryTableDataSuccess = action.payload;
    },
    setRedirectFromDeepDive: (state, action) => {
      state.redirectFromDeepDive = action.payload;
    },
    setRecommRecieptDate: (state, action) => {
      state.recommRecieptDate = action.payload;
    },
    setRopDate: (state, action) => {
      state.ropDate = action.payload;
    },
    setOmsSkuSummaryApproveRequestFailed: (state, action) => {
      state.setOmsSkuSummaryApproveRequestFailed = action.payload;
    },
    setOmsSkuSummaryApproveRequestSuccess: (state, action) => {
      state.omsSkuSummaryApproveRequestSuccess = action.payload;
    },
    setOmsSku: (state, action) => {
      state.selectedSku = action.payload;
    },
    setOrderCreateScenarioTableConfigLoader: (state, action) => {
      state.orderCreateScenarioTableConfigLoader = action.payload;
    },
    setOrderScenarioApplyTableConfigLoader: (state, action) => {
      state.orderScenarioApplyTableConfigLoader = action.payload;
    },
    setOrderScenarioApplyTableDataLoader: (state, action) => {
      state.orderScenarioApplyTableDataLoader = action.payload;
    },
    setOrderManagementSubClassLevelSummaryNewViewTableConfig: (
      state,
      action
    ) => {
      state.orderManagementSubClassLevelSummaryNewViewTableConfigLoader =
        action.payload;
    },
    setOrderManagementSubClassLevelSummaryNewViewTableData: (state, action) => {
      state.orderManagementSubClassLevelSummaryNewViewTableDataLoader =
        action.payload;
    },
    resetOrderManagementState: (state) => {
      state.inventoryOrderManagementFilterLoader = false;
      state.inventoryOrderManagementTableConfigLoader = false;
      state.inventoryOrderManagementTableDataLoader = false;
      state.inventoryOrderManagementFilterElements = [];
      state.inventoryOrderManagementFilterDependency = [];
      state.selectedFilters = [];
      state.orderManagementSkuSummaryTableData = [];
      state.orderManagementSubClassLevelSummaryTableData = [];
      state.isFiltersValid = false;
      state.orderManagementSkuSummaryTableLoader = false;
      state.orderManagementKpiSummaryLoader = false;
      state.orderManagementSkuSummaryTableConfig = false;
      state.orderManagementSubClassLevelSummaryTableConfig = false;
      state.orderManagementSubClassLevelSummaryConfigLoader = false;
      state.orderManagementSubClassLevelSummaryTableLoader = false;
      state.orderManagementSubClassLevelSummaryTableConfigLoader = false;
      state.orderManagementDeepDiveTableConfig = false;
      state.orderManagementDeepDiveTableConfigLoader = false;
      state.orderManagementDeepDiveTableLoader = false;
      state.editOmsSkuSummaryTableDataSuccess = false;
      state.editOmsSkuSummaryTableDataFailed = false;
      state.omsSkuSummaryApproveRequestSuccess = false;
      state.setOmsSkuSummaryApproveRequestFailed = false;
      state.orderManagementDeepDiveTableData = [];
      state.createScenarioViewTableData = [];
      state.orderManagementTableConfig = [];
      state.orderManagementTableData = [];
      state.backButtonClicked = false;
      state.redirectFromDeepDive = false;
      state.recommRecieptDate = {};
      state.ropDate = {};
      state.formFilters = {};
      state.selectedSku = [];
      state.orderCreateScenarioTableConfigLoader = false;
      state.orderScenarioApplyTableConfigLoader = false;
      state.orderScenarioApplyTableDataLoader = false;
      state.orderManagementSubClassLevelSummaryNewViewTableConfigLoader = false;
      state.orderManagementSubClassLevelSummaryNewViewTableDataLoader = false;
    },
  },
});

export const {
  setInventoryOrderManagementFilterLoader,
  setInventoryOrderManagementTableDataLoader,
  setSelectedFilters,
  setInventoryOrderManagementFilterElements,
  setInventoryOrderManagementFilterDependency,
  setBackButtonClicked,
  setFormData,
  setIsFiltersValid,
  setOrderManagementTableConfig,
  setOrderManagementTableData,
  setOrderManagementSkuSummaryTableConfigLoader,
  setOrderManagementSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
  setOrderManagementSubClassLevelSummaryTableConfigLoader,
  setOrderManagementSubClassLevelSummaryTableConfig,
  setOrderManagementSubClassLevelSummaryTableData,
  setOrderManagementSubClassLevelSummaryConfigLoader,
  setOrderManagementSubClassLevelSummaryTableLoader,
  setOrderManagementDeepDiveTableConfig,
  setOrderManagementDeepDiveTableConfigLoader,
  setOrderManagementDeepDiveTableData,
  setCreateScenarioViewTableData,
  setOrderManagementDeepDiveTableLoader,
  setOrderManagementKpiSummaryLoader,
  setEditSkuSummaryTableDataSuccess,
  setEditSkuSummaryTableDataFailed,
  resetOrderManagementState,
  setRedirectFromDeepDive,
  setRecommRecieptDate,
  setRopDate,
  setOmsSkuSummaryApproveRequestFailed,
  setOmsSkuSummaryApproveRequestSuccess,
  setOmsSku,
  setOrderCreateScenarioTableConfigLoader,
  setOrderScenarioApplyTableConfigLoader,
  setOrderScenarioApplyTableDataLoader,
  setOrderManagementSubClassLevelSummaryNewViewTableConfig,
  setOrderManagementSubClassLevelSummaryNewViewTableData,
} = inventoryOrderManagementService.actions;

export const getFilterConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_FILTER_CONFIG,
    method: "GET",
  });
};

export const getOmsCoreFiscalCalendar = async (queryParams = "") => {
  return axiosInstance({
    url: GET_FISCAL_CALENDAR,
    method: "GET",
  });
};

export const getOmsSkuSummaryTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsSkuSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const editOmsSkuSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_EDIT_SKU_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updateSkuSummaryNotBeforeAfterDates = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_UPDATE_SKU_SUMMARY_NOT_BEFORE_AFTER_DATES,
    method: "POST",
    data: postBody,
  });
};

export const SetOmsSkuSummaryApprovedRequestData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SET_SKU_SUMMARY_APPROVE_REQUEST_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsSubClassLevelSummaryTableConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsSubClassLevelSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsSubClassLevelSummaryNewViewTableConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_NEW_VIEW_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsSubClassLevelSummaryNewTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SUBCLASS_LEVEL_SUMMARY_NEW_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrdersSummaryByGrades = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_ORDER_SUMMARY_BY_GRADES,
    method: "POST",
    data: postBody,
  });
};

//Deep Dive
export const getOmsDeepDiveTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsDeepDiveTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsSkuSummaryTableDeepDiveConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_DEEP_DIVE_TABLE_CONFIG,
    method: "GET",
  });
};

//Create Scenario
export const getOmsCreateScenarioTableConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_CREATE_SCENARIO_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsSkuSummaryCreateScenarioApplyTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsCreateScenarioEditTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};
//create Scenario deep dive table
export const getCreateScenarioDeepDiveTableConfiguration = () => () => {
  return axiosInstance({
    url: CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getScenarioViewTableConfiguration = () => () => {
  return axiosInstance({
    url: SCENARIO_VIEW_TABLE_CONFIG,
    method: "GET",
  });
};

//SafetyStockGraph
export const getSafetyStockGraph = (postBody) => () => {
  return axiosInstance({
    url: SAFETY_STOCK_GRAPH_VIEW_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventoryOrderManagementService.reducer;
