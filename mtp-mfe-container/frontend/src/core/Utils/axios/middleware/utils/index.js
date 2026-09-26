import { API_METHOD } from "../constants";

export const getIsMethodGet = (method) => {
  return method.toLowerCase() === API_METHOD.GET;
};

export const getIsMethodPost = (method) => {
  return method.toLowerCase() === API_METHOD.POST;
};

export const generateCachedResponse = (axiosReqObj, data, args) => {
  const {
    status = 200,
    statusText = "OK",
    headers = {},
    request = {}
  } = args || {};

  const resObj = {
    data,
    status,
    statusText,
    headers,
    config: axiosReqObj,
    request,
  };

  return {
    ...axiosReqObj,
    adapter: () =>
      Promise.resolve(resObj),
  };
};
