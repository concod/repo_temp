import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { LOGISTICS_LEAD_TIME_MAX_DAYS } from "./logisticsConfigConstants";

export const ACTIVE_METHOD_LABELS = {
  store_groups: "Store groups",
  geography: "Geography",
  distance: "Distance",
};

const formatStoreGroupDisplayName = (name) => {
  if (name == null || name === "") {
    return "";
  }

  return replaceSpecialCharacter(String(name));
};

export const getStoreGroupPayloadName = (option) =>
  option?.rawName ?? option?.label ?? "";

const formatLeadTimeValue = (days) => `${days} Days`;
const formatPriorityValue = (priority) => `Rank ${priority}`;
const formatMinTransferQtyValue = (qty) => `${qty} Units`;

export const getRuleDisplayLabel = (rule, activeMethod) => {
  if (activeMethod === "distance") {
    if (rule.min_km != null && rule.max_km != null) {
      return `${rule.min_km}-${rule.max_km} Miles`;
    }
    return "—";
  }

  if (activeMethod === "geography") {
    return rule.label || rule.attribute || "—";
  }

  return formatStoreGroupDisplayName(rule.name || rule.label) || "—";
};

export const buildGeographyStateFromRules = (
  rules = [],
  geographyOptions = [],
  getValue
) => {
  const selectedGeography = rules.map((rule) => {
    const match = geographyOptions.find(
      (option) =>
        (option.attribute ?? option.value) === rule.attribute
    );

    return {
      id: rule.attribute,
      label: match?.label || rule.label || rule.attribute,
      value: rule.attribute,
    };
  });

  const geographyRuleValues = {};
  rules.forEach((rule) => {
    if (rule.attribute != null) {
      geographyRuleValues[rule.attribute] = String(getValue(rule) ?? "");
    }
  });

  return { selectedGeography, geographyRuleValues };
};

export const buildStoreGroupStateFromRules = (
  rules = [],
  storeGroupOptions = [],
  getValue
) => {
  const selectedStoreGroups = rules.map((rule) => {
    const match = storeGroupOptions.find(
      (option) =>
        option.rawName === rule.name ||
        option.label === rule.name ||
        String(option.value) === String(rule.name)
    );

    if (match) {
      return {
        id: match.value,
        label: match.label,
        value: match.value,
        rawName: match.rawName ?? rule.name,
      };
    }

    return {
      id: rule.name,
      label: formatStoreGroupDisplayName(rule.name),
      value: rule.name,
      rawName: rule.name,
    };
  });

  const storeGroupRuleValues = {};
  rules.forEach((rule, index) => {
    const option = selectedStoreGroups[index];
    if (option?.value != null) {
      storeGroupRuleValues[option.value] = String(getValue(rule) ?? "");
    }
  });

  return { selectedStoreGroups, storeGroupRuleValues };
};

const SECTION_DATA_KEYS = {
  lead_time: "lead_time",
  priority: "priority",
  min_transfer_qty: "min_transfer_qty",
};

export const getSectionDataFromLogistics = (logisticsData, sectionId) => {
  const dataKey = SECTION_DATA_KEYS[sectionId];
  return logisticsData?.data?.[dataKey] ?? null;
};

export const parseSectionRules = (sectionData, sectionId) => {
  if (!sectionData?.active_method) {
    return {
      rules: [],
      default: null,
      activeMethod: null,
      activeMethodLabel: null,
      isEmpty: true,
    };
  }

  const methodKey = sectionData.active_method;
  const methodData = sectionData[methodKey];

  if (!methodData) {
    return {
      rules: [],
      default: null,
      activeMethod: methodKey,
      activeMethodLabel: ACTIVE_METHOD_LABELS[methodKey] || methodKey,
      isEmpty: true,
    };
  }

  let rules = [];
  let defaultRule = null;

  if (sectionId === "lead_time") {
    rules = (methodData.rules || []).map((rule, index) => ({
      id: `lead-time-${index}`,
      label: getRuleDisplayLabel(rule, methodKey),
      subLabel: rule.store_count != null ? `${rule.store_count} stores` : null,
      value: formatLeadTimeValue(rule.lead_time_days),
    }));

    if (methodData.default?.lead_time_days != null) {
      defaultRule = {
        label: "Default",
        value: formatLeadTimeValue(methodData.default.lead_time_days),
      };
    }
  } else if (sectionId === "priority") {
    rules = (methodData.rules || []).map((rule, index) => ({
      id: `priority-${index}`,
      label: getRuleDisplayLabel(rule, methodKey),
      subLabel: rule.store_count != null ? `${rule.store_count} stores` : null,
      value: formatPriorityValue(rule.priority),
    }));

    if (methodData.default?.priority != null) {
      defaultRule = {
        label: "Default",
        value: formatPriorityValue(methodData.default.priority),
      };
    }
  } else if (sectionId === "min_transfer_qty") {
    rules = (methodData.rules || []).map((rule, index) => ({
      id: `min-transfer-${index}`,
      label: getRuleDisplayLabel(rule, methodKey),
      subLabel: rule.store_count != null ? `${rule.store_count} stores` : null,
      value: formatMinTransferQtyValue(rule.min_transfer_qty),
    }));

    if (methodData.default?.min_transfer_qty != null) {
      defaultRule = {
        label: "Default",
        value: formatMinTransferQtyValue(methodData.default.min_transfer_qty),
      };
    }
  }

  const isEmpty = rules.length === 0 && !defaultRule;

  return {
    rules,
    default: defaultRule,
    activeMethod: methodKey,
    activeMethodLabel: ACTIVE_METHOD_LABELS[methodKey] || methodKey,
    isEmpty,
  };
};

export const buildRankOptions = (itemCount) =>
  Array.from({ length: itemCount + 1 }, (_, index) => {
    const rank = index + 1;
    return {
      id: rank,
      label: String(rank),
      value: rank,
    };
  });

export const findRankOption = (options, value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return (
    options.find((option) => String(option.value) === String(value)) || null
  );
};

export const mapStoreGroupPoolOptions = (values = []) =>
  values.map((item) => ({
    id: item.code,
    label: formatStoreGroupDisplayName(item.name),
    value: item.code,
    rawName: item.name,
  }));

/**
 * Mirrors agGrid InputCell getNewValue for integers:
 * empty stays empty; otherwise parseFloat → parseInt and clamp to [min, max].
 */
export const getLogisticsIntegerInputValue = (
  value,
  { min = 0, max = Number.POSITIVE_INFINITY } = {}
) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const cleaned = String(value).replace(/,/g, "").trim();
  if (
    cleaned === "" ||
    cleaned === "-" ||
    cleaned === "." ||
    cleaned === "-."
  ) {
    return "";
  }

  const parsedFloat = parseFloat(cleaned);
  if (!Number.isFinite(parsedFloat)) {
    return "";
  }

  const parsed = Math.trunc(parsedFloat);
  return String(Math.min(Math.max(parsed, min), max));
};

export const clampLeadTimeDaysValue = (value) => {
  if (value === "" || value === null || value === undefined) {
    return { value: "", exceeded: false };
  }

  const integerValue = getLogisticsIntegerInputValue(value, { min: 0 });
  if (integerValue === "") {
    return { value: "", exceeded: false };
  }

  const parsed = Number(integerValue);
  if (parsed > LOGISTICS_LEAD_TIME_MAX_DAYS) {
    return { value: String(LOGISTICS_LEAD_TIME_MAX_DAYS), exceeded: true };
  }

  return { value: integerValue, exceeded: false };
};

const hasFilledValue = (value) => String(value ?? "").trim() !== "";

const SECTION_VALUE_KEYS = {
  lead_time: "lead_time_days",
  priority: "priority",
  min_transfer_qty: "min_transfer_qty",
};

const parseRuleNumericValue = (value) => {
  const integerValue = getLogisticsIntegerInputValue(value, { min: 0 });
  return integerValue === "" ? 0 : Number(integerValue);
};

export const buildLogisticsConfigurationSavePayload = ({
  sectionId,
  activeMethod,
  selectedStoreGroups = [],
  storeGroupRuleValues = {},
  selectedGeography = [],
  geographyRuleValues = {},
  distanceRanges = [],
  defaultRuleValue = "",
}) => {
  const valueKey = SECTION_VALUE_KEYS[sectionId];
  let rules = [];

  if (activeMethod === "store_groups") {
    rules = selectedStoreGroups.map((option) => ({
      name: getStoreGroupPayloadName(option),
      [valueKey]: parseRuleNumericValue(storeGroupRuleValues[option.value]),
    }));
  } else if (activeMethod === "geography") {
    rules = selectedGeography.map((option) => ({
      attribute: option.value,
      [valueKey]: parseRuleNumericValue(geographyRuleValues[option.value]),
    }));
  } else if (activeMethod === "distance") {
    rules = distanceRanges.map((range) => ({
      min_km: parseRuleNumericValue(range.from),
      max_km: parseRuleNumericValue(range.to),
      [valueKey]: parseRuleNumericValue(range.value),
    }));
  }

  return {
    config_type: sectionId,
    method: activeMethod,
    rules,
    default: {
      [valueKey]: parseRuleNumericValue(defaultRuleValue),
    },
  };
};

export const isLogisticsPanelSaveEnabled = ({
  activeMethod,
  selectedStoreGroups = [],
  storeGroupRuleValues = {},
  selectedGeography = [],
  geographyRuleValues = {},
  distanceRanges = [],
  defaultRuleValue = "",
}) => {
  if (!hasFilledValue(defaultRuleValue)) {
    return false;
  }

  if (activeMethod === "store_groups") {
    return selectedStoreGroups.every((option) =>
      hasFilledValue(storeGroupRuleValues[option.value])
    );
  }

  if (activeMethod === "geography") {
    return selectedGeography.every((option) =>
      hasFilledValue(geographyRuleValues[option.value])
    );
  }

  if (activeMethod === "distance") {
    return distanceRanges.every(
      (range) => hasFilledValue(range.to) && hasFilledValue(range.value)
    );
  }

  return false;
};

export const hasMethodTabData = ({
  method,
  selectedStoreGroups = [],
  storeGroupRuleValues = {},
  selectedGeography = [],
  geographyRuleValues = {},
  distanceRanges = [],
  defaultRuleValue = "",
}) => {
  if (method === "store_groups") {
    return (
      selectedStoreGroups.length > 0 ||
      hasFilledValue(defaultRuleValue) ||
      Object.values(storeGroupRuleValues).some(hasFilledValue)
    );
  }

  if (method === "geography") {
    return (
      selectedGeography.length > 0 ||
      hasFilledValue(defaultRuleValue) ||
      Object.values(geographyRuleValues).some(hasFilledValue)
    );
  }

  if (method === "distance") {
    return (
      hasFilledValue(defaultRuleValue) ||
      distanceRanges.some(
        (range) => hasFilledValue(range.to) || hasFilledValue(range.value)
      ) ||
      distanceRanges.length > 0
    );
  }

  return false;
};
