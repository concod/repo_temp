import axiosInstance from "core/Utils/axios/index";

// Endpoint to fetch the filter fieldnames
export const GET_FILTER_FIELDS = "/core/upload-filter-configuration/screen";

export const getFilterFields = (screenName) => {
  return axiosInstance({
    url: `${GET_FILTER_FIELDS}/${screenName}`,
    method: "GET",
  });
};

/**
 *
 * @param {String} baseUrl - Application route
 * @param {Object} formData - Binary Object for the file
 * @param {String} screenName - Route for filter for a particular screen
 * @returns
 */
export const uploadFilterExcel = (baseUrl, formData, screenName) => {
  return axiosInstance({
    url: `${baseUrl}/cross-filter-upload?screenName=${screenName}`,
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });
};
