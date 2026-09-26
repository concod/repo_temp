import { createSlice } from "@reduxjs/toolkit";
import {
  STORE_INVENTORY_ALERTS_TABLE_CONFIG,
  STORE_INVENTORY_ALERTS_TABLE_DATA,
  FETCH_INVENTORY_DASHBOARD_ALERTS_STORE_CODES,
  DELETE_AUTO_ALLOCATION_ARTICLES,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartStoreInventoryAlertsService = createSlice({
  name: "inventorySmartStoreInventoryAlertsService",
  initialState: {
    storeInventoryAlertsTableConfigLoader: false,
    storeInventoryAlertsTableDataLoader: false,
    storeInventoryDeleteLoader: false,
    storeInventoryAlertsTableData: [],
    forecastAlertsTableData: [],
  },
  reducers: {
    setStoreInventoryAlertsTableConfigLoader: (state, action) => {
      state.storeInventoryAlertsTableConfigLoader = action.payload;
    },
    setStoreInventoryAlertsTableDataLoader: (state, action) => {
      state.storeInventoryAlertsTableDataLoader = action.payload;
    },
    setStoreInventoryDeleteLoader: (state, action) => {
      state.storeInventoryDeleteLoader = action.payload;
    },
    setStoreInventoryAlertsTableData: (state, action) => {
      state.storeInventoryAlertsTableData = action.payload;
    },
    setForecastAlertsTableData: (state, action) => {
      state.forecastAlertsTableData = action.payload;
    },
  },
});

export const {
  setStoreInventoryAlertsTableConfigLoader,
  setStoreInventoryAlertsTableDataLoader,
  setStoreInventoryDeleteLoader,
  setStoreInventoryAlertsTableData,
  setForecastAlertsTableData,
} = inventorySmartStoreInventoryAlertsService.actions;

export const getStoreInventoryAlertsTableConfiguration = () => () => {
  return axiosInstance({
    url: STORE_INVENTORY_ALERTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getStoreInventoryAlertsTableData = (postBody) => () => {
  return axiosInstance({
    url: STORE_INVENTORY_ALERTS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updateStoreInventoryModelStockValues = (postBody) => () => {
  return axiosInstance({
    url: postBody.url,
    method: "PATCH",
    data: postBody.data,
  });
};

export const fetchStoreCodesForAlert = (postBody) => () => {
  const queryParam = {
    ...postBody,
  };

  return axiosInstance({
    url: `${FETCH_INVENTORY_DASHBOARD_ALERTS_STORE_CODES}`,
    params: queryParam,
    method: "GET",
  });
};

export const deleteAutoAllocationArticles = (postBody) => async () => {
  return axiosInstance({
    url: `${DELETE_AUTO_ALLOCATION_ARTICLES}`,
    method: "DELETE",
    data: postBody,
  });
};

export default inventorySmartStoreInventoryAlertsService.reducer;
