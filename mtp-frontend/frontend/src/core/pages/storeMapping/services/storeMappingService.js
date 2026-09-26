import {
  GET_PRODUCT_GROUPS,
  MAP_STORE_TO_PRODUCT,
  POST_STORES_TO_PRODUCT,
  POST_STORES_GROUP_TO_PRODUCT,
  GET_STORE_TO_DC,
  MAP_STORE_TO_FC,
  MAP_STORE_TO_DC,
  GET_STORE_TO_FC,
  GET_ALL_DC,
  GET_ALL_FC,
  GET_REF_STORES,
  GET_STORES_Product,
  GET_STORES_GROUPS_Product,
  UNMAPPED_STORE_PRODUCT,
  UNMAPPED_STORE_GROUP_PRODUCT,
  GET_MAPPED_PRODUCT_STORE,
  GET_MAPPED_PRODUCT_STORE_GROUP,
  GET_ALL_DC_BY_FILTERS,
} from "config/api";
import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

export const storeMappingService = createSlice({
  name: "storeMappingService",
  initialState: {
    isAggregated: false,
    tenantUploadConfig: {},
  },
  reducers: {
    setIsAggregated: (state, action) => {
      state.isAggregated = action.payload;
    },
    setTenantUploadConfig: (state, action) => {
      state.tenantUploadConfig = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setIsAggregated, setTenantUploadConfig } = storeMappingService.actions;

export const getAllProductGroups = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_PRODUCT_GROUPS}`,
    method: "POST",
    data: postBody,
  });
};

export const mapStoretoProducts = (postBody) => async () => {
  return axiosInstance({
    url: `${MAP_STORE_TO_PRODUCT}`,
    method: "POST",
    data: postBody,
  });
};

export const getAllStoreDC = (postBody, queryParams = "") => async () => {
  return axiosInstance({
    url: `${GET_STORE_TO_DC}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllDC = () => async () => {
  return axiosInstance({
    url: `${GET_ALL_DC}`,
    method: "GET",
  });
};
export const getAllDCByFilters = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_ALL_DC_BY_FILTERS}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllStoreFC = (postBody, queryParams = "") => async () => {
  return axiosInstance({
    url: `${GET_STORE_TO_FC}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllFC = () => async () => {
  return axiosInstance({
    url: `${GET_ALL_FC}`,
    method: "GET",
  });
};

export const mapStoretoDC = (postBody, isSetAll = false) => async () => {
  if (isSetAll) {
    return axiosInstance({
      url: `/store-mapping/map-store-to-dc/set-all`,
      method: "POST",
      data: postBody,
    });
  }
  return axiosInstance({
    url: `${MAP_STORE_TO_DC}`,
    method: "POST",
    data: postBody,
  });
};
export const mapStoretoFC = (postBody) => async () => {
  return axiosInstance({
    url: `${MAP_STORE_TO_FC}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllStoreAndGroup = (screen, postBody) => async () => {
  return axiosInstance({
    url: `/master/${screen}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllRefStores = () => async () => {
  return axiosInstance({
    url: `${GET_REF_STORES}`,
    method: "GET",
  });
};
export const getAllStoreProducts = (
  postBody,
  queryParams = "",
  level = ""
) => async () => {
  return axiosInstance({
    url: `${GET_STORES_Product}?level=${level}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllStoreGroupProducts = (
  postBody,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `${GET_STORES_GROUPS_Product}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const mapStoreToProduct = (postBody, level) => async () => {
  return axiosInstance({
    url: `${POST_STORES_TO_PRODUCT}?store_level=store&level=${level}`,
    method: "POST",
    data: postBody,
  });
};
export const mapStoreGroupToProduct = (postBody) => async () => {
  return axiosInstance({
    url: `${POST_STORES_GROUP_TO_PRODUCT}`,
    method: "POST",
    data: postBody,
  });
};
export const unMappedStoreToProduct = (postBody) => async () => {
  return axiosInstance({
    url: `${UNMAPPED_STORE_PRODUCT}`,
    method: "POST",
    data: postBody,
  });
};
export const unMappedStoreGroupToProduct = (postBody) => async () => {
  return axiosInstance({
    url: `${UNMAPPED_STORE_GROUP_PRODUCT}`,
    method: "POST",
    data: postBody,
  });
};
export const getMappedProductsInSTore = (
  postBody,
  store,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `${GET_MAPPED_PRODUCT_STORE}${store}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getMappedProductsInStoreGroup = (
  postBody,
  store,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `${GET_MAPPED_PRODUCT_STORE_GROUP}${store}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const validateTimeBounds = (timeboundObject) => async () => {
  return axiosInstance({
    url: `/product-mapping/setall`,
    method: "POST",
    data: timeboundObject,
  });
};

export const getMappedDates = (payload, queryParams = "") => async () => {
  return axiosInstance({
    url: `/store-mapping/mapped-stores${queryParams}`,
    method: "POST",
    data: payload,
  });
};

export const editOrDelete = (payload, isAggregated) => async () => {
  const queryParams = isAggregated ? "?level=aggregation" : "?level=product";
  return axiosInstance({
    url: `/store-mapping/edit-or-delete${queryParams}`,
    method: "POST",
    data: payload,
  });
};

export const setAllStoreMappingAPI = (setAllBody, level = "") => async () => {
  const response = await axiosInstance({
    url: `/store-mapping/store-to-product/set-all?store_level=store&level=${level}`,
    method: "POST",
    data: setAllBody,
  });
  return response.data;
};

export const getSelectAllStoresData = (postBody) => async () => {
  return axiosInstance({
    url: `/store-mapping/stores/pagination`,
    method: "POST",
    data: postBody,
  });
};

export const fetchUploadConfig = async () => {
  return axiosInstance({
    url: `/core/download-template?config=ps_mapping_upload_template`,
    method: "GET",
  });
}

export const uploadMappings = async (postbody) => {
  return axiosInstance({
    url: `/core/product/sheet-validation/upload`,
    method: "POST",
    data: postbody,
  });
}

export default storeMappingService.reducer;
