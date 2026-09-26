import { createSlice } from "@reduxjs/toolkit";
import {
  ORDER_ALERTS_TABLE_CONFIG,
  ORDER_ALERTS_TABLE_DATA,
  RECOMMENDED_ALERTS_TABLE_DATA,
  RECOMMENDED_POPUP_ALERTS_TABLE_DATA,
  UPDATE_RESOLVED_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartOrderAlertsService = createSlice({
  name: "inventorySmartOrderAlertsService",
  initialState: {
    orderAlertsTableConfigLoader: false,
    orderAlertsTableDataLoader: false,
    OrderAlertsPopUpTableConfigLoader: false,
    OrderAlertsPopUpTableDataLoader: false,
  },
  reducers: {
    setOrderAlertsTableConfigLoader: (state, action) => {
      state.orderAlertsTableConfigLoader = action.payload;
    },
    setOrderAlertsTableDataLoader: (state, action) => {
      state.orderAlertsTableDataLoader = action.payload;
    },
    setOrderAlertsPopUpTableConfigLoader: (state, action) => {
      state.OrderAlertsPopUpTableConfigLoader = action.payload;
    },
    setOrderAlertsPopUpTableDataLoader: (state, action) => {
      state.OrderAlertsPopUpTableDataLoader = action.payload;
    },
  },
});

export const {
  setOrderAlertsTableConfigLoader,
  setOrderAlertsTableDataLoader,
  setOrderAlertsPopUpTableConfigLoader,
  setOrderAlertsPopUpTableDataLoader,
} = inventorySmartOrderAlertsService.actions;

export const getOrderAlertsTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderAlertsTableData = (postBody) => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getRecommendedOrderAlertsTableData = (postBody) => () => {
  return axiosInstance({
    url: `${RECOMMENDED_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
    method: "POST",
    data: postBody.data,
  });
};

export const getRecommendedOrderPopUpTableData = (postBody) => () => {
  return axiosInstance({
    url: `${RECOMMENDED_POPUP_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
    method: "GET",
  });
};

export const updateResolvedData = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_RESOLVED_DATA,
    method: "POST",
    data: postBody,
  });
};

// export const updateOrderModelStockValues = (postBody) => () => {
//   return axiosInstance({
//     url: postBody.url,
//     method: "PATCH",
//     data: postBody.data,
//   });
// };

// export const fetchStoreCodesForAlert = (postBody) => () => {
//   const queryParam = {
//     ...postBody,
//   };

//   return axiosInstance({
//     url: `${FETCH_INVENTORY_DASHBOARD_ALERTS_STORE_CODES}`,
//     params: queryParam,
//     method: "GET",
//   });
// };

export default inventorySmartOrderAlertsService.reducer;
