import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  STORE_TRANSFER_KPI,
  STORE_TRANSFER_STORE_VIEW,
  STORE_TRANSFER_PRODUCT_VIEW,
  STORE_TRANSFER_SIZE_VIEW,
  STORE_TRANSFER_PRODUCT_VIEW_SUMMARY,
  STORE_TRANSFER_STORE_VIEW_DETAIL,
  STORE_TRANSFER_STORE_VIEW_DETAIL_TRANSFER,
  STORE_TRANSFER_STORE_VIEW_DRILLDOWN,
  STORE_TRANSFER_STORE_VIEW_DRILLDOWN_PRODUCTS,
  STORE_TRANSFER_PRODUCT_VIEW_DRILLDOWN,
  PRODUCT_STORE_TRANSFER_VIEW,
  STORE_TRANSFER_VIEW,
  STORE_TRANSFER_VIEW_PRODUCTS,
  STORE_TRANSFER_EDIT,
  PRODUCT_RESET_TRANSFER_UNITS,
  STORE_TRANSFER_PRODUCT_VIEW_DRILLDOWN_PRODUCTS,
  STORE_TRANSFER_ACQUIRE_EDIT,
  STORE_TRANSFER_RELEASE_EDIT,
  STORE_TRANSFER_HEARTBEAT,
  STORE_TRANSFER_UPDATE_REVIEW_STATUS,
  ADD_TRANSFER_OPTIONS,
  ADD_TRANSFER_SIZES,
  EXPORT_PRODUCT_VIEW,
} from "../../constants-inventorysmart/apiConstants";

const initialState = {
  transferRecommendationsLoader: false,
  kpiLoader: false,
  planStatusLoader: false,
  storeViewLoader: false,
  transferCode: null,
  transferStatus: null,
  planStatus: null,
  planType: null,
  refreshKey: 0,
  editMode: "view",
  lockedAllocationCodes: [],
  microFilterLoader: false,
  microFilterDependency: [],
  microFilterSelectedFilters: [],
  microFilterConfig: [],
  microFilterAppliedData: {},
};

const createTransferRecommendationsSlice = createSlice({
  name: "createTransferRecommendationsService",
  initialState,
  reducers: {
    setKpiLoader: (state, action) => {
      state.kpiLoader = action.payload;
    },
    setPlanStatusLoader: (state, action) => {
      state.planStatusLoader = action.payload;
    },
    setStoreViewLoader: (state, action) => {
      state.storeViewLoader = action.payload;
    },
    setTransferCode: (state, action) => {
      state.transferCode = action.payload;
    },
    setTransferStatus: (state, action) => {
      state.transferStatus = action.payload;
    },
    setPlanStatus: (state, action) => {
      state.planStatus = action.payload;
    },
    setPlanType: (state, action) => {
      state.planType = action.payload;
    },
    setEditMode: (state, action) => {
      state.editMode = action.payload;
    },
    setLockedAllocationCodes: (state, action) => {
      state.lockedAllocationCodes = action.payload || [];
    },
    setMicroFilterLoader: (state, action) => {
      state.microFilterLoader = action.payload;
    },
    setMicroFilterDependency: (state, action) => {
      state.microFilterDependency = action.payload || [];
    },
    setMicroFilterSelectedFilters: (state, action) => {
      state.microFilterSelectedFilters = action.payload || [];
    },
    setMicroFilterConfig: (state, action) => {
      state.microFilterConfig = action.payload || [];
    },
    setMicroFilterAppliedData: (state, action) => {
      state.microFilterAppliedData = action.payload || {};
    },
    triggerRefresh: (state) => {
      state.refreshKey = state.refreshKey + 1;
    },
    resetTransferRecommendationsState: (state) => {
      return initialState;
    },
  },
});

export const {
  setKpiLoader,
  setPlanStatusLoader,
  setStoreViewLoader,
  setTransferCode,
  setTransferStatus,
  setPlanStatus,
  setPlanType,
  setEditMode,
  setLockedAllocationCodes,
  setMicroFilterLoader,
  setMicroFilterDependency,
  setMicroFilterSelectedFilters,
  setMicroFilterConfig,
  setMicroFilterAppliedData,
  triggerRefresh,
  resetTransferRecommendationsState,
} = createTransferRecommendationsSlice.actions;

export default createTransferRecommendationsSlice.reducer;

// API Actions

export const getTransferKPI = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_KPI,
    method: "POST",
    data: payload,
  });
};

export const getStatus = (payload) => () => {
  return axiosInstance({
    url: `/inventory-smart/finalize/get-plan-status`,
    method: "POST",
    data: {
      allocation_code: payload,
    },
  });
};

export const getStoreView = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_STORE_VIEW,
    method: "POST",
    data: payload,
  });
};

export const getProductView = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_PRODUCT_VIEW,
    method: "POST",
    data: payload,
  });
};

export const getProductViewSummary = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_PRODUCT_VIEW_SUMMARY,
    method: "POST",
    data: payload,
  });
};

export const getStoreViewDetail = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_STORE_VIEW_DETAIL,
    method: "POST",
    data: payload,
  });
};

export const getStoreViewDrilldown = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_STORE_VIEW_DRILLDOWN,
    method: "POST",
    data: payload,
  });
};

export const getStoreViewDrilldownProducts = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_STORE_VIEW_DRILLDOWN_PRODUCTS,
    method: "POST",
    data: payload,
  });
};

export const getSizeView = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_SIZE_VIEW,
    method: "POST",
    data: payload,
  });
};

export const getProductViewDrilldown = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_PRODUCT_VIEW_DRILLDOWN,
    method: "POST",
    data: payload,
  });
};

export const getProductViewDrilldownProducts = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_PRODUCT_VIEW_DRILLDOWN_PRODUCTS,
    method: "POST",
    data: payload,
  });
};

export const getProductStoreTransferView = (payload) => () => {
  return axiosInstance({
    url: PRODUCT_STORE_TRANSFER_VIEW,
    method: "POST",
    data: payload,
  });
};
export const getStoreTransferView = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_VIEW,
    method: "POST",
    data: payload,
  });
};
export const getStoreTransferViewProducts = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_VIEW_PRODUCTS,
    method: "POST",
    data: payload,
  });
};

export const getStoreTransferEdit = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_EDIT,
    method: "POST",
    data: payload,
  });
};

export const getStoreViewDetailTransferView = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_STORE_VIEW_DETAIL_TRANSFER,
    method: "POST",
    data: payload,
  });
};

export const resetTransferUnits = (payload) => () => {
  return axiosInstance({
    url: PRODUCT_RESET_TRANSFER_UNITS,
    method: "POST",
    data: payload,
  });
};

export const acquireEditLock = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_ACQUIRE_EDIT,
    method: "POST",
    data: payload,
  });
};

export const getAddTransferOptions = (payload) => () => {
  return axiosInstance({
    url: ADD_TRANSFER_OPTIONS,
    method: "POST",
    data: payload,
  });
};

export const releaseEditLock = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_RELEASE_EDIT,
    method: "POST",
    data: payload,
  });
};

export const editModeHeartbeat = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_HEARTBEAT,
    method: "POST",
    data: payload,
  });
};

export const updateReviewStatus = (payload) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_UPDATE_REVIEW_STATUS,
    method: "POST",
    data: payload,
  });
};

export const getAddTransferSizes = (payload) => () => {
  return axiosInstance({
    url: ADD_TRANSFER_SIZES,
    method: "POST",
    data: payload,
  });
};

export const exportProductView = (payload) => () => {
  return axiosInstance({
    url: EXPORT_PRODUCT_VIEW,
    method: "POST",
    data: payload,
  });
};
