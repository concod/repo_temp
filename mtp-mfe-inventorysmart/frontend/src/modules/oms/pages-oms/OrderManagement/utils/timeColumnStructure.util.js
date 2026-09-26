import {
  formatFiscalYearMonthLabel,
  formatFiscalYearWeekLabel,
  rollupWeeksIntoMonths,
} from "./fiscalCalendarFormat.util.js";
import {
  flattenDescriptorMembers,
  toSingleMemberDescriptor,
} from "./periodDescriptors.util.js";

const TIME_LEVEL_ORDER = ["year", "season", "quarter", "month", "week"];

export function getColumnTimeSubDimensions(appliedViewDetails) {
  const timeCategory = (appliedViewDetails?.columnDimensions || []).find(
    (category) => category?.value === "time"
  );
  return Array.isArray(timeCategory?.selectedDimension)
    ? timeCategory.selectedDimension
    : [];
}

export function resolveFiscalViewFromColumnTime(timeSubDimensions) {
  const selectedValues = new Set(
    timeSubDimensions.map((subDimension) => subDimension?.value).filter(Boolean)
  );
  if (selectedValues.has("week")) return "week";
  if (selectedValues.has("month")) return "month";
  return null;
}

export function sortTimeLevelValues(timeLevelValues) {
  return [...timeLevelValues].sort(
    (left, right) =>
      TIME_LEVEL_ORDER.indexOf(left) - TIME_LEVEL_ORDER.indexOf(right)
  );
}

export function getActiveWeekCalendarRows({
  fiscalCalendar,
  selectedRoqDateTab,
  selectedDateRange,
  maxWeeks = 8,
}) {
  const tabKey =
    selectedRoqDateTab === "roq_receipt_date" ? "receipt" : "placement";
  const calendarRows = fiscalCalendar?.[tabKey]?.fiscalCalendarData || [];
  const activeRange = selectedDateRange?.[selectedRoqDateTab] || null;
  const filteredRows = activeRange
    ? calendarRows.filter(
        (row) =>
          row.fiscal_year_week >= activeRange.start_fw &&
          row.fiscal_year_week <= activeRange.end_fw
      )
    : calendarRows;
  return filteredRows.slice(0, maxWeeks);
}

// `periodDescriptors` is the descriptor-driven period list (one entry per
// column, each carrying its granular member ids + label). The common path —
// and the only one reachable today, since the Time category is hidden from
// View Management (rule #72) — is `timeLevels.length === 0`, which maps the
// descriptors straight to leaf column groups. The legacy nested-time paths
// below remain for when a Time card is re-enabled; they wrap each raw period
// id into a single-member descriptor so buildPeriodLeafGroup keeps one shape.
export function buildNestedTimeColumnGroups({
  timeSubDimensions,
  fiscalView,
  periodDescriptors = [],
  fiscalCalendar,
  selectedRoqDateTab,
  selectedDateRange,
  buildPeriodLeafGroup,
}) {
  const timeLevels = sortTimeLevelValues(
    timeSubDimensions.map((subDimension) => subDimension.value).filter(Boolean)
  );

  if (timeLevels.length === 0) {
    return periodDescriptors.map((descriptor) =>
      buildPeriodLeafGroup(descriptor)
    );
  }

  const monthLabelDescriptor = (monthId) =>
    toSingleMemberDescriptor(monthId, formatFiscalYearMonthLabel(monthId));
  const weekLabelDescriptor = (weekId) =>
    toSingleMemberDescriptor(weekId, formatFiscalYearWeekLabel(weekId));
  const granularPeriodIds = flattenDescriptorMembers(periodDescriptors);

  const hasWeek = timeLevels.includes("week");
  const hasMonth = timeLevels.includes("month");
  const hasYear = timeLevels.includes("year");

  if (hasWeek && hasMonth) {
    const weekRows = getActiveWeekCalendarRows({
      fiscalCalendar,
      selectedRoqDateTab,
      selectedDateRange,
    });
    const monthBuckets = rollupWeeksIntoMonths(weekRows);
    if (monthBuckets.length > 0) {
      return monthBuckets.map((monthBucket) => ({
        headerName: formatFiscalYearMonthLabel(monthBucket.fiscal_year_month),
        marryChildren: true,
        headerClass: "ag-right-aligned-header",
        children: monthBucket.weekRows.map((weekRow) =>
          buildPeriodLeafGroup(weekLabelDescriptor(weekRow.fiscal_year_week))
        ),
      }));
    }
  }

  if (hasMonth && hasYear && !hasWeek) {
    const monthIds = granularPeriodIds;
    const monthsByYear = new Map();
    for (const monthId of monthIds) {
      const fiscalYear = String(monthId).slice(0, 4);
      if (!monthsByYear.has(fiscalYear)) {
        monthsByYear.set(fiscalYear, []);
      }
      monthsByYear.get(fiscalYear).push(monthId);
    }
    return Array.from(monthsByYear.entries()).map(([fiscalYear, monthIdsForYear]) => ({
      headerName: `FY${String(fiscalYear).slice(2)}`,
      marryChildren: true,
      headerClass: "ag-right-aligned-header",
      children: monthIdsForYear.map((monthId) =>
        buildPeriodLeafGroup(monthLabelDescriptor(monthId))
      ),
    }));
  }

  if (hasMonth && !hasWeek) {
    const monthIds = granularPeriodIds;
    return monthIds.map((monthId) =>
      buildPeriodLeafGroup(monthLabelDescriptor(monthId))
    );
  }

  return periodDescriptors.map((descriptor) =>
    buildPeriodLeafGroup(descriptor)
  );
}
