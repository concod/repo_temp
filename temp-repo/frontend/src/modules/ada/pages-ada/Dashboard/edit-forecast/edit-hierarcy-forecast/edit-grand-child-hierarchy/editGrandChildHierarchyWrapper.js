import React, { forwardRef, useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import {
  fetchEditGrandChildHierarchyData,
  fetchEditHierarchyGrandChildColumnData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  handleAppendResponse,
  getfetchEditHierarchyGrandChild,
  getEditForecastRowData,
  getAllRows,
} from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useHistoricData } from "./useHistoricData";
import { cloneDeep, isEmpty } from "lodash";
import { NonMountChangeByParent } from "..";
import EditGrandChildHierarcy from ".";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  DISABLING_EDIT_HIERARCHY_MESSAGE,
  KEYS_USED_OTHER_THAN_FISCAL_WEEK,
} from "modules/ada/constants-ada/stringContants";

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

  const { historicColumnData, historicRowData, tableLoader } = useHistoricData(
    activeChildHierarchyKey,
    node?.data?.row,
    columnDefs?.length && editRowData?.length,
    null,
    isCalledFromMFPDashboard
  );

  useEffect(() => {
    //node here contains current L1 information
    editHierarchyChildInstance?.current?.api?.forEachNode((rowNode) => {
      if (node?.parent?.rowIndex !== rowNode?.rowIndex) {
        rowNode.setExpanded(false);
      }
    });
  }, []);

  const updateResponse = async (getAllWeeksResponse) => {
    const payload = chartDataPayload(adaReducer, null, null, showIAData);

    const fetchColumnData = async () => {
      try {
        setIsEditRowUpdated(false);
        setLoaderCount((prevState) => prevState + 1);
        const editHierarchyGrandChildPayload = getfetchEditHierarchyGrandChild(
          payload,
          allowEdit,
          showIAData,
          adaReducer
        );
        let l2_data_type =
          adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
            ?.l2_data_type;
        const response = await fetchEditHierarchyGrandChildColumnData(
          editHierarchyGrandChildPayload,
          l2_data_type,
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
        setIsEditRowUpdated(true);
      } catch (error) {
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    fetchColumnData();

    let l1name = node?.data?.row;

    if (allEditedGrandChildRowData.current[node.data.row]) {
      setEditRowData(allEditedGrandChildRowData.current[node.data.row]);
      setActiveL1(l1name);
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
        const response = await fetchEditGrandChildHierarchyData(
          editForeCastPayload,
          activeChildHierarchyKey,
          l1name,
          adaReducer
        );

        let levelCount = 0;
        if (!isPredictedDataFetched) {
          response.forEach((elem) => {
            let predictedFiscalWeeks =
              adaReducer?.xAxisStaticDates?.fiscal_ids || [];
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

        let updatedDataNonMountChangeByParent = NonMountChangeByParent(
          editHierarchyChildInstance,
          node.data.row,
          response,
          editHierarchyInstance,
          editHierarchyTotalRowInstance,
          activeChildHierarchyKey,
          adaReducer?.clientConfig?.attribute_value?.user_profile_enabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W",
          isL0SiblingsUnLockedForEmptyForecast
        );
        const updatedEditGrandChildHierarchy = getAllRows(
          editHierarchyGrandChildInstance
        );

        const updatedResponse = handleAppendResponse(
          updatedEditGrandChildHierarchy,
          updatedDataNonMountChangeByParent
        );

        if (isCalledFromMFPDashboard) {
          updatedResponse.forEach((data) => {
            data.isFixedLocked = true;
            data.defaultShowLock = true;
            // Object.keys(data).map((key) => {
            //   if (typeof data[key] === "object") {
            //     data[key]["isLocked"] = true;
            //   }
            // });
          });
        }
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
    fetchRowData();
  };

  useEffect(() => {
    updateResponse();
  }, [lastEditedDrivers]);

  useEffect(() => {
    if (!adaReducer?.[id]) {
      return;
    }
    updateResponse(true);
  }, [adaReducer?.[id]]);

  useEffect(() => {
    if (!editRowData?.length) return;
    updateResponse(true);
  }, [adaReducer?.isEligible]);

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

  //Edge Case : When forecast is unavailable, Edit Hierarchy is set as Non Editable Cell
  useEffect(() => {
    if (!isEditRowUpdated) return;
    if (columnDefs?.length && editRowData?.length) {
      try {
        let cols = cloneDeep(columnDefs);
        let isUpdated = false;
        editRowData?.map((row) => {
          for (const key in row) {
            if (
              !KEYS_USED_OTHER_THAN_FISCAL_WEEK.includes(key) &&
              (row[key].IA === null || row[key].IA === undefined)
            ) {
              let columnId = `${key}.adjusted`;
              let index = cols.findIndex((col) => col.id === columnId);
              if (index >= 0) {
                isUpdated = true;
                cols[index].is_editable = true;
                cols[index].disabled = true;
                cols[index].is_disabled = true;
                cols[index].extra = {
                  ...cols[index].extra,
                  staticToolTip: DISABLING_EDIT_HIERARCHY_MESSAGE,
                };
              }
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
        />
      ) : null}
    </LoadingOverlay>
  );
});

export default EditGrandChildHierarcyWrapper;
