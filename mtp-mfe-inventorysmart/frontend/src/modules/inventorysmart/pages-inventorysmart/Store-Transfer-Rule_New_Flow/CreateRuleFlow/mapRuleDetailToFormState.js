import {
  FULFILMENT_TYPE,
  NO_GEOGRAPHICAL_RESTRICTION,
  POOL_METHOD_TAB,
  STORE_SELECTION_TAB,
} from "../constants";
import {
  getDefaultPoolHierarchySelections,
  getPoolHierarchyFilters,
  mapStoreTransferFilterOptions,
} from "./storeSelectionUtils";

const FULFILLMENT_TYPE_UI_MAP = {
  need_based: FULFILMENT_TYPE.NEED_BASED,
  fixed_push: FULFILMENT_TYPE.FIXED_PUSH,
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Rule-detail / filter APIs may return selection payloads as:
 * - `[11, 12]` / `["Apparel"]`
 * - `[{ code, name }]`
 * - `{ values: [...] }`
 * - `[{ type, operator, values: [...] }]` (cascade filter shape)
 */
const unwrapFilterValues = (raw) => {
  if (raw == null || raw === "") {
    return [];
  }

  if (isPlainObject(raw) && Array.isArray(raw.values)) {
    return unwrapFilterValues(raw.values);
  }

  if (!Array.isArray(raw)) {
    return [raw];
  }

  if (
    raw.length > 0 &&
    isPlainObject(raw[0]) &&
    Array.isArray(raw[0].values) &&
    raw[0].code === undefined &&
    raw[0].name === undefined &&
    raw[0].label === undefined &&
    raw[0].value === undefined
  ) {
    return raw.flatMap((entry) => unwrapFilterValues(entry?.values));
  }

  return raw;
};

const toPrimitiveDisplayValue = (value) => {
  if (value == null) {
    return "";
  }
  if (typeof value === "object") {
    return "";
  }
  return String(value);
};

/**
 * Normalize API values into Select options `{ label, value }` with primitive fields only.
 */
const toOptions = (values = []) => {
  const normalizedValues = unwrapFilterValues(values).filter(
    (item) => item != null && item !== ""
  );

  if (!normalizedValues.length) {
    return [];
  }

  const first = normalizedValues[0];

  if (isPlainObject(first) && (first.code !== undefined || first.name !== undefined)) {
    return mapStoreTransferFilterOptions(normalizedValues).map((option) => ({
      ...option,
      label: toPrimitiveDisplayValue(option.label),
      value:
        typeof option.value === "object" ? option.code ?? option.id : option.value,
      id:
        typeof option.id === "object"
          ? option.code ?? option.value
          : option.id ?? option.value,
    }));
  }

  if (isPlainObject(first) && (first.label !== undefined || first.value !== undefined)) {
    return normalizedValues
      .map((item) => {
        const optionValue =
          item.value !== undefined && typeof item.value !== "object"
            ? item.value
            : item.code ?? item.id;
        const optionLabel =
          item.label != null && typeof item.label !== "object"
            ? item.label
            : item.name ?? optionValue;

        if (optionValue == null || typeof optionValue === "object") {
          return null;
        }

        return {
          id: optionValue,
          label: toPrimitiveDisplayValue(optionLabel),
          value: optionValue,
          ...(item.rawName !== undefined && typeof item.rawName !== "object"
            ? { rawName: item.rawName }
            : {}),
        };
      })
      .filter(Boolean);
  }

  // Primitives (and unknown shapes): only keep renderable option values.
  const primitiveValues = normalizedValues.filter(
    (item) => item == null || typeof item !== "object"
  );

  return mapStoreTransferFilterOptions(primitiveValues).map((option) => ({
    ...option,
    label: toPrimitiveDisplayValue(option.label),
    value:
      typeof option.value === "object" ? toPrimitiveDisplayValue(option.value) : option.value,
    id: typeof option.id === "object" ? option.value : option.id ?? option.value,
  }));
};

const mapHierarchySelectionsFromFilters = (
  filters = {},
  hierarchyFilters = []
) => {
  const selections = {};
  const safeFilters = Array.isArray(hierarchyFilters) ? hierarchyFilters : [];

  safeFilters.forEach((filter) => {
    selections[filter.column] = toOptions(filters?.[filter.column] || []);
  });

  return selections;
};

const mapAttributeSelectionsFromPool = (
  poolPayload = {},
  filterByAttributes = []
) =>
  (Array.isArray(filterByAttributes) ? filterByAttributes : []).reduce(
    (acc, filter) => {
      acc[filter.column] = toOptions(poolPayload?.[filter.column] || []);
      return acc;
    },
    {}
  );

const mapPoolStateFromPayload = (
  poolPayload,
  { filterByAttributes = [], hierarchyFilters = [] } = {}
) => {
  if (!poolPayload) {
    return null;
  }

  const isGroupsTab =
    poolPayload.tab === STORE_SELECTION_TAB.STORE_GROUPS ||
    poolPayload.tab === POOL_METHOD_TAB.GROUPS;
  const poolHierarchyFilters = getPoolHierarchyFilters(
    hierarchyFilters,
    filterByAttributes
  );

  return {
    activeMethod: isGroupsTab
      ? POOL_METHOD_TAB.GROUPS
      : POOL_METHOD_TAB.HIERARCHY,
    storeGroup: toOptions(poolPayload.store_groups || []),
    poolHierarchySelections: isGroupsTab
      ? getDefaultPoolHierarchySelections(poolHierarchyFilters)
      : mapHierarchySelectionsFromFilters(
          poolPayload.filters || {},
          poolHierarchyFilters
        ),
    attributeSelections: mapAttributeSelectionsFromPool(
      poolPayload,
      filterByAttributes
    ),
    gradeFilter: toOptions(poolPayload.psa_name || []),
    excludeStores: toOptions(poolPayload.exclude_stores || []),
  };
};

export const mapRuleDetailToFormState = (ruleDetail = {}) => ({
  ruleName: ruleDetail.rule_name || "",
  description: ruleDetail.rule_description || "",
  fulfilmentType:
    FULFILLMENT_TYPE_UI_MAP[ruleDetail.fulfillment_type] ||
    FULFILMENT_TYPE.NEED_BASED,
});

export const mapRuleDetailToStoreSelectionState = (
  ruleDetail = {},
  storeSelectionOptions = {}
) => {
  const {
    hierarchy_filters: hierarchyFilters = [],
    attribute_filters: attributeFilters = [],
    filter_by_attributes: filterByAttributes = [],
  } = storeSelectionOptions || {};

  const safeHierarchyFilters = Array.isArray(hierarchyFilters)
    ? hierarchyFilters
    : [];
  const safeAttributeFilters = Array.isArray(attributeFilters)
    ? attributeFilters
    : [];
  const safeFilterByAttributes = Array.isArray(filterByAttributes)
    ? filterByAttributes
    : [];

  const selectedTab = ruleDetail.tab || STORE_SELECTION_TAB.STORE_GROUPS;
  const attributeColumn = safeAttributeFilters[0]?.column || "psa_name";
  const geographicalRestriction = ruleDetail.geographical_restriction;

  const attributeTransferRestrictions = toOptions(
    ruleDetail[attributeColumn] || []
  )
    .map((option) => option.value)
    .filter((value) => value != null && typeof value !== "object");

  return {
    selectedTab,
    selectedStoreGroup: toOptions(ruleDetail.store_groups || []),
    hierarchySelections: mapHierarchySelectionsFromFilters(
      ruleDetail.filters || {},
      safeHierarchyFilters
    ),
    attributeTransferRestrictions,
    selectedGeographicalRestriction:
      geographicalRestriction == null
        ? NO_GEOGRAPHICAL_RESTRICTION.value
        : geographicalRestriction,
    sourcePoolState: mapPoolStateFromPayload(ruleDetail.source_pool, {
      filterByAttributes: safeFilterByAttributes,
      hierarchyFilters: safeHierarchyFilters,
    }),
    destinationPoolState: mapPoolStateFromPayload(ruleDetail.destination_pool, {
      filterByAttributes: safeFilterByAttributes,
      hierarchyFilters: safeHierarchyFilters,
    }),
  };
};
