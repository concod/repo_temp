import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "@mui/styles";
import {
  addIdToAggridScrollElem,
  adjustedPayload,
  checkIfCellIsDisabledForViewEdit,
  checkIfForecastIsEmptyForViewEdit,
  displayEmptyForecastForViewEdit,
  formatNumberThreeDecimal,
  numberFormattingWithCommas,
  updateForecastMultiplier,
  checkIfForecastIsEmptyForSome,
  checkIfForecastIsZeroForViewEdit,
  disabledDisplayEditHierarchyTotalValues,
  areAllIaValuesNull,
  handlePredictedTimePeriod,
  getPaginationPageSize,
} from "modules/ada/utils-ada/utilityFunctions";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { isNumber, uniqBy } from "lodash";
import { infoHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
import { addSnack } from "core/actions/snackbarActions";
import {
  getL1AfterL0L2lock,
  getL1AfterL0update,
  getOldValue,
  hasIsLockedNested,
  lockCellApi,
  lockCellCustomConditionFn,
  manualCheckValid,
  manualTotalvalueChanged,
  NonActiveChangeFromParentToChild,
  onCellValueChange,
  onTotalChange,
  reAdjustHierarchyInstance,
} from "..";
import "./style.scss";
import EditGrandChildHierarcyWrapper from "../edit-grand-child-hierarchy/editGrandChildHierarchyWrapper";
import { InActiveL1ChangeByL0, L1ChangeByL0 } from "../edit-hierarchy";
import globalStyles from "core/Styles/globalStyles";
import { Prompt, useTranslation } from "impact-ui-v3";
import { useLoading } from "../../../LoaderWrapper";
import DriverSignificanceRenderer from "../../DriverSignificanceRenderer";
import { setEditHierarchyDriverSignificanceData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

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
    currentChildHierarchyKey,
    allEditedChildRowData,
    allEditedGrandChildRowMapping,
    SkuName,
    isCompareChanges,
    disableAllowEditOnSaveRef,
    disabledTotalColumns,
    totalColumnDefs,
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
    setRefreshAllEditHierarchy,
    setSelectedForecast,
    selectedCompareWith,
  } = props;

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const [renderKey, setRenderKey] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const hideProductDescriptionRef = useRef(
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.hide_sku_description
  );

  // detail cell renderer doesn't support state on the fly, hence copying
  //  driverForecastVal in driverForecastValRef && driverForecastAllVal in driverForecastAllValRef
  // let lastEditedDriversRef = useRef(null);

  let topGrid = useRef(null);
  let bottomGrid = useRef(null);
  let totalRowGrid = useRef(null);

  const globalClasses = globalStyles();

  const loadUserTableInstance = (params) => {
    editHierarchyChildInstance.current = params;
  };

  const loadUserTotalRowInstance = (params) => {
    editHierarchyChildTotalRowInstance.current = params;

    addIdToAggridScrollElem("l1-table-total");
    addIdToAggridScrollElem("l1-table");
  };

  const { loading } = useLoading();

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

  const l1DisplayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l1?.column_name ||
    adaReducer?.tenantFilters?.l1?.column_name;

  // Configuration flag to control visibility of L1 table header
  const show_l1_table_header = true;

  const classes = useStyles({ show_l1_table_header });
  currentChildHierarchyKey && (currentChildHierarchyKey.current = activeL1);

  const detailCellRenderer = useMemo(() => {
    // setRenderKey((prevKey) => prevKey + 1);
    return (params) => (
      <EditGrandChildHierarcyWrapper
        selectedCompareWith={selectedCompareWith}
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
          currentChildHierarchyKey,
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
      />
    );
  }, [selectedCompareWith?.value]);

  const rowClassRules = useMemo(() => {
    return {
      [classes.totalRow]: (params) => params.rowIndex === 0,
    };
  }, [classes.totalRow]);

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
    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;
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
        dispatch,
        null,
        null,
        null,
        null,
        null,
        useAdjustedUserForecastBase
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

    let totalRowNode = editHierarchyTotalRowInstance.current?.api.getRowNode(
      "total"
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
    if (totalRowNode.data[colId]?.isLocked && !isCalledFromMFPDashboard) {
      if (+row[colId].adjusted > totalRowNode.data[colId].adjusted) {
        infoHandler(
          dispatch,
          t("ada.editHierarchy.valueResetMoreThanL0Total", { column: colId })
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
          t("ada.editHierarchy.valueResetL1MoreThanL0Total", { column: colId })
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
        t("ada.editHierarchy.valueResetCannotReadjust", {
          row: row.row,
          column: colId,
        })
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
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
          currExpandedNode?.data?.row,
          useAdjustedUserForecastBase
        );
        if (expandedRowL1Value !== null && L2LockedSum > expandedRowL1Value) {
          currHierarchyNode?.setDataValue(column.colId, oldValue);

          infoHandler(
            dispatch,
            t("ada.editHierarchy.valueResetL1Change", {
              row: row.row,
              column: colId,
              newValue: newValue,
              l1Key: currExpandedNode?.data?.row,
              value: formatNumberThreeDecimal(expandedRowL1Value),
            })
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
          t("ada.editHierarchy.valueResetLockedL2", {
            row: row.row,
            column: colId,
          })
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
        t("ada.editHierarchy.valueResetCollapsedL1", { column: colId })
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
          t("ada.editHierarchy.valueResetCollapsedL1", { column: colId })
        );
        let currHierarchyNode = editHierarchyChildInstance.current.api.getRowNode(
          row.row
        );
        let oldValue = getOldValue(initialVal, colId, row, initialEditRowData);
        currHierarchyNode.setDataValue(column.colId, oldValue);
        return;
      }
    }

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
      adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W",
      newValue,
      useAdjustedUserForecastBase
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
      activeL0OldValue,
      useAdjustedUserForecastBase
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
        initialVal,
        editHierarchyChildInstance.current.api,
        null,
        null,
        useAdjustedUserForecastBase
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
        currExpandedNode?.data[colId].adjusted,
        editHierarchyChildInstance.current.api,
        null,
        null,
        useAdjustedUserForecastBase
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W"
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

    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;

    let splitKey = useAdjustedUserForecastBase ? "adjusted_initial" : "IA";

    let activeL0Node = {};
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey === node.data.row) {
        activeL0Node = node;
      }
    });

    if (originalVal === "" || Number(originalVal) <= 0) {
      let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );
      let L0ActiveValue = activeL0Node.data[colId]?.adjusted || 0;
      currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);
      if (Number(originalVal) === 0) {
        dispatch(
          addSnack({
            message: t("ada.common.invalidAdjustedUserForecastValue"),
            options: {
              variant: "info",
              disableOnClose: true,
              autoHideDuration: 3000,
            },
          })
        );
      }
      return;
    }

    if (!isChanged) return;
    setCounterOnEditHierarchyChange((prev) => (prev += 1));

    let totalRowNode = editHierarchyTotalRowInstance.current.api?.getRowNode(
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
        t("ada.editHierarchy.valueResetCollapsedL1", { column: colId })
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
        null,
        null,
        null,
        null,
        useAdjustedUserForecastBase
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
        true,
        useAdjustedUserForecastBase
      );
      if (expandedNode) {
        let L2LockedSum = 0;
        editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
          if (node?.data?.[colId]?.isLocked) {
            L2LockedSum += Number(node.data[colId]?.adjusted || 0);
          }
        });

        let updatedL1Value =
          L1ValueafterL0Update * expandedNode?.data?.[colId]?.[splitKey];

        if (L2LockedSum && L2LockedSum > updatedL1Value) {
          currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);

          infoHandler(
            dispatch,
            t("ada.editHierarchy.valueResetL0Change", {
              row: row.row,
              column: colId,
              newValue: newValue,
              l1Key: expandedNode?.data?.row,
              value: formatNumberThreeDecimal(updatedL1Value),
            })
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
            currL1Data = node.data?.[colId]?.[splitKey];
          }
        });

        let updatedL1Value = currL1Data * L1ValueafterL0Update;

        if (L2LockedSum && L2LockedSum > updatedL1Value) {
          currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);

          infoHandler(
            dispatch,
            t("ada.editHierarchy.valueResetL0Change", {
              row: row.row,
              column: colId,
              newValue: newValue,
              l1Key: l1Key,
              value: formatNumberThreeDecimal(updatedL1Value),
            })
          );
          return;
        }
      }
    }

    // check if L1 Total change is valid for L0

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
      adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W",
      null,
      useAdjustedUserForecastBase
    );
    let L0ActiveValue = activeL0Node.data[colId]?.adjusted;
    if (L0ActiveValue !== newValue) {
      let currentChildTotalNode = editHierarchyChildTotalRowInstance.current.api.getRowNode(
        "total"
      );

      currentChildTotalNode.setDataValue(column.colId, L0ActiveValue);
      return;
    }

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
      adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
        adaReducer?.switchTimeLine?.[0]?.value === "W",
      useAdjustedUserForecastBase
    );

    // Do L0 computation
    L0ChangeByL1(
      column,
      activeChildHierarchyKey,
      ref,
      true,
      row,
      dispatch,
      null,
      useAdjustedUserForecastBase
    );

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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
        initialVal,
        editHierarchyChildInstance.current.api,
        null,
        null,
        useAdjustedUserForecastBase
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W"
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

  const onRecommendationClick = (params) => {
    let payload = {
      agg_level: "l1",
      headerName: params.colDef.headerName,
      agg_hierarchy: {
        l1: params.value,
        l0: currentHierarchyKey.current,
      },
    };
    dispatch(setEditHierarchyDriverSignificanceData(payload));
  };

  const driverSignificanceRenderer = (params) => {
    const classes = useStyles();

    return (
      <div className={classes.wrapper}>
        <div className={classes.ellipsisText} title={params.value}>
          {params.value}
        </div>
        <DriverSignificanceRenderer
          params={params}
          onClick={() => onRecommendationClick(params)}
        />
      </div>
    );
  };

  const columnDataHandler = (isTotalRow) => {
    let cols =
      isTotalRow && totalColumnDefs?.length ? totalColumnDefs : columnDefs;

    let allColumns = [
      { ...columnDefs[0] },
      ...historicColumnData,
      ...cols.slice(1),
    ]?.filter((el) => el && el.column_name);
    if (showDriverSignificance) {
      if (allColumns[0]?.cellRenderer === "agGroupCellRenderer") {
        if (!isTotalRow) {
          allColumns[0].cellRendererParams = {
            suppressCount: true,
            innerRenderer: driverSignificanceRenderer,
          };
        }
      }
    }
    if (allColumns[0]?.type === "int") {
      allColumns[0].type = "link";
    }

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
        if (
          el.column_name === "product_description" &&
          hideProductDescriptionRef.current
        ) {
          el.is_hidden = true;
        } else {
          el.is_hidden = false;
        }
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

  const totalColumnDataHandler = () => {
    let columnDataFormatted = columnDataHandler(true) || [];
    return columnDataFormatted.map((elem) => ({
      ...elem,
      is_searchable: false,
      is_sortable: false,
    }));
  };

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
        pointerEvents: loading ? "none" : "all",
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
    loading,
    editHierarchyGrandChildInstance?.current?.api?.getColumnDefs()?.length,
  ]);

  const getAggregateTimeName = () => {
    const timeline = adaReducer?.switchTimeLine?.[0]?.value;
    if (!timeline || timeline === "W") return "week";
    if (timeline === "Q") return "quarter";
    if (timeline === "M") return "month";
    if (timeline === "PS") return "fiscal_season_name";
    if (timeline === "PSS") return "fiscal_sub_season";
    if (timeline === "PW") return "fiscal_week";
  };

  //   `Since, you have changed L2 after locking the cell for ${lockedCellNode.data.row} - ${colId}. This will affect the adjusted forecast. Either save the changes before editing ${lockedCellNode.data.row} - ${colId} week or discard all changes & start new forecast adjustment`

  return (
    <>
      <Prompt
        isOpen={showPrompt}
        title={t("ada.editChildHierarchy.lockedCellTitle")}
        children={t("ada.editChildHierarchy.lockedCellMessageTemplate", {
          aggregateTimeName: getAggregateTimeName(),
        })}
        primaryButtonLabel={t("ada.editChildHierarchy.goBack")}
        secondaryButtonLabel={t("ada.editChildHierarchy.saveChanges")}
        onPrimaryButtonClick={() => {
          setShowPrompt(false);
        }}
        onSecondaryButtonClick={() => {
          setSelectedForecast((prevState) => {
            console.log("dsfcgv", id);
            return {
              selected: id,
              activeKey: prevState.activeKey + 1,
            };
          });
          setShowPrompt(false);
        }}
        variant="warning"
      />

      <div className={`${classes.total} ${classes.totalEditChildGrid}`}>
        <AgGridComponent
          hideTableFormat={true}
          tableId="l1-table-total"
          defaultTextFieldViewOnly={enableCommaFormatting}
          showSearchModalBtn={true}
          hideFormatSideBar={true}
          skipAutoSizeColumn
          hideRangeFilter
          showSaveTableConfig={false}
          // minWidth={250}
          loadTableInstance={loadUserTotalRowInstance}
          sizeColumnsToFitFlag
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
          lockCellApi={(cellProps, isLocked) => {
            lockCellApi(
              cellProps,
              isLocked,
              editHierarchyChildTotalRowInstance
            );

            // Lock  active row of L0
            let lockedCellNode = editHierarchyInstance?.current?.api.getRowNode(
              activeChildHierarchyKey
            );

            lockedCellNode.data[
              cellProps.column.id?.split(".")?.[0]
            ].isLocked = isLocked;

            editHierarchyInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
            });
          }}
          lockCellCustomConditionFn={lockCellCustomConditionFn}
          lockCellIfNoValue
          customCellRenderer={(cellProps) => {
            const column_name = cellProps.column.colId?.split(".")?.[0];
            //For Empty Forecast - Display cell as "-"
            if (
              checkIfForecastIsEmptyForViewEdit(
                cellProps,
                column_name,
                l1DisplayName
              ) ||
              areAllIaValuesNull(
                initialEditChildRowData?.current[activeChildHierarchyKey],
                column_name
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
                <div style={{ fontWeight: "normal" }}>
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
      <div className={classes.tableContainer} key={renderKey}>
        <AgGridComponent
          hideTableFormat={true}
          onColumnVisible={(params) => {
            if (params.column.colDef.column_name === "product_description") {
              hideProductDescriptionRef.current = !params.visible;
            }
          }}
          agGridPagination
          paginationPageSize={getPaginationPageSize(
            edit_hierarchy_pagination_page_size
          )}
          tableId="l1-table"
          defaultTextFieldViewOnly={enableCommaFormatting}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          hideFormatSideBar={true}
          skipAutoSizeColumn
          // minWidth={250}
          customClass={
            getPaginationPageSize(edit_hierarchy_pagination_page_size)
              ? ""
              : "custom-edit-forecast-aggrid"
          }
          rowdata={editRowData}
          columns={columnDataHandler()}
          masterDetail={true}
          tableRef={bottomGrid}
          alignedGrids={handleEditRowAlignGrids()}
          detailCellRenderer={detailCellRenderer}
          sizeColumnsToFitFlag
          uniqueRowId="row"
          cacheBlockSize={10}
          loadTableInstance={loadUserTableInstance}
          detailRowAutoHeight={true}
          onBlur={onL1ValueChange}
          lockCellApi={(cellProps, isLocked) => {
            let considerUserProfile =
              adaReducer?.switchTimeLine?.[0]?.value === "W";

            let adjusted = adjustedPayload(
              editHierarchyTotalRowInstance,
              lastEditedDrivers,
              editHierarchyInstance,
              allEditedChildRowData,
              editHierarchyChildInstance,
              activeChildHierarchyKey,
              allEditedGrandChildRowData,
              allEditedGrandChildRowMapping,
              editHierarchyGrandChildInstance,
              isCalledFromMFPDashboard,
              false,
              considerUserProfile,
              null,
              handlePredictedTimePeriod(adaReducer)
            );
            let colId = cellProps.column.id?.split(".")?.[0];
            // Prevent unlocking cells with empty forecast
            if (!isLocked) {
              const cellData = cellProps?.cellData?.data?.[colId];
              if (cellData?.IA === null || cellData?.IA === undefined) {
                return; // Prevent unlock for empty forecast
              }
              // Also check if column is in disabled columns list
              if (disabledTotalColumns?.current?.includes(colId)) {
                return; // Prevent unlock for disabled columns
              }
            }
            let currentWeekEditedData = adjusted?.find(
              (elem) => `${elem?.fiscal_timeperiod_id}` === `${colId}`
            );
            let lockedCellNode = editHierarchyChildInstance?.current?.api.getRowNode(
              cellProps?.cellData?.data?.row
            );

            function findObjectByKeyName(array = [], keyName, value) {
              for (const item of array) {
                for (const key in item) {
                  if (item[key].name == value) {
                    return item[key];
                  }
                  if (typeof item[key] === "object") {
                    const result = findObjectByKeyName(
                      [item[key]],
                      keyName,
                      value
                    );
                    if (result) {
                      return result;
                    }
                  }
                }
              }
              return null;
            }

            let findSelectedL0 = findObjectByKeyName(
              currentWeekEditedData?.modified,
              "name",
              activeChildHierarchyKey
            );

            let findSelectedL1 = findSelectedL0?.l1?.find(
              (elem) => elem?.name == lockedCellNode.data.row
            );
            const isUnlockAfterSave =
              lockedCellNode.data[colId].unlockAfterSave;

            if (
              !isUnlockAfterSave &&
              findSelectedL1?.locked &&
              findSelectedL1?.l2?.length &&
              (findSelectedL1?.ratio || findSelectedL1?.value)
            ) {
              setShowPrompt(true);
              return;
            }
            if (isUnlockAfterSave) {
              delete lockedCellNode.data[colId].unlockAfterSave;
            }

            lockCellApi(cellProps, isLocked, editHierarchyChildInstance);

            let isAllL1Locked = true;

            editHierarchyChildInstance.current?.api?.forEachNode((node) => {
              if (!node.data[colId].isLocked) {
                isAllL1Locked = false;
              }
            });

            if (isAllL1Locked) {
              let lockedCellNode = editHierarchyInstance?.current?.api.getRowNode(
                activeChildHierarchyKey
              );

              lockedCellNode.data[colId].isLocked = true;

              // L1 total row which is equivalent to L0 current hierarchy
              let correspondingL1TotallockedCellNode = editHierarchyChildTotalRowInstance?.current?.api?.getRowNode(
                "total"
              );

              correspondingL1TotallockedCellNode.data[colId].isLocked = true;

              infoHandler(
                dispatch,
                `Cell for ${lockedCellNode.data.row} - ${colId}  has been locked as all it's childs are locked`
              );

              editHierarchyChildTotalRowInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
              });

              editHierarchyInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
              });
            }

            // let isAllL1Locked = hasIsLockedNested(detailActiveChilds, colId);

            // Lock  active row of L0
          }}
          lockCellCustomConditionFn={lockCellCustomConditionFn}
          lockCellIfNoValue
          customCellRenderer={(cellProps) => {
            const column_name = cellProps?.colDef?.id.split(".")[0];
            if (
              checkIfForecastIsEmptyForViewEdit(
                cellProps,
                column_name,
                l1DisplayName
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
    </>
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
  prevOldValue,
  useAdjustedUserForecastBase
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

  let activeHierarchyTotalRowNode = editHierarchyTotalRowInstance.current.api.getRowNode(
    "total"
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

    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      if (activeChildHierarchyKey !== node.data.row) {
        InActiveL1ChangeByL0(
          node?.data,
          column,
          ref,
          activeChildHierarchyKey,
          null,
          dispatch,
          useAdjustedUserForecastBase
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
        t("ada.editHierarchy.valueResetGreaterThanHierarchy", {
          row: row.row,
          column: column.colId?.split(".")?.[0],
        })
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
  tableContainer: {
    flex: "1 1 auto",
    height: "100%",
    transform: "translateY(-16px)",
    "& .ag-group-value": {
      width: "100%",
    },
    "& div.impact-table-main-header": {
      display: "none !important",
    },
    "&& .ag-pinned-left-cols-container": {
      zIndex: 0 + " !important",
    },
  },

  total: {
    flex: "none",
    "& .ag-root-wrapper": {
      borderTop: "none",
      height: "47px",
    },
    "& .impact-table-main-container.card-container": {
      paddingBottom: "0px",
    },
    "& #l1-table-total div.impact-table-main-header": {
      display: ({ show_l1_table_header }) =>
        show_l1_table_header ? "flex" : "none !important",
    },
    marginBottom: "0rem",
    "& .ag-header.ag-pivot-off": {
      height: "1px !important" /* Removes the fixed height */,
      minHeight: "1px !important" /* Ensures no minimum height restriction */,
    },
  },

  totalEditChildGrid: {
    "& .ia-basic-table-layout.table-v32 .impact-table-main-container.card-container.table-setting-open": {
      height: "114px !important",
    },
  },
  totalRow: {
    fontWeight: "bold",
    "& a": {
      color: "#181d1f",
    },
  },
}));
