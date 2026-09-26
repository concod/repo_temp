import { CREATE_RULES_SELECT_PRODUCTS_CONFIG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

export const extractFilterConfigList = (response) => {
  const raw = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(raw)) {
    return raw;
  }
  if (Array.isArray(raw?.filters)) {
    return raw.filters;
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw)
      .flat()
      .filter((item) => item?.column_name);
  }
  return [];
};

export const buildDCSelectionFilterFields = (apiData) => {
  if (!Array.isArray(apiData)) {
    return [];
  }

  return [...apiData]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((item, index) => ({
      ...CREATE_RULES_SELECT_PRODUCTS_CONFIG,
      ...item,
      level: index + 1,
      column_name: item.column_name,
      label: item.display_name || item.label || item.column_name,
      dimension: item.dimension || item.extra?.dimension || "product",
      type: item.type || item.filter_type || "cascaded",
      display_type: item.display_type || "dropdown",
      is_multiple_selection: item.is_multiple_selection !== false,
      is_required: Boolean(item.is_mandatory),
    }))
    .filter((item) => item.column_name && item.display_type === "dropdown");
};

export const buildDCSelectionAppliedFilters = (
  filterFields = [],
  selectedValues = {},
  currentColumn
) =>
  filterFields
    .filter(
      (field) =>
        field.column_name !== currentColumn &&
        selectedValues[field.column_name]?.length
    )
    .map((field) => ({
      attribute_name: field.column_name,
      operator: "in",
      values: selectedValues[field.column_name].map(
        (option) => option?.value ?? option
      ),
      filter_type: field.type,
      filter_id: field.column_name,
      dimension: field.dimension,
    }));

export const buildDCSelectionFilterCacheKey = (
  column,
  filterFields = [],
  selectedValues = {}
) => {
  const applied = buildDCSelectionAppliedFilters(
    filterFields,
    selectedValues,
    column
  );
  return `${column}|${applied
    .map((filter) => `${filter.attribute_name}:${filter.values.join(",")}`)
    .join("|")}`;
};

export const buildDCSelectionCreationPayload = (
  filterFields = [],
  selectedValues = {},
  selectAllState = {},
  updateFlowOptions = null
) => {
  const payload = {
    filters: filterFields
      .filter((field) => selectedValues[field.column_name]?.length)
      .map((field) => ({
        filter_name: field.label || field.display_name || field.column_name,
        filter_id: field.column_name,
        filter_type: field.type || "cascaded",
        dimension: field.dimension || "store",
        display_type: field.display_type || "dropdown",
        check_configuration: selectAllState[field.column_name]
          ? [{ checkAll: true, meta: {} }]
          : [],
        is_mandatory: Boolean(field.is_mandatory),
        extra:
          field.extra && typeof field.extra === "object" ? field.extra : {},
        values: selectedValues[field.column_name].map(
          (option) => option?.value ?? option
        ),
        attribute_name: field.column_name,
        operator: "in",
        display_order: field.display_order ?? field.level,
      })),
    meta: {
      search: [],
      sort: [],
      range: [],
    },
  };

  if (updateFlowOptions) {
    payload.is_update_flow = true;
    payload.updated_constraint = {
      is_filter_changed: Boolean(updateFlowOptions.isFilterChanged),
      is_fulfillment_type_changed: Boolean(
        updateFlowOptions.isFulfilmentTypeChanged
      ),
      rule_id: updateFlowOptions.ruleId,
    };
  }

  return payload;
};

const getFilterOptionValue = (option) => option?.value ?? option;

export const buildFilterMappedPayload = (
  filterFields = [],
  selectedValues = {}
) => {
  const keys = filterFields.length
    ? filterFields.map((field) => field.column_name).filter(Boolean)
    : Object.keys(selectedValues || {});

  return keys.reduce((mapped, key) => {
    mapped[key] = (selectedValues[key] || []).map(getFilterOptionValue);
    return mapped;
  }, {});
};

export const mapFilterMappedToSelection = (filterMapped = {}) =>
  Object.entries(filterMapped).reduce((acc, [key, values]) => {
    acc[key] = (Array.isArray(values) ? values : []).map((value) =>
      value && typeof value === "object"
        ? value
        : { label: String(value), value }
    );
    return acc;
  }, {});

const normalizeFilterSelectionForCompare = (
  filterFields = [],
  selectedValues = {}
) => {
  const mapped = buildFilterMappedPayload(filterFields, selectedValues);

  return Object.keys(mapped)
    .sort()
    .reduce((normalized, key) => {
      normalized[key] = [...mapped[key]].map(String).sort();
      return normalized;
    }, {});
};

export const areDcSelectionFiltersEqual = (
  initialSelectedValues = {},
  currentSelectedValues = {},
  filterFields = []
) => {
  const initialNormalized = normalizeFilterSelectionForCompare(
    filterFields,
    initialSelectedValues
  );
  const currentNormalized = normalizeFilterSelectionForCompare(
    filterFields,
    currentSelectedValues
  );
  const initialKeys = Object.keys(initialNormalized);
  const currentKeys = Object.keys(currentNormalized);

  if (initialKeys.length !== currentKeys.length) {
    return false;
  }

  return initialKeys.every(
    (key) =>
      currentNormalized[key] &&
      initialNormalized[key].join("|") === currentNormalized[key].join("|")
  );
};
