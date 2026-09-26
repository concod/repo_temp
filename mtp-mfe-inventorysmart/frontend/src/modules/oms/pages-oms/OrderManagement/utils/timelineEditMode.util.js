import { ROQ_PLACEMENT_DATE, ROQ_RECEIPT_DATE } from "../constants.js";

export { ROQ_PLACEMENT_DATE, ROQ_RECEIPT_DATE };

const PLACEMENT_ALIASES = new Set([
  "placement",
  "roq_placement_date",
  ROQ_PLACEMENT_DATE,
]);

const RECEIPT_ALIASES = new Set([
  "receipt",
  "roq_receipt_date",
  ROQ_RECEIPT_DATE,
]);

export function normalizeRoqDateTab(rawValue) {
  if (!rawValue) return ROQ_PLACEMENT_DATE;
  if (PLACEMENT_ALIASES.has(rawValue)) return ROQ_PLACEMENT_DATE;
  if (RECEIPT_ALIASES.has(rawValue)) return ROQ_RECEIPT_DATE;
  return ROQ_PLACEMENT_DATE;
}

export function isReceiptTimeline(selectedRoqDateTab) {
  return normalizeRoqDateTab(selectedRoqDateTab) === ROQ_RECEIPT_DATE;
}

export function isPlacementTimeline(selectedRoqDateTab) {
  return normalizeRoqDateTab(selectedRoqDateTab) === ROQ_PLACEMENT_DATE;
}

export function shouldShowDistributionMethod(_selectedRoqDateTab) {
  // Matrix summary exposes distribution method on both placement and receipt timelines.
  return true;
}
