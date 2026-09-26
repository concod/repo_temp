import { cloneDeep } from "lodash";
import { CREATE_RULES_SELECT_PRODUCTS_CONFIG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

/** Screen key for `core/filter-configuration/screen/{name}` (Create new rule → Select Product). */
export const CONSTRAINTS_FILTER_SCREEN = "Create Rules Constraint Filters";

export const CREATE_NEW_RULE_FILTER_CONFIG_KEY = "createNewRuleSelectFilters";
export const CREATE_NEW_RULE_FILTER_GROUP_LABEL = "Create new rule filters";

/**
 * Top-level dimension for stacked filter panels (product / store / product_store).
 */
export function resolveTopLevelDimension(key) {
  if (key?.attribute_dimension != null && key.attribute_dimension !== "") {
    return key.attribute_dimension;
  }
  if (key?.dimension != null && key.dimension !== "") {
    return key.dimension;
  }
  return "product";
}

export function isStoreLikeApiDimension(dimension) {
  return dimension === "store" || dimension === "product_store";
}

function selectionHasValue(entry) {
  if (!entry) return false;
  const { values } = entry;
  if (values == null || values === "") return false;
  if (Array.isArray(values) && values.length === 0) return false;
  if (Array.isArray(values)) {
    return values.some((v) => {
      if (v == null || v === "") return false;
      if (typeof v === "object" && v && "value" in v) {
        return v.value != null && v.value !== "";
      }
      return true;
    });
  }
  return true;
}

function findDependencyForField(field, dependencies) {
  const col = field.column_name;
  return (dependencies || []).find(
    (d) =>
      d?.filter_id === col ||
      d?.attribute_name === col ||
      d?.column_name === col
  );
}

/** Mandatory flags come from filter-configuration API (`is_mandatory`). */
export function areMandatoryCreateRuleFiltersSatisfied(
  filterFieldConfig,
  selectedDependencies
) {
  const mandatory = (filterFieldConfig || []).filter((f) =>
    Boolean(f.is_mandatory)
  );
  if (mandatory.length === 0) return true;
  return mandatory.every((field) =>
    selectionHasValue(findDependencyForField(field, selectedDependencies))
  );
}

/** Build cross-filter field defs from Select Product filter-configuration API. */
export function buildFilterFieldsFromSelectProductConfig(
  apiData,
  createRulesConfigs,
  countryProductExtra
) {
  if (!Array.isArray(apiData)) {
    return [];
  }

  return apiData.map((key, index) => {
    const topLevelDimension = resolveTopLevelDimension(key);
    const fieldExtra =
      key?.extra && typeof key.extra === "object" ? cloneDeep(key.extra) : {};
    const attributeDimension = key?.attribute_dimension ?? topLevelDimension;

    return {
      ...CREATE_RULES_SELECT_PRODUCTS_CONFIG,
      ...key,
      level: index + 1,
      is_multiple_selection: !createRulesConfigs?.create_rcl_single_select_fields?.includes(
        key?.column_name
      ),
      dimension: topLevelDimension,
      attribute_dimension: attributeDimension,
      is_required: Boolean(key.is_mandatory),
      extra: {
        ...fieldExtra,
        ...(countryProductExtra && key.column_name === "l0_name"
          ? {
              ...(countryProductExtra || {}),
              include_in_filter_dependency: true,
            }
          : {}),
        dimension: fieldExtra.dimension ?? topLevelDimension,
      },
    };
  });
}
