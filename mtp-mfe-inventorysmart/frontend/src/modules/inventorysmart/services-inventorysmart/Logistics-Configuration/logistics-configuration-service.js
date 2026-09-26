import axiosInstance from "core/Utils/axios";
import {
  LOGISTIC_CONFIGURATION,
  LOGISTIC_CONFIGURATION_OPTIONS,
  LOGISTIC_STORE_GROUP_VALUES,
} from "../../constants-inventorysmart/apiConstants";

export const getLogisticConfiguration = () => () => {
  return axiosInstance({
    url: LOGISTIC_CONFIGURATION,
    method: "GET",
  });
};

export const getLogisticConfigurationOptions = () => () => {
  return axiosInstance({
    url: LOGISTIC_CONFIGURATION_OPTIONS,
    method: "GET",
  });
};

export const getLogisticPoolDropdownValues = (payload) => () => {
  return axiosInstance({
    url: LOGISTIC_STORE_GROUP_VALUES,
    method: "POST",
    data: payload,
  });
};

export const saveLogisticConfiguration = (payload) => () => {
  return axiosInstance({
    url: LOGISTIC_CONFIGURATION,
    method: "POST",
    data: payload,
  });
};
