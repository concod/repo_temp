import { createSlice } from "@reduxjs/toolkit";
import {
  FORECASTING_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  FORECASTING_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  FORECASTING_TOTAL_PROJECTIONS_GRAPH,
  FORECASTING_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  FORECASTING_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "core/Utils/axios";

export const reportsVendorProjectionsForecastService = createSlice({
  name: "reportsVendorProjectionsForecastService",
  initialState: {
    forecastScreenLoader: false,
    forecastDataLoader: false,
    forecastFiscalWeekGraph: [],
    forecastFilterConfig: [],
    forecastVendorTableConfigLoader: false,
    forecastVendorTableDataLoader: false,
    forecastVendorTableData: [],
    forecastVendorSkuTableConfigLoader: false,
    forecastVendorSkuTableDataLoader: false,
    forecastVendorSkuTableData: [],
    isFiltersValid: false,
    selectedFilters: null,
    forecastFilterElements: [],
    forecastFilterDependency: [],
    forecastFilterLoader: false,
  },
  reducers: {
    setForecastFilterElements: (state, action) => {
      state.forecastFilterElements = action.payload;
    },
    setForecastFilterDependency: (state, action) => {
      state.forecastFilterDependency = action.payload;
    },
    setForecastFilterLoader: (state, action) => {
      state.forecastFilterLoader = action.payload;
    },

    setForecastScreenLoader: (state, action) => {
      state.forecastScreenLoader = action.payload;
    },
    setForecastDataLoader: (state, action) => {
      state.forecastDataLoader = action.payload;
    },
    setForecastFiscalGraphData: (state, action) => {
      state.forecastFiscalWeekGraph = action.payload;
    },

    setForecastVendorTableConfigLoader: (state, action) => {
      state.forecastVendorTableConfigLoader = action.payload;
    },
    setForecastVendorTableDataLoader: (state, action) => {
      state.forecastVendorTableDataLoader = action.payload;
    },
    setForecastVendorTableData: (state, action) => {
      state.forecastVendorTableData = action.payload;
    },

    setForecastVendorSkuTableConfigLoader: (state, action) => {
      state.forecastVendorSkuTableConfigLoader = action.payload;
    },
    setForecastVendorSkuTableDataLoader: (state, action) => {
      state.forecastVendorSkuTableDataLoader = action.payload;
    },
    setForecastVendorSkuTableData: (state, action) => {
      state.forecastVendorSkuTableData = action.payload;
    },

    setForecastFilterConfig: (state, action) => {
      state.forecastFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearForecastStates: (state) => {
      state.forecastFilterElements = [];
      state.forecastFilterDependency = [];
      state.forecastFilterLoader = false;
      state.forecastScreenLoader = false;
      state.forecastDataLoader = false;
      state.forecastFiscalWeekGraph = [];
      state.forecastFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.forecastVendorTableData = [];
      state.forecastVendorTableDataLoader = false;
      state.forecastVendorTableConfigLoader = false;
      state.forecastVendorSkuTableData = [];
      state.forecastVendorSkuTableDataLoader = false;
      state.forecastVendorSkuTableConfigLoader = false;
    },
  },
});

export const {
  setForecastScreenLoader,
  setForecastDataLoader,
  setForecastFiscalGraphData,
  setForecastVendorTableConfigLoader,
  setForecastVendorTableDataLoader,
  setForecastVendorTableData,
  setForecastVendorSkuTableConfigLoader,
  setForecastVendorSkuTableDataLoader,
  setForecastVendorSkuTableData,
  setForecastFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  setForecastFilterElements,
  setForecastFilterDependency,
  setForecastFilterLoader,
  clearForecastStates,
} = reportsVendorProjectionsForecastService.actions;

export const getForecastFiscalWeekGraph = (postbody) => () => {
  return axiosInstance({
    url: FORECASTING_TOTAL_PROJECTIONS_GRAPH,
    method: "POST",
    data: postbody,
  });
};

export const getForecastVendorLevelTableConfig = (postbody) => () => {
  return axiosInstance({
    url: FORECASTING_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getForecastVendorLevelTableData = (postbody) => () => {
  return axiosInstance({
    url: FORECASTING_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getForecastVendorSkuLevelTableConfig = (postbody) => () => {
  return axiosInstance({
    url: FORECASTING_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getForecastVendorSkuLevelTableData = (postbody) => () => {
  return axiosInstance({
    url: FORECASTING_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const reportDownloadRequest = (screenName, postbody) => () => {
  // return axiosInstance({
  //   url: `${GET_REPORT_DOWNLOAD_REQUEST}?report_type=${screenName}`,
  //   method: "POST",
  //   data: postbody,
  // });
};

export default reportsVendorProjectionsForecastService.reducer;
