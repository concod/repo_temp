import { get, isEmpty } from "lodash";
import { setPersistentPivotHideAttributes } from "../../../pages-oms/OrderManagement/slices/pivot.slice";

export function isAlternateHierarchyOption(option) {
  return Boolean(option?.is_alternate_hierarchy ?? option?.is_alternate);
}

/** Re-attach catalog flags after multi-select (Select often drops extra fields). */
export function enrichSelectedDimensionsFromCatalog(
  selectedDimensions,
  dimensionKey,
  dimensionValues = {}
) {
  const catalog = dimensionValues[dimensionKey] || [];
  const enriched = (selectedDimensions || []).map((selected) => {
    const match = catalog.find((entry) => entry.value === selected.value);
    if (!match) return selected;
    return {
      ...selected,
      label: selected.label || match.label,
      hierarchy_id: selected.hierarchy_id ?? match.hierarchy_id,
      is_alternate_hierarchy: isAlternateHierarchyOption(match),
    };
  });
  return sortSelectedDimensionsByHierarchyId(enriched, catalog);
}

/** Order selected dimension tags by catalog hierarchy_id (ascending). */
export function sortSelectedDimensionsByHierarchyId(
  selectedDimensions = [],
  catalogOptions = []
) {
  const catalogByValue = new Map(
    (catalogOptions || []).map((entry) => [entry.value, entry])
  );

  const hierarchySortKey = (item) => {
    const raw = item?.hierarchy_id ?? catalogByValue.get(item?.value)?.hierarchy_id;
    if (raw == null || raw === "") return Number.MAX_SAFE_INTEGER;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
  };

  return [...selectedDimensions].sort((a, b) => {
    const byHierarchy = hierarchySortKey(a) - hierarchySortKey(b);
    if (byHierarchy !== 0) return byHierarchy;
    return String(a?.value ?? "").localeCompare(String(b?.value ?? ""));
  });
}

export function enrichViewAxisDimensionsFromCatalog(
  axisDimensions,
  dimensionValues = {}
) {
  return (axisDimensions || []).map((category) => ({
    ...category,
    selectedDimension: enrichSelectedDimensionsFromCatalog(
      category.selectedDimension,
      category.value,
      dimensionValues
    ),
  }));
}

// ---------------------------------------------------------------------------
// KPI payload helpers
// ---------------------------------------------------------------------------

export const groupedByKpiLabel = (selectedIds) =>
  selectedIds.reduce((acc, item) => {
    if (!acc[item.kpiLabel]) {
      acc[item.kpiLabel] = [];
    }
    acc[item.kpiLabel].push(item);
    return acc;
  }, {});

export const getPivotPayload = (
  rowDimensions,
  columnDimensions,
  addedVersionDetails,
  calculatedFieldsSelection,
  selectedIds,
  isGrandtotalEnabled = false
) => {
  const getPivotDimensions = (dimensions, isKpiWise) => {
    return (Array.isArray(dimensions) ? dimensions : []).reduce(
      (acc, dimension) => {
        if (dimension.value === "measures" && isKpiWise) {
          acc.push("measurement");
        } else {
          (Array.isArray(dimension?.selectedDimension)
            ? dimension.selectedDimension
            : []
          ).forEach((key) => acc.push(key.value));
        }
        return acc;
      },
      []
    );
  };

  const kpiWiseRows = rowDimensions.some(
    (dimension) => dimension.value === "measures"
  );
  const pivotRows = getPivotDimensions(rowDimensions, kpiWiseRows);
  const pivotColumns = getPivotDimensions(columnDimensions, !kpiWiseRows);
  const kpis = Object.values(groupedByKpiLabel(selectedIds))
    .flat()
    .map((kpiData) => kpiData.name || kpiData.version);
  const addedPlans = (addedVersionDetails || []).map(
    (version) => version.planCode
  );

  const availableKpiNames = [...new Set(selectedIds.map((item) => item.name))];
  const availableKpiVersions = [
    ...new Set(selectedIds.map((item) => item.version)),
  ];

  const extractFields = (selection, fieldType, fields) => {
    return get(selection, fieldType, []).reduce((acc, item) => {
      const list = get(item, fields.list, []);
      list.forEach((field) => {
        acc.push(fields.extract(field, item));
      });
      return acc;
    }, []);
  };

  const variance = extractFields(calculatedFieldsSelection, "variance", {
    list: "varianceList",
    extract: (field, item) => ({
      kpi: item.value,
      reference_version: get(field, "referenceVersion", ""),
      compared_version: get(field, "comparedVersion", ""),
      calculation: get(field, "calculation", ""),
    }),
  }).filter((varianceItem) => availableKpiNames.includes(varianceItem.kpi));

  const contribution = extractFields(
    calculatedFieldsSelection,
    "contribution",
    {
      list: "contributionList",
      extract: (field, item) => ({
        kpi: item.value,
        base_dimension: get(field, "baseDimension.value", ""),
        base_field: get(field, "baseField.value", ""),
      }),
    }
  ).filter((contributionItem) =>
    availableKpiVersions.includes(contributionItem.kpi)
  );

  return {
    pivot_rows: pivotRows,
    pivot_columns: pivotColumns,
    kpi_wise_rows: kpiWiseRows,
    kpis,
    compatible_versions: addedPlans,
    calculated_fields: {
      variance,
      contribution,
      custom_kpis: [],
    },
    isGrandtotalEnabled,
  };
};

export const getLastPayloadAttributes = (pivotPayload) => {
  if (!pivotPayload?.pivot_columns || !pivotPayload?.pivot_rows) return [];
  return [...pivotPayload.pivot_columns, ...pivotPayload.pivot_rows].flat();
};

export const getCurrentPayloadAttributes = (payload) => {
  return [...payload.pivot_columns, ...payload.pivot_rows].flat();
};

export const hasPayloadChanged = (lastAttributes, currentAttributes) => {
  return (
    lastAttributes.length > 0 &&
    JSON.stringify(lastAttributes) !== JSON.stringify(currentAttributes)
  );
};

const getPivotComparisonShape = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  return {
    pivot_rows: payload.pivot_rows ?? [],
    pivot_columns: payload.pivot_columns ?? [],
    kpis: payload.kpis ?? [],
    kpi_wise_rows: Boolean(payload.kpi_wise_rows),
    isGrandtotalEnabled: Boolean(payload.isGrandtotalEnabled),
    compatible_versions: payload.compatible_versions ?? [],
    calculated_fields: payload.calculated_fields ?? {
      variance: [],
      contribution: [],
      custom_kpis: [],
    },
  };
};

export const isPivotPayloadDirty = (currentPayload, lastAppliedPayload) => {
  const current = getPivotComparisonShape(currentPayload);
  const last = getPivotComparisonShape(lastAppliedPayload);
  if (!current) return false;
  const hasLastApplied =
    !!last &&
    ((last.pivot_rows && last.pivot_rows.length > 0) ||
      (last.pivot_columns && last.pivot_columns.length > 0));
  if (!hasLastApplied) return true;
  return JSON.stringify(current) !== JSON.stringify(last);
};

// ---------------------------------------------------------------------------
// Dimension validation helpers
// ---------------------------------------------------------------------------

export const validateDimensions = ({
  pivotDescriptionData,
  viewDetails,
  onSelectFilterApply = false,
}) => {
  const pivotDescription = get(pivotDescriptionData, "dimension_values", []);

  if (onSelectFilterApply) {
    const { measures, ...filteredData } = pivotDescription;
    const allValues = Object.values(filteredData)
      .flat()
      .map((item) => item.value);
    const filteredViewDetails = viewDetails.filter(
      (item) => item !== "measurement"
    );
    return filteredViewDetails.every((item) => allValues.includes(item));
  }

  const viewColumnDimensions = get(viewDetails, "columnDimensions", []);
  const viewRowDimensions = get(viewDetails, "rowDimensions", []);

  const mergedDimensions = [...viewColumnDimensions, ...viewRowDimensions].filter(
    (item) => item.value !== "measures" && item.value !== "location"
  );

  return mergedDimensions.every((dimension) => {
    const groupKey = dimension.value.toLowerCase();
    const validValues = (pivotDescription[groupKey] || []).map((d) => d.value);
    return dimension.selectedDimension.every((selected) =>
      validValues.includes(selected.value)
    );
  });
};

export const getValidatedView = ({
  pivotDescriptionData,
  activeViewDetails,
  selectedPivotAttributes,
}) => {
  const hasActiveView = !isEmpty(activeViewDetails);
  const hasSelectedPivotAttrs = selectedPivotAttributes?.length > 0;

  if (!hasActiveView && hasSelectedPivotAttrs) {
    return validateDimensions({
      pivotDescriptionData,
      viewDetails: selectedPivotAttributes,
      onSelectFilterApply: true,
    });
  }

  if (hasActiveView) {
    return validateDimensions({
      pivotDescriptionData,
      viewDetails: activeViewDetails,
    });
  }

  return false;
};

export const isCalculatedFieldsValid = (
  calculatedFieldsSelection,
  selectedIds
) => {
  if (
    !calculatedFieldsSelection ||
    !calculatedFieldsSelection.variance ||
    !Array.isArray(calculatedFieldsSelection.variance)
  ) {
    return true;
  }
  const selectedKpis = selectedIds.map((kpi) => kpi.version);
  const varianceSelections = calculatedFieldsSelection.variance || [];

  return varianceSelections.every((varianceSelection) => {
    const kpiName = varianceSelection.value;
    const varianceList = varianceSelection.varianceList || [];
    if (varianceList.length === 0) return true;

    return varianceList.every((variance) => {
      const referenceVersion = `${kpiName}_${variance?.referenceVersion}`;
      const comparedVersion = `${kpiName}_${variance?.comparedVersion}`;
      return (
        selectedKpis.includes(referenceVersion) &&
        selectedKpis.includes(comparedVersion)
      );
    });
  });
};

export const pivotTableApplyButtonDisabled = (
  selectedIds,
  rowDimensions,
  columnDimensions
) => {
  if (isEmpty(selectedIds)) return true;
  if (isEmpty(rowDimensions) || isEmpty(columnDimensions)) return true;

  if (!isEmpty(rowDimensions)) {
    const hasInvalidRowDimensions = rowDimensions.some((dimension) =>
      isEmpty(dimension.selectedDimension)
    );
    if (hasInvalidRowDimensions) return true;
  }

  if (!isEmpty(columnDimensions)) {
    const hasInvalidColumnDimensions = columnDimensions.some((dimension) =>
      isEmpty(dimension.selectedDimension)
    );
    if (hasInvalidColumnDimensions) return true;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Panel lifecycle
// ---------------------------------------------------------------------------

export const resetPivotPanelOnApply = (
  dispatch,
  actions,
  attribute_values
) => {
  dispatch(actions.setPivotHideAttributes({}));
  dispatch(setPersistentPivotHideAttributes({}));
  dispatch(actions.setPivotAttributeValue(attribute_values));
};

export const handlePivotPanelClose = (
  dispatch,
  actions,
  attribute_values
) => {
  dispatch(actions.setIsPivotPanelOpen(false));
  resetPivotPanelOnApply(dispatch, actions, attribute_values);
};
