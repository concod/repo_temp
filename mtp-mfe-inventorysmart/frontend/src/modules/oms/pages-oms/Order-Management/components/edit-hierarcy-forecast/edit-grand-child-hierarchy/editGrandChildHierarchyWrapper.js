import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { cloneDeep, isEmpty } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";

import {
  fetchEditGrandChildHierarchyData,
  fetchEditHierarchyGrandChildColumnData,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import {
  chartDataPayload,
  handleAppendResponse,
  getfetchEditHierarchyGrandChild,
  formattedAdjustedPayload,
  getAllRows,
  isNumber,
} from "../utils-matrix-summary/utilityFunctions";
import { useHistoricData } from "./useHistoricData";
import { NonMountChangeByParent } from "..";
import EditGrandChildHierarcy from ".";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getErrorHighlightCellStyle } from "../utils";
import { OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS } from "../constants";
import { OMS_ORDER_MANAGEMENT_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";

let scopedInitialData = {};

const EditGrandChildHierarcyWrapper = forwardRef((props, refs) => {
  let {
    node,
    setActiveL1,
    activeChildHierarchyKey,
    allowEdit,
    showIAData,
    id,
    setCounterOnEditHierarchyChange,
    lastEditedDrivers,
    isCalledFromMFPDashboard,
    selectedRowsFromMFP,
    disableAllowEditOnSave,
  } = props;

  let {
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
    SkuName,
    isCompareChanges,
    disableAllowEditOnSaveRef,
    selectedToggleOptionRef,
  } = refs;

  const [loaderCount, setLoaderCount] = useState(0);
  const [renderTable, setRenderTable] = useState(false);
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setRenderTable(true);
    }, 1000);
  }, [node.data.row]);

  const [columnDefs, setColumnDefs] = useState([]);
  const [editRowData, setEditRowData] = useState([]);
  const [isEditRowUpdated, setIsEditRowUpdated] = useState(false);

  const dispatch = useDispatch();

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

  const ENABLE_TOP_LEVEL_EDIT =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.enableTopLevelEdit ||
    false;
  const selectedRoqDateTab =
    OmsReducer?.highLevelSummaryState?.selectedRoqDateTab ||
    "roq_placement_date";
  const selectedEditMode =
    OmsReducer?.highLevelSummaryState?.selectedEditMode || "topline_edit";

  const userAccess = useSelector(
    (store) =>
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc
  );

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
  const { historicColumnData, historicRowData, tableLoader } = useHistoricData(
    activeChildHierarchyKey,
    node?.data?.row,
    columnDefs?.length && editRowData?.length,
    null,
    isCalledFromMFPDashboard
  );

  const isDataWeekLevel = matrixSummaryReducer?.displayDataToWeekLevel;
  const isCalenderDateApplied = matrixSummaryReducer?.isCalenderDateApplied;
  const fiscalWeekId = matrixSummaryReducer?.xAxisStaticDates;
  const isKpiValue = matrixSummaryReducer?.isKPIValue;
  const isPackId = matrixSummaryReducer?.isPackId;

  const packValue = matrixSummaryReducer?.packValue;
  const MatrixSummarySetAllApiSuccess =
    matrixSummaryReducer?.MatrixSummarySetAllApiSuccess;

  const TOGGLE_OPTIONS = useMemo(() => {
    const config =
      orderingScreensConfig?.oms_dashboard?.style_order_summary || {};

    // Helper to get left/right toggle values with fallback
    const getDefaultToggles = () => [
      config.toggle_value_left || OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[0],
      config.toggle_value_right || OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[1],
    ];

    return getDefaultToggles();
  }, [orderingScreensConfig]);

  useEffect(() => {
    //node here contains current L1 information
    editHierarchyChildInstance?.current?.api?.forEachNode((rowNode) => {
      if (node?.parent?.rowIndex !== rowNode?.rowIndex) {
        rowNode.setExpanded(false);
      }
    });
  }, []);

  const updateResponse = async (getAllWeeksResponse) => {
    const payload = chartDataPayload(
      matrixSummaryReducer,
      null,
      null,
      showIAData,
      isDataWeekLevel
    );

    const fetchColumnData = async () => {
      try {
        setIsEditRowUpdated(false);
        setLoaderCount((prevState) => prevState + 1);
        const editHierarchyGrandChildPayload = getfetchEditHierarchyGrandChild(
          payload,
          allowEdit,
          showIAData,
          matrixSummaryReducer
        );

        // Check access control: use new userAccess if available, otherwise fall back to old control
        const isUserHasEditAccess = !isEmpty(userAccess)
          ? canEdit
          : orderingAccessControl?.isEditButton?.isVisible;
        editHierarchyGrandChildPayload.allowEdit = isUserHasEditAccess;
        editHierarchyGrandChildPayload.selectedRoqDateTab = selectedRoqDateTab;

        let l2_data_type =
          matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.l2_data_type;

        const tableDetails =
          matrixSummaryReducer?.getTableName?.attribute_value;

        if (selectedToggleOptionRef.current === TOGGLE_OPTIONS[0].value) {
          editHierarchyGrandChildPayload.module = "DC";
          if (tableDetails?.left_toggle_l2_table_column) {
            editHierarchyGrandChildPayload.module =
              tableDetails.left_toggle_l2_table_column;
          }
        }

        if (selectedToggleOptionRef.current === TOGGLE_OPTIONS[1].value) {
          if (tableDetails?.right_toggle_l2_table_column) {
            editHierarchyGrandChildPayload.module =
              tableDetails.right_toggle_l2_table_column;
          }
        }

        const response = await fetchEditHierarchyGrandChildColumnData(
          editHierarchyGrandChildPayload,
          l2_data_type,
          matrixSummaryReducer,
          isL0SiblingsUnLockedForEmptyForecast,
          id,
          isPackId,
          packValue,
          matrixSummaryReducer.isKPIValue,
          matrixSummaryReducer.kpiValuesForLabel
        );
        if (isCalledFromMFPDashboard && editDisableInEditHeirarchy) {
          response?.map((data) => {
            data.is_editable = false;
          });
        }
        response?.map((data) => {
          if (data.sub_headers.length) {
            data.sub_headers.map((val) => {
              val.is_lockable = false;
            });
          }
        });
        setColumnDefs(response);
        setIsEditRowUpdated(true);
      } catch (error) {
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    await fetchColumnData();

    let l1name = node?.data?.row || node?.data?.aggr_column;

    // if (allEditedGrandChildRowData.current[node.data.row]) {
    //   setEditRowData(allEditedGrandChildRowData.current[node.data.row]);
    //   setActiveL1(l1name);
    //   return;
    // }

    const fetchRowData = async () => {
      try {
        setLoaderCount((prevState) => prevState + 1);
        if (isCalledFromMFPDashboard) {
          payload.filters.mfp = true;
          payload.filters.mfp_flag = selectedRowsFromMFP[0]?.flag;
          payload.filters.product_hierarchy[Mfp_Key] = [
            selectedRowsFromMFP[0]?.choice,
          ];
          payload.filters.store_hierarchy.channel = [
            selectedRowsFromMFP[0]?.channel,
          ];
        }
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

        const appliedOMSFilters = cloneDeep(
          JSON.parse(localStorage.getItem("selectedFiltersDependency"))
        );

        if (selectedToggleOptionRef.current === TOGGLE_OPTIONS[0].value) {
          payload.order_by = "size";
          payload.aggregation_type = "channel";
        }

        const response = await fetchEditGrandChildHierarchyData(
          payload,
          activeChildHierarchyKey,
          l1name,
          localStorage.getItem("isRedirectedFromDashboardToOms")
            ? mergeOmsDcIntoFilters(appliedOMSFilters, OmsReducer.selectedDcs)
            : OmsReducer.selectedFilters,
          isKpiValue,
          OmsReducer,
          isPackId,
          packValue,
          selectedRoqDateTab
        );

        let levelCount = 0;
        if (!isPredictedDataFetched) {
          response.forEach((elem) => {
            let predictedFiscalWeeks =
              matrixSummaryReducer?.xAxisStaticDates?.fiscal_ids || [];
            for (let week of predictedFiscalWeeks)
              if (!elem[week]) {
                elem[week] = {
                  IA: null,
                  adjusted: null,
                  level_count: levelCount,
                  user_profile: elem.user_profile,
                };
              } else {
                if (!levelCount) {
                  levelCount = elem[week]["level_count"];
                }
              }
          });
        }
        // if parent edited, before child mount

        const transformedData = response.map((item) => {
          const { fiscal_week, aggr_column } = item;
          const transformedWeekData = {};

          for (const week in fiscal_week) {
            const orderQuantity = fiscal_week[week].order_quantity;
            const Kpi = fiscal_week[week]?.kpi;
            const originalOrderQuantity =
              fiscal_week[week]?.order_quantity_original;
            const flag = fiscal_week[week]?.flag;
            const orderQuantityEaches =
              fiscal_week[week]?.order_quantity_eaches;
            const distributionPct = fiscal_week[week]?.distribution_pct;

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
              };
            } else {
              if (!levelCount) {
                levelCount = elem[week]["level_count"];
              }
            }
          }
        });

        let updatedDataNonMountChangeByParent = NonMountChangeByParent(
          editHierarchyChildInstance,
          node.data.row,
          transformedData,
          editHierarchyInstance,
          editHierarchyTotalRowInstance,
          activeChildHierarchyKey,
          matrixSummaryReducer?.clientConfig?.attribute_value
            ?.user_profile_enabled,
          isL0SiblingsUnLockedForEmptyForecast
        );
        const updatedEditGrandChildHierarchy = getAllRows(
          editHierarchyGrandChildInstance
        );

        const updatedResponse = handleAppendResponse(
          updatedEditGrandChildHierarchy,
          updatedDataNonMountChangeByParent
        );

        scopedInitialData[node.data.row] = cloneDeep(updatedResponse);
        setEditRowData(updatedResponse);
        setActiveL1(l1name);
        setIsPredictedDataFetched(true);
        if (editHierarchyGrandChildInstance?.current?.api) {
          editHierarchyGrandChildInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
          });
        }
      } catch (error) {
        console.log("ss", error);
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    await fetchRowData();
  };

  // useEffect(() => {
  //   updateResponse();
  // }, [lastEditedDrivers]);

  useEffect(() => {
    updateResponse();
  }, [isDataWeekLevel, isCalenderDateApplied, isKpiValue]);

  useEffect(() => {
    if (!MatrixSummarySetAllApiSuccess) {
      return;
    }
    updateResponse();
  }, [MatrixSummarySetAllApiSuccess]);

  useEffect(() => {
    if (!matrixSummaryReducer?.[id]) {
      return;
    }
    updateResponse(true);
  }, [matrixSummaryReducer?.[id]]);

  useEffect(() => {
    if (!historicColumnData?.length || !editRowData?.length) return;
    for (let i in editRowData) {
      if (historicRowData?.length) {
        let getHistoricOfCurrentFiscal =
          historicRowData?.find((elem) => {
            return elem?.row === editRowData[i]?.row;
          }) || {};
        if (!isEmpty(getHistoricOfCurrentFiscal)) {
          Object.assign(editRowData[i], getHistoricOfCurrentFiscal);
        }
      }
    }
    editHierarchyGrandChildInstance.current.api.setRowData(editRowData);

    editHierarchyGrandChildInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [historicRowData, historicColumnData]);

  useEffect(() => {
    // on unmount, save edited data in local variable

    let currentKey = activeChildHierarchyKey;
    let editedGrandChildRowData = allEditedGrandChildRowData?.current;
    let editedGrandChildRowMapping = allEditedGrandChildRowMapping?.current;
    return () => {
      if (allowEdit) {
        let lastEditedData = [];
        editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
          lastEditedData.push(node.data);
        });

        if (lastEditedData.length && editedGrandChildRowData) {
          editedGrandChildRowData[node.data.row] = lastEditedData;
        }

        let currentHierarchyValue =
          editedGrandChildRowMapping?.[currentKey] || {};
        if (editedGrandChildRowMapping) {
          editedGrandChildRowMapping[currentKey] = {
            ...currentHierarchyValue,
            [node.data.row]: node.data.row,
          };
        }
      }
    };
  }, []);

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
              if (cols[index].sub_headers?.length) {
                cols[index].sub_headers[0].cellStyle = function (params) {
                  if (params?.data[key]?.isGreyOut) {
                    return {
                      backgroundColor: "#C3C8D4",
                      colour: "#C3C8D4",
                    };
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

  return (
    <LoadingOverlay
      loader={loaderCount || tableLoader}
      isCustomLoader={true}
      wrapperPosition="static"
    >
      {renderTable ? (
        <EditGrandChildHierarcy
          id={id}
          node={node}
          columnDefs={columnDefs}
          editRowData={editRowData}
          historicColumnData={
            isCalledFromMFPDashboard ? [] : historicColumnData
          }
          activeChildHierarchyKey={activeChildHierarchyKey}
          setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
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
            SkuName,
            isCompareChanges,
          }}
          scopedInitialData={scopedInitialData}
          selectedRowsFromMFP={selectedRowsFromMFP}
          isCalledFromMFPDashboard={isCalledFromMFPDashboard}
          shouldDisableL2Cells={
            ENABLE_TOP_LEVEL_EDIT &&
            selectedRoqDateTab === "roq_receipt_date" &&
            selectedEditMode === "topline_edit"
          }
        />
      ) : null}
    </LoadingOverlay>
  );
});

export default EditGrandChildHierarcyWrapper;
