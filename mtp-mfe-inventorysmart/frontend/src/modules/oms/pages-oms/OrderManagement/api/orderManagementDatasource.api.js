import axiosInstance from "core/Utils/axios";
import {
  OMS_ORDER_MANAGEMENT_GRAND_TOTAL,
  OMS_ORDER_MANAGEMENT_ROWS,
} from "../../../constants-oms/apiConstants";

/**
 * POST /v3/order-management/rows — single source of truth for OM SSRM row fetches.
 *
 * BE nests pagination under envelope `data`: { rows, count, has_more, level }.
 * Grand total is fetched separately via fetchOrderManagementGrandTotal.
 */
export async function fetchOrderManagementRows(request) {
  const response = await axiosInstance({
    url: OMS_ORDER_MANAGEMENT_ROWS,
    method: "POST",
    data: request,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  const page = envelope.data ?? {};
  const rows = Array.isArray(page.rows) ? page.rows : [];

  return {
    rows,
    hasMore: page.has_more,
    count: page.count,
    level: page.level,
  };
}

/**
 * POST /v3/order-management/grand-total — same payload shape as /rows.
 * Response nests bucket aggregates under envelope `data` (e.g. order_quantity_july_2026).
 */
export async function fetchOrderManagementGrandTotal(request) {
  const response = await axiosInstance({
    url: OMS_ORDER_MANAGEMENT_GRAND_TOTAL,
    method: "POST",
    data: request,
    isV3: true,
  });
  const envelope = response?.data ?? {};
  return envelope.data && typeof envelope.data === "object" ? envelope.data : {};
}
