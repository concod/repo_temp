import moment from "moment";

/**
 * Normalize a DatePicker / grid date value to BE `YYYY-MM-DD`.
 * Returns null when the value cannot be parsed.
 */
export function normalizeOmDeliveryDate(value) {
  if (value == null || value === "" || value === "-") return null;
  if (moment.isMoment(value)) {
    return value.isValid() ? value.format("YYYY-MM-DD") : null;
  }
  if (value instanceof Date) {
    const parsed = moment(value);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-") return null;
    const parsed = moment(
      trimmed,
      [moment.ISO_8601, "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY/MM/DD"],
      true
    );
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
    const loose = moment(trimmed);
    return loose.isValid() ? loose.format("YYYY-MM-DD") : null;
  }
  return null;
}
