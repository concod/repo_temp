import moment from "moment";
import {
  bumpSsrmRefreshTick,
  setFiscalView,
  setHlsTimeSelection,
  setSelectedDateRange,
  setSelectedRoqDateTab,
} from "../slices/orderManagementView.slice.js";
import { normalizeRoqDateTab } from "./timelineEditMode.util.js";

const MATRIX_COLUMN_COUNT = 8;

function findTabOption(tabListOptions, selectedMonthTab) {
  return (tabListOptions || []).find((tab) => tab?.value === selectedMonthTab);
}

function parseMonthBucketFromFrequency(dateFilter) {
  if (!dateFilter || typeof dateFilter !== "string") return 1;
  if (dateFilter.endsWith("m")) {
    const bucket = parseInt(dateFilter.slice(0, -1), 10);
    return Number.isFinite(bucket) && bucket > 0 ? bucket : 1;
  }
  if (dateFilter === "three_months") return 3;
  if (dateFilter === "six_months") return 6;
  if (dateFilter === "month") return 1;
  return 1;
}

export function resolveFiscalViewFromHlsDateFilter(dateFilter, tabOption) {
  if (tabOption?.week_count) {
    return "week";
  }
  if (typeof dateFilter === "string" && dateFilter.endsWith("w")) {
    return "week";
  }
  if (dateFilter === "week" || dateFilter === "three_weeks" || dateFilter === "six_weeks") {
    return "week";
  }
  return "month";
}

export function resolveWeekColumnCount(tabOption) {
  if (tabOption?.week_count) {
    return MATRIX_COLUMN_COUNT * tabOption.week_count;
  }
  if (tabOption?.value === "1w" || tabOption?.value === "week") {
    return MATRIX_COLUMN_COUNT;
  }
  return MATRIX_COLUMN_COUNT;
}

export function resolveMonthColumnCount(dateFilter) {
  return parseMonthBucketFromFrequency(dateFilter);
}

// 1M / 3M / 6M now mean "how many months are clubbed into ONE column" (the
// month view always spans the full available horizon). 1M => one column per
// month, 3M => Apr-Jun / Jul-Sep, 6M => a single 6-month column. See
// utils/periodDescriptors.util.js.
export function resolveMonthBucketSize(dateFilter) {
  return parseMonthBucketFromFrequency(dateFilter);
}

function rowWeekStart(row) {
  return row?.week_start_date || row?.calendar_week_start_date || null;
}

/** First calendar row for the week containing today (or the next future week). */
export function findCurrentWeekRowIndex(calendarRows = []) {
  if (!calendarRows.length) return 0;
  const today = moment().startOf("day");

  const containingIdx = calendarRows.findIndex((row) => {
    const start = rowWeekStart(row);
    const end = row?.week_end_date || row?.calendar_week_end_date;
    if (!start) return false;
    const startM = moment(start).startOf("day");
    const endM = end ? moment(end).endOf("day") : startM.clone().endOf("week");
    return today.isBetween(startM, endM, undefined, "[]");
  });
  if (containingIdx >= 0) return containingIdx;

  const futureIdx = calendarRows.findIndex((row) => {
    const start = rowWeekStart(row);
    return start && moment(start).startOf("day").isSameOrAfter(today, "day");
  });
  if (futureIdx >= 0) return futureIdx;

  return 0;
}

/**
 * Default matrix window: current week start + 8-column span (week or month agg).
 * Matches edit-hierarchy / AC rule — not fiscal calendar row[0]..row[last].
 */
export function resolveDefaultFiscalWeekRange({
  calendarRows,
  fiscalView,
  weekColumnCount,
  monthBucketSize = 1,
}) {
  if (!calendarRows?.length) return null;

  const startIdx = findCurrentWeekRowIndex(calendarRows);
  const startRow = calendarRows[startIdx];
  if (!startRow) return null;

  let endIdx = startIdx;
  if (fiscalView === "week") {
    const span = Math.max(weekColumnCount || MATRIX_COLUMN_COUNT, 1);
    endIdx = Math.min(startIdx + span - 1, calendarRows.length - 1);
  } else {
    const monthsNeeded = MATRIX_COLUMN_COUNT * Math.max(monthBucketSize, 1);
    const seenMonths = new Set();
    for (let i = startIdx; i < calendarRows.length; i++) {
      const monthId = calendarRows[i]?.fiscal_year_month;
      if (monthId != null) {
        seenMonths.add(String(monthId));
      }
      endIdx = i;
      if (seenMonths.size >= monthsNeeded) break;
    }
  }

  const endRow = calendarRows[endIdx];
  if (!endRow) return null;

  return {
    start_date: startRow.week_start_date,
    end_date: endRow.week_end_date,
    start_fw: startRow.fiscal_year_week,
    end_fw: endRow.fiscal_year_week,
    fiscalInfoStartDate: startRow,
    fiscalInfoEndDate: endRow,
  };
}

function buildRangeFromFiscalWeeks({ startFw, endFw, calendarRows }) {
  if (!startFw || !endFw || !calendarRows?.length) return null;
  const startRow = calendarRows.find(
    (row) => row.fiscal_year_week === startFw
  );
  const endRow = calendarRows.find((row) => row.fiscal_year_week === endFw);
  if (!startRow || !endRow) {
    return {
      start_fw: startFw,
      end_fw: endFw,
    };
  }
  return {
    start_date: startRow.week_start_date,
    end_date: endRow.week_end_date,
    start_fw: startRow.fiscal_year_week,
    end_fw: endRow.fiscal_year_week,
    fiscalInfoStartDate: startRow,
    fiscalInfoEndDate: endRow,
  };
}

export function applyHlsTimeSelectionToMatrixView({
  dispatch,
  selectedMonthTab,
  tabListOptions,
  selectedRoqDateTab,
  fiscalDates,
  roqFiscalDates,
  fiscalCalendar,
}) {
  const tabOption = findTabOption(tabListOptions, selectedMonthTab);
  const normalizedRoqDateTab = normalizeRoqDateTab(selectedRoqDateTab);
  const fiscalView = resolveFiscalViewFromHlsDateFilter(
    selectedMonthTab,
    tabOption
  );
  const weekColumnCount = resolveWeekColumnCount(tabOption);
  const monthColumnCount = resolveMonthColumnCount(selectedMonthTab);
  const monthBucketSize = resolveMonthBucketSize(selectedMonthTab);
  const calendarRows =
    normalizedRoqDateTab === "roq_receipt_date"
      ? fiscalCalendar?.receipt?.fiscalCalendarData || []
      : fiscalCalendar?.placement?.fiscalCalendarData || [];
  const activeFiscalWeeks =
    normalizedRoqDateTab === "roq_receipt_date" ? roqFiscalDates : fiscalDates;

  const range =
    buildRangeFromFiscalWeeks({
      startFw: activeFiscalWeeks?.start_fw,
      endFw: activeFiscalWeeks?.end_fw,
      calendarRows,
    }) ||
    resolveDefaultFiscalWeekRange({
      calendarRows,
      fiscalView,
      weekColumnCount,
      monthBucketSize,
    });

  dispatch(setSelectedRoqDateTab(normalizedRoqDateTab));
  dispatch(setFiscalView(fiscalView));
  dispatch(
    setHlsTimeSelection({
      dateFilter: selectedMonthTab,
      weekColumnCount,
      monthColumnCount,
      monthBucketSize,
      startFw: range?.start_fw ?? null,
      endFw: range?.end_fw ?? null,
    })
  );
  if (range) {
    dispatch(
      setSelectedDateRange({
        tab: normalizedRoqDateTab,
        range,
      })
    );
  }
  dispatch(bumpSsrmRefreshTick());
  return range;
}

export function buildHlsTimeSelectionSignature({
  selectedMonthTab,
  selectedRoqDateTab,
  fiscalDates,
  roqFiscalDates,
  placementCalendarLength = 0,
  receiptCalendarLength = 0,
}) {
  return JSON.stringify({
    selectedMonthTab,
    selectedRoqDateTab,
    fiscalDates,
    roqFiscalDates,
    placementCalendarLength,
    receiptCalendarLength,
  });
}
