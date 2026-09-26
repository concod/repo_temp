import React, { forwardRef, useRef } from "react";
import { makeStyles } from "@mui/styles";
import {
  addIdToAggridScrollElem,
  checkIfCellIsDisabledForViewEdit,
  isNumber,
  numberFormattingWithCommas,
  updateForecastMultiplier,
} from "../utils-matrix-summary/utilityFunctions";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { infoHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
import { uniqBy } from "lodash";
import {
  lockCellApi,
  lockCellCustomConditionFn,
  onCellValueChange,
  reAdjustHierarchyInstance,
  getL0ValidAfterL2Change,
} from "..";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import {
  setIsCellEdited,
  setIsButtonDisabled,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { setSaveActionTime } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";

const EditGrandChildHierarcy = forwardRef((props, refs) => {
  let {
    id,
    node,
    columnDefs,
    editRowData,
    historicColumnData,
    activeChildHierarchyKey,
    setCounterOnEditHierarchyChange,
    scopedInitialData,
    isCalledFromMFPDashboard,
    selectedRowsFromMFP,
  } = props;

  let {
    topGrid,
    bottomGrid,
    totalRowGrid,
    editHierarchyChildInstance,
    editHierarchyTotalRowInstance,
    editHierarchyGrandChildInstance,
    editHierarchyInstance,
    initialEditRowData,
    SkuName,
    isCompareChanges,
  } = refs;

  const classes = useStyles();
  const globalClasses = globalStyles();

  const loadUserTableInstance = (params) => {
    editHierarchyGrandChildInstance.current = params;

    addIdToAggridScrollElem("l2-table");
  };

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );

  const enableCommaFormatting =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.numberFormatting?.enableCommaFormatting === true;

  const editHierarchyForecastTableRoundOff =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.EditHierarchyForecast;

  const l2DisplayName =
    matrixSummaryReducer?.tenantFilters?.view_edit_hierarchy_filters?.l2
      ?.column_name;
  const dispatch = useDispatch();

  const onL2ValueChanged = (
    _,
    row,
    column,
    isChanged,
    __,
    initialVal // old Value
  ) => {
    if (!isChanged) return;
    let colId = column.colId?.split(".")?.[0];
    dispatch(setIsButtonDisabled(true));
    dispatch(setSaveActionTime(Date.now()));
    setCounterOnEditHierarchyChange((prev) => (prev += 1));
    const originalVal = row[colId].adjusted;
    const newValue = Number(originalVal);
    let currHierarchyNode = editHierarchyGrandChildInstance?.current?.api?.getRowNode(
      row.row
    );

    if (originalVal === "" || Number(originalVal) < 0) {
      const oldValue =
        Number(currHierarchyNode?.data?.["last_updated_data"]?.[colId]) ||
        scopedInitialData?.[node.data.row]?.find((el) => el.row === row.row)?.[
          colId
        ]?.adjusted;

      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }

    // check is valid for L0

    let sum = 0;
    editHierarchyGrandChildInstance.current.api.forEachNode((node) => {
      sum += Number(node.data[colId]?.adjusted || 0);
    });

    let L1TotalRowNode = refs.editHierarchyChildTotalRowInstance.current.api.getRowNode(
      "total"
    );

    const oldValue =
      Number(currHierarchyNode?.data?.["last_updated_data"]?.[colId]) ||
      initialVal ||
      scopedInitialData?.[node.data.row]?.find((el) => el.row === row.row)?.[
        colId
      ]?.adjusted;

    let totalRowNode = editHierarchyTotalRowInstance.current?.api.getRowNode(
      "Total"
    );
    let l1RowNode = editHierarchyChildInstance.current.api.getRowNode(
      node.data.row
    );

    let SKULength = 0;
    editHierarchyChildInstance.current.api.forEachNode((_) => {
      SKULength += 1;
    });

    let l0tableLength = 0;
    refs?.editHierarchyInstance.current.api.forEachNode((_) => {
      l0tableLength += 1;
    });

    //For Normal ADA Flow
    if (
      L1TotalRowNode?.data[colId]?.isLocked &&
      !l1RowNode?.data?.[colId]?.isLocked &&
      SKULength === 1 &&
      !isCalledFromMFPDashboard
    ) {
      reAdjustHierarchyInstance(
        row,
        column,
        scopedInitialData?.[node.data.row],
        editHierarchyGrandChildInstance.current.api,
        editHierarchyChildInstance.current.api,
        node.data.row,
        dispatch,
        initialVal,
        l1RowNode
      );

      updateForecastMultiplier(
        editHierarchyTotalRowInstance,
        column,
        id,
        dispatch
      );
      return;
    }

    //  sum is sku value of selected column
    // totalRowNode is the department total table column data i.e LO total data (editHierarchyTotalRowInstance)
    // L1TotalRowNode is sku total table column data (editHierarchyChildTotalRowInstance)
    // l1RowNode is sku table column data  (editHierarchyChildInstance)

    let childHeirarchyDataEdited = [];
    let isChildHierarchyDataEdited = false;
    let isChildHierarchyDataEditedFromGrandChild = false;
    editHierarchyChildInstance.current.api.forEachNode((node) => {
      childHeirarchyDataEdited.push(node.data);
    });
    if (isCalledFromMFPDashboard) {
      childHeirarchyDataEdited.map((data) => {
        if (data[colId]?.isEdited) {
          SkuName.current = data?.sku || "";
          isChildHierarchyDataEdited = true;
        }
      });
    }

    // if (isCompareChanges.current) {
    //   if (l1RowNode.data.sku !== SkuName.current) {
    //     isChildHierarchyDataEditedFromGrandChild = true;
    //   }
    // }

    if (
      L1TotalRowNode?.data?.[colId]?.isLocked &&
      !l1RowNode?.data?.[colId]?.isLocked &&
      isChildHierarchyDataEdited &&
      isCalledFromMFPDashboard
    ) {
      infoHandler(
        dispatch,
        `Looks like you changed this L1 ${SkuName.current} value in the current column ${colId} in some way. Kindly either lock the current sku value or save it beforehand`
      );
      currHierarchyNode?.setDataValue(column.colId, oldValue);
      return;
    }

    if (
      L1TotalRowNode?.data[colId]?.isLocked &&
      !l1RowNode?.data?.[colId]?.isLocked &&
      SKULength === 1 &&
      isCalledFromMFPDashboard
    ) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId} has been reset as this L1 is not locked and there is no other L1 to accumulate the difference`
      );
      // infoHandler(
      //   dispatch,
      //   `Value for ${row.row} - ${colId}  has been reset because value can't be readjusted as all cells in current hierarchy are locked or this is the only cell`
      // );
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }
    if (
      L1TotalRowNode?.data[colId]?.isLocked &&
      l1RowNode?.data?.[colId]?.isLocked &&
      SKULength === 1 &&
      isCalledFromMFPDashboard
    ) {
      reAdjustHierarchyInstance(
        row,
        column,
        scopedInitialData?.[node.data.row],
        editHierarchyGrandChildInstance.current.api,
        editHierarchyChildInstance.current.api,
        node.data.row,
        dispatch,
        initialVal,
        l1RowNode
      );

      updateForecastMultiplier(
        editHierarchyTotalRowInstance,
        column,
        id,
        dispatch
      );
      return;
    }

    if (
      (L1TotalRowNode?.data[colId]?.isLocked &&
        !l1RowNode?.data?.[colId]?.isLocked &&
        SKULength > 1) ||
      (L1TotalRowNode?.data[colId]?.isLocked &&
        l1RowNode?.data?.[colId]?.isLocked &&
        SKULength > 1)
    ) {
      if (isCalledFromMFPDashboard) {
        // if (!isChildHierarchyDataEditedFromGrandChild) {
        reAdjustHierarchyInstance(
          row,
          column,
          scopedInitialData?.[node.data.row],
          editHierarchyGrandChildInstance.current.api,
          editHierarchyChildInstance.current.api,
          node.data.row,
          dispatch,
          initialVal,
          l1RowNode,
          null,
          null,
          null,
          SKULength,
          isCalledFromMFPDashboard,
          refs.editHierarchyChildTotalRowInstance.current.api,
          refs.editHierarchyInstance.current.api,
          refs?.initialEditChildRowData,
          matrixSummaryReducer?.clientConfig?.attribute_value
            ?.user_profile_enabled,
          refs?.activeChildHierarchyKey,
          selectedRowsFromMFP
        );
        // childHeirarchyDataEdited.map((data) => {
        //   if (data[colId].isEditedFromChildData) {
        //     SkuName.current = data?.sku;
        //     isCompareChanges.current = true;
        //   }
        // });
        return;
        // } else {
        //   {
        //     infoHandler(
        //       dispatch,
        //       `Looks like you changed this Sku ${SkuName.current} value in the current column ${colId} in some way. Kindly either lock the current sku value or save it beforehand`
        //     );
        //     currHierarchyNode?.setDataValue(column.colId, oldValue);
        //     return;
        //   }
        // }
      }
    }

    if (
      L1TotalRowNode?.data?.[colId]?.isLocked &&
      L1TotalRowNode?.data?.[colId]?.adjusted < sum
    ) {
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      infoHandler(
        dispatch,
        `Value for ${
          row.row
        } - ${colId}  has been reset as sum of all L2 is becoming ${sum.toFixed(
          3
        )} which is greater than Locked Parent i.e. ${L1TotalRowNode?.data?.[
          colId
        ]?.adjusted.toFixed(3)}`
      );
      return;
    }

    // when department is locked and store is changed and there are more than 1 sku
    // 126-135 can be removed once payload formation is fixed as UI manipulation is already fixed for this

    // when department is locked and store is changed and there is 1 sku

    //for Normal ADA flow

    if (
      L1TotalRowNode?.data[colId]?.isLocked &&
      !l1RowNode?.data?.[colId]?.isLocked &&
      SKULength > 1 &&
      !isCalledFromMFPDashboard
    ) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId} has been reset as changing this value will affect other L1's`
      );
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }

    let skUSumAfterChange =
      L1TotalRowNode?.data?.[colId]?.adjusted +
      row[colId].adjusted -
      row[colId].IA;

    if (
      totalRowNode.data[colId]?.isLocked &&
      skUSumAfterChange > totalRowNode.data[colId].adjusted
    ) {
      infoHandler(
        dispatch,
        `Value for ${
          row.row
        } - ${colId}  has been reset as sum of all L1's is becoming ${skUSumAfterChange.toFixed(
          3
        )} which is greater than Locked L0 total`
      );
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }

    if (
      totalRowNode.data[colId]?.isLocked &&
      skUSumAfterChange < totalRowNode.data[colId].adjusted &&
      l0tableLength == 1
    ) {
      infoHandler(
        dispatch,
        `Value for ${
          row.row
        } - ${colId}  has been reset as sum of all L1's is becoming ${skUSumAfterChange.toFixed(
          3
        )} which is less than Locked L0 total`
      );
      currHierarchyNode?.setDataValue(column.colId, oldValue);
      return;
    }

    // If L2 value is greater than L0 Total return
    // If L2 total i.e. expanded L1 after adding all L2's is more than Locked L0 total return
    let isInValidValue = false;
    if (totalRowNode.data[colId]?.isLocked) {
      if (+row[colId].adjusted > totalRowNode.data[colId].adjusted) {
        infoHandler(
          dispatch,
          `Value for current row - ${colId}  has been reset as entered value is more than L0 total`
        );

        isInValidValue = true;
      }

      if (!isInValidValue && sum > totalRowNode.data[colId].adjusted) {
        infoHandler(
          dispatch,
          `Value for current row - ${colId}  has been reset as SKU total is more than L0 total`
        );
        isInValidValue = true;
      }

      if (isInValidValue) {
        currHierarchyNode?.setDataValue(column.colId, oldValue);

        return;
      }
    }

    let nonLockedCount = 0;
    let activeChildHierarchyKeyLocked = false;

    refs.editHierarchyInstance.current.api.forEachNode((node) => {
      if (node.data.row == activeChildHierarchyKey) {
        if (node?.data?.[colId]?.isLocked) {
          activeChildHierarchyKeyLocked = true;
        }
      }
    });

    refs.editHierarchyInstance?.current?.api.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked || row.row === node.data.row) {
        // sum += val;
      } else {
        nonLockedCount += 1;
      }
    });

    if (
      totalRowNode.data[colId]?.isLocked &&
      nonLockedCount === 1 &&
      !activeChildHierarchyKeyLocked
    ) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId}  has been reset because value can't be readjusted as all cells in upper hierarchy are locked or that is the only cell`
      );
      currHierarchyNode.setDataValue(column.colId, oldValue);

      return;
    }

    // Self computation

    // to caluclate final ratio, it's important to track what user entered in the particular cell
    // as a cell's value keeps on updating by their respective parent/child

    currHierarchyNode.data[colId].adjusted_manual = newValue;

    let prevOldValue = "";
    if (isNumber(Number(l1RowNode?.data?.["last_updated_data"]?.[colId]))) {
      prevOldValue = Number(l1RowNode?.data?.["last_updated_data"]?.[colId]);
    } else {
      prevOldValue = l1RowNode?.data?.[colId].adjusted;
    }

    dispatch(setIsCellEdited(true));

    onCellValueChange(
      row,
      column,
      isChanged,
      editHierarchyGrandChildInstance.current.api,
      editHierarchyChildInstance.current.api,
      scopedInitialData?.[node.data.row],
      node.data.row,
      false,
      dispatch,
      initialVal,
      null,
      matrixSummaryReducer?.clientConfig?.attribute_value?.user_profile_enabled,
      refs.editHierarchyInstance.current.api
    );

    // if L2 total is locked then we don't need to updated above hierarchies i.e. L0 Total, L0 & L1
    if (l1RowNode?.data?.[colId]?.isLocked) {
      updateForecastMultiplier(
        editHierarchyTotalRowInstance,
        column,
        id,
        dispatch
      );

      return;
    }

    // if (!isCalledFromMFPDashboard) {
    //L0 L1  Computation by L2
    L0L1ChangeByL2(
      row,
      column,
      activeChildHierarchyKey,
      l1RowNode,
      refs,
      dispatch,
      prevOldValue
    );
    // }

    // mark parent node as edited
    l1RowNode.data[colId].isChildEdited = true;
    l1RowNode.data.isChildEdited = true;
    updateForecastMultiplier(
      editHierarchyTotalRowInstance,
      column,
      id,
      dispatch
    );
  };

  const columnDataHandler = () => {
    let allColumns = [
      columnDefs?.[0] || {},
      ...historicColumnData,
      ...columnDefs.slice(1),
    ]?.filter((el) => el?.column_name);

    let timeline = matrixSummaryReducer?.switchTimeLine?.[0]?.value;

    const checkIsFiscalData = (label) => {
      const isWeekEndDateLabelEnabled =
        matrixSummaryReducer?.clientConfig?.attribute_value?.show_features
          ?.is_week_end_date_label_enabled;

      let showWeekEndDateLabelEnabled =
        isWeekEndDateLabelEnabled &&
        matrixSummaryReducer?.switchTimeLine?.[0]?.value === "W";

      let splittedLabel = showWeekEndDateLabelEnabled
        ? label.split(`WE`)
        : label.split(`F${timeline}-`);

      return splittedLabel?.length !== 1;
    };

    let allFiscalDateColumns = [];
    let allFiscalInfoColumns = [];
    allColumns.forEach((el) => {
      checkIsFiscalData(el.label)
        ? allFiscalDateColumns.push(el)
        : allFiscalInfoColumns.push(el);
    });

    let updatedFiscalInfoColumns = uniqBy(
      allFiscalInfoColumns,
      (el) => el.label
    );

    return [...updatedFiscalInfoColumns, ...allFiscalDateColumns];
  };

  return (
    <div
      className={`${classes.tableContainer} ${classes.grandChildTableContainer}`}
    >
      <AgGridComponent
        tableId="l2-table"
        //defaultTextFieldViewOnly={enableCommaFormatting}
        showSaveTableConfig={false}
        showSearchModalBtn={true}
        // skipAutoSizeColumn
        minWidth={200}
        rowdata={editRowData}
        columns={columnDataHandler()}
        masterDetail={true}
        tableRef={topGrid}
        alignedGrids={
          bottomGrid.current && totalRowGrid.current
            ? [bottomGrid.current, totalRowGrid.current]
            : undefined
        }
        // sizeColumnsToFitFlag
        uniqueRowId="aggr_column"
        cacheBlockSize={10}
        loadTableInstance={loadUserTableInstance}
        detailRowAutoHeight={true}
        onBlur={onL2ValueChanged}
        // agGridPagination={true}
        customCellRenderer={(cellProps) => {
          if (cellProps?.value === null) {
            return <p style={{ textAlign: "right" }}>-</p>;
          }
          if (cellProps?.data) {
            for (const week in cellProps?.data) {
              let columnId = `${week}.adjusted`;
              if (cellProps.column.colId === columnId) {
                if (
                  cellProps?.data[week]?.isGreyOut ||
                  cellProps?.data[week]?.isYellowOut
                ) {
                  return (
                    <p style={{ textAlign: "right" }}>{cellProps?.value}</p>
                  );
                }
              }
            }
          }
        }}
        // headerHeight="0"

        // lockCellApi={(cellProps, isLocked) =>
        //   lockCellApi(cellProps, isLocked, editHierarchyGrandChildInstance)
        // }
        // lockCellCustomConditionFn={lockCellCustomConditionFn}
        // lockCellIfNoValue
        // customCellRenderer={(cellProps) => {
        //   //For disabled columns - The value is applied with comma separation
        //   if (
        //     checkIfCellIsDisabledForViewEdit(cellProps, matrixSummaryReducer, id) &&
        //     enableCommaFormatting
        //   ) {
        //     return (
        //       <p
        //         className={globalClasses.fakeInputStyle}
        //         style={{ background: colours.alabaster, pointerEvents: "none" }}
        //       >
        //         {numberFormattingWithCommas(
        //           cellProps?.value,
        //           editHierarchyForecastTableRoundOff
        //         )}
        //       </p>
        //     );
        //   }
        // }}
        cardContainer={false}
        hideTableSetting
      />
    </div>
  );
});

export default EditGrandChildHierarcy;

const L0L1ChangeByL2 = (
  row,
  column,
  activeChildHierarchyKey,
  l1RowNode,
  ref,
  dispatch,
  prevOldValue
) => {
  let colId = column.colId?.split(".")?.[0];

  let {
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    editHierarchyChildTotalRowInstance,
    initialEditChildRowData,
    editHierarchyChildInstance,
    initialEditRowData,
    editHierarchyGrandChildInstance,
  } = ref;

  onCellValueChange(
    l1RowNode.data,
    column,
    true,
    editHierarchyChildInstance.current.api,
    editHierarchyChildTotalRowInstance.current.api,
    initialEditChildRowData?.current?.[activeChildHierarchyKey],
    "total",
    true,
    dispatch,
    prevOldValue
  );

  let L1TotalRowNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
    "total"
  );

  if (L1TotalRowNode?.data?.[colId]?.isLocked) {
    return;
  }

  let editHierarchyCurrentNode = editHierarchyInstance.current.api.getRowNode(
    activeChildHierarchyKey
  );
  let grandChildDataLength = 0;
  editHierarchyGrandChildInstance.current.api.forEachNode((node) => {
    grandChildDataLength += 1;
  });
  // L0 update by L2

  editHierarchyCurrentNode.setDataValue(
    column.colId,
    L1TotalRowNode.data[colId].adjusted
  );
  // if (grandChildDataLength == 1) {
  //   var isValidL0 = getL0ValidAfterL2Change(
  //     editHierarchyCurrentNode.data,
  //     column,
  //     initialEditRowData?.current,
  //     editHierarchyInstance.current.api,
  //     editHierarchyTotalRowInstance.current.api,
  //     "total",
  //     dispatch
  //   );
  //   if (isValidL0) {
  //     let currRowNode = editHierarchyGrandChildInstance.current.api?.getRowNode(
  //       row.row
  //     );
  //     currRowNode?.setDataValue(column.colId, prevOldValue);

  //     let childRowNode = editHierarchyChildInstance.current.api?.getRowNode(
  //       l1RowNode.data.row
  //     );
  //     let totalRowNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
  //       "total"
  //     );
  //     let totalSum = 0;
  //     let totalChildSum = 0;
  //     editHierarchyGrandChildInstance.current.api.forEachNode((node) => {
  //       totalSum += Number(node.data[colId]?.adjusted) || 0;
  //     });
  //     childRowNode.setDataValue(column.colId, totalSum);

  //     editHierarchyChildInstance.current.api.forEachNode((node) => {
  //       totalChildSum += Number(node.data[colId]?.adjusted) || 0;
  //     });
  //     totalRowNode.setDataValue(column.colId, totalChildSum);

  //     let newChildTotalData = totalRowNode.data;
  //     let prevLastUpdatedData = totalRowNode.data?.last_updated_data || {};
  //     newChildTotalData.last_updated_data = {
  //       ...prevLastUpdatedData,
  //       [colId]: totalChildSum,
  //     };
  //     totalRowNode.setData(newChildTotalData);

  //     let newChildData = childRowNode.data;
  //     let prevLastUpdatedDataChild = childRowNode.data?.last_updated_data || {};
  //     newChildData.last_updated_data = {
  //       ...prevLastUpdatedDataChild,
  //       [colId]: totalSum,
  //     };
  //     childRowNode.setData(newChildData);

  //     let newGrandChildData = currRowNode.data;
  //     let prevLastUpdatedDataGrandChild =
  //       currRowNode.data?.last_updated_data || {};
  //     newGrandChildData.last_updated_data = {
  //       ...prevLastUpdatedDataGrandChild,
  //       [colId]: prevOldValue,
  //     };
  //     currRowNode.setData(newGrandChildData);

  //     return;
  //   }
  // }
  let totalRowNodeData = editHierarchyTotalRowInstance.current?.api.getRowNode(
    "Total"
  );
  onCellValueChange(
    editHierarchyCurrentNode.data,
    column,
    true,
    editHierarchyInstance.current.api,
    totalRowNodeData,
    initialEditRowData?.current,
    "total",
    true,
    dispatch
  );
  let totalRowNode = editHierarchyTotalRowInstance.current?.api.getRowNode(
    "total"
  );
  if (totalRowNode.data[colId]?.isLocked) {
    let activeL0Node = {};
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey === node.data.row) {
        activeL0Node = node;
      }
    });
    //activeL0Node.setDataValue(column.colId, currentChildTotalValue);

    reAdjustHierarchyInstance(
      activeL0Node?.data,
      column,
      initialEditRowData.current,
      editHierarchyInstance.current.api,
      editHierarchyTotalRowInstance.current.api,
      "total",
      dispatch,
      prevOldValue,
      totalRowNode // locked parent value,
    );

    return;
  }
};

const useStyles = makeStyles(() => ({
  tableContainer: {
    flex: "1 1 auto",
    height: "100%",
    "& .impact-table-main-header": {
      display: "none !important",
    },
  },
  grandChildTableContainer: {
    "& .ag-body-viewport": {
      top: "auto !important",
    },
  },
}));
