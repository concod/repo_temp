import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import {
  OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_SIZE,
  OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE,
  OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE_TIER,
  ORDER_MANAGEMENT_ORDER_DETAIL_SUMMARY_TABLE_DATA,
  ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_EDIT,
  OMS_ORDER_DETAIL_SUMMARY_FILTERS_DATA,
  OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_CONFIG_FOR_WEEK,
  OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_CONFIG_FOR_MONTH,
  OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_DATA,
  OMS_VENDOR_TO_STORE_DEEP_DIVE_FILTERS_DATA,
  ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_CONFIG_FOR_STORE,
  ORDER_MANAGEMENT_APPROVAL_FLOW_SEND_FOR_APPROVAL_VENDOR_STORE,
  ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_STORE_DATA,
  OMS_APPROVAL_FLOW_CUSTOM_FILTER_FOR_VENDOR_STORE,
  ORDER_MANAGEMENT_APPROVAL_FLOW_APPROVE_VENDOR_STORE,
  ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA_STORE,
  ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_CONFIG_STORE,
  SAFETY_STOCK_GRAPH_VIEW_DATA_VENDOR_STORE,
  SCENARIO_VIEW_TABLE_CONFIG_STORE,
  CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA_STORE,
  ORDER_MANAGEMENT_CREATE_SCENARIO_STORE_TABLE_CONFIG,
  CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG_STORE,
  ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG_STORE,
  ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA_STORE,
  ORDER_MANAGEMENT_ORDER_DETAILS_SET_ALL_UPDATE_DATA,
  ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE,
} from "modules/oms/constants-oms/apiConstants";

export const orderManagementVendorToStoreService = createSlice({
  name: "orderManagementVendorToStoreService",
  initialState: {
    selectedRowsFromOrderDetails: [],
    fiscalCalendarData: [],
    //Order Details Table 2
    orderInfoTableDataLoader: false,
    orderInfoTableConfigLoader: false,
    orderDetailsFiltersPayload: [],
    orderDetailsFilters: [],
    orderDetailsFiltersData: [],
    isOrderDetailsFiltersLoading: false,
    //Deep Dive
    deepDiveWeekRange: {},
    deepDiveFilters: [],
    deepDiveFiltersData: [],
    deepDiveFiltersPayload: [],
    deepDiveTableConfig: [],
    deepDiveTableConfigLoader: false,
    deepDiveTableLoader: false,
    deepDiveTableData: [],
    isDeepDiveFiltersLoading: false,
  },

  reducers: {
    setSelectedRowsFromOrderDetails: (state, action) => {
      state.selectedRowsFromOrderDetails = action.payload;
    },
    setFiscalCalendarData: (state, action) => {
      state.fiscalCalendarData = action.payload;
    },
    setOrderInfoTableDataLoader: (state, action) => {
      state.orderInfoTableDataLoader = action.payload;
    },
    setOrderInfoTableConfigLoader: (state, action) => {
      state.orderInfoTableConfigLoader = action.payload;
    },
    setOrderDetailsFiltersPayload: (state, action) => {
      state.orderDetailsFiltersPayload = action.payload;
    },
    setOrderDetailsFilters: (state, action) => {
      state.orderDetailsFilters = action.payload;
    },
    setOrderDetailsFiltersData: (state, action) => {
      state.orderDetailsFiltersData = action.payload;
    },
    setIsOrderDetailsFiltersLoading: (state, action) => {
      state.isOrderDetailsFiltersLoading = action.payload;
    },

    //Deep Dive
    setDeepDiveWeekRange: (state, action) => {
      state.deepDiveWeekRange = action.payload;
    },
    setDeepDiveFilters: (state, action) => {
      state.deepDiveFilters = action.payload;
    },
    setDeepDiveFiltersData: (state, action) => {
      state.deepDiveFiltersData = action.payload;
    },
    setDeepDiveFiltersPayload: (state, action) => {
      state.deepDiveFiltersPayload = action.payload;
    },
    setDeepDiveTableConfig: (state, action) => {
      state.deepDiveTableConfig = action.payload;
    },
    setDeepDiveTableConfigLoader: (state, action) => {
      state.deepDiveTableConfigLoader = action.payload;
    },
    setDeepDiveTableLoader: (state, action) => {
      state.deepDiveTableLoader = action.payload;
    },
    setDeepDiveTableData: (state, action) => {
      state.deepDiveTableData = action.payload;
    },
    setIsDeepDiveFiltersLoading: (state, action) => {
      state.isDeepDiveFiltersLoading = action.payload;
    },
    resetOrderDetailsFilters: (state) => {
      state.orderDetailsFiltersPayload = [];
      state.orderDetailsFiltersData = [];
      state.isOrderDetailsFiltersLoading = false;
    },
    resetDeepDiveReducersForVendorStore: (state) => {
      state.deepDiveWeekRange = {};
      state.deepDiveFiltersData = [];
      state.deepDiveFiltersPayload = [];
      state.deepDiveTableConfigLoader = false;
      state.deepDiveTableLoader = false;
      state.deepDiveTableData = [];
      state.deepDiveTableConfig = [];
      state.isDeepDiveFiltersLoading = false;
    },
    resetOrderManagementVendorToStoreState: (state) => {
      state.selectedRowsFromOrderDetails = [];
      state.fiscalCalendarData = [];
      state.orderInfoTableDataLoader = false;
      state.orderInfoTableConfigLoader = false;
      state.orderDetailsFiltersPayload = [];
      state.orderDetailsFilters = [];
      state.orderDetailsFiltersData = [];
      state.isOrderDetailsFiltersLoading = false;
      state.deepDiveWeekRange = {};
      state.deepDiveFilters = [];
      state.deepDiveFiltersData = [];
      state.deepDiveFiltersPayload = [];
      state.deepDiveTableConfig = [];
      state.deepDiveTableConfigLoader = false;
      state.deepDiveTableLoader = false;
      state.deepDiveTableData = [];
      state.isDeepDiveFiltersLoading = false;
    },
  },
});

export const {
  setSelectedRowsFromOrderDetails,
  setFiscalCalendarData,
  setOrderInfoTableDataLoader,
  setOrderInfoTableConfigLoader,
  setOrderDetailsFiltersPayload,
  setOrderDetailsFilters,
  setOrderDetailsFiltersData,
  setIsOrderDetailsFiltersLoading,
  setDeepDiveWeekRange,
  setDeepDiveFilters,
  setDeepDiveFiltersData,
  setDeepDiveFiltersPayload,
  setDeepDiveTableConfig,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableData,
  setDeepDiveTableLoader,
  setIsDeepDiveFiltersLoading,
  resetOrderDetailsFilters,
  resetDeepDiveReducersForVendorStore,
  resetOrderManagementVendorToStoreState,
} = orderManagementVendorToStoreService.actions;

export default orderManagementVendorToStoreService.reducer;

//Gets the Table Configurations for High Level Summary
export const getOmsHighLevelSummaryTableConfigForVendorStore = (
  params
) => () => {
  const TABLE_NAME = `table_name=${ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_NAME_STORE}`;
  const queryParams = `${TABLE_NAME}&${params}`;
  return axiosInstance({
    url: `${ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_CONFIG_STORE}?${queryParams}`,
    method: "GET",
  });
};

//Gets the Table Data for High Level Summary
export const getOmsHighLevelSummaryTableDataForStore = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_HIGHLEVEL_LEVEL_SUMMARY_TABLE_DATA_STORE,
    method: "POST",
    data: postBody,
  });
};

//Order Details Table 2 - By Size or By Store or By Store Tier
export const getOmsOrderSummaryColumnConfig = (displayType) => () => {
  let tableConfig = OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE;
  switch (displayType) {
    case "vendor_store":
      tableConfig = OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE;
      break;
    case "vendor_store_tier":
      tableConfig = OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE_TIER;
      break;
    case "vendor_size":
      tableConfig = OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_SIZE;
      break;
    default:
      tableConfig = OMS_ORDER_DETAIL_SUMMARY_TABLE_CONFIG_FOR_STORE;
      break;
  }
  return axiosInstance({
    url: tableConfig,
    method: "GET",
  });
};

//Fetches the data for the Order Details Table 2
export const getOmsOrderSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_ORDER_DETAIL_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

//Saves the edit on the Order Details Table 2
export const saveOrderDetailsTable = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_ORDER_DETAILS_TABLE_EDIT,
    method: "POST",
    data: postBody,
  });
};

//Gets the filter data on the Order Details Table 2
export const getOmsOrderSummaryFiltersData = (postBody) => () => {
  return axiosInstance({
    url: OMS_ORDER_DETAIL_SUMMARY_FILTERS_DATA,
    method: "POST",
    data: postBody,
  });
};

//Gets the filters present on the left-top of the Order Details Table 2
export const getOmsOrderSummaryFilters = () => async () => {
  const response = await tenantConfigApiCache(1, {
    attribute_name: "oms_vendor_store_filter_config",
  })();
  const configs = response?.data?.data[0]?.attribute_value?.value || [];
  return configs;
};

//Deep Dive - Fetches the Table Configurations
export const getOmsVendorToStoreDeepDiveTableConfiguration = (
  isViewedByWeek
) => () => {
  return axiosInstance({
    url: isViewedByWeek
      ? OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_CONFIG_FOR_WEEK
      : OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_CONFIG_FOR_MONTH,
    method: "GET",
  });
};
//Deep Dive - Fetches the Table Data
export const getOmsVendorToStoreDeepDiveTableData = (postBody) => () => {
  return axiosInstance({
    url: OMS_VENDOR_TO_STORE_DEEP_DIVE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};
//Deep Dive Filter Configuration
export const VENDOR_TO_STORE_DEEP_DIVE_FILTERS =
  "inv_oms_vendor_to_store_deep_dive_filters";

//Deep Dive - Fetches the filter data
export const fetchOmsDeepDiveFiltersData = (postBody) => () => {
  return axiosInstance({
    url: OMS_VENDOR_TO_STORE_DEEP_DIVE_FILTERS_DATA,
    method: "POST",
    data: postBody,
  });
};

//Fetching Custom Filters for Approval FLow Pane
export const getCustomFiltersForApprovalFlowInVendorStore = (
  postBody
) => () => {
  return axiosInstance({
    url: OMS_APPROVAL_FLOW_CUSTOM_FILTER_FOR_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

//Fetches the Table Configurations for Approval Flow
export const getOmsApprovalFlowColumnConfigInVendorStore = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_CONFIG_FOR_STORE,
    method: "GET",
  });
};

//Fetches the Table Data for Approval Flow
export const getOmsApprovalFlowTableStoreData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_TABLE_STORE_DATA,
    method: "POST",
    data: postBody,
  });
};

//Approve the Orders in Approval Flow Pane
export const approveOmsApprovalFlowInVendorStore = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_APPROVE_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

//Send For Approval the Orders in Approval Flow Pane
export const sendForApprovalOmsApprovalFlowInVendorStore = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_FLOW_SEND_FOR_APPROVAL_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

//Gets the Safety Stock Graph Details
export const getSafetyStockGraphVendorStore = (postBody) => () => {
  return axiosInstance({
    url: SAFETY_STOCK_GRAPH_VIEW_DATA_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};
//Create Scenario Store

export const getScenarioViewTableConfigurationStore = () => () => {
  return axiosInstance({
    url: SCENARIO_VIEW_TABLE_CONFIG_STORE,
    method: "GET",
  });
};

export const getCreateScenarioSafetyStockTableDataStore = (postBody) => () => {
  return axiosInstance({
    url: CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA_STORE,
    method: "POST",
    data: postBody,
  });
};

export const getOmsCreateScenarioStoreTableConfig = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_CREATE_SCENARIO_STORE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getCreateScenarioDeepDiveTableConfigurationStore = () => () => {
  return axiosInstance({
    url: CREATE_SCENARIO_DEEP_DIVE_TABLE_CONFIG_STORE,
    method: "GET",
  });
};

export const getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore = () => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_SKU_SUMMARY_CREATE_SCENARIO_APPLY_TABLE_CONFIG_STORE,
    method: "GET",
  });
};

export const getOmsCreateScenarioEditTableDataStore = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_CREATE_SCENARIO_EDIT_TABLE_DATA_STORE,
    method: "POST",
    data: postBody,
  });
};

export const setAllOrderDetailsData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_MANAGEMENT_ORDER_DETAILS_SET_ALL_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};
