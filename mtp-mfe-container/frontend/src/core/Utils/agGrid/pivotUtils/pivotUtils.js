import React from "react";
import { isEmpty, cloneDeep } from "lodash";
import { splitStringFromLastUnderscore } from "core/Utils/functions/utils";
import { shouldSubTotalBeDisplayed } from "../ag-grid-filter-panel/utils";

export const resetPivotConfig = (gridColumnState, panelReset, deps) => {
  const { agGrid, setIsRowLabelEnabled } = deps;
  try {
    gridColumnState.forEach((item) => {
      if (item.pivot) {
        agGrid?.columnApi?.removePivotColumn(item.colId);
      }
      if (item.rowGroup) {
        agGrid?.columnApi?.removeRowGroupColumn(item.colId);
      }
      if (item.aggFunc) {
        agGrid?.columnApi?.removeValueColumn(item.colId);
      }
    });
    agGrid?.columnApi?.setPivotMode(false);
    if (panelReset) {
      setIsRowLabelEnabled(false);
    }
  } catch (error) {
    console.error("resetPivotConfig error", error);
  }
};

export const onApplyPivotView = (pivotConfig, deps) => {
  const {
    agGrid,
    rowLabelRef,
    customAggFunctions,
    setFiltersExcludedValues,
    setIsRowLabelEnabled,
    setAppliedRowLabel,
    setIsLoading,
  } = deps;

  const {
    rowFields,
    columnFields,
    pivotDataForFilterFields,
    valuesConfig,
    totalSubtotalConfig,
    moveToRowLabel,
  } = pivotConfig;
  try {
    // setIsLoading(true);
    /**
     * Aggrid pivot apis
     * pivot - setPivotMode
     * column label
     *  add - setPivotColumns
     *  remove - removePivotColumn
     * rows group
     *  add - addRowGroupColumns
     *  remove - removeRowGroupColumn
     * values aggregation
     *  add - addValueColumn
     *  remove- removeValueColumn
     */

    let columnsInfo = agGrid?.api?.getColumnDefs();

    columnsInfo.forEach((colItem) => {
      if (!colItem.is_editable) {
        colItem.cellRenderer = (params) => {
          const { rows: rowTotalSubTotalData } = totalSubtotalConfig;
          if (params.node.footer === true && params.node.level === -1) {
            if (rowTotalSubTotalData?.isCheckboxTicked?.total) {
              if (!isEmpty(rowTotalSubTotalData?.selectedOptions?.total)) {
                return <span>{params.value}</span>;
              } else {
                return <span style={{ display: "none" }}></span>;
              }
            } else {
              return <span style={{ display: "none" }}></span>;
            }
          } else if (params.node.footer === true) {
            if (rowTotalSubTotalData?.isCheckboxTicked?.subtotal) {
              if (
                shouldSubTotalBeDisplayed(
                  rowTotalSubTotalData?.dropdownData?.subtotal,
                  rowTotalSubTotalData?.selectedOptions?.subtotal,
                  cloneDeep(rowFields),
                  params?.node?.field
                )
              ) {
                return <span>{params.value}</span>;
              } else {
                return <span style={{ display: "none" }}></span>;
              }
            } else {
              return <span style={{ display: "none" }}></span>;
            }
          }
          return <span>{params.value}</span>;
        };
      }
    });

    agGrid?.api?.setColumnDefs(columnsInfo);

    if (!isEmpty(pivotDataForFilterFields)) {
      setFiltersExcludedValues(pivotDataForFilterFields);
    } else {
      setFiltersExcludedValues([]);
    }
    let resetAll = false;
    const gridColumnState = agGrid.columnApi.getColumnState();
    if (
      isEmpty(rowFields) &&
      isEmpty(columnFields) &&
      isEmpty(valuesConfig)
    ) {
      resetAll = true;
    }
    // Reset pivot configuration
    resetPivotConfig(gridColumnState, resetAll, deps);

    // Apply pivot configurations
    if (!resetAll) {
      agGrid?.columnApi?.setPivotMode(true);
    } else {
      return;
    }
    // values aggregation
    if (!isEmpty(valuesConfig)) {
      if (!isEmpty(customAggFunctions)) {
        let columnsInfo = agGrid?.api?.getColumnDefs();
        for (let key in valuesConfig) {
          let customAggFunctionKey =
            valuesConfig[key]["selectedOptions"].value;
          if (!isEmpty(customAggFunctions[customAggFunctionKey])) {
            columnsInfo.forEach((col) => {
              let actualKey = splitStringFromLastUnderscore(key);
              if (actualKey === col.colId) {
                col.aggFunc =
                  customAggFunctions[customAggFunctionKey]?.function;
                col.aggLabel =
                  customAggFunctions[customAggFunctionKey]?.label;
                agGrid?.columnApi?.addValueColumn(col.colId);
              }
            });
            valuesConfig[key].aggAdded = true;
          }
        }
        agGrid?.api?.setColumnDefs(columnsInfo);
      }
      gridColumnState.forEach((item) => {
        for (let key in valuesConfig) {
          if (!valuesConfig[key]?.aggAdded) {
            let actualKey = splitStringFromLastUnderscore(key);
            if (actualKey === item.colId) {
              agGrid?.columnApi?.addValueColumn(item.colId);
              agGrid?.columnApi?.setColumnAggFunc(
                item.colId,
                valuesConfig[key]?.selectedOptions?.value
              );
            }
          }
        }
      });
    }
    // column label grouping
    if (!isEmpty(columnFields)) {
      const columns = columnFields.map((item) => {
        return item?.value;
      });
      agGrid?.columnApi?.setPivotColumns(columns);
    }
    // rows grouping
    if (!isEmpty(rowFields)) {
      agGrid?.columnApi?.addRowGroupColumns(
        rowFields.map((item) => {
          return item?.value;
        })
      );
    }

    if (moveToRowLabel) {
      rowLabelRef.current.rowFields = cloneDeep(rowFields);
      rowLabelRef.current.instance = cloneDeep(agGrid);
      setIsRowLabelEnabled(true);
      setAppliedRowLabel(true);
    } else {
      setIsRowLabelEnabled(false);
    }
    setIsLoading(false);
  } catch (error) {
    console.error("onApplyPivotView error", error);
    setIsLoading(false);
  }
};