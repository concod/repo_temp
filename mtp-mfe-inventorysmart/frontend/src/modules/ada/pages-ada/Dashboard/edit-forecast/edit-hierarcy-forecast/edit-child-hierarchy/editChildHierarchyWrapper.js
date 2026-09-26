import React, { forwardRef, useEffect, useState, useRef } from "react";
import { makeStyles } from "@mui/styles";
import {
  fetchEditHierarchyChildColumnData,
  fetchEditChildHierarchyData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  handleAppendResponse,
  handleTotalRow,
  isNumber,
  getEditHierarchyChildPayload,
  getAllRows,
  getEditForecastRowData,
} from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import { useHistoricData } from "./useHistoricData";
import { NonMountChangeByParent } from "..";
import "./style.scss";
import EditChildHierarcy from ".";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  DISABLING_EDIT_HIERARCHY_MESSAGE,
  KEYS_USED_OTHER_THAN_FISCAL_WEEK,
  DISABLING_ZERO_TOTAL_ROW,
} from "modules/ada/constants-ada/stringContants";
import colours from "core/Styles/colours";
import { useLoading } from "../../../LoaderWrapper";
import { Button } from "impact-ui-v3";
import CLOSE_ICON from "assets/closeIcon.svg";
import { Tooltip } from "impact-ui-v3";
import {
  disableEditableColsWithZeroTotal,
  updateColumnValue,
} from "modules/ada/utils-ada/utilityFunctions";

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
    currentChildHierarchyKey,
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
    setRefreshAllEditHierarchy,
    setSelectedForecast,
  } = props;

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const { loading } = useLoading();

  // detail cell renderer doesn't support state on the fly, hence copying
  //  driverForecastVal in driverForecastValRef && driverForecastAllVal in driverForecastAllValRef
  // let lastEditedDriversRef = useRef(null);

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
  const [totalColumnDefs, setTotalColumnDefs] = useState([]);
  let disabledTotalColumns = useRef([]);

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const Mfp_Key =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp?.mfp_level;
  const editDisableInEditHeirarchy =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;
  const isL0SiblingsUnLockedForEmptyForecast =
    adaReducer?.clientConfig?.attribute_value?.empty_forecast_features
      ?.is_l0_siblings_unLocked;
  const showNullValuesforEmptyForecast =
    adaReducer?.clientConfig?.attribute_value?.empty_forecast_features
      ?.show_null_for_total_forecast;

  const l1DisplayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l1?.display_name ||
    adaReducer?.tenantFilters?.l1?.display_name;
  const l2DisplayName =
    adaReducer?.tenantFilters?.view_edit_hierarchy_filters?.l2?.display_name ||
    adaReducer?.tenantFilters?.l2?.display_name;

  const updateResponse = async (getAllWeeksResponse) => {
    const payload = chartDataPayload(
      adaReducer,
      driverForecastAllVal?.[0],
      null,
      showIAData,
      driverForecastAllVal?.[1]
    );

    const fetchColumnData = async () => {
      try {
        setLoaderCount((prevState) => prevState + 1);
        const editHierarchyChildPayload = getEditHierarchyChildPayload(
          payload,
          allowEdit,
          showIAData,
          adaReducer
        );

        let l1_data_type =
          adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
            ?.l1_data_type;

        const response = await fetchEditHierarchyChildColumnData(
          editHierarchyChildPayload,
          l1_data_type,
          adaReducer,
          isL0SiblingsUnLockedForEmptyForecast,
          id
        );

        if (isCalledFromMFPDashboard && editDisableInEditHeirarchy) {
          response?.map((data) => {
            data.is_editable = false;
          });
        }

        setColumnDefs(response);
      } catch (error) {
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    fetchColumnData();

    if (
      allEditedChildRowData.current[activeChildHierarchyKey] &&
      !isCalledFromMFPDashboard
    ) {
      setEditRowData(allEditedChildRowData.current[activeChildHierarchyKey]);
      return;
    }

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

        if (isCalledFromMFPDashboard) {
          editForeCastPayload.filters.product_hierarchy[Mfp_Key] = [
            selectedRowsFromMFP[0]?.choice,
          ];
          editForeCastPayload.filters.store_hierarchy.channel = [
            selectedRowsFromMFP[0]?.channel,
          ];

          editForeCastPayload.filters.mfp = true;
          editForeCastPayload.filters.mfp_flag = selectedRowsFromMFP[0]?.flag;
        }

        const data = await fetchEditChildHierarchyData(
          editForeCastPayload,
          activeChildHierarchyKey,
          adaReducer
        );

        let levelCount = 0;
        if (!isPredictedDataFetched) {
          data.forEach((elem) => {
            let predictedFiscalWeeks =
              adaReducer?.xAxisStaticDates?.fiscal_ids || [];
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
        const updatedEditChildHierarchy = getAllRows(
          editHierarchyChildInstance
        );

        const updatedResponse = handleAppendResponse(
          updatedEditChildHierarchy,
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

        setIsPredictedDataFetched(true);

        let useAdjustedUserForecastBase =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.use_adjusted_user_forecast_base;

        // if parent edited, before child mount
        let updatedData = NonMountChangeByParent(
          editHierarchyInstance,
          activeChildHierarchyKey,
          updatedResponse,
          editHierarchyTotalRowInstance,
          null,
          "total",
          null,
          isL0SiblingsUnLockedForEmptyForecast,
          useAdjustedUserForecastBase
        );

        setEditRowData(updatedData);
        initialEditChildRowData.current[activeChildHierarchyKey] = cloneDeep(
          updatedData
        );

        editHierarchyChildInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } catch (error) {
        console.log("Error in Fetching Row Data", error);
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    fetchRowData();
  };

  useEffect(() => {
    if (!activeKey || !activeChildHierarchyKey) return;
    updateResponse();
  }, [lastEditedDrivers, activeKey, activeChildHierarchyKey]);

  useEffect(() => {
    if (!activeKey || !activeChildHierarchyKey || !adaReducer?.[id]) return;
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

    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      activeChildHierarchyKey,
      null,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast,
      useAdjustedUserForecastBase
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
    editHierarchyChildInstance.current.api.setRowData(editRowData);

    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;

    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      activeChildHierarchyKey,
      null,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast,
      useAdjustedUserForecastBase
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
  useEffect(() => {
    if (!totalRowData?.length) return;

    let lockedCellNode = editHierarchyInstance?.current?.api?.getRowNode(
      activeChildHierarchyKey
    );
    let lockedTotalCellNode = editHierarchyChildTotalRowInstance?.current?.api?.getRowNode(
      "total"
    );

    for (let [fiscalDataKey, fiscalData] of Object.entries(
      lockedCellNode?.data || {}
    )) {
      if (fiscalDataKey && isNumber(fiscalDataKey)) {
        const isLocked = fiscalData.isLocked;
        totalRowData[0][fiscalDataKey] = {
          ...totalRowData[0][fiscalDataKey],
          isLocked,
        };
        if (lockedTotalCellNode?.data[fiscalDataKey]) {
          lockedTotalCellNode.data[fiscalDataKey].isLocked = isLocked;
        }
      }
    }
  }, [totalRowData]);

  const checkIfForecastIsEmpty = (key, data) => {
    return (
      !KEYS_USED_OTHER_THAN_FISCAL_WEEK.includes(key) &&
      (data[key].IA === null || data[key].IA === undefined)
    );
  };

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
                    staticToolTip: DISABLING_EDIT_HIERARCHY_MESSAGE,
                  };
                } else {
                  isUpdated = true;
                  cols[index].is_editable = true;
                  // cols[index].disabled = true;
                  // cols[index].is_disabled = true;
                  cols[index].extra = {
                    ...cols[index].extra,
                    staticToolTip: DISABLING_EDIT_HIERARCHY_MESSAGE,
                  };
                }
              }
              updateColumnValue(columns, key, row);
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
          if (columnsToDisable.length > 0) {
            disabledTotalColumns.current = [...columnsToDisable];
          }
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

  return (
    <>
      <div className={classes.labelContainer}>
        <span>
          {`${l1DisplayName} ${l2DisplayName ? "and" : ""} ${l2DisplayName}`}
        </span>
        <Tooltip title="Close" placement="top" variant="tertiary">
          <Button
            className={classes.hideLabel}
            disabled={loading}
            onClick={() => {
              currentHierarchyKey.current = null;
              setActiveChildHierarchyKey(null);
            }}
            size="large"
            icon={<CLOSE_ICON />}
            iconPlacement="left"
            variant="text"
          >
            {/* Hide{" "}
          {`${l1DisplayName} ${l2DisplayName ? "and" : ""} ${l2DisplayName}`} */}
          </Button>
        </Tooltip>
      </div>
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
          totalColumnDefs={totalColumnDefs}
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
          setRefreshAllEditHierarchy={setRefreshAllEditHierarchy}
          setSelectedForecast={setSelectedForecast}
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
            currentChildHierarchyKey,
            allEditedChildRowData,
            allEditedGrandChildRowMapping,
            SkuName,
            isCompareChanges,
            disableAllowEditOnSaveRef,
          }}
        />
      </LoadingOverlay>
    </>
  );
});

export default EditChildHierarcyWrapper;

const useStyles = makeStyles((theme) => ({
  labelContainer: {
    display: "flex",
    justifyContent: "space-between",
    margin: "20px 0",
    "& span": {
      fontWeight: 600,
    },
  },

  hideLabel: {
    transform: "translateX(-25px)",
    cursor: "pointer",
    "& div.ia-btn-icon": {
      marginLeft: "-3px",
      marginBottom: "6px",
    },
  },
}));
