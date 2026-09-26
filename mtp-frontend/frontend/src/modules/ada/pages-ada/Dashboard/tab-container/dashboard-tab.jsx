import React, { forwardRef, useEffect, useRef, useState } from "react";
import DriverForecastTable from "../driver-forecast-table";
import DriverSignificance from "../driver-significance-table";
import EditForecast from "../edit-forecast";
import ChartContainer from "../chart";
import { useSelector } from "react-redux";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  FORECAST_SAVE_STATUS,
  removeUnwantedFiscalDataKeys,
} from "modules/ada/utils-ada/utilityFunctions";

const DashboardTab = forwardRef((props, ref) => {
  const {
    tabKey,
    activeKey,
    allowEdit = true,
    allowL0Edit = true,
    showIAData = false,
    showDriverForecast = true,
    showDriverSignificance = false,
    showDriverRank = false,
    showOriginalIAForecast,
    tab,
    selectedForecast,
    setSelectedForecast,
    activeTab,
    index,
    isComparisonTabMounted,
    setSavePerformedTab,
    setDeepDiveTabChanged,
    disableAllowEditOnSave,
    resetDriversCounter,
    setActiveKey,
    setActiveTransactionData,
    activeTransactionData,
  } = props;

  let {
    saveApiCountRef,
    isSaveInProgressRef,
    disableAllowEditOnSaveRef,
    timeoutRef,
    isViewEditHierarchyMountedRef,
  } = ref;

  let currentHierarchyKey = useRef(null);
  let currentChildHierarchyKey = useRef(null);
  let forecastMultiplierInstance = useRef({});
  let editHierarchyInstance = useRef({});
  let editHierarchyTotalRowInstance = useRef({});
  let editHierarchyChildInstance = useRef({});
  let editHierarchyGrandChildInstance = useRef({});
  let editHierarchyChildTotalRowInstance = useRef({});
  let editChildRowData = useRef({});
  let allEditedChildRowData = useRef({});
  let initialEditRowData = useRef({});
  let initialTotalRowData = useRef({});
  let initialEditChildRowData = useRef({});
  let allEditedGrandChildRowData = useRef({});
  const channelsRef = useRef([]);
  //allEditedGrandChildRowMapping could be managed with allEditedGrandChildRowData
  // for readability created mapping ref b/w edited L1 & L2
  let allEditedGrandChildRowMapping = useRef({});

  let lastEditedDriversRef = useRef([]);
  let onSaveRef = useRef(null);

  const editHierarchyForecastSave = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.editHierarchyForecastSave
  );

  // let isTabMounted = useRef({});

  // to trigger api calls on change in driver forecast
  // could have been handle with only setDriverForecastVal
  // However, for readability and to avoid unnecessary condition keeping two states
  // const [driverForecastVal, setDriverForecastVal] = useState(null);
  const [lastEditedDrivers, setLastEditedDrivers] = useState([]);
  const [activeChildHierarchyKey, setActiveChildHierarchyKey] = useState(null);
  const [
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
  ] = useState(0);

  const [showPrompt, setShowPrompt] = useState({
    status: false,
    value: 0,
  });
  const [parentControlledVal, setParentControlledVal] = useState(0);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState([]);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const chartRef = useRef(null);

  // on tab change b/w multiplier and Edit Hierarchy, using this couter to call the chart api as user may have
  //edited  multiplier or Edit Hierarchy, so in order to show correct data we are calling chart api again
  const [refreshChartDataCounter, setRefreshChartDataCounter] = useState(0);

  const [isTabMounted, setIsTabMounted] = useState(false);
  const [isForecastSumarryEdited, setIsForecastSumarryEdited] = useState([]);
  const [
    isEditHierarchyForecastEdited,
    setIsEditHierarchyForecastEdited,
  ] = useState(false);
  const [refreshAdjustmentWrapper, setRefreshAdjustmentWrapper] = useState(0);
  const [accordionExpanded, setAccordionExpanded] = useState([
    "forecast_adjustment",
    "drivers_forecast",
    "driver_significance",
    // "edit_hierarchy_forecast",
  ]);
  const [lastSavedDrivers, setLastSavedDrivers] = useState([]);

  const handleParentControlledVal = (
    _,
    newVal,
    allowedTabChange,
    isManualTabChange
  ) => {
    if (!allowedTabChange && tab.id !== "IA") {
      setShowPrompt({
        status: true,
        value: newVal,
      });
    } else {
      setParentControlledVal(newVal);

      // isManualTabChange is used to show the user correct message after save operation success
      // i.e. if user needs to reload or not
      if (isManualTabChange) {
        setDeepDiveTabChanged(true);
      }
    }
  };

  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const forecastMultiplierSaveStatus =
    adaDashboardReducer?.forecastMultiplierSaveStatus;

  const resetDrivers = (
    isOnlyResetRefsForEditHierarchy,
    notResetEditHierarchyRef
  ) => {
    // setDriverForecastVal(null);
    // setDriverForecastAllVal(null);
    // setLastEditedDrivers([]);

    if (!isOnlyResetRefsForEditHierarchy) {
      setSelectedForecast({
        selected: "",
        activeKey: 0,
      });
    }

    // reset previous hierarchy data on apply filter

    currentHierarchyKey.current = null;
    currentChildHierarchyKey.current = null;
    forecastMultiplierInstance.current = {};
    if (!notResetEditHierarchyRef) {
      editHierarchyInstance.current = {};
      editHierarchyTotalRowInstance.current = {};
    }
    editHierarchyChildInstance.current = {};
    editHierarchyGrandChildInstance.current = {};
    editHierarchyChildTotalRowInstance.current = {};

    editChildRowData.current = {};
    allEditedChildRowData.current = {};
    initialEditRowData.current = {};
    initialTotalRowData.current = {};
    initialEditChildRowData.current = {};
    allEditedGrandChildRowData.current = {};
    allEditedGrandChildRowMapping.current = {};
    lastEditedDriversRef.current = [];
    setActiveChildHierarchyKey(null);
  };

  useEffect(() => {
    if (!activeKey || !resetDriversCounter) return;
    if (lastEditedDrivers?.length) {
      resetDrivers();
      setLastEditedDrivers([]);
      lastEditedDriversRef.current = [];
    } else {
      setActiveKey((prev) => prev + 1);
    }
  }, [resetDriversCounter]);

  useEffect(() => {
    if (!activeKey || activeKey === 1) return;
    resetDrivers();
    setChannels([]);
    setSelectedChannel([]);
    if (lastEditedDrivers?.length) {
      setLastEditedDrivers([]);
      lastEditedDriversRef.current = [];
    }
    // setIsTabMounted(false)
    // isTabMounted.current = false;
  }, [activeKey]);

  useEffect(() => {
    if (!activeKey) return;

    if (index === activeTab) {
      setIsTabMounted(true);

      // isTabMounted.current = true;
    }
  }, [index, activeTab]);

  //Resetting the states and refs once the filter is valid
  useEffect(() => {
    if (adaDashboardReducer?.isFiltersValid) {
      resetDrivers();
      if (lastEditedDrivers?.length) {
        setLastEditedDrivers([]);
      }

      //Setting to Default tab - Forecast Multiplier when filters are reapplied
      if (showPrompt.value !== 0) {
        handleParentControlledVal(null, 0, true);
      }
    }
  }, [adaDashboardReducer?.isFiltersValid]);

  useEffect(() => {
    if (counterOnEditHierarchyChange > 0) {
      setIsEditHierarchyForecastEdited(true);
    }
  }, [counterOnEditHierarchyChange]);

  // assigning lastEditedDriversRef to lastEditedDrivers as sometimes,
  // usestate does not update immediately in aggrid binded components
  // so we are using useRef to store the lastEditedDrivers and assigning it to lastEditedDriversRef
  useEffect(() => {
    lastEditedDriversRef.current = lastEditedDrivers;
  }, [lastEditedDrivers]);

  /**
   * useEffect hook to handle cleanup after a successful forecast save.
   *
   * When `editHierarchyForecastSave` status changes to 'SAVED':
   * - Unwanted keys are removed from all relevant AG Grid instances
   * - All related `ref` objects holding row data are reset to empty objects
   */
  useEffect(() => {
    if (editHierarchyForecastSave === FORECAST_SAVE_STATUS.SAVED) {
      // Clean up extra keys from fiscal data across all grid instances
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyChildInstance,
        instanceName: "editHierarchyChildInstance",
        predictedFiscalWeeks: adaDashboardReducer?.predictedFiscalWeeks,
      });

      removeUnwantedFiscalDataKeys({
        instance: editHierarchyChildTotalRowInstance,
        instanceName: "editHierarchyChildTotalRowInstance",
        predictedFiscalWeeks: adaDashboardReducer?.predictedFiscalWeeks,
      });
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyGrandChildInstance,
        instanceName: "editHierarchyGrandChildInstance",
        predictedFiscalWeeks: adaDashboardReducer?.predictedFiscalWeeks,
      });
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyInstance,
        instanceName: "editHierarchyInstance",
        predictedFiscalWeeks: adaDashboardReducer?.predictedFiscalWeeks,
      });
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyTotalRowInstance,
        instanceName: "editHierarchyTotalRowInstance",
        predictedFiscalWeeks: adaDashboardReducer?.predictedFiscalWeeks,
      });

      // Reset all in-memory row data tracking references
      editChildRowData.current = {};
      allEditedChildRowData.current = {};
      // initialEditRowData.current = {};
      // initialTotalRowData.current = {};
      initialEditChildRowData.current = {};
      allEditedGrandChildRowData.current = {};
      allEditedGrandChildRowMapping.current = {};
    }
  }, [editHierarchyForecastSave]);

  if (index !== activeTab && !isTabMounted) {
    return null;
  }

  return (
    <>
      {showDriverForecast && (
        <DriverForecastTable
          ref={{
            lastEditedDriversRef,
            activeChildHierarchyKey,
            editHierarchyInstance,
            editHierarchyChildTotalRowInstance,
            editHierarchyChildInstance,
            editHierarchyTotalRowInstance,
            editHierarchyGrandChildInstance,
            allEditedChildRowData,
            allEditedGrandChildRowData,
            allEditedGrandChildRowMapping,
          }}
          key={activeKey}
          activeKey={activeKey}
          lastEditedDrivers={lastEditedDrivers}
          setLastEditedDrivers={setLastEditedDrivers}
          tabKey={tabKey}
          showIAData={showIAData}
          {...tab}
          allowEdit={allowEdit}
          disableAllowEditOnSave={disableAllowEditOnSave}
        />
      )}
      {showDriverSignificance && <DriverSignificance />}
      <EditForecast
        accordionExpanded={accordionExpanded}
        key={refreshAdjustmentWrapper}
        activeKey={activeKey}
        resetDrivers={resetDrivers}
        lastEditedDrivers={lastEditedDrivers}
        tabKey={tabKey}
        allowEdit={allowEdit}
        allowL0Edit={allowL0Edit}
        showIAData={showIAData}
        selectedForecast={selectedForecast}
        showOriginalIAForecast={showOriginalIAForecast}
        showPrompt={showPrompt}
        handleParentControlledVal={handleParentControlledVal}
        setShowPrompt={setShowPrompt}
        parentControlledVal={parentControlledVal}
        activeChildHierarchyKey={activeChildHierarchyKey}
        setActiveChildHierarchyKey={setActiveChildHierarchyKey}
        counterOnEditHierarchyChange={counterOnEditHierarchyChange}
        setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
        setRefreshChartDataCounter={setRefreshChartDataCounter}
        refreshChartDataCounter={refreshChartDataCounter}
        index={index}
        setSavePerformedTab={setSavePerformedTab}
        activeTab={parentControlledVal}
        disableAllowEditOnSave={disableAllowEditOnSave}
        setSelectedForecast={setSelectedForecast}
        setLastEditedDrivers={setLastEditedDrivers}
        setActiveTransactionData={setActiveTransactionData}
        activeTransactionData={activeTransactionData}
        setIsForecastSumarryEdited={setIsForecastSumarryEdited}
        lastSavedDrivers={lastSavedDrivers}
        setLastSavedDrivers={setLastSavedDrivers}
        isForecastSumarryEdited={isForecastSumarryEdited}
        setIsEditHierarchyForecastEdited={setIsEditHierarchyForecastEdited}
        editHierarchyForecastSave={editHierarchyForecastSave}
        forecastMultiplierSaveStatus={forecastMultiplierSaveStatus}
        {...tab}
        ref={{
          editHierarchyInstance,
          editHierarchyTotalRowInstance,
          forecastMultiplierInstance,
          editHierarchyChildInstance,
          editHierarchyGrandChildInstance,
          editHierarchyChildTotalRowInstance,
          initialEditChildRowData,
          allEditedGrandChildRowData,
          lastEditedDriversRef,
          initialEditRowData,
          initialTotalRowData,
          editChildRowData,
          currentHierarchyKey,
          allEditedChildRowData,
          allEditedGrandChildRowMapping,
          saveApiCountRef,
          isSaveInProgressRef,
          disableAllowEditOnSaveRef,
          onSaveRef,
          timeoutRef,
          currentChildHierarchyKey,
          isViewEditHierarchyMountedRef,
          channelsRef,
        }}
      />

      <div className="chart-container" ref={chartRef}>
        <CustomAccordion label="Visualization">
          <ChartContainer
            activeKey={activeKey}
            activeChildHierarchyKey={activeChildHierarchyKey}
            lastEditedDrivers={lastEditedDrivers}
            counterOnEditHierarchyChange={counterOnEditHierarchyChange}
            parentControlledVal={parentControlledVal}
            tabKey={tabKey}
            refreshChartDataCounter={refreshChartDataCounter}
            showHeader={true}
            isForecastSumarryEdited={isForecastSumarryEdited}
            {...tab}
            ref={{
              editHierarchyTotalRowInstance,
              editHierarchyInstance,
              allEditedChildRowData,
              editHierarchyChildInstance,
              allEditedGrandChildRowData,
              allEditedGrandChildRowMapping,
              editHierarchyGrandChildInstance,
            }}
          />
        </CustomAccordion>
      </div>
    </>
  );
});

export default DashboardTab;
