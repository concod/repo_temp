import React, { forwardRef, useRef } from "react";
import { makeStyles } from "@mui/styles";
import { useTranslation } from "impact-ui-v3";
import {
  addIdToAggridScrollElem,
  checkIfCellIsDisabledForViewEdit,
  isNumber,
  numberFormattingWithCommas,
  updateForecastMultiplier,
  checkIfForecastIsEmptyForViewEdit,
  displayEmptyForecastForViewEdit,
  getPaginationPageSize,
} from "modules/ada/utils-ada/utilityFunctions";
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
import DriverSignificanceRenderer from "../../DriverSignificanceRenderer";
import { setEditHierarchyDriverSignificanceData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

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
    currentHierarchyKey,
    currentChildHierarchyKey,
  } = refs;

  const classes = useStyles();
  const globalClasses = globalStyles();
  const { t } = useTranslation();

  const loadUserTableInstance = (params) => {
    editHierarchyGrandChildInstance.current = params;

    addIdToAggridScrollElem("l2-table");
  };

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const showDriverSignificance =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

  const edit_hierarchy_pagination_page_size =
    adaReducer?.clientConfig?.attribute_value
      ?.edit_hierarchy_pagination_page_size;

  const enableCommaFormatting =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting === true;

  const editHierarchyForecastTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;

  const l2DisplayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l2?.column_name;
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
    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;

    let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

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
      "total"
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
        l1RowNode,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        useAdjustedUserForecastBase
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
        t("ada.editHierarchy.valueChangedWarning", {
          level: "L1",
          skuName: SkuName.current,
          column: colId,
        })
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
        t("ada.editHierarchy.valueResetL2NotLocked", {
          row: row.row,
          column: colId,
        })
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
        l1RowNode,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        useAdjustedUserForecastBase
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
          adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W",
          refs?.activeChildHierarchyKey,
          selectedRowsFromMFP,
          useAdjustedUserForecastBase
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
        t("ada.editHierarchy.valueResetL2SumGreater", {
          row: row.row,
          column: colId,
          sum: sum.toFixed(3),
          value: L1TotalRowNode?.data?.[colId]?.adjusted.toFixed(3),
        })
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
        t("ada.editHierarchy.valueResetAffectOtherL1", {
          row: row.row,
          column: colId,
        })
      );
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }

    let skUSumAfterChange =
      L1TotalRowNode?.data?.[colId]?.adjusted +
      row[colId].adjusted -
      row[colId]?.[splitKey];

    if (
      totalRowNode.data[colId]?.isLocked &&
      skUSumAfterChange > totalRowNode.data[colId].adjusted
    ) {
      infoHandler(
        dispatch,
        t("ada.editHierarchy.valueResetL1SumGreater", {
          row: row.row,
          column: colId,
          sum: skUSumAfterChange.toFixed(3),
        })
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
        t("ada.editHierarchy.valueResetL1SumLess", {
          row: row.row,
          column: colId,
          sum: skUSumAfterChange.toFixed(3),
        })
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
          t("ada.editHierarchy.valueResetMoreThanL0Total", { column: colId })
        );

        isInValidValue = true;
      }

      if (!isInValidValue && sum > totalRowNode.data[colId].adjusted) {
        infoHandler(
          dispatch,
          t("ada.editHierarchy.valueResetSKUtotalMoreThanL0", { column: colId })
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
        t("ada.editHierarchy.valueResetCannotReadjust", {
          row: row.row,
          column: colId,
        })
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
      adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W",
      refs.editHierarchyInstance.current.api,
      useAdjustedUserForecastBase
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
      prevOldValue,
      useAdjustedUserForecastBase
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

    // if (showDriverSignificance) {
    //   allColumns[0].cellRenderer = (params) =>
    //     noEditableCustomCellRender(params, editHierarchyForecastTableRoundOff);
    // }
    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    const checkIsFiscalData = (label) => {
      const isWeekEndDateLabelEnabled =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.is_week_end_date_label_enabled;

      let showWeekEndDateLabelEnabled =
        isWeekEndDateLabelEnabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W";

      const isWeekStartDateLabelEnabled =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.is_week_start_date_label_enabled;

      let showWeekStartDateLabelEnabled =
        isWeekStartDateLabelEnabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W";

      let splittedLabel = showWeekStartDateLabelEnabled
        ? label.split(`WK`)
        : showWeekEndDateLabelEnabled
        ? label.split(`WE`)
        : label.split(`F${timeline}-`);

      return splittedLabel?.length !== 1;
    };

    let allFiscalDateColumns = [];
    let allFiscalInfoColumns = [];
    allColumns.forEach((el, i) => {
      if (checkIsFiscalData(el.label)) {
        allFiscalDateColumns.push(el);
      } else {
        el.flex = 1;
        el.minWidth = 250;
        allFiscalInfoColumns.push(el);
      }
    });

    let updatedFiscalInfoColumns = uniqBy(
      allFiscalInfoColumns,
      (el) => el.label
    );

    return [...updatedFiscalInfoColumns, ...allFiscalDateColumns];
  };
  const onDriverSignificanceClick = (params) => {
    let payload = {
      agg_level: "l2",
      headerName: params.colDef.headerName,
      agg_hierarchy: {
        l0: currentHierarchyKey.current,
        l1: currentChildHierarchyKey.current,
        l2: params.value,
      },
    };
    dispatch(setEditHierarchyDriverSignificanceData(payload));
  };

  const noEditableCustomCellRender = (
    cellProps,
    editHierarchyForecastTableRoundOff
  ) => {
    let cols = editHierarchyGrandChildInstance?.current?.api?.getColumnDefs();
    const classes = useStyles();
    // Check if column type is string - if so, skip decimal formatting
    const isStringColumn =
      cellProps.colDef?.type === "str" || cellProps.colDef?.type === "string";
    const displayValue = isStringColumn
      ? cellProps.value
      : Number(cellProps.value).toFixed(
          editHierarchyForecastTableRoundOff || 0
        );
    return (
      <div className={classes.wrapper}>
        <div className={classes.ellipsisText} title={cellProps.value}>
          {displayValue}
        </div>
        {/* {showDriverSignificance &&
          cellProps?.column?.colId === cols?.[0]?.colId && (
            <DriverSignificanceRenderer
              onClick={() => onDriverSignificanceClick(cellProps)}
            />
          )} */}
      </div>
    );
  };

  return (
    <div className={classes.tableGrandChildContainer}>
      <AgGridComponent
        hideTableFormat={true}
        agGridPagination
        paginationPageSize={getPaginationPageSize(
          edit_hierarchy_pagination_page_size
        )}
        tableId="l2-table"
        defaultTextFieldViewOnly={enableCommaFormatting}
        showSaveTableConfig={false}
        showSearchModalBtn={true}
        hideFormatSideBar={true}
        skipAutoSizeColumn
        // minWidth={250}
        rowdata={editRowData}
        columns={columnDataHandler()}
        masterDetail={true}
        tableRef={topGrid}
        alignedGrids={
          bottomGrid.current && totalRowGrid.current
            ? [bottomGrid.current, totalRowGrid.current]
            : undefined
        }
        sizeColumnsToFitFlag
        uniqueRowId="row"
        cacheBlockSize={10}
        loadTableInstance={loadUserTableInstance}
        detailRowAutoHeight={true}
        noEditableCustomCellRender={(cellProps) =>
          noEditableCustomCellRender(
            cellProps,
            editHierarchyForecastTableRoundOff
          )
        }
        onBlur={onL2ValueChanged}
        // headerHeight="0"

        lockCellApi={(cellProps, isLocked) =>
          lockCellApi(cellProps, isLocked, editHierarchyGrandChildInstance)
        }
        lockCellCustomConditionFn={lockCellCustomConditionFn}
        lockCellIfNoValue
        customCellRenderer={(cellProps) => {
          const column_name = cellProps?.colDef?.id.split(".")[0];
          const l2DisplayName =
            adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l2
              ?.column_name;
          //For Empty Forecast - Display cell as "-"
          if (
            checkIfForecastIsEmptyForViewEdit(
              cellProps,
              column_name,
              l2DisplayName
            )
          ) {
            return displayEmptyForecastForViewEdit(
              cellProps?.colDef?.extra?.staticToolTip
            );
          }

          //For disabled columns - The value is applied with comma separation
          if (
            checkIfCellIsDisabledForViewEdit(cellProps, adaReducer, id) &&
            enableCommaFormatting
          ) {
            return (
              <div style={{ pointerEvents: "none" }}>
                {numberFormattingWithCommas(
                  cellProps?.value,
                  editHierarchyForecastTableRoundOff
                )}
              </div>
            );
          }
          if (cellProps.colDef.disabled === true) {
            return (
              <div>
                {numberFormattingWithCommas(
                  cellProps?.value,
                  editHierarchyForecastTableRoundOff
                )}
              </div>
            );
          }
        }}
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
  prevOldValue,
  useAdjustedUserForecastBase
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
    prevOldValue,
    null,
    null,
    null,
    useAdjustedUserForecastBase
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
  if (grandChildDataLength == 1) {
    var isValidL0 = getL0ValidAfterL2Change(
      editHierarchyCurrentNode.data,
      column,
      initialEditRowData?.current,
      editHierarchyInstance.current.api,
      editHierarchyTotalRowInstance.current.api,
      "total",
      dispatch,
      null,
      null,
      useAdjustedUserForecastBase
    );
    if (isValidL0) {
      let currRowNode = editHierarchyGrandChildInstance.current.api?.getRowNode(
        row.row
      );
      currRowNode?.setDataValue(column.colId, prevOldValue);

      let childRowNode = editHierarchyChildInstance.current.api?.getRowNode(
        l1RowNode.data.row
      );
      let totalRowNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );
      let totalSum = 0;
      let totalChildSum = 0;
      editHierarchyGrandChildInstance.current.api.forEachNode((node) => {
        totalSum += Number(node.data[colId]?.adjusted) || 0;
      });
      childRowNode.setDataValue(column.colId, totalSum);

      editHierarchyChildInstance.current.api.forEachNode((node) => {
        totalChildSum += Number(node.data[colId]?.adjusted) || 0;
      });
      totalRowNode.setDataValue(column.colId, totalChildSum);

      let newChildTotalData = totalRowNode.data;
      let prevLastUpdatedData = totalRowNode.data?.last_updated_data || {};
      newChildTotalData.last_updated_data = {
        ...prevLastUpdatedData,
        [colId]: totalChildSum,
      };
      totalRowNode.setData(newChildTotalData);

      let newChildData = childRowNode.data;
      let prevLastUpdatedDataChild = childRowNode.data?.last_updated_data || {};
      newChildData.last_updated_data = {
        ...prevLastUpdatedDataChild,
        [colId]: totalSum,
      };
      childRowNode.setData(newChildData);

      let newGrandChildData = currRowNode.data;
      let prevLastUpdatedDataGrandChild =
        currRowNode.data?.last_updated_data || {};
      newGrandChildData.last_updated_data = {
        ...prevLastUpdatedDataGrandChild,
        [colId]: prevOldValue,
      };
      currRowNode.setData(newGrandChildData);

      return;
    }
  }
  onCellValueChange(
    editHierarchyCurrentNode.data,
    column,
    true,
    editHierarchyInstance.current.api,
    editHierarchyTotalRowInstance.current.api,
    initialEditRowData?.current,
    "total",
    true,
    dispatch,
    null,
    null,
    null,
    null,
    useAdjustedUserForecastBase
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
      totalRowNode, // locked parent value,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      useAdjustedUserForecastBase
    );

    return;
  }
};

const useStyles = makeStyles(() => ({
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  ellipsisText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tableGrandChildContainer: {
    flex: "1 1 auto",
    height: "100%",
    "& div.impact-table-main-header": {
      display: "none !important",
    },
  },
}));
