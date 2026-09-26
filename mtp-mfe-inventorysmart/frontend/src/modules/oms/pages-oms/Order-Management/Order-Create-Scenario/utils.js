import { isEmpty, cloneDeep, isNull, startCase } from "lodash";

/**
 * Restrict SKU rows to those whose loc_code is in the global OMS DC filter.
 * When no DC facet or no values are selected, returns skuRows unchanged.
 *
 * @param {Array<Record<string, unknown>>} skuRows
 * @param {Array<{ dimension?: string; values?: unknown[] }>|undefined} selectedFilters
 * @returns {Array<Record<string, unknown>>}
 */
export function getSkuRowsMatchingDcFilter(skuRows, selectedFilters) {
  if (!skuRows?.length) return [];
  const dcFilter = (selectedFilters || []).find((f) => f.dimension === "dc");
  if (!dcFilter?.values?.length) return skuRows;
  return skuRows.filter((sku) =>
    dcFilter.values.includes(String(sku.loc_code))
  );
}

export const buildSafetyStockRequestBody = ({
  skuData,
  primaryKey = "product_code",
  filters,
  isRecommended = undefined,
  currentCycleOrder = undefined,
  completeFilters,
  selectedFilters,
  meta,
}) => {
  let values = [];
  skuData?.forEach((e) => {
    values.push(e?.[primaryKey]);
  });
  const uniqueData = [...new Set(values)].filter((v) => !isEmpty(v));

  const baseFilters = filters || [
    {
      filter_type: "cascaded",
      attribute_name: primaryKey,
      operator: "in",
      dimension: "Product",
      values: uniqueData,
    },
  ];

  let body = {
    filters: cloneDeep(baseFilters),
    ...(typeof isRecommended !== "undefined" && {
      is_recommended: isRecommended,
    }),
    ...(typeof currentCycleOrder !== "undefined" && {
      current_cycle_order: currentCycleOrder,
    }),
    ...(meta ? { meta } : {}),
  };

  if (completeFilters?.filters?.length) {
    body.filters = [...body.filters, ...completeFilters.filters];
  }

  const dcFilterFromSelected = selectedFilters?.find(
    (f) => String(f?.dimension || "").toLowerCase() === "dc"
  );
  if (dcFilterFromSelected) {
    body.filters = body.filters.filter(
      (f) => String(f?.dimension || "").toLowerCase() !== "dc"
    );
    body.filters.push(cloneDeep(dcFilterFromSelected));
  }

  return body;
};
