import React from "react";
import { Grid } from "@mui/material";
import ForecastSummaryWrapper from "../Forecast-Summary";
import ForecastVisualWrapper from "../Forecast-Visual";
import { useSelector } from "react-redux";

function GridView(props, ref) {
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
    isCalledFromMFP,
    isChartLabelFiltersHidden,
  } = props;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  return (
    <>
      <Grid
        container
        spacing={2}
        style={{ display: isCalledFromMFP ? "flex" : "none" }}
      >
        <Grid item xs={12} md={6}>
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
            isRedirectedFromInventory={isRedirectedFromInventory}
            isChartLabelFiltersHidden={isChartLabelFiltersHidden}
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
        </Grid>

        <Grid item xs={12} md={6}>
          <ForecastSummaryWrapper
            activeKey={activeKey}
            updateAllData={updateAllData}
            lastEditedDrivers={lastEditedDrivers}
            setLastEditedDrivers={setLastEditedDrivers}
            selectedForecast={selectedForecast}
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
        </Grid>
      </Grid>
    </>
  );
}

export default GridView;
