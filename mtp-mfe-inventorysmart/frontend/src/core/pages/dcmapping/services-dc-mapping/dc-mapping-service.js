import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_ALL_DC, GET_STORE_TO_DC } from "config/api";

export const dcMappingService = createSlice({
  name: "dcMappingService",
  initialState: {
    isAggregated: false,
  },
  reducers: {
    setDcMappingIsAggregated: (state, action) => {
      state.isAggregated = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setDcMappingIsAggregated } = dcMappingService.actions;

export const getAllStoreDC = (postBody, queryParams = "") => {
  return axiosInstance({
    url: `${GET_STORE_TO_DC}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllFCDC = (postBody) => {
  return axiosInstance({
    url: "/master/dcmapping/dc-fc",
    method: "POST",
    data: postBody,
  });
};
export const getAllDC = () => {
  return axiosInstance({
    url: `${GET_ALL_DC}`,
    method: "GET",
  });
};

export const mapDCtoFC = (postBody) => {
  return axiosInstance({
    url: "/master/dcmapping/dc-fc",
    method: "PUT",
    data: postBody,
  });
};

export const getAllProductDC = (postBody, queryParams = "") => {
  return axiosInstance({
    url: `/product-mapping/product-dc`,
    method: "POST",
    data: postBody,
  });
};

export const getAllStyleDC = (postBody, queryParams = "") => {
  return axiosInstance({
    url: `/master/dcmapping/dc-style`,
    method: "POST",
    data: postBody,
  });
};

export const getAllDCData = async (postBody, type, queryParams = "") => {
  const { default: agGridColumnFormatter } = await import("core/Utils/agGrid/column-formatter");
  let { data } = await axiosInstance({
    url: `/master/dcmapping/dc-columns/` + type,
    method: "POST",
    data: postBody,
  });
  return agGridColumnFormatter(data.data, {}, false);
};

export default dcMappingService.reducer;
