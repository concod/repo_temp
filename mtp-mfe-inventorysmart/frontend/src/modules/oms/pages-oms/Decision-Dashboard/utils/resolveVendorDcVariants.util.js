const VALID_VARIANT_KEYS = new Set(["v2", "v3", "v4"]);

const DEFAULT_V2_VARIANT = {
  label: "Legacy Flow",
  key: "v2",
  is_default: true,
};

/**
 * Normalize tenant-attribute variants into `{ label, key, is_default }[]`.
 * Missing / empty / invalid → single silent v2 entry.
 */
export function resolveVendorDcVariants(rawValue) {
  let rawList = rawValue;
  if (typeof rawValue === "string") {
    try {
      rawList = JSON.parse(rawValue);
    } catch (_error) {
      return [DEFAULT_V2_VARIANT];
    }
  }
  if (rawList && !Array.isArray(rawList) && Array.isArray(rawList?.variants)) {
    rawList = rawList.variants;
  }
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [DEFAULT_V2_VARIANT];
  }

  const normalized = [];
  rawList.forEach((entry) => {
    const key = typeof entry?.key === "string" ? entry.key.trim() : "";
    if (!VALID_VARIANT_KEYS.has(key)) {
      return;
    }
    normalized.push({
      label:
        typeof entry?.label === "string" && entry.label.trim()
          ? entry.label.trim()
          : key,
      key,
      is_default: Boolean(entry?.is_default),
    });
  });

  if (normalized.length === 0) {
    return [DEFAULT_V2_VARIANT];
  }
  return normalized;
}

/** First `is_default: true`, else first entry. */
export function resolveSelectedVendorDcVariantKey(variants) {
  const list = Array.isArray(variants) ? variants : [];
  if (list.length === 0) {
    return DEFAULT_V2_VARIANT.key;
  }
  const defaultEntry = list.find((entry) => entry?.is_default);
  return defaultEntry?.key || list[0].key;
}

/**
 * Map variant key → axios/body flags for DD data APIs.
 * v2 → legacy; v3 → CH is_v3 true; v4 → CH is_v3 false.
 */
export function resolveVendorDcApiFlags(key) {
  const variantKey = typeof key === "string" ? key : "v2";
  return {
    useV3Api: variantKey !== "v2",
    isV3Schema: variantKey === "v3",
  };
}
