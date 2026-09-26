import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /v3/.../get-style-order-summary-v3
 * Response shape matches v2: { data: rows, total }.
 */
export async function fetchStyleOrderSummaryV3(payload) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SUMMARY_V3,
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
    // paginate_data / CH endpoints may omit `status`; treat a resolved response as success
    status: envelope.status !== false,
  };
}
