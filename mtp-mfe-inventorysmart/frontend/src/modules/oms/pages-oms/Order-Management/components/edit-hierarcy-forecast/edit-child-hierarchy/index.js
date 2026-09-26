import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "@mui/styles";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { isNumber, uniqBy, cloneDeep } from "lodash";
import InfoIcon from "@mui/icons-material/Info";
import { IconButton } from "@mui/material";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import {
  errorHandler,
  infoHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import globalStyles from "core/Styles/globalStyles";

import {
  distributeTotalUsingDistributionPct,
  getL1AfterL0L2lock,
  getL1AfterL0update,
  getOldValue,
  hasIsLockedNested,
  manualCheckValid,
  manualTotalvalueChanged,
  NonActiveChangeFromParentToChild,
  onCellValueChange,
  onTotalChange,
  reAdjustHierarchyInstance,
} from "..";
import "./style.scss";
import EditGrandChildHierarcyWrapper from "../edit-grand-child-hierarchy/editGrandChildHierarchyWrapper";
import { InActiveL1ChangeByL0 } from "../edit-hierarchy";
import {
  addIdToAggridScrollElem,
  formatNumberThreeDecimal,
  getMatrixSummaryL0TotalRowNodeFromApi,
  updateForecastMultiplier,
} from "../utils-matrix-summary/utilityFunctions";
import EditHierarchyInfoPopover from "../edit-hierarchy/EditHierarchyInfoPopover";
import { renderRoqStatusLegend } from "../utils";
import { buildBudgetRequestPayload } from "../utils-matrix-summary/budgetPayloadUtils";
import {
  selectOmsBudgetConfig,
  isOmsBudgetInfoPopoverEnabled,
  resolveOmsBudgetInfoPopoverLabels,
} from "modules/oms/utils-oms/omsBudgetConfig.util.js";
import {
  setIsCellEdited,
  setIsButtonDisabled,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { createTableHeader } from "../../Product-Details-Screen/Style-Order-Summary/utils";
import { setSaveActionTime } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";

const EditChildHierarcy = forwardRef((props, ref) => {
  let {
    lastEditedDriversRef,
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    forecastMultiplierInstance,
    editHierarchyChildInstance,
    editHierarchyGrandChildInstance,
    editHierarchyChildTotalRowInstance,
    initialEditChildRowData,
    allEditedGrandChildRowData,
    initialEditRowData,
    initialTotalRowData,
    editChildRowData,
    currentHierarchyKey,
    allEditedChildRowData,
    allEditedGrandChildRowMapping,
    SkuName,
    isCompareChanges,
    disableAllowEditOnSaveRef,
    disabledTotalColumns,
  } = ref;
  const {
    id,
    activeL1,
    allowEdit,
    showIAData,
    columnDefs,
    editRowData,
    setActiveL1,
    totalRowData,
    onL2ValueChange,
    lastEditedDrivers,
    onTotalValueChange,
    historicColumnData,
    onCategoryValueChange,
    activeChildHierarchyKey,
    setCounterOnEditHierarchyChange,
    isCalledFromMFPDashboard,
    selectedRowsFromMFP,
    disableAllowEditOnSave,
    activeChildHierarchyDescription,
    getTopRightOptions,
    selectedToggleOption,
    shouldDisableL1Cells,
    isSizeView = false,
    selectedHierarchyL0ForBudget,
  } = props;

  const dispatch = useDispatch();
  const [renderKey, setRenderKey] = useState(0);
  const [tableSettingOpen, setTableSettingOpen] = useState(false);

  // detail cell renderer doesn't support state on the fly, hence copying
  //  driverForecastVal in driverForecastValRef && driverForecastAllVal in driverForecastAllValRef
  // let lastEditedDriversRef = useRef(null);

  let topGrid = useRef(null);
  let bottomGrid = useRef(null);
  let totalRowGrid = useRef(null);

  const classes = useStyles();
  const globalClasses = globalStyles();

  const [infoPopupAnchorEl, setInfoPopupAnchorEl] = useState(null);
  const [infoPopupData, setInfoPopupData] = useState(null);
  const openInfoPopup = (e, data) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setInfoPopupAnchorEl(e?.currentTarget ?? null);
    setInfoPopupData(data ?? null);
  };
  const closeInfoPopup = () => {
    setInfoPopupAnchorEl(null);
    setInfoPopupData(null);
  };

  const loadUserTableInstance = (params) => {
    editHierarchyChildInstance.current = params;
  };

  const loadUserTotalRowInstance = (params) => {
    editHierarchyChildTotalRowInstance.current = params;

    addIdToAggridScrollElem("l1-table-total");
    addIdToAggridScrollElem("l1-table");
  };

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );
  const OmsReducer = useSelector(
    (store) => store?.omsReducer.orderManagementService
  );
  const orderingScreensConfig = useSelector(
    (store) => store?.omsReducer?.orderingCommonService?.orderingScreensConfig
  );
  const omsBudgetConfig = useSelector(selectOmsBudgetConfig);
  const isBudgetInfoPopoverEnabled =
    isOmsBudgetInfoPopoverEnabled(omsBudgetConfig);
  const budgetInfoPopoverLabels =
    resolveOmsBudgetInfoPopoverLabels(omsBudgetConfig);

  const ENABLE_TOP_LEVEL_EDIT =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.enableTopLevelEdit ||
    false;
  const selectedRoqDateTab =
    OmsReducer?.highLevelSummaryState?.selectedRoqDateTab ||
    "roq_placement_date";
  const selectedEditMode =
    OmsReducer?.highLevelSummaryState?.selectedEditMode || "topline_edit";
  const selectedEditModeRef = useRef(selectedEditMode);
  const selectedRoqDateTabRef = useRef(selectedRoqDateTab);

  useEffect(() => {
    selectedEditModeRef.current = selectedEditMode;
  }, [selectedEditMode]);
  useEffect(() => {
    selectedRoqDateTabRef.current = selectedRoqDateTab;
  }, [selectedRoqDateTab]);

  const enableCommaFormatting =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.numberFormatting?.enableCommaFormatting === true;

  const editHierarchyForecastTableRoundOff =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.EditHierarchyForecast;

  const l1DisplayName =
    matrixSummaryReducer?.getTableName?.attribute_value?.l0 || "Style";
  const productDescriptionName =
    matrixSummaryReducer?.getTableName?.attribute_value?.descriptionName;

  const selectedToggleOptionRef = useRef(selectedToggleOption);

  useEffect(() => {
    selectedToggleOptionRef.current = selectedToggleOption;
  }, [selectedToggleOption]);

  const detailCellRenderer = useMemo(() => {
    // setRenderKey((prevKey) => prevKey + 1);
    return (params) => (
      <EditGrandChildHierarcyWrapper
        id={id}
        node={params.node}
        onCategoryValueChange={onCategoryValueChange}
        allowEdit={allowEdit}
        showIAData={showIAData}
        ref={{
          topGrid,
          bottomGrid,
          totalRowGrid,
          editHierarchyInstance,
          editHierarchyTotalRowInstance,
          forecastMultiplierInstance,
          editHierarchyChildInstance,
          editHierarchyGrandChildInstance,
          editHierarchyChildTotalRowInstance,
          initialEditChildRowData,
          allEditedGrandChildRowData,
          initialEditRowData,
          initialTotalRowData,
          editChildRowData,
          currentHierarchyKey,
          allEditedChildRowData,
          allEditedGrandChildRowMapping,
          // driverForecastValRef,
          // driverForecastAllValRef,
          // parent state changes are not captured in detailCellRenderer(as AG Grid works by Instance & not state),
          //  hence copied state data in ref & passing that
          lastEditedDriversRef,
          SkuName,
          isCompareChanges,
          disableAllowEditOnSaveRef,
          selectedToggleOptionRef,
        }}
        lastEditedDrivers={lastEditedDrivers}
        activeL1={activeL1}
        setActiveL1={setActiveL1}
        onTotalValueChange={onTotalValueChange}
        setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
        onL2ValueChange={onL2ValueChange}
        activeChildHierarchyKey={activeChildHierarchyKey}
        isCalledFromMFPDashboard={isCalledFromMFPDashboard}
        selectedRowsFromMFP={selectedRowsFromMFP}
        disableAllowEditOnSave={disableAllowEditOnSave}
        selectedToggleOption={selectedToggleOption}
      />
    );
  }, [selectedToggleOption]);

  const rowClassRules = useMemo(() => {
    return {
      [classes.totalRowChild]: (params) => params.rowIndex === 0,
    };
  }, [classes.totalRowChild]);

  const onL1ValueChange = (
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
    let currHierarchyNode = editHierarchyChildInstance.current.api.getRowNode(
      row.row
    );

    if (originalVal === "" || Number(originalVal) < 0) {
      editHierarchyChildInstance?.current?.api?.forEachNode((node) => {});

      let initialRowData = initialEditChildRowData.current[
        activeChildHierarchyKey
      ]?.find((elem) => elem?.row === row.row);

      const oldValue =
        currHierarchyNode?.data?.["last_updated_data"]?.[colId] ||
        initialRowData?.[colId].adjusted;
      currHierarchyNode.setDataValue(column.colId, oldValue);
      return;
    }

    // checking if this change will be valid for all L2's

    let currExpandedNode = null;
    editHierarchyChildInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) {
        currExpandedNode = node;
      }
    });
    let activeChildHierarchyKeyLocked = false;

    editHierarchyInstance.current.api.forEachNode((node) => {
      if (node.data.row == activeChildHierarchyKey) {
        if (node?.data?.[colId]?.isLocked) {
          activeChildHierarchyKeyLocked = true;
        }
      }
    });

    if (currExpandedNode && currExpandedNode?.data?.row === row.row) {
      let isNotValidForL2 = manualCheckValid(
        editHierarchyGrandChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch
      );

      if (isNotValidForL2) {
        editHierarchyChildInstance?.current?.api?.forEachNode((node) => {});

        let initialRowData = initialEditChildRowData.current[
          activeChildHierarchyKey
        ]?.find((elem) => elem?.row === row.row);

        const oldValue =
          currHierarchyNode?.data?.["last_updated_data"]?.[colId] ||
          initialRowData?.[0]?.[colId].adjusted;

        currHierarchyNode.setDataValue(column.colId, oldValue);
        return;
      }
    }

    // to calculate final ratio, it's important to track what user entered in the particular cell
    // as a cell's value keeps on updating by their respective parent/child

    currHierarchyNode.data[colId].adjusted_manual = newValue;

    let activeL0Node = {};

    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey === node.data.row) {
        activeL0Node = node;
      }
    });

    let nonLockedCount = 0;

    editHierarchyInstance?.current?.api.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked || row.row === node.data.row) {
        // sum += val;
      } else {
        nonLockedCount += 1;
      }
    });

    let totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      editHierarchyTotalRowInstance?.current?.api,
      "Total"
    );

    let oldValue = getOldValue(
      initialVal,
      colId,
      row,
      initialEditChildRowData?.current[activeChildHierarchyKey]
    );
    // If L1 value is greater than L0 Total return
    // If L1 total i.e. L0 after adding all L1's is more than Locked L0 total return
    let isInValidValue = false;
    if (totalRowNode?.data?.[colId]?.isLocked && !isCalledFromMFPDashboard) {
      if (+row[colId].adjusted > totalRowNode.data[colId].adjusted) {
        infoHandler(
          dispatch,
          `Value for current row - ${colId}  has been reset as entered value is more than L0 total`
        );

        isInValidValue = true;
      }

      let L1TotalSum = 0;
      editHierarchyChildInstance.current.api.forEachNode((node) => {
        L1TotalSum += Number(node.data[colId]?.adjusted) || 0;
      });

      if (!isInValidValue && L1TotalSum > totalRowNode.data[colId].adjusted) {
        infoHandler(
          dispatch,
          `Value for current row - ${colId}  has been reset as L1 total is more than L0 total`
        );
        isInValidValue = true;
      }

      if (isInValidValue) {
        let currHierarchyNode = editHierarchyChildInstance.current.api.getRowNode(
          row.row
        );

        currHierarchyNode.setDataValue(column.colId, oldValue);
        return;
      }
    }
    // if L0 total is locked and l0 sku's are locked except 1 sku then when user change the value in that one non locked sku child (l1) we will giving warning
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
    //updating non active L2
    if (allEditedGrandChildRowData?.current?.[row.row]) {
      let isInvalidL1Total = NonActiveChangeFromParentToChild(
        allEditedGrandChildRowData?.current?.[row.row],
        row,
        column,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled,
        true,
        dispatch
      );
      if (isInvalidL1Total) {
        let currHierarchyNode = editHierarchyChildInstance.current.api.getRowNode(
          row.row
        );
        let oldValue = getOldValue(initialVal, colId, row, initialEditRowData);
        currHierarchyNode.setDataValue(column.colId, oldValue);
        return;
      }
    }

    // To check intemediate L1 value is valid after locking L0 & L2 of sibling L1
    // eg. if two sku are there i.e. s1 & s2 & s1 has store st11, after locking st11 & sku total,

    let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
      "total"
    );
    if (
      currExpandedNode &&
      currentChildTotalNode?.data?.[colId]?.isLocked &&
      currExpandedNode?.data?.row !== row.row
    ) {
      let L2LockedSum = 0;
      editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          L2LockedSum += Number(node.data[colId]?.adjusted || 0);
        }
      });
      if (L2LockedSum) {
        let expandedRowL1Value = getL1AfterL0L2lock(
          row,
          column,
          editHierarchyChildInstance.current.api,

          editHierarchyChildTotalRowInstance.current.api,

          "total",
          currExpandedNode?.data?.row
        );
        if (expandedRowL1Value !== null && L2LockedSum > expandedRowL1Value) {
          currHierarchyNode?.setDataValue(column.colId, oldValue);

          infoHandler(
            dispatch,
            `Value for ${
              row.row
            } - ${colId}  has been reset as changing L1 value to ${newValue} is making L1 ${
              currExpandedNode?.data?.row
            } to ${formatNumberThreeDecimal(
              expandedRowL1Value
            )} which is less than locked sum of all L2 inside it i.e. ${formatNumberThreeDecimal(
              L2LockedSum
            )}`
          );
          return;
        }
      }
    }

    // If the newly updated L1 is collapsed and L2 in other L1 siblings are Locked and collapsed
    if (
      currentChildTotalNode?.data?.[colId]?.isLocked &&
      currExpandedNode?.data?.row !== row.row
    ) {
      let L2LockedSum = 0;
      for (let rowKey in allEditedGrandChildRowData?.current) {
        allEditedGrandChildRowData?.current?.[rowKey]?.forEach((node) => {
          if (node?.[colId]?.isLocked) {
            L2LockedSum += Number(node[colId]?.adjusted || 0);
          }
        });
      }

      if (L2LockedSum) {
        currHierarchyNode?.setDataValue(column.colId, oldValue);
        infoHandler(
          dispatch,
          `Value for ${row.row} - ${colId}  has been reset because there are some locked L2 in other L1(s)`
        );
        return;
      }
    }

    let isL0Invalid = hasIsLockedNested(allEditedChildRowData?.current, colId);

    if (
      isL0Invalid &&
      !activeChildHierarchyKeyLocked &&
      totalRowNode?.data[colId]?.isLocked
    ) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as one of the collapsed L1 has locked L2 value`
      );

      let currHierarchyNode = editHierarchyChildInstance.current.api.getRowNode(
        row.row
      );
      let oldValue = getOldValue(initialVal, colId, row, initialEditRowData);
      currHierarchyNode.setDataValue(column.colId, oldValue);
      return;
    }

    // on parent lock and any other L2 lock except active L1 keys
    if (
      activeL0Node.data[colId]?.isLocked &&
      allEditedGrandChildRowData?.current
    ) {
      let isInvalidL1Total = hasIsLockedNested(
        allEditedGrandChildRowData?.current,
        colId
      );
      if (isInvalidL1Total) {
        infoHandler(
          dispatch,
          `Value for current row - ${colId}  has been reset as one of the collapsed L1 has locked L2 value`
        );
        let currHierarchyNode = editHierarchyChildInstance.current.api.getRowNode(
          row.row
        );
        let oldValue = getOldValue(initialVal, colId, row, initialEditRowData);
        currHierarchyNode.setDataValue(column.colId, oldValue);
        return;
      }
    }

    dispatch(setIsCellEdited(true));

    // Self computation
    onCellValueChange(
      row,
      column,
      isChanged,
      editHierarchyChildInstance.current.api,
      editHierarchyChildTotalRowInstance.current.api,
      initialEditChildRowData?.current?.[activeChildHierarchyKey],
      "total",
      false,
      dispatch,
      initialVal,
      activeL0Node,
      matrixSummaryReducer?.clientConfig?.attribute_value?.user_profile_enabled,
      newValue,
      totalRowNode.data[colId]
    );

    let lastUpdatedActiveL0OldValue =
      activeL0Node.data?.["last_updated_data"]?.[colId];
    let activeL0OldValue = isNumber(lastUpdatedActiveL0OldValue)
      ? lastUpdatedActiveL0OldValue
      : activeL0Node.data?.[colId]?.adjusted;
    // Do L0 computation
    L0ChangeByL1(
      column,
      activeChildHierarchyKey,
      ref,
      false,
      row,
      dispatch,
      activeL0OldValue
    );

    // parentUpdateByChild(column, activeChildHierarchyKey, row, dispatch, ref);

    // Do L2 computation
    let expandedNode = null;
    editHierarchyChildInstance.current.api.forEachNode((node) => {
      if (node.expanded) {
        expandedNode = node;
      }
    });

    if (expandedNode && expandedNode?.data?.row === row.row) {
      onTotalChange(
        editHierarchyGrandChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        false,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled,
        initialVal,
        editHierarchyChildInstance.current.api
      );
    }

    // update sibling L1 when L1 total is locked
    if (
      currentChildTotalNode?.data?.[colId]?.isLocked &&
      expandedNode &&
      expandedNode?.data?.row !== row.row
    ) {
      onTotalChange(
        editHierarchyGrandChildInstance.current.api,
        currExpandedNode?.data,
        column,
        isChanged,
        dispatch,
        null,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled,
        currExpandedNode?.data[colId].adjusted,
        editHierarchyChildInstance.current.api
      );
    }

    // updating non active L2
    for (let rowKey in allEditedGrandChildRowData?.current) {
      if (rowKey === expandedNode) continue;

      let nonActiveHierachyChild = editHierarchyChildInstance.current.api?.getRowNode(
        rowKey
      );

      NonActiveChangeFromParentToChild(
        allEditedGrandChildRowData?.current?.[rowKey],
        nonActiveHierachyChild.data,
        column,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled
      );
    }

    updateForecastMultiplier(
      editHierarchyTotalRowInstance,
      column,
      id,
      dispatch
    );
  };

  const onL1TotalChange = (
    _,
    row,
    column,
    isChanged,
    __,
    initialVal // old Value
  ) => {
    let colId = column.colId?.split(".")?.[0];

    let originalVal = row[colId].adjusted;
    const newValue = Number(originalVal);

    let activeL0Node = {};
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey === node.data.row) {
        activeL0Node = node;
      }
    });

    if (originalVal === "" || Number(originalVal) < 0) {
      let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );
      let L0ActiveValue = activeL0Node.data[colId]?.adjusted || 0;
      currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);
      return;
    }

    if (!isChanged) return;
    setCounterOnEditHierarchyChange((prev) => (prev += 1));

    let totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      editHierarchyTotalRowInstance?.current?.api,
      "total"
    );

    // Move to parent on refactor

    var oldValue = getOldValue(
      initialVal,
      colId,
      row,
      initialEditRowData.current
    );

    let activeChildHierarchyKeyLocked = false;

    editHierarchyInstance.current.api.forEachNode((node) => {
      if (node.data.row == activeChildHierarchyKey) {
        if (node?.data?.[colId]?.isLocked) {
          activeChildHierarchyKeyLocked = true;
        }
      }
    });

    let isInvalid = hasIsLockedNested(allEditedChildRowData?.current, colId);

    if (
      isInvalid &&
      !activeChildHierarchyKeyLocked &&
      totalRowNode?.data[colId]?.isLocked
    ) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as one of the collapsed L1 has locked L2 value`
      );
      let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );
      currentChildTotalNode.setDataValue(column.colId, oldValue);

      return;
    }

    let lockedSum = 0;
    editHierarchyInstance.current.api.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        let val = Number(node.data[colId]?.adjusted || 0);
        lockedSum += val;
      }
    });

    // if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
    //   infoHandler(
    //     dispatch,
    //     `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
    //   );
    //   let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
    //     "total"
    //   );
    //   currentChildTotalNode.setDataValue(column.colId, oldValue);
    //   return;
    // }

    // checking if this change will be valid for all L1's
    if (editHierarchyChildInstance?.current?.api) {
      let isNotValidForL1 = manualCheckValid(
        editHierarchyChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled
      );
      let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );
      let L0ActiveValue = activeL0Node.data[colId]?.adjusted;

      if (isNotValidForL1) {
        currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);
        return;
      }

      let expandedNode = null;
      editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
        if (node.expanded) {
          expandedNode = node;
        }
      });

      let L1ValueafterL0Update = getL1AfterL0update(
        editHierarchyChildInstance.current.api,
        row,
        column,
        isChanged,
        dispatch,
        true
      );
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
          currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);

          infoHandler(
            dispatch,
            `Value for ${
              row.row
            } - ${colId}  has been reset as changing L0 value to ${newValue} is making L1 ${
              expandedNode?.data?.row
            } to ${formatNumberThreeDecimal(
              updatedL1Value
            )} which is less than locked sum of all L2 inside it i.e. ${formatNumberThreeDecimal(
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
          currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);

          infoHandler(
            dispatch,
            `Value for ${
              row.row
            } - ${colId}  has been reset as changing L0 value to ${newValue} is making L1 ${l1Key} to ${formatNumberThreeDecimal(
              updatedL1Value
            )} which is less than locked sum of all L2 inside it i.e. ${formatNumberThreeDecimal(
              L2LockedSum
            )}`
          );
          return;
        }
      }
    }

    // check if L1 Total change is valid for L0

    const l0WeekAdjustedBeforeChildTotalEdit =
      activeL0Node?.data?.[colId]?.adjusted;

    activeL0Node.setDataValue(column.colId, newValue);

    onCellValueChange(
      activeL0Node?.data,
      column,
      isChanged,
      editHierarchyInstance.current.api,
      editHierarchyTotalRowInstance.current.api,
      initialEditRowData.current,
      "total",
      false,
      dispatch,
      initialVal,
      null,
      matrixSummaryReducer?.clientConfig?.attribute_value?.user_profile_enabled
    );
    let L0ActiveValue = activeL0Node.data[colId]?.adjusted;
    if (L0ActiveValue !== newValue) {
      let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );

      currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);
      return;
    }

    const shouldUseDistributionPct =
      enableTopLevelEdit &&
      selectedRoqDateTab === "roq_receipt_date" &&
      selectedEditMode === "topline_edit";

    if (shouldUseDistributionPct) {
      const distResult = distributeTotalUsingDistributionPct(
        editHierarchyChildInstance.current.api,
        row,
        column,
        editHierarchyChildTotalRowInstance.current.api,
        newValue,
        "total",
        dispatch,
        null
      );
      if (distResult?.code === "below_repository_sum") {
        activeL0Node.setDataValue(
          column.colId,
          l0WeekAdjustedBeforeChildTotalEdit
        );
        const currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
          "total"
        );
        currentChildTotalNode.setDataValue(column.colId, oldValue);
        errorHandler(
          dispatch,
          null,
          `Grand Total cannot be less than the sum of all Repository Order Cells (minimum ${distResult.repositorySum}).`
        );
        return;
      }
      if (distResult?.code === "no_recommended_cells") {
        activeL0Node.setDataValue(
          column.colId,
          l0WeekAdjustedBeforeChildTotalEdit
        );
        const currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
          "total"
        );
        currentChildTotalNode.setDataValue(column.colId, oldValue);
        errorHandler(
          dispatch,
          null,
          `Grand Total exceeds the sum of Repository Order Cells, but there are no editable Recommended cells to receive the remainder. Unlock or add recommended rows, or reduce the Grand Total.`
        );
        return;
      }
      if (!distResult?.success && distResult?.code === "fallback") {
        manualTotalvalueChanged(
          editHierarchyChildInstance.current.api,
          row,
          column,
          isChanged,
          editHierarchyInstance.current.api,
          newValue,
          activeChildHierarchyKey,
          dispatch,
          null,
          null,
          matrixSummaryReducer?.clientConfig?.attribute_value
            ?.user_profile_enabled
        );
      }
    } else {
      manualTotalvalueChanged(
        editHierarchyChildInstance.current.api,
        row,
        column,
        isChanged,
        editHierarchyInstance.current.api,
        newValue,
        activeChildHierarchyKey,
        dispatch,
        null,
        null,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled
      );
    }

    // Do L0 computation
    L0ChangeByL1(column, activeChildHierarchyKey, ref, true, row, dispatch);

    // Do L2 computation
    let expandedNode = null;
    editHierarchyChildInstance.current.api?.forEachNode((node) => {
      if (node.expanded) {
        expandedNode = node;
      }
    });
    if (expandedNode && !expandedNode?.data?.[colId]?.isLocked) {
      onTotalChange(
        editHierarchyGrandChildInstance.current.api,
        expandedNode.data,
        column,
        isChanged,
        dispatch,
        false,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled,
        initialVal,
        editHierarchyChildInstance.current.api
      );
    }

    // updating non active L2
    for (let rowKey in allEditedGrandChildRowData?.current) {
      if (rowKey === expandedNode) continue;

      let nonActiveHierachyChild = editHierarchyChildInstance.current.api?.getRowNode(
        rowKey
      );

      NonActiveChangeFromParentToChild(
        allEditedGrandChildRowData?.current?.[rowKey],
        nonActiveHierachyChild.data,
        column,
        matrixSummaryReducer?.clientConfig?.attribute_value
          ?.user_profile_enabled
      );
    }

    editHierarchyGrandChildInstance?.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });

    updateForecastMultiplier(
      editHierarchyTotalRowInstance,
      column,
      id,
      dispatch
    );
  };

  const columnDataHandler = () => {
    let allColumns = [
      columnDefs[0],
      ...historicColumnData,
      ...columnDefs.slice(1),
    ]?.filter((el) => el && el.column_name);
    if (allColumns[0]?.type === "int") {
      allColumns[0].type = "link";
    }

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

  const totalColumnDataHandler = () => {
    let columnDataFormatted = columnDataHandler() || [];
    return columnDataFormatted.map((elem) => ({
      ...elem,
      is_searchable: false,
      is_sortable: false,
    }));
  };

  // L1 table & total: show Info icon on order qty cells when in line edit + receipt timeline (same as L0). Skip in Size view.
  const showL1InfoIcon =
    isBudgetInfoPopoverEnabled &&
    ENABLE_TOP_LEVEL_EDIT &&
    selectedRoqDateTabRef.current === "roq_receipt_date" &&
    selectedEditModeRef.current === "inline_edit";

  const applyInfoIconToColumns = (baseColumns) => {
    if (!showL1InfoIcon || isSizeView || !baseColumns?.length)
      return baseColumns;
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
            const isGreyOut = cellData?.isGreyOut === true;
            if (isGreyOut && originalCellRenderer) {
              return originalCellRenderer(params, extraProps);
            }
            const cellValue = params.value ?? cellData?.adjusted;
            const showIcon =
              cellValue != null && cellValue !== "" && cellValue !== undefined;
            if (!showIcon && originalCellRenderer) {
              return originalCellRenderer(params, extraProps);
            }
            const weekData = params.data?.[fiscalKey];
            const budgetRequestPayload = buildBudgetRequestPayload("L1", {
              fiscalKey,
              isDataWeekLevel: matrixSummaryReducer?.displayDataToWeekLevel,
              rowData: params.data,
              activeChildHierarchyKey,
              roqDateOption: selectedRoqDateTab,
              selectedHierarchyL0: selectedHierarchyL0ForBudget,
              filters: OmsReducer?.selectedFilters,
            });
            const infoIconAdornment = (
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
                customStartAdornment={infoIconAdornment}
              />
            );
          },
        };
      }
      return child;
    };
    return baseColumns.map((col) => {
      const cloned = cloneDeep(col);
      if (cloned.children?.length) {
        cloned.children = cloned.children.map(addAdornmentToAdjusted);
      }
      if (cloned.sub_headers?.length) {
        cloned.sub_headers = cloned.sub_headers.map(addAdornmentToAdjusted);
      }
      return cloned;
    });
  };

  const l1TableColumns = useMemo(
    () => applyInfoIconToColumns(columnDataHandler() || []),
    [
      columnDefs,
      historicColumnData,
      ENABLE_TOP_LEVEL_EDIT,
      isBudgetInfoPopoverEnabled,
      selectedRoqDateTab,
      selectedEditMode,
      isSizeView,
      activeChildHierarchyKey,
      matrixSummaryReducer?.displayDataToWeekLevel,
      matrixSummaryReducer,
    ]
  );

  const handleTotalRowAlignGrids = () => {
    if (topGrid.current && bottomGrid.current) {
      return [topGrid.current, bottomGrid.current];
    }

    if (bottomGrid.current) {
      return [bottomGrid.current];
    }
    if (topGrid.current) {
      return [topGrid.current];
    }
  };

  const handleEditRowAlignGrids = () => {
    if (topGrid.current && totalRowGrid.current) {
      return [topGrid.current, totalRowGrid.current];
    }

    if (totalRowGrid.current) {
      return [totalRowGrid.current];
    }
    if (topGrid.current) {
      return [topGrid.current];
    }
  };

  useEffect(() => {
    let cols = editHierarchyGrandChildInstance?.current?.api?.getColumnDefs();

    cols?.forEach((elem, i) => {
      elem.cellStyle = {
        ...elem.cellStyle,
        pointerEvents: disableAllowEditOnSave ? "none" : "all",
      };
    });

    if (cols) {
      editHierarchyGrandChildInstance.current.api.setColumnDefs(cols);

      editHierarchyGrandChildInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  }, [
    disableAllowEditOnSave,
    editHierarchyGrandChildInstance?.current?.api?.getColumnDefs()?.length,
  ]);

  const getTopLeftOptions = () => {
    const options = [];
    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {createTableHeader(l1DisplayName, activeChildHierarchyKey)}
        {productDescriptionName &&
          createTableHeader(
            productDescriptionName,
            activeChildHierarchyDescription
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
      </div>
    );

    return options;
  };

  return (
    <div className={`${tableSettingOpen ? classes.tableSettingOpen : ""}`}>
      {isBudgetInfoPopoverEnabled && (
        <EditHierarchyInfoPopover
          anchorEl={infoPopupAnchorEl}
          onClose={closeInfoPopup}
          data={infoPopupData}
          labels={budgetInfoPopoverLabels}
        />
      )}
      <div
        className={`${classes.total} ${classes.matrixSummaryTotalGrid} child-matrix-summary`}
      >
        <AgGridComponent
          hideTableFormat={true}
          tableId="l1-table-total"
          // closeButton={true}
          // handleCloseButtonClick={props?.handleCloseButtonClick}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          hideRangeFilter
          minWidth={200}
          loadTableInstance={loadUserTotalRowInstance}
          columns={totalColumnDataHandler()}
          uniqueRowId="row"
          cacheBlockSize={0}
          tableRef={totalRowGrid}
          alignedGrids={handleTotalRowAlignGrids()}
          rowdata={totalRowData}
          headerHeight="0"
          pagination={false}
          rowClassRules={rowClassRules}
          onBlur={onL1TotalChange}
          getRowStyle={(params) => {
            return {
              pointerEvents: "none",
              backgroundColor: "#F4F1F9",
            };
          }}
          customCellRenderer={(cellProps) => {
            if (cellProps?.value === null) {
              return <p style={{ textAlign: "right" }}>-</p>;
            }
          }}
          // tableHeader={getTopLeftOptions()}
          // topRightOptions={getTopRightOptions()}
          suppressContextMenu={true}
          hideTableSetting
        />
      </div>
      <div
        className={`${classes.tableContainer} child-table-container`}
        key={renderKey}
      >
        <AgGridComponent
          tableId="l1-table"
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          closeButton={true}
          handleCloseButtonClick={props?.handleCloseButtonClick}
          minWidth={200}
          customClass="custom-edit-forecast-aggrid"
          rowdata={editRowData}
          columns={l1TableColumns}
          masterDetail={true}
          tableRef={bottomGrid}
          alignedGrids={handleEditRowAlignGrids()}
          detailCellRenderer={detailCellRenderer}
          onTableSettingClick={(params) => {
            setTableSettingOpen(params);
          }}
          uniqueRowId="row"
          cacheBlockSize={10}
          loadTableInstance={loadUserTableInstance}
          detailRowAutoHeight={true}
          onBlur={onL1ValueChange}
          agGridPagination={true}
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
          tableHeader={getTopLeftOptions()}
          topRightOptions={getTopRightOptions()}
          bottomLeftOptions={getBottomLeftOptions()}
          topCenterOptions={props.getTopCenterOptions()}
        />
      </div>
    </div>
  );
});

export default EditChildHierarcy;

const L0ChangeByL1 = (
  column,
  activeChildHierarchyKey,
  ref,
  isTotalChange,
  row,
  dispatch,
  prevOldValue
) => {
  let {
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    editHierarchyChildTotalRowInstance,
    initialEditRowData,
  } = ref;
  let colId = column.colId?.split(".")?.[0];

  let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
    "total"
  );

  if (currentChildTotalNode?.data?.[colId]?.isLocked) {
    return;
  }

  let currentChildTotalValue = Number(
    currentChildTotalNode.data[colId].adjusted
  );

  let activeHierarchyTotalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
    editHierarchyTotalRowInstance?.current?.api,
    "Total"
  );

  let totalRowNode = activeHierarchyTotalRowNode;

  if (totalRowNode?.data?.[colId]?.isLocked) {
    let activeL0Node = {};
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey === node.data.row) {
        activeL0Node = node;
      }
    });
    activeL0Node.setDataValue(column.colId, currentChildTotalValue);

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

  let totalSum = 0;
  editHierarchyInstance.current.api.forEachNode((node) => {
    if (activeChildHierarchyKey === node.data.row) {
      totalSum += currentChildTotalValue;
      node.setDataValue(column.colId, currentChildTotalValue);
      let prevLastUpdatedData = node.data?.last_updated_data || {};
      node.data.last_updated_data = {
        ...prevLastUpdatedData,
        [column.colId?.split(".")?.[0]]: totalSum,
      };
      // Marking node data as edited, if change is there in the total node
      if (isTotalChange) {
        node.data.isEdited = true;
        node.data[column.colId?.split(".")?.[0]].isEdited = true;
      }
    } else {
      totalSum += Number(
        node.data[column.colId?.split(".")?.[0]]?.adjusted || 0
      );
    }
  });

  if (
    !activeHierarchyTotalRowNode?.data?.[column.colId?.split(".")?.[0]]
      ?.isLocked
  ) {
    activeHierarchyTotalRowNode.setDataValue(column.colId, totalSum);

    // updating last edited
    let newData = activeHierarchyTotalRowNode.data;
    let prevLastUpdatedData =
      activeHierarchyTotalRowNode.data?.last_updated_data || {};
    newData.last_updated_data = {
      ...prevLastUpdatedData,
      [column.colId?.split(".")?.[0]]: totalSum,
    };

    activeHierarchyTotalRowNode.setData(newData);
  } else {
    const newValue = currentChildTotalValue;

    let oldValueNode = editHierarchyInstance.current.api.getRowNode(
      activeChildHierarchyKey
    );

    const oldValue =
      Number(
        oldValueNode.data["last_updated_data"]?.[column.colId?.split(".")?.[0]]
      ) ||
      initialEditRowData?.current?.find(
        (el) => el?.row === activeChildHierarchyKey
      )[column.colId?.split(".")?.[0]].adjusted;
    if (
      activeHierarchyTotalRowNode?.data[column.colId?.split(".")?.[0]]
        ?.adjusted <= newValue
    ) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${
          column.colId?.split(".")?.[0]
        }  has been reset as updated value is greater than it's hierarcy`
      );

      if (isTotalChange) {
        currentChildTotalNode?.setDataValue(column.colId, oldValue);
        oldValueNode.setDataValue(column.colId, oldValue);
      } else {
      }
      return;
    }

    let sum = 0;
    editHierarchyInstance.current.api.forEachNode((node) => {
      if (
        !node?.data?.[column.colId?.split(".")?.[0]]?.isLocked &&
        activeChildHierarchyKey !== node.data.row
      ) {
        let val = Number(node.data[column.colId?.split(".")?.[0]].adjusted);
        sum += val;
      }
    });
    const newRatio = (newValue - oldValue) / sum;
    editHierarchyInstance.current.api.forEachNode((node) => {
      if (activeChildHierarchyKey === node.data.row) {
        let newData = node.data;
        newData.last_updated_data = {
          ...newValue.last_updated_data,
          [column.colId?.split(".")?.[0]]: newValue,
        };
        node.setData(newData);
      }
      if (
        !node?.data?.[column.colId?.split(".")?.[0]]?.isLocked &&
        activeChildHierarchyKey !== node.data.row
      ) {
        let value = Number(
          node.data[column.colId?.split(".")?.[0]]?.adjusted || 0
        );
        let updatedValue = value - newRatio * value;
        node.setDataValue(column.colId, updatedValue);
      }
    });
  }
};

const useStyles = makeStyles((theme) => ({
  tableSettingOpen: {
    "& .child-matrix-summary .ag-root-wrapper": {
      width: "calc(100% - 375px) !important",
      transition: "all 200ms ease-in-out !important",
    },
    "& .table-footer-section": {
      bottom: "18px !important",
    },
  },
  tableContainer: {
    flex: "1 1 auto",
    height: "100%",
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
  totalRowChild: {
    fontWeight: "bold",

    '& [role="gridcell"]': {
      backgroundColor: "#F4F1F9 !important",
    },
    "& .ag-group-value": {
      // styles here
      marginLeft: "-25px ",
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
}));
