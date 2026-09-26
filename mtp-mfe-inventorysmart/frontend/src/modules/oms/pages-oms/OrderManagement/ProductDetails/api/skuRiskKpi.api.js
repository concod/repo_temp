import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_SKU_RISK_KPI_DATA_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/table/deep-dive/sku-risk-kpi
 * Product Details SKU categorisation health-strip KPIs.
 * Caller must include body `is_v3` (V3 vs V4 CH schema) from matrix handoff.
 */
export async function fetchSkuRiskKpiDataV3(payload) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_SKU_RISK_KPI_DATA_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  return {
    data: envelope.data ?? {},
    message: envelope.message,
    status: envelope.status !== false,
  };
}
