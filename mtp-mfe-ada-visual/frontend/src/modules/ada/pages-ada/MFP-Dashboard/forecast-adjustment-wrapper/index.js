import { forwardRef, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Button, ButtonGroup } from "impact-ui-v3";

import ChartIcon from "assets/impactv3/chart.svg";
import TableIcon from "assets/impactv3/table.svg";
import TableChartIcon from "assets/impactv3/table_chartview.svg";
import { makeStyles } from "@mui/styles";
import ForecastSummaryWrapper from "../Forecast-Summary";
import ForecastVisualWrapper from "../Forecast-Visual";
import {
  getDashboardBasedOnRepoRoute,
  adaPayloadFromSelectedFilters,
} from "../../../utils-ada/utilityFunctions";
import { ADA_VISUAL } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { ADA_FORECAST_MANGEMENT } from "modules/ada/constants-ada/routesContants";
import { useHistory } from "react-router";
import { useSearchParams } from "react-router-dom-v5-compat";
import GridView from "../Grid-View";
import { setIsFiltersValid } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

const ForecastAdjustmentWrapper = (props, ref) => {
  const dispatch = useDispatch();
  const classes = useStyles();
  const [selectedView, setSelectedView] = useState("table_and_chart");

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const history = useHistory();

  const adaVisualFilterConfiguration = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "adaVisualFilterConfiguration"
      ]
  );

  let {
    editHierarchyTotalRowInstance,
    editHierarchyInstance,
    allEditedChildRowData,
    editHierarchyChildInstance,
    allEditedGrandChildRowData,
    allEditedGrandChildRowMapping,
    editHierarchyGrandChildInstance,
    lastEditedDriversRef,
    editHierarchyChildTotalRowInstance,
  } = ref.current || {};

  const {
    activeKey,
    lastEditedDrivers,
    parentControlledVal,
    counterOnEditHierarchyChange,
    refreshChartDataCounter,
    activeChildHierarchyKey,
    updateAllData,
    showScenario,
    setLastEditedDrivers,
    selectedForecast,
    isRedirectedFromInventory,
  } = props;

  let searchParams = new URLSearchParams(window.location.search);
  let isInventoryRepo = searchParams.get("inventorysmart");

  let typeFromUrl = searchParams.get("type");
  const isInventoryRedirection = typeFromUrl === "adaPayloadFromInventory";

  const forecastMultiplierWrapperRef = useRef(null);
  const redirectToForecastManagement = () => {
    let dependencyData =
      adaVisualFilterConfiguration?.appliedFilterData?.dependencyData;

    let adaPayload = adaPayloadFromSelectedFilters(adaReducer, dependencyData);

    const isInventoryRedirectionProp = props?.location?.isInventoryRedirection;
    const isFromInventory =
      isInventoryRedirection || isInventoryRedirectionProp;

    if (!isFromInventory) {
      dispatch(setIsFiltersValid(false));
    }

    history.push({
      pathname: getDashboardBasedOnRepoRoute(isInventoryRepo),
      isRedirectedFromMFPDashboard: true,
      isInventoryRedirection: isFromInventory,
      adaPayload: JSON.stringify(adaPayload),
    });
  };

  return (
    <div className="forecast-adjustment-wrapper">
      {adaReducer?.isFiltersValid && (
        <div
          className={classes.buttonGroupContainer}
          style={{
            top: "75px",
          }}
        >
          <ButtonGroup
            onChange={(_, value) => {
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
      )}
      <div
        style={{
          display: selectedView === "table_and_chart" ? "block" : "none",
        }}
      >
        <GridView
          activeKey={activeKey}
          updateAllData={updateAllData}
          showRedirectToADAButton={adaReducer?.isFiltersValid}
          hidePastHistoricData={true}
          showScenario={showScenario}
          activeChildHierarchyKey={activeChildHierarchyKey}
          lastEditedDrivers={lastEditedDrivers}
          counterOnEditHierarchyChange={counterOnEditHierarchyChange}
          parentControlledVal={parentControlledVal}
          refreshChartDataCounter={refreshChartDataCounter}
          isRedirectedFromInventory={isRedirectedFromInventory}
          isCalledFromMFP={true}
          isChartLabelFiltersHidden={selectedView === "table_and_chart"}
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
      </div>
      <div
        style={{
          display: selectedView === "chart" ? "block" : "none",
        }}
      >
        <ForecastVisualWrapper
          activeKey={activeKey}
          updateAllData={updateAllData}
          showRedirectToADAButton={adaReducer?.isFiltersValid}
          hidePastHistoricData={true}
          showScenario={showScenario}
          activeChildHierarchyKey={activeChildHierarchyKey}
          lastEditedDrivers={lastEditedDrivers}
          counterOnEditHierarchyChange={counterOnEditHierarchyChange}
          parentControlledVal={parentControlledVal}
          refreshChartDataCounter={refreshChartDataCounter}
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
      </div>
      {/* remove this once new feature-demand manage toggle is tested on routing via inventory */}
      {/* {(props.location.isInventoryRedirection || isInventoryRedirection) && (
        <div className={classes.adjustmentActions}>
          {adaReducer?.isFiltersValid && (
            <Button
              id="forecastManagement"
              onClick={redirectToForecastManagement}
              variant="primary"
              disabled={adaReducer?.loaderComponentCount}
            >
              Forecast Management
            </Button>
          )}
        </div>
      )} */}
      {/* <Button
        variant="primary"
        // onClick={() => ref.onSaveRef.current && ref.onSaveRef.current()}
      >
        Save & Finalize Forecast
      </Button> */}
      <div
        ref={forecastMultiplierWrapperRef}
        style={{
          display:
            selectedView === "default" || selectedView === "table"
              ? "block"
              : "none",
        }}
      >
        <ForecastSummaryWrapper
          activeKey={activeKey}
          updateAllData={updateAllData}
          lastEditedDrivers={lastEditedDrivers}
          setLastEditedDrivers={setLastEditedDrivers}
          selectedForecast={selectedForecast}
          cardContainer={selectedView !== "table_and_chart"}
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
  },
  adjustmentActions: {
    display: "flex",
    gap: "10px",
    position: "absolute",
    right: "15px",
    top: "15px",
    zIndex: 1,
  },
  alignInputTextRight: {
    "& .impact-input-wrapper input": {
      textAlign: "right",
    },
  },
}));
