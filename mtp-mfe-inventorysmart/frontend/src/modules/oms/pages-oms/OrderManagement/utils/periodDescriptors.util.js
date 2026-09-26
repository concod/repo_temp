// Period descriptors are the single source of truth for which time columns the
// Matrix Summary renders and how they are labelled. A descriptor is:
//
//   { periodId, label, members: [granularPeriodId, ...], isBucket }
//
// `periodId` identifies the COLUMN. `members` are the underlying granular
// fiscal_year_week / fiscal_year_month ids the column aggregates. For week mode
// and the "1M" month selection each descriptor has a single member (periodId
// === members[0]), so the column reads/edits that exact granular entry. For
// "3M" / "6M" the descriptor clubs N consecutive months and the column SUMS its
// members for display — those clubbed columns are read-only (a single edit on a
// 3-month aggregate is ambiguous about which month absorbs the delta).
//
// The data on every row (leaf / group / Grand Total) always stays GRANULAR
// (weekData[*], monthData[*]); clubbing is a pure read-time view concern, so no
// overlay / rollup / Grand Total math changes when the bucket size changes.
// When the BE owns clubbing it returns these descriptors verbatim and the FE
// keeps reading them the same way (see docs/be-contract.md).

import {
  formatFiscalYearWeekLabel,
  rollupMonthsIntoNBuckets,
} from "./fiscalCalendarFormat.util.js";

export function buildPeriodDescriptors({
  fiscalView,
  monthBucketSize = 1,
  weekPeriodIds = [],
  monthPeriodIds = [],
}) {
  if (fiscalView === "month") {
    return rollupMonthsIntoNBuckets(monthPeriodIds, monthBucketSize);
  }
  return (weekPeriodIds || []).map((weekId) => ({
    periodId: String(weekId),
    label: formatFiscalYearWeekLabel(weekId),
    members: [String(weekId)],
    isBucket: false,
  }));
}

// Flatten descriptor members back into the granular id list the optimistic
// ancestor patch and SSRM rollups operate on (those work on the per-week /
// per-month entries, never the clubbed bucket ids).
export function flattenDescriptorMembers(periodDescriptors) {
  const granularIds = [];
  for (const descriptor of periodDescriptors || []) {
    for (const memberId of descriptor.members || []) {
      granularIds.push(memberId);
    }
  }
  return granularIds;
}

// Normalize a raw granular period id into a single-member descriptor. Used by
// the legacy nested time-column paths that still hand a bare periodId to
// buildPeriodLeafGroup.
export function toSingleMemberDescriptor(periodId, label) {
  const id = String(periodId);
  return { periodId: id, label: label || id, members: [id], isBucket: false };
}
