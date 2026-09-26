import axiosInstance from "core/Utils/axios";
import {
  ORDER_MANAGEMENT_APPROVAL_PANE_CROSS_FILTER,
  ORDER_MANAGEMENT_APPROVAL_PANE_FILTER_ORDERS,
  ORDER_MANAGEMENT_APPROVAL_PANE_SEND_FOR_APPROVAL,
} from "../../../constants-oms/apiConstants.js";

export async function fetchApprovalPaneCrossFilter(payload) {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_PANE_CROSS_FILTER,
    method: "POST",
    isV3: true,
    data: payload,
  });
}

export async function fetchApprovalPaneFilterOrders(payload) {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_PANE_FILTER_ORDERS,
    method: "POST",
    isV3: true,
    data: payload,
  });
}

export async function sendApprovalPaneForApproval(payload) {
  return axiosInstance({
    url: ORDER_MANAGEMENT_APPROVAL_PANE_SEND_FOR_APPROVAL,
    method: "POST",
    isV3: true,
    data: payload,
  });
}
