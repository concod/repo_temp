import axiosInstance from "core/Utils/axios/index";
import { tenantConfigApiCache } from "../../actions/tenantConfigActions";

//fetch the validation data using report code
export const fileValidationStatus = (report_code) => {
  return axiosInstance({
    url: `core/uploads/${report_code}`,
    method: "GET",
  });
};

export const getKeyToLabelMapping = async (applicationCode = 3) => {
  return tenantConfigApiCache(applicationCode, {
    attribute_name: "upload_validation_label_mapping",
  })();
};

export const getModuleCodes = () => {
  const currentApp = "inventorysmart";
  return axiosInstance({
    url: `/core/configuration/modules?app=${currentApp}`,
    method: "GET",
  });
};
