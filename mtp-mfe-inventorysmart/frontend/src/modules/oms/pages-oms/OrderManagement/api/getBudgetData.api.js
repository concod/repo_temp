import axiosInstance from "core/Utils/axios";
import { GET_BUDGET_DATA_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/get-budget-data
 * ClickHouse-backed budget summary for new Order Management order-qty info popover.
 * Returns the summary object (same shape as legacy getBudgetData helper).
 */
export async function fetchBudgetDataV3(payload) {
  const { data } = await axiosInstance({
    url: GET_BUDGET_DATA_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  return data?.data ?? data;
}
