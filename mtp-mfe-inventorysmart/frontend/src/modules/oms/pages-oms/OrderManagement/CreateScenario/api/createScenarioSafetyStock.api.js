import axiosInstance from "core/Utils/axios";
import { CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/table/create_scenario/safety_stock_v3
 * ClickHouse-backed safety stock grid for new OrderManagement Create Scenario.
 * Returns an axios-shaped envelope so OrderCreateScenarioTable can keep
 * `response.data.status` / `response.data.data` / `response.data.total` checks.
 */
export async function fetchCreateScenarioSafetyStockV3(payload) {
  const response = await axiosInstance({
    url: CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA_V3,
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
      total: envelope.total ?? envelope.data?.total ?? rows.length,
      message: envelope.message,
    },
  };
}
