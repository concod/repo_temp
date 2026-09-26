// Pivot model v2 helpers — view_details mirrors Plansmart's category-model
// shape: each entry in `rowDimensions` / `columnDimensions` is a CATEGORY
// (Product / Location / Time / Measures) whose `selectedDimension` array
// holds the actual sub-hierarchy entries the user picked from the
// per-card dropdown (e.g. Product card with three sub-dims emits
// L1, L2, L3 in pivot order).
//
// Schema (matches Plansmart so the BE saved-view payload is identical):
//
// viewDetails: {
//   rowDimensions: [
//     {
//       value: "product",
//       label: "Product",
//       selectedDimension: [
//         { value: "L1", label: "Department", is_alternate_hierarchy: false },
//         { value: "L2", label: "Gender",     is_alternate_hierarchy: false },
//         ...
//       ],
//     },
//     ...
//   ],
//   columnDimensions: [...],   // same shape
//   measures: [{ name, version, label }],  // legacy flat measures buffer
//   kpiWiseRows: boolean,
//   calculatedFieldsSelection: { variance: [...], contribution: [...] },
//   isGrandtotalEnabled: boolean,
//   view_settings: [{ key, title, options, selected }],
//   show_hide_metrics: [{ key, hidden }],
// }

export function buildEmptyViewDetails() {
  return {
    rowDimensions: [],
    columnDimensions: [],
    measures: [],
    kpiWiseRows: false,
    calculatedFieldsSelection: { variance: [], contribution: [] },
    isGrandtotalEnabled: true,
    view_settings: [],
    show_hide_metrics: [],
  };
}

export function cloneViewDetails(viewDetails) {
  if (!viewDetails) return buildEmptyViewDetails();
  return {
    rowDimensions: (viewDetails.rowDimensions || []).map((entry) => ({
      ...entry,
      selectedDimension: (entry.selectedDimension || []).map((sub) => ({
        ...sub,
      })),
    })),
    columnDimensions: (viewDetails.columnDimensions || []).map((entry) => ({
      ...entry,
      selectedDimension: (entry.selectedDimension || []).map((sub) => ({
        ...sub,
      })),
    })),
    measures: (viewDetails.measures || []).map((entry) => ({ ...entry })),
    kpiWiseRows: Boolean(viewDetails.kpiWiseRows),
    calculatedFieldsSelection: {
      variance: (viewDetails.calculatedFieldsSelection?.variance || []).map(
        (entry) => ({ ...entry })
      ),
      contribution: (
        viewDetails.calculatedFieldsSelection?.contribution || []
      ).map((entry) => ({ ...entry })),
    },
    isGrandtotalEnabled: viewDetails.isGrandtotalEnabled !== false,
    view_settings: (viewDetails.view_settings || []).map((entry) => ({
      ...entry,
    })),
    show_hide_metrics: (viewDetails.show_hide_metrics || []).map((entry) => ({
      ...entry,
    })),
  };
}

export function stableSerializeViewDetails(viewDetails) {
  if (!viewDetails) return "";
  return JSON.stringify({
    r: (viewDetails.rowDimensions || []).map((entry) => ({
      v: entry.value,
      sd: (entry.selectedDimension || []).map((sub) => ({
        v: sub.value,
        a: !!sub.is_alternate_hierarchy,
      })),
    })),
    c: (viewDetails.columnDimensions || []).map((entry) => ({
      v: entry.value,
      sd: (entry.selectedDimension || []).map((sub) => ({
        v: sub.value,
        a: !!sub.is_alternate_hierarchy,
      })),
    })),
    m: (viewDetails.measures || []).map((entry) => ({
      n: entry.name,
      v: entry.version || null,
    })),
    k: !!viewDetails.kpiWiseRows,
    cf: viewDetails.calculatedFieldsSelection || {},
    g: viewDetails.isGrandtotalEnabled !== false,
    vs: viewDetails.view_settings || [],
    sh: viewDetails.show_hide_metrics || [],
  });
}

export function diffViewDetails(left, right) {
  return (
    stableSerializeViewDetails(left) !== stableSerializeViewDetails(right)
  );
}

// Lift legacy flat `pivotOrder` ([{id,label}]) into the v2 category model.
// Today only Product + Measures categories are surfaced (rule #72), so every
// flat entry folds into a single Product card. "DC" is kept but marked as an
// alternate hierarchy (it lives under Product as `is_alternate_hierarchy`) so
// a standalone Location card never appears on an axis.
export function migrateLegacyPivotOrderToViewDetails(pivotOrder) {
  const viewDetails = buildEmptyViewDetails();
  const productSubs = [];
  (pivotOrder || []).forEach((dimension) => {
    if (!dimension?.id) return;
    productSubs.push({
      value: dimension.id,
      label: dimension.label || dimension.id,
      is_alternate_hierarchy: Boolean(
        dimension.is_alternate_hierarchy ??
          dimension.is_alternate ??
          (dimension.id === "DC" || dimension.id === "dc_name")
      ),
    });
  });
  if (productSubs.length > 0) {
    viewDetails.rowDimensions.push({
      value: "product",
      label: "Product",
      selectedDimension: productSubs,
    });
  }
  return viewDetails;
}

// Inverse of the migration helper: walk EVERY nested `selectedDimension`
// across every row-axis category and emit the flat `[{id,label}]` shape
// the v1 colDef builder expects. A Product card with three sub-dims
// (Department, Gender, Class) emits three pivot-order entries in that
// order; Measures cards are skipped because they do not contribute a
// pivot level.
export function projectViewDetailsToPivotOrder(viewDetails) {
  if (!viewDetails) return [];
  const result = [];
  const seen = new Set();
  const pushCategory = (category) => {
    if (!category) return;
    if (category.value === "measures") return;
    // True cross-tab columns (Product/Location on the column axis) are
    // deferred; for now they fold into the row hierarchy at the end.
    // `time` on either axis is handled by fiscalView and contributes
    // no pivot-order level.
    if (category.value === "time") return;
    const subs = Array.isArray(category.selectedDimension)
      ? category.selectedDimension
      : [];
    for (const sub of subs) {
      if (!sub?.value || seen.has(sub.value)) continue;
      seen.add(sub.value);
      result.push({ id: sub.value, label: sub.label || sub.value });
    }
  };
  if (Array.isArray(viewDetails.rowDimensions)) {
    for (const category of viewDetails.rowDimensions) pushCategory(category);
  }
  if (Array.isArray(viewDetails.columnDimensions)) {
    for (const category of viewDetails.columnDimensions) pushCategory(category);
  }
  return result;
}

// Pivot validation: at least one non-measure sub-dimension must be present
// across the row axis. Returns `{ ok, reason }`.
export function isViewDetailsValid(viewDetails) {
  if (!viewDetails) return { ok: false, reason: "no view details" };
  if (!Array.isArray(viewDetails.rowDimensions)) {
    return { ok: false, reason: "rowDimensions is not an array" };
  }
  const flat = projectViewDetailsToPivotOrder(viewDetails);
  if (flat.length === 0) {
    return { ok: false, reason: "at least one row dimension is required" };
  }
  return { ok: true };
}
