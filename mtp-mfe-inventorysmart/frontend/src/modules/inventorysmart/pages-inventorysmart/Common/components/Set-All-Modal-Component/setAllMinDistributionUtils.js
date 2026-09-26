import {
  buildMinDistributionAttributeValue,
  buildXUnitsPerSize,
  buildGroupedSizeOptions,
  extractSizeGroups,
} from "modules/inventorysmart/pages-inventorysmart/Constraints/create-new-rule-flow/createNewRuleConstraintsUtils";
import { flattenSelectedSizeOptions } from "modules/inventorysmart/pages-inventorysmart/Constraints/create-new-rule-flow/min-distribution/sizeSelectHelpers";
import { getRclConstraintSizes } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";

export const DEFAULT_MIN_DIST_STATE = {
  styleType: "same_min",
  styleUnits: "",
  sizeType: "same_min",
  sizeUnits: "",
  selectedSizeOptions: [],
};

export const toSelectOptions = (options) =>
  options.map(({ label, value }) => ({ label, value, id: value }));

export const findSelectOption = (options, value) =>
  options.find((o) => o.value === value) || null;

export const resolveSelectOption = (option) =>
  Array.isArray(option) ? option[0] : option;

export const buildRclSizesPayload = ({
  useTableName,
  rulesTableName,
  localstoreKeyTableName,
  selectedPlan,
}) => {
  const tableName =
    rulesTableName ??
    (localstoreKeyTableName
      ? localStorage.getItem(localstoreKeyTableName)
      : null);
  const ruleList = (selectedPlan || [])
    .map((row) => row?.rule_code)
    .filter((code) => code != null && code !== "");
  const payload = { rule_list: ruleList };
  if (tableName) {
    payload.table_name = tableName;
  }
  return payload;
};

export const parseRclSizesResponse = (response) => {
  const payload = response?.data;
  if (payload?.show_message) return [];
  const data = payload?.data ?? payload;
  return buildGroupedSizeOptions(extractSizeGroups(data));
};

const rclSizesCache = { key: null, promise: null, data: null };

/** Dedupe concurrent / repeated RCL sizes requests across Set All rows. */
export const fetchRclConstraintSizesCached = (payload) => {
  const key = JSON.stringify(payload);
  if (rclSizesCache.key === key && rclSizesCache.data) {
    return Promise.resolve(rclSizesCache.data);
  }
  if (rclSizesCache.key === key && rclSizesCache.promise) {
    return rclSizesCache.promise;
  }
  rclSizesCache.key = key;
  rclSizesCache.promise = getRclConstraintSizes(payload)
    .then((response) => {
      const options = parseRclSizesResponse(response);
      rclSizesCache.data = options;
      return options;
    })
    .catch((error) => {
      if (rclSizesCache.key === key) {
        rclSizesCache.promise = null;
        rclSizesCache.data = null;
      }
      throw error;
    });
  return rclSizesCache.promise;
};

export const getMinStockCap = (minStock) => {
  const cap = Number(minStock);
  return Number.isFinite(cap) && cap > 0 ? cap : undefined;
};

export const isUnitsOverCap = (value, cap) =>
  cap !== undefined && value !== "" && value != null && Number(value) > cap;

export const isUnitsRequiredInvalid = (value) => {
  if (value === "" || value == null) return true;
  const n = Number(value);
  return !Number.isFinite(n) || n < 1;
};

export const validateMinDistState = (state, minStock) => {
  const errors = {
    styleUnits: false,
    styleUnitsHelper: "",
    sizeUnits: false,
    sizeUnitsHelper: "",
    sizes: false,
    sizesHelper: "",
  };
  let isValid = true;
  const minCap = getMinStockCap(minStock);

  if (state?.styleType === "x_units_per_article") {
    if (isUnitsRequiredInvalid(state.styleUnits)) {
      errors.styleUnits = true;
      errors.styleUnitsHelper = "Min Units is required.";
      isValid = false;
    } else if (isUnitsOverCap(state.styleUnits, minCap)) {
      errors.styleUnits = true;
      errors.styleUnitsHelper =
        minCap !== undefined ? `Cannot exceed Min (${minCap}).` : "";
      isValid = false;
    }
  }

  if (state?.sizeType === "x_units_per_size") {
    const selectedSizes = flattenSelectedSizeOptions(
      state.selectedSizeOptions || []
    );
    const sizeCount = selectedSizes.length;

    if (isUnitsRequiredInvalid(state.sizeUnits)) {
      errors.sizeUnits = true;
      errors.sizeUnitsHelper = "Min Units is required.";
      isValid = false;
    } else if (isUnitsOverCap(state.sizeUnits, minCap)) {
      errors.sizeUnits = true;
      errors.sizeUnitsHelper =
        minCap !== undefined ? `Cannot exceed Min (${minCap}).` : "";
      isValid = false;
    }

    if (sizeCount === 0) {
      errors.sizes = true;
      errors.sizesHelper = "Select at least one size.";
      isValid = false;
    }
  }

  return { isValid, errors };
};

export const minDistAttributeToState = (minDistribution) => {
  if (!minDistribution) return { ...DEFAULT_MIN_DIST_STATE };
  const styleType =
    minDistribution.style_distribution?.distribution_type || "same_min";
  const sizeType =
    minDistribution.size_distribution?.distribution_type || "same_min";
  const articleMap =
    minDistribution.style_distribution?.x_units_per_article || {};
  const styleUnits =
    styleType === "x_units_per_article"
      ? String(
          articleMap.min_unit ??
            articleMap["*"] ??
            Object.values(articleMap)[0] ??
            ""
        )
      : "";
  const sizeMap = minDistribution.size_distribution?.x_units_per_size || {};
  const sizeKeys = Object.keys(sizeMap);
  const sizeUnits =
    sizeType === "x_units_per_size" && sizeKeys.length
      ? String(sizeMap[sizeKeys[0]] ?? "")
      : "";
  const selectedSizeOptions = sizeKeys.map((size) => ({
    label: size,
    value: size,
    id: size,
  }));
  return {
    styleType,
    styleUnits,
    sizeType,
    sizeUnits,
    selectedSizeOptions,
  };
};

export const validateMinDistFromSavedRow = (minStock, minDistribution) =>
  validateMinDistState(minDistAttributeToState(minDistribution), minStock);

export const SET_ALL_CORE_REQUIRED_ACCESSORS = new Set([
  "min_stock",
  "max_stock",
  "wos",
  "dos",
  "start_date",
  "end_date",
]);

export const isMandatorySetAllField = (attribute) => {
  if (!attribute) return false;
  if (attribute.is_mandatory || attribute.required || attribute.is_required) {
    return true;
  }
  // Fallback: core constraint fields with form metadata are required in Set All UI
  return (
    Boolean(attribute.field_type) &&
    SET_ALL_CORE_REQUIRED_ACCESSORS.has(attribute.attribute_name)
  );
};

export const isEmptySetAllValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

/** Set All applies one units value to all style-color IDs via `min_unit`. */
export const buildSetAllXUnitsPerArticle = (units) => {
  const numericUnits = Number(units);
  return Number.isFinite(numericUnits) ? { min_unit: numericUnits } : {};
};

/** Nested object for the single `min_distribution` constraint attribute. */
export const buildSetAllMinDistributionValue = ({
  styleType,
  styleUnits,
  sizeType,
  sizeUnits,
  selectedSizeOptions,
}) => {
  const sizes = flattenSelectedSizeOptions(selectedSizeOptions || [])
    .map((o) => o.value ?? o.id)
    .filter(Boolean);

  const x_units_per_size =
    sizeType === "x_units_per_size"
      ? buildXUnitsPerSize({ sizes, units: sizeUnits })
      : {};

  const x_units_per_article =
    styleType === "x_units_per_article" && styleUnits
      ? buildSetAllXUnitsPerArticle(styleUnits)
      : {};

  return buildMinDistributionAttributeValue({
    style_distribution: {
      distribution_type: styleType || "same_min",
      x_units_per_article,
    },
    size_distribution: {
      distribution_type: sizeType || "same_min",
      x_units_per_size,
    },
    x_units_per_article,
    x_units_per_size,
  });
};

const STRAY_MIN_DIST_KEYS = [
  "style_distribution",
  "size_distribution",
  "x_units_per_article",
  "x_units_per_size",
];

/** Keep only `min_distribution`; drop flat keys from an earlier spread. */
export const applyMinDistributionToRow = (row, minDistState) => {
  STRAY_MIN_DIST_KEYS.forEach((key) => delete row[key]);
  row.min_distribution = buildSetAllMinDistributionValue(minDistState);
  return row;
};
