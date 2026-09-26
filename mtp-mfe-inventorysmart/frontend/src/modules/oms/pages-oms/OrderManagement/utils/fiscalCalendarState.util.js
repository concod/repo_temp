/**
 * Normalize placement + receipt calendar API rows into view-slice shape.
 *
 * Placement and receipt can run on different fiscal week-start days (e.g.
 * Sun-start vs Mon-start), each carried as `weekStartDay` alongside its own
 * rows. `moment.updateLocale` mutates a single GLOBAL locale, so both values
 * can't be "active" at once — OrderManagement.jsx re-applies whichever one
 * matches the currently selected placement/receipt tab (see the
 * `selectedRoqDateTab` effect there). Storing both here is what makes that
 * possible; do not collapse this back to a single shared `weekStartDay`.
 */
export function buildFiscalCalendarState(
  placementRows = [],
  receiptRows = [],
  { placementWeekStartDay = 0, receiptWeekStartDay = null } = {}
) {
  const placement = Array.isArray(placementRows) ? placementRows : [];
  const receipt = Array.isArray(receiptRows) ? receiptRows : placement;
  return {
    placement: {
      fiscalCalendarData: placement,
      weekStartDay: placementWeekStartDay ?? 0,
    },
    receipt: {
      fiscalCalendarData: receipt,
      // Fall back to placement's value only when BE didn't send one for receipt.
      weekStartDay: receiptWeekStartDay ?? placementWeekStartDay ?? 0,
    },
  };
}
