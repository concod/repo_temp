// Converts v2's selectedRowKeys (e.g. "L1::Apparel", "leaf::SKU::DC") into
// the row-object array shape ApprovalFlowDialog expects on `selectedRows`.
// Legacy reads each row via `row.row ?? row[productDetailsFilters[0].column_name]`
// so we always populate `.row` with the most-specific identifier we have:
// leaf SKU at leaf level, group value at group level. ApprovalFlowDialog
// uses this as the "selected products" filter pre-fill; group-level entries
// are still meaningful because legacy preselect is just a values[] for the
// product filter and the BE handles widening from group → descendants.
//
// We also add `style_color_code` aliases for the same value because some
// legacy code paths read that property name specifically; both keys point at
// the same identifier so legacy code that picks either branch works.

export function buildSelectedRowsForApproval(selectedRowKeys) {
  if (!Array.isArray(selectedRowKeys)) return [];
  return selectedRowKeys
    .map((selectionKey) => {
      if (typeof selectionKey !== "string" || selectionKey.length === 0) {
        return null;
      }
      const parts = selectionKey.split("::");
      if (parts.length < 2) return null;
      if (parts[0] === "leaf") {
        // "leaf::<SKU>::<DC>" — SKU is the product identifier
        const sku = parts[1];
        const dc = parts.slice(2).join("::") || null;
        return {
          row: sku,
          style_color_code: sku,
          dc,
          __selectionKind: "leaf",
        };
      }
      // Group selection — "L1::Apparel", "L2::Men", etc.
      const dimensionId = parts[0];
      const dimensionValue = parts.slice(1).join("::");
      return {
        row: dimensionValue,
        style_color_code: dimensionValue,
        __selectionKind: "group",
        __dimensionId: dimensionId,
        __dimensionValue: dimensionValue,
      };
    })
    .filter(Boolean);
}

// Flattens v2's view.fiscalCalendar (`{placement, receipt}` shape) into the
// flat array legacy ApprovalFlowDialog expects on `fiscalCalendarDetails`.
// Prefers the active tab; falls back to the other or an empty array.
export function flattenFiscalCalendarForApproval(fiscalCalendar, activeTab) {
  if (!fiscalCalendar) return [];
  const placementData = fiscalCalendar.placement?.fiscalCalendarData || [];
  const receiptData = fiscalCalendar.receipt?.fiscalCalendarData || [];
  if (activeTab === "roq_receipt_date") {
    return receiptData.length ? receiptData : placementData;
  }
  return placementData.length ? placementData : receiptData;
}
