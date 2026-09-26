import { createSlice } from "@reduxjs/toolkit";
import { set } from "lodash";
import {
  DOWNLOAD_CHECK_FOR_USER_RESERVE,
  GET_STORE_LEVEL_TABLE_DATA,
  POST_STORE_LEVEL_TABLE_DATA,
  GET_STORE_GRADE_LEVEL_TABLE_DATA,
  GET_STORE_GROUP_LEVEL_TABLE_DATA,
  GET_STORE_MODAL_TABLE_DATA,
  SET_ALL_TABLE_DATA,
  GET_STORE_GROUP_AGGREGATE,
  GET_STORE_GRADE_AGGREGATE,
  CONSTRAINTS_STATUS_TABLE_CONFIG,
  CONSTRAINTS_STATUS_TABLE_DATA,
  CONSTRAINTS_ORDERING_TABLE_CONFIG,
  CONSTRAINTS_ORDERING_TABLE_DATA,
  CONSTRAINTS_ORDER_POLICY_TABLE_CONFIG,
  CONSTRAINTS_ORDER_POLICY_TABLE_DATA,
  CONSTRAINTS_SAFETY_STOCK_TABLE_CONFIG,
  CONSTRAINTS_SAFETY_STOCK_TABLE_DATA,
  CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_CONFIG,
  CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_DATA,
  CONSTRAINTS_DELIVERY_QC_TIME_TABLE_CONFIG,
  CONSTRAINTS_DELIVERY_QC_TIME_TABLE_DATA,
  CONSTRAINTS_OMS_FILTER_CONFIG,
  SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME,
  SAVE_CONSTRAINTS_STATUS,
  SAVE_CONSTRAINTS_DELIVERY_QC_TIME,
  SAVE_CONSTRAINTS_SAFETY_STOCK,
  SAVE_CONSTRAINTS_ORDERING,
  SAVE_CONSTRAINTS_ORDER_POLICY,
  USER_RESERVE_INV_LIST,
  USER_RESERVE_INV_UPDATE,
  USER_RESERVE_SET_ALL_UPDATE,
  USER_RESERVE_SET_ALL_FIELDS,
  SMA_VIEW_TABLE,
  SMA_TABLE_ROW_UPDATE,
  SMA_TABLE_SET_ALL_UPDATE,
  DOWNLOAD_STORE_CONSTRAINTS_DATA,
  DOWNLOAD_STORE_GRADE_CONSTRAINTS_DATA,
  DOWNLOAD_STORE_GROUP_CONSTRAINTS_DATA,
  FETCH_SKU_COUNT_AND_JOB_ID,
  UPDATE_CONSTRAINTS_SET_ALL_WITH_JOBID,
  UPLOAD_FILE,
  CONSTRAINTS_CHECK_DOWNLOAD_REQUEST,
  POST_STORE_LEVEL_TIME_BASED_TABLE_DATA,
  CONSTRAINTS_PO_CONVERSION_TABLE_CONFIG,
  CONSTRAINTS_PO_CONVERSION_TABLE_DATA,
  SAVE_CONSTRAINTS_PO_CONVERSION,
  GET_WEEK_FILTER_OPTIONS,
  GET_STORE_WEEK_LEVEL_TABLE_DATA,
  POST_STORE_WEEK_LEVEL_TABLE_DATA,
  GET_STORE_LEVEL_CUSTOM_TABLE_DATA,
  CONSTRAINTS_DELIVERY_QC_TIME_DOWNLOAD_TABLE_DATA,
  CONSTRAINTS_DELIVERY_LEAD_TIME_DOWNLOAD_TABLE_DATA,
  CONSTRAINTS_STATUS_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_ORDERING_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_SAFETY_STOCK_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_ORDER_POLICY_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_PO_CONVERSION_TABLE_DOWNLOAD_DATA,
  FETCH_STORE_WEEK_SKU_COUNT_AND_JOB_ID,
  DOWNLOAD_STORE_WEEK_CONSTRAINTS_DATA,
  DOWNLOAD_STORE_CUSTOM_CONSTRAINTS_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartConstraintsService = createSlice({
  name: "inventorySmartConstraintsService",
  initialState: {
    constraintsLoader: false,
    constraintsOmsLoader: false,
    constraintsTableConfigLoader: false,
    constraintsStatusTableDataLoader: false,
    constraintsStatusTableConfigLoader: false,
    constraintsOrderingTableDataLoader: false,
    constraintsOrderingTableConfigLoader: false,
    constraintsOrderPolicyTableDataLoader: false,
    constraintsOrderPolicyTableConfigLoader: false,
    constraintsSafetyStockTableDataLoader: false,
    constraintsSafetyStockTableConfigLoader: false,
    constraintsDeleiveryLeadTimeTableDataLoader: false,
    constraintsDeleiveryLeadTimeTableConfigLoader: false,
    constraintsDeleiveryQcTimeTableDataLoader: false,
    constraintsDeleiveryQcTimeTableConfigLoader: false,
    constraintsPoConversionTableConfigLoader: false,
    constraintsPoConversionTableDataLoader: false,
    constraintsTableConfig: [],
    constraintsTableData: [],
    constraintsOmsTableData: [],
    selectedConstraintArticles: [],
    selectedStoreCodes: [],
    selectedFilters: [],
    selectedOmsFilters: [],
    inventorysmartConstraintsFilterDependency: [],
    inventorysmartConstraintsOmsFilterDependency: [],
    inventorysmartConstraintsOmsFilterElements: [],
    constraintsEditSuccess: false,
    constraintsEditFailed: false,
    constraintsSetAllSuccess: false,
    constraintsSetAllFailed: false,
    isFilterOmsValid: false,
    constraintsUserReserveFilterConfig: [],
    constraintsUserReserveLoader: false,
    constraintsSMALoader: false,
    constraintsSMAFilterConfig: [],
    popUpLinkFromDashbaord: null,
    constraintsUserReserveSetAllForm: [],
  },
  reducers: {
    setConstraintsLoader: (state, action) => {
      state.constraintsLoader = action.payload;
    },
    setConstraintsOmsLoader: (state, action) => {
      state.constraintsOmsLoader = action.payload;
    },
    setConstraintsTableConfigLoader: (state, action) => {
      state.constraintsTableConfigLoader = action.payload;
    },
    setConstraintsSafetyStockTableDataLoader: (state, action) => {
      state.constraintsSafetyStockTableDataLoader = action.payload;
    },
    setConstraintsSafetyStockTableConfigLoader: (state, action) => {
      state.constraintsSafetyStockTableConfigLoader = action.payload;
    },
    setConstraintsStatusTableDataLoader: (state, action) => {
      state.constraintsStatusTableDataLoader = action.payload;
    },
    setConstraintsStatusTableConfigLoader: (state, action) => {
      state.constraintsStatusTableConfigLoader = action.payload;
    },
    setConstraintsOrderingTableDataLoader: (state, action) => {
      state.constraintsOrderingTableDataLoader = action.payload;
    },
    setConstraintsOrderingTableConfigLoader: (state, action) => {
      state.constraintsOrderingTableConfigLoader = action.payload;
    },
    setConstraintsOrderPolicyTableDataLoader: (state, action) => {
      state.constraintsOrderPolicyTableDataLoader = action.payload;
    },
    setConstraintsOrderPolicyTableConfigLoader: (state, action) => {
      state.constraintsOrderPolicyTableConfigLoader = action.payload;
    },
    setConstraintsDeleiveryLeadTimeTableDataLoader: (state, action) => {
      state.constraintsDeleiveryLeadTimeTableDataLoader = action.payload;
    },
    setConstraintsDeleiveryLeadTimeTableConfigLoader: (state, action) => {
      state.constraintsDeleiveryLeadTimeTableConfigLoader = action.payload;
    },
    setConstraintsDeleiveryQcTimeTableDataLoader: (state, action) => {
      state.constraintsDeleiveryQcTimeTableDataLoader = action.payload;
    },
    setConstraintsDeleiveryQcTimeTableConfigLoader: (state, action) => {
      state.constraintsDeleiveryQcTimeTableConfigLoader = action.payload;
    },
    setConstraintsPoConversionTableConfigLoader: (state, action) => {
      state.constraintsPoConversionTableConfigLoader = action.payload;
    },
    setConstraintsPoConversionTableDataLoader: (state, action) => {
      state.constraintsPoConversionTableDataLoader = action.payload;
    },
    setConstraintsArticles: (state, action) => {
      state.selectedConstraintArticles = action.payload;
    },
    setConstraintsStoreCodes: (state, action) => {
      state.selectedStoreCodes = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setSelectedOmsFilters: (state, action) => {
      state.selectedOmsFilters = action.payload;
    },
    setInventorysmartConstraintsFilterDependency: (state, action) => {
      state.inventorysmartConstraintsFilterDependency = action.payload;
    },
    setInventorysmartConstraintsOmsFilterDependency: (state, action) => {
      state.inventorysmartConstraintsOmsFilterDependency = action.payload;
    },
    setInventorysmartConstraintsOmsFilterElements: (state, action) => {
      state.inventorysmartConstraintsOmsFilterElements = action.payload;
    },
    setConstraintsEditSuccess: (state, action) => {
      state.inventorysmartConstraintsOmsFilterElements = action.payload;
    },
    setConstraintsEditFailed: (state, action) => {
      state.inventorysmartConstraintsOmsFilterElements = action.payload;
    },
    setConstraintsSetAllSuccess: (state, action) => {
      state.inventorysmartConstraintsOmsFilterElements = action.payload;
    },
    setConstraintsSetAllFailed: (state, action) => {
      state.inventorysmartConstraintsOmsFilterElements = action.payload;
    },
    setIsFilterOmsValid: (state, action) => {
      state.isFilterOmsValid = action.payload;
    },
    setConstraintsUserReserveFilterConfig: (state, action) => {
      state.constraintsUserReserveFilterConfig = action.payload;
    },
    setConstraintsUserReserveLoader: (state, action) => {
      state.constraintsUserReserveLoader = action.payload;
    },
    setConstraintsSMAFilterConfig: (state, action) => {
      state.constraintsSMAFilterConfig = action.payload;
    },
    setConstraintsSMALoader: (state, action) => {
      state.constraintsSMALoader = action.payload;
    },
    setPopUpLinkFromDashbaord: (state, action) => {
      state.popUpLinkFromDashbaord = action.payload;
    },
    setConstraintsUserReserveSetAllForm: (state, action) => {
      state.constraintsUserReserveSetAllForm = action.payload;
    },
    resetConstraintsStoreState: (state) => {
      state.constraintsLoader = false;
      state.constraintsOmsLoader = false;
      state.constraintsTableConfigLoader = false;
      state.constraintsStatusTableDataLoader = false;
      state.constraintsStatusTableConfigLoader = false;
      state.constraintsOrderingTableDataLoader = false;
      state.constraintsOrderingTableConfigLoader = false;
      state.constraintsOrderPolicyTableDataLoader = false;
      state.constraintsOrderPolicyTableConfigLoader = false;
      state.constraintsSafetyStockTableDataLoader = false;
      state.constraintsSafetyStockTableConfigLoader = false;
      state.constraintsDeleiveryLeadTimeTableDataLoader = false;
      state.constraintsDeleiveryLeadTimeTableConfigLoader = false;
      state.constraintsDeleiveryQcTimeTableDataLoader = false;
      state.constraintsDeleiveryQcTimeTableConfigLoader = false;
      state.constraintsPoConversionTableConfigLoader = false;
      state.constraintsPoConversionTableDataLoader = false;
      state.constraintsTableConfig = [];
      state.constraintsTableData = [];
      state.selectedConstraintArticles = [];
      state.selectedStoreCodes = [];
      state.selectedFilters = [];
      state.selectedOmsFilters = [];
      state.inventorysmartConstraintsFilterDependency = [];
      state.inventorysmartConstraintsOmsFilterDependency = [];
      state.inventorysmartConstraintsOmsFilterElements = [];
      state.constraintsOmsTableData = [];
      state.constraintsEditFailed = false;
      state.constraintsEditSuccess = false;
      state.constraintsSetAllFailed = false;
      state.constraintsSetAllSuccess = false;
      state.isFilterOmsValid = false;
      state.constraintsUserReserveFilterConfig = [];
      state.constraintsUserReserveLoader = false;
      state.constraintsSMALoader = false;
      state.constraintsSMAFilterConfig = [];
      state.popUpLinkFromDashbaord = null;
      state.constraintsUserReserveSetAllForm = [];
    },
  },
});

export const {
  setConstraintsLoader,
  setConstraintsOmsLoader,
  setConstraintsTableConfigLoader,
  setConstraintsArticles,
  setConstraintsStoreCodes,
  setSelectedFilters,
  setSelectedOmsFilters,
  setInventorysmartConstraintsFilterDependency,
  setInventorysmartConstraintsOmsFilterElements,
  setInventorysmartConstraintsOmsFilterDependency,
  resetConstraintsStoreState,
  setConstraintsStatusTableDataLoader,
  setConstraintsStatusTableConfigLoader,
  setConstraintsOrderingTableDataLoader,
  setConstraintsOrderingTableConfigLoader,
  setConstraintsOrderPolicyTableDataLoader,
  setConstraintsOrderPolicyTableConfigLoader,
  setConstraintsSafetyStockTableDataLoader,
  setConstraintsSafetyStockTableConfigLoader,
  setConstraintsDeleiveryLeadTimeTableDataLoader,
  setConstraintsDeleiveryLeadTimeTableConfigLoader,
  setConstraintsDeleiveryQcTimeTableDataLoader,
  setConstraintsDeleiveryQcTimeTableConfigLoader,
  setConstraintsPoConversionTableDataLoader,
  setConstraintsPoConversionTableConfigLoader,
  setConstraintsEditFailed,
  setConstraintsEditSuccess,
  setConstraintsSetAllFailed,
  setConstraintsSetAllSuccess,
  setIsFilterOmsValid,
  setConstraintsUserReserveFilterConfig,
  setConstraintsUserReserveLoader,
  setConstraintsSMALoader,
  setConstraintsSMAFilterConfig,
  setPopUpLinkFromDashbaord,
  setConstraintsUserReserveSetAllForm,
} = inventorySmartConstraintsService.actions;

export const getStoreTableData = (dimension, postBody) => () => {
  return axiosInstance({
    url: `${GET_STORE_LEVEL_TABLE_DATA}`, ///${dimension}
    method: "POST",
    data: postBody,
  });
};

export const getStoreCustomTableData = (postBody) => () => {
  return axiosInstance({
    url: `${GET_STORE_LEVEL_CUSTOM_TABLE_DATA}`,
    method: "POST",
    data: postBody,
  });
};

export const getStoreGradeTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_GRADE_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getStoreGroupTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_GROUP_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};
export const getStoreGroupAggregateData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_GROUP_AGGREGATE,
    method: "POST",
    data: postBody,
  });
};
export const getStoreGradeAggregateData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_GRADE_AGGREGATE,
    method: "POST",
    data: postBody,
  });
};

export const getStoreModalTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_MODAL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getStoreWeekTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_WEEK_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const saveStoreTableData = (postBody, timebased = false) => () => {
  return axiosInstance({
    url: timebased
      ? POST_STORE_LEVEL_TIME_BASED_TABLE_DATA
      : POST_STORE_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const saveStoreWeekTableData = (postBody) => () => {
  return axiosInstance({
    url: POST_STORE_WEEK_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const setAllTableData = (postBody, screen = "constraint") => () => {
  return axiosInstance({
    url: postBody.jobIdCheck
      ? `${UPDATE_CONSTRAINTS_SET_ALL_WITH_JOBID}/job-id/${postBody.jobIdCheck}/view-type/${screen}`
      : SET_ALL_TABLE_DATA,
    method: "POST",
    data: postBody.body,
  });
};

// For OMS

export const getConstraintOmsFilterConfiguration = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_OMS_FILTER_CONFIG,
    method: "GET",
  });
};

export const getConstraintsStatusTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_STATUS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsStatusTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_STATUS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsStatusDownloadTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_STATUS_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderingTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDERING_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsOrderingTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDERING_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderingTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDERING_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderPolicyTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsOrderPolicyTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderPolicyTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsSafetyStockTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryLeadTimeTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsDeleiveryLeadTimeTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryLeadTimeDownlaodTableData = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryQcTimeTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_QC_TIME_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsDeleiveryQcTimeTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_QC_TIME_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryQcTimeDownloadTableData = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_QC_TIME_DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsPoConversionTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_PO_CONVERSION_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsPoConversionTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_PO_CONVERSION_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsPoConversionTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_PO_CONVERSION_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

// Edit Api

export const setConstraintsStatusData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_STATUS,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsDeliveryLeadTimeData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsDeliveryQcTimeData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_DELIVERY_QC_TIME,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsOrderingData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDERING,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsOrderPolicyData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDER_POLICY,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_SAFETY_STOCK,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsPoConveersionData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_PO_CONVERSION,
    method: "POST",
    data: postBody,
  });
};

export const getUserReserveInvData = (postBody) => () => {
  return axiosInstance({
    url: USER_RESERVE_INV_LIST,
    method: "POST",
    data: postBody,
  });
};

export const updateUserReserve = (postBody) => () => {
  return axiosInstance({
    url: USER_RESERVE_INV_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const fetchUserReserveSetAllFields = () => () => {
  return axiosInstance({
    url: USER_RESERVE_SET_ALL_FIELDS,
    method: "GET",
  });
};

export const updateSetAllUserReserve = (postBody) => () => {
  return axiosInstance({
    url: USER_RESERVE_SET_ALL_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const getSMAInvData = (postBody) => () => {
  return axiosInstance({
    url: SMA_VIEW_TABLE,
    method: "POST",
    data: postBody,
  });
};

export const saveSMAEdits = (postBody) => () => {
  return axiosInstance({
    url: SMA_TABLE_ROW_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const saveSMASetAllEdits = (postBody) => () => {
  return axiosInstance({
    url: SMA_TABLE_SET_ALL_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const downloadStoreConstraintsData = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_STORE_CONSTRAINTS_DATA}`,
    method: "POST",
    data: postbody,
  });
};

export const downloadStoreCustomConstraintsData = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_STORE_CUSTOM_CONSTRAINTS_DATA}`,
    method: "POST",
    data: postbody,
  });
};

export const downloadStoreGradeConstraintsData = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_STORE_GRADE_CONSTRAINTS_DATA}`,
    method: "POST",
    data: postbody,
  });
};

export const downloadStoreGroupConstraintsData = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_STORE_GROUP_CONSTRAINTS_DATA}`,
    method: "POST",
    data: postbody,
  });
};

export const downloadStoreWeekConstraintsData = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_STORE_WEEK_CONSTRAINTS_DATA}`,
    method: "POST",
    data: postbody,
  });
}

export const fetchSetAllSKUCount = (postbody, screen = "constraint") => () => {
  return axiosInstance({
    url: `${FETCH_SKU_COUNT_AND_JOB_ID}/${screen}`,
    method: "POST",
    data: postbody,
  });
};

export const fetchSetAllStoreWeekRecordCount = (postbody) => () => {
  return axiosInstance({
    url: FETCH_STORE_WEEK_SKU_COUNT_AND_JOB_ID,
    method: "POST",
    data: postbody,
  });
};

export const uploadConstraintsFile = (postbody) => () => {
  return axiosInstance({
    url: `${UPLOAD_FILE}/constraint`,
    method: "POST",
    data: postbody,
  });
};

export const constraintsCheckDownload = (postbody) => () => {
  return axiosInstance({
    url: `${CONSTRAINTS_CHECK_DOWNLOAD_REQUEST}`,
    method: "POST",
    data: postbody,
  });
};

export const uploadUserReserveFile = (postbody) => () => {
  return axiosInstance({
    url: "/inventory-smart/inventory-hold/upload-user-reserve",
    method: "POST",
    data: postbody,
  });
};

export const productStoreGroupMappingFile = (postbody) => () => {
  return axiosInstance({
    url: `${UPLOAD_FILE}/productrule`,
    method: "POST",
    data: postbody,
  });
};
export const userReserveCheckDownload = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_CHECK_FOR_USER_RESERVE}`,
    method: "POST",
    data: postbody,
  });
};

export const uploadBackDoorAllocationFile = (postbody) => () => {
  return axiosInstance({
    url: `/inventory-smart/simulation/upload-allocation`,
    method: "POST",
    data: postbody,
  });
};

export const getWeekFilterOptions = () => () => {
  return axiosInstance({
    url: GET_WEEK_FILTER_OPTIONS,
    method: "GET",
  });
};

export default inventorySmartConstraintsService.reducer;
