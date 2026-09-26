import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_STYLE_ORDER_DETAILED_SUMMARY_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /v3/.../get-style-order-detailed-summary-v3
 * Same payload shape as v2 detailed summary; response nests status_obj parents.
 */
export async function fetchStyleOrderDetailedSummaryV3(payload) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_DETAILED_SUMMARY_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  return {
    data: Array.isArray(envelope.data)
      ? envelope.data
      : Array.isArray(envelope.data?.data)
        ? envelope.data.data
        : [],
    total: envelope.total ?? envelope.data?.total ?? 0,
    message: envelope.message,
    status: envelope.status !== false,
  };
}
