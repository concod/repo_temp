import { projectViewDetailsToPivotOrder } from "../slices/viewDetails.util.js";

/** Flat row-axis dimensions for POST /columns (BE echoes back with labels). */
export function buildRowDimensionsPayload(viewDetails) {
  return projectViewDetailsToPivotOrder(viewDetails).map((dim) => ({
    id: dim.id,
    label: dim.label || dim.id,
    merge_into_hierarchy: true,
  }));
}

function mapDimensionCategory(category) {
  return {
    value: category.value,
    label: category.label,
    selectedDimension: (category.selectedDimension || []).map((sub) => ({
      value: sub.value || sub.name,
      label: sub.label,
      is_alternate_hierarchy: Boolean(sub.is_alternate_hierarchy),
    })),
  };
}

/** Column-axis categories from view management (time / measures metadata). */
export function buildColumnDimensionsPayload(viewDetails) {
  if (!viewDetails) return [];

  const columnDimensions = (viewDetails.columnDimensions || []).map(
    mapDimensionCategory
  );

  // When measures sit on the row axis (kpiWiseRows), mirror them into the
  // column_dimensions payload so /columns only builds selected KPI sub-cols.
  if (viewDetails.kpiWiseRows) {
    const rowMeasures = (viewDetails.rowDimensions || []).find(
      (category) => category.value === "measures"
    );
    if (
      rowMeasures &&
      !columnDimensions.some((category) => category.value === "measures")
    ) {
      columnDimensions.push(mapDimensionCategory(rowMeasures));
    }
  }

  return columnDimensions;
}
