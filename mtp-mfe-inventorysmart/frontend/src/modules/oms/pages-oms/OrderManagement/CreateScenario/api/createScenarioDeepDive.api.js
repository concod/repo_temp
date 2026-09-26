import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/table/v3-deep-dive
 * Create-scenario step-2 original deep-dive rows for new Order Management.
 * Always sends is_scenario: true (and is_download when downloading).
 */
export async function fetchCreateScenarioDeepDiveV3(
  payload,
  { isDownload = false, isV3Schema = false } = {}
) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_TABLE_DATA_V3,
    method: "POST",
    data: {
      ...payload,
      is_scenario: true,
      is_download: Boolean(isDownload),
      is_v3: Boolean(isV3Schema),
    },
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
