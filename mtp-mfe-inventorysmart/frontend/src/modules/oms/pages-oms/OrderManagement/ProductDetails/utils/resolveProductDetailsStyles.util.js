/**
 * Resolve the Product Details style column attribute and selected style values.
 * Shared by Style Order Summary (and any PD consumer that needs the same seed).
 */

/**
 * Column used as the style key for deep-dive / summary filters.
 * Prefer product-details filter config, then the productDetails slice, then "article".
 */
export function resolveStyleFilterAttribute({
  productDetailsFilters,
  styleFilterAttribute,
} = {}) {
  return (
    productDetailsFilters?.[0]?.column_name ||
    styleFilterAttribute ||
    "article"
  );
}

/**
 * Selected styles for parent-level summary / subclass payloads.
 * Prefer productDetails.selectedStyles (seeded by ProductDetailsFilters),
 * then deep-dive facet map for the resolved style attribute.
 * Returns null when neither source has values (caller may early-return).
 */
export function resolveSelectedStyles({
  productDetailsSelectedStyles,
  deepDiveFiltersData,
  styleAttribute,
} = {}) {
  if (
    Array.isArray(productDetailsSelectedStyles) &&
    productDetailsSelectedStyles.length > 0
  ) {
    return productDetailsSelectedStyles;
  }
  const fromDeepDive = deepDiveFiltersData?.[styleAttribute];
  if (Array.isArray(fromDeepDive) && fromDeepDive.length > 0) {
    return fromDeepDive;
  }
  return null;
}
