import { isEmpty } from "lodash";

const STYLE_ORDER_SUMMARY_TABLE = "style_order_summary";

function mapOrdersForStyleOrderSummary(selectedRows, productDetailsKey) {
  if (!Array.isArray(selectedRows) || !productDetailsKey) {
    return [];
  }
  const desiredKeys = [
    "order_group_id",
    productDetailsKey,
    "order_placement_date",
  ];
  return selectedRows.map((obj) =>
    desiredKeys.reduce((acc, key) => {
      if (
        key === "order_placement_date" &&
        !obj[key] &&
        obj.order_placement_recom_date
      ) {
        acc[key] = obj.order_placement_recom_date;
      } else {
        acc[key] = obj[key];
      }
      return acc;
    }, {})
  );
}

function buildOmsDateFilterArray(recommRecieptDate, ropDate) {
  const appliedOmsDateFilters = [];
  if (recommRecieptDate?.start_date && recommRecieptDate?.end_date) {
    appliedOmsDateFilters.push(recommRecieptDate);
  }
  if (ropDate?.start_date && ropDate?.end_date) {
    appliedOmsDateFilters.push(ropDate);
  }
  return appliedOmsDateFilters;
}

/**
 * Extra POST fields for approval-cross-filter to align with filter-approval-orders
 * when opened from style order summary (same shape as OMSApprovalModel extras).
 */
export function buildStyleOrderApprovalCrossFilterExtras({
  targetTable,
  getCheckConfigurationForStyleOrderSummary,
  selectedRows,
  orderPlacementDate,
  styleOrderSummaryPayload,
  productDetailsFilters,
  recommRecieptDate,
  ropDate,
}) {
  if (
    targetTable !== STYLE_ORDER_SUMMARY_TABLE ||
    typeof getCheckConfigurationForStyleOrderSummary !== "function"
  ) {
    return {};
  }

  const productDetailsKey = productDetailsFilters?.[0]?.column_name;
  const orders = mapOrdersForStyleOrderSummary(selectedRows, productDetailsKey);
  const checkConfig = getCheckConfigurationForStyleOrderSummary();

  const extras = {
    level_of_heirarchy: STYLE_ORDER_SUMMARY_TABLE,
    approval_date_filters: isEmpty(orderPlacementDate)
      ? []
      : [orderPlacementDate],
    date_filter: buildOmsDateFilterArray(recommRecieptDate, ropDate),
    orders,
    ...checkConfig,
  };

  if (
    styleOrderSummaryPayload &&
    typeof styleOrderSummaryPayload === "object"
  ) {
    Object.assign(extras, styleOrderSummaryPayload);
  }

  return extras;
}
