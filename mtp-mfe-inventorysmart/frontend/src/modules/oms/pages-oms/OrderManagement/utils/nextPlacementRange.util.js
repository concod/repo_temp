import moment from "moment";
import { findFiscalWeek } from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/utils";

// BE field carrying each product's next order-placement date on matrix rows.
// Isolated here so a BE field-name change is a one-line edit.
export const NEXT_PLACEMENT_DATE_FIELD = "order_placement_recom_date";

/**
 * Compute the earliest->latest fiscal-week range that encloses the
 * next-placement dates of the given selected grid rows.
 *
 * @param {Array<object>} nodesData - selected AG Grid node data objects
 * @param {Array<object>} fiscalCalendarData - placement fiscal calendar rows
 * @param {string} field - date field to read from each row
 * @returns {{start_date: string, end_date: string} | null}
 */
export function deriveNextPlacementRangeFromNodes(
  nodesData,
  fiscalCalendarData,
  field = NEXT_PLACEMENT_DATE_FIELD
) {
  if (!Array.isArray(nodesData) || !Array.isArray(fiscalCalendarData)) {
    return null;
  }

  let earliestBegin = null;
  let latestEnd = null;

  nodesData.forEach((data) => {
    const rawDate = data?.[field];
    if (!rawDate) return;
    const week = findFiscalWeek(rawDate, fiscalCalendarData);
    if (!week) return;

    const begin = moment(week.fiscal_week_begin_date);
    const end = moment(week.fiscal_week_end_date);
    if (!begin.isValid() || !end.isValid()) return;

    if (earliestBegin === null || begin.isBefore(earliestBegin)) {
      earliestBegin = begin;
    }
    if (latestEnd === null || end.isAfter(latestEnd)) {
      latestEnd = end;
    }
  });

  if (earliestBegin === null || latestEnd === null) return null;

  return {
    start_date: earliestBegin.format("YYYY-MM-DD"),
    end_date: latestEnd.format("YYYY-MM-DD"),
  };
}
