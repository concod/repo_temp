import { forwardRef, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useSelector } from "react-redux";
import ForecastMultiplierWrapper from "../edit-forecast/forecast-multiplier/forecastMultiplierWrapper";
import { ButtonGroup } from "impact-ui-v3";
import ChartIcon from "assets/impactv3/chart.svg";
import TableIcon from "assets/impactv3/table.svg";
import Chart from "../chart";
import { makeStyles } from "@mui/styles";
import { Button, useTranslation } from "impact-ui-v3";
import SaveIcon from "@mui/icons-material/Save";
import { useLoading } from "../LoaderWrapper";
import UploadForecast from "../edit-forecast/UploadForecast";
import DownloadForecast from "../edit-forecast/DownloadForecast";
import TableChartIcon from "assets/impactv3/table_chartview.svg";

const ForecastAdjustmentWrapper = (props, ref) => {
  const dispatch = useDispatch();
  const classes = useStyles();
  const { t } = useTranslation();
  const [selectedView, setSelectedView] = useState("table_and_chart");
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [isChartMounted, setIsChartMounted] = useState(false);
  const { setLoading, loading } = useLoading();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const forecastAdjustmentWrapperRef = useRef(null);

  const {
    activeKey,
    resetDrivers,
    lastEditedDrivers,
    showIAData,
    id,
    showOriginalIAForecast,
    showPrompt,
    handleParentControlledVal,
    setShowPrompt,
    parentControlledVal,
    deepDive,
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
    setRefreshChartDataCounter,
    index,
    setSavePerformedTab,
    disableAllowEditOnSave,
    setSelectedForecast,
    setActiveTransactionData,
    activeTransactionData,
    refreshChartDataCounter,
    activeChildHierarchyKey,
    setIsForecastSumarryEdited,
    tabKey,
    val,
    isForecastSumarryEdited,
    accordionExpanded,
    setAccordionExpanded,
    lastSavedDrivers,
    setLastSavedDrivers,
    setLastEditedDrivers,
  } = props;

  const multiplierLoaderCount = useSelector(
    (store) =>
      store?.adaReducer?.adaForecastMultiplierReducer?.multiplierLoaderCount
  );

  const [isLoading, setIsLoading] = useState(true);
  const forecastMultiplierWrapperRef = useRef(null);

  useEffect(() => {
    if (accordionExpanded.includes("forecast_adjustment")) {
      forecastAdjustmentWrapperRef.current.style.visibility = "visible";
    } else {
      forecastAdjustmentWrapperRef.current.style.visibility = "hidden";
    }
  }, [accordionExpanded]);

  useEffect(() => {
    if (selectedView === "chart" || selectedView === "table_and_chart") {
      setIsChartMounted(true);
    } else {
    }

    if (
      forecastAdjustmentWrapperRef.current &&
      (selectedView === "chart" || selectedView === "table_and_chart")
    ) {
      forecastAdjustmentWrapperRef.current.style.visibility = "hidden";
    }
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 10);

    const timer2 = setTimeout(() => {
      forecastAdjustmentWrapperRef.current.style.visibility = "visible";
    }, 160);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [selectedView]);

  return (
    <div
      className="forecast-adjustment-wrapper"
      ref={forecastAdjustmentWrapperRef}
    >
      <div className={classes.buttonGroupContainer}>
        <ButtonGroup
          onChange={(_, value) => {
            // Update the selected view state
            setSelectedView(value);
          }}
          options={[
            {
              value: "table_and_chart",
              icon: <TableChartIcon />,
            },
            {
              value: "chart",
              icon: <ChartIcon />,
            },
            {
              value: "table",
              icon: <TableIcon />,
            },
          ]}
          selectedOption={selectedView}
        />
      </div>

      {(selectedView === "table" || selectedView === "table_and_chart") && (
        <div className={classes.adjustmentActions}>
          {adaReducer?.clientConfig?.attribute_value?.show_features
            ?.show_upload_button_for_forecast &&
            id !== "IA" && <UploadForecast />}
          <DownloadForecast />
          {props.allowEdit && adaReducer?.userConfig?.hasOwnProperty("edit") && (
            <Button
              variant="primary"
              icon={loading && <></>}
              iconPlacement="right"
              onClick={() => ref.onSaveRef.current && ref.onSaveRef.current()}
              disabled={
                disableSaveButton ||
                loading ||
                isLoading ||
                multiplierLoaderCount !== 0
              }
              loading={loading}
            >
              {t("ada.dashboard.saveAndFinalizeForecast")}
            </Button>
          )}
        </div>
      )}

      {/* Single instance of Chart - positioned based on view */}
      <div
        className={
          selectedView === "table_and_chart" ? classes.splitViewContainer : ""
        }
      >
        <div
          className={
            selectedView === "table_and_chart"
              ? classes.chartSplitView
              : classes.chartFullView
          }
          style={{
            display: selectedView === "table" ? "none" : "block",
          }}
        >
          {isChartMounted && (
            <Chart
              activeKey={activeKey}
              activeChildHierarchyKey={activeChildHierarchyKey}
              lastEditedDrivers={lastEditedDrivers}
              counterOnEditHierarchyChange={counterOnEditHierarchyChange}
              parentControlledVal={parentControlledVal}
              tabKey={tabKey}
              refreshChartDataCounter={refreshChartDataCounter}
              showHeader={true}
              isForecastSumarryEdited={isForecastSumarryEdited}
              isChartLabelFiltersHidden={selectedView === "table_and_chart"}
              {...props}
              ref={ref}
            />
          )}
        </div>

        {/* Single instance of ForecastMultiplierWrapper - positioned based on view */}
        <div
          ref={forecastMultiplierWrapperRef}
          className={
            selectedView === "table_and_chart"
              ? classes.tableSplitView
              : classes.tableFullView
          }
          style={{
            display: selectedView === "chart" ? "none" : "block",
          }}
        >
          <ForecastMultiplierWrapper
            accordionExpanded={accordionExpanded}
            setAccordionExpanded={setAccordionExpanded}
            activeKey={activeKey}
            key={activeKey}
            ref={ref}
            lastEditedDrivers={lastEditedDrivers}
            allowEdit={props.allowEdit}
            showIAData={showIAData}
            showOriginalIAForecast={showOriginalIAForecast}
            showScenario={props.showScenario}
            id={id}
            selectedForecast={props.selectedForecast}
            tabKey={props.tabKey}
            showIARecommended={props.tabKey !== "IA"}
            lastSavedDrivers={lastSavedDrivers}
            setLastSavedDrivers={setLastSavedDrivers}
            setLastEditedDrivers={setLastEditedDrivers}
            index={index}
            setSavePerformedTab={setSavePerformedTab}
            activeTab={parentControlledVal}
            disableAllowEditOnSave={disableAllowEditOnSave}
            setActiveTransactionData={setActiveTransactionData}
            activeTransactionData={activeTransactionData}
            disableSaveButton={disableSaveButton}
            setDisableSaveButton={setDisableSaveButton}
            setLoading={setLoading}
            loading={loading}
            setIsLoading={setIsLoading}
            hideSave={true}
            showHeader={true}
            setIsForecastSumarryEdited={setIsForecastSumarryEdited}
            setSelectedForecast={setSelectedForecast}
            selectedView={selectedView}
            cardContainer={selectedView !== "table_and_chart"}
            {...props}
          />
        </div>
      </div>
    </div>
  );
};

export default forwardRef(ForecastAdjustmentWrapper);

const useStyles = makeStyles((theme) => ({
  adjustmentTooltip: {
    position: "absolute !important",
    top: "16px",
  },
  buttonGroupContainer: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    top: "10px",
  },
  adjustmentActions: {
    display: "flex",
    gap: "10px",
    position: "absolute",
    right: "15px",
    top: "10px",
    zIndex: 1,
  },
  alignInputTextRight: {
    "& .impact-input-wrapper input": {
      textAlign: "right",
    },
  },
  // New styles for split view layout
  chartSplitView: {
    flex: "1 1 50%",
    minWidth: 0,
    boxSizing: "border-box",
    "& *": {
      // Force ALL child elements
      maxWidth: "100% !important",
      boxSizing: "border-box !important",
    },
  },
  chartFullView: {
    width: "100%",
  },
  tableSplitView: {
    flex: "1 1 50%",
    minWidth: 0,
    paddingLeft: "8px",
    boxSizing: "border-box",
  },
  tableFullView: {
    width: "100%",
  },
  splitViewContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "16px",
    width: "100%",
  },
}));
