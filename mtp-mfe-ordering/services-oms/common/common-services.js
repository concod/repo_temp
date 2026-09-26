import axiosInstance from "core/Utils/axios";
import {
  GET_FISCAL_CALENDAR,
  GET_FISCAL_WEEKS,
  GET_PACK_CONFIG_ROW_DATA,
  GET_PACK_CONFIG_COLUMN_DATA,
  SAFETY_STOCK_GRAPH_VIEW_DATA,
} from "modules/oms/constants-oms/apiConstants";

export const packConfigColumnData = async (payload) => {
  return axiosInstance({
    url: GET_PACK_CONFIG_COLUMN_DATA,
    method: "POST",
    data: payload,
  });
};

export const packConfigRowData = async (payload) => {
  return axiosInstance({
    url: GET_PACK_CONFIG_ROW_DATA,
    method: "POST",
    data: payload,
  });
};

export const fetchFiscalWeeksData = async (payload) => {
  return axiosInstance({
    url: GET_FISCAL_WEEKS,
    method: "POST",
    data: payload,
  });
};

export const getOmsCoreFiscalCalendar = async (queryParams = "") => {
  return axiosInstance({
    url: GET_FISCAL_CALENDAR,
    method: "GET",
  });
};

//Gets the Data for Safety Stock Chart
export const getSafetyStockGraph = (postBody) => () => {
  return axiosInstance({
    url: SAFETY_STOCK_GRAPH_VIEW_DATA,
    method: "POST",
    data: postBody,
  });
};
