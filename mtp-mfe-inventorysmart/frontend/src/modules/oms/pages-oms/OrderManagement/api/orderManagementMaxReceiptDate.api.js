import axiosInstance from "core/Utils/axios";
import { OMS_ORDER_MANAGEMENT_MAX_EDITABLE_RECEIPT_DATE } from "../../../constants-oms/apiConstants";

/**
 * POST /v3/order-management/max_editable_expected_receipt_date
 * ClickHouse-backed max receipt date scoped to OM global filters.
 */
export async function getMaxEditableReceiptDateV3(
  filters = [],
  { isV3Schema = false } = {}
) {
  return axiosInstance({
    url: OMS_ORDER_MANAGEMENT_MAX_EDITABLE_RECEIPT_DATE,
    method: "POST",
    data: {
      filters: Array.isArray(filters) ? filters : [],
      is_v3: Boolean(isV3Schema),
    },
    isV3: true,
  });
}
