import { makeStyles } from "@mui/styles";
import React, { memo, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { forwardRef } from "react";
import { Accordion } from "impact-ui-v3";
import { Prompt, useTranslation } from "impact-ui-v3";

import LabelWithTooltip from "modules/ada/utils-ada/labelWithTooltip";
import { Typography, Box } from "@mui/material";
import EditForecastWrapper from "../edit-forecast-wrapper";
import ForecastAdjustmentWrapper from "../forecast-adjustment-wrapper";
import DriverForecastTable from "../driver-forecast-table";
import DriverSignificanceTable from "../driver-significance-table";
import {
  FORECAST_SAVE_STATUS,
  handlePredictedTimePeriod,
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

  const { t } = useTranslation();

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
  const classes = useStyles();
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
      // setShowPrompt({
      //   status: true,
      //   value: newVal,
      // });
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
        predictedFiscalWeeks: handlePredictedTimePeriod(adaDashboardReducer),
      });

      removeUnwantedFiscalDataKeys({
        instance: editHierarchyChildTotalRowInstance,
        instanceName: "editHierarchyChildTotalRowInstance",
        predictedFiscalWeeks: handlePredictedTimePeriod(adaDashboardReducer),
      });
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyGrandChildInstance,
        instanceName: "editHierarchyGrandChildInstance",
        predictedFiscalWeeks: handlePredictedTimePeriod(adaDashboardReducer),
      });
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyInstance,
        instanceName: "editHierarchyInstance",
        predictedFiscalWeeks: handlePredictedTimePeriod(adaDashboardReducer),
      });
      removeUnwantedFiscalDataKeys({
        instance: editHierarchyTotalRowInstance,
        instanceName: "editHierarchyTotalRowInstance",
        predictedFiscalWeeks: handlePredictedTimePeriod(adaDashboardReducer),
      });

      // Reset all in-memory row data tracking references
      editChildRowData.current = {};
      allEditedChildRowData.current = {};
      // initialEditRowData.current = {};
      // initialTotalRowData.current = {};
      initialEditChildRowData.current = {};
      allEditedGrandChildRowData.current = {};
      allEditedGrandChildRowMapping.current = {};
      setRefreshChartDataCounter((prev) => prev + 1);
    }
  }, [editHierarchyForecastSave]);

  if (index !== activeTab && !isTabMounted) {
    return null;
  }

  return (
    <div className={classes.dashboardContainer}>
      <Accordion
        data={[
          showDriverForecast && {
            content: (
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
                showDriverRank={showDriverRank}
              />
            ),
            header: tab.accordionTitle ? (
              tab.accordionTitle
            ) : (
              <LabelWithTooltip
                label={t("ada.dashboard.driversOfForecast")}
                title={
                  <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.5 }}>
                    This section contains forecast drivers information such as
                    Discount%, Effective Discount%, Actual Discount% and Last
                    Year Discount%. Changing any values (in multiples of 5%) of
                    discount % in week will update original forecast values to
                    Driver Adjusted Forecast and eventually it updates Adjusted
                    User Forecast for respective week.
                  </Typography>
                }
              />
            ),
            id: "drivers_forecast",
            value: "drivers_forecast",
          },

          showDriverSignificance && {
            content: <DriverSignificanceTable activeKey={activeKey} />,
            header: "Drivers Significance",
            id: "driver_significance",
            value: "driver_significance",
          },
          {
            content: (
              <ForecastAdjustmentWrapper
                accordionExpanded={accordionExpanded}
                setAccordionExpanded={setAccordionExpanded}
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
                setCounterOnEditHierarchyChange={
                  setCounterOnEditHierarchyChange
                }
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
                }}
                {...props}
              />
            ),
            header: (
              <LabelWithTooltip
                label={t("ada.dashboard.forecastAdjustment")}
                title={
                  <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.5 }}>
                    In this section, you will see aggregated IA, Adjusted, and
                    User forecasts for selected products. To change IA suggested
                    or driver-adjusted forecast values, either use a multiplier
                    or manually adjust the forecast for the selected products.
                  </Typography>
                }
              />
            ),
            id: "forecast_adjustment",
            value: "forecast_adjustment",
          },

          {
            content:
              accordionExpanded?.includes("edit_hierarchy_forecast") ||
              isEditHierarchyForecastEdited ? (
                <>
                  <EditForecastWrapper
                    isForecastSumarryEdited={isForecastSumarryEdited}
                    setIsEditHierarchyForecastEdited={
                      setIsEditHierarchyForecastEdited
                    }
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
                    setCounterOnEditHierarchyChange={
                      setCounterOnEditHierarchyChange
                    }
                    setLastEditedDrivers={setLastEditedDrivers}
                    setRefreshChartDataCounter={setRefreshChartDataCounter}
                    index={index}
                    setSavePerformedTab={setSavePerformedTab}
                    activeTab={parentControlledVal}
                    disableAllowEditOnSave={disableAllowEditOnSave}
                    setSelectedForecast={setSelectedForecast}
                    setActiveTransactionData={setActiveTransactionData}
                    activeTransactionData={activeTransactionData}
                    editHierarchyForecastSave={editHierarchyForecastSave}
                    forecastMultiplierSaveStatus={forecastMultiplierSaveStatus}
                    lastSavedDrivers={lastSavedDrivers}
                    setLastSavedDrivers={setLastSavedDrivers}
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
                      currentChildHierarchyKey,
                      allEditedChildRowData,
                      allEditedGrandChildRowMapping,
                      saveApiCountRef,
                      isSaveInProgressRef,
                      disableAllowEditOnSaveRef,
                      timeoutRef,
                      isViewEditHierarchyMountedRef,
                      channelsRef,
                    }}
                    setIsForecastSumarryEdited={setIsForecastSumarryEdited}
                  />
                </>
              ) : null,
            header: (
              <LabelWithTooltip
                label={t("ada.dashboard.viewEditHierarchyForecast")}
                title={
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.5 }}>
                      In this section, you can:
                    </Typography>

                    {adaDashboardReducer?.clientConfig?.attribute_value
                      ?.show_features
                      ?.is_compare_with_in_edit_hierarchy_enabled && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          mb: 0.5,
                        }}
                      >
                        <Box
                          component="div"
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "white",
                            mt: "7px",
                            mr: 1,
                            flexShrink: 0,
                          }}
                        />

                        {adaDashboardReducer?.clientConfig?.attribute_value
                          ?.mfp ? (
                          <Typography sx={{ fontSize: 13 }}>
                            Compare and finalize either the IA forecast or the
                            MFP forecast. The IA forecast is finalized by
                            default.
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 13 }}>
                            Compare and finalize either the IA forecast or the
                            adjusted forecast. The IA forecast is finalized by
                            default.
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <Box
                        component="span"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: "white", // or your theme color
                          mt: "7px",
                          mr: 1,
                          flexShrink: 0,
                        }}
                      />
                      <Typography sx={{ fontSize: 13 }}>
                        View and edit forecast numbers for any product, store,
                        or size.
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            ),
            id: "edit_hierarchy_forecast",
            value: "edit_hierarchy_forecast",
          },
        ].filter(Boolean)}
        draggable
        isMultiExpanded
        onChange={(value) => {
          if (tab.id !== "IA") {
            if (value === "edit_hierarchy_forecast") {
              if (isForecastSumarryEdited?.length) {
                setShowPrompt({
                  status: true,
                  value: value,
                });
                return;
              }
            }

            if (value === "forecast_adjustment") {
              if (isEditHierarchyForecastEdited) {
                setShowPrompt({
                  status: true,
                  value: value,
                });
                return;
              }
            }
          }
          if (accordionExpanded.includes(value)) {
            setAccordionExpanded(
              accordionExpanded.filter((item) => item !== value)
            );
          } else {
            if (value === "edit_hierarchy_forecast") {
              if (!isEditHierarchyForecastEdited) {
                resetDrivers(true);
              }
            }
            setAccordionExpanded([...accordionExpanded, value]);
          }
        }}
        expanded={accordionExpanded}
      />

      {/* {showDriverSignificance && <DriverSignificance activeKey={activeKey} />} */}
      <Prompt
        isOpen={showPrompt.status}
        title={t("ada.dashboardTab.unsavedChangesTitle")}
        children={<>{t("ada.dashboardTab.discardChangesMessage")}</>}
        primaryButtonLabel={t("ada.dashboardTab.cancel")}
        secondaryButtonLabel={t("ada.dashboardTab.discardChanges")}
        onPrimaryButtonClick={() => {
          setShowPrompt({
            status: false,
            value: showPrompt.value,
          });
        }}
        onSecondaryButtonClick={() => {
          if (showPrompt.value === "edit_hierarchy_forecast") {
            if (!accordionExpanded.includes(showPrompt.value)) {
              setAccordionExpanded([...accordionExpanded, showPrompt.value]);
            }
            setIsForecastSumarryEdited([]);
            setRefreshAdjustmentWrapper((prev) => prev + 1);
          }
          if (showPrompt.value === "forecast_adjustment") {
            if (!accordionExpanded.includes(showPrompt.value)) {
              setAccordionExpanded([...accordionExpanded, showPrompt.value]);
            }
            setIsEditHierarchyForecastEdited(false);
            resetDrivers(true);
          }
          setShowPrompt({
            status: false,
            value: showPrompt.value,
          });
        }}
        variant="warning"
      />
    </div>
  );
});

export default memo(DashboardTab);

const useStyles = makeStyles((theme) => ({
  dashboardContainer: {
    "& .impact-input-wrapper input": {
      textAlign: "right",
    },
    "& .impact_accordion_main_container": {
      gap: "15px",
      backgroundColor: "unset",
      paddingTop: "7px",
      "& > div:first-of-type": {
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
      },
      "& > div:last-of-type": {
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
      },
    },
  },

  container: {
    position: "relative",
  },
  titleFilter: {
    marginBottom: "1rem",
  },
}));
