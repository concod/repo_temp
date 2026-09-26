import React, { forwardRef, useEffect, useState, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { useSelector, useDispatch } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { Button, ButtonGroup } from "impact-ui-v3";

import {
  fetchEditHierarchyChildColumnData,
  fetchEditChildHierarchyData,
  setMatrixSummarySetAllApiSuccess,
  setSequentialRefreshStep,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import {
  chartDataPayload,
  handleAppendResponse,
  handleTotalRow,
  isNumber,
  getEditHierarchyChildPayload,
  formattedAdjustedPayload,
  getAllRows,
} from "../utils-matrix-summary/utilityFunctions";
import { useHistoricData } from "./useHistoricData";
import { NonMountChangeByParent } from "..";
import "./style.scss";
import EditChildHierarcy from ".";
import { KEYS_USED_OTHER_THAN_FISCAL_WEEK } from "modules/oms/constants-oms/adaConstants.js";
import { useLoading } from "../LoaderWrapper";
import { getErrorHighlightCellStyle } from "../utils";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import { OMS_ORDER_MANAGEMENT_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";

const EditChildHierarcyWrapper = forwardRef((props, ref) => {
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
    isSaveInProgressRef,
  } = ref;
  const {
    activeKey,
    activeChildHierarchyKey,
    setActiveChildHierarchyKey,
    activeChildHierarchyDescription,
    setActiveChildHierarchyDescription,
    driverForecastAllVal,
    onCategoryValueChange,
    onTotalValueChange,
    activeL1,
    setActiveL1,
    onL2ValueChange,
    allowEdit,
    showIAData,
    id,
    setCounterOnEditHierarchyChange,
    lastEditedDrivers,
    isCalledFromMFPDashboard,
    selectedRowsFromMFP,
    disableAllowEditOnSave,
    selectedToggleOption,
    setSelectedToggleOption,
    TOGGLE_OPTIONS,
  } = props;

  const matrixSummaryMultiplierReducer = useSelector(
    (store) => store?.matrixSummaryReducer?.matrixSummaryMultiplierReducer
  );

  const { loading } = useLoading();

  // detail cell renderer doesn't support state on the fly, hence copying
  //  driverForecastVal in driverForecastValRef && driverForecastAllVal in driverForecastAllValRef
  // let lastEditedDriversRef = useRef(null);

  const globalClasses = globalStyles();
  const classes = useStyles();
  const [loaderCount, setLoaderCount] = useState(0);
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);

  const { historicColumnData, historicRowData, tableLoader } = useHistoricData(
    activeChildHierarchyKey,
    showIAData,
    isCalledFromMFPDashboard
  );

  const [columnDefs, setColumnDefs] = useState([]);
  const [editRowData, setEditRowData] = useState([]);
  const [isEditRowUpdated, setIsEditRowUpdated] = useState(false);

  const [totalRowData, setTotalRowData] = useState([]);
  const [openPackConfigDetailSheet, setOpenPackConfigDetailSheet] = useState(
    false
  );
  const [
    packConfigDetailsPayloadData,
    setPackConfigDetailsPayloadData,
  ] = useState([]);
  const [choiceOptions, setChoiceOptions] = useState(null);
  let disabledTotalColumns = useRef([]);

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );
  const OmsReducer = useSelector(
    (store) => store?.omsReducer.orderManagementService
  );

  const orderingAccessControl = useSelector(
    (store) => store?.omsReducer.orderingCommonService.orderingAccessControl
  );
  const orderingScreensConfig = useSelector(
    (store) => store?.omsReducer.orderingCommonService.orderingScreensConfig
  );
  const userAccess = useSelector(
    (store) =>
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc
  );

  const ENABLE_TOP_LEVEL_EDIT =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.enableTopLevelEdit ||
    false;

  const selectedHierarchyL0ForBudget =
    orderingScreensConfig?.oms_dashboard?.matrix_summary
      ?.selecteddHierarchyL0ForBudget || "article";

  const selectedRoqDateTab =
    OmsReducer?.highLevelSummaryState?.selectedRoqDateTab ||
    "roq_placement_date";
  const selectedEditMode = OmsReducer?.highLevelSummaryState?.selectedEditMode;

  // user access for matrix summary
  const matrixSummaryAccess = userAccess?.find(
    (item) =>
      item.module === "matrix_summary" &&
      item.screen === OMS_ORDER_MANAGEMENT_SCREENNAME_KEY
  );
  const canEdit = matrixSummaryAccess?.isEditButton || false;

  const Mfp_Key =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.mfp_level;
  const editDisableInEditHeirarchy =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;
  const isL0SiblingsUnLockedForEmptyForecast =
    matrixSummaryReducer?.clientConfig?.attribute_value?.empty_forecast_features
      ?.is_l0_siblings_unLocked || false;
  const showNullValuesforEmptyForecast = false;

  const hideToggelOptions =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.hideToggelOptions;

  const l1DisplayName =
    matrixSummaryReducer?.getTableName?.attribute_value?.l0 || "Style";

  const productDescriptionName =
    matrixSummaryReducer?.getTableName?.attribute_value?.descriptionName;

  const isDataWeekLevel = matrixSummaryReducer?.displayDataToWeekLevel;
  const isCalenderDateApplied = matrixSummaryReducer?.isCalenderDateApplied;
  const fiscalWeekId = matrixSummaryReducer?.xAxisStaticDates;
  const isKpiValue = matrixSummaryReducer?.isKPIValue;
  const MatrixSummarySetAllApiSuccess =
    matrixSummaryReducer?.MatrixSummarySetAllApiSuccess;

  const packValue = matrixSummaryReducer?.packValue;

  const dispatch = useDispatch();

  const handleToggleOptionChange = (event, option) => {
    setSelectedToggleOption(option || TOGGLE_OPTIONS[1].value);
    editHierarchyChildInstance?.current?.api?.setRowData([]);
    initialEditChildRowData.current[activeChildHierarchyKey] = [];
    setEditRowData([]);
  };

  const updateResponse = async (getAllWeeksResponse) => {
    const payload = chartDataPayload(
      matrixSummaryReducer,
      null,
      null,
      id === "IA",
      isDataWeekLevel
    );

    const onClickColumn = async (data) => {
      try {
        setPackConfigDetailsPayloadData(data);
        setOpenPackConfigDetailSheet(true);
        // props?.setHighLevelSummaryState({
        //   level_of_hierarchy_label: selectedViewByOptions?.label,
        //   level_of_hierarchy_id: selectedViewByOptions?.value,
        //   level_of_hierarchy_value: data?.[selectedViewByOptions?.value],
        //   selectedViewByOptions: selectedViewByOptions,
        // });
        // const redirectDetails = {
        //   source: "high_level_summary",
        //   target: "matrix_summary",
        // };
        // if (props?.dateFilters?.length) {
        //   redirectDetails.dateFilters = props?.dateFilters;
        // } else {
        //   redirectDetails.dateFilters =
        //     props?.redirectionDetails?.dateFilters || [];
        // }
        // props?.setRedirectionDetails(redirectDetails);
        // navigate(ORDER_MANAGEMENT_MATRIX_SUMMARY);
      } catch (error) {
        console.log("Error in onClickColumn", error);
        // displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    const fetchColumnData = async () => {
      try {
        setLoaderCount((prevState) => prevState + 1);
        dispatch(setMatrixSummarySetAllApiSuccess(false));
        const editHierarchyChildPayload = getEditHierarchyChildPayload(
          payload,
          allowEdit,
          showIAData,
          matrixSummaryReducer
        );

        // Check access control: use new userAccess if available, otherwise fall back to old control
        const isUserHasEditAccess = !isEmpty(userAccess)
          ? canEdit
          : orderingAccessControl?.isEditButton?.isVisible;
        editHierarchyChildPayload.allowEdit = isUserHasEditAccess;
        editHierarchyChildPayload.selectedRoqDateTab = selectedRoqDateTab;

        let l1_data_type =
          matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.l1_data_type;

        if (selectedToggleOption === TOGGLE_OPTIONS[0].value) {
          editHierarchyChildPayload.module = "Size";
        }
        const response = await fetchEditHierarchyChildColumnData(
          editHierarchyChildPayload,
          l1_data_type,
          matrixSummaryReducer,
          isL0SiblingsUnLockedForEmptyForecast,
          id,
          onClickColumn,
          packValue,
          matrixSummaryReducer.isKPIValue,
          matrixSummaryReducer.kpiValuesForLabel
        );

        setColumnDefs(response);
      } catch (error) {
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    await fetchColumnData();

    // if (
    //   allEditedChildRowData.current[activeChildHierarchyKey] &&
    //   !isCalledFromMFPDashboard
    // ) {
    //   setEditRowData(allEditedChildRowData.current[activeChildHierarchyKey]);
    //   return;
    // }

    const fetchRowData = async () => {
      try {
        setLoaderCount((prevState) => prevState + 1);
        let [
          adjustedDiscountPayload,
          adjustedPricePointPayload,
        ] = formattedAdjustedPayload(
          [],
          lastEditedDrivers,
          matrixSummaryReducer
        );

        let updatedAdjustedDiscountPayload = cloneDeep(adjustedDiscountPayload);
        let updatedAdjustedPricePointPayload = cloneDeep(
          adjustedPricePointPayload
        );

        // if component is already loaded and changes made DF, then fetch only for week for which value is updated
        if (isPredictedDataFetched) {
          let filteredAdjustedDiscountPayload = adjustedDiscountPayload.filter(
            ({ promo_percentage }) => promo_percentage
          );
          let filteredAdjustedPricePointPayload = adjustedPricePointPayload.filter(
            ({ price_point }) => price_point
          );

          if (filteredAdjustedDiscountPayload?.length && !getAllWeeksResponse) {
            updatedAdjustedDiscountPayload = filteredAdjustedDiscountPayload;
          }
          if (
            filteredAdjustedPricePointPayload?.length &&
            !getAllWeeksResponse
          ) {
            updatedAdjustedPricePointPayload = filteredAdjustedPricePointPayload;
          }
        }
        payload.adjusted = updatedAdjustedDiscountPayload;
        payload.adjusted_price_point = updatedAdjustedPricePointPayload;

        // if (isCalledFromMFPDashboard) {
        //   payload.filters.product_hierarchy[Mfp_Key] = [
        //     selectedRowsFromMFP[0]?.choice,
        //   ];
        //   payload.filters.store_hierarchy.channel = [
        //     selectedRowsFromMFP[0]?.channel,
        //   ];

        //   payload.filters.mfp = true;
        //   payload.filters.mfp_flag = selectedRowsFromMFP[0]?.flag;
        // }

        const appliedOMSFilters = cloneDeep(
          JSON.parse(localStorage.getItem("selectedFiltersDependency"))
        );

        if (selectedToggleOption === TOGGLE_OPTIONS[0].value) {
          payload.order_by = "size";
          payload.aggregation_type = "size";
        }

        const data = await fetchEditChildHierarchyData(
          payload,
          activeChildHierarchyKey,
          localStorage.getItem("isRedirectedFromDashboardToOms")
            ? mergeOmsDcIntoFilters(appliedOMSFilters, OmsReducer.selectedDcs)
            : OmsReducer.selectedFilters,
          isKpiValue,
          OmsReducer,
          selectedRoqDateTab
        );

        let levelCount = 0;

        let transformedData = data.map((item) => {
          const { fiscal_week, aggr_column } = item;
          const transformedWeekData = {};

          for (const week in fiscal_week) {
            const orderQuantity = fiscal_week[week].order_quantity;
            const flag = fiscal_week[week]?.flag;
            const Kpi = fiscal_week[week]?.kpi;
            const originalOrderQuantity =
              fiscal_week[week]?.order_quantity_original;
            const orderQuantityEaches =
              fiscal_week[week]?.order_quantity_eaches;
            const distributionPct = fiscal_week[week]?.distribution_pct;
            const orderCost = fiscal_week[week]?.order_cost;

            const approveStatus = {
              isGreyOut: false,
            };
            if (flag !== undefined) {
              if (flag === 0) {
                approveStatus.isGreyOut = false;
              } else if (flag === 1) {
                approveStatus.isGreyOut = true;
              } else {
                approveStatus.isGreyOut = true;
              }
            }

            transformedWeekData[week] = {
              adjusted: Math.round(orderQuantity),
              IA: originalOrderQuantity,
              Kpi: Kpi,
              order_quantity_eaches: orderQuantityEaches,
              distribution_pct: distributionPct,
              ...approveStatus,
              order_cost: orderCost,
              ...item,
            };
          }

          return {
            row: aggr_column,
            aggr_column: aggr_column,
            ...transformedWeekData,
          };
        });

        transformedData.forEach((elem) => {
          let predictedFiscalWeeks = fiscalWeekId?.fiscal_ids || [];
          for (let week of predictedFiscalWeeks) {
            if (!elem[week]) {
              elem[week] = {
                IA: null,
                adjusted: null,
                order_cost: null,
              };
            } else {
              if (!levelCount) {
                levelCount = elem[week]["level_count"];
              }
            }
          }
        });

        const updatedEditChildHierarchy = getAllRows(
          editHierarchyChildInstance
        );

        const updatedResponse = handleAppendResponse(
          cloneDeep(updatedEditChildHierarchy),
          transformedData
        );

        setIsPredictedDataFetched(true);

        // if parent edited, before child mount
        let updatedData = NonMountChangeByParent(
          editHierarchyInstance,
          activeChildHierarchyKey,
          updatedResponse,
          editHierarchyTotalRowInstance,
          null,
          "total",
          null,
          isL0SiblingsUnLockedForEmptyForecast
        );

        setEditRowData(updatedData);
        initialEditChildRowData.current[activeChildHierarchyKey] = cloneDeep(
          updatedData
        );

        editHierarchyChildInstance?.current?.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } catch (error) {
        console.log("Error in Fetching Row Data", error);
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    await fetchRowData();
  };

  // useEffect(() => {
  //   if (!activeKey || !activeChildHierarchyKey) return;
  //   updateResponse();
  // }, [lastEditedDrivers, activeKey, activeChildHierarchyKey]);

  // useEffect(() => {
  //   updateResponse();
  // }, []);

  useEffect(() => {
    updateResponse();
  }, [
    isDataWeekLevel,
    isCalenderDateApplied,
    isKpiValue,
    selectedToggleOption,
  ]);

  useEffect(() => {
    if (!MatrixSummarySetAllApiSuccess) {
      return;
    }
    updateResponse();
  }, [MatrixSummarySetAllApiSuccess]);

  // Sequential refresh handling for L1 table
  useEffect(() => {
    const sequentialRefreshStep = matrixSummaryReducer?.sequentialRefreshStep;
    if (sequentialRefreshStep === 2) {
      // L1 table refresh
      const handleL1Refresh = async () => {
        await updateResponse();
        // After L1 completes, reset sequence
        dispatch(setSequentialRefreshStep(0));
      };
      handleL1Refresh();
    }
  }, [matrixSummaryReducer?.sequentialRefreshStep]);

  useEffect(() => {
    if (!columnDefs?.length || !editRowData?.length) return;
    setIsEditRowUpdated(false);
    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      activeChildHierarchyKey,
      null,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast,
      isKpiValue
    );
    if (isCalledFromMFPDashboard) {
      getTotalRowData.forEach((data) => {
        data.isFixedLocked = true;
        data.defaultShowLock = true;
      });
    }
    setTotalRowData(getTotalRowData);
    setIsEditRowUpdated(true);
  }, [columnDefs, editRowData]);

  useEffect(() => {
    if (
      !historicColumnData?.length ||
      !editRowData?.length ||
      !totalRowData?.length
    )
      return;
    for (let editRowIndex in editRowData) {
      if (historicRowData?.length) {
        let historicRowForCurrentFiscal =
          historicRowData?.find((historicRow) => {
            return historicRow?.row === editRowData[editRowIndex]?.row;
          }) || {};

        if (!isEmpty(historicRowForCurrentFiscal)) {
          Object.assign(editRowData[editRowIndex], historicRowForCurrentFiscal);
        }
      }
    }
    editHierarchyChildInstance.current.api.setRowData(editRowData);

    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      activeChildHierarchyKey,
      null,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast
    );
    setTotalRowData(getTotalRowData);

    editHierarchyChildInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
    editHierarchyChildTotalRowInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [historicRowData, totalRowData?.length, historicColumnData]);

  useEffect(() => {
    return () => {
      let lastEditedData = [];
      editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
        lastEditedData.push(node.data);
      });
      allEditedChildRowData.current[activeChildHierarchyKey] = lastEditedData;
    };
  }, []);

  // Lock total row, if L0 is locked
  // useEffect(() => {
  //   if (!totalRowData?.length) return;

  //   let lockedCellNode = editHierarchyInstance?.current?.api?.getRowNode(
  //     activeChildHierarchyKey
  //   );
  //   let lockedTotalCellNode = editHierarchyChildTotalRowInstance?.current?.api?.getRowNode(
  //     "total"
  //   );

  //   for (let [fiscalDataKey, fiscalData] of Object.entries(
  //     lockedCellNode?.data || {}
  //   )) {
  //     if (fiscalDataKey && isNumber(fiscalDataKey)) {
  //       const isLocked = fiscalData.isLocked;
  //       totalRowData[0][fiscalDataKey] = {
  //         ...totalRowData[0][fiscalDataKey],
  //         isLocked,
  //       };
  //       if (lockedTotalCellNode?.data[fiscalDataKey]) {
  //         lockedTotalCellNode.data[fiscalDataKey].isLocked = isLocked;
  //       }
  //     }
  //   }
  // }, [totalRowData]);

  const checkIfForecastIsEmpty = (key, data) => {
    return (
      !KEYS_USED_OTHER_THAN_FISCAL_WEEK.includes(key) &&
      (data[key].IA === null || data[key].IA === undefined)
    );
  };

  useEffect(() => {
    if (columnDefs?.length && editRowData?.length) {
      try {
        var cols = cloneDeep(columnDefs);
        let columnsToDisable = [];
        let isUpdated = false;
        let columns = {};

        editRowData?.map((row) => {
          for (const key in row) {
            let columnId = `${key}.adjusted`;
            let index = cols.findIndex((col) => col.id === key);
            if (index >= 0) {
              isUpdated = true;
              var is_edited = true;
              if (cols[index].sub_headers.length) {
                cols[index].sub_headers[0].cellStyle = function (params) {
                  if (params?.data[key]?.isGreyOut) {
                    is_edited = false;
                    return {
                      backgroundColor: "#C3C8D4",
                      colour: "#C3C8D4",
                    };

                    // Add your condition or operation here
                  }

                  // Red highlight if order qty is less than MOQ
                  const errorHighlightCellStyle = getErrorHighlightCellStyle(
                    isKpiValue,
                    params
                  );

                  if (errorHighlightCellStyle) {
                    return errorHighlightCellStyle;
                  }
                };
              }
            }
          }
        });

        let updatedColumns = agGridColumnFormatter(cols);
        const updatedData = updatedColumns.map((column, i) => ({
          ...column,
          cellRenderer: columnDefs[i].cellRenderer,
        }));
        if (isUpdated) {
          setColumnDefs(updatedData);
        }
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  }, [editRowData, isEditRowUpdated]);

  // Disable L1 table cells when in topline_edit mode (but keep hyperlinks clickable)
  useEffect(() => {
    if (!columnDefs?.length || !editRowData?.length || !isEditRowUpdated) {
      return;
    }

    const shouldDisableL1Cells =
      ENABLE_TOP_LEVEL_EDIT &&
      selectedRoqDateTab === "roq_receipt_date" &&
      selectedEditMode === "topline_edit";

    if (!shouldDisableL1Cells) {
      return;
    }

    try {
      var cols = cloneDeep(columnDefs);
      let isUpdated = false;

      editRowData?.map((row) => {
        for (const key in row) {
          let index = cols.findIndex((col) => col.id === key);
          if (index >= 0 && cols[index].sub_headers?.length) {
            const originalCellStyle = cols[index].sub_headers[0].cellStyle;

            isUpdated = true;
            cols[index].sub_headers[0].cellStyle = function (params) {
              let existingStyle = {};
              if (typeof originalCellStyle === "function") {
                const originalStyle = originalCellStyle(params);
                if (originalStyle) {
                  existingStyle = originalStyle;
                }
              } else if (originalCellStyle) {
                existingStyle = originalCellStyle;
              }
              return {
                ...existingStyle,
                pointerEvents: "none",
              };
            };
          }
        }
      });

      if (isUpdated) {
        let updatedColumns = agGridColumnFormatter(cols);
        const updatedData = updatedColumns.map((column, i) => ({
          ...column,
          cellRenderer: columnDefs[i].cellRenderer,
        }));
        setColumnDefs(updatedData);
      }
    } catch (error) {
      console.log("Something went wrong while disabling L1 cells!", error);
    }
  }, [
    editRowData,
    isEditRowUpdated,
    selectedEditMode,
    selectedRoqDateTab,
    ENABLE_TOP_LEVEL_EDIT,
  ]);

  useEffect(() => {
    let cols = cloneDeep(columnDefs);

    cols.forEach((elem, i) => {
      if (i === 0) return elem;
      elem.cellStyle = {
        ...elem.cellStyle,
        pointerEvents: disableAllowEditOnSave ? "none" : "all",
      };
    });

    let updatedColumns = agGridColumnFormatter(cols);

    setColumnDefs(updatedColumns);
  }, [disableAllowEditOnSave, columnDefs?.length]);

  useEffect(() => {
    if (packValue) {
      setChoiceOptions({
        value: packValue,
        isDisabled: packValue === "WP",
      });
    }
  }, [packValue]);

  const handleCloseButtonClick = () => {
    currentHierarchyKey.current = null;
    setActiveChildHierarchyKey(null);
    setActiveChildHierarchyDescription(null);
  };

  const getTopRightOptions = () => {
    return (
      choiceOptions && (
        <div>
          <Button
            variant="tertiary"
            color="primary"
            id="setAllButton"
            className={classes.button}
            disabled={choiceOptions.isDisabled}
            onClick={() => setOpenPackConfigDetailSheet(true)}
          >
            Pack Config Details
          </Button>
        </div>
      )
    );
  };

  const getTopCenterOptions = () => {
    return (
      !hideToggelOptions && (
        <div>
          <ButtonGroup
            id="matrixSummaryToggleSwitch"
            onChange={handleToggleOptionChange}
            selectedOption={selectedToggleOption}
            exclusive
            aria-label="Matrix Summary Toggle"
            options={TOGGLE_OPTIONS}
          />
        </div>
      )
    );
  };

  return (
    <>
      <div className={`${globalClasses.evenPaddingAround}`}>
        <LoadingOverlay
          loader={loaderCount || tableLoader}
          wrapperPosition="static"
          isCustomLoader={true}
        >
          <EditChildHierarcy
            id={id}
            activeL1={activeL1}
            allowEdit={allowEdit}
            showIAData={showIAData}
            columnDefs={columnDefs}
            editRowData={editRowData}
            setActiveL1={setActiveL1}
            totalRowData={totalRowData}
            onL2ValueChange={onL2ValueChange}
            lastEditedDrivers={lastEditedDrivers}
            onTotalValueChange={onTotalValueChange}
            historicColumnData={
              isCalledFromMFPDashboard ? [] : historicColumnData
            }
            onCategoryValueChange={onCategoryValueChange}
            activeChildHierarchyKey={activeChildHierarchyKey}
            setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
            isCalledFromMFPDashboard={isCalledFromMFPDashboard}
            selectedRowsFromMFP={selectedRowsFromMFP}
            disableAllowEditOnSave={disableAllowEditOnSave}
            disabledTotalColumns={disabledTotalColumns}
            activeChildHierarchyDescription={activeChildHierarchyDescription}
            handleCloseButtonClick={handleCloseButtonClick}
            getTopRightOptions={getTopRightOptions}
            getTopCenterOptions={getTopCenterOptions}
            shouldDisableL1Cells={
              ENABLE_TOP_LEVEL_EDIT &&
              selectedRoqDateTab === "roq_receipt_date" &&
              selectedEditMode === "topline_edit"
            }
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
            }}
            selectedToggleOption={selectedToggleOption}
            isSizeView={selectedToggleOption === TOGGLE_OPTIONS[0].value}
            selectedRoqDateTab={selectedRoqDateTab}
            selectedHierarchyL0ForBudget={selectedHierarchyL0ForBudget}
          />
        </LoadingOverlay>
      </div>

      {openPackConfigDetailSheet && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={openPackConfigDetailSheet}
          setOpenPackConfigDetailSheet={setOpenPackConfigDetailSheet}
          l1DisplayName={l1DisplayName}
          activeChildHierarchyKey={activeChildHierarchyKey}
          productDescriptionName={productDescriptionName}
          activeChildHierarchyDescription={activeChildHierarchyDescription}
          packConfigDetailsPayloadData={packConfigDetailsPayloadData}
          screenName={"matrix_summary"}
        />
      )}
    </>
  );
});

export default EditChildHierarcyWrapper;
