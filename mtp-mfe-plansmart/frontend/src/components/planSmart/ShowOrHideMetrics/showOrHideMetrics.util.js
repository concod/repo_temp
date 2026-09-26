import { MASTER_PLAN } from "./showOrHideMetrics.constants";

/**
 * Return updated show/hide metric data based on checkbox change.
 *
 * groupIndex: Index of the group within the showHideMetricsData array.
 * itemIndex: Index of the item within the group specified by groupIndex.
 * showHideMetricsData: Metric data to be shown/hidden.
 * setShowHideMetricsData: Function to update state related to metrics data.
 * gridRef: Reference to AG Grid instance.
 * childIndex: Index for group category children.
 */
export const handleCheckboxToggle = (
  groupIndex,
  itemIndex,
  showHideMetricsData,
  setShowHideMetricsData,
  gridRef,
  childIndex = null
) => {
  const newData = showHideMetricsData.map((group, gIndex) => {
    if (gIndex !== groupIndex) return group;
    return group.map((listItem, iIndex) => {
      if (iIndex !== itemIndex) return listItem;
      const newItem = { ...listItem };
      if (childIndex === null) {
        const newCheckedState = !newItem.isChecked;
        return {
          ...newItem,
          isChecked: newCheckedState,
          children: newItem.children
            ? newItem.children.map((child) => ({
                ...child,
                isChecked: newCheckedState
              }))
            : newItem.children
        };
      }
      const newChildren = newItem.children.map((child, cIndex) => {
        if (cIndex !== childIndex) return child;
        return { ...child, isChecked: !child.isChecked };
      });
      return {
        ...newItem,
        children: newChildren,
        isChecked: newChildren.some((child) => child.isChecked)
      };
    });
  });

  setShowHideMetricsData(newData);
  gridRef?.current?.api?.onFilterChanged();
};

export const getMetricData = (
  planScreen,
  masterPlanShowHideMetricsData,
  budgetShowHideMetricsData
) => {
  return planScreen === MASTER_PLAN
    ? masterPlanShowHideMetricsData
    : budgetShowHideMetricsData;
};
