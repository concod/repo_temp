import { makeStyles } from "@mui/styles";
import { cloneDeep, uniqBy } from "lodash";
import {
  addIdToAggridScrollElem,
  checkIfCellIsDisabledForViewEdit,
  checkIfForecastIsEmptyForViewEdit,
  displayEmptyForecastForViewEdit,
  formatNumberThreeDecimal,
  numberFormattingWithCommas,
  updateAllForecastMultiplier,
  updateForecastMultiplier,
  checkIfForecastIsEmptyForSome,
  checkIfForecastIsZeroForViewEdit,
} from "modules/ada/utils-ada/utilityFunctions";
import React, { forwardRef, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { infoHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
import {
  getL1AfterL0update,
  hasIsLockedNested,
  lockCellApi,
  lockCellCustomConditionFn,
  manualCheckValid,
  manualTotalvalueChanged,
  NonActiveChangeFromParentToChild,
  onCellValueChange,
  onTotalChange,
} from "..";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import { removeToolPanelById } from "modules/ada/utils-ada/utilityFunctions";

const EditHierarcy = forwardRef((props, ref) => {
  const {
    id,
    activeKey,
    columnDefs,
    totalColumnDefs,
    editRowData,
    totalRowData,
    historicColumnData,
    setCounterOnEditHierarchyChange,
    isCalledFromMFPDashboard,
    activeChildHierarchyKey,
    disabledTotalColumns,
    setIsEditRowUpdated,
  } = props;

  const dispatch = useDispatch();

  let {
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    initialEditRowData,
    initialTotalRowData,
    editChildRowData,
    allEditedChildRowData,
    currentHierarchyKey,
    editHierarchyChildTotalRowInstance,
    editHierarchyChildInstance,
    editHierarchyGrandChildInstance,
    allEditedGrandChildRowData,
  } = ref;

  const classes = useStyles();
  const globalClasses = globalStyles();

  const loadUserTableInstance = (params) => {
    editHierarchyInstance.current = params;
  };
  const loadUserTotalRowInstance = (params) => {
    editHierarchyTotalRowInstance.current = params;

    addIdToAggridScrollElem("l0-table-total");
    addIdToAggridScrollElem("l0-table");
  };

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const edit_hierarchy_pagination_page_size =
    adaReducer?.clientConfig?.attribute_value
      ?.edit_hierarchy_pagination_page_size;

  const enableCommaFormatting =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting === true;

  const editHierarchyForecastTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;

  const l0DisplayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l0?.column_name;

  let topGrid = useRef(null);
  let bottomGrid = useRef(null);

  const rowClassRules = useMemo(() => {
    return {
      [classes.totalRow]: (params) => params.rowIndex === 0,
    };
  }, [classes.totalRow]);

  const onL0ValueChange = (
    _,
    row,
    column,
    isChanged,
    __,
    initialVal // old Value
  ) => {
    let colId = column.colId?.split(".")?.[0];

    const originalVal = row[column.colId?.split(".")?.[0]].adjusted;
    const newValue = Number(originalVal);
    let currHierarchyNode = editHierarchyInstance.current.api.getRowNode(
      row.row
    );
    let totalRowNode = editHierarchyTotalRowInstance.current.api.getRowNode(
      "total"
    );
    //let l0RowNode = editHierarchyInstance.current.api.getRowNode(node.data.row);

    const oldValue =
      Number(
        currHierarchyNode?.data?.["last_updated_data"]?.[
          column.colId?.split(".")?.[0]
        ]
      ) ||
      initialEditRowData?.current?.find((el) => el.row === row.row)[
        column.colId?.split(".")?.[0]
      ].adjusted;

    if (originalVal === "" || Number(originalVal) < 0) {
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }

    if (!isChanged) return;

    let activeChildHierarchyParentKeyLocked = false;
    editHierarchyInstance.current.api.forEachNode((node) => {
      if (
        node.data.row === activeChildHierarchyKey ||
        currentHierarchyKey.current
      ) {
        if (node?.data?.[colId]?.isLocked) {
          activeChildHierarchyParentKeyLocked = true;
        }
      }
    });

    let isInvalid = hasIsLockedNested(allEditedChildRowData?.current, colId);
    if (
      isInvalid &&
      !activeChildHierarchyParentKeyLocked &&
      totalRowNode?.data[colId]?.isLocked
    ) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as one of the active L0 has locked L1 Value`
      );
      currHierarchyNode?.setDataValue(column.colId, oldValue);
      return;
    }

    // checking if this change will be valid for all L1's

    if (
      activeChildHierarchyKey ||
      currentHierarchyKey.current
      // &&
      // (activeChildHierarchyKey || currentHierarchyKey.current) === row.row
    ) {
      let isNotValidForL1 = manualCheckValid(
        editHierarchyChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        null,
        currentHierarchyKey.current,
        activeChildHierarchyParentKeyLocked,
        totalRowNode,
        true
      );

      if (isNotValidForL1) {
        currHierarchyNode?.setDataValue(column.colId, oldValue);

        return;
      }
    }

    if (
      activeChildHierarchyKey ||
      currentHierarchyKey.current
      //  &&
      // (activeChildHierarchyKey || currentHierarchyKey.current) === row.row
    ) {
      let L1ValueafterL0Update = getL1AfterL0update(
        editHierarchyChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        true
      );

      let expandedNode = null;
      editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
        if (node.expanded) {
          expandedNode = node;
        }
      });
      if (expandedNode) {
        let L2LockedSum = 0;
        editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
          if (node?.data?.[colId]?.isLocked) {
            L2LockedSum += Number(node.data[colId]?.adjusted || 0);
          }
        });

        let updatedL1Value =
          L1ValueafterL0Update * expandedNode?.data?.[colId]?.IA;

        if (L2LockedSum && L2LockedSum > updatedL1Value) {
          currHierarchyNode?.setDataValue(column.colId, oldValue);
          infoHandler(
            dispatch,
            `Value for ${
              row.row
            } - ${colId}  has been reset as changing department value to ${newValue} is making L1 ${
              expandedNode?.data?.row
            } to ${formatNumberThreeDecimal(
              updatedL1Value
            )} which is less than locked sum of all L2's inside it i.e. ${formatNumberThreeDecimal(
              L2LockedSum
            )}`
          );
          return;
        }
      }

      for (let [l1Key, l2Data] of Object.entries(
        allEditedGrandChildRowData?.current
      )) {
        let L2LockedSum = 0;
        l2Data?.forEach((data) => {
          if (data.isEdited && data) {
            if (data[colId].isLocked)
              L2LockedSum += Number(data[colId].adjusted || 0);
          }
        });

        let currL1Data = null;
        editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
          if (node.data.row === l1Key) {
            currL1Data = node.data?.[colId]?.IA;
          }
        });

        let updatedL1Value = currL1Data * L1ValueafterL0Update;

        if (L2LockedSum && L2LockedSum > updatedL1Value) {
          currHierarchyNode?.setDataValue(column.colId, oldValue);

          infoHandler(
            dispatch,
            `Value for ${
              row.row
            } - ${colId}  has been reset as changing department value to ${newValue} is making L1 ${l1Key} to ${formatNumberThreeDecimal(
              updatedL1Value
            )} which is less than locked sum of all L2 inside it i.e. ${formatNumberThreeDecimal(
              L2LockedSum
            )}`
          );
          return;
        }
      }
    }

    let isNotValidForL1AfterHidingL1 = L1ChangeByL0(
      row,
      column,
      ref,
      currentHierarchyKey.current,
      editChildRowData,
      totalRowNode?.data[colId]?.isLocked,
      true,

      dispatch
    );

    if (isNotValidForL1AfterHidingL1) {
      currHierarchyNode?.setDataValue(column.colId, oldValue);

      return;
    }
    // to calculate final ratio, it's important to track what user entered in the particular cell
    // as a cell's value keeps on updating by their respective parent/child

    currHierarchyNode.data[
      column.colId?.split(".")?.[0]
    ].adjusted_manual = newValue;

    onCellValueChange(
      row,
      column,
      isChanged,
      editHierarchyInstance.current.api,
      editHierarchyTotalRowInstance.current.api,
      initialEditRowData.current,
      "total",
      false,
      dispatch,
      initialVal
    );
    setCounterOnEditHierarchyChange((prev) => (prev += 1));

    L1ChangeByL0(
      row,
      column,
      ref,
      currentHierarchyKey.current,
      editChildRowData,
      totalRowNode?.data[colId]?.isLocked,
      false,
      dispatch
    );

    // L1 computation when it is hide

    updateForecastMultiplier(
      editHierarchyTotalRowInstance,
      column,
      id,
      dispatch
    );
  };

  const onL0TotalChange = (_, row, column, isChanged) => {
    let colId = column.colId?.split(".")?.[0];

    let originalVal = row[colId].adjusted;
    const newValue = Number(originalVal);

    let totalRowNode = editHierarchyTotalRowInstance.current?.api.getRowNode(
      "total"
    );

    if (originalVal === "" || Number(originalVal) < 0) {
      const oldValue =
        Number(totalRowNode?.data?.["last_updated_data"]?.[colId]) ||
        initialTotalRowData?.current?.[0][colId].adjusted;

      totalRowNode?.setDataValue(column.colId, oldValue);

      return;
    }
    if (!isChanged) return;

    const oldValue =
      Number(totalRowNode?.data?.["last_updated_data"]?.[colId]) ||
      initialTotalRowData?.current?.[0][colId].adjusted;

    let SKULength = 0;
    editHierarchyInstance.current.api.forEachNode((_) => {
      SKULength += 1;
    });
    let isL0Locked = false;

    if (SKULength === 1) {
      editHierarchyInstance?.current?.api?.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          isL0Locked = true;
        }
      });

      if (isL0Locked) {
        infoHandler(
          dispatch,
          `Value for current row - ${colId}  has been reset as either some/all cell values are 0 or All cell's are locked`
        );
        totalRowNode?.setDataValue(column.colId, oldValue);
        return;
      }
    }

    let isCollapsedL2Locked = hasIsLockedNested(
      allEditedGrandChildRowData?.current,
      colId
    );
    if (isCollapsedL2Locked) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as one of the collapsed L1 has locked L2 value`
      );
      totalRowNode?.setDataValue(column.colId, oldValue);

      return;
    }

    let isInvalid = hasIsLockedNested(allEditedChildRowData?.current, colId);

    if (isInvalid) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as you have edited atleast one L1 & it's not active on the user interface `
      );
      totalRowNode?.setDataValue(column.colId, oldValue);
      return;
    }

    // checking if this change will be valid for all L1's

    let activeChildHierarchyParentKeyLocked = false;
    editHierarchyInstance.current.api.forEachNode((node) => {
      if (
        node.data.row ===
        (activeChildHierarchyKey || currentHierarchyKey.current)
      ) {
        if (node?.data?.[colId]?.isLocked) {
          activeChildHierarchyParentKeyLocked = true;
        }
      }
    });

    // check L1 locked & revert the value
    let L1LockedSum = 0;
    let isL1Locked = false;
    editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        L1LockedSum += Number(node.data[colId]?.adjusted || 0);
        isL1Locked = true;
      }
    });

    if (isL1Locked) {
      totalRowNode?.setDataValue(column.colId, oldValue);

      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId}  has been reset as this operation is disabled i.e. Lock L1 and change L0 Total. Save previous operations before proceeding with this operation`
      );
      return;
    }

    if (activeChildHierarchyKey || currentHierarchyKey.current) {
      // If L0 total is is invalid then L0ValueafterL0TotalUpdateRatio will return true else updated ratio
      let L0ValueafterL0TotalUpdateRatio = getL1AfterL0update(
        editHierarchyInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        true
      );

      if (L0ValueafterL0TotalUpdateRatio === true) {
        return;
      }

      let L0ActiveNode = editHierarchyInstance.current.api.getRowNode(
        activeChildHierarchyKey || currentHierarchyKey.current
      );

      let L0ActiveNodeIAValue =
        L0ActiveNode?.data?.[column?.colId?.split(".")?.[0]]?.IA;

      let L0ValueafterL0TotalUpdate =
        L0ValueafterL0TotalUpdateRatio * L0ActiveNodeIAValue;

      if (L1LockedSum && L1LockedSum > L0ValueafterL0TotalUpdate) {
        totalRowNode?.setDataValue(column.colId, oldValue);

        return infoHandler(
          dispatch,
          `Value for ${
            row.row
          } - ${colId}  has been reset as changing L0 value to ${newValue} is making L1 ${
            activeChildHierarchyKey || currentHierarchyKey.current
          } to ${formatNumberThreeDecimal(
            L0ValueafterL0TotalUpdate
          )} which is less than locked sum of all L2 inside it i.e. ${formatNumberThreeDecimal(
            L1LockedSum
          )}`
        );
      }

      if (activeChildHierarchyParentKeyLocked) {
        return manualTotalvalueChanged(
          editHierarchyInstance.current.api,
          row,
          column,
          isChanged,
          editHierarchyTotalRowInstance.current?.api,
          newValue,
          "total",
          dispatch,
          initialTotalRowData?.current,
          null,
          adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W"
        );
      }

      let isNotValidForL1 = manualCheckValid(
        editHierarchyChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        null,
        currentHierarchyKey.current,
        activeChildHierarchyParentKeyLocked
      );

      if (isNotValidForL1) {
        totalRowNode?.setDataValue(column.colId, oldValue);
        return;

        // infoHandler(
        //   dispatch,
        //   `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
        // );
        // return;
      }
    }

    // if (L1LockedSum) {
    //   totalRowNode?.setDataValue(column.colId, oldValue);

    //   infoHandler(
    //     dispatch,
    //     `Value for ${row.row} - ${colId}  has been reset as this operation is disabled i.e. Lock SKU and change Department Total`
    //   );
    //   return;
    // }

    // Check L2 Lock & revert the value
    let expandedNode = null;
    editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
      if (node.expanded) {
        expandedNode = node;
      }
    });
    if (expandedNode) {
      let L2LockedSum = 0;
      editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          L2LockedSum += Number(node.data[colId]?.adjusted || 0);
        }
      });

      if (L2LockedSum) {
        totalRowNode?.setDataValue(column.colId, oldValue);

        infoHandler(
          dispatch,
          `Value for ${row.row} - ${colId}  has been reset as this operation is disabled i.e. Lock L2 and change L0 Total. Please save changes before proceeding with this operation`
        );
        return;
      }
    }

    let isNotValidForL0AfterHidingL1 = L1L2ChangeByL0Total(
      column,
      row,
      ref,
      currentHierarchyKey.current,
      dispatch
    );

    if (isNotValidForL0AfterHidingL1) {
      totalRowNode?.setDataValue(column.colId, oldValue);

      return;
    }

    setCounterOnEditHierarchyChange((prev) => (prev += 1));

    // Self computation & L0 Distribution if valid value in L0 Total
    manualTotalvalueChanged(
      editHierarchyInstance.current.api,
      row,
      column,
      isChanged,
      editHierarchyTotalRowInstance.current?.api,
      newValue,
      "total",
      dispatch,
      initialTotalRowData?.current
    );

    L1L2ChangeByL0Total(
      column,
      row,
      ref,
      currentHierarchyKey.current,
      dispatch
    );

    // Marking node data as edited
    let totalNode = editHierarchyTotalRowInstance.current.api.getRowNode(
      "total"
    );
    totalNode.data.isEdited = true;
    totalNode.data[colId].isEdited = true;

    updateAllForecastMultiplier(totalNode?.data, id, dispatch, adaReducer);
  };

  const columnDataHandler = () => {
    let allColumns = [
      columnDefs[0],
      ...historicColumnData,
      ...columnDefs.slice(1),
    ]?.filter((el) => el && el.column_name);

    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    const checkIsFiscalData = (label) => {
      const isWeekEndDateLabelEnabled =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.is_week_end_date_label_enabled;

      let showWeekEndDateLabelEnabled =
        isWeekEndDateLabelEnabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W";

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

    let finalCols = [...updatedFiscalInfoColumns, ...allFiscalDateColumns];

    finalCols?.forEach((el) => {
      el.floatingFilter = false;
    });

    if (editHierarchyInstance?.current?.api) {
      editHierarchyInstance?.current?.api.setColumnDefs(finalCols);
    }
    return finalCols;
  };

  const totalColumnLabelHandler = () => {
    let colData = totalColumnDefs?.length
      ? totalColumnDefs.slice(1)
      : columnDefs.slice(1);
    let allColumns = [columnDefs[0], ...historicColumnData, ...colData]?.filter(
      (el) => el && el.column_name
    );

    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    const checkIsFiscalData = (label) => {
      const isWeekEndDateLabelEnabled =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.is_week_end_date_label_enabled;

      let showWeekEndDateLabelEnabled =
        isWeekEndDateLabelEnabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W";

      let splittedLabel = showWeekEndDateLabelEnabled
        ? label.split(`WE`)
        : label.split(`F${timeline}-`);

      return splittedLabel?.length !== 1;
    };

    let allFiscalDateColumns = [];
    let allFiscalInfoColumns = [];
    let newCol = cloneDeep(allColumns);
    newCol.forEach((el, index) => {
      const colName = el.id.split(".")[0];
      if (
        index > 0 &&
        checkIfForecastIsEmptyForSome(initialEditRowData, colName)
      ) {
        el.disabled = true;
        el.is_disabled = true;
      }
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

  const totalColumnDataHandler = () => {
    let columnDataFormatted = totalColumnLabelHandler() || [];

    let finalCols = columnDataFormatted.map((elem) => ({
      ...elem,
      floatingFilter: false,
      is_searchable: false,
      is_sortable: false,
    }));
    if (editHierarchyTotalRowInstance?.current?.api) {
      editHierarchyTotalRowInstance?.current?.api.setColumnDefs(finalCols);
    }
    return finalCols;
  };

  return (
    <>
      <div className={classes.total}>
        <AgGridComponent
          tableId="l0-table-total"
          defaultTextFieldViewOnly={enableCommaFormatting}
          hideRangeFilter
          minWidth={200}
          loadTableInstance={loadUserTotalRowInstance}
          sizeColumnsToFitFlag
          columns={totalColumnDataHandler()}
          uniqueRowId="row"
          cacheBlockSize={0}
          tableRef={bottomGrid}
          alignedGrids={topGrid.current ? [topGrid.current] : undefined}
          rowdata={totalRowData}
          headerHeight="0"
          pagination={false}
          rowClassRules={rowClassRules}
          onBlur={onL0TotalChange}
          lockCellApi={(cellProps, isLocked) =>
            lockCellApi(cellProps, isLocked, editHierarchyTotalRowInstance)
          }
          lockCellCustomConditionFn={lockCellCustomConditionFn}
          key={activeKey}
          lockCellIfNoValue
          adjustTableHeightServerSide={false}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          customCellRenderer={(cellProps) => {
            const column_name = cellProps?.colDef?.id.split(".")[0];

            //For Empty Forecast - Display cell as "-"
            if (
              checkIfForecastIsEmptyForViewEdit(
                cellProps,
                column_name,
                l0DisplayName
              ) ||
              (cellProps.colDef.disabled &&
                checkIfForecastIsZeroForViewEdit(cellProps, column_name))
            ) {
              return displayEmptyForecastForViewEdit(
                cellProps?.colDef?.extra?.staticToolTip
              );
            }

            //check if some of the values are null or all are zero
            if (checkIfForecastIsZeroForViewEdit(cellProps, column_name)) {
              return (
                <div style={{ fontWeight: "normal" }}>{cellProps?.value}</div>
              );
            }
            //For disabled columns - The value is applied with comma separation
            if (
              column_name !== l0DisplayName &&
              checkIfCellIsDisabledForViewEdit(cellProps, adaReducer, id) &&
              enableCommaFormatting
            ) {
              return (
                <div
                  style={{
                    pointerEvents: "none",
                  }}
                >
                  {numberFormattingWithCommas(
                    cellProps?.value,
                    editHierarchyForecastTableRoundOff
                  )}
                </div>
              );
            }

            if (cellProps.colDef.disabled === true) {
              return (
                <p
                  className={globalClasses.fakeInputStyle}
                  style={{
                    background: colours.alabaster,
                    pointerEvents: "none",
                  }}
                >
                  {numberFormattingWithCommas(
                    cellProps?.value,
                    editHierarchyForecastTableRoundOff
                  )}
                </p>
              );
            }
          }}
        />
      </div>

      <div className={classes.tableContainer}>
        <AgGridComponent
          paginationPageSize={edit_hierarchy_pagination_page_size}
          tableId="l0-table"
          defaultTextFieldViewOnly={enableCommaFormatting}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          onFirstDataRender={(params) => {
            removeToolPanelById(params.api, "format-columns");
          }}
          key={activeKey}
          minWidth={200}
          columns={columnDataHandler()}
          sizeColumnsToFitFlag
          loadTableInstance={loadUserTableInstance}
          uniqueRowId="row"
          rowdata={editRowData}
          cacheBlockSize={10}
          tableRef={topGrid}
          alignedGrids={bottomGrid.current ? [bottomGrid.current] : undefined}
          onBlur={onL0ValueChange}
          lockCellApi={(cellProps, isLocked) => {
            lockCellApi(cellProps, isLocked, editHierarchyInstance);

            // Lock total row of L1
            let lockedCellNode = editHierarchyChildTotalRowInstance?.current?.api?.getRowNode(
              "total"
            );
            if (
              lockedCellNode &&
              currentHierarchyKey.current === cellProps?.cellData?.data?.row
            ) {
              lockedCellNode.data[
                cellProps.column.id?.split(".")?.[0]
              ].isLocked = isLocked;

              editHierarchyChildTotalRowInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
              });
            }
          }}
          lockCellCustomConditionFn={lockCellCustomConditionFn}
          lockCellIfNoValue
          // if double scroll issue comes again, work on below prop i.e. adjustTableHeightServerSide logic
          adjustTableHeightServerSide={false}
          customCellRenderer={(cellProps) => {
            const column_name = cellProps?.colDef?.id.split(".")[0];

            //For Empty Forecast - Display cell as "-"
            if (
              checkIfForecastIsEmptyForViewEdit(
                cellProps,
                column_name,
                l0DisplayName
              )
            ) {
              return displayEmptyForecastForViewEdit(
                cellProps?.colDef?.extra?.staticToolTip
              );
            }
            //For disabled columns - The value is applied with comma separation
            if (
              column_name !== l0DisplayName &&
              checkIfCellIsDisabledForViewEdit(cellProps, adaReducer, id) &&
              enableCommaFormatting
            ) {
              return (
                <div
                  style={{
                    pointerEvents: "none",
                  }}
                >
                  {numberFormattingWithCommas(
                    cellProps?.value,
                    editHierarchyForecastTableRoundOff
                  )}
                </div>
              );
            }
            if (cellProps.colDef.disabled === true) {
              return (
                <p
                  className={globalClasses.fakeInputStyle}
                  style={{
                    background: colours.alabaster,
                    pointerEvents: "none",
                  }}
                >
                  {numberFormattingWithCommas(
                    cellProps?.value,
                    editHierarchyForecastTableRoundOff
                  )}
                </p>
              );
            }
          }}
        />
      </div>
    </>
  );
});

export default EditHierarcy;

export const L1ChangeByL0 = (
  row,
  column,
  ref,
  activeChildHierarchyKey,
  editChildRowData,
  isL0TotalLocked,
  noUpdate,
  dispatch
) => {
  let {
    editHierarchyInstance,
    editHierarchyChildInstance,
    editHierarchyChildTotalRowInstance,
    allEditedChildRowData,
    editHierarchyGrandChildInstance,
    allEditedGrandChildRowData,
    allEditedGrandChildRowMapping,
  } = ref;
  const newValue = Number(row[column.colId?.split(".")?.[0]].adjusted);
  let colId = column.colId?.split(".")?.[0];

  if (row.row === activeChildHierarchyKey) {
    // L1 update
    let childTotalRowInstance =
      editHierarchyChildTotalRowInstance?.current?.api;
    let currentChildTotalNode = childTotalRowInstance.getRowNode("total");

    currentChildTotalNode.setDataValue(column.colId, newValue);

    let isInvalid = onTotalChange(
      editHierarchyChildInstance.current?.api,
      row,
      column,
      true,
      dispatch,
      noUpdate
    );

    if (isInvalid) {
      return true;
    }
    if (noUpdate) {
      return;
    }
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey !== node.data.row) {
        InActiveL1ChangeByL0(
          node?.data,
          column,
          ref,
          activeChildHierarchyKey,
          null,
          dispatch
        );
      }
    });

    //return;  //removing this return because of it when we change l0 value ratio is not distributed to l2 level and l2 table value is not getting update with that new ratio
  }

  let activeL0Node = {};

  // row changed and active child hierarchy is not same as changed L0

  editHierarchyInstance?.current?.api?.forEachNode((node) => {
    if (activeChildHierarchyKey === node.data.row) {
      activeL0Node = node;
    }
  });

  if (activeChildHierarchyKey && activeL0Node && isL0TotalLocked) {
    // L1 update
    let childTotalRowInstance =
      editHierarchyChildTotalRowInstance?.current?.api;
    let currentChildTotalNode = childTotalRowInstance.getRowNode("total");

    currentChildTotalNode.setDataValue(
      column.colId,
      activeL0Node.data?.[colId]?.adjusted
    );

    let isInvalid = onTotalChange(
      editHierarchyChildInstance.current?.api,
      activeL0Node?.data,
      column,
      true,
      dispatch,
      noUpdate
    );

    if (isInvalid) {
      return true;
    }
    if (noUpdate) {
      return;
    }

    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey !== node.data.row) {
        InActiveL1ChangeByL0(
          node?.data,
          column,
          ref,
          activeChildHierarchyKey,
          null,
          dispatch
        );
      }
    });
    return;
  }

  // if (noUpdate) {
  //   return;
  // }
  let isInvalid = false;

  if (isL0TotalLocked) {
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey !== node.data.row) {
        let isL1Invalid = InActiveL1ChangeByL0(
          node?.data,
          column,
          ref,
          activeChildHierarchyKey,
          null,
          dispatch
        );
        if (isL1Invalid) {
          isInvalid = true;
        }
      }
    });
    return isInvalid;
  } else {
    let isL1Invalid = InActiveL1ChangeByL0(
      row,
      column,
      ref,
      activeChildHierarchyKey,
      null,
      dispatch
    );

    if (isL1Invalid) {
      return true;
    }
  }
};

export const InActiveL1ChangeByL0 = (
  row,
  column,
  ref,
  activeChildHierarchyKey,
  editChildRowData,
  dispatch
) => {
  let {
    editHierarchyInstance,
    editHierarchyChildInstance,
    editHierarchyChildTotalRowInstance,
    allEditedChildRowData,
    editHierarchyGrandChildInstance,
    allEditedGrandChildRowData,
    allEditedGrandChildRowMapping,
  } = ref;
  const newValue = Number(row[column.colId?.split(".")?.[0]].adjusted);
  let colId = column.colId?.split(".")?.[0];

  if (
    allEditedChildRowData?.current?.[row.row] &&
    row.row !== activeChildHierarchyKey
  ) {
    let isValid = NonActiveChangeFromParentToChild(
      allEditedChildRowData?.current?.[row.row],
      row,
      column,
      null,
      null,
      dispatch
    );
    if (isValid) {
      return true;
    }
  }

  // L2 update

  // Do L2 computation
  let expandedNode = null;
  editHierarchyChildInstance.current?.api?.forEachNode((node) => {
    if (node.expanded) {
      expandedNode = node;
    }
  });
  if (expandedNode) {
    onTotalChange(
      editHierarchyGrandChildInstance?.current?.api,
      expandedNode.data,
      column,
      true,
      dispatch
    );
  }

  // updating non active L2

  if (allEditedGrandChildRowMapping?.current[row.row]) {
    let detailActiveChilds = [];
    editHierarchyChildInstance.current?.api?.forEachNode((node) => {
      if (allEditedGrandChildRowMapping?.current[row.row][node.data.row]) {
        detailActiveChilds.push(node.data);
      }
    });
    for (let rowKey in allEditedGrandChildRowData?.current) {
      let isL3NonActiveChildData = detailActiveChilds?.find(
        ({ row }) => row === rowKey
      );

      if (expandedNode?.data?.row === rowKey) {
        continue;
      }
      if (isL3NonActiveChildData) {
        NonActiveChangeFromParentToChild(
          allEditedGrandChildRowData?.current?.[rowKey],
          isL3NonActiveChildData,
          column,
          null,
          null,
          dispatch
        );
      } else {
        let editHierarchChildyData = allEditedChildRowData?.current?.[
          row.row
        ].find((elem) => elem.row === rowKey);

        if (editHierarchChildyData) {
          NonActiveChangeFromParentToChild(
            allEditedGrandChildRowData?.current?.[rowKey],
            editHierarchChildyData,
            column,
            null,
            null,
            dispatch
          );
        }
      }
    }
  }
};

const L1L2ChangeByL0Total = (
  column,
  row,
  ref,
  activeChildHierarchyKey,
  dispatch
) => {
  let {
    editHierarchyInstance,
    editHierarchyChildInstance,
    editHierarchyChildTotalRowInstance,
    allEditedChildRowData,
    editHierarchyGrandChildInstance,
    allEditedGrandChildRowData,
  } = ref;

  if (activeChildHierarchyKey) {
    // get value of Active Hierarchy node
    let editHierarchyNode = editHierarchyInstance.current.api.getRowNode(
      activeChildHierarchyKey
    );

    let editHierarchyNodeValue = Number(
      editHierarchyNode.data[column.colId?.split(".")?.[0]].adjusted
    );

    // Assign to Total row node of L1 Table
    let childTotalRowInstance =
      editHierarchyChildTotalRowInstance?.current?.api;
    let currentChildTotalNode = childTotalRowInstance.getRowNode("total");
    currentChildTotalNode.setDataValue(column.colId, editHierarchyNodeValue);

    // Distribute values among all L1's;
    let isInvalidWarning = onTotalChange(
      editHierarchyChildInstance.current?.api,
      editHierarchyNode.data,
      column,
      true,
      dispatch
    );
    if (isInvalidWarning) {
      return;
    }
  }

  // Do L2 computation
  let expandedNode = null;
  editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
    if (node.expanded) {
      expandedNode = node;
    }
  });
  if (expandedNode) {
    return onTotalChange(
      editHierarchyGrandChildInstance.current.api,
      expandedNode.data,
      column,
      true,
      dispatch
    );
  }

  // updating non active L1
  for (let rowKey in allEditedChildRowData?.current) {
    if (rowKey === activeChildHierarchyKey) continue;

    let nonActiveHierachyChild = editHierarchyInstance.current.api.getRowNode(
      rowKey
    );

    let isValid = NonActiveChangeFromParentToChild(
      allEditedChildRowData?.current?.[rowKey],
      nonActiveHierachyChild?.data,
      column,
      null,
      null,
      dispatch
    );
    if (isValid) {
      return true;
    }
  }

  // updating non active L2

  for (let rowKey in allEditedGrandChildRowData?.current) {
    for (let childRow in allEditedChildRowData?.current) {
      allEditedChildRowData?.current?.[childRow]?.forEach((elem) => {
        if (elem.row === rowKey) {
          NonActiveChangeFromParentToChild(
            allEditedGrandChildRowData?.current?.[rowKey],
            elem,
            column,
            null,
            null,
            dispatch
          );
        }
      });
    }

    editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
      if (node.data.row === rowKey && !node.expanded) {
        NonActiveChangeFromParentToChild(
          allEditedGrandChildRowData?.current?.[rowKey],
          node.data,
          column,
          null,
          null,
          dispatch
        );
      }
    });
  }
};

const useStyles = makeStyles(() => ({
  tableContainer: {
    flex: "1 1 auto",
  },
  total: {
    flex: "none",
    "& .ag-root-wrapper": {
      borderTop: "none",
      height: "42px",
    },
    marginBottom: "0.5rem",
  },
  totalRow: {
    fontWeight: "bold",
    "& a": {
      color: "#181d1f",
    },
  },
}));
