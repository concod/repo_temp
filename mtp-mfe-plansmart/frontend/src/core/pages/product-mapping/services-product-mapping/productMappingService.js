import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { MAP_PRODUCTS_TO_STORE_GROUP } from "config/api";

export const productMappingService = createSlice({
  name: "productMappingService",
  initialState: {
    selectedFilters: [],
    productMappingFilterDependency: [],
    selectedProductMappingArticles: [],
    productPOMapping: [],
    productASNMapping: [],
    productDCMapping: [],
    productFCMapping: [],
    allDCs: [],
    allFCs: [],
    isAggregated: false,
    isDcMappingAggregated: false,
    newExceptionObject: {
      rule_codes: [],
      store_codes: [],
    },
    tenantUploadConfig: {},
  },
  reducers: {
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setProductMappingFilterDependency: (state, action) => {
      state.productMappingFilterDependency = action.payload;
    },
    setSelectedProductMappingArticles: (state, action) => {
      state.selectedProductMappingArticles = action.payload;
    },
    resetProductMappingStates: (state) => {
      state.selectedFilters = [];
      state.productMappingFilterDependency = [];
      state.selectedProductMappingArticles = [];
    },
    setProductAsnMappings: (state, action) => {
      state.productASNMapping = action.payload;
    },
    setProductPOMapping: (state, action) => {
      state.productPOMapping = action.payload;
    },
    setIsAggregated: (state, action) => {
      state.isAggregated = action.payload;
    },
    setIsDCMappingAggregated: (state, action) => {
      state.isDcMappingAggregated = action.payload;
    },
    setNewExceptionPayload: (state, action) => {
      state.newExceptionObject = {
        ...state.newExceptionObject,
        ...action.payload,
      };
    },
    setTenantUploadConfig: (state, action) => {
      state.tenantUploadConfig = action.payload;
    },
    resetNewExceptionStates: (state) => {
      state.newExceptionObject = {};
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setSelectedFilters,
  setProductMappingFilterDependency,
  setSelectedProductMappingArticles,
  setNewExceptionPayload,
  resetNewExceptionStates,
  resetProductMappingStates,
  setProductAsnMappings,
  setProductPOMapping,
  setIsAggregated,
  setIsDCMappingAggregated,
  setTenantUploadConfig,
} = productMappingService.actions;

export const mapProductsToStoreGroup = (postBody, queryParams = "") => () => {
  return axiosInstance({
    url: `${MAP_PRODUCTS_TO_STORE_GROUP}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const setAllProductMappingAPI = (setAllBody, level = "") => async () => {
  const response = await axiosInstance({
    url: `/product-mapping/product-to-store/set-all?product_level=${level}`,
    method: "POST",
    data: setAllBody,
  });
  return response.data;
};

export const getAllProductGroups = (postBody) => async () => {
  return axiosInstance({
    url: `/master/products?product_level=product_group`,
    method: "POST",
    data: postBody,
  });
};

export const mapProductToStore = (postBody, isAggregated) => async () => {
  const queryParams = isAggregated ? "aggregation" : "product";
  return axiosInstance({
    url: `/product-mapping/product-to-store/inline-save?product_level=${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const getAllProductDC = (postBody, queryParams = "") => async () => {
  return axiosInstance({
    url: `/product-mapping/product-dc${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllDC = () => async () => {
  return axiosInstance({
    url: `/master/dc`,
    method: "GET",
  });
};
export const getAllProductFC = (postBody, queryParams = "") => async () => {
  return axiosInstance({
    url: `/product-mapping/product-fc${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const getAllFC = () => async () => {
  return axiosInstance({
    url: `/master/fc`,
    method: "GET",
  });
};

export const mapProductToDC = (
  postBody,
  isSetAll,
  isAggregated = false
) => async () => {
  const queryParams = isAggregated ? "?level=aggregation" : "?level=product";
  if (isSetAll) {
    return axiosInstance({
      url: `/product-mapping/map-product-dc/set-all${queryParams}`,
      method: "POST",
      data: postBody,
    });
  }
  return axiosInstance({
    url: `/product-mapping/map-product-dc/inline-save${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const mapProductToFC = (postBody) => async () => {
  return axiosInstance({
    url: `/product-mapping/map-product-fc`,
    method: "POST",
    data: postBody,
  });
};
export const getAllProductStores = (postBody, queryParams = "") => async () => {
  return axiosInstance({
    url: `/product-mapping/stores${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const downloadAllProductStores = (
  postBody,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `/product-mapping/stores/download${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const getAllProductGroupStores = (
  postBody,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `/product-group-mapping/stores${queryParams}`,
    method: "POST",
    data: postBody,
  });
};
export const mapProductGroupToStore = (postBody) => async () => {
  return axiosInstance({
    url: `/product-group-mapping/product-group-to-store`,
    method: "POST",
    data: postBody,
  });
};
export const unMappedProductToStore = (postBody) => async () => {
  return axiosInstance({
    url: `/product-mapping/unmapped-products`,
    method: "POST",
    data: postBody,
  });
};
export const unMappedProductGroupToStore = (postBody) => async () => {
  return axiosInstance({
    url: `/product-group-mapping/unmapped-products`,
    method: "POST",
    data: postBody,
  });
};
export const getMappedStoresInProduct = (
  postBody,
  product,
  level = ""
) => async () => {
  let reqBody = {
    ...postBody,
    product_codes: product,
  };
  return axiosInstance({
    url: `/product-mapping/mapped-stores?level=${level}`,
    method: "POST",
    data: reqBody,
  });
};
export const getMappedStoresInProductGroup = (
  postBody,
  product_group,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `/product-group-mapping/stores/${product_group}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const validateProductMappingTimeBounds = (
  timeboundObject
) => async () => {
  return axiosInstance({
    url: `/store-mapping/setall`,
    method: "POST",
    data: timeboundObject,
  });
};

export const getViewMappedProductsData = (
  payload,
  queryParams = ""
) => async () => {
  return axiosInstance({
    url: `product-mapping/mapped-products${queryParams}`,
    method: "POST",
    data: payload,
  });
};

export const editOrDelete = (payload, isAggregated) => async () => {
  const queryParams = isAggregated ? "?level=aggregation" : "?level=product";
  return axiosInstance({
    url: `/product-mapping/edit-or-delete${queryParams}`,
    method: "POST",
    data: payload,
  });
};

export const fetchProductIdsInGrp = (IdsList) => async () => {
  return axiosInstance({
    url: `/core/group/products-list`,
    method: "POST",
    data: IdsList,
  });
};

export const fetchProductAsnMappings = (input) => async () => {
  return axiosInstance({
    url: `/master/product-asn/`,
    method: "POST",
    data: input,
  });
};

export const getAllDCs = () => async () => {
  const dcs = await axiosInstance({
    url: `/master/dc`,
    method: "GET",
  });
  return dcs.data.data;
};

export const updateProductAsnMapping = (input) => async (dispatch) => {
  return axiosInstance({
    url: `/master/product-asn/`,
    method: "PUT",
    data: input,
  });
};

export const updateProductPoMapping = (input) => async (dispatch) => {
  const poMappingData = await axiosInstance({
    url: `/master/product-po/`,
    method: "PUT",
    data: input,
  });
  return poMappingData;
};

export const getProductAsnMapping = (input) => () => {
  return axiosInstance({
    url: `/master/product-asn/`,
    method: "POST",
    data: input,
  });
};

export const getProductPoMapping = (input) => async () => {
  return axiosInstance({
    url: `/master/product-po/`,
    method: "POST",
    data: input,
  });
};

// Methods for Store Band Mapping
export const getRulesList = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/rules-list`,
    method: "POST",
    data: postBody,
  });
};

export const viewMappedStores = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/view-mapped-stores`,
    method: "POST",
    data: postBody,
  });
};

export const viewStoreTierList = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/store-tier-list`,
    method: "POST",
    data: postBody,
  });
};

export const listExceptions = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/exceptions-list`,
    method: "POST",
    data: postBody,
  });
};

export const getAllStores = async (postBody) => {
  return axiosInstance({
    url: `/master/stores?store_level=store`,
    method: "POST",
    data: postBody,
  });
};

export const newExceptionsListing = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/new-exception-listing`,
    method: "POST",
    data: postBody,
  });
};

export const fetchExceptionListings = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/exception-preview-screen`,
    method: "POST",
    data: postBody,
  });
}

export const modifyInlineEdits = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-rule/inline-save`,
    method: "PATCH",
    data: postBody,
  });
};

export const modifySetAll = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-rule/set-all`,
    method: "PATCH",
    data: postBody,
  });
};

export const editExceptionList = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-exception-preview/inline-save`,
    method: "PATCH",
    data: postBody,
  });
};

export const editManageExceptionList = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-exception/inline-save`,
    method: "PATCH",
    data: postBody,
  });
};

export const setAllExceptions = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-exception-preview/set-all`,
    method: "PATCH",
    data: postBody,
  });
};

export const setAllManageExceptions = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-exception/set-all`,
    method: "PATCH",
    data: postBody,
  });
};

export const finalizeExceptions = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/exception-preview-action`,
    method: "POST",
    data: postBody,
  });
}

export const fetchUploadtemplate = async (postBody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/upload-exception-template`,
    method: "POST",
    data: postBody,
  });
};

export const uploadExceptionList = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/upload-exception`,
    method: "POST",
    data: postbody,
  });
};

export const fetchAvailableRCL = async (moduleCode) => {
  return axiosInstance({
    url: `/core/rcl/${moduleCode}`,
    method: "GET",
  });
};

export const fetchRCLFilters = async (rcl_code) => {
  return axiosInstance({
    url: `/core/rcl/filters/${rcl_code}`,
    method: "GET",
  });
};

export const saveNewRule = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/rule-generation-and-mapping`,
    method: "POST",
    data: postbody,
  });
};

export const fetchReviewData = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/rule-review`,
    method: "POST",
    data: postbody,
  });
};

export const saveReviewData = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-new-rule/inline-save`,
    method: "POST",
    data: postbody,
  });
};

export const setAllReviewData = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/edit-new-rule/set-all`,
    method: "POST",
    data: postbody,
  });
};

export const finalizeReviewData = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/finalize`,
    method: "POST",
    data: postbody,
  });
};

export const deleteRule = async (postbody) => {
  return axiosInstance({
    url: `/core/rcl-mapping/delete`,
    method: "DELETE",
    data: postbody,
  });
};

export default productMappingService.reducer;
