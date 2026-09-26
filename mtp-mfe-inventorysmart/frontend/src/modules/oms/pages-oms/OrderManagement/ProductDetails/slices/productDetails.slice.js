import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  styleOrderSummaryLoader: false,
  styleOrderSummaryConfigLoader: false,
  styleOrderDetailedLoader: false,
  styleOrderDetailedConfigLoader: false,
  deepDiveFiltersLoader: false,
  deepDiveFiltersData: {},
  deepDiveFilterConfig: [],
  selectedStyles: [],
  styleFilterAttribute: "article",
};

const productDetailsSlice = createSlice({
  name: "productDetailsV3",
  initialState,
  reducers: {
    setStyleOrderSummaryLoader(state, action) {
      state.styleOrderSummaryLoader = Boolean(action.payload);
    },
    setStyleOrderSummaryConfigLoader(state, action) {
      state.styleOrderSummaryConfigLoader = Boolean(action.payload);
    },
    setStyleOrderDetailedLoader(state, action) {
      state.styleOrderDetailedLoader = Boolean(action.payload);
    },
    setStyleOrderDetailedConfigLoader(state, action) {
      state.styleOrderDetailedConfigLoader = Boolean(action.payload);
    },
    setDeepDiveFiltersLoader(state, action) {
      state.deepDiveFiltersLoader = Boolean(action.payload);
    },
    setDeepDiveFiltersData(state, action) {
      state.deepDiveFiltersData =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : {};
    },
    setDeepDiveFilterConfig(state, action) {
      state.deepDiveFilterConfig = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    setSelectedStyles(state, action) {
      state.selectedStyles = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    setStyleFilterAttribute(state, action) {
      state.styleFilterAttribute = action.payload || "article";
    },
    resetProductDetailsState() {
      return { ...initialState };
    },
  },
});

export const {
  setStyleOrderSummaryLoader,
  setStyleOrderSummaryConfigLoader,
  setStyleOrderDetailedLoader,
  setStyleOrderDetailedConfigLoader,
  setDeepDiveFiltersLoader,
  setDeepDiveFiltersData,
  setDeepDiveFilterConfig,
  setSelectedStyles,
  setStyleFilterAttribute,
  resetProductDetailsState,
} = productDetailsSlice.actions;

export const selectProductDetailsV3 = (store) =>
  store?.omsReducer?.orderManagementTableService?.productDetails ||
  initialState;

export default productDetailsSlice.reducer;
