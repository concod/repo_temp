const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** Label for a fiscal_year_week id (e.g. 202614 → WEEK_14_2026). */
export function formatFiscalYearWeekLabel(weekId) {
  const id = String(weekId ?? "");
  if (id.length < 6) return id;
  const year = id.slice(0, 4);
  const week = String(Number(id.slice(4)));
  return `WEEK_${week}_${year}`;
}

/** Label for a fiscal_year_month id (e.g. 202604 → APR_2026). */
export function formatFiscalYearMonthLabel(monthId) {
  const id = String(monthId ?? "");
  if (id.length < 6) return id;
  const year = id.slice(0, 4);
  const monthNum = Number(id.slice(4, 6));
  const monthName = MONTH_NAMES[monthNum - 1] || id.slice(4, 6);
  return `${monthName}_${year}`;
}

/** Club consecutive fiscal_year_month ids into read-only bucket descriptors. */
export function rollupMonthsIntoNBuckets(monthPeriodIds, bucketSize = 1) {
  const ids = (monthPeriodIds || []).map(String);
  const size = Math.max(1, Math.floor(bucketSize) || 1);

  if (size === 1) {
    return ids.map((monthId) => ({
      periodId: monthId,
      label: formatFiscalYearMonthLabel(monthId),
      members: [monthId],
      isBucket: false,
    }));
  }

  const buckets = [];
  for (let start = 0; start < ids.length; start += size) {
    const members = ids.slice(start, start + size);
    const periodId = members.join("-");
    const label =
      members.length === 1
        ? formatFiscalYearMonthLabel(members[0])
        : `${formatFiscalYearMonthLabel(members[0])}-${formatFiscalYearMonthLabel(
            members[members.length - 1]
          )}`;
    buckets.push({
      periodId,
      label,
      members,
      isBucket: members.length > 1,
    });
  }
  return buckets;
}

/** Group fiscal calendar week rows under their fiscal_year_month. */
export function rollupWeeksIntoMonths(weekRows) {
  const byMonth = new Map();
  for (const row of weekRows || []) {
    const monthId = row?.fiscal_year_month;
    if (monthId == null) continue;
    const key = String(monthId);
    if (!byMonth.has(key)) {
      byMonth.set(key, { fiscal_year_month: key, weekRows: [] });
    }
    byMonth.get(key).weekRows.push(row);
  }
  return Array.from(byMonth.values());
}
