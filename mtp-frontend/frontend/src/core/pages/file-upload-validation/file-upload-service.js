import axiosInstance from "core/Utils/axios/index";
import { GET_TENANT_CONFIG } from "../../../config/api";

//fetch the validation data using report code
export const fileValidationStatus = (report_code) => {
  return axiosInstance({
    url: `core/uploads/${report_code}`,
    method: "GET",
  });
};

export const getKeyToLabelMapping = (applicationCode = 3) => {
  return axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=upload_validation_label_mapping"}`,
    method: "GET",
  });
};

export const getModuleCodes = () => {
  const currentApp = "inventorysmart";
  return axiosInstance({
    url: `/core/configuration/modules?app=${currentApp}`,
    method: "GET",
  });
};