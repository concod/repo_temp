import {
  buildColumnDimensionsPayload,
  buildRowDimensionsPayload,
} from "./columnsApiPayload.util.js";
import {
  DRILLDOWN_TIMELINE_PLACEMENT,
  DRILLDOWN_TIMELINE_RECEIPT,
} from "../constants.js";
import { DEFAULT_SSRM_CACHE_BLOCK_SIZE } from "../constants.js";
import { groupedByKpiLabel } from "../../../shared/components/PivotPanel/pivotPanel.util.js";
import { isReceiptTimeline } from "./timelineEditMode.util.js";

function extractKpiNamesFromViewDetails(viewDetails) {
  if (!viewDetails) return [];

  const fromFlatMeasures = (viewDetails.measures || [])
    .map((entry) => entry.name || entry.value || entry.version)
    .filter(Boolean);
  if (fromFlatMeasures.length > 0) {
    return fromFlatMeasures;
  }

  const categories = [
    ...(viewDetails.rowDimensions || []),
    ...(viewDetails.columnDimensions || []),
  ];
  const measureCategory = categories.find(
    (entry) => entry.value === "measures"
  );
  const selected = measureCategory?.selectedDimension || [];
  const names = [];

  selected.forEach((item) => {
    const kpiName = item.name || item.value;
    if (kpiName) {
      names.push(kpiName);
    }
  });

  return [...new Set(names.filter(Boolean))];
}

/** BE drilldown KPI ids (e.g. raw_roq) — use selectedIds.name, not UI version keys. */
export function resolveDrilldownKpis({ kpis, selectedIds, viewDetails } = {}) {
  if (Array.isArray(selectedIds) && selectedIds.length > 0) {
    return [
      ...new Set(
        Object.values(groupedByKpiLabel(selectedIds))
          .flat()
          .map((entry) => entry.name)
          .filter(Boolean)
      ),
    ];
  }
  const fromViewDetails = extractKpiNamesFromViewDetails(viewDetails);
  if (fromViewDetails.length > 0) {
    return fromViewDetails;
  }
  if (Array.isArray(kpis) && kpis.length > 0) {
    return kpis;
  }
  return [];
}

export function resolveTimelineSelection(selectedRoqDateTab) {
  return isReceiptTimeline(selectedRoqDateTab)
    ? DRILLDOWN_TIMELINE_RECEIPT
    : DRILLDOWN_TIMELINE_PLACEMENT;
}

export function buildGlobalFilters(selectedFilters) {
  if (!Array.isArray(selectedFilters)) return [];
  return selectedFilters
    .filter((entry) => Array.isArray(entry?.values) && entry.values.length > 0)
    .map(({ attribute_name, operator, values }) => ({
      attribute_name,
      operator,
      values,
    }));
}

const PACK_SIZE_DIM_IDS = new Set(["size", "pack_id", "pack"]);

export function buildDynamicHierarchy(
  groupKeys,
  pivotOrder = [],
  isPackEnabled = false
) {
  if (!Array.isArray(groupKeys) || !pivotOrder?.length) {
    return {};
  }
  const hierarchy = {};
  groupKeys.forEach((value, index) => {
    const dim = pivotOrder[index];
    const dimId = typeof dim === "string" ? dim : dim?.id;
    if (dimId != null) {
      const resolvedId =
        isPackEnabled && PACK_SIZE_DIM_IDS.has(dimId) ? "pack_id" : dimId;
      hierarchy[resolvedId] = value;
    }
  });
  return hierarchy;
}

export function buildDrilldownColumnsPayload({
  screenId,
  kpis,
  selectedIds,
  hlsDateFilter,
  dateRange,
  viewDetails,
  selectedRoqDateTab,
}) {
  // Mirror legacy HLS columns contract (start_fiscal_week / end_fiscal_week /
  // roq_date_option / date_filter) onto the v3 field names. Do not send
  // calendar start_date/end_date — BE resolves the window from fiscal weeks.
  return {
    ...(screenId != null ? { screen_id: screenId } : {}),
    kpis: resolveDrilldownKpis({ kpis, selectedIds, viewDetails }),
    frequency: hlsDateFilter ?? "1w",
    start_week_id: dateRange?.start_fw ?? null,
    ...(dateRange?.end_fw != null ? { end_week_id: dateRange.end_fw } : {}),
    timeline_selection: resolveTimelineSelection(selectedRoqDateTab),
    row_dimensions: buildRowDimensionsPayload(viewDetails),
    column_dimensions: buildColumnDimensionsPayload(viewDetails),
  };
}

export function buildDrilldownRowsPayload({
  screenId,
  pivotOrder,
  groupKeys,
  kpis,
  selectedIds,
  selectedFilters,
  hlsDateFilter,
  dateRange,
  selectedRoqDateTab,
  viewDetails,
  rowOffset,
  rowLimit,
  isPackEnabled,
  viewEditedOnly = false,
}) {
  const order = pivotOrder || [];
  const keys = Array.isArray(groupKeys) ? groupKeys : [];
  const drillDepth = Math.min(keys.length, Math.max(order.length - 1, 0));
  const groupByColumns = order.slice(0, drillDepth + 1).map((dim) => dim.id);

  // Rows v3 model has no end_week_id / start_date — only start_week_id +
  // frequency + timeline_selection (legacy: start_fiscal_week + date_filter +
  // roq_date_option). Calendar dates stay FE-only for the toolbar picker.
  return {
    ...(screenId != null ? { screen_id: screenId } : {}),
    group_by_columns: groupByColumns,
    target_hierarchy: order[drillDepth]?.id,
    kpis: resolveDrilldownKpis({ kpis, selectedIds, viewDetails }),
    frequency: hlsDateFilter ?? "1w",
    start_week_id: dateRange?.start_fw ?? null,
    timeline_selection: resolveTimelineSelection(selectedRoqDateTab),
    global_filters: buildGlobalFilters(selectedFilters),
    dynamic_hierarchy: buildDynamicHierarchy(keys, order, isPackEnabled),
    view_edited_only: Boolean(viewEditedOnly),
    row_offset: rowOffset ?? 0,
    row_limit: rowLimit ?? DEFAULT_SSRM_CACHE_BLOCK_SIZE,
  };
}
