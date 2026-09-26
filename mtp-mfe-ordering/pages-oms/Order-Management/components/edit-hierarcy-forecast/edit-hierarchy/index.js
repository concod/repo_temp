import { makeStyles } from "@mui/styles";
import { uniqBy } from "lodash";
import {
  addIdToAggridScrollElem,
  checkIfCellIsDisabledForViewEdit,
  checkIfForecastIsEmptyForViewEdit,
  displayEmptyForecastForViewEdit,
  formatNumberThreeDecimal,
  numberFormattingWithCommas,
  updateAllForecastMultiplier,
  updateForecastMultiplier,
} from "../utils-matrix-summary/utilityFunctions";
import React, { forwardRef, useMemo, useRef, useState } from "react";
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
import { Typography } from "@mui/material";
import { useNavigate } from "react-router-dom-v5-compat";
import {
  setIsCellEdited,
  setIsButtonDisabled,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { createTableHeader } from "../../Product-Details-Screen/Style-Order-Summary/utils";
import { setSaveActionTime } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
//import { setSelectedRowsL0Table } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";

const EditHierarcy = forwardRef((props, ref) => {
  const {
    id,
    activeKey,
    columnDefs,
    editRowData,
    totalRowData,
    historicColumnData,
    setCounterOnEditHierarchyChange,
    isCalledFromMFPDashboard,
    activeChildHierarchyKey,
    disabledTotalColumns,
    setIsEditRowUpdated,
    setSelectedRowsL0Table,
    getTopRightOptions,
    getTopCenterOptions,
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
  const navigate = useNavigate();

  const [tableSettingOpen, setTableSettingOpen] = useState(false);

  const loadUserTableInstance = (params) => {
    editHierarchyInstance.current = params;
  };
  const loadUserTotalRowInstance = (params) => {
    editHierarchyTotalRowInstance.current = params;

    addIdToAggridScrollElem("l0-table-total");
    addIdToAggridScrollElem("l0-table");
  };

  const matrixSummaryReducer = useSelector(
    (store) => store?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );
  const OmsReducer = useSelector(
    (store) => store?.omsReducer.orderManagementService
  );

  const enableCommaFormatting =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.numberFormatting?.enableCommaFormatting === true;

  const editHierarchyForecastTableRoundOff =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.EditHierarchyForecast;

  const l0DisplayName =
    matrixSummaryReducer?.tenantFilters?.view_edit_hierarchy_filters?.l0
      ?.column_name;

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
    dispatch(setIsButtonDisabled(true));
    dispatch(setSaveActionTime(Date.now()));
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

    // let isNotValidForL1AfterHidingL1 = L1ChangeByL0(
    //   row,
    //   column,
    //   ref,
    //   currentHierarchyKey.current,
    //   editChildRowData,
    //   totalRowNode?.data[colId]?.isLocked,
    //   true,

    //   dispatch
    // );

    // if (isNotValidForL1AfterHidingL1) {
    //   currHierarchyNode?.setDataValue(column.colId, oldValue);

    //   return;
    // }
    // to calculate final ratio, it's important to track what user entered in the particular cell
    // as a cell's value keeps on updating by their respective parent/child

    currHierarchyNode.data[
      column.colId?.split(".")?.[0]
    ].adjusted_manual = newValue;
    console.log(
      "KPIDATA",
      currHierarchyNode.data[column.colId?.split(".")?.[0]]
    );

    if (newValue > currHierarchyNode.data[column.colId?.split(".")?.[0]].Kpi) {
      currHierarchyNode.data[
        column.colId?.split(".")?.[0]
      ].isKPIBreached = true;
    } else {
      currHierarchyNode.data[
        column.colId?.split(".")?.[0]
      ].isKPIBreached = false;
    }

    dispatch(setIsCellEdited(true));

    onCellValueChange(
      row,
      column,
      isChanged,
      editHierarchyInstance.current.api,
      editHierarchyTotalRowInstance.current.api,
      initialEditRowData.current,
      "Total",
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

    // editHierarchyInstance.current.api.refreshCells({
    //   force: true,
    //   suppressFlash: false,
    //   rowNodes: [node],
    //   columns: ["total_order_quantity"],
    // });

    // L1 computation when it is hide
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
          null
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

    updateAllForecastMultiplier(totalNode?.data, id, dispatch);
  };

  const columnDataHandler = () => {
    let allColumns = [
      columnDefs[0],
      ...historicColumnData,
      ...columnDefs.slice(1),
    ]?.filter((el) => el && el.column_name);

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

  const totalColumnLabelHandler = () => {
    let colData = columnDefs.slice(1);
    let allColumns = [columnDefs[0], ...historicColumnData, ...colData]?.filter(
      (el) => el && el.column_name
    );

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

  const totalColumnDataHandler = useMemo(() => {
    let columnDataFormatted = totalColumnLabelHandler() || [];
    return columnDataFormatted.map((elem) => ({
      ...elem,
      is_searchable: false,
      is_sortable: false,
    }));
  }, [columnDefs]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    editHierarchyInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRowsL0Table(selectedRows);
    // let l_selections = event.api.getSelectedRows().length;
    // let l_buttonEnabled = editHierarchyInstance.current.api.buttonEnabled;
    // if (l_selections) {
    //   !l_buttonEnabled && setButtonEnabled(true);
    // } else {
    //   l_buttonEnabled && setButtonEnabled(false);
    // }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  const getTableHeader = () => {
    const options = [];
    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {createTableHeader(
          OmsReducer?.highLevelSummaryState?.level_of_hierarchy_label,
          OmsReducer?.highLevelSummaryState?.level_of_hierarchy_value
        )}
      </div>
    );
    return options;
  };

  const getBottomLeftOptions = () => {
    let options = [];

    options.push(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: window.innerWidth > 1300 ? "4px" : "-8px",
        }}
      >
        {/* ROQ Status Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#E0E0E0",
              borderRadius: "2px",
              border: "1px solid #ccc",
            }}
          ></div>
          <Typography variant="body2" style={{ fontSize: "12px" }}>
            Approved ROQ - Cannot be edited
          </Typography>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#FFF3CD",
              borderRadius: "2px",
              border: "1px solid #ffc107",
            }}
          ></div>
          <Typography variant="body2" style={{ fontSize: "12px" }}>
            Partially Approved ROQ - Unapproved ROQ DCs can be edited
          </Typography>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#FFCDD2",
              borderRadius: "2px",
              border: "1px solid #f44336",
            }}
          ></div>
          <Typography variant="body2" style={{ fontSize: "12px" }}>
            ROQ below Vendor MOQ
          </Typography>
        </div>

        {/* <Button
            label="Button"
            size="medium"
            type="default"
            variant="url"
            icon={<InfoIcon className={classes.infoIcon} fontSize="small" />}
            onClick={openFootnotePrompt}
          >
            View Footnotes
          </Button> */}

        {/* {showFootnote && (
            <Card size="large" className={customClasses.footnoteCard}>
              <div
                className={globalClasses.flexAlignBetweenCenter}
                style={{ marginBottom: "1rem" }}
              >
                <Typography h6 style={{ fontWeight: 800, fontSize: "16px" }}>
                  Footnotes
                </Typography>
                <div>
                  <IconButton
                    onClick={() => setShowFootnote(false)}
                    size="small"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
              <ul className={customClasses.footnoteList}>
                {[
                  OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE,
                  ...OMS_STYLE_ORDER_SUMMARY_FOOTNOTES,
                ]?.map((note, index) => {
                  return (
                    <li key={index} className={customClasses.footnoteListItem}>
                      <span style={{ marginTop: "4px" }}>
                        <HandPointingIcon />
                      </span>
                      <span>
                        <Typography style={{ display: "inline" }}>
                          {note?.message}
                        </Typography>{" "}
                        {note?.link && (
                          <Button
                            label="Button"
                            size="small"
                            type="default"
                            variant="url"
                            iconPlacement="right"
                            icon={<OpenInNewIcon fontSize="small" />}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                            onClick={() => gotToDeepDive()}
                          >
                            {note?.link}
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )} */}
      </div>
    );

    return options;
  };

  return (
    <div className={`${classes.matrixSummaryWrapper} ${tableSettingOpen ? classes.tableSettingOpen : ""} matrix-summary-wrapper`}>
      <div className={classes.topFilters}>{getTopCenterOptions()}</div>
      <div
        className={`${classes.total} ${classes.matrixSummaryTotalGrid} matrixSummary`}
      >
        <AgGridComponent
          hideTableFormat={true}
          tableId="l0-table-total"
          //defaultTextFieldViewOnly={enableCommaFormatting}
          hideRangeFilter
          minWidth={200}
          loadTableInstance={loadUserTotalRowInstance}
          // sizeColumnsToFitFlag
          columns={totalColumnDataHandler}
          uniqueRowId="aggr_column"
          cacheBlockSize={0}
          tableRef={bottomGrid}
          alignedGrids={topGrid.current ? [topGrid.current] : undefined}
          rowdata={totalRowData}
          headerHeight="0"
          pagination={false}
          rowClassRules={rowClassRules}
          onBlur={onL0TotalChange}
          key={activeKey}
          adjustTableHeightServerSide={true}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          getRowStyle={(params) => {
            return {
              pointerEvents: "none",
              backgroundColor: "#F4F1F9",
            };
          }}
          selectAllHeaderComponent={true}
          hideSelectAllRecords={true}
          hideFormatSideBar={true}
          customCellRenderer={(cellProps) => {
            if (cellProps.value === "Grand Total") {
              return (
                <p style={{ position: "fixed", left: "13px" }}>
                  {cellProps.value}
                </p>
              );
            }
            if (cellProps?.value === null) {
              return <p style={{ textAlign: "right" }}>-</p>;
            }
          }}
          // topRightOptions={getTopRightOptions()}
          // topCenterOptions={getTopCenterOptions()}
          // tableHeader={getTableHeader()}
          suppressContextMenu={true}
          hideTableSetting
        />
      </div>

      <div className={classes.tableContainer}>
        <AgGridComponent
          tableId="l0-table"
          selectAllHeaderComponent={true}
          hideSelectAllRecords={false}
          //defaultTextFieldViewOnly={enableCommaFormatting}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          onTableSettingClick={(params) => {
            setTableSettingOpen(params);
          }}
          key={activeKey}
          minWidth={200}
          columns={columnDefs}
          topRightOptions={getTopRightOptions()}
          tableHeader={getTableHeader()}
          // sizeColumnsToFitFlag
          loadTableInstance={loadUserTableInstance}
          uniqueRowId="aggr_column"
          rowdata={editRowData}
          cacheBlockSize={10}
          tableRef={topGrid}
          detailRowAutoHeight={true}
          // skipAutoSizeColumn
          alignedGrids={bottomGrid.current ? [bottomGrid.current] : undefined}
          onBlur={onL0ValueChange}
          onSelectionChanged={onSelectionChanged}
          //adjustTableHeightServerSide={true}
          adjustTableHeightServerSide={true}
          customCellRenderer={(cellProps) => {
            if (cellProps?.value === null) {
              return <p style={{ textAlign: "right" }}>-</p>;
            }
            if (cellProps?.data) {
              for (const week in cellProps?.data) {
                let columnId = `${week}.adjusted`;
                if (cellProps.column.colId === columnId) {
                  if (cellProps?.data[week]?.isGreyOut) {
                    return (
                      <div
                        style={{
                          textAlign: "right",
                          backgroundColor: "#E0E0E0",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          position: "relative",
                          cursor: "help",
                        }}
                        title="Approved ROQ - Cannot be edited"
                      >
                        {cellProps?.value}
                      </div>
                    );
                  }
                  if (cellProps?.data[week]?.isYellowOut) {
                    return (
                      <div
                        style={{
                          textAlign: "right",
                          backgroundColor: "#FFF3CD",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          position: "relative",
                          cursor: "help",
                        }}
                        title="Partially Approved ROQ - Unapproved ROQ DCs can be edited"
                      >
                        {cellProps?.value}
                      </div>
                    );
                  }
                }
              }
            }
            // let column = cellProps?.column?.colId.split(".")[0];
            // if (cellProps?.data[column]?.isKPIBreached) {
            //   console.log("color123", cellProps?.colDef?.cellStyle, cellProps);
            //   if (cellProps?.colDef?.cellStyle) {
            //     cellProps.colDef.cellStyle = {
            //       backgroundColor: "#AF000033",
            //       colour: "AF000033",
            //       ...cellProps.colDef.cellStyle,
            //     };
            //   }
            // }
          }}
          noRowOverlayMessage="No data found"
          bottomLeftOptions={getBottomLeftOptions()}
        />
      </div>
    </div>
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
  const newValue = Number(row[column.colId?.split(".")?.[0]]?.adjusted);
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
  // const newValue = Number(row[column.colId?.split(".")?.[0]].adjusted);
  // let colId = column.colId?.split(".")?.[0];

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
  matrixSummaryWrapper: {
    padding: "16px",
    paddingBottom: "0px",
  },
  tableSettingOpen: {
    "& .matrixSummary .ag-root-wrapper": {
      width: "calc(100% - 375px) !important",
      transition: "all 200ms ease-in-out !important",
    },
    "& .table-footer-section": {
      bottom: "18px !important",
    },
  },
  tableContainer: {
    flex: "1 1 auto",
  },
  total: {
    flex: "none",
    "& .ag-root-wrapper": {
      borderTop: "none",
      height: "42px",
    },
    // marginBottom: "0.5rem",
    "& .ag-header.ag-pivot-off": {
      height: "1px !important" /* Removes the fixed height */,
      minHeight: "1px !important" /* Ensures no minimum height restriction */,
    },
  },
  matrixSummaryTotalGrid: {
    "& .ia-basic-table-layout.table-v32 .impact-table-main-container.card-container.table-setting-open": {
      height: "120px !important",
    },
    "& .ia-basic-table-layout.table-v32 .impact-table-main-container": {
      margin: 0,
      padding: 0,
      "& .impact-table-main-header": {
        display: "none",
      },
    },
    "& .ag-root-wrapper": {
      position: "absolute",
      top: "140px",
      width: "100%",
      zIndex: 9,
      height: "46px",
      borderBottom: "1px solid #d9dde7 !important",
    },
  },
  totalRow: {
    fontWeight: "bold",
    '& [col-id="Selection"]': {
      visibility: "hidden",
    },

    '& [role="gridcell"]': {
      backgroundColor: "#F4F1F9 !important",
    },
    "& a": {
      color: "#181d1f",
    },
  },
  tableContainer: {
    // "& .ag-theme-alpine .ia-basic-table-layout .impact-table-main-header": {
    //   marginBottom: "-98px !important",
    // },
    "& .ag-body-viewport": {
      top: "43px",
      position: "relative",
    },
  },
  topFilters: {
    paddingBottom: "16px",
  },
}));
