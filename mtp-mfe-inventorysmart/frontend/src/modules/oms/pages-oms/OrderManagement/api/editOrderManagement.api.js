import axiosInstance from "core/Utils/axios";
import { OMS_UNIFIED_EDIT } from "../../../constants-oms/apiConstants.js";

/**
 * Normalize BE edit response.
 * Preferred shape: `{ updated_cells: [{ rowUid, newValue, newValueDate, newValueEaches, newValueCost, updated, affected }] }`
 * — BE never sends a `colId`; it already knows which column was edited from
 * the request, and the caller (OrderManagement.jsx) maps the primary value
 * (`newValue` for quantity, `newValueDate` for delivery-date edits) plus
 * optional `newValueEaches` / `newValueCost` onto the edited column +
 * eaches/cost siblings itself (see `applyUpdatedCells` in
 * applyEditDelta.util.js). Sibling fields may be absent on any given cell —
 * never assume they're always there.
 * Legacy shape: `{ changedRows, grand_total }` — still accepted for compatibility.
 */
function normalizeEditResponse(raw) {
  if (!raw) {
    return { updated_cells: [], changedRows: [], grand_total: null };
  }

  const updatedCells = Array.isArray(raw.updated_cells)
    ? raw.updated_cells
    : Array.isArray(raw.updatedCells)
      ? raw.updatedCells
      : [];

  return {
    updated_cells: updatedCells,
    changedRows: raw.changedRows || [],
    grand_total: raw.grand_total ?? raw.grandTotal ?? null,
  };
}

/**
 * Auto-save a matrix cell edit via unified-edit.
 * Payload must include `kind` (`drilldown_quantity` | `drilldown_date`) and
 * `screen_id` (schema is resolved from screen config — do not send `is_v3`).
 * `current_open_items` must already be hierarchy-only.
 */
export async function editOrderManagementCell(payload) {
  const response = await axiosInstance({
    url: OMS_UNIFIED_EDIT,
    method: "POST",
    isV3: true,
    data: payload,
  });

  if (response?.data?.data) {
    return normalizeEditResponse(response.data.data);
  }

  throw new Error(response?.data?.message || "Order edit failed");
}
