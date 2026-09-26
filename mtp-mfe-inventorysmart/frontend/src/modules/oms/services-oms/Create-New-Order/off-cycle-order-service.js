import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  CREATE_NEW_OFF_CYCLE_ORDER_TABLE_CONFIG,
  CREATE_NEW_OFF_CYCLE_ORDER_TABLE_DATA,
  SAVE_OFF_CYCLE_DRAFT,
  CNO_OFFCYCLE_DEEP_DIVE_FILTERS_DATA,
  CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_DATA,
  CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_CONFIGURATION,
  CNO_OFFCYCLE_DEEP_DIVE_TABLE_DATA,
  CNO_OFFCYCLE_DEEP_DIVE_TABLE_CONFIGURATION,
  OFF_CYCLE_ORDER_PRODUCT_DETAILS_TABLE_CONFIG,
  OFF_CYCLE_ORDER_PRODUCT_DETAILS_TABLE_DATA,
  OFF_CYCLE_ARTICLE_DC_LEVEL_TABLE_CONFIG,
  OFF_CYCLE_ARTICLE_SIZE_LEVEL_TABLE_CONFIG,
  OFF_CYCLE_ARTICLE_DC_SIZE_LEVEL_TABLE_DATA,
  GET_OFF_CYCLE_DRAFT_ARTICLE_LOC,
  OFF_CYCLE_ORDER_DELETE_DRAFT,
  OFF_CYCLE_ORDER_SET_ALL,
  OFF_CYCLE_PRODUCT_DETAILS_UPDATE_DATA,
  OFF_CYCLE_DC_SIZE_LEVEL_UPDATE_DATA,
  OFF_CYCLE_ORDER_DC_LIST,
  OFF_CYCLE_APPROVAL_FLOW_TABLE_CONFIG,
  OFF_CYCLE_APPROVAL_FLOW_TABLE_DATA,
  OFF_CYCLE_APPROVE_ORDERS,
  OFF_CYCLE_ORDER_VIEW_DRAFTS,
  OFF_CYCLE_HIGH_LEVEL_AGGREGATE_TABLE_CONFIG,
  OFF_CYCLE_HIGH_LEVEL_AGGREGATE_TABLE_DATA,
  OFF_CYCLE_ORDER_ALERT_DATA,
  OFF_CYCLE_HIGH_LEVEL_AGGREGATE_UPDATE_DATA,
  RUN_OFF_CYCLE_RECOMMENDATION_CALCULATION,
} from "modules/oms/constants-oms/apiConstants";

/**
 * Redux slice for Off-Cycle Order management
 */
export const offCycleOrderService = createSlice({
  name: "offCycleOrderService",
  initialState: {
    offCycleOrderConfiguration: {},

    offCycleOrderTableConfigLoader: false,
    offCycleOrderTableConfig: [],
    offCycleOrderTableDataLoader: false,
    offCycleOrderTableData: [],
    offCycleOrderActiveStep: 0,
    offCycleOrderHasUnsavedChanges: {
      highLevelAggregate: false,
      productDetailsLevel0: false,
      articleDCSizeLevel: false,
    },
    selectedArticleDCCombination: [],
    selectedOrdersFromCNO: [],
    articleDCSizeLevelTableConfigLoader: false,
    articleDCSizeLevelTableDataLoader: false,

    //Deep Dive
    isOffCycleOrderDeepDiveFilterLoading: false,
    offCycleOrderDeepDiveFilters: [],
    offCycleOrderDeepDiveFiltersPayload: [],
    offCycleOrderDeepDiveFiltersData: [],
    offCycleOrderDeepDiveTableConfig: [],
    offCycleOrderDeepDiveTableConfigLoader: false,
    offCycleOrderDeepDiveTableData: [],
    offCycleOrderDeepDiveTableDataLoader: false,
    offCycleOrderDeepDiveDownloadTableConfig: [],
    offCycleOrderDeepDiveDownloadTableConfigLoader: false,
    offCycleOrderRecommRecieptDate: {
      attribute_name: "order_placement_recom_date",
      start_date: null,
      end_date: null,
    },
    offCycleOrderRopDate: {
      attribute_name: "not_before_date",
      start_date: null,
      end_date: null,
    },

    // High Level Aggregate View
    highLevelAggregateTableConfigLoader: false,
    highLevelAggregateTableDataLoader: false,

    // Approval Flow Table
    offCycleApprovalFlowTableDataLoader: false,
  },
  reducers: {
    setOffCycleOrderConfiguration: (state, action) => {
      state.offCycleOrderConfiguration = action.payload;
    },
    setOffCycleOrderTableConfigLoader: (state, action) => {
      state.offCycleOrderTableConfigLoader = action.payload;
    },
    setOffCycleOrderTableConfig: (state, action) => {
      state.offCycleOrderTableConfig = action.payload;
    },
    setOffCycleOrderTableDataLoader: (state, action) => {
      state.offCycleOrderTableDataLoader = action.payload;
    },
    setOffCycleOrderTableData: (state, action) => {
      state.offCycleOrderTableData = action.payload;
    },
    setOffCycleOrderActiveStep: (state, action) => {
      state.offCycleOrderActiveStep = action.payload;
    },
    setOffCycleOrderHasUnsavedChanges: (state, action) => {
      state.offCycleOrderHasUnsavedChanges = action.payload;
    },
    setSelectedArticleDCCombination: (state, action) => {
      state.selectedArticleDCCombination = action.payload;
    },

    // Article DC/Size Level Table Loaders
    setArticleDCSizeLevelTableConfigLoader: (state, action) => {
      state.articleDCSizeLevelTableConfigLoader = action.payload;
    },
    setArticleDCSizeLevelTableDataLoader: (state, action) => {
      state.articleDCSizeLevelTableDataLoader = action.payload;
    },

    //Deep Dive Filters
    setIsOffCycleOrderDeepDiveFilterLoading: (state, action) => {
      state.isOffCycleOrderDeepDiveFilterLoading = action.payload;
    },
    setOffCycleOrderDeepDiveFilters: (state, action) => {
      state.offCycleOrderDeepDiveFilters = action.payload;
    },
    setOffCycleOrderDeepDiveFiltersPayload: (state, action) => {
      state.offCycleOrderDeepDiveFiltersPayload = action.payload;
    },
    setOffCycleOrderDeepDiveFiltersData: (state, action) => {
      state.offCycleOrderDeepDiveFiltersData = action.payload;
    },
    setOffCycleOrderDeepDiveTableConfig: (state, action) => {
      state.offCycleOrderDeepDiveTableConfig = action.payload;
    },
    setOffCycleOrderDeepDiveTableConfigLoader: (state, action) => {
      state.offCycleOrderDeepDiveTableConfigLoader = action.payload;
    },
    setOffCycleOrderDeepDiveTableData: (state, action) => {
      state.offCycleOrderDeepDiveTableData = action.payload;
    },
    setOffCycleOrderDeepDiveTableDataLoader: (state, action) => {
      state.offCycleOrderDeepDiveTableDataLoader = action.payload;
    },
    setOffCycleOrderDeepDiveDownloadTableConfig: (state, action) => {
      state.offCycleOrderDeepDiveDownloadTableConfig = action.payload;
    },
    setOffCycleOrderDeepDiveDownloadTableConfigLoader: (state, action) => {
      state.offCycleOrderDeepDiveDownloadTableConfigLoader = action.payload;
    },
    resetOffCycleDeepDiveReducers: (state) => {
      state.isOffCycleOrderDeepDiveFilterLoading = false;
      state.offCycleOrderDeepDiveFilters = [];
      state.offCycleOrderDeepDiveFiltersPayload = [];
      state.offCycleOrderDeepDiveFiltersData = [];
      state.offCycleOrderDeepDiveTableConfig = [];
      state.offCycleOrderDeepDiveTableConfigLoader = false;
      state.offCycleOrderDeepDiveTableData = [];
      state.offCycleOrderDeepDiveTableDataLoader = false;
      state.offCycleOrderDeepDiveDownloadTableConfig = [];
      state.offCycleOrderDeepDiveDownloadTableConfigLoader = false;
    },

    setSelectedOrdersFromCNO: (state, action) => {
      state.selectedOrdersFromCNO = action.payload;
    },

    // High Level Aggregate View Loaders
    setHighLevelAggregateTableConfigLoader: (state, action) => {
      state.highLevelAggregateTableConfigLoader = action.payload;
    },
    setHighLevelAggregateTableDataLoader: (state, action) => {
      state.highLevelAggregateTableDataLoader = action.payload;
    },

    // Approval Flow Table Loader
    setOffCycleApprovalFlowTableDataLoader: (state, action) => {
      state.offCycleApprovalFlowTableDataLoader = action.payload;
    },

    resetOffCycleOrderState: (state) => {
      state.offCycleOrderTableConfigLoader = false;
      state.offCycleOrderTableConfig = [];
      state.offCycleOrderTableDataLoader = false;
      state.offCycleOrderTableData = [];
      state.offCycleOrderActiveStep = 0;
      state.offCycleOrderHasUnsavedChanges = {
        highLevelAggregate: false,
        productDetailsLevel0: false,
        articleDCSizeLevel: false,
      };
      state.selectedArticleDCCombination = [];
      state.selectedOrdersFromCNO = [];
    },
  },
});

export const {
  setOffCycleOrderConfiguration,
  setOffCycleOrderTableConfigLoader,
  setOffCycleOrderTableConfig,
  setOffCycleOrderTableDataLoader,
  setOffCycleOrderTableData,
  setOffCycleOrderActiveStep,
  setOffCycleOrderHasUnsavedChanges,
  setSelectedArticleDCCombination,
  setSelectedOrdersFromCNO,
  resetOffCycleOrderState,
  setArticleDCSizeLevelTableConfigLoader,
  setArticleDCSizeLevelTableDataLoader,
  setIsOffCycleOrderDeepDiveFilterLoading,
  setOffCycleOrderDeepDiveFilters,
  setOffCycleOrderDeepDiveFiltersPayload,
  setOffCycleOrderDeepDiveFiltersData,
  setOffCycleOrderDeepDiveTableConfig,
  setOffCycleOrderDeepDiveTableConfigLoader,
  setOffCycleOrderDeepDiveTableData,
  setOffCycleOrderDeepDiveTableDataLoader,
  setOffCycleOrderDeepDiveDownloadTableConfig,
  setOffCycleOrderDeepDiveDownloadTableConfigLoader,
  resetOffCycleDeepDiveReducers,
  setHighLevelAggregateTableConfigLoader,
  setHighLevelAggregateTableDataLoader,
  setOffCycleApprovalFlowTableDataLoader,
} = offCycleOrderService.actions;

/**
 * Dummy API - Get column configuration for off-cycle order table
 */
export const getOffCycleOrderTableConfig = () => () => {
  return axiosInstance({
    url: CREATE_NEW_OFF_CYCLE_ORDER_TABLE_CONFIG,
    method: "GET",
  });
};

/**
 * Get table data for off-cycle order
 * @param {Object} postBody - Request payload containing filters, selected articles, and metadata
 */
export const getOffCycleOrderTableData = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NEW_OFF_CYCLE_ORDER_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const saveOffCycleDraft = (postBody) => () => {
  return axiosInstance({
    url: SAVE_OFF_CYCLE_DRAFT,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleOrderDeepDiveDownloadTableConfiguration = (
  isCaledFromVendorToStore
) => () => {
  return axiosInstance({
    url: isCaledFromVendorToStore
      ? CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_CONFIGURATION
      : CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_CONFIGURATION,
    method: "GET",
  });
};

export const getOffCycleOrderDeepDiveDownloadTableData = (
  postBody,
  isCaledFromVendorToStore
) => () => {
  return axiosInstance({
    url: isCaledFromVendorToStore
      ? CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_DATA
      : CNO_OFFCYCLE_DEEPDIVE_DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleOrderDeepDiveTableConfiguration = () => () => {
  return axiosInstance({
    url: CNO_OFFCYCLE_DEEP_DIVE_TABLE_CONFIGURATION,
    method: "GET",
  });
};

export const getOffCycleOrderDeepDiveTableData = (postBody) => () => {
  return axiosInstance({
    url: CNO_OFFCYCLE_DEEP_DIVE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleDeepDiveFiltersData = (postBody) => () => {
  return axiosInstance({
    url: CNO_OFFCYCLE_DEEP_DIVE_FILTERS_DATA,
    method: "POST",
    data: postBody,
  });
};

export const CNO_OFFCYCLE_DEEP_DIVE_FILTERS =
  "oms_offcycle_order_deep_dive_filter_config";

export const getOffCycleProductDetailsColumnConfig = () => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_PRODUCT_DETAILS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOffCycleProductDetailsTableData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_PRODUCT_DETAILS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getArticleDCSizeLevelColumnConfig = (toggle_checked) => () => {
  const apiUrl = toggle_checked
    ? OFF_CYCLE_ARTICLE_DC_LEVEL_TABLE_CONFIG
    : OFF_CYCLE_ARTICLE_SIZE_LEVEL_TABLE_CONFIG;
  return axiosInstance({
    url: apiUrl,
    method: "GET",
  });
};

export const getArticleDCSizeLevelTableData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ARTICLE_DC_SIZE_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleDraftArticleLoc = (postBody) => () => {
  return axiosInstance({
    url: GET_OFF_CYCLE_DRAFT_ARTICLE_LOC,
    method: "POST",
    data: postBody,
  });
};

export const discardOffCycleOrderDraft = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_DELETE_DRAFT,
    method: "DELETE",
    data: postBody,
  });
};

export const postOffCycleSetAllInfo = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_SET_ALL,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleProductDetailsUpdateData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_PRODUCT_DETAILS_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleDCSizeLevelUpdateData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_DC_SIZE_LEVEL_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleOrderDCList = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_DC_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleApprovalFlowColumnConfig = () => () => {
  return axiosInstance({
    url: OFF_CYCLE_APPROVAL_FLOW_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOffCycleApprovalFlowTableData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_APPROVAL_FLOW_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const approveOffCycleOrders = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_APPROVE_ORDERS,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleViewDraftsTableConfiguration = () => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_VIEW_DRAFTS,
    method: "GET",
  });
};

export const getOffCycleViewDraftsData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_ALERT_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleHighLevelAggregateColumnConfig = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_HIGH_LEVEL_AGGREGATE_TABLE_CONFIG,
    method: "POST",
    data: postBody,
  });
};

export const getOffCycleHighLevelAggregateTableData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_HIGH_LEVEL_AGGREGATE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updateOffCycleHighLevelAggregateData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_HIGH_LEVEL_AGGREGATE_UPDATE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const runOffCycleRecommendationCalculation = (postBody) => () => {
  return axiosInstance({
    url: RUN_OFF_CYCLE_RECOMMENDATION_CALCULATION,
    method: "POST",
    data: postBody,
  });
};

export default offCycleOrderService.reducer;
