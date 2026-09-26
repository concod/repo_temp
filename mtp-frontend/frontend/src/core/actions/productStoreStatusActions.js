import axiosInstance from "../Utils/axios";
import { SET_PRODUCT_STATUS } from "./types";
import {
  GET_TABLE_DATA,
  GET_TABLE_DATA_AGGREGATE,
  SET_ALL_TABLE_DATA,
  VALIDATE_MAPPING,
  STYLE_PRODUCT_MAPPING,
  TIME_ATTRIBUTE,
  GET_TENANT_CONFIG,
  GET_MASTER_DIMENSION_DATA,
  DOWNLOAD_TABLE_DATA,
} from "../../config/api";
import { isEmpty } from "lodash";
import { SET_STORE_AUTO_ALLOCATION_ELIGIBILITY, SET_STORE_PREPACK_ELIGIBILITY } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const getStatusData = async (statusType, applicationCode = 3) => {
  //statusType: "product", "store"
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=core_status_options"}`,
    method: "GET",
  });

  return !isEmpty(data.data)
    ? data.data[0]?.attribute_value?.value?.[statusType]?.status
    : [];
};

export const getProductStatusData = (
  screen,
  postBody,
  queryParams = "",
  fromExceptionScreen = false
) => async () => {
  return axiosInstance({
    url: `${
      fromExceptionScreen ? GET_MASTER_DIMENSION_DATA : GET_TABLE_DATA
    }/${screen}${queryParams}`,
    method: "POST",
    data: postBody,
  });
};

export const getProductStatusStyleData = (screen, postBody) => async () => {
  return axiosInstance({
    url: `${GET_TABLE_DATA_AGGREGATE}/${screen}`,
    method: "POST",
    data: postBody,
  });
};

export const setStatusData = (screen, reqBody) => async () => {
  return axiosInstance({
    url: `${SET_ALL_TABLE_DATA}/${screen}`,
    method: "PATCH",
    data: reqBody,
  });
};

export const setUpdateStatusData = (dimension, level, reqBody) => async () => {
  return axiosInstance({
    url: `${TIME_ATTRIBUTE}/${dimension}?level=${level}`,
    method: "PATCH",
    data: reqBody,
  });
};

export const mapProductData = (screen, reqBody) => async () => {
  return axiosInstance({
    url: `${GET_TABLE_DATA}/${screen}`,
    method: "PATCH",
    data: reqBody,
  });
};
export const mapStyleProductData = (reqBody) => async () => {
  return axiosInstance({
    url: `${STYLE_PRODUCT_MAPPING}`,
    method: "PATCH",
    data: reqBody,
  });
};

export const createNewProduct = (screen, reqBody) => async () => {
  return axiosInstance({
    url: `${GET_TABLE_DATA}/${screen}`,
    method: "PUT",
    data: reqBody,
  });
};
export const checkValidationForMapping = (queryParams) => async () => {
  return axiosInstance({
    url: `${VALIDATE_MAPPING}${queryParams}`,
    method: "GET",
  });
};
export const setProductStatusData = (data) => async (dispatch) => {
  dispatch({
    type: SET_PRODUCT_STATUS,
    payload: {
      status: data,
    },
  });
};

export const setStorePrePackEligibility = (reqBody) =>{
  return axiosInstance({
    url: SET_STORE_PREPACK_ELIGIBILITY,
    method: "PATCH",
    data:reqBody
  });
};

/**
 * @function
 * @param {Object} data 
 * @returns {Object} Promise
 */
export const downloadTableData = async (postBody) => {
  return axiosInstance({
    url: DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const setStoreAutoALlocationEligibility = (reqBody) =>{
  return axiosInstance({
    url: SET_STORE_AUTO_ALLOCATION_ELIGIBILITY,
    method: "PATCH",
    data:reqBody
  });
};