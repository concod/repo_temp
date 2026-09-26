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
import { Button } from "impact-ui-v3";
import SaveIcon from "@mui/icons-material/Save";
import { useLoading } from "../LoaderWrapper";
import UploadForecast from "../edit-forecast/UploadForecast";
import DownloadForecast from "../edit-forecast/DownloadForecast";

const ForecastAdjustmentWrapper = (props, ref) => {
  const dispatch = useDispatch();
  const classes = useStyles();
  const [lastSavedDrivers, setLastSavedDrivers] = useState([]);
  const [selectedView, setSelectedView] = useState("table");
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [isChartMounted, setIsChartMounted] = useState(false);
  const { setLoading, loading } = useLoading();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

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
  } = props;

  const multiplierLoaderCount = useSelector(
    (store) =>
      store?.adaReducer?.adaForecastMultiplierReducer?.multiplierLoaderCount
  );

  const [isLoading, setIsLoading] = useState(true);
  const forecastMultiplierWrapperRef = useRef(null);

  useEffect(() => {
    if (selectedView === "chart") {
      setIsChartMounted(true);
    } else {
    }
  }, [selectedView]);

  return (
    <div className="forecast-adjustment-wrapper">
      <div className={classes.buttonGroupContainer}>
        <ButtonGroup
          onChange={(_, value) => {
            // Update the selected view state
            setSelectedView(value);
          }}
          options={[
            // {
            //   value: "default",
            //   icon: <DefaultIcon />,
            // },
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
      <div
        style={{
          display: selectedView === "chart" ? "block" : "none",
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
            {...props}
            ref={ref}
          />
        )}
      </div>
      {(selectedView === "default" || selectedView === "table") && (
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
              Save & Finalize Forecast
            </Button>
          )}
        </div>
      )}

      <div
        ref={forecastMultiplierWrapperRef}
        style={{
          display:
            selectedView === "default" || selectedView === "table"
              ? "block"
              : "none",
        }}
      >
        <ForecastMultiplierWrapper
          accordionExpanded={accordionExpanded}
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
        />
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
}));
