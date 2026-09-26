import axiosInstance from "../../../../core/Utils/axios";
import {
  PRODUCT_PORT_OF_CALL_LIST,
  PRODUCT_PORT_OF_CALL_SET_ALL,
  PRODUCT_PORT_OF_CALL_MODIFY_TIME_PERIOD,
  PRODUCT_PORT_OF_CALL_UNMAP_SET_ALL,
} from "../../../../config/api";

/**
 * Get Product Port of Call List
 * @param {Object} postBody - Request body
 * @returns {Function} Thunk function
 */
export const getProductPortOfCallList = (postBody) => async () => {
  return axiosInstance({
    url: PRODUCT_PORT_OF_CALL_LIST,
    method: "POST",
    data: postBody,
  });
};

/**
 * Set All Product Port of Call
 * @param {Object} reqBody - Request body
 * @returns {Function} Thunk function
 */
export const setAllProductPortOfCall = (reqBody) => async () => {
  return axiosInstance({
    url: PRODUCT_PORT_OF_CALL_SET_ALL,
    method: "POST",
    data: reqBody,
  });
};

/**
 * Modify Product Port of Call Time Period
 * @param {Object} reqBody - Request body
 * @returns {Function} Thunk function
 */
export const modifyProductPortOfCallTimePeriod = (reqBody) => async () => {
  return axiosInstance({
    url: PRODUCT_PORT_OF_CALL_MODIFY_TIME_PERIOD,
    method: "POST",
    data: reqBody,
  });
};

/**
 * Unmap Set All Product Port of Call
 * @param {Object} reqBody - Request body
 * @returns {Function} Thunk function
 */
export const unmapSetAllProductPortOfCall = (reqBody) => async () => {
  return axiosInstance({
    url: PRODUCT_PORT_OF_CALL_UNMAP_SET_ALL,
    method: "POST",
    data: reqBody,
  });
};
