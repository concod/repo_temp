// PORTED FROM: pages/PlanningScreen/components/PivotPanel/components/PivotFilters/hooks/usePivotFilters.js
// Changed: import path for setPivotHideAttributes → V2 pivot.slice

import { get } from "lodash";
import { useCallback } from "react";
import { setPivotHideAttributes } from "../../../../../../pages-oms/OrderManagement/slices/pivot.slice";

export const usePivotFilters = ({
  pivotPayload,
  pivotDescriptionData,
  pivotHideAttributes,
  tableRef,
  dispatch
}) => {
  const pivotRows = get(pivotPayload, "pivot_rows", []);
  const pivotColumns = get(pivotPayload, "pivot_columns", []);
  const selectedPivotAttributes = [...pivotRows, ...pivotColumns].flat();

  const dimensionValues = get(pivotDescriptionData, "dimension_values", {});
  const attributeValues = get(pivotDescriptionData, "attribute_values", {});

  const handleFilterChange = useCallback(
    (selectedValue, attribute) => {
      const selectedHideAttributes =
        selectedValue.length === 0
          ? Object.fromEntries(
              Object.entries(pivotHideAttributes).filter(
                ([key]) => key !== attribute
              )
            )
          : {
              ...pivotHideAttributes,
              [attribute]: selectedValue.map((value) => value.value)
            };

      dispatch(setPivotHideAttributes(selectedHideAttributes));

      const allColumns = tableRef?.current?.api?.getAllColumns();

      allColumns?.forEach((column) => {
        const colDef = column.userProvidedColDef;
        if (colDef.hide) {
          tableRef?.current?.api?.setColumnVisible(colDef.field, false);
          return;
        }

        const isVisible = Object.entries(selectedHideAttributes).every(
          ([key, value]) => !value.includes(colDef[key])
        );

        tableRef?.current?.api?.setColumnVisible(colDef.field, isVisible);
      });
    },
    [pivotHideAttributes, tableRef, dispatch]
  );

  const getAttributeSelectedOptions = useCallback(
    (attribute) => {
      return get(pivotHideAttributes, attribute, []).map((value) => ({
        label: value,
        value
      }));
    },
    [pivotHideAttributes]
  );

  const getSelectOptionsFromPlanDetails = useCallback(
    (dimension, attribute) => {
      return get(attributeValues[dimension], attribute.value, [])?.map(
        (value) => ({
          label: value,
          value
        })
      );
    },
    [attributeValues]
  );

  return {
    selectedPivotAttributes,
    dimensionValues,
    attributeValues,
    handleFilterChange,
    getAttributeSelectedOptions,
    getSelectOptionsFromPlanDetails
  };
};
