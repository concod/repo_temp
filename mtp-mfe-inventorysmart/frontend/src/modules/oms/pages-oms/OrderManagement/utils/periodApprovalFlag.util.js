const ORDER_QTY_PREFIX = "order_quantity_";
const FLAG_FIELD_PREFIX = "flag_";

/**
 * Period approval flag values on row data (`flag_{period_suffix}`).
 * Sourced from BE rollup: multiIf(min(order_status_id) > 0, 2, max(...) = 0, 0, 1).
 */
export const OMS_PERIOD_FLAG_STATUS = {
  /** 0 — no approved orders in the period; default cell background. */
  NONE: 0,
  /** 1 — partially approved; yellow highlight. */
  PARTIAL: 1,
  /** 2 — fully approved; grey highlight and edit blocked. */
  FULL: 2,
};

export const OMS_PERIOD_FLAG_STATUS_LABEL = {
  [OMS_PERIOD_FLAG_STATUS.NONE]: "Not approved",
  [OMS_PERIOD_FLAG_STATUS.PARTIAL]: "Partially approved",
  [OMS_PERIOD_FLAG_STATUS.FULL]: "Fully approved",
};

/** Cell backgrounds aligned with MATRIX_SUMMARY_ROQ_STATUS_LEGEND. */
export const OMS_PERIOD_FLAG_CELL_BG = {
  [OMS_PERIOD_FLAG_STATUS.PARTIAL]: "#FFF3CD",
  [OMS_PERIOD_FLAG_STATUS.FULL]: "#E0E0E0",
};

export function orderQtyFieldToFlagField(orderQtyField) {
  if (
    typeof orderQtyField !== "string" ||
    !orderQtyField.startsWith(ORDER_QTY_PREFIX)
  ) {
    return null;
  }
  return `${FLAG_FIELD_PREFIX}${orderQtyField.slice(ORDER_QTY_PREFIX.length)}`;
}

/** @deprecated use orderQtyFieldToFlagField */
export const orderQtyFieldToApprovalFlagField = orderQtyFieldToFlagField;

export function resolvePeriodApprovalFlag(data, orderQtyField) {
  if (!data || !orderQtyField) return OMS_PERIOD_FLAG_STATUS.NONE;
  const flagField = orderQtyFieldToFlagField(orderQtyField);
  if (flagField && Object.prototype.hasOwnProperty.call(data, flagField)) {
    const value = Number(data[flagField]);
    return Number.isFinite(value) ? value : OMS_PERIOD_FLAG_STATUS.NONE;
  }
  return OMS_PERIOD_FLAG_STATUS.NONE;
}

export function approvalFlagBlocksEdit(flag) {
  return Number(flag) === OMS_PERIOD_FLAG_STATUS.FULL;
}

export function approvalFlagCellStyle(flag) {
  const normalized = Number(flag);
  const backgroundColor = OMS_PERIOD_FLAG_CELL_BG[normalized];
  return backgroundColor ? { backgroundColor } : null;
}

export function isPeriodFlagRowKey(key) {
  return typeof key === "string" && key.startsWith(FLAG_FIELD_PREFIX);
}

/** @deprecated use isPeriodFlagRowKey */
export const isApprovalFlagRowKey = isPeriodFlagRowKey;
