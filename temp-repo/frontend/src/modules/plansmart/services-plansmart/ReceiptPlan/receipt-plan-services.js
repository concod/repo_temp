import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  PLANSMART_CREATE_RECEIPT_PLAN,
  PLANSMART_RECEIPT_PLAN_TABLE_CONFIG,
  PLANSMART_RECEIPT_PLAN_DETAIL,
} from "../../constants-plansmart/apiConstants";
export const createNewReceiptPlan = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: PLANSMART_CREATE_RECEIPT_PLAN,
    method: "POST",
    data: postBody,
    isV3: true,
  });
};

export const getReceiptPlanTableConfig = (plancode) => async (dispatch) => {
  return axiosInstance({
    url: `${PLANSMART_RECEIPT_PLAN_TABLE_CONFIG}/${plancode}`,
    method: "GET",
    isV3: true,
  });
};

export const getReceiptPlanDetail = (payload) => async (dispatch) => {
  return axiosInstance({
    url: PLANSMART_RECEIPT_PLAN_DETAIL,
    method: "POST",
    data: payload, 
    isV3: true
  })
}
