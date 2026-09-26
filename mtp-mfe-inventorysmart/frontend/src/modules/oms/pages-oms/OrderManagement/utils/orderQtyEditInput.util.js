export const ORDER_QTY_INVALID_INTEGER_MESSAGE = "Enter a valid integer.";

/**
 * Parse blur value for order-qty edits. Empty / "-" / decimals are rejected.
 * Zero is allowed.
 */
export function parseOrderQtyEditInput(raw) {
  if (raw == null) {
    return { ok: false };
  }

  const text = String(raw).trim();
  if (text === "" || text === "-") {
    return { ok: false };
  }

  const normalized = text.replace(/,/g, "");
  if (!/^-?\d+$/.test(normalized)) {
    return { ok: false };
  }

  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) {
    return { ok: false };
  }

  return { ok: true, value };
}
