import {
  MIN_DISTRIBUTION_MAP,
  SIZE_DISTRIBUTION_DISPLAY_MAP,
  STYLE_DISTRIBUTION_DISPLAY_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { USE_CREATION_RCL_DIMENSION } from "./mock";

/** True when row is a newly created rule (API: `rule_type` / `is_new_rule`). */
export function isCreateNewRuleRow(row) {
  if (!row) return false;
  return row.is_new_rule === true || row.rule_type === "new_rule";
}

export function getRuleTypeStatusLabel(row) {
  return isCreateNewRuleRow(row) ? "New Rule" : "Existing Rule";
}

/** Legacy min/style payload: wrap scalar rcl_dimension values in arrays. */
function toRclDimensionPayload(rclDimension) {
  if (!rclDimension || typeof rclDimension !== "object") {
    return null;
  }
  const payload = {};
  Object.entries(rclDimension).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }
    payload[key] = Array.isArray(value) ? value : [value];
  });
  return Object.keys(payload).length ? payload : null;
}

/** Payload for `/constraint/distribution-strategy/min/style`. */
export function buildStyleMinDistributionPayload(parentRow) {
  if (!parentRow) {
    return {};
  }
  if (isCreateNewRuleRow(parentRow)) {
    if (USE_CREATION_RCL_DIMENSION) {
      return parentRow.rcl_dimension
        ? { rcl_dimension: parentRow.rcl_dimension }
        : {};
    }
    const rcl_dimension = toRclDimensionPayload(
      parentRow.rcl_dimension || {
        l0_name: parentRow.l0_name,
        l1_name: parentRow.l1_name,
      }
    );
    return rcl_dimension ? { rcl_dimension } : {};
  }
  const payload = {};
  if (parentRow.rule_code != null && parentRow.rule_code !== "") {
    const numericCode = Number(parentRow.rule_code);
    payload.rule_code = Number.isNaN(numericCode)
      ? parentRow.rule_code
      : numericCode;
  }
  return payload;
}

/** Payload for `/constraint/distribution-strategy/min/size`. */
export function buildSizeMinDistributionPayload(
  parentRow,
  article,
  storeCode
) {
  const payload = {};
  if (article != null && article !== "") {
    payload.article = String(article);
  }
  if (parentRow?.psa_code) {
    payload.psa_code = parentRow.psa_code;
  }
  if (!parentRow) {
    if (storeCode != null && storeCode !== "") {
      payload.store_code = storeCode;
    }
    return payload;
  }
  let result;
  if (isCreateNewRuleRow(parentRow)) {
    const stylePayload = buildStyleMinDistributionPayload(parentRow);
    if (stylePayload.rcl_dimension) {
      payload.rcl_dimension = stylePayload.rcl_dimension;
    }
    result = payload;
  } else {
    result = {
      ...payload,
      ...buildStyleMinDistributionPayload(parentRow),
    };
  }
  if (storeCode != null && storeCode !== "") {
    result.store_code = storeCode;
  }
  return result;
}

export function extractStyleTableName(data, depth = 0) {
  if (depth > 5) {
    return null;
  }
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const direct = data.table_name || data.temp_table || data.tableName;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  if (data.data != null && data.data !== data) {
    return extractStyleTableName(data.data, depth + 1);
  }
  return (
    data.style?.table_name ||
    data.size?.table_name ||
    null
  );
}

function getArticleId(item) {
  if (item == null) return "";
  if (typeof item !== "object") return String(item);
  return String(
    item.article ||
      item.article_id ||
      item.style_color_id ||
      item.style_colour_id ||
      item.id ||
      ""
  );
}

/** Style Color ID + Description options from `/min/style`. */
export function extractStyleArticleOptions(data) {
  if (!data) return [];
  const list =
    data.articles || data.style_color_ids || data.article_ids || data.stores;
  if (Array.isArray(list)) {
    return list
      .map((item) => {
        if (item == null) return null;
        if (typeof item !== "object") {
          return { article: String(item), description: "" };
        }
        const article = getArticleId(item);
        if (!article) return null;
        return {
          article,
          description: String(
            item.description || item.article_description || item.name || ""
          ),
        };
      })
      .filter(Boolean);
  }
  if (
    data.x_units_per_article &&
    typeof data.x_units_per_article === "object"
  ) {
    return Object.keys(data.x_units_per_article).map((article) => ({
      article,
      description: "",
    }));
  }
  return [];
}

export function buildXUnitsPerArticle({ articles, units, existing } = {}) {
  const keys =
    articles?.length > 0 ? articles : existing ? Object.keys(existing) : [];
  const numericUnits = Number(units);
  const fallback = Number.isFinite(numericUnits) ? numericUnits : 0;
  return keys.reduce((acc, article) => {
    acc[article] = fallback;
    return acc;
  }, {});
}

function toSizeName(item) {
  if (item == null) return "";
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }
  const name = item.size || item.size_name || item.name || item.label;
  return name == null ? "" : String(name);
}

function toUniqueSizeNames(list) {
  const names = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const name = toSizeName(item);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

export function toSizeSelectOption(size) {
  return { label: size, value: size, id: size };
}

export function flattenSizeGroups(groups) {
  return [...(groups?.alpha || []), ...(groups?.numeric || [])];
}

/** Grouped Select options: Alphabetical Sizes / Numeric Sizes. */
export function buildGroupedSizeOptions(groups) {
  const options = [];
  const alpha = groups?.alpha || [];
  const numeric = groups?.numeric || [];
  if (alpha.length) {
    options.push({
      label: "Alphabetical Sizes",
      options: alpha.map(toSizeSelectOption),
    });
  }
  if (numeric.length) {
    options.push({
      label: "Numeric Sizes",
      options: numeric.map(toSizeSelectOption),
    });
  }
  return options;
}

const EMPTY_SIZE_GROUPS = { alpha: [], numeric: [] };

/** Alpha/numeric size lists from `/min/size` `{ sizes: { alpha, numeric } }`. */
export function extractSizeGroups(data) {
  if (!data) return { ...EMPTY_SIZE_GROUPS };
  if (Array.isArray(data)) {
    return extractSizeGroups({ stores: data });
  }
  if (typeof data !== "object") return { ...EMPTY_SIZE_GROUPS };

  const sizes = data.sizes;
  if (sizes && typeof sizes === "object" && !Array.isArray(sizes)) {
    return {
      alpha: toUniqueSizeNames(
        sizes.alpha || sizes.alphabetical || sizes.alphabet
      ),
      numeric: toUniqueSizeNames(sizes.numeric || sizes.numerical),
    };
  }

  if (data.alpha || data.numeric) {
    return {
      alpha: toUniqueSizeNames(data.alpha),
      numeric: toUniqueSizeNames(data.numeric),
    };
  }

  const names = extractSizeNames(data);
  return { alpha: names, numeric: [] };
}

/** Size names from `/min/size` for the Atleast X per size dropdown. */
export function extractSizeNames(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return extractSizeNames({ stores: data });
  }
  if (typeof data !== "object") return [];

  const names = [];
  const add = (item) => {
    const name = toSizeName(item);
    if (name && !names.includes(name)) names.push(name);
  };

  if (data.sizes && typeof data.sizes === "object" && !Array.isArray(data.sizes)) {
    toUniqueSizeNames(
      data.sizes.alpha || data.sizes.alphabetical || data.sizes.alphabet
    ).forEach(add);
    toUniqueSizeNames(data.sizes.numeric || data.sizes.numerical).forEach(add);
    if (names.length) return names;
  }

  if (Array.isArray(data.sizes)) data.sizes.forEach(add);
  if (Array.isArray(data.size_list)) data.size_list.forEach(add);
  if (Array.isArray(data.sizeList)) data.sizeList.forEach(add);

  const stores = data.stores;
  if (Array.isArray(stores) && stores.length) {
    const allPrimitive = stores.every(
      (item) => typeof item === "string" || typeof item === "number"
    );
    if (allPrimitive) {
      stores.forEach(add);
    } else {
      stores.forEach((store) => {
        add(store);
        if (Array.isArray(store?.data)) store.data.forEach(add);
        if (Array.isArray(store?.sizes)) store.sizes.forEach(add);
      });
    }
  }

  if (!names.length) {
    normalizeSizePreviewRows(data).sizes.forEach(add);
  }
  return names;
}

export function buildXUnitsPerSize({ sizes, units } = {}) {
  const numericUnits = Number(units);
  const fallback = Number.isFinite(numericUnits) ? numericUnits : 0;
  return (Array.isArray(sizes) ? sizes : []).reduce((acc, size) => {
    if (size) acc[size] = fallback;
    return acc;
  }, {});
}

function toStylePreviewRow(item) {
  if (item == null) return null;
  if (typeof item !== "object") {
    return { article: String(item), min: "" };
  }
  const article =
    item.article ||
    item.article_id ||
    item.style_color_id ||
    item.style_colour_id ||
    item.id;
  if (article == null || article === "") return null;
  return {
    article: String(article),
    min: item.min ?? item.min_stock ?? item.units ?? item.value ?? "",
  };
}

export function normalizeStylePreviewRows(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(toStylePreviewRow).filter(Boolean);
  }
  const list = data.preview || data.articles || data.rows || data.data;
  if (Array.isArray(list)) {
    return list.map(toStylePreviewRow).filter(Boolean);
  }
  const single = toStylePreviewRow(data);
  return single ? [single] : [];
}

export function extractArticleMinFromStylePreview(data, article) {
  const rows = normalizeStylePreviewRows(data);
  if (article != null && article !== "") {
    const match = rows.find((row) => String(row.article) === String(article));
    if (match != null && match.min !== "" && match.min != null) {
      const numericMin = Number(match.min);
      return Number.isFinite(numericMin) ? numericMin : null;
    }
  }
  if (rows.length === 1 && rows[0].min !== "" && rows[0].min != null) {
    const numericMin = Number(rows[0].min);
    return Number.isFinite(numericMin) ? numericMin : null;
  }
  if (data && typeof data === "object" && data.min != null && data.min !== "") {
    const numericMin = Number(data.min);
    return Number.isFinite(numericMin) ? numericMin : null;
  }
  return null;
}

function getStoreCode(store) {
  if (!store || typeof store !== "object") return "";
  const code =
    store.store_code ?? store.store_number ?? store.store ?? store.store_id;
  return code == null ? "" : String(code);
}

function getSizeCellValue(item) {
  if (item == null || typeof item !== "object") return item ?? "";
  return (
    item.min ??
    item.value ??
    item.units ??
    item.min_stock ??
    item.normalized_size_level_proportion ??
    ""
  );
}

/** Flatten `/min/calculate-size-preview` into store rows + size columns. */
export function normalizeSizePreviewRows(data) {
  const source = Array.isArray(data)
    ? data
    : data?.stores || data?.preview || data?.rows || data?.data;
  if (!Array.isArray(source) || source.length === 0) {
    return { rows: [], sizes: [] };
  }

  if (Array.isArray(source[0]?.data) || source[0]?.size || source[0]?.size_name) {
    const sizes = [];
    const rowsByStore = new Map();
    source.forEach((store, index) => {
      const storeNumber = getStoreCode(store);
      const key = storeNumber || `store-${index}`;
      if (!rowsByStore.has(key)) {
        rowsByStore.set(key, { store_number: storeNumber, key });
      }
      const row = rowsByStore.get(key);
      const cells = Array.isArray(store.data)
        ? store.data
        : store.size || store.size_name
          ? [store]
          : [];
      cells.forEach((item) => {
        const size = item?.size || item?.size_name;
        if (!size) return;
        if (!sizes.includes(size)) sizes.push(size);
        row[size] = getSizeCellValue(item);
      });
    });
    return { rows: Array.from(rowsByStore.values()), sizes };
  }

  const skipKeys = new Set([
    "store",
    "store_code",
    "store_number",
    "store_id",
    "store_name",
    "article",
    "description",
    "min",
    "size",
    "key",
  ]);
  const sizes = [];
  source.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!skipKeys.has(key) && !sizes.includes(key)) {
        sizes.push(key);
      }
    });
  });
  const rows = source.map((row, index) => {
    const storeNumber = getStoreCode(row) || String(row?.store_number || "");
    return {
      ...row,
      store_number: storeNumber,
      key: `${storeNumber || "store"}-${index}`,
    };
  });
  return { rows, sizes };
}

export const PRODUCT_TYPE_COLUMN_LABEL = "Rule Type";

function toSummaryCount(value) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildRulesSummaryBannerMessage(summary) {
  if (!summary || typeof summary !== "object") {
    return null;
  }

  const newRules = toSummaryCount(summary.new_rules);
  const existingRules = toSummaryCount(summary.existing_rules);
  const totalRules = toSummaryCount(summary.total_rules);

  if (newRules == null && existingRules == null) {
    return null;
  }

  const newCount = newRules ?? 0;
  const existingCount = existingRules ?? 0;

  if (newCount > 0 && existingCount > 0) {
    const total = totalRules ?? newCount + existingCount;
    return `${newCount} of ${total} rules created. ${existingCount} rules already exist.`;
  }

  if (newCount > 0 && existingCount === 0) {
    return "Rules created successfully.";
  }

  if (existingCount > 0 && newCount === 0) {
    return "No new rules created. All selected rules already exist.";
  }

  return null;
}

function parseJsonIfNeeded(value) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function coerceDistribution(value) {
  const parsed = parseJsonIfNeeded(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed;
}

function hasDistributionType(value) {
  return Boolean(coerceDistribution(value)?.distribution_type);
}

/** True only for the new style+size payload, not legacy `{ distribution_type }`. */
export function hasNestedStyleSizeMinDistribution(subRow) {
  if (!subRow) {
    return false;
  }
  const fromMinDistribution = coerceDistribution(subRow.min_distribution);
  if (
    fromMinDistribution?.style_distribution ||
    fromMinDistribution?.size_distribution
  ) {
    return true;
  }
  const topStyle = coerceDistribution(subRow.style_distribution);
  const topSize = coerceDistribution(subRow.size_distribution);
  return hasDistributionType(topStyle) || hasDistributionType(topSize);
}

const DEFAULT_STYLE_DISTRIBUTION = {
  distribution_type: "same_min",
  x_units_per_article: {},
};

const DEFAULT_SIZE_DISTRIBUTION = {
  distribution_type: "same_min",
  x_units_per_size: {},
};

function withDefaultStyleDistribution(distribution) {
  const coerced = coerceDistribution(distribution);
  if (!coerced) {
    return { ...DEFAULT_STYLE_DISTRIBUTION };
  }
  return {
    ...DEFAULT_STYLE_DISTRIBUTION,
    ...coerced,
    distribution_type: coerced.distribution_type || "same_min",
    x_units_per_article: coerced.x_units_per_article || {},
  };
}

function withDefaultSizeDistribution(distribution) {
  const coerced = coerceDistribution(distribution);
  if (!coerced) {
    return { ...DEFAULT_SIZE_DISTRIBUTION };
  }
  return {
    ...DEFAULT_SIZE_DISTRIBUTION,
    ...coerced,
    distribution_type: coerced.distribution_type || "same_min",
    x_units_per_size: coerced.x_units_per_size || {},
  };
}

function getDefaultDistributions() {
  return {
    style_distribution: { ...DEFAULT_STYLE_DISTRIBUTION },
    size_distribution: { ...DEFAULT_SIZE_DISTRIBUTION },
  };
}

function getTopLevelDistributions(subRow) {
  const topStyle = coerceDistribution(subRow?.style_distribution);
  const topSize = coerceDistribution(subRow?.size_distribution);
  if (!hasDistributionType(topStyle) && !hasDistributionType(topSize)) {
    return null;
  }
  return {
    style_distribution: withDefaultStyleDistribution(topStyle),
    size_distribution: withDefaultSizeDistribution(topSize),
  };
}

/**
 * Reads style/size distribution from the creation API row.
 * New contract: `min_distribution` is
 * { style_distribution: { distribution_type, x_units_per_article },
 *   size_distribution: { distribution_type, x_units_per_size } }
 * Also supports top-level fields or a legacy single { distribution_type } payload.
 * `null` / missing `min_distribution` defaults both sides to `same_min`.
 */
export function parseMinDistributionFromRow(subRow) {
  if (!subRow) {
    return getDefaultDistributions();
  }

  const fromMinDistribution = coerceDistribution(subRow.min_distribution);
  if (
    fromMinDistribution?.style_distribution ||
    fromMinDistribution?.size_distribution
  ) {
    return {
      style_distribution: withDefaultStyleDistribution(
        fromMinDistribution.style_distribution
      ),
      size_distribution: withDefaultSizeDistribution(
        fromMinDistribution.size_distribution
      ),
    };
  }

  const fromTopLevel = getTopLevelDistributions(subRow);
  if (fromTopLevel) {
    return fromTopLevel;
  }

  if (fromMinDistribution?.distribution_type) {
    return {
      style_distribution: { ...DEFAULT_STYLE_DISTRIBUTION },
      size_distribution: withDefaultSizeDistribution(fromMinDistribution),
    };
  }

  return getDefaultDistributions();
}

function getStyleDistributionLabel(distributionType) {
  return (
    STYLE_DISTRIBUTION_DISPLAY_MAP[distributionType] ||
    distributionType ||
    null
  );
}

function getSizeDistributionLabel(distributionType) {
  return (
    SIZE_DISTRIBUTION_DISPLAY_MAP[distributionType] ||
    MIN_DISTRIBUTION_MAP[distributionType] ||
    distributionType ||
    null
  );
}

/** Display: "Same Min For All Style Color IDs, Same Min For All Sizes" */
export function formatMinDistributionDisplayValue(subRow) {
  const { style_distribution, size_distribution } =
    parseMinDistributionFromRow(subRow);
  return [
    getStyleDistributionLabel(style_distribution?.distribution_type),
    getSizeDistributionLabel(size_distribution?.distribution_type),
  ]
    .filter(Boolean)
    .join(", ");
}

/** Persist API-shaped min_distribution after edits. */
export function buildMinDistributionAttributeValue(subRow) {
  const { style_distribution, size_distribution } =
    parseMinDistributionFromRow(subRow);

  return {
    style_distribution: {
      distribution_type: style_distribution?.distribution_type || "same_min",
      x_units_per_article:
        subRow?.x_units_per_article ||
        style_distribution?.x_units_per_article ||
        {},
    },
    size_distribution: {
      distribution_type: size_distribution?.distribution_type || "same_min",
      x_units_per_size:
        subRow?.x_units_per_size ||
        size_distribution?.x_units_per_size ||
        {},
    },
  };
}

/** Apply creation-API min distribution fields onto a constraint child row. */
export function applyMinDistributionRowFields(subRow) {
  const parsed = parseMinDistributionFromRow(subRow);
  const style_distribution = withDefaultStyleDistribution(
    parsed.style_distribution
  );
  const size_distribution = withDefaultSizeDistribution(
    parsed.size_distribution
  );
  const next = {
    ...subRow,
    style_distribution,
    size_distribution,
    x_units_per_size:
      size_distribution?.x_units_per_size || subRow?.x_units_per_size || {},
  };
  return {
    ...next,
    min_distribution: formatMinDistributionDisplayValue(next),
  };
}
