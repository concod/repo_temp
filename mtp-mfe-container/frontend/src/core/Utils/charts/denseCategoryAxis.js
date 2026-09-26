/**
 * Opt-in helpers for dense categorical x-axes.
 * Highcharts otherwise auto-skips labels when horizontal space is tight.
 * Callers must pass enableDenseCategoryAxis: true on chart options.
 * Dense scroll/labels apply only when category count is large enough to need them.
 */
export const CATEGORY_SLOT_WIDTH_PX = 56;

/** ~20 * 56px; below this keep default label behavior on typical card widths. */
export const DENSE_CATEGORY_MIN_COUNT = 20;

export const shouldUseDenseCategoryAxis = (categories = []) => {
  const count = Array.isArray(categories) ? categories.length : 0;
  return count >= DENSE_CATEGORY_MIN_COUNT;
};

export const getScrollablePlotAreaForCategories = (categories = []) => {
  if (!shouldUseDenseCategoryAxis(categories)) {
    return undefined;
  }
  const count = categories.length;
  return {
    minWidth: count * CATEGORY_SLOT_WIDTH_PX,
    scrollPositionX: 0,
  };
};

export const getDenseXAxisLabelOptions = (existingLabels = {}) => ({
  ...existingLabels,
  step: 1,
  rotation: -45,
  align: "right",
  reserveSpace: true,
  style: {
    ...(existingLabels.style || {}),
    fontSize: existingLabels.style?.fontSize || "11px",
  },
});

/** Chart + xAxis label patches when category count warrants dense mode. */
export const getDenseCategoryAxisOverrides = ({
  categories,
  existingLabels,
} = {}) => {
  if (!shouldUseDenseCategoryAxis(categories)) {
    return {
      chartOverrides: {},
      labelOverrides: undefined,
    };
  }
  const scrollablePlotArea = getScrollablePlotAreaForCategories(categories);
  return {
    chartOverrides: {
      ...(scrollablePlotArea ? { scrollablePlotArea } : {}),
    },
    labelOverrides: getDenseXAxisLabelOptions(existingLabels),
  };
};
