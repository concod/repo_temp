import axiosInstance from "../../../../core/Utils/axios";
import {
  CHECK_SCENARIO_STATUS,
  DELETE_SCENARIO,
  EDIT_SCENARIO_INPUT,
  FINALIZE_SCENARIO,
  GET_ALLOCATION_SUMMARY,
  GET_PRODUCT_SIZE_DETAILS_IN_RECOMENDATION,
  GET_PRODUCT_STORE_DETAILS_IN_RECOMENDATION,
  GET_PRODUCT_STORE_VIEW_CREATE_SCENARIO,
  GET_PRODUCT_VIEW_IN_RECOMENDATION,
  GET_SCENARIO_KPI_TILES,
  GET_SCENARIO_PRODUCT_SIZE_STORE_VIEW,
  GET_SCENARIO_STORE_SIZE_VIEW,
  GET_STORE_PRODUCT_DETAILS_IN_RECOMENDATION,
  GET_STORE_VIEW_IN_RECOMENDATION,
  TRIGGER_SCENARIO,
} from "../../constants-inventorysmart/apiConstants";

export const getProductStoreViewInCreateScenario = (postBody) => () => {
  return axiosInstance({
    url: GET_PRODUCT_STORE_VIEW_CREATE_SCENARIO,
    method: "POST",
    data: postBody,
  });
};

export const editScenarioInput = (postBody) => () => {
  return axiosInstance({
    url: EDIT_SCENARIO_INPUT,
    method: "POST",
    data: postBody,
  });
};

export const getScenarioKpiTiles = (postBody) => () => {
  return axiosInstance({
    url: GET_SCENARIO_KPI_TILES,
    method: "POST",
    data: postBody,
  });
};

export const saveInputScenario = (postBody) => () => {
  return axiosInstance({
    url: TRIGGER_SCENARIO,
    method: "POST",
    data: postBody,
  });
};

export const finalizeScenario = (postBody) => () => {
  return axiosInstance({
    url: FINALIZE_SCENARIO,
    method: "POST",
    data: postBody,
  });
};

export const deleteScenario = (postBody) => () => {
  return axiosInstance({
    url: DELETE_SCENARIO,
    method: "POST",
    data: postBody,
  });
};

export const checkScenarioStatus = (postBody) => () => {
  return axiosInstance({
    url: CHECK_SCENARIO_STATUS,
    method: "POST",
    data: postBody,
  });
};

export const getAllocationSummary = (postBody) => () => {
  return axiosInstance({
    url: GET_ALLOCATION_SUMMARY,
    method: "POST",
    data: postBody,
  });
};

export const getProductStoreViewInRecomendation = (
  postBody,
  viewType = "product"
) => () => {
  return axiosInstance({
    url:
      viewType === "product"
        ? GET_PRODUCT_VIEW_IN_RECOMENDATION
        : GET_STORE_VIEW_IN_RECOMENDATION,
    method: "POST",
    data: postBody,
  });
};

export const downloadProductStoreViewDataInRecomendation = (
  postbody,
  viewType = "product"
) => () => {
  return axiosInstance({
    url:
      viewType === "product"
        ? `${GET_PRODUCT_VIEW_IN_RECOMENDATION}/download`
        : `${GET_STORE_VIEW_IN_RECOMENDATION}/download`,
    method: "POST",
    data: postbody,
  });
};

export const getProductStoreDetailsInRecomendation = (
  postBody,
  viewType
) => () => {
  const url =
    viewType === "product-size"
      ? GET_PRODUCT_SIZE_DETAILS_IN_RECOMENDATION
      : viewType === "product"
        ? GET_PRODUCT_STORE_DETAILS_IN_RECOMENDATION
        : GET_STORE_PRODUCT_DETAILS_IN_RECOMENDATION;

  return axiosInstance({
    url,
    method: "POST",
    data: postBody,
  });
};

export const getScenarioStoreSizeView = (postBody) => () => {
  return axiosInstance({
    url: GET_SCENARIO_STORE_SIZE_VIEW,
    method: "POST",
    data: postBody,
  });
};

export const getScenarioProductSizeStoreView = (postBody) => () => {
  return axiosInstance({
    url: GET_SCENARIO_PRODUCT_SIZE_STORE_VIEW,
    method: "POST",
    data: postBody,
  });
};
