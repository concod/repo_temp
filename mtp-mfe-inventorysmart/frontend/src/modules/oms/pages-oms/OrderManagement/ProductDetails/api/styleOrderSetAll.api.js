import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_STYLE_ORDER_SET_ALL_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/style-order/set-all
 * Product Details Set All — hierarchy-scoped ROQ source update.
 * Caller must include body `is_v3` (V3 vs V4 CH schema) from matrix handoff.
 */
export async function setAllStyleOrderSummaryV3(payload) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_STYLE_ORDER_SET_ALL_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  return response;
}
