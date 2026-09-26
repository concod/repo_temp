import { makeStyles } from "@mui/styles";
import { uniqBy, cloneDeep } from "lodash";
import InfoIcon from "@mui/icons-material/Info";
import { IconButton } from "@mui/material";
import EditHierarchyInfoPopover from "./EditHierarchyInfoPopover";
import {
  selectOmsBudgetConfig,
  isOmsBudgetInfoPopoverEnabled,
  resolveOmsBudgetInfoPopoverLabels,
} from "modules/oms/utils-oms/omsBudgetConfig.util.js";
import {
  addIdToAggridScrollElem,
  formatNumberThreeDecimal,
  getMatrixSummaryL0TotalRowNodeFromApi,
  updateAllForecastMultiplier,
} from "../utils-matrix-summary/utilityFunctions";
import { buildBudgetRequestPayload } from "../utils-matrix-summary/budgetPayloadUtils";
import { renderRoqStatusLegend } from "../utils";
import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import {
  errorHandler,
  infoHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import {
  getL1AfterL0update,
  hasIsLockedNested,
  manualCheckValid,
  manualTotalvalueChanged,
  distributeTotalUsingDistributionPct,
  NonActiveChangeFromParentToChild,
  onCellValueChange,
  onTotalChange,
} from "..";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import {
  setIsCellEdited,
  setIsButtonDisabled,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { createTableHeader } from "../../Product-Details-Screen/Style-Order-Summary/utils";
import { setSaveActionTime } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { renderRoqStatusCell } from "../utils";
import { MATRIX_SUMMARY_ROQ_STATUS_LEGEND } from "modules/oms/constants-oms/stringConstants";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
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
    getTopLeftOptions,
    selectedRoqDateTab,
    selectedEditMode,
    enableTopLevelEdit,
    selectedHierarchyL0ForBudget,
  } = props;

  const selectedRoqDateTabRef = useRef(selectedRoqDateTab);
  const selectedEditModeRef = useRef(selectedEditMode);

  useEffect(() => {
    selectedRoqDateTabRef.current = selectedRoqDateTab;
    selectedEditModeRef.current = selectedEditMode;
  }, [selectedRoqDateTab, selectedEditMode]);
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

  const [infoPopupAnchorEl, setInfoPopupAnchorEl] = useState(null);
  const [infoPopupData, setInfoPopupData] = useState(null);
  const openInfoPopup = (e, data) => {
    e.stopPropagation();
    e.preventDefault();
    setInfoPopupAnchorEl(e.currentTarget);
    setInfoPopupData(data ?? null);
  };
  const closeInfoPopup = () => {
    setInfoPopupAnchorEl(null);
    setInfoPopupData(null);
  };

  const loadUserTableInstance = (params) => {
    editHierarchyInstance.current = params;
  };
  const loadUserTotalRowInstance = (params) => {
    editHierarchyTotalRowInstance.current = params;

    addIdToAggridScrollElem("l0-table-total");
    addIdToAggridScrollElem("l0-table");
  };

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );
  const OmsReducer = useSelector(
    (store) => store?.omsReducer.orderManagementService
  );
  const omsBudgetConfig = useSelector(selectOmsBudgetConfig);
  const isBudgetInfoPopoverEnabled =
    isOmsBudgetInfoPopoverEnabled(omsBudgetConfig);
  const budgetInfoPopoverLabels =
    resolveOmsBudgetInfoPopoverLabels(omsBudgetConfig);

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

  const getRowStyle = (params) => {
    const currentRoqDateTab = selectedRoqDateTabRef.current;
    const currentEditMode = selectedEditModeRef.current;
    const isEditable =
      enableTopLevelEdit &&
      currentRoqDateTab === "roq_receipt_date" &&
      currentEditMode === "topline_edit";
    return {
      pointerEvents: isEditable ? "auto" : "none",
      background: "#F4F1F9",
    };
  };

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
    let totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      editHierarchyTotalRowInstance.current.api,
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
  };

  const onL0TotalChange = (_, row, column, isChanged) => {
    let colId = column.colId?.split(".")?.[0];

    let originalVal = row[colId].adjusted;
    const newValue = Number(originalVal);

    let totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      editHierarchyTotalRowInstance.current?.api,
      "Total"
    );

    if (originalVal === "" || Number(originalVal) < 0) {
      const oldValue =
        Number(totalRowNode?.data?.["last_updated_data"]?.[colId]) ||
        initialTotalRowData?.current?.[0][colId].adjusted;

      totalRowNode?.setDataValue(column.colId, oldValue);

      return;
    }
    if (!isChanged) return;

    // enable Save button when TOTAL row is edited - trigger change detection
    dispatch(setSaveActionTime(Date.now()));

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
          "Total",
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

    const currentRoqDateTab = selectedRoqDateTabRef.current;
    const currentEditMode = selectedEditModeRef.current;

    const shouldUseDistributionPct =
      enableTopLevelEdit &&
      currentRoqDateTab === "roq_receipt_date" &&
      currentEditMode === "topline_edit";

    if (shouldUseDistributionPct) {
      const distResult = distributeTotalUsingDistributionPct(
        editHierarchyInstance.current.api,
        row,
        column,
        editHierarchyTotalRowInstance.current?.api,
        newValue,
        "Total",
        dispatch,
        initialTotalRowData?.current
      );

      if (distResult?.code === "below_repository_sum") {
        totalRowNode?.setDataValue(column.colId, oldValue);
        errorHandler(
          dispatch,
          null,
          `Grand Total cannot be less than the sum of all Repository Order Cells (minimum ${distResult.repositorySum}).`
        );
        return;
      }

      if (distResult?.code === "no_recommended_cells") {
        totalRowNode?.setDataValue(column.colId, oldValue);
        errorHandler(
          dispatch,
          null,
          `Grand Total exceeds the sum of Repository Order Cells, but there are no editable Recommended cells to receive the remainder. Unlock or add recommended rows, or reduce the Grand Total.`
        );
        return;
      }

      if (!distResult?.success && distResult?.code === "fallback") {
        manualTotalvalueChanged(
          editHierarchyInstance.current.api,
          row,
          column,
          isChanged,
          editHierarchyTotalRowInstance.current?.api,
          newValue,
          "Total",
          dispatch,
          initialTotalRowData?.current
        );
      }
    } else {
      // Use existing distribution logic
      manualTotalvalueChanged(
        editHierarchyInstance.current.api,
        row,
        column,
        isChanged,
        editHierarchyTotalRowInstance.current?.api,
        newValue,
        "Total",
        dispatch,
        initialTotalRowData?.current
      );
    }

    if (totalRowNode?.data && totalRowNode.data[colId]) {
      totalRowNode.data[colId].isEdited = true;
      totalRowNode.data.isEdited = true;
      totalRowNode.data[colId].adjusted_manual = newValue;
      totalRowNode.setData(totalRowNode.data);

      editHierarchyTotalRowInstance.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }

    L1L2ChangeByL0Total(
      column,
      row,
      ref,
      currentHierarchyKey.current,
      dispatch
    );

    let totalNode = getMatrixSummaryL0TotalRowNodeFromApi(
      editHierarchyTotalRowInstance.current.api,
      "Total"
    );
    if (totalNode?.data?.[colId]) {
      totalNode.data.isEdited = true;
      totalNode.data[colId].isEdited = true;
    }

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
    const baseColumns = columnDataFormatted.map((elem) => ({
      ...elem,
      is_searchable: false,
      is_sortable: false,
    }));

    // budget InfoIcon to L0 total cells when in top line edit + receipt timeline
    const showL0TotalInfoIcon =
      isBudgetInfoPopoverEnabled &&
      enableTopLevelEdit &&
      selectedRoqDateTabRef.current === "roq_receipt_date" &&
      selectedEditModeRef.current === "topline_edit";

    if (!showL0TotalInfoIcon) return baseColumns;

    const addAdornmentToAdjusted = (child) => {
      const isOrderQtyColumn =
        child.column_name?.includes?.(".adjusted") ?? false;
      if (isOrderQtyColumn) {
        const originalCellRenderer = child.cellRenderer;
        return {
          ...child,
          cellRenderer: (params, extraProps) => {
            const cellValue =
              params.value ??
              params.data?.[child.column_name?.split(".")[0]]?.adjusted;
            const showIcon =
              cellValue != null && cellValue !== "" && cellValue !== undefined;
            if (!showIcon && originalCellRenderer) {
              return originalCellRenderer(params, extraProps);
            }
            const fiscalKey = child.column_name?.split(".")[0];
            const totalRowWeekData = params.data?.[fiscalKey];
            const budgetRequestPayload = buildBudgetRequestPayload("L0Total", {
              fiscalKey,
              isDataWeekLevel: matrixSummaryReducer?.displayDataToWeekLevel,
              highLevelSummaryState: OmsReducer?.highLevelSummaryState,
              roqDateOption: selectedRoqDateTabRef.current,
              selectedHierarchyL0: selectedHierarchyL0ForBudget,
              filters: OmsReducer?.selectedFilters,
            });
            const totalAdornment = (
              <IconButton
                size="small"
                onClick={(ev) =>
                  openInfoPopup(ev, {
                    cellData: totalRowWeekData,
                    budgetRequestPayload,
                  })
                }
                sx={{ p: 0 }}
              >
                <InfoIcon sx={{ fontSize: 18, color: "action.active" }} />
              </IconButton>
            );
            return (
              <CellRenderer
                cellData={params}
                column={child}
                extraProps={extraProps}
                actions={{}}
                customStartAdornment={totalAdornment}
              />
            );
          },
        };
      }
      return child;
    };

    const columnsWithIcon = baseColumns.map((col) => {
      const cloned = cloneDeep(col);
      if (cloned.children?.length) {
        cloned.children = cloned.children.map(addAdornmentToAdjusted);
      }
      if (cloned.sub_headers?.length) {
        cloned.sub_headers = cloned.sub_headers.map(addAdornmentToAdjusted);
      }
      return cloned;
    });

    return columnsWithIcon;
  }, [
    columnDefs,
    enableTopLevelEdit,
    isBudgetInfoPopoverEnabled,
    selectedRoqDateTab,
    selectedEditMode,
    matrixSummaryReducer?.displayDataToWeekLevel,
    OmsReducer?.highLevelSummaryState,
    matrixSummaryReducer,
  ]);

  // L0 table (detail rows): show Info icon on order qty cells when in line edit + receipt timeline
  const l0TableColumnDefs = useMemo(() => {
    const showL0TableInfoIcon =
      isBudgetInfoPopoverEnabled &&
      enableTopLevelEdit &&
      selectedRoqDateTabRef.current === "roq_receipt_date" &&
      selectedEditModeRef.current === "inline_edit";

    if (!showL0TableInfoIcon || !columnDefs?.length) return columnDefs;

    const addAdornmentToAdjusted = (child) => {
      const isOrderQtyColumn =
        child.column_name?.includes?.(".adjusted") ?? false;
      if (isOrderQtyColumn) {
        const originalCellRenderer = child.cellRenderer;
        return {
          ...child,
          cellRenderer: (params, extraProps) => {
            const fiscalKey = child.column_name?.split(".")[0];
            const cellData = params.data?.[fiscalKey];
            const hasRoqStatusDisplay =
              Array.isArray(MATRIX_SUMMARY_ROQ_STATUS_LEGEND) &&
              MATRIX_SUMMARY_ROQ_STATUS_LEGEND.some(
                (config) => config?.key && cellData?.[config.key]
              );
            if (hasRoqStatusDisplay && originalCellRenderer) {
              return originalCellRenderer(params, extraProps);
            }
            const cellValue = params.value ?? cellData?.adjusted;
            const showIcon =
              cellValue != null && cellValue !== "" && cellValue !== undefined;
            if (!showIcon && originalCellRenderer) {
              return originalCellRenderer(params, extraProps);
            }
            const weekData = params.data?.[fiscalKey];
            const budgetRequestPayload = buildBudgetRequestPayload("L0Table", {
              fiscalKey,
              isDataWeekLevel: matrixSummaryReducer?.displayDataToWeekLevel,
              rowData: params.data,
              roqDateOption: selectedRoqDateTabRef.current,
              selectedHierarchyL0: selectedHierarchyL0ForBudget,
              filters: OmsReducer?.selectedFilters,
            });
            const l0TableAdornment = (
              <IconButton
                size="small"
                onClick={(ev) =>
                  openInfoPopup(ev, {
                    cellData: weekData,
                    budgetRequestPayload,
                  })
                }
                sx={{ p: 0 }}
              >
                <InfoIcon sx={{ fontSize: 18, color: "action.active" }} />
              </IconButton>
            );
            return (
              <CellRenderer
                cellData={params}
                column={child}
                extraProps={extraProps}
                actions={{}}
                customStartAdornment={l0TableAdornment}
              />
            );
          },
        };
      }
      return child;
    };

    return columnDefs.map((col) => {
      const cloned = cloneDeep(col);
      if (cloned.children?.length) {
        cloned.children = cloned.children.map(addAdornmentToAdjusted);
      }
      if (cloned.sub_headers?.length) {
        cloned.sub_headers = cloned.sub_headers.map(addAdornmentToAdjusted);
      }
      return cloned;
    });
  }, [
    columnDefs,
    enableTopLevelEdit,
    isBudgetInfoPopoverEnabled,
    selectedRoqDateTab,
    selectedEditMode,
    matrixSummaryReducer?.displayDataToWeekLevel,
    matrixSummaryReducer,
  ]);

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
        {renderRoqStatusLegend()}

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
    <div
      className={`${classes.matrixSummaryWrapper} ${
        tableSettingOpen ? classes.tableSettingOpen : ""
      } matrix-summary-wrapper`}
    >
      <div className={classes.topFilters}>{getTopCenterOptions()}</div>

      {isBudgetInfoPopoverEnabled && (
        <EditHierarchyInfoPopover
          anchorEl={infoPopupAnchorEl}
          onClose={closeInfoPopup}
          data={infoPopupData}
          labels={budgetInfoPopoverLabels}
        />
      )}
      <div
        className={`${classes.total} ${classes.matrixSummaryTotalGrid} matrixSummary`}
      >
        <AgGridComponent
          hideTableFormat={true}
          tableId="l0-table-total"
          hideRangeFilter
          minWidth={200}
          loadTableInstance={loadUserTotalRowInstance}
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
          getRowStyle={getRowStyle}
          selectAllHeaderComponent={true}
          hideSelectAllRecords={true}
          hideFormatSideBar={true}
          customCellRenderer={(cellProps) => {
            if (cellProps.value === "Grand Total") {
              return (
                <p
                  style={{
                    position: "fixed",
                    left: "13px",
                    fontWeight: "bold",
                  }}
                >
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
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          onTableSettingClick={(params) => {
            setTableSettingOpen(params);
          }}
          key={activeKey}
          minWidth={200}
          columns={l0TableColumnDefs}
          topRightOptions={getTopRightOptions()}
          tableHeader={getTableHeader()}
          loadTableInstance={loadUserTableInstance}
          uniqueRowId="aggr_column"
          rowdata={editRowData}
          cacheBlockSize={10}
          tableRef={topGrid}
          detailRowAutoHeight={true}
          alignedGrids={bottomGrid.current ? [bottomGrid.current] : undefined}
          onBlur={onL0ValueChange}
          onSelectionChanged={onSelectionChanged}
          adjustTableHeightServerSide={true}
          customCellRenderer={(cellProps) => {
            if (cellProps?.value === null) {
              return <p style={{ textAlign: "right" }}>-</p>;
            }
            if (cellProps?.data) {
              return renderRoqStatusCell(cellProps);
            }
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
    "& .ag-selection-checkbox": {
      visibility: "hidden",
    },
    "& .ag-checkbox-input-wrapper": {
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
    "& .ag-pinned-left-cols-viewport": {
      height: "100% !important",
    },
    "& .ag-center-cols-viewport": {
      height: "100% !important",
    },
    "& .ag-body-viewport": {
      top: "43px",
      position: "relative",
      height: "365px !important",
      overflowY: "auto !important",
      paddingBottom: "56px",
      boxSizing: "border-box",
    },
    "& .ag-center-cols-container": {
      paddingBottom: 0,
      boxSizing: "border-box",
    },
    "& .ag-pinned-left-cols-container": {
      paddingBottom: 0,
      boxSizing: "border-box",
    },
  },
  topFilters: {
    paddingBottom: "16px",
  },
}));
