import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  ORDER_MANAGEMENT_FILTER_CONFIG,
  ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_SKU_SUMMARY_TABLE_CONFIG,
  ORDER_MANAGEMENT_VIEW_BY_HIERARCHY_OPTIONS,
  ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA,
  //order repo
  ORDER_REPOSITORY_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA,
  ORDER_REPOSITORY_UPDATE_API,
  ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_CONFIG,
  ORDER_REPO_SUMMARY_TABLE_CONFIG,
  ORDER_MANAGEMENT_MAX_EDITABLE_RECEIPT_DATE,
  ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG,
  ORDER_MANAGEMENT_ORDER_SUMMARY_BY_GRADES,
  ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA,
  ORDER_MANAGEMENT_EDIT_SKU_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_APPROVE_ORDERS_FOR_VENDOR_STORE,
  ORDER_MANAGEMENT_APPROVE_ORDERS_FOR_VENDOR_DC,
  ORDER_MANAGEMENT_CREATE_SCENARIO_TABLE_CONFIG,
  ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA,
  ORDER_MANAGEMENT_SKU_SUMMARY_DEEP_DIVE_TABLE_CONFIG,
  ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG,
  ORDER_MANAGEMENT_UPDATE_SKU_SUMMARY_NOT_BEFORE_AFTER_DATES,
  CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG,
  SCENARIO_VIEW_TABLE_CONFIG,
  SAFETY_STOCK_GRAPH_VIEW_DATA,
  ORDER_MANAGEMENT_SKU_SUMMARY_UPLOAD,
  ORDER_MANAGEMENT_SKU_SUMMARY_UPLOAD_TABLE_CONFIG,
  ORDER_MANAGEMENT_DEEP_DIVE_FILTERS,
  ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_CONFIG,
  ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_DATA,
  ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA,
  ORDER_MANAGEMENT_APPROVAL_FLOW_SEND_FOR_APPROVAL,
  ORDER_MANAGEMENT_APPROVAL_FLOW_APPROVE,
  OMS_APPROVAL_FLOW_CUSTOM_FILTER_FOR_VENDOR_DC,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_TABLE_CONFIG,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_SKU_RISK_KPI_DATA,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_UPDATE_DATA,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_CHANNEL_TABLE_CONFIG,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_SIZE_TABLE_CONFIG,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_TABLE_DATA,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_UPDATE_DATA,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SET_ALL_UPDATE_DATA,
  ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SHIPMENT_MODES,
  ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_DATA,
  ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_CONFIG,
  OMS_FISCAL_WEEKS,
  ORDER_MANAGEMENT_DEEP_DIVE_DOWNLOAD_TABLE_CONFIG,
  ORDER_MANAGEMENT_DEEP_DIVE_DOWNLOAD_TABLE_DATA,
  ORDER_MANAGEMENT_CREATE_SCENARIO_DOWNLOAD_TABLE_DATA,
  OMS_VENDOR_TO_STORE_DEEP_DIVE_DOWNLOAD_TABLE_DATA,
  OMS_VENDOR_TO_STORE_DEEP_DIVE_DOWNLOAD_TABLE_CONFIG,
  ORDER_MANAGEMENT_CREATE_SCENARIO_DOWNLOAD_TABLE_DATA_STORE,
  ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_NAME,
  //order repo
  ORDER_REPO_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE,
  GET_FISCAL_CALENDAR,
  GET_RECEIPT_CALENDAR_DATA,
  DECISION_DASHBOARD_DEEP_DIVE_TABLE_DATA,
  ORDER_MANAGEMENT_DC_LIST_API,
  V2_DEEP_DIVE_TABLE_DATA,
  GET_HOLIDAY_WEEKS,
  ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG_COST,
} from "modules/oms/constants-oms/apiConstants";

export const orderManagementService = createSlice({
  name: "orderManagementService",
  initialState: {
    orderManagementFilterLoader: false,
    orderManagementTableConfigLoader: false,
    orderManagementTableDataLoader: false,
    orderManagementFilterElements: [],
    orderManagementFilterDependency: [],
    orderManagementSkuSummaryTableData: [],
    orderManagementSubClassLevelSummaryTableData: [],
    viewByHierarchyOptions: [],
    selectedFilters: [],
    isFiltersValid: false,
    orderManagementSubClassLevelSummaryTableConfigLoader: false,
    orderManagementSubClassLevelSummaryTableConfig: false,
    omsHighLevelSummaryConfigLoader: false,
    omsHighLevelSummaryTableLoader: false,
    orderManagementSkuSummaryTableConfig: false,
    orderManagementSkuSummaryTableLoader: false,
    orderManagementDeepDiveTableConfig: false,
    orderManagementDeepDiveTableConfigLoader: false,
    orderManagementDeepDiveTableLoader: false,
    orderManagementDeepDiveTableData: [],
    orderManagementDeepDiveDownloadTableConfig: [],
    orderManagementDeepDiveDownloadTableConfigLoader: false,
    orderManagementDeepDiveFilters: [],
    orderManagementDeepDiveFiltersData: {},
    orderManagementDeepDiveFiltersPayload: [],
    selectedRowsFromMatrixSummary: {},
    orderManagementProductDetailsFilters: [],
    createScenarioViewTableData: [],
    createScenarioAggregatedData: [],
    orderManagementKpiSummaryLoader: true,
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
    highLevelSummaryState: {},
    selectedApprovalFilters: [],
    isApprovalFiltersValid: false,
    approvalFlowTableLoader: false,
    redirectDetails: {},
    // Style Order Summary
    styleOrderSummaryTableConfigLoader: false,
    styleOrderSummaryDataLoader: false,
    styleOrderSummarySubClassTableConfigLoader: false,
    styleOrderSummarySubClassDataLoader: false,
    // Order Details
    orderDetailsTableConfigLoader: false,
    orderDetailsDataLoader: false,
    createScenarioFiltersData: [],
    isDeepdiveFilterLoading: false,
    maxEditableReceiptDate: null,
    maxEditableReceiptDateLoader: false,
    // DC Filter
    dcOptions: [],
    selectedDcs: [],
    dcOptionsLoader: false,
  },
  reducers: {
    setOrderManagementFilterLoader: (state, action) => {
      state.orderManagementFilterLoader = action.payload;
    },
    setOrderManagementTableDataLoader: (state, action) => {
      state.orderManagementTableDataLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setOrderManagementFilterElements: (state, action) => {
      state.orderManagementFilterElements = action.payload;
    },
    setOrderManagementFilterDependency: (state, action) => {
      state.orderManagementFilterDependency = action.payload;
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
    setViewByHierarchyOptions: (state, action) => {
      state.viewByHierarchyOptions = action.payload;
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
    setOmsHighLevelSummaryConfigLoader: (state, action) => {
      state.omsHighLevelSummaryConfigLoader = action.payload;
    },
    setOmsHighLevelSummaryTableLoader: (state, action) => {
      state.omsHighLevelSummaryTableLoader = action.payload;
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
    setOrderManagementDeepDiveDownloadTableConfig: (state, action) => {
      state.orderManagementDeepDiveDownloadTableConfig = action.payload;
    },
    setOrderManagementDeepDiveDownloadTableConfigLoader: (state, action) => {
      state.orderManagementDeepDiveDownloadTableConfigLoader = action.payload;
    },
    setOrderManagementDeepDiveFilters: (state, action) => {
      state.orderManagementDeepDiveFilters = action.payload;
    },
    setOrderManagementDeepDiveFiltersData: (state, action) => {
      state.orderManagementDeepDiveFiltersData = action.payload
        ? { ...action.payload }
        : action.payload;
    },
    setOrderManagementDeepDiveFiltersPayload: (state, action) => {
      state.orderManagementDeepDiveFiltersPayload = action.payload;
    },
    setSelectedRowsFromMatrixSummary: (state, action) => {
      state.selectedRowsFromMatrixSummary = action.payload;
    },
    setOrderManagementProductDetailsFilters: (state, action) => {
      state.orderManagementProductDetailsFilters = action.payload;
    },
    setCreateScenarioViewTableData: (state, action) => {
      state.createScenarioViewTableData = action.payload;
    },
    setCreateScenarioAggregatedData: (state, action) => {
      state.createScenarioAggregatedData = action.payload;
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
    setRedirectionDetails: (state, action) => {
      state.redirectDetails = action.payload;
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
    setOmsHighLevelSummaryTableData: (state, action) => {
      state.orderManagementSubClassLevelSummaryNewViewTableDataLoader =
        action.payload;
    },
    setHighLevelSummaryState: (state, action) => {
      state.highLevelSummaryState = action.payload;
    },
    setSelectedApprovalFilters: (state, action) => {
      state.selectedApprovalFilters = action.payload;
    },
    setIsApprovalFiltersValid: (state, action) => {
      state.isApprovalFiltersValid = action.payload;
    },
    setOmsApprovalFlowTableLoader: (state, action) => {
      state.approvalFlowTableLoader = action.payload;
    },
    setCreateScenarioFiltersData: (state, action) => {
      state.createScenarioFiltersData = action.payload;
    },
    setIsDeepdiveFilterLoading: (state, action) => {
      state.isDeepdiveFilterLoading = action.payload;
    },
    setMaxEditableReceiptDate: (state, action) => {
      state.maxEditableReceiptDate = action.payload;
    },
    setMaxEditableReceiptDateLoader: (state, action) => {
      state.maxEditableReceiptDateLoader = action.payload;
    },

    resetOrderManagementState: (state) => {
      state.orderManagementFilterLoader = false;
      state.viewByHierarchyOptions = [];
      state.orderManagementTableConfigLoader = false;
      state.orderManagementTableDataLoader = false;
      state.orderManagementFilterElements = [];
      state.orderManagementFilterDependency = [];
      state.selectedFilters = [];
      state.orderManagementSkuSummaryTableData = [];
      state.orderManagementSubClassLevelSummaryTableData = [];
      state.isFiltersValid = false;
      state.orderManagementSkuSummaryTableLoader = false;
      state.orderManagementKpiSummaryLoader = true;
      state.orderManagementSkuSummaryTableConfig = false;
      state.orderManagementSubClassLevelSummaryTableConfig = false;
      state.omsHighLevelSummaryConfigLoader = false;
      state.omsHighLevelSummaryTableLoader = false;
      state.orderManagementSubClassLevelSummaryTableConfigLoader = false;
      state.orderManagementDeepDiveTableConfig = false;
      state.orderManagementDeepDiveTableConfigLoader = false;
      state.orderManagementDeepDiveTableLoader = false;
      state.orderManagementDeepDiveDownloadTableConfig = [];
      state.orderManagementDeepDiveDownloadTableConfigLoader = false;
      state.editOmsSkuSummaryTableDataSuccess = false;
      state.editOmsSkuSummaryTableDataFailed = false;
      state.omsSkuSummaryApproveRequestSuccess = false;
      state.setOmsSkuSummaryApproveRequestFailed = false;
      state.orderManagementDeepDiveTableData = [];
      state.createScenarioViewTableData = [];
      state.createScenarioAggregatedData = [];
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
      state.highLevelSummaryState = {};
      state.orderManagementDeepDiveFilters = [];
      state.orderManagementDeepDiveFiltersData = {};
      state.orderManagementDeepDiveFiltersPayload = [];
      state.selectedRowsFromMatrixSummary = {};
      state.orderManagementProductDetailsFilters = [];
      state.redirectDetails = {};
      state.createScenarioFiltersData = [];
      state.isDeepdiveFilterLoading = false;
    },

    resetApprovalFlowState: (state) => {
      state.selectedApprovalFilters = [];
      state.isApprovalFiltersValid = false;
      state.approvalFlowTableLoader = false;
    },

    resetDeepDiveReducers: (state) => {
      state.orderManagementDeepDiveTableConfig = false;
      state.orderManagementDeepDiveTableConfigLoader = false;
      state.orderManagementDeepDiveTableLoader = false;
      state.orderManagementDeepDiveTableData = [];
    },

    resetCreateScenarioViewTableData: (state) => {
      state.createScenarioViewTableData = [];
    },

    resetOrderManagementDeepDiveTableData: (state) => {
      state.orderManagementDeepDiveTableData = [];
    },

    // Style Order Summary

    setStyleOrderSummaryTableConfigLoader: (state, action) => {
      state.styleOrderSummaryTableConfigLoader = action.payload;
    },

    setStyleOrderSummaryDataLoader: (state, action) => {
      state.styleOrderSummaryDataLoader = action.payload;
    },

    setStyleOrderSummarySubClassTableConfigLoader: (state, action) => {
      state.styleOrderSummarySubClassTableConfigLoader = action.payload;
    },

    setStyleOrderSummarySubClassDataLoader: (state, action) => {
      state.styleOrderSummarySubClassDataLoader = action.payload;
    },

    // Order Details
    setOrderDetailsTableConfigLoader: (state, action) => {
      state.orderDetailsTableConfigLoader = action.payload;
    },
    setOrderDetailsDataLoader: (state, action) => {
      state.orderDetailsDataLoader = action.payload;
    },
    // DC Filter
    setDcOptions: (state, action) => {
      state.dcOptions = action.payload;
    },
    setSelectedDcs: (state, action) => {
      state.selectedDcs = action.payload;
    },
    setDcOptionsLoader: (state, action) => {
      state.dcOptionsLoader = action.payload;
    },
  },
});

export const {
  setOrderManagementFilterLoader,
  setOrderManagementTableDataLoader,
  setSelectedFilters,
  setOrderManagementFilterElements,
  setOrderManagementFilterDependency,
  setBackButtonClicked,
  setFormData,
  setIsFiltersValid,
  setViewByHierarchyOptions,
  setOrderManagementTableConfig,
  setOrderManagementTableData,
  setOrderManagementSkuSummaryTableConfigLoader,
  setOrderManagementSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
  setOrderManagementSubClassLevelSummaryTableConfigLoader,
  setOrderManagementSubClassLevelSummaryTableConfig,
  setOrderManagementSubClassLevelSummaryTableData,
  setOmsHighLevelSummaryConfigLoader,
  setOmsHighLevelSummaryTableLoader,
  setOrderManagementDeepDiveTableConfig,
  setOrderManagementDeepDiveTableConfigLoader,
  setOrderManagementDeepDiveTableData,
  setOrderManagementDeepDiveDownloadTableConfig,
  setOrderManagementDeepDiveDownloadTableConfigLoader,
  setOrderManagementDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
  setOrderManagementDeepDiveFiltersData,
  setOrderManagementDeepDiveFiltersPayload,
  setSelectedRowsFromMatrixSummary,
  setCreateScenarioViewTableData,
  setCreateScenarioAggregatedData,
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
  setOmsHighLevelSummaryTableData,
  setHighLevelSummaryState,
  setSelectedApprovalFilters,
  setIsApprovalFiltersValid,
  setOmsApprovalFlowTableLoader,
  resetApprovalFlowState,
  resetDeepDiveReducers,
  setRedirectionDetails,
  setCreateScenarioFiltersData,
  setIsDeepdiveFilterLoading,
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
  // Style Order Summary
  setStyleOrderSummaryTableConfigLoader,
  setStyleOrderSummaryDataLoader,
  setStyleOrderSummarySubClassTableConfigLoader,
  setStyleOrderSummarySubClassDataLoader,
  resetCreateScenarioViewTableData,
  resetOrderManagementDeepDiveTableData,
  setOrderDetailsTableConfigLoader,
  setOrderDetailsDataLoader,
  // DC Filter
  setDcOptions,
  setSelectedDcs,
  setDcOptionsLoader,
} = orderManagementService.actions;

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

export const getOmsReceiptCalendarData = async (queryParams = "") => {
  return axiosInstance({
    url: GET_RECEIPT_CALENDAR_DATA,
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

export const SetOmsSkuSummaryApprovedRequestData = (
  postBody,
  isCalledFromVendorStore
) => () => {
  return axiosInstance({
    url: isCalledFromVendorStore
      ? ORDER_MANAGEMENT_APPROVE_ORDERS_FOR_VENDOR_STORE
      : ORDER_MANAGEMENT_APPROVE_ORDERS_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

export const getOmsSkuSummaryUploadTableConfig = (postbody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_UPLOAD_TABLE_CONFIG,
    method: "GET",
    data: postbody,
  });
};

export const uploadOmsSkuSummaryFile = (postbody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_UPLOAD,
    method: "POST",
    data: postbody,
  });
};

export const getOmsHighLevelSummaryTableConfig = (params) => () => {
  const TABLE_NAME = `table_name=${ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_NAME}`;
  const queryParams = `${TABLE_NAME}&${params}`;
  return axiosInstance({
    url: `${ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_CONFIG}?${queryParams}`,
    method: "GET",
  });
};

//order repo

export const getOrderRepoHighLevelSummaryTableConfig = (params) => () => {
  const TABLE_NAME = `table_name=${ORDER_REPO_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE}`;
  const queryParams = `${TABLE_NAME}&${params}`;
  return axiosInstance({
    url: `${ORDER_REPO_SUMMARY_TABLE_CONFIG}?${queryParams}`,
    method: "GET",
  });
};

export const getOmsHighLevelSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

//order repo
export const getOrderRepoSummaryTable = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

// Order repo edit value order-repo-update

export const getOrderRepoUpdateApi = (postBody) => () => {
  return axiosInstance({
    url: ORDER_REPOSITORY_UPDATE_API,
    method: "POST",
    data: postBody,
  });
};

export const getMaxEditableReceiptDate = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_MAX_EDITABLE_RECEIPT_DATE,
    method: "GET",
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
export const getOmsDeepDiveTableConfiguration = (isCostEnabled) => () => {
  return axiosInstance({
    url: isCostEnabled
      ? ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG_COST
      : ORDER_MANAGEMENT_DEEP_DIVE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsDeepDiveFilters = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_FILTERS,
    method: "GET",
  });
};

export const getOmsDeepDiveFiltersData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsDeepDiveTableData = (
  postBody,
  isCalledFromDashboard = false,
  isV2DeepDive = false
) => () => {
  return axiosInstance({
    url: isV2DeepDive
      ? V2_DEEP_DIVE_TABLE_DATA
      : isCalledFromDashboard
      ? DECISION_DASHBOARD_DEEP_DIVE_TABLE_DATA
      : ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsHolidayWeeks = (postBody) => () => {
  return axiosInstance({
    url: GET_HOLIDAY_WEEKS,
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

export const getOmsCreateScenarioDownloadTableData = (
  postBody,
  isCaledFromVendorToStore
) => () => {
  return axiosInstance({
    url: isCaledFromVendorToStore
      ? ORDER_MANAGEMENT_CREATE_SCENARIO_DOWNLOAD_TABLE_DATA_STORE
      : ORDER_MANAGEMENT_CREATE_SCENARIO_DOWNLOAD_TABLE_DATA,
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

//OMS Approval Flow
export const getOmsApprovalFlowColumnConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_CONFIG,
    method: "GET",
  });
};
export const getOmsApprovalFlowTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const sendForApprovalOmsApprovalFlow = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_SEND_FOR_APPROVAL,
    method: "POST",
    data: postBody,
  });
};

export const approveOmsApprovalFlow = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_APPROVE,
    method: "POST",
    data: postBody,
  });
};

export const getCustomFiltersForApprovalFlowInVendorDC = (postBody) => () => {
  return axiosInstance({
    url: OMS_APPROVAL_FLOW_CUSTOM_FILTER_FOR_VENDOR_DC,
    method: "POST",
    data: postBody,
  });
};

//OMS Order Details
export const getOmsOrderDetailsColumnConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsOrderDetailsTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

//OMS Style Order Summary
export const getOmsStyleOrderSummaryColumnConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsStyleOrderSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsSkuRiskKpiData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_RISK_KPI_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsStyleOrderSummaryUpdateData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsStyleOrderSummarySubClassColumnConfig = (
  toggle_checked
) => () => {
  return axiosInstance({
    url: toggle_checked
      ? ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_CHANNEL_TABLE_CONFIG
      : ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_SIZE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsStyleOrderSummarySubClassTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOmsStyleOrderSummarySubClassUpdateData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SUB_CLASS_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const postSetAllInfo = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SET_ALL_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const fetchFiscalWeeks = async (startDate, endDate) => {
  return axiosInstance({
    url: `${OMS_FISCAL_WEEKS}?start_date=${startDate}&end_date=${endDate}`,
    method: "GET",
  });
};

export const getOmsDeepDiveDownloadTableConfiguration = (
  isCaledFromVendorToStore
) => () => {
  return axiosInstance({
    url: isCaledFromVendorToStore
      ? OMS_VENDOR_TO_STORE_DEEP_DIVE_DOWNLOAD_TABLE_CONFIG
      : ORDER_MANAGEMENT_DEEP_DIVE_DOWNLOAD_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOmsDeepDiveDownloadTableData = (
  postBody,
  isCaledFromVendorToStore,
  isV2DeepDive = false
) => () => {
  return axiosInstance({
    url: isV2DeepDive
      ? V2_DEEP_DIVE_TABLE_DATA
      : isCaledFromVendorToStore
      ? OMS_VENDOR_TO_STORE_DEEP_DIVE_DOWNLOAD_TABLE_DATA
      : ORDER_MANAGEMENT_DEEP_DIVE_DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getViewByHierarchyOptions = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_VIEW_BY_HIERARCHY_OPTIONS,
    method: "GET",
  });
};

export const getDistributionCentres = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_DC_LIST_API,
    method: "POST",
    data: postBody,
  });
};

export const getShipmentModes = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_SHIPMENT_MODES,
    method: "GET",
  });
};

export default orderManagementService.reducer;
