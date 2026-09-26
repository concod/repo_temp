import {
  DC_LIST,
  GET_FISCAL_CALENDAR,
  INVENTORY_DC_STORE_VIEW,
  INVENTORY_DC_VIEW,
  INVENTORY_OVERALL_VIEW,
  INVENTORY_PRODUCT_VIEW,
  INVENTORY_STORE_VIEW,
} from "../../config/api";
import axiosInstance from "../Utils/axios";

export const getDCValues = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: `${DC_LIST}`,
    method: "POST",
    data: postBody,
  });
};

export const getCoreFiscalCalendar = async () => {
  return axiosInstance.get(GET_FISCAL_CALENDAR);
};

export const getOverallList = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: `${INVENTORY_OVERALL_VIEW}`,
    method: "POST",
    data: postBody,
  });
};

export const getDCList = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: `${INVENTORY_DC_VIEW}`,
    method: "POST",
    data: postBody,
  });
};

export const getDCStoreList = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: `${INVENTORY_DC_STORE_VIEW}`,
    method: "POST",
    data: postBody,
  });
};

export const getStoreList = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: `${INVENTORY_STORE_VIEW}`,
    method: "POST",
    data: postBody,
  });
};

export const getProductList = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: `${INVENTORY_PRODUCT_VIEW}`,
    method: "POST",
    data: postBody,
  });
};
