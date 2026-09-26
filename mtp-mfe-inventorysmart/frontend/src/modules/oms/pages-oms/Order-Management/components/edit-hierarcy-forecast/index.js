import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "@mui/styles";
import { closeSnack } from "core/actions/snackbarActions";
import { useDispatch, useSelector } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep, isEmpty } from "lodash";
import { Button } from "impact-ui-v3";

import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import {
  setFullScreenLoaderCount,
  saveMatrixSummaryEditApi,
  setSequentialRefreshStep,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import {
  adjustedPayload,
  chartDataPayload,
  getMatrixSummaryL0TotalRowNodeFromApi,
  isNumber,
  isNumberOrString,
} from "../edit-hierarcy-forecast/utils-matrix-summary/utilityFunctions";
import {
  errorHandler,
  infoHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import EditHierarcyWrapper from "./edit-hierarchy/editHierarchyWrapper";
import EditChildHierarcyWrapper from "./edit-child-hierarchy/editChildHierarchyWrapper";
import { setIsButtonDisabled } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS } from "./constants";
import { useLoading } from "./LoaderWrapper";
import { OMS_ORDER_MANAGEMENT_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";
import { adjustMiddleContentHeight } from "../../../../utils-oms/oms-utility";

const updatePayloadDataWithL0TablePayload = (payloadData, l0TablePayload) => {
  if (!payloadData || !l0TablePayload) return;

  const KEYS_REQUIRED_TO_SAVE = [
    "filters",
    "meta",
    "aggregation_level",
    "start_agg_id",
    "end_agg_id",
    "aggregation_type",
    "aggregation_value",
    "kpi",
    "roq_date_option",
  ];

  KEYS_REQUIRED_TO_SAVE.forEach((key) => {
    payloadData[key] = l0TablePayload[key];
  });

  if (l0TablePayload.topLineEdit !== undefined) {
    payloadData.topLineEdit = l0TablePayload.topLineEdit;
  }

  if (l0TablePayload.distribution_method) {
    payloadData.distribution_method = l0TablePayload.distribution_method;
  }
};

const EditHierarchyForecast = (props, ref) => {
  const globalClasses = globalStyles();
  const classes = customStyles();
  const customClasses = useStyles();

  const middleContentRef = useRef(null);
  const footerRef = useRef(null);

  const dispatch = useDispatch();
  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );

  const screenConfig = useSelector(
    (store) => store.omsReducer.orderingCommonService.orderingScreensConfig
  );

  const OmsReducer = useSelector(
    (store) => store?.omsReducer.orderManagementService
  );

  const userAccess = useSelector(
    (store) =>
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc
  );

  const selectedDcs = useSelector(
    (store) => store?.omsReducer.orderManagementService.selectedDcs
  );

  // user access for matrix summary
  const matrixSummaryAccess = userAccess?.find(
    (item) =>
      item.module === "matrix_summary" &&
      item.screen === OMS_ORDER_MANAGEMENT_SCREENNAME_KEY
  );
  const canEdit = matrixSummaryAccess?.isEditButton || false;

  const TOGGLE_OPTIONS = useMemo(() => {
    const config = screenConfig?.oms_dashboard?.style_order_summary || {};

    // Helper to get left/right toggle values with fallback
    const getDefaultToggles = () => [
      config.toggle_value_left || OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[0],
      config.toggle_value_right || OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[1],
    ];

    return getDefaultToggles();
  }, [screenConfig]);

  const [selectedToggleOption, setSelectedToggleOption] = useState(
    TOGGLE_OPTIONS[1].value
  );

  let {
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
    lastEditedDriversRef,
    SkuName,
    isCompareChanges,
    saveApiCountRef,
    isSaveInProgressRef,
    disableAllowEditOnSaveRef,
    l0TableDataPayloadRef,
  } = ref;

  const {
    activeKey,
    driverForecastVal,
    driverForecastAllVal,
    lastEditedDrivers,
    allowEdit = true,
    allowL0Edit = true,
    showIAData,
    id,
    selectedForecast,
    activeChildHierarchyKey,
    setActiveChildHierarchyKey,
    activeChildHierarchyDescription,
    setActiveChildHierarchyDescription,
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
    selectedRows,
    isCalledFromMFPDashboard,
    lastSavedDrivers,
    setLastSavedDrivers,
    index,
    activeTab,
    disableAllowEditOnSave,
    setSavePerformedTab,
    isRedirectedFromDashboard,
    l0TableName,
  } = props;

  const { setLoading, loading } = useLoading();

  const [activeL1, setActiveL1] = useState(null);
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [lastSavedEditHierarchy, setLastSavedEditHierarchy] = useState([]);
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const prevRoqDateTabRef = useRef(null);
  const prevEditModeRef = useRef(null);
  const skipNextSaveButtonEnableRef = useRef(false);

  useEffect(() => {
    if (!isEmpty(userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
    } else {
      // Fall back to default true
      setIsUserHasEditAccess(true);
    }
  }, [userAccess, canEdit]);

  // useSaveForecastStatus(
  //   saveApiCountRef,
  //   id,
  //   isSaveInProgressRef,
  //   index === activeTab
  // );

  const compareStringifyModified = (obj1, obj2) => {
    return (
      obj1.stringifyModified === obj2.stringifyModified &&
      obj1.ratio === obj2.ratio &&
      obj1.value === obj2.value &&
      obj1.locked === obj2.locked &&
      obj1.promo_percentage === obj2.promo_percentage &&
      obj1.fiscal_timeperiod_id === obj2.fiscal_timeperiod_id
    );
  };

  useEffect(() => {
    const ENABLE_TOP_LEVEL_EDIT =
      screenConfig?.oms_dashboard?.matrix_summary?.enableTopLevelEdit || false;
    const selectedRoqDateTab =
      OmsReducer?.highLevelSummaryState?.selectedRoqDateTab ||
      "roq_placement_date";
    const selectedEditMode =
      OmsReducer?.highLevelSummaryState?.selectedEditMode || "topline_edit";

    const roqDateTabChanged =
      prevRoqDateTabRef.current !== null &&
      prevRoqDateTabRef.current !== selectedRoqDateTab;
    const editModeChanged =
      prevEditModeRef.current !== null &&
      prevEditModeRef.current !== selectedEditMode;

    if (roqDateTabChanged || editModeChanged) {
      prevRoqDateTabRef.current = selectedRoqDateTab;
      prevEditModeRef.current = selectedEditMode;
      skipNextSaveButtonEnableRef.current = true;
      setDisableSaveButton(true);
      dispatch(setIsButtonDisabled(true));
      return;
    }
    prevRoqDateTabRef.current = selectedRoqDateTab;
    prevEditModeRef.current = selectedEditMode;

    if (skipNextSaveButtonEnableRef.current) {
      skipNextSaveButtonEnableRef.current = false;
      setDisableSaveButton(true);
      dispatch(setIsButtonDisabled(true));
      return;
    }

    const isTopLevelEditMode =
      ENABLE_TOP_LEVEL_EDIT &&
      selectedRoqDateTab === "roq_receipt_date" &&
      selectedEditMode === "topline_edit";

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
      matrixSummaryReducer,
      false, // isChart
      isTopLevelEditMode
    );

    if (!adjusted) {
      setDisableSaveButton(true);
      dispatch(setIsButtonDisabled(true));
      return;
    }

    let currentSavedAggregation = cloneDeep(adjusted) || [];
    let updatedCurrentSavedAggregation = currentSavedAggregation.map(
      (elem) => ({
        ...elem,
        stringifyModified: JSON.stringify(
          elem.modified || (Array.isArray(elem.modified) ? [] : {})
        ),
      })
    );

    let updatedAdjusted = updatedCurrentSavedAggregation.filter((b) => {
      if (!lastSavedEditHierarchy.length) return true;
      let indexFound = lastSavedEditHierarchy.findIndex((a) =>
        compareStringifyModified(a, b)
      );
      return indexFound === -1;
    });

    updatedAdjusted.forEach((elem) => {
      delete elem.stringifyModified;
    });

    const hasChanges = updatedAdjusted?.length > 0;
    setDisableSaveButton(!hasChanges);
    dispatch(setIsButtonDisabled(!hasChanges));
  }, [
    matrixSummaryReducer?.saveActionTime,
    lastEditedDrivers,
    editHierarchyInstance?.current?.api?.getModel()?.rowsToDisplay,
    editHierarchyTotalRowInstance?.current?.api?.getModel()?.rowsToDisplay,
    OmsReducer?.highLevelSummaryState?.selectedRoqDateTab,
    OmsReducer?.highLevelSummaryState?.selectedEditMode,
  ]);

  const onSave = async (customLimitSave) => {
    const ENABLE_TOP_LEVEL_EDIT =
      screenConfig?.oms_dashboard?.matrix_summary?.enableTopLevelEdit || false;
    const selectedRoqDateTab =
      OmsReducer?.highLevelSummaryState?.selectedRoqDateTab ||
      "roq_placement_date";
    const selectedEditMode =
      OmsReducer?.highLevelSummaryState?.selectedEditMode || "topline_edit";

    const isTopLevelEditMode =
      ENABLE_TOP_LEVEL_EDIT &&
      selectedRoqDateTab === "roq_receipt_date" &&
      selectedEditMode === "topline_edit";

    const isInlineLevelEditMode =
      ENABLE_TOP_LEVEL_EDIT &&
      selectedRoqDateTab === "roq_receipt_date" &&
      selectedEditMode === "inline_edit";

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
      matrixSummaryReducer,
      false, // isChart
      isTopLevelEditMode // isTopLevelEditMode - new parameter
    );
    let currentSavedAggregation = cloneDeep(adjusted) || [];
    let currentSavedDrivers = cloneDeep(lastEditedDrivers) || [];
    let updatedCurrentSavedAggregation = currentSavedAggregation.map((elem) => {
      return { ...elem, stringifyModified: JSON.stringify(elem.modified) };
    });

    const compareDriversModified = (obj1, obj2) => {
      return (
        obj1.selected_promo_type === obj2.selected_promo_type &&
        obj1.promo_percentage === obj2.promo_percentage &&
        obj1.fiscal_timeperiod_id === obj2.fiscal_timeperiod_id
      );
    };

    let updatedDrivers = currentSavedDrivers.filter((b) => {
      let indexFound = lastSavedDrivers.findIndex((a) =>
        compareDriversModified(a, b)
      );
      return indexFound == -1;
    });

    const compareStringifyModified = (obj1, obj2) => {
      return (
        obj1.stringifyModified === obj2.stringifyModified &&
        obj1.ratio === obj2.ratio &&
        obj1.value === obj2.value &&
        obj1.locked === obj2.locked &&
        obj1.promo_percentage === obj2.promo_percentage &&
        obj1.fiscal_timeperiod_id === obj2.fiscal_timeperiod_id
      );
    };

    let updatedAdjusted = updatedCurrentSavedAggregation.filter((b) => {
      let indexFound = lastSavedEditHierarchy.findIndex((a) =>
        compareStringifyModified(a, b)
      );
      return indexFound == -1;
    });
    updatedAdjusted.forEach((elem) => {
      delete elem.stringifyModified;
    });

    // Transform payload for top level edit mode: send only total value and empty modified
    if (isTopLevelEditMode) {
      const L0TotalData = getMatrixSummaryL0TotalRowNodeFromApi(
        editHierarchyTotalRowInstance?.current?.api,
        "Total"
      )?.data;
      const hierarchyApi = editHierarchyInstance?.current?.api;
      updatedAdjusted = updatedAdjusted.map((elem) => {
        let totalUpdatedValue = null;
        const periodId = elem.fiscal_timeperiod_id;
        const fiscalData =
          L0TotalData &&
          (L0TotalData[periodId] ?? L0TotalData[String(periodId)]);
        if (fiscalData) {
          totalUpdatedValue =
            fiscalData.adjusted_manual !== undefined &&
            fiscalData.adjusted_manual !== null
              ? fiscalData.adjusted_manual
              : fiscalData.adjusted;
        }

        const valueForPayload =
          totalUpdatedValue !== null && totalUpdatedValue !== undefined
            ? totalUpdatedValue
            : elem.value;

        let remainder = null;
        if (
          hierarchyApi &&
          valueForPayload !== null &&
          valueForPayload !== undefined &&
          !Number.isNaN(Number(valueForPayload)) &&
          periodId !== null &&
          periodId !== undefined
        ) {
          const colIdForWeek = String(periodId);
          const repositorySum = sumRepositoryOrderCellsForWeek(
            hierarchyApi,
            colIdForWeek
          );
          remainder = Number(valueForPayload) - repositorySum;
        }

        return {
          ...elem,
          modified: [],
          value: valueForPayload,
          ratio: "",
          remainder,
        };
      });
    }

    try {
      const payload = chartDataPayload(matrixSummaryReducer);

      // Reset all refresh states
      dispatch(setSequentialRefreshStep(0)); // Start with step 0

      if (!updatedAdjusted?.length) {
        return infoHandler(dispatch, "No  change detected");
      }

      if (isTopLevelEditMode && editHierarchyInstance?.current?.api) {
        const L0TotalData = getMatrixSummaryL0TotalRowNodeFromApi(
          editHierarchyTotalRowInstance?.current?.api,
          "Total"
        )?.data;
        if (L0TotalData) {
          const validatedWeeks = new Set();
          for (const elem of updatedAdjusted) {
            const colId = elem.fiscal_timeperiod_id;
            if (!colId || validatedWeeks.has(colId)) continue;
            validatedWeeks.add(colId);
            const fiscalData = L0TotalData[colId];
            if (!fiscalData) continue;
            const grand = Number(
              fiscalData.adjusted_manual !== undefined
                ? fiscalData.adjusted_manual
                : fiscalData.adjusted
            );
            if (Number.isNaN(grand)) continue;
            const repoSum = sumRepositoryOrderCellsForWeek(
              editHierarchyInstance.current.api,
              colId
            );
            if (grand < repoSum) {
              return errorHandler(
                dispatch,
                null,
                `Cannot save or apply: Grand Total is less than the sum of all Repository Order Cells for this week (minimum ${repoSum}, current ${grand}). Increase the Grand Total or adjust repository quantities.`
              );
            }
          }
        }
      }

      setDisableSaveButton(true);

      const payloadData = {
        modifications: updatedAdjusted,
        roq_date_option: selectedRoqDateTab,
      };
      if (selectedToggleOption === TOGGLE_OPTIONS[0]?.value) {
        payloadData.order_by = "size";
      }

      // Include L0 table data payload when in top level edit mode
      if (
        (isTopLevelEditMode || isInlineLevelEditMode) &&
        l0TableDataPayloadRef?.current
      ) {
        updatePayloadDataWithL0TablePayload(
          payloadData,
          l0TableDataPayloadRef.current
        );
      }

      if (selectedDcs?.length > 0) {
        payloadData.selected_linked_store_codes = selectedDcs.map(
          (dc) => dc.value
        );
      }

      const data = await saveMatrixSummaryEditApi(payloadData);
      if (data.data.status) {
        // Start sequential refresh: Step 1 - L0 table
        dispatch(setSequentialRefreshStep(1));
        dispatch(setIsButtonDisabled(false));
        successHandler(dispatch, "Saved successfully");
        allEditedGrandChildRowData.current = {};
        editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
          node.data.isEdited = false;
        });
        // Baseline the saved snapshot so the Save button can re-disable.
        const lastSavedAggregation = cloneDeep(adjusted) || [];
        const updatedLastSavedAggregation = lastSavedAggregation.map(
          (savedElem) => ({
            ...savedElem,
            stringifyModified: JSON.stringify(
              savedElem.modified ||
                (Array.isArray(savedElem.modified) ? [] : {})
            ),
          })
        );
        setLastSavedEditHierarchy(updatedLastSavedAggregation);
      } else {
        errorHandler(dispatch, "Something Went Wrong");
      }
    } catch (error) {
      console.log("error", error);
      dispatch(closeSnack());
      errorHandler(dispatch, error);
    } finally {
      dispatch(setFullScreenLoaderCount(-1));
    }
    return;
  };

  useEffect(() => {
    adjustMiddleContentHeight(middleContentRef, footerRef);
  }, []);

  return (
    <>
      <div
        ref={middleContentRef}
        className="edit-hierarchy-wrapper"
        style={{
          position: "relative",
          backgroundColor: "#FFFFFF",
          borderRadius: "13px",
          marginBottom: "3.5rem",
        }}
      >
        <EditHierarcyWrapper
          lastEditedDrivers={lastEditedDrivers}
          id={id}
          key={activeKey}
          activeKey={activeKey}
          selectedFilters={props.selectedFilters}
          setActiveChildHierarchyKey={setActiveChildHierarchyKey}
          setActiveChildHierarchyDescription={
            setActiveChildHierarchyDescription
          }
          allowEdit={allowEdit}
          allowL0Edit={allowL0Edit}
          showIAData={showIAData}
          ref={{
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
            l0TableDataPayloadRef,
          }}
          driverForecastVal={driverForecastVal}
          driverForecastAllVal={driverForecastAllVal}
          activeChildHierarchyKey={activeChildHierarchyKey}
          setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
          isCalledFromMFPDashboard={isCalledFromMFPDashboard}
          selectedRowsFromMFP={selectedRows}
          disableAllowEditOnSave={disableAllowEditOnSave}
          isRedirectedFromDashboard={isRedirectedFromDashboard}
          l0TableName={l0TableName}
        />
        {activeChildHierarchyKey ? (
          <EditChildHierarcyWrapper
            lastEditedDrivers={lastEditedDrivers}
            id={id}
            activeKey={activeKey}
            allowEdit={allowEdit}
            showIAData={showIAData}
            ref={{
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
              isSaveInProgressRef,
            }}
            key={activeChildHierarchyKey}
            activeChildHierarchyKey={activeChildHierarchyKey}
            setActiveChildHierarchyKey={setActiveChildHierarchyKey}
            activeChildHierarchyDescription={activeChildHierarchyDescription}
            setActiveChildHierarchyDescription={
              setActiveChildHierarchyDescription
            }
            driverForecastVal={driverForecastVal}
            driverForecastAllVal={driverForecastAllVal}
            setActiveL1={setActiveL1}
            setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
            activeL1={activeL1}
            isCalledFromMFPDashboard={isCalledFromMFPDashboard}
            selectedRowsFromMFP={selectedRows}
            disableAllowEditOnSave={disableAllowEditOnSave}
            isRedirectedFromDashboard={isRedirectedFromDashboard}
            selectedToggleOption={selectedToggleOption}
            setSelectedToggleOption={setSelectedToggleOption}
            TOGGLE_OPTIONS={TOGGLE_OPTIONS}
          />
        ) : null}
      </div>

      <div
        ref={footerRef}
        style={{ marginLeft: "-24px" }}
        className={`${customClasses.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
      >
        <Button
          className={customClasses.button}
          style={{
            visibility: isRedirectedFromDashboard ? "hidden" : "visible",
          }}
          variant="tertiary"
          onClick={() => props?.navigateToHighLevelSummary()}
        >
          {"< Back to High Level Summary"}
        </Button>

        <Button
          className={customClasses.button}
          variant="primary"
          onClick={() => onSave()}
          disabled={
            !isEmpty(userAccess)
              ? !isUserHasEditAccess || disableSaveButton
              : disableSaveButton
          }
          loadingPosition="end"
          loading={loading || isSaveInProgressRef?.current}
        >
          {"Save"}
        </Button>
      </div>
    </>
  );
};

export default forwardRef(EditHierarchyForecast);

const customStyles = makeStyles(() => ({
  saveForecastBtn: {
    paddingBottom: "1rem",
  },
}));

// check isValid for L2's

export const manualCheckValid = (
  instance,
  row,
  column,
  isChanged,
  dispatch,
  isUserProfileEnabled,
  activeChildHierarchyKey,
  activeChildHierarchyParentKeyLocked,
  totalRowNode,
  isL0Level
) => {
  let colId = column.colId?.split(".")?.[0];
  let childAlreadyEdit = false;
  let parentCanEdit = false;

  instance.forEachNode((node) => {
    if (node?.data?.[colId]?.isLocked || node?.data?.[colId]?.isEdited) {
      childAlreadyEdit = true;
    }
  });

  if (
    childAlreadyEdit &&
    row?.row !== activeChildHierarchyKey &&
    !activeChildHierarchyParentKeyLocked &&
    totalRowNode?.data[colId]?.isLocked
  ) {
    let msg = `Value for current row - ${colId}  has been reset as one of the ${
      isL0Level ? "L0" : "L1"
    } has locked ${
      isL0Level ? "L1" : "L2"
    } value.  Save previous operations before proceeding with this operation`;
    infoHandler(dispatch, msg);

    return true;
  }

  const isNoValueUpdated = onTotalChange(
    instance,
    row,
    column,
    isChanged,
    dispatch,
    true,
    isUserProfileEnabled
  );

  return isNoValueUpdated;
};

// To get intemediate L1 after applying L0 changes
export const getL1AfterL0update = (
  instance,
  row,
  column,
  isChanged,
  dispatch,
  isL0AfterL0TotalUpdate
) => {
  const updatedValue = onTotalChange(
    instance,
    row,
    column,
    isChanged,
    dispatch,
    true,
    null,
    null,
    null,
    true,
    isL0AfterL0TotalUpdate
  );

  return updatedValue;
};

// To get intemediate L1 after locking L0 & L2 of sibling L1
// eg. if two sku are there i.e. s1 & s2 & s1 has store st11, after locking st11 & sku total,
// if I change s2 SKU, then this fn gives us intemediate s1 SKU value

export const getL1AfterL0L2lock = (
  row,
  column,
  instance,
  totalInstance,
  totalKey,
  expandedL2Row
) => {
  // const updatedValue = "";
  let colId = column.colId?.split(".")?.[0];

  let lockedParentNode = totalInstance?.getRowNode(totalKey);
  let lockedParentdata = lockedParentNode?.data;
  let lockedParentValue = lockedParentdata?.[colId];

  let iaLockedParentValue = lockedParentValue?.IA;
  let adjustedLockedParentValue = lockedParentValue?.adjusted;
  let modifiedAdjusted = 0;
  let modifiedAdjustedRespectiveIA = 0;

  const newValue = Number(row[colId].adjusted);

  // Below loop is to get sum of all locked cells & current edited cell (both IA & Edited)
  let nonModifiedCount = 0;
  instance.forEachNode((node) => {
    if (row.row === node.data.row || node?.data?.[colId]?.isLocked) {
      modifiedAdjusted += node.data[colId].adjusted;
      modifiedAdjustedRespectiveIA += node.data[colId].IA;
    } else {
      nonModifiedCount += 1;
    }
  });

  let valueToDistribute = adjustedLockedParentValue - modifiedAdjusted;

  let updatedRatio =
    valueToDistribute / (iaLockedParentValue - modifiedAdjustedRespectiveIA);

  let formattedValue = null;
  instance.forEachNode((node) => {
    if (!node?.data?.[colId]?.isLocked && row.row !== node.data.row) {
      let value = Number(node.data[colId].IA);
      let updatedValue = updatedRatio * value;

      if (+iaLockedParentValue === 0) {
        updatedValue = valueToDistribute / nonModifiedCount;
      }

      if (node.data.row === expandedL2Row) {
        formattedValue = updatedValue;
      }
    }
  });

  return formattedValue;
};

const getWeekDistributionPctForTopline = (node, colId) => {
  let v = node?.data?.fiscal_week?.[colId]?.distribution_pct;
  if (v === undefined || v === null) {
    v = node?.data?.[colId]?.distribution_pct;
  }
  return Number(v) || 0;
};

/** ROQ/matrix week flag from API; 1 and 2 = Repository order cells. */
const getMatrixSummaryWeekFlag = (node, colId) => {
  const fromFw = node?.data?.fiscal_week?.[colId]?.flag;
  if (fromFw !== undefined && fromFw !== null) return Number(fromFw);
  const fromCell = node?.data?.[colId]?.flag;
  if (fromCell !== undefined && fromCell !== null) return Number(fromCell);
  return undefined;
};

export const isRepositoryOrderCellFlag = (flag) => flag === 1 || flag === 2;

/** Sum of order quantity for all Repository cells (flag 1 or 2) for a fiscal week, including locked rows. */
export const sumRepositoryOrderCellsForWeek = (instance, colId) => {
  let sum = 0;
  if (!instance?.forEachNode) return sum;
  instance.forEachNode((node) => {
    if (node?.data?.row === "total" || node?.data?.aggr_column === "total") {
      return;
    }
    const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
    if (!hasDataForWeek) return;
    const flag = getMatrixSummaryWeekFlag(node, colId);
    if (isRepositoryOrderCellFlag(flag)) {
      sum += Number(node.data[colId].adjusted) || 0;
    }
  });
  return sum;
};

const applyToplineDistributedValueToNode = (
  node,
  column,
  colId,
  newChildValue
) => {
  node.setDataValue(column.colId, newChildValue);
  node.data.isEdited = true;
  node.data[colId].isEdited = true;
  node.data[colId].adjusted_manual = newChildValue;
  const prevLastUpdatedData = node.data?.last_updated_data || {};
  node.data.last_updated_data = {
    ...prevLastUpdatedData,
    [colId]: newChildValue,
  };
  node.setData(node.data);
};

// New distribution function using distribution_pct for receipt tab + top line edit mode.
// Returns { success: true } | { success: false, code: 'below_repository_sum', repositorySum } | { success: false, code: 'fallback' }.
export const distributeTotalUsingDistributionPct = (
  instance,
  row,
  column,
  totalRowInstance,
  newValue,
  key = "Total",
  dispatch,
  initialTotalRowData = {}
) => {
  try {
    let totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      totalRowInstance,
      key
    );
    let colId = column.colId?.split(".")?.[0];

    if (!totalRowNode?.data) {
      return { success: false, code: "fallback" };
    }

    const repositorySum = sumRepositoryOrderCellsForWeek(instance, colId);

    if (newValue < repositorySum) {
      return {
        success: false,
        code: "below_repository_sum",
        repositorySum,
      };
    }

    const remainder = newValue - repositorySum;

    const eligibleForRecommended = [];
    let sumDistributionPct = 0;
    instance.forEachNode((node) => {
      if (node?.data?.row === "total" || node?.data?.aggr_column === "total") {
        return;
      }
      const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
      if (!hasDataForWeek || node?.data?.[colId]?.isLocked) return;
      const flag = getMatrixSummaryWeekFlag(node, colId);
      if (isRepositoryOrderCellFlag(flag)) return;
      const distributionPct = getWeekDistributionPctForTopline(node, colId);
      eligibleForRecommended.push({ node, distributionPct });
      sumDistributionPct += distributionPct;
    });

    const commitTotalRowManual = () => {
      totalRowNode.data[colId].adjusted_manual = newValue;
      const newData = totalRowNode.data;
      const prevLastUpdatedData = totalRowNode.data?.last_updated_data || {};
      newData.last_updated_data = {
        ...prevLastUpdatedData,
        [colId]: newValue,
      };
      totalRowNode.setData(newData);
    };

    // Grand total equals repository sum only → all Recommended (unlocked) cells go to 0.
    if (remainder === 0) {
      instance.forEachNode((node) => {
        if (
          node?.data?.row === "total" ||
          node?.data?.aggr_column === "total"
        ) {
          return;
        }
        const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
        if (!hasDataForWeek || node?.data?.[colId]?.isLocked) return;
        const flag = getMatrixSummaryWeekFlag(node, colId);
        if (isRepositoryOrderCellFlag(flag)) return;
        applyToplineDistributedValueToNode(node, column, colId, 0);
      });
      commitTotalRowManual();
      return { success: true };
    }

    if (eligibleForRecommended.length === 0) {
      if (remainder > 0) {
        return {
          success: false,
          code: "no_recommended_cells",
          repositorySum,
        };
      }
      return { success: false, code: "fallback" };
    }

    let distributedSum = 0;
    if (sumDistributionPct > 0) {
      eligibleForRecommended.forEach(({ node, distributionPct }, idx) => {
        const ratio = distributionPct / sumDistributionPct;
        const newChildValue =
          idx === eligibleForRecommended.length - 1
            ? remainder - distributedSum
            : Math.round(ratio * remainder);
        distributedSum += newChildValue;
        applyToplineDistributedValueToNode(node, column, colId, newChildValue);
      });
    } else {
      const n = eligibleForRecommended.length;
      const base = Math.floor(remainder / n);
      let leftover = remainder - base * n;
      eligibleForRecommended.forEach(({ node }, idx) => {
        const newChildValue = base + (idx < leftover ? 1 : 0);
        applyToplineDistributedValueToNode(node, column, colId, newChildValue);
      });
    }

    commitTotalRowManual();
    return { success: true };
  } catch (err) {
    return { success: false, code: "fallback" };
  }
};

// common fn to update all childs from active parent
export const manualTotalvalueChanged = (
  instance,
  row,
  column,
  isChanged,
  totalRowInstance,
  newValue,
  key = "total",
  dispatch,
  initialTotalRowData = {},
  childLockSum
) => {
  try {
    let totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      totalRowInstance,
      key
    );

    // Distribute current updated cell data amongst it's immediate childs or if invalid return true
    const isNoValueUpdated = onTotalChange(
      instance,
      row,
      column,
      isChanged,
      dispatch,
      false,
      childLockSum
    );
    if (isNoValueUpdated) {
      const oldValue =
        Number(
          totalRowNode?.data?.["last_updated_data"]?.[
            column.colId?.split(".")?.[0]
          ]
        ) || initialTotalRowData?.[0]?.[column.colId?.split(".")?.[0]].adjusted;
      totalRowNode?.setDataValue(column.colId, oldValue);
    } else {
      // Ratio for save payload, will be based upon this
      totalRowNode.data[
        column.colId?.split(".")?.[0]
      ].adjusted_manual = newValue;

      // Updating last updated
      //TO DO update last updated on change in individual cells
      let newData = totalRowNode.data;
      let prevLastUpdatedData = totalRowNode.data?.last_updated_data || {};
      newData.last_updated_data = {
        ...prevLastUpdatedData,
        [column.colId?.split(".")?.[0]]: newValue,
      };
      totalRowNode.setData(newData);
    }
  } catch (err) {}
};

// To get Previous Value in an cell, proceed in the following order, if at any stage value exists return it
// 1. if getting prev value from parent
// 2. If cell was edited before manually
// 3. initial data we got from the api
export const getOldValue = (prevOldValue, colId, row, initialEditRowData) => {
  let oldValue = prevOldValue;
  if (!isNumberOrString(oldValue)) {
    if (row["last_updated_data"]?.[colId]) {
      oldValue = Number(row["last_updated_data"]?.[colId]);
    } else {
      oldValue = initialEditRowData.find((el) => el.row === row.row)[colId]
        .adjusted;
    }
  }

  return oldValue;
};

export const getOldValueForSku = (
  prevOldValue,
  colId,
  row,
  initialEditRowData
) => {
  let oldValue = prevOldValue;

  if (row["last_updated_data"]?.[colId]) {
    oldValue = Number(row["last_updated_data"]?.[colId]);
  } else {
    oldValue = initialEditRowData.find((el) => el.row === row.row)[colId]
      .adjusted;
  }

  return oldValue;
};

export const onCellValueChange = (
  row,
  column,
  isChanged,
  instance,
  totalInstance,
  initialEditRowData,
  totalKey = "Total",
  suppressEditFlag = false,
  dispatch = () => null,
  prevOldValue,
  activeL0Node,
  isUserProfileEnabled,
  editHierarchyInstance
  // fakeLocked = false // if L0 is locked and L2 is changed less than or equal to it's L1 then readjust all L2
) => {
  let colId = column.colId?.split(".")?.[0];

  if (!isChanged) return;
  var totalRowNode;

  if (totalInstance?.data) {
    totalRowNode = totalInstance;
  } else {
    totalRowNode = getMatrixSummaryL0TotalRowNodeFromApi(
      totalInstance,
      totalKey
    );
  }

  if (!totalRowNode?.data?.[colId]?.isLocked) {
    let editedNode = null;
    let totalSum = 0;
    instance.forEachNode((node) => {
      totalSum += Number(node.data[colId]?.adjusted) || 0;
      if (row.row === node.data.row) {
        editedNode = node;
        if (!suppressEditFlag) {
          // Marking node data as edited
          node.data.isEdited = true;
          node.data[colId].isEdited = true;
        }
      }
    });
    // if (fakeLocked) {
    //   return;
    // }
    // Setting value on total row & updating last updated value for the same
    totalRowNode?.setDataValue(column.colId, totalSum);
    let newData = totalRowNode?.data;
    let prevLastUpdatedData = totalRowNode?.data?.last_updated_data || {};
    newData.last_updated_data = {
      ...prevLastUpdatedData,
      [colId]: totalSum,
    };
    totalRowNode.setData(newData);

    // Setting last updated value on edited row
    let newEditedRowData = editedNode.data;
    let prevEditedRowLastUpdatedData = editedNode.data?.last_updated_data || {};
    newEditedRowData.last_updated_data = {
      ...prevEditedRowLastUpdatedData,
      [colId]: Number(editedNode.data[colId].adjusted),
    };

    //Setting User Profile Ratio and Flag for Payload
    if (isUserProfileEnabled) {
      let prevEditedRowUserProfileData =
        editedNode.data?.user_profile_data || {};
      let ratio = editedNode.data[colId].adjusted_manual;
      if (editedNode.data[colId].user_profile) {
        ratio = ratio / editedNode.data[colId].user_profile;
      }
      newEditedRowData.user_profile_data = {
        ...prevEditedRowUserProfileData,
        [colId]: {
          user_profile: true,
          ratio: Number(editedNode.data[colId].adjusted_manual),
        },
      };
    }

    editedNode.setData(newEditedRowData);
  } else {
    reAdjustHierarchyInstance(
      row,
      column,
      initialEditRowData,
      instance,
      totalInstance,
      totalKey,
      dispatch,
      prevOldValue,
      totalRowNode, // locked parent value,
      activeL0Node,
      null,
      isUserProfileEnabled,
      null,
      null,
      null,
      editHierarchyInstance
    );
  }
};

// common fn to update all childs from parent
export const onTotalChange = (
  instance,
  row,
  column,
  isChanged,
  dispatch,
  noUpdate,
  isUserProfileEnabled,
  initialTotalVal,
  totalInstance,
  L1AfterL0update,
  L0AfterL0TotalUpdate
) => {
  try {
    if (!isChanged) return;
    let colId = column.colId?.split(".")?.[0];

    const newValue = Number(row[colId].adjusted);
    const oldValue = Number(row[colId].IA);
    let nonLockedSum = 0;
    let isAllLocked = true;
    //This variable is needed in case of 0 prediction
    let isAnyCellLocked = false;
    let lockedSum = 0;
    let lockedIASum = 0;

    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        lockedSum += Number(node.data[colId]?.adjusted || 0);
        lockedIASum += Number(node.data[colId]?.IA || 0);
        isAnyCellLocked = true;
      } else {
        nonLockedSum += Number(node.data[colId]?.IA || 0);
        isAllLocked = false;
      }
    });
    if (isAllLocked || (!nonLockedSum && lockedIASum)) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as either some/all cell values are 0 or All cell's are locked`
      );

      return true;
    }

    // check if sum of all locked cells in child hierarchy is not more than value in their respective parent
    if ((lockedSum > newValue || lockedSum === newValue) && isAnyCellLocked) {
      infoHandler(
        dispatch,
        `Value for current row - ${colId}  has been reset as it's value is less than locked cell sum`
      );

      return true;
    }

    //Restricts the readjustments on SKUs when Total is changed
    if (noUpdate && !L1AfterL0update) {
      return false;
    }

    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    if (isUserProfileEnabled) {
      let sum = 0;
      let l2StoreLocked = false;
      let updatedTotalValue = newValue;
      let totalCellRatio = row[colId].user_profile;

      instance.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          l2StoreLocked = true;
          updatedTotalValue -= node.data[colId]?.adjusted;
          totalCellRatio -= node.data[colId]?.user_profile;
        }
      });

      let calculatedTotalValue = newValue;

      if (row[colId].user_profile === 0) {
        calculatedTotalValue = newValue;

        let totalPaginatedRows = 0;
        instance.forEachNode((node) => {
          if (!node?.data?.[colId]?.isLocked) {
            totalPaginatedRows += 1;
          }
        });
        let eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

        instance.forEachNode((node) => {
          if (!node?.data?.[colId]?.isLocked) {
            node.data.isEdited = false;
            node.data[colId].isEdited = false;
            delete node.data[colId]?.adjusted_manual;
            node.setDataValue(column.colId, eachCellValue);
          }
        });
      } else {
        calculatedTotalValue = updatedTotalValue / totalCellRatio;

        let totalUserProfile = 0;
        instance.forEachNode((node) => {
          if (!node?.data?.[colId]?.isLocked) {
            let updatedValue =
              node.data[colId]?.user_profile * calculatedTotalValue;
            node.data.isEdited = false;
            node.data[colId].isEdited = false;
            delete node.data[colId]?.adjusted_manual;
            node.setDataValue(column.colId, updatedValue);
            sum += updatedValue;
            totalUserProfile += node.data[colId]?.user_profile;
          }
        });
      }

      totalInstance.forEachNode((node) => {
        if (row.product_code === node.data?.product_code) {
          let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
          node.data.user_profile_data = {
            ...prevEditedRowUserProfileData,
            [colId]: {
              user_profile: true,
              ratio: Number(updatedTotalValue),
            },
          };
        }
      });

      return;
    }

    // When IA is 0
    if (!Number(oldValue)) {
      // Check if we should use distribution_pct logic
      let shouldUseDistributionPct = false;
      instance.forEachNode((node) => {
        // Check both transformed structure and original fiscal_week structure
        if (
          node.data.fiscal_week?.[colId]?.distribution_pct !== undefined ||
          node.data[colId]?.distribution_pct !== undefined
        ) {
          shouldUseDistributionPct = true;
        }
      });

      if (shouldUseDistributionPct) {
        // Use distribution_pct logic: Math.round(distribution_pct * newValue)
        if (L1AfterL0update) {
          let expandedNode = null;
          instance?.forEachNode((node) => {
            if (node.expanded) {
              expandedNode = node;
            }
          });
          if (expandedNode?.data) {
            let distributionPct =
              expandedNode.data.fiscal_week?.[colId]?.distribution_pct;
            if (distributionPct === undefined || distributionPct === null) {
              distributionPct = expandedNode.data[colId]?.distribution_pct;
            }
            distributionPct = Number(distributionPct) || 0;
            return Math.round(distributionPct * newValue);
          }
          return 0;
        }

        // Only distribute to nodes that have data for this fiscal week (others keep "-" / non-editable)
        const nodesWithData = [];
        let sumDistributionPct = 0;
        instance.forEachNode((node) => {
          const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
          if (!node?.data?.[colId]?.isLocked && hasDataForWeek) {
            let distributionPct =
              node.data.fiscal_week?.[colId]?.distribution_pct;
            if (distributionPct === undefined || distributionPct === null) {
              distributionPct = node.data[colId]?.distribution_pct;
            }
            distributionPct = Number(distributionPct) || 0;
            nodesWithData.push({ node, distributionPct });
            sumDistributionPct += distributionPct;
          }
        });

        if (nodesWithData.length > 0 && sumDistributionPct > 0) {
          let distributedSum = 0;
          nodesWithData.forEach(({ node, distributionPct }, idx) => {
            const ratio = distributionPct / sumDistributionPct;
            const updatedValue =
              idx === nodesWithData.length - 1
                ? newValue - distributedSum
                : Math.round(ratio * newValue);
            distributedSum += updatedValue;

            node.data.isEdited = false;
            node.data.last_updated_data = { [colId]: updatedValue };
            node.data[colId].isEdited = false;
            delete node.data[colId]?.adjusted_manual;
            node.setDataValue(column.colId, updatedValue);
          });
        }
        return;
      }

      // Use existing logic when IA is 0 - only distribute to nodes that have data for this fiscal week
      let totalPaginatedRows = 0;
      instance.forEachNode((node) => {
        const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
        if (!node?.data?.[colId]?.isLocked && hasDataForWeek) {
          totalPaginatedRows += 1;
        }
      });

      const eachCellValue =
        totalPaginatedRows > 0
          ? (newValue - lockedSum) / totalPaginatedRows
          : 0;

      if (L1AfterL0update) {
        return eachCellValue;
      }

      instance.forEachNode((node) => {
        const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
        if (!node?.data?.[colId]?.isLocked && hasDataForWeek) {
          let updatedValue = eachCellValue;
          node.data.isEdited = false;
          node.data.last_updated_data = { [colId]: eachCellValue };
          node.data[colId].isEdited = false;
          delete node.data[colId]?.adjusted_manual;
          node.setDataValue(column.colId, updatedValue);
        }
      });
      return;
    }

    const newRatio = (newValue - lockedSum) / nonLockedSum;

    // this section specifically targets Signet at the moment, it return L1 value for which L2 is expaned when L0 is changed
    if (L1AfterL0update) {
      let expandedNode = null;
      instance?.forEachNode((node) => {
        if (node.expanded) {
          expandedNode = node;
        }
      });
      let updatedValue = 0;
      if (expandedNode?.data) {
        // Check if distribution_pct exists for this node
        let distributionPct =
          expandedNode.data.fiscal_week?.[colId]?.distribution_pct;
        if (distributionPct === undefined || distributionPct === null) {
          distributionPct = expandedNode.data[colId]?.distribution_pct;
        }
        if (distributionPct !== undefined && distributionPct !== null) {
          updatedValue = Math.round(Number(distributionPct) * newValue);
        } else {
          updatedValue = Number(expandedNode?.data[colId]?.IA || 0) * newRatio;
        }
      }

      if (L0AfterL0TotalUpdate) {
        return newRatio;
      }
      return updatedValue;
    }

    // Check if we should use distribution_pct logic (for L1 and L2 when distribution_pct is available)
    let shouldUseDistributionPct = false;
    instance.forEachNode((node) => {
      // Check both transformed structure and original fiscal_week structure
      if (
        node.data.fiscal_week?.[colId]?.distribution_pct !== undefined ||
        node.data[colId]?.distribution_pct !== undefined
      ) {
        shouldUseDistributionPct = true;
      }
    });

    if (shouldUseDistributionPct) {
      // Use distribution_pct logic - only for nodes that have data for this fiscal week
      const nodesWithData = [];
      let sumDistributionPct = 0;
      instance.forEachNode((node) => {
        const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
        if (!node?.data?.[colId]?.isLocked && hasDataForWeek) {
          let distributionPct =
            node.data.fiscal_week?.[colId]?.distribution_pct;
          if (distributionPct === undefined || distributionPct === null) {
            distributionPct = node.data[colId]?.distribution_pct;
          }
          distributionPct = Number(distributionPct) || 0;
          nodesWithData.push({ node, distributionPct });
          sumDistributionPct += distributionPct;
        }
      });

      if (nodesWithData.length > 0 && sumDistributionPct > 0) {
        let distributedSum = 0;
        nodesWithData.forEach(({ node, distributionPct }, idx) => {
          const ratio = distributionPct / sumDistributionPct;
          const updatedValue =
            idx === nodesWithData.length - 1
              ? newValue - distributedSum
              : Math.round(ratio * newValue);
          distributedSum += updatedValue;

          let newData = node.data;
          let prevLastUpdatedData = node.data?.last_updated_data || {};
          newData.last_updated_data = {
            ...prevLastUpdatedData,
            [colId]: updatedValue,
          };
          node.data[colId].isEdited = false;
          delete node.data[colId]?.adjusted_manual;

          node.setData(newData);
          node.setDataValue(column.colId, updatedValue);
          node.data.isEdited = false;
        });
      }
    } else {
      // Use existing ratio-based logic - only update nodes that have data for this fiscal week
      instance.forEachNode((node) => {
        const hasDataForWeek = node?.data?.[colId]?.adjusted != null;
        if (!node?.data?.[colId]?.isLocked && hasDataForWeek) {
          let updatedValue = Number(node.data[colId]?.IA || 0) * newRatio;
          if (node.data[colId]?.IA === null) updatedValue = null;
          let newData = node.data;
          let prevLastUpdatedData = node.data?.last_updated_data || {};
          newData.last_updated_data = {
            ...prevLastUpdatedData,
            [colId]: updatedValue,
          };
          node.data[colId].isEdited = false;
          delete node.data[colId]?.adjusted_manual;

          node.setData(newData);

          node.setDataValue(column.colId, updatedValue);
          node.data.isEdited = false;
        }
      });
    }
  } catch (err) {
    console.log("Failed in onTotalChange Method.", err);
  }
};

export const NonActiveChangeFromParentToChild = (
  data,
  row,
  column,
  isUserProfileEnabled,
  noUpdate,
  dispatch
) => {
  // if (!isChanged) return;
  let colId = column.colId?.split(".")?.[0];

  const newValue = Number(row[colId].adjusted);
  const oldValue = Number(row[colId].IA);
  let nonLockedSum = 0;
  let lockedSum = 0;

  data.forEach((node) => {
    if (node?.[colId]?.isLocked) {
      lockedSum += Number(node[colId].adjusted);
    } else {
      nonLockedSum += Number(node[colId].IA);
    }
  });

  if (lockedSum > newValue) {
    infoHandler(
      dispatch,
      `Value for current row - ${colId}  has been reset as it's value is less than locked cell sum`
    );
    return true;
  }

  if (noUpdate) return;

  if (isUserProfileEnabled) {
    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    let sum = 0;
    let l2StoreLocked = false;
    let updatedTotalValue = newValue;
    let totalCellRatio = row[colId].user_profile;
    let calculatedTotalValue = newValue;

    data.forEach((node) => {
      if (node?.[colId]?.isLocked) {
        l2StoreLocked = true;
        updatedTotalValue -= node[colId]?.adjusted;
        totalCellRatio -= node[colId]?.user_profile;
      }
    });

    if (row[colId].user_profile === 0) {
      calculatedTotalValue = newValue;

      let totalPaginatedRows = 0;
      data.forEach((node) => {
        if (!node?.[colId]?.isLocked) {
          totalPaginatedRows += 1;
        } else {
          lockedSum += Number(node[colId].adjusted);
        }
      });
      let eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

      data.forEach((node) => {
        if (!node?.[colId]?.isLocked) {
          let updatedValue = eachCellValue;
          node[colId].adjusted = updatedValue;
        }
      });
    } else {
      calculatedTotalValue = updatedTotalValue / totalCellRatio;
      l2StoreLocked = true;

      let eachCellRatio = newValue;
      if (oldValue !== 0) eachCellRatio = newValue / oldValue;

      let totalUserProfile = 0;
      data.forEach((node) => {
        if (!node?.[colId]?.isLocked) {
          let updatedValue = node[colId]?.user_profile * calculatedTotalValue;
          node[colId].adjusted = updatedValue;
          sum += updatedValue;
          totalUserProfile += node[colId]?.user_profile;
        }
      });
    }

    return;
  }

  // When IA is 0
  if (!Number(oldValue)) {
    let totalPaginatedRows = 0;

    data.forEach((node) => {
      if (!node?.[colId]?.isLocked) {
        totalPaginatedRows += 1;
      } else {
        lockedSum += Number(node[colId].adjusted);
      }
    });
    const eachCellValue = (newValue - lockedSum) / totalPaginatedRows;

    data.forEach((node) => {
      if (!node?.[colId]?.isLocked) {
        let updatedValue = eachCellValue;
        node[colId].adjusted = updatedValue;
      }
    });
    return;
  }

  const newRatio = (newValue - lockedSum) / nonLockedSum;

  data.forEach((node) => {
    if (!node?.[colId]?.isLocked) {
      let updatedValue = Number(node[colId].IA) * newRatio;
      node[colId].adjusted = updatedValue;
      node.last_updated_data = {
        [colId]: updatedValue,
      };
    }
  });
};

export const reAdjustHierarchyInstance = (
  row,
  column,
  initialEditRowData,
  instance,
  totalInstance,
  totalKey,
  dispatch,
  prevOldValue,
  lockedParentNode,
  activeL0Node,
  suppressEditFlag,
  isUserProfileEnabled,
  SKULength,
  isCalledFromMFPDashboard,
  editHierarchyChildTotalRowInstance,
  editHierarchyInstance,
  initialEditRowDataForChildTable,
  isUserProfileEnabledForSkuLevelTableFromStoreTable,
  activeChildHierarchyKey,
  selectedRowsFromMFP
) => {
  try {
    let colId = column.colId?.split(".")?.[0];

    let lockedParentdata = lockedParentNode?.data;
    let lockedParentValue = lockedParentdata?.[colId];

    let iaLockedParentValue = lockedParentValue?.IA;
    let adjustedLockedParentValue = lockedParentValue?.adjusted;
    let modifiedAdjusted = 0;
    let modifiedAdjustedRespectiveIA = 0;

    const newValue = Number(row[colId].adjusted);

    // Move to parent on refactor

    var oldValue = getOldValue(prevOldValue, colId, row, initialEditRowData);

    if (Number(newValue) === Number(oldValue)) return;

    let totalRowNode = totalInstance?.getRowNode(totalKey);

    let lockedSum = 0;
    let nonLockedIASum = 0;
    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        let val = Number(node.data[colId]?.adjusted || 0);
        lockedSum += val;
      } else {
        //for handling edge case i.e when we have data and in that all IA datavalue is 0 except one data value
        if (row.row !== node.data.row) {
          let value = Number(node.data[colId]?.IA || 0);
          nonLockedIASum += value;
        }
      }
    });

    if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
      );
      let currRowNode = instance?.getRowNode(row.row);

      return currRowNode?.setDataValue(column.colId, oldValue);
    }

    let nonLockedCount = 0;

    instance.forEachNode((node) => {
      if (
        node?.data?.[colId]?.isLocked ||
        row.row === node.data.row ||
        node?.data?.[colId]?.IA === null
      ) {
        let val = Number(node.data[colId]?.adjusted || 0);
        // sum += val;
      } else {
        nonLockedCount += 1;
      }
    });

    if (!nonLockedCount) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId}  has been reset because value can't be readjusted as all cells in current hierarchy are locked or this is the only cell`
      );

      let currRowNode = instance?.getRowNode(row.row);
      currRowNode?.setDataValue(column.colId, oldValue);

      return;
    }

    instance.forEachNode((node) => {
      if (row.row === node.data.row) {
        if (!suppressEditFlag) {
          // Marking node data as edited
          node.data.isEdited = true;
          node.data[colId].isEdited = true;
        }
      }
    });

    // Below loop is to get sum of all locked cells & current edited cell (both IA & Edited)
    let nonModifiedCount = 0;
    instance.forEachNode((node) => {
      if (row.row === node.data.row || node?.data?.[colId]?.isLocked) {
        modifiedAdjusted += node.data[colId].adjusted;
        modifiedAdjustedRespectiveIA += node.data[colId].IA;
      } else {
        nonModifiedCount += 1;
      }
    });

    let valueToDistribute = adjustedLockedParentValue - modifiedAdjusted;

    let updatedRatio =
      valueToDistribute / (iaLockedParentValue - modifiedAdjustedRespectiveIA);

    if (iaLockedParentValue === modifiedAdjustedRespectiveIA) {
      updatedRatio = valueToDistribute / nonModifiedCount;
    }

    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    if (isUserProfileEnabled) {
      let sum = 0;
      let totalCellRatio = totalRowNode?.data[colId].user_profile;

      let l2StoreLocked = false;
      let calculatedTotalValue = 0;
      let updatedTotalValue = lockedParentValue?.adjusted;

      instance.forEachNode((node) => {
        if (node?.data?.[colId]?.isLocked) {
          l2StoreLocked = true;
          updatedTotalValue -= node.data[colId]?.adjusted;
          totalCellRatio -= node.data[colId]?.user_profile;
        }
      });
      updatedTotalValue -= newValue;
      totalCellRatio -= row[colId].user_profile;
      calculatedTotalValue = updatedTotalValue / totalCellRatio;

      let totalUserProfile = 0;
      instance.forEachNode((node) => {
        if (
          !node?.data?.[colId]?.isLocked &&
          row["store_code"] !== node.data["store_code"]
        ) {
          let updatedValue =
            node.data[colId]?.user_profile * calculatedTotalValue;
          node.data.isEdited = false;
          node.data[colId].isEdited = false;
          delete node.data[colId]?.adjusted_manual;
          node.setDataValue(column.colId, updatedValue);
          sum += updatedValue;
          totalUserProfile += node.data[colId]?.user_profile;
        }
      });

      instance.forEachNode((node) => {
        if (row.row === node.data?.row) {
          let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
          node.data.user_profile_data = {
            ...prevEditedRowUserProfileData,
            [colId]: {
              user_profile: true,
              ratio: Number(newValue),
            },
          };
        } else {
          if (
            node?.data.hasOwnProperty("product_code") &&
            !node?.data?.[colId]?.isLocked
          ) {
            let value = Number(node.data[colId].IA);
            let updatedValue = updatedRatio * value;

            if (+totalRowNode?.data[colId]?.IA === 0) {
              updatedValue = valueToDistribute / nonModifiedCount;
            }
            node.setDataValue(column.colId, updatedValue);
            // Updating Last updated
            let newData = node.data;
            newData.last_updated_data = {
              ...newValue.last_updated_data,
              [colId]: updatedValue,
            };

            node.setData(newData);
            newData[colId].isEditedBySibling = true;
            node.data[colId].isEdited = false;
          }
        }
      });

      totalInstance.forEachNode((node) => {
        let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
        if (totalKey === node.data?.row) {
          node.data.user_profile_data = {
            ...prevEditedRowUserProfileData,
            [colId]: {
              user_profile: true,
              ratio: Number(calculatedTotalValue),
              skipRatioCalculate: true,
            },
          };
        }
      });
    } else {
      if (SKULength > 1 && !lockedParentdata[colId]?.isLocked) {
        var sum = 0;
        let activeL0NodeForSku = {};
        instance.forEachNode((node) => {
          sum += Number(node.data[colId]?.adjusted || 0);
        });
        let totalRowNode = editHierarchyChildTotalRowInstance.getRowNode(
          "total"
        );
        if (totalRowNode?.data[colId]?.adjusted < sum) {
          infoHandler(
            dispatch,
            `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
          );
          let currRowNode = instance?.getRowNode(row.row);
          currRowNode?.setDataValue(column.colId, oldValue);

          // lockedParentdata[colId].adjusted =
          //   lockedParentdata[colId].adjusted - oldValue;
          // lockedParentNode.setData(lockedParentdata);
          return;
        }
        let prevOldValueChild;
        let rowChild;
        lockedParentdata[colId].adjusted = sum;
        lockedParentNode.setData(lockedParentdata);

        editHierarchyInstance.forEachNode((node) => {
          if (selectedRowsFromMFP[0].choice === node.data.row) {
            activeL0NodeForSku = node;
          }
        });
        totalInstance.forEachNode((node) => {
          if (lockedParentdata.row === node.data.row) {
            prevOldValueChild = node.data[colId].adjusted;
          }
        });
        rowChild = totalInstance.getRowNode(lockedParentdata.row);
        editHierarchyChildTotalRowInstance.forEachNode((node) => {});
        reAdjustHierarchyInstanceFromGrandChildToChild(
          rowChild.data,
          column,
          initialEditRowDataForChildTable.current[
            selectedRowsFromMFP[0].choice
          ],
          totalInstance,
          editHierarchyChildTotalRowInstance,
          "total",
          dispatch,
          prevOldValueChild,
          totalRowNode, // locked parent value,
          activeL0NodeForSku,
          null,
          isUserProfileEnabledForSkuLevelTableFromStoreTable
        );
      } else {
        instance.forEachNode((node) => {
          if (row.row === node.data.row) {
            let newData = node.data;
            newData.last_updated_data = {
              ...newValue.last_updated_data,
              [colId]: newValue,
            };
            node.setData(newData);
            // Marking node data as edited
            newData.isEdited = true;
            newData[colId].isEdited = true;

            modifiedAdjusted += newValue;
            modifiedAdjustedRespectiveIA += newData[colId].IA;
          }

          if (!node?.data?.[colId]?.isLocked && row.row !== node.data.row) {
            let newData = node.data;

            node.setData(newData);
            let value = Number(node.data[colId].IA);
            let updatedValue = updatedRatio * value;
            if (nonLockedIASum === 0) {
              updatedValue = updatedRatio;
            }
            if (+totalRowNode?.data[colId]?.IA === 0) {
              updatedValue = valueToDistribute / nonModifiedCount;
            }
            newData.last_updated_data = {
              ...newValue.last_updated_data,
              [colId]: updatedValue,
            };

            newData[colId].isEditedBySibling = true;

            node.setDataValue(column.colId, updatedValue);

            // Marking node data as edited
            // node.data.isEdited = false;
            node.data[colId].isEdited = false;

            // Updating Last updated
          }
        });
      }
    }

    // setting flag edited for L1 total (Selected L0)

    lockedParentdata.isEdited = true;
    lockedParentdata[colId].isEdited = false;
    lockedParentdata.isEditedFromChildData = true;
    lockedParentdata.isChildEdited = true;
    lockedParentdata[colId].isChildEdited = true;
    lockedParentdata[colId].isEditedFromChildData = true;
    lockedParentNode.setData(lockedParentdata);

    // setting flag edited for L0 selected department

    let activeL0Data = activeL0Node?.data;
    if (activeL0Data) {
      activeL0Data.isEdited = true;
      activeL0Data[colId].isEdited = true;
      activeL0Node.setData(activeL0Data);
    }
  } catch (error) {
    console.log("error", error);
  }
};

export const getL0ValidAfterL2Change = (
  row,
  column,
  initialEditRowData,
  instance,
  totalInstance,
  totalKey,
  dispatch,
  prevOldValue,
  lockedParentNode,
  activeL0Node,
  suppressEditFlag,
  isUserProfileEnabled,
  SKULength,
  isCalledFromMFPDashboard,
  editHierarchyChildTotalRowInstance,
  editHierarchyInstance,
  initialEditRowDataForChildTable,
  isUserProfileEnabledForSkuLevelTableFromStoreTable,
  activeChildHierarchyKey,
  selectedRowsFromMFP
) => {
  try {
    let colId = column.colId?.split(".")?.[0];

    let lockedParentdata = lockedParentNode?.data;
    let lockedParentValue = lockedParentdata?.[colId];

    let iaLockedParentValue = lockedParentValue?.IA;
    let adjustedLockedParentValue = lockedParentValue?.adjusted;
    let modifiedAdjusted = 0;
    let modifiedAdjustedRespectiveIA = 0;

    const newValue = Number(row[colId].adjusted);

    // Move to parent on refactor

    var oldValue = getOldValue(prevOldValue, colId, row, initialEditRowData);
    console.log("chla123456667", row, newValue, oldValue);
    if (Number(newValue) === Number(oldValue)) return;

    let totalRowNode = totalInstance?.getRowNode(totalKey);

    let lockedSum = 0;
    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        let val = Number(node.data[colId]?.adjusted || 0);
        lockedSum += val;
      }
    });

    if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
      infoHandler(
        dispatch,
        `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
      );

      let currRowNode = instance?.getRowNode(row.row);
      currRowNode?.setDataValue(column.colId, oldValue);
      return true;
    }
  } catch (error) {
    console.log("error", error);
  }
};

export const reAdjustHierarchyInstanceFromGrandChildToChild = (
  row,
  column,
  initialEditRowData,
  instance,
  totalInstance,
  totalKey,
  dispatch,
  prevOldValue,
  lockedParentNode,
  activeL0Node,
  suppressEditFlag,
  isUserProfileEnabled
) => {
  let colId = column.colId?.split(".")?.[0];

  let lockedParentdata = lockedParentNode?.data;
  let lockedParentValue = lockedParentdata?.[colId];

  let iaLockedParentValue = lockedParentValue?.IA;
  let adjustedLockedParentValue = lockedParentValue?.adjusted;
  let modifiedAdjusted = 0;
  let modifiedAdjustedRespectiveIA = 0;

  const newValue = Number(row[colId].adjusted);

  // Move to parent on refactor

  var oldValue = getOldValueForSku(
    prevOldValue,
    colId,
    row,
    initialEditRowData
  );

  if (Number(newValue) === Number(oldValue)) return;

  let totalRowNode = totalInstance?.getRowNode(totalKey);

  let lockedSum = 0;
  instance.forEachNode((node) => {
    if (node?.data?.[colId]?.isLocked) {
      let val = Number(node.data[colId]?.adjusted || 0);
      lockedSum += val;
    }
  });
  // if (SKULength == 1) {
  //   if (totalRowNode?.data[colId]?.adjusted - lockedSum < newValue) {
  //     infoHandler(
  //       dispatch,
  //       `Value for ${row.row} - ${colId}  has been reset as updated value is greater than it's hierarchy`
  //     );
  //     let currRowNode = instance?.getRowNode(row.row);

  //     currRowNode?.setDataValue(column.colId, oldValue);
  //     return;
  //   }
  // }

  let nonLockedCount = 0;

  instance.forEachNode((node) => {
    if (node?.data?.[colId]?.isLocked || row.row === node.data.row) {
      let val = Number(node.data[colId]?.adjusted || 0);

      // sum += val;
    } else {
      nonLockedCount += 1;
    }
  });

  if (!nonLockedCount) {
    infoHandler(
      dispatch,
      `Value for ${row.row} - ${colId}  has been reset because value can't be readjusted as all cells in current hierarchy are locked or this is the only cell`
    );

    let currRowNode = instance?.getRowNode(row.row);
    currRowNode?.setDataValue(column.colId, oldValue);

    return;
  }

  instance.forEachNode((node) => {
    if (row.row === node.data.row) {
      if (!suppressEditFlag) {
        // Marking node data as edited
        node.data.isEdited = true;
        node.data[colId].isEdited = true;
      }
    }
  });

  // Below loop is to get sum of all locked cells & current edited cell (both IA & Edited)
  let nonModifiedCount = 0;
  instance.forEachNode((node) => {
    if (row.row === node.data.row || node?.data?.[colId]?.isLocked) {
      modifiedAdjusted += node.data[colId].adjusted;
      modifiedAdjustedRespectiveIA += node.data[colId].IA;
    } else {
      nonModifiedCount += 1;
    }
  });

  let valueToDistribute = adjustedLockedParentValue - modifiedAdjusted;

  let updatedRatio =
    valueToDistribute / (iaLockedParentValue - modifiedAdjustedRespectiveIA);

  //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
  if (isUserProfileEnabled) {
    let sum = 0;
    let totalCellRatio = row[colId].user_profile;
    let l2StoreLocked = false;
    let calculatedTotalValue = 0;
    let updatedTotalValue = lockedParentValue?.adjusted;

    instance.forEachNode((node) => {
      if (node?.data?.[colId]?.isLocked) {
        l2StoreLocked = true;
        updatedTotalValue -= node.data[colId]?.adjusted;
        totalCellRatio -= node.data[colId]?.user_profile;
      }
    });
    updatedTotalValue -= newValue;
    totalCellRatio -= row[colId].user_profile;
    calculatedTotalValue = updatedTotalValue / totalCellRatio;

    let totalUserProfile = 0;
    instance.forEachNode((node) => {
      if (
        !node?.data?.[colId]?.isLocked &&
        row["store_code"] !== node.data["store_code"]
      ) {
        let updatedValue =
          node.data[colId]?.user_profile * calculatedTotalValue;
        node.data.isEdited = false;
        node.data[colId].isEdited = false;
        delete node.data[colId]?.adjusted_manual;
        node.setDataValue(column.colId, updatedValue);
        sum += updatedValue;
        totalUserProfile += node.data[colId]?.user_profile;
      }
    });

    instance.forEachNode((node) => {
      if (row.row === node.data?.row) {
        let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
        node.data.user_profile_data = {
          ...prevEditedRowUserProfileData,
          [colId]: {
            user_profile: true,
            ratio: Number(newValue),
          },
        };
      } else {
        if (
          node?.data.hasOwnProperty("product_code") &&
          !node?.data?.[colId]?.isLocked
        ) {
          let value = Number(node.data[colId].IA);
          let updatedValue = updatedRatio * value;

          if (+totalRowNode?.data[colId]?.IA === 0) {
            updatedValue = valueToDistribute / nonModifiedCount;
          }
          node.setDataValue(column.colId, updatedValue);
          // Updating Last updated
          let newData = node.data;
          newData.last_updated_data = {
            ...newValue.last_updated_data,
            [colId]: updatedValue,
          };

          node.setData(newData);
        }
      }
    });

    totalInstance.forEachNode((node) => {
      let prevEditedRowUserProfileData = node.data?.user_profile_data || {};
      node.data.user_profile_data = {
        ...prevEditedRowUserProfileData,
        [colId]: {
          user_profile: true,
          ratio: Number(updatedTotalValue),
        },
      };
    });
  } else {
    instance.forEachNode((node) => {
      if (row.row === node.data.row) {
        let newData = node.data;
        newData.last_updated_data = {
          ...newValue.last_updated_data,
          [colId]: newValue,
        };
        node.setData(newData);
        // Marking node data as edited
        newData.isEdited = true;
        newData[colId].isEdited = true;

        modifiedAdjusted += newValue;
        modifiedAdjustedRespectiveIA += newData[colId].IA;
      }

      if (!node?.data?.[colId]?.isLocked && row.row !== node.data.row) {
        let value = Number(node.data[colId].IA);
        let updatedValue = updatedRatio * value;

        if (+totalRowNode?.data[colId]?.IA === 0) {
          updatedValue = valueToDistribute / nonModifiedCount;
        }
        node.setDataValue(column.colId, updatedValue);

        // Marking node data as edited
        // node.data.isEdited = true;
        // node.data[colId].isEdited = true;

        // Updating Last updated
        let newData = node.data;
        newData.last_updated_data = {
          ...newValue.last_updated_data,
          [colId]: updatedValue,
        };

        node.setData(newData);
      }
    });
  }

  // setting flag edited for L1 total (Selected L0)

  lockedParentdata.isEdited = true;
  lockedParentdata[colId].isEdited = false;
  lockedParentdata.isEditedFromChildData = true;
  lockedParentdata.isChildEdited = true;
  lockedParentdata[colId].isChildEdited = true;
  lockedParentdata[colId].isEditedFromChildData = true;
  lockedParentNode.setData(lockedParentdata);

  // setting flag edited for L0 selected department

  let activeL0Data = activeL0Node?.data;
  if (activeL0Data) {
    activeL0Data.isEdited = true;
    activeL0Data[colId].isEdited = true;
    activeL0Node.setData(activeL0Data);
  }
};

export const NonMountChangeByParent = (
  parentInstance,
  key,
  updatedData,
  grandParentInstance,
  greatGrandParentInstance,
  grandParentKey = "total",
  isUserProfileEnabled,
  isL0SiblingsUnLockedForEmptyForecast
) => {
  let currParent = parentInstance.current.api.getRowNode(key)?.data;
  let grandParent = grandParentInstance.current.api.getRowNode(grandParentKey)
    ?.data;
  let greatGrandParent = greatGrandParentInstance?.current?.api?.getRowNode(
    "total"
  )?.data;
  let columnEditedMapping = {};

  //checkingParentEdited
  for (let key in currParent) {
    if (
      isNumber(key) &&
      (currParent[key]?.isEdited || currParent[key]?.isEditedBySibling) &&
      !columnEditedMapping[key]
    ) {
      columnEditedMapping[key] = true;
    }
  }

  if (grandParent) {
    for (let key in grandParent) {
      if (
        isNumber(key) &&
        grandParent[key]?.isEdited &&
        !columnEditedMapping[key]
      ) {
        columnEditedMapping[key] = true;
      }
    }
  }

  if (greatGrandParent) {
    for (let key in greatGrandParent) {
      if (
        isNumber(key) &&
        greatGrandParent[key]?.isEdited &&
        !columnEditedMapping[key]
      ) {
        columnEditedMapping[key] = true;
      }
    }
  }

  let updateData = (newValue, oldValue, userProfile, data, column) => {
    let sum = 0;

    //Checks if the user_profile_enabled is available to apply the ratio increment for each Store
    if (isUserProfileEnabled) {
      let sum = 0;
      let eachCellRatio = newValue;
      if (userProfile !== 0) {
        eachCellRatio = newValue / userProfile;
        let totalUserProfile = 0;

        data.forEach((node) => {
          // let updatedValue = 0;
          // if (newValue) {
          //   updatedValue = eachCellRatio * node[column]?.adjusted;
          // }
          // if (oldValue === 0) {
          //   updatedValue = node[column]?.user_profile * newValue;
          // }
          let updatedValue = node[column]?.user_profile * eachCellRatio;

          node[column].adjusted = updatedValue;
          sum += updatedValue;
          totalUserProfile += node[column].user_profile;
        });
      } else {
        const eachCellValue = newValue / data.length;
        data.forEach((node) => {
          let updatedValue = eachCellValue;
          node[column].adjusted = updatedValue;
        });
      }

      return;
    }

    // When IA is null
    if (oldValue === null && isL0SiblingsUnLockedForEmptyForecast) {
      data.forEach((node) => {
        node[column].adjusted = null;
      });
      return;
    }

    // When IA is 0
    if (!Number(oldValue)) {
      const eachCellValue = newValue / data.length;

      data.forEach((node) => {
        let updatedValue = eachCellValue;
        node[column].adjusted = updatedValue;
      });
      return;
    }

    data.forEach((node) => {
      sum += Number(node[column].IA);
    });

    const newRatio = newValue / sum;

    data.forEach((node) => {
      let updatedValue = Number(node[column].IA) * newRatio;
      node[column].adjusted = updatedValue;
    });
  };

  // if (currParent.isEdited || ignoreEditedCheck) {
  for (let key in currParent) {
    if (isNumber(key) && columnEditedMapping[key]) {
      updateData(
        currParent[key].adjusted,
        currParent[key].IA,
        currParent[key].user_profile,
        updatedData,
        key
      );
    }
  }
  // }
  return updatedData;
};

export const lockCellApi = (cellProps, isLocked, instance) => {
  let lockedCellNode = instance?.current?.api.getRowNode(
    cellProps?.cellData?.data?.row
  );

  lockedCellNode.data[cellProps.column.id?.split(".")?.[0]].isLocked = isLocked;
  instance.current.api.refreshCells({
    force: true,
  });
};

export const lockCellCustomConditionFn = (instance) => {
  let isLocked =
    instance.data?.[instance?.colDef?.id?.split(".")?.[0]]?.isLocked;
  return isLocked;
};

// check in childs, if any of the cells are locked then return true

// P.S. mostly used to find locked childs in active state(i.e. The table was opened & edited & is hidden now)

export const hasIsLockedNested = (data, objKey) => {
  if (typeof data === "object" && data !== null) {
    // Check for "objKey" and "isLocked" in the current object:
    if (
      objKey in data &&
      typeof data?.[objKey] === "object" &&
      "isLocked" in data?.[objKey] &&
      data?.[objKey]?.["isLocked"] === true
    ) {
      return true;
    }
    // Recursively check nested objects and arrays within the specified key:
    for (const value of Object.values(data)) {
      if (hasIsLockedNested(value, objKey) && objKey !== "last_updated_data") {
        return true;
      }
    }
  }
  // Not found in this object or its nested structures:
  return false;
};
