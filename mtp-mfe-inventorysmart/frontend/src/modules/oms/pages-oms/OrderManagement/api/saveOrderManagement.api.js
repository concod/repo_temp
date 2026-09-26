import axiosInstance from "core/Utils/axios";
import { OMS_ORDER_MANAGEMENT_SAVE } from "../../../constants-oms/apiConstants.js";

/**
 * Persist pending edits (legacy explicit Save). Prefer auto-save via edit-cell;
 * kept for ActionContainer wiring until Save is fully removed from the chrome.
 */
export async function saveOrderManagement({
  viewContext,
  distributionMethod,
}) {
  const request = {
    module: "order-management",
    distribution_method: distributionMethod,
    ...(viewContext || {}),
  };

  const response = await axiosInstance({
    url: OMS_ORDER_MANAGEMENT_SAVE,
    method: "POST",
    isV3: true,
    data: request,
  });

  if (response?.data?.data) {
    return response.data.data;
  }

  throw new Error(response?.data?.message || "Order save failed");
}
