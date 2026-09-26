import axiosInstance from "core/Utils/axios";
import { OMS_UNIFIED_EDIT } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/.../unified-edit — Product Details parent Save.
 * Stamps kind + is_v3 only (no OM screen_id on Product Details).
 */
export async function unifiedEditStyleOrderSummary({
  payload,
  isV3Schema = false,
}) {
  const response = await axiosInstance({
    url: OMS_UNIFIED_EDIT,
    method: "POST",
    isV3: true,
    data: {
      ...payload,
      kind: "style_order_summary",
      is_v3: Boolean(isV3Schema),
    },
  });
  return response;
}

/**
 * POST /api/v3/.../unified-edit — Product Details subclass Save.
 */
export async function unifiedEditDirectRow({
  payload,
  isV3Schema = false,
}) {
  const response = await axiosInstance({
    url: OMS_UNIFIED_EDIT,
    method: "POST",
    isV3: true,
    data: {
      ...payload,
      kind: "direct_row",
      is_v3: Boolean(isV3Schema),
    },
  });
  return response;
}
