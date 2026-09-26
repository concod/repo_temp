import axiosInstance from "core/Utils/axios";
import { ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA_V3 } from "modules/oms/constants-oms/apiConstants";

/**
 * POST /api/v3/inventory-smart/oms/oms-deep-dive-filters-data
 * ClickHouse-backed facet options for new OrderManagement Product Details.
 * Payload: `{ filters, selected_hierarchies }` (also accepts v3 product/store filter shapes).
 */
export async function fetchDeepDiveFiltersDataV3(payload) {
  const response = await axiosInstance({
    url: ORDER_MANAGEMENT_DEEP_DIVE_FILTERS_DATA_V3,
    method: "POST",
    data: payload,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  const filterData = envelope?.data?.data ?? envelope?.data ?? null;
  return {
    data: filterData,
    message: envelope.message,
    status: envelope.status !== false,
  };
}
