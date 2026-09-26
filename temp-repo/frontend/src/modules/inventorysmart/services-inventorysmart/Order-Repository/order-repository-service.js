import { createSlice } from "@reduxjs/toolkit";
import {
  ORDER_MANAGEMENT_FILTER_CONFIG,
  ORDER_REPOSITORY_ORDERS_TABLE_CONFIG,
  ORDER_REPOSITORY_APPROVED_PENDING_ORDERS_TABLE_DATA,
  ORDER_REPOSITORY_ORDER_STATUS_SUMMARY,
  ORDER_REPOSITORY_SUBCLASS_LEVEL_SUMMARY_TABLE_CONFIG,
  ORDER_REPOSITORY_DELETE_ORDERS,
  ORDER_REPOSITORY_SUBCLASS_LEVEL_SUMMARY_NEW_VIEW_TABLE_CONFIG
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventoryOrderRepositoryService = createSlice({
  name: "inventoryOrderRepositoryService",
  initialState: {
    inventoryOrderRepositoryFilterLoader: false,
    inventoryOrderRepositoryTableConfigLoader: false,
    inventoryOrderRepositoryTableDataLoader: false,
    inventoryOrderRepositoryFilterElements: [],
    inventoryOrderRepositoryFilterDependency: [],
    orderRepositorySkuSummaryTableData: [],
    selectedFilters: [],
    isFiltersValid: false,
    orderRepositorySkuSummaryTableConfig: false,
    orderRepositorySkuSummaryTableLoader: false,
    orderRepositoryApprovedOrdersTableData: [],
    orderRepositoryApprovedOrdersTableConfig: [],
    orderRepositoryApprovedOrdersTableConfigLoader: false,
    orderRepositoryApprovedOrdersTableLoader: false,
    orderRepositoryOrderStatusSummaryLoader: false,
    orderRepositoryTableConfig: [],
    orderRepositoryTableData: [],
    backButtonClicked: false,
    selectedSku: [],
    formFilters: {},
  },
  reducers: {
    setInventoryOrderRepositoryFilterLoader: (state, action) => {
      state.inventoryOrderRepositoryFilterLoader = action.payload;
    },
    setInventoryOrderRepositoryTableDataLoader: (state, action) => {
      state.inventoryOrderRepositoryTableDataLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInventoryOrderRepositoryFilterElements: (state, action) => {
      state.inventoryOrderRepositoryFilterElements = action.payload;
    },
    setInventoryOrderRepositoryFilterDependency: (state, action) => {
      state.inventoryOrderRepositoryFilterDependency = action.payload;
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
    setOrderRepositoryTableConfig: (state, action) => {
      state.orderRepositoryTableConfig = action.payload;
    },
    setOrderRepositoryTableData: (state, action) => {
      state.orderRepositoryTableData = action.payload;
    },
    setOrderRepositorySkuSummaryTableConfigLoader: (state, action) => {
      state.orderRepositorySkuSummaryTableConfig = action.payload;
    },
    setOrderRepositorySkuSummaryTableData: (state, action) => {
      state.orderRepositorySkuSummaryTableData = action.payload;
    },
    setOrderRepositorySkuSummaryTableLoader: (state, action) => {
      state.orderRepositorySkuSummaryTableLoader = action.payload;
    },
    setOrderRepositoryOrderStatusSummaryLoader: (state, action) => {
      state.orderRepositoryOrderStatusSummaryLoader = action.payload;
    },
    setOrderRepositoryApprovedOrdersTableConfigLoader: (state, action) => {
      state.orderRepositoryApprovedOrdersTableConfigLoader = action.payload;
    },
    setOrderRepositoryApprovedOrdersTableLoader: (state, action) => {
      state.orderRepositoryApprovedOrdersTableLoader = action.payload;
    },
    setOrderRepositoryApprovedOrdersTableConfig: (state, action) => {
      state.orderRepositoryApprovedOrdersTableConfig = action.payload;
    },
    setOrderRepositoryApprovedOrdersTableData: (state, action) => {
      state.orderRepositoryApprovedOrdersTableData = action.payload;
    },
    setOrderRepoSku: (state, action) => {
      state.selectedSku = action.payload;
    },

    resetOrderRepositoryState: (state) => {
      state.inventoryOrderRepositoryFilterLoader = false;
      state.inventoryOrderRepositoryTableConfigLoader = false;
      state.inventoryOrderRepositoryTableDataLoader = false;
      state.inventoryOrderRepositoryFilterElements = [];
      state.inventoryOrderRepositoryFilterDependency = [];
      state.selectedFilters = [];
      state.orderRepositorySkuSummaryTableData = [];
      state.isFiltersValid = false;
      state.orderRepositorySkuSummaryTableLoader = false;
      state.orderRepositoryOrderStatusSummaryLoader = false;
      state.orderRepositorySkuSummaryTableConfig = false;
      state.orderRepositoryApprovedOrdersTableData = [];
      state.orderRepositoryApprovedOrdersTableConfig = [];
      state.orderRepositoryApprovedOrdersTableLoader = false;
      state.orderRepositoryApprovedOrdersTableConfigLoader = false;
      state.orderRepositoryTableConfig = [];
      state.orderRepositoryTableData = [];
      state.backButtonClicked = false;
      state.formFilters = {};
      state.selectedSku = [];
    },
  },
});

export const {
  setInventoryOrderRepositoryFilterLoader,
  setInventoryOrderRepositoryTableDataLoader,
  setSelectedFilters,
  setInventoryOrderRepositoryFilterElements,
  setInventoryOrderRepositoryFilterDependency,
  setBackButtonClicked,
  setFormData,
  setIsFiltersValid,
  setOrderRepositoryTableConfig,
  setOrderRepositoryTableData,
  setOrderRepositorySkuSummaryTableConfigLoader,
  setOrderRepositorySkuSummaryTableData,
  setOrderRepositorySkuSummaryTableLoader,
  setOrderRepositoryOrderStatusSummaryLoader,
  setOrderRepositoryApprovedOrdersTableData,
  setOrderRepositoryApprovedOrdersTableConfig,
  setOrderRepositoryApprovedOrdersTableConfigLoader,
  setOrderRepositoryApprovedOrdersTableLoader,
  resetOrderRepositoryState,
  setOrderRepoSku
} = inventoryOrderRepositoryService.actions;

export const getFilterConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_FILTER_CONFIG,
    method: "GET",
  });
};

export const getOrderStatusSummary = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_ORDER_STATUS_SUMMARY,
    method: "POST",
    data: postBody,
  });
};

export const getOrderRepoSubClassLevelSummaryTableConfig = () => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_SUBCLASS_LEVEL_SUMMARY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getApprovedPendingOrdersSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_APPROVED_PENDING_ORDERS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderRepoSubClassLevelSummaryNewViewTableConfig = () => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_SUBCLASS_LEVEL_SUMMARY_NEW_VIEW_TABLE_CONFIG,
    method: "GET",
  });
};

export const getApprovedOrdersSummaryTableConfiguration = (postBody) => () => {
  return axiosInstance({
    url: `${ORDER_REPOSITORY_ORDERS_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const deleteOrders = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_DELETE_ORDERS,
    method: "POST",
    data: postBody,
  });
};

export default inventoryOrderRepositoryService.reducer;
