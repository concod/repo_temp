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
} from "modules/ada/utils-ada/utilityFunctions";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { isNumber, uniqBy } from "lodash";
import { infoHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
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
import colours from "core/Styles/colours";
import { Prompt } from "impact-ui-v3";
import { useLoading } from "../../../LoaderWrapper";

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
    setRefreshAllEditHierarchy,
    setSelectedForecast,
  } = props;

  const dispatch = useDispatch();
  const [renderKey, setRenderKey] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  // detail cell renderer doesn't support state on the fly, hence copying
  //  driverForecastVal in driverForecastValRef && driverForecastAllVal in driverForecastAllValRef
  // let lastEditedDriversRef = useRef(null);

  let topGrid = useRef(null);
  let bottomGrid = useRef(null);
  let totalRowGrid = useRef(null);

  const classes = useStyles();
  const globalClasses = globalStyles();

  const loadUserTableInstance = (params) => {
    editHierarchyChildInstance.current = params;
  };

  const loadUserTotalRowInstance = (params) => {
    editHierarchyChildTotalRowInstance.current = params;

    addIdToAggridScrollElem("l1-table-total");
    addIdToAggridScrollElem("l1-table");
  };

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const { loading } = useLoading();

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
  }, []);

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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W"
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
        adaReducer?.switchTimeLine?.[0]?.value === "W"
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
        adaReducer?.switchTimeLine?.[0]?.value === "W"
    );

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
        adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W",
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

  const columnDataHandler = () => {
    let allColumns = [
      columnDefs[0],
      ...historicColumnData,
      ...columnDefs.slice(1),
    ]?.filter((el) => el && el.column_name);
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

      let splittedLabel = showWeekEndDateLabelEnabled
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

  const totalColumnDataHandler = () => {
    let columnDataFormatted = columnDataHandler() || [];
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

  //   `Since, you have changed L2 after locking the cell for ${lockedCellNode.data.row} - ${colId}. This will affect the adjusted forecast. Either save the changes before editing ${lockedCellNode.data.row} - ${colId} week or discard all changes & start new forecast adjustment`

  return (
    <>
      {/* <Prompt
        isOpen={showPrompt}
        title="Modification of Locked Cell Impacts Forecast"
        subHeading={`You've modified L2 & edited & locked current cell. If you unlock this cell it will impact the adjusted forecast. Please save your changes before editing the locked week.`}
        // infoList={["Any unsaved changes will be lost."]}
        primaryButtonProps={{
          children: "Go Back",
          onClick: () => {
            setShowPrompt(false);
          },
        }}
        tertiaryButtonProps={{
          children: "Save Changes",
          onClick: () => {
            setSelectedForecast((prevState) => {
              console.log("dsfcgv", id);
              return {
                selected: id,
                activeKey: prevState.activeKey + 1,
              };
            });
            setShowPrompt(false);
            // setRefreshAllEditHierarchy((prev) => prev + 1);
          },
        }}
        variant="warning"
      /> */}
      <Prompt
        isOpen={showPrompt}
        title="Modification of Locked Cell Impacts Forecast"
        children={
          <>
            You've modified L2 & edited & locked current cell. If you unlock
            this cell it will impact the adjusted forecast. Please save your
            changes before editing the locked week.
          </>
        }
        primaryButtonLabel="Go Back"
        secondaryButtonLabel="Save Changes"
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

      <div className={classes.total}>
        <AgGridComponent
          hideTableFormat={true}
          tableId="l1-table-total"
          defaultTextFieldViewOnly={enableCommaFormatting}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          hideFormatSideBar={true}
          skipAutoSizeColumn
          hideRangeFilter
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
          agGridPagination
          paginationPageSize={edit_hierarchy_pagination_page_size}
          tableId="l1-table"
          defaultTextFieldViewOnly={enableCommaFormatting}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          hideFormatSideBar={true}
          skipAutoSizeColumn
          // minWidth={250}
          customClass={
            edit_hierarchy_pagination_page_size
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
              considerUserProfile
            );
            let colId = cellProps.column.id?.split(".")?.[0];
            let currentWeekEditedData = adjusted?.find(
              (elem) => elem?.fiscal_timeperiod_id === colId
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

            if (
              findSelectedL1?.locked &&
              findSelectedL1?.l2?.length &&
              (findSelectedL1?.ratio || findSelectedL1?.value)
            ) {
              setShowPrompt(true);
              return;
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
              return displayEmptyForecastForViewEdit();
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
  tableContainer: {
    flex: "1 1 auto",
    height: "100%",
    transform: "translateY(-16px)",
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
    "& div.impact-table-main-header": {
      display: "none !important",
    },
    marginBottom: "0rem",
    "& .ag-header.ag-pivot-off": {
      height: "1px !important" /* Removes the fixed height */,
      minHeight: "1px !important" /* Ensures no minimum height restriction */,
    },
  },
  totalRow: {
    fontWeight: "bold",
    "& a": {
      color: "#181d1f",
    },
  },
}));
