import { makeStyles } from "@mui/styles";
import { cloneDeep, isEmpty } from "lodash";
import {
  fetchEditHierarchyColumnData,
  fetchEditHierarchyData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  handleTotalRow,
  isNumber,
  getEditHierarchyPayload,
  updateAllForecastMultiplier,
  handleAppendResponse,
  getEditForecastRowData,
  getAllRows,
  checkIfForecastIsEmpty,
  updateColumnValue,
  disableEditableColsWithZeroTotal,
  handlePredictedTimePeriod,
} from "modules/ada/utils-ada/utilityFunctions";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useHistoricData } from "./useHistoricData";
import EditHierarcy from ".";
import {
  DISABLING_ZERO_TOTAL_ROW,
  KEYS_USED_OTHER_THAN_FISCAL_WEEK,
} from "modules/ada/constants-ada/stringContants";
import { useTranslation } from "impact-ui-v3";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import colours from "core/Styles/colours";
import { useLoading } from "../../../LoaderWrapper";

const EditHierarcyWrapper = (props, ref) => {
  const { t } = useTranslation();
  const {
    activeKey,
    setActiveChildHierarchyKey,
    allowEdit,
    allowL0Edit,
    showIAData,
    id,
    setCounterOnEditHierarchyChange,
    lastEditedDrivers,
    isCalledFromMFPDashboard,
    selectedRowsFromMFP,
    activeChildHierarchyKey,
    disableAllowEditOnSave,
    selectedCompareWith,
    isL0TableHidden,
  } = props;

  const dispatch = useDispatch();

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
  } = ref;

  const { historicColumnData, historicRowData, tableLoader } = useHistoricData(
    showIAData,
    isCalledFromMFPDashboard,
    selectedCompareWith
  );

  const [loaderCount, setLoaderCount] = useState(0);
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);

  const [columnDefs, setColumnDefs] = useState([]);
  const [totalColumnDefs, setTotalColumnDefs] = useState([]);
  const [editRowData, setEditRowData] = useState([]);
  const [totalRowData, setTotalRowData] = useState([]);
  const [isEditRowUpdated, setIsEditRowUpdated] = useState(false);
  let disabledTotalColumns = useRef([]);
  const isMountedForSaveEffect = useRef(false);

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const { loading } = useLoading();

  var Mfp_Key =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp?.mfp_level;

  var editDisableInEditHeirarchy =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;

  const isL0SiblingsUnLockedForEmptyForecast =
    adaReducer?.clientConfig?.attribute_value?.empty_forecast_features
      ?.is_l0_siblings_unLocked;

  const showNullValuesforEmptyForecast =
    adaReducer?.clientConfig?.attribute_value?.empty_forecast_features
      ?.show_null_for_total_forecast;

  const editHierarchyActionMap = (key) => ({
    [key]: (el) => {
      // the total row is getting generated on the frontend, kept id i.e. row as total
      if (el.row === "total") return;
      setActiveChildHierarchyKey(el["row"]);
      // Keeping id in ref as well, as Ag grid does not give access to any other state, after getting mounted
      currentHierarchyKey.current = el.row;
    },
  });

  const updateResponse = async (getAllWeeksResponse) => {
    const payload = chartDataPayload(adaReducer, null, null, id === "IA");

    const fetchColumnData = async () => {
      try {
        setLoaderCount((prevState) => prevState + 1);
        const editHierarchyPayload = getEditHierarchyPayload(
          payload,
          editHierarchyActionMap,
          allowEdit,
          showIAData,
          adaReducer
        );
        if (isCalledFromMFPDashboard) {
          editHierarchyPayload["isCalledFromMFPDashboard"] = true;
        }
        if (allowL0Edit) {
          editHierarchyPayload["allowL0Edit"] = true;
        }

        const l0_data_type =
          adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
            ?.l0_data_type;

        const response = await fetchEditHierarchyColumnData(
          editHierarchyPayload,
          l0_data_type,
          adaReducer,
          isL0SiblingsUnLockedForEmptyForecast,
          id,
          selectedCompareWith
        );

        if (isCalledFromMFPDashboard && editDisableInEditHeirarchy) {
          response?.map((data) => {
            data.is_editable = false;
          });
          if (isCalledFromMFPDashboard) {
            response?.map((data) => {
              if (
                data?.accessor === "l0_name" ||
                data.column_name === "l6_id"
              ) {
                data.label = "Choice";
                data.headerClass = "Choice";
                data.headerName = "Choice";
                data.headerTooltip = "Choice";
              }
              if (data?.column_name === "l6_name") {
                data.label = "Choice Description";
                data.headerClass = "Choice Description";
                data.headerName = "Choice Description";
                data.headerTooltip = "Choice Description";
              }
              // data.is_editable = true;
              data.is_lockable = true;
            });
          }
        }
        setColumnDefs(response);
      } catch (error) {
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    fetchColumnData();

    const fetchRowData = async () => {
      try {
        setLoaderCount((prevState) => prevState + 1);
        let [editForeCastPayload] = getEditForecastRowData(
          payload,
          adaReducer,
          getAllWeeksResponse,
          lastEditedDrivers,
          isPredictedDataFetched,
          isCalledFromMFPDashboard,
          selectedRowsFromMFP
        );
        const data = await fetchEditHierarchyData(
          cloneDeep(editForeCastPayload),
          adaReducer,
          selectedCompareWith
        );

        let levelCount = 0;
        if (!isPredictedDataFetched) {
          data.forEach((elem) => {
            let predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);
            for (let week of predictedFiscalWeeks)
              if (!elem[week]) {
                elem[week] = {
                  IA: null,
                  adjusted: null,
                  level_count: levelCount,
                };
              } else {
                if (!levelCount) {
                  levelCount = elem[week]["level_count"];
                }
              }
          });
        }
        const updatedEditHierarchy = getAllRows(editHierarchyInstance);

        const updatedResponse = handleAppendResponse(
          updatedEditHierarchy,
          data
        );
        if (isCalledFromMFPDashboard) {
          updatedResponse.forEach((data) => {
            data.isFixedLocked = true;
            data.defaultShowLock = true;
            Object.keys(data).map((key) => {
              if (typeof data[key] === "object") {
                data[key]["isLocked"] = true;
              }
            });
          });
        }
        setEditRowData(updatedResponse);

        setIsPredictedDataFetched(true);

        initialEditRowData.current = cloneDeep(updatedResponse);
        editHierarchyInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } catch (error) {
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    fetchRowData();
  };

  useEffect(() => {
    setTotalRowData([]);
    if (!adaReducer?.tableColumns?.detail_table_1?.length) return;

    updateResponse();
  }, [
    lastEditedDrivers,
    JSON.stringify(adaReducer?.tableColumns?.detail_table_1),
    selectedCompareWith?.value,
  ]);

  useEffect(() => {
    if (!isMountedForSaveEffect.current) {
      isMountedForSaveEffect.current = true;
      return;
    }
    if (!activeKey || !adaReducer?.[id]) return;

    // if forecast is saved in Adjusted Tab, then fetch data in scenario 1 tab for all the weeks and vice versa
    updateResponse(true);
  }, [adaReducer?.[id]]);

  useEffect(() => {
    if (!activeKey || !editRowData?.length) return;
    updateResponse(true);
  }, [adaReducer?.isEligible]);

  useEffect(() => {
    if (!columnDefs?.length || !editRowData?.length) return;
    setIsEditRowUpdated(false);

    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;
    const predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);

    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      null,
      editHierarchyTotalRowInstance,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast,
      useAdjustedUserForecastBase,
      predictedFiscalWeeks,
      selectedCompareWith
    );
    if (isCalledFromMFPDashboard) {
      getTotalRowData.forEach((data) => {
        data.isFixedLocked = true;
        data.defaultShowLock = true;
        Object.keys(data).map((key) => {
          if (typeof data[key] === "object") {
            data[key]["isLocked"] = true;
          }
        });
      });
    }
    setTotalRowData(getTotalRowData);

    initialTotalRowData.current = cloneDeep(getTotalRowData);

    let totalRowData = getTotalRowData?.[0];

    updateAllForecastMultiplier(totalRowData, id, dispatch, adaReducer);

    setIsEditRowUpdated(true);
  }, [columnDefs, editRowData]);

  useEffect(() => {
    if (
      !historicColumnData?.length ||
      !editRowData?.length ||
      !totalRowData?.length
    )
      return;

    setIsEditRowUpdated(false);

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

    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;
    const predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);
    editHierarchyInstance.current.api.setRowData(editRowData);
    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      null,
      null,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast,
      useAdjustedUserForecastBase,
      predictedFiscalWeeks,
      selectedCompareWith
    );
    setTotalRowData(getTotalRowData);
    initialTotalRowData.current = cloneDeep(getTotalRowData);
    updateAllForecastMultiplier(getTotalRowData[0], id, dispatch, adaReducer);

    editHierarchyInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
    editHierarchyTotalRowInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });

    setIsEditRowUpdated(true);
  }, [historicRowData, totalRowData?.length, historicColumnData]);

  //Edge Case : When forecast is unavailable, Edit Hierarchy is set as Non Editable Cell
  useEffect(() => {
    if (!isEditRowUpdated) return;
    if (columnDefs?.length && editRowData?.length) {
      try {
        let cols = cloneDeep(columnDefs);
        let columnsToDisable = [];
        let isUpdated = false;
        let columns = {};

        editRowData?.map((row) => {
          for (const key in row) {
            if (checkIfForecastIsEmpty(key, row)) {
              let columnId = `${key}.adjusted`;
              let index = cols.findIndex((col) => col.id === columnId);

              if (index >= 0) {
                if (isL0SiblingsUnLockedForEmptyForecast) {
                  if (!columnsToDisable.includes(key)) {
                    columnsToDisable.push(key);
                  }

                  isUpdated = true;

                  cols[index].cellStyle = function (params) {
                    if (params?.value === null || params?.value === undefined) {
                      return {
                        background: colours.white,
                        cursor: "default",
                      };
                    }
                    return null;
                  };
                  cols[index].extra = {
                    ...cols[index].extra,
                    staticToolTip: t(
                      "ada.editHierarchy.disablingEditHierarchyMessage"
                    ),
                  };
                } else {
                  isUpdated = true;
                  cols[index].is_editable = true;
                  // cols[index].disabled = true;
                  // cols[index].is_disabled = true;
                  cols[index].extra = {
                    ...cols[index].extra,
                    staticToolTip: t(
                      "ada.editHierarchy.disablingEditHierarchyMessage"
                    ),
                  };
                }
              }
            }
            updateColumnValue(
              columns,
              key,
              row,
              handlePredictedTimePeriod(adaReducer)
            );
          }
        });

        let l0SumZeroFound = false;

        l0SumZeroFound = disableEditableColsWithZeroTotal(
          cols,
          columns,
          t("ada.editHierarchy.disablingZeroTotalRow")
        );

        let updatedColumns = agGridColumnFormatter(cols);
        const updatedData = updatedColumns.map((column, i) => ({
          ...column,
          cellRenderer: columnDefs[i].cellRenderer,
        }));
        if (isUpdated) {
          setColumnDefs(updatedData);
        }
        if (columnsToDisable.length > 0) {
          disabledTotalColumns.current = [...columnsToDisable];
        }
        if (l0SumZeroFound) {
          setTotalColumnDefs(updatedData);
        }
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  }, [editRowData, isEditRowUpdated]);

  useEffect(() => {
    let cols = cloneDeep(columnDefs);

    cols.forEach((elem, i) => {
      if (i === 0) return elem;
      elem.cellStyle = {
        ...elem.cellStyle,
        pointerEvents: loading ? "none" : "all",
      };
    });

    let updatedColumns = agGridColumnFormatter(cols);
    const updatedData = updatedColumns.map((column, i) => ({
      ...column,
      cellRenderer: columnDefs[i].cellRenderer,
      pointerEvents: loading ? "none" : "all",
    }));
    setColumnDefs(updatedData);
  }, [loading, columnDefs?.length]);

  useEffect(() => {
    if (
      isL0TableHidden &&
      !isCalledFromMFPDashboard &&
      editRowData?.length > 0 &&
      !activeChildHierarchyKey
    ) {
      const firstRow = editRowData[0];
      if (firstRow?.row) {
        setActiveChildHierarchyKey(firstRow.row);
        currentHierarchyKey.current = firstRow.row;
      }
    }
  }, [editRowData, isL0TableHidden, activeChildHierarchyKey]);

  useEffect(() => {
    if (!columnDefs?.length) return;
    setTimeout(() => {
      editHierarchyInstance?.current?.api?.sizeColumnsToFit();
      editHierarchyTotalRowInstance?.current?.api?.sizeColumnsToFit();
    }, 0);
  }, [columnDefs?.length, activeChildHierarchyKey, editRowData, historicColumnData]);

  return (
    <>
      <LoadingOverlay
        loader={loaderCount || tableLoader}
        isCustomLoader={true}
        wrapperPosition="static"
      >
        <EditHierarcy
          id={id}
          isL0TableHidden={isCalledFromMFPDashboard ? false : isL0TableHidden}
          activeKey={activeKey}
          columnDefs={columnDefs}
          totalColumnDefs={totalColumnDefs}
          editRowData={editRowData}
          totalRowData={totalRowData}
          disabledTotalColumns={disabledTotalColumns}
          activeChildHierarchyKey={activeChildHierarchyKey}
          historicColumnData={
            isCalledFromMFPDashboard ? [] : historicColumnData
          }
          setIsEditRowUpdated={setIsEditRowUpdated}
          isCalledFromMFPDashboard={isCalledFromMFPDashboard}
          setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
          getTopRightOptions={props.getTopRightOptions}
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
          }}
        />
      </LoadingOverlay>
    </>
  );
};

export default forwardRef(EditHierarcyWrapper);
