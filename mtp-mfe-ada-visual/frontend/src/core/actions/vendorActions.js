import axiosInstance from "../Utils/axios";

export const fetchVendorData = (body, apiUrl) => () => {
  return axiosInstance({
    url: apiUrl,
    method: "POST",
    data: body,
  });
};

export const setVendorData = (reqBody, apiUrl) => async () => {
  return axiosInstance({
    url: apiUrl,
    method: "PATCH",
    data: reqBody,
  });
};