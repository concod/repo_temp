import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  ORDER_REPOSITORY_ORDERS_TABLE_CONFIG,
  ORDER_REPOSITORY_TABLE_DATA_FOR_VENDOR_DC,
  ORDER_REPOSITORY_TABLE_DATA_FOR_VENDOR_STORE,
  ORDER_REPOSITORY_ORDER_STATUS_SUMMARY_FOR_VENDOR_DC,
  ORDER_REPOSITORY_ORDER_STATUS_SUMMARY_FOR_VENDOR_STORE,
  ORDER_REPOSITORY_DELETE_ORDERS_FOR_VENDOR_DC,
  ORDER_REPOSITORY_DELETE_ORDERS_FOR_VENDOR_STORE,
  ORDER_REPOSITORY_COMMENT_HISTORY,
  ORDER_REPOSITORY_SAVE_COMMENT,
  ORDER_REPOSITORY_UPDATE_ORDERS_FOR_VENDOR_STORE,
  ORDER_REPOSITORY_UPDATE_ORDERS_FOR_VENDOR_DC,
  ORDER_REPOSITORY_APPROVE_ORDERS_FOR_VENDOR_DC,
  ORDER_REPOSITORY_APPROVE_ORDERS_FOR_VENDOR_STORE,
} from "modules/oms/constants-oms/apiConstants";

export const orderRepositoryService = createSlice({
  name: "orderRepositoryService",
  initialState: {
    filterLoader: false,
    filterElements: [],
    filterDependency: [],
    selectedFilters: [],
    isFiltersValid: false,
    ordersTableData: [],
    tableConfigLoader: false,
    tableLoader: false,
    orderRepositoryOrderStatusSummaryLoader: false,
    orderRepositoryTableConfig: [],
    orderRepositoryTableData: [],
    backButtonClicked: false,
    selectedSku: [],
    formFilters: {},
  },
  reducers: {
    setFilterLoader: (state, action) => {
      state.filterLoader = action.payload;
    },

    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setFilterElements: (state, action) => {
      state.filterElements = action.payload;
    },
    setFilterDependency: (state, action) => {
      state.filterDependency = action.payload;
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
    setOrderRepositoryOrderStatusSummaryLoader: (state, action) => {
      state.orderRepositoryOrderStatusSummaryLoader = action.payload;
    },
    setTableConfigLoader: (state, action) => {
      state.tableConfigLoader = action.payload;
    },
    setTableLoader: (state, action) => {
      state.tableLoader = action.payload;
    },
    setOrdersTableData: (state, action) => {
      state.ordersTableData = action.payload;
    },
    setOrderRepoSku: (state, action) => {
      state.selectedSku = action.payload;
    },

    resetOrderRepositoryState: (state) => {
      state.filterLoader = false;
      state.filterElements = [];
      state.filterDependency = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.orderRepositoryOrderStatusSummaryLoader = false;
      state.ordersTableData = [];
      state.tableLoader = false;
      state.tableConfigLoader = false;
      state.orderRepositoryTableConfig = [];
      state.orderRepositoryTableData = [];
      state.backButtonClicked = false;
      state.formFilters = {};
      state.selectedSku = [];
    },
  },
});

export const {
  setFilterLoader,
  setSelectedFilters,
  setFilterElements,
  setFilterDependency,
  setBackButtonClicked,
  setFormData,
  setIsFiltersValid,
  setOrderRepositoryTableConfig,
  setOrderRepositoryTableData,
  setOrderRepositoryOrderStatusSummaryLoader,
  setOrdersTableData,
  setTableConfigLoader,
  setTableLoader,
  resetOrderRepositoryState,
  setOrderRepoSku,
} = orderRepositoryService.actions;

export const getOrderStatusSummaryForVendorDC = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_ORDER_STATUS_SUMMARY_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

export const getOrderStatusSummaryForVendorStore = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_ORDER_STATUS_SUMMARY_FOR_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

export const getTableDataForVendorDC = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_TABLE_DATA_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

export const getTableDataForVendorStore = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_TABLE_DATA_FOR_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

export const getTableConfiguration = (postBody) => () => {
  return axiosInstance({
    url: `${ORDER_REPOSITORY_ORDERS_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const deleteOrders = (postBody, isCalledFromVendorStore) => () => {
  return axiosInstance({
    url: isCalledFromVendorStore
      ? ORDER_REPOSITORY_DELETE_ORDERS_FOR_VENDOR_STORE
      : ORDER_REPOSITORY_DELETE_ORDERS_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

export const updateOrders = (postBody, isCalledFromVendorStore) => () => {
  return axiosInstance({
    url: isCalledFromVendorStore
      ? ORDER_REPOSITORY_UPDATE_ORDERS_FOR_VENDOR_STORE
      : ORDER_REPOSITORY_UPDATE_ORDERS_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

export const getCommentHistory = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_COMMENT_HISTORY,
    method: "POST",
    data: postBody,
  });
};

export const saveComment = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_SAVE_COMMENT,
    method: "POST",
    data: postBody,
  });
};

export const sendOrdersForApproval = (
  postBody,
  isCalledFromVendorStore
) => () => {
  return axiosInstance({
    url: isCalledFromVendorStore
      ? ORDER_REPOSITORY_APPROVE_ORDERS_FOR_VENDOR_STORE
      : ORDER_REPOSITORY_APPROVE_ORDERS_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

export default orderRepositoryService.reducer;
