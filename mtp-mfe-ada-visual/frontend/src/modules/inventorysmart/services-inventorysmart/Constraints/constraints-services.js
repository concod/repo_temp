import { createSlice } from "@reduxjs/toolkit";
import { set } from "lodash";
import {
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
  SMA_VIEW_TABLE,
  SMA_TABLE_ROW_UPDATE,
  SMA_TABLE_SET_ALL_UPDATE,
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
  setConstraintsEditFailed,
  setConstraintsEditSuccess,
  setConstraintsSetAllFailed,
  setConstraintsSetAllSuccess,
  setIsFilterOmsValid,
  setConstraintsUserReserveFilterConfig,
  setConstraintsUserReserveLoader,
  setConstraintsSMALoader,
  setConstraintsSMAFilterConfig,
} = inventorySmartConstraintsService.actions;

export const getStoreTableData = (dimension, postBody) => () => {
  return axiosInstance({
    url: `${GET_STORE_LEVEL_TABLE_DATA}`, ///${dimension}
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

export const saveStoreTableData = (postBody) => () => {
  return axiosInstance({
    url: POST_STORE_LEVEL_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const setAllTableData = (postBody) => () => {
  return axiosInstance({
    url: SET_ALL_TABLE_DATA,
    method: "POST",
    data: postBody,
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

export default inventorySmartConstraintsService.reducer;
