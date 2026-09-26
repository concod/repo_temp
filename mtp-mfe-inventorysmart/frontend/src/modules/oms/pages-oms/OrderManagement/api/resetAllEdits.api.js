import axiosInstance from "core/Utils/axios";
import { OMS_ORDER_MANAGEMENT_REVERT_ALL } from "../../../constants-oms/apiConstants.js";

export async function resetAllEdits(payload) {
  const response = await axiosInstance({
    url: OMS_ORDER_MANAGEMENT_REVERT_ALL,
    method: "POST",
    isV3: true,
    data: payload,
  });

  if (response?.data?.data) {
    return response.data.data;
  }

  throw new Error(response?.data?.message || "Reset all edits failed");
}
