import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/table/v3-deep-dive
 * ClickHouse-backed deep-dive chart/table for new OrderManagement Product Details.
 * Returns an axios-shaped envelope so shared chart tables can keep
 * `response.data.status` / `response.data.data` checks.
 */
export async function fetchDeepDiveTableDataV3(payload) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  const rows = Array.isArray(envelope.data)
    ? envelope.data
    : Array.isArray(envelope.data?.data)
    ? envelope.data.data
    : [];
  return {
    data: {
      status: envelope.status !== false,
      data: rows,
      message: envelope.message,
    },
  };
}
