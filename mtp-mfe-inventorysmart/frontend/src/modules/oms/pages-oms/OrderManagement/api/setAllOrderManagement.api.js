import axiosInstance from "core/Utils/axios";
import { OMS_ORDER_MANAGEMENT_SET_ALL } from "../../../constants-oms/apiConstants.js";

export async function setAllOrderManagement(payload) {
  const response = await axiosInstance({
    url: OMS_ORDER_MANAGEMENT_SET_ALL,
    method: "POST",
    isV3: true,
    data: payload,
  });

  if (response?.data?.data) {
    return response.data.data;
  }

  throw new Error(response?.data?.message || "Set all failed");
}
