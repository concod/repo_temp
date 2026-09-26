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
  ORDER_MANAGEMENT_DC_LIST_API,
  ORDER_REPO_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE,
  ORDER_REPO_SUMMARY_TABLE_CONFIG,
  ORDER_REPOSITORY_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA,
  ORDER_REPOSITORY_UPDATE_API,
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
    orderRepositoryDcOptions: [],
    orderRepositorySelectedDcs: [],
    orderRepositoryDcOptionsLoading: false,
    orderRepositoryDcDistributionStatus: null,
    orderRepoSummaryApiPayload: null,
    maxEditableReceiptDate: null,
    maxEditableReceiptDateLoader: false,
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
    setOrderRepositoryDcOptions: (state, action) => {
      state.orderRepositoryDcOptions = action.payload;
    },
    setOrderRepositorySelectedDcs: (state, action) => {
      state.orderRepositorySelectedDcs = action.payload;
    },
    setOrderRepositoryDcOptionsLoading: (state, action) => {
      state.orderRepositoryDcOptionsLoading = action.payload;
    },
    setOrderRepositoryDcDistributionStatus: (state, action) => {
      state.orderRepositoryDcDistributionStatus = action.payload;
    },
    setOrderRepoSummaryApiPayload: (state, action) => {
      state.orderRepoSummaryApiPayload = action.payload;
    },
    setMaxEditableReceiptDate: (state, action) => {
      state.maxEditableReceiptDate = action.payload;
    },
    setMaxEditableReceiptDateLoader: (state, action) => {
      state.maxEditableReceiptDateLoader = action.payload;
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
      state.orderRepositoryDcOptions = [];
      state.orderRepositorySelectedDcs = [];
      state.orderRepositoryDcOptionsLoading = false;
      state.orderRepositoryDcDistributionStatus = null;
      state.orderRepoSummaryApiPayload = null;
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
  setOrderRepositoryDcOptions,
  setOrderRepositorySelectedDcs,
  setOrderRepositoryDcOptionsLoading,
  setOrderRepositoryDcDistributionStatus,
  setOrderRepoSummaryApiPayload,
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
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

export const getOrderRepoSummaryTableConfig = (params) => () => {
  const TABLE_NAME = `table_name=${ORDER_REPO_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE}`;
  const queryParams = `${TABLE_NAME}&${params}`;
  return axiosInstance({
    url: `${ORDER_REPO_SUMMARY_TABLE_CONFIG}?${queryParams}`,
    method: "GET",
  });
};

export const getOrderRepoSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const editOrderRepoSummaryTable = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_UPDATE_API,
    method: "POST",
    data: postBody,
  });
};

export const getOrderRepositoryDistributionCentres = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DC_LIST_API,
    method: "POST",
    data: postBody,
  });
};

export default orderRepositoryService.reducer;
