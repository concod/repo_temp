import axiosInstance from "core/Utils/axios";
import {
  CREATE_SCENARIO_SIMULATE_SCENARIO_DOWNLOAD_V3,
  CREATE_SCENARIO_SIMULATE_SCENARIO_V3,
} from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/simulate-scenario
 * Create-scenario step-2 simulate for new Order Management.
 * Returns an axios-shaped envelope so callers can keep
 * `response.data.data.scenario` / `deep_dive_scenario` / `aggregated_data`.
 */
export async function fetchSimulateScenarioV3(payload, { isDownload = false } = {}) {
  const response = await axiosInstance({
    url: isDownload
      ? CREATE_SCENARIO_SIMULATE_SCENARIO_DOWNLOAD_V3
      : CREATE_SCENARIO_SIMULATE_SCENARIO_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  const result =
    envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)
      ? envelope.data
      : {};
  return {
    data: {
      status: envelope.status !== false,
      data: result,
      total: envelope.total ?? result?.total,
      message: envelope.message,
    },
  };
}
