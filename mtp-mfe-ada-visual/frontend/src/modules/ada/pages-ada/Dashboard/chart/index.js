import React, { forwardRef, lazy, Suspense, useState } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  getChartData,
  getCombinedChartData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  adjustedPayload,
  chartDataPayload,
  formattedAdjustedPayload,
} from "modules/ada/utils-ada/utilityFunctions";
import { useDispatch, useSelector } from "react-redux";
import { cloneDeep } from "lodash";
// import ChartFilters from "./ChartFilters";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import globalStyles from "core/Styles/globalStyles";
import { useHistory } from "react-router";
import ChartWithoutAppliedFilters from "./ChartWithoutAppliedFilters";
import ChartWithAppliedFilters from "./ChartWithAppliedFilters";
import { makeStyles } from "@mui/styles";
import clsx from "clsx";
// import AdvanceFilterGroup from "./AdvanceFilterGroup";
const AdvanceFilterGroup = lazy(() => import("./AdvanceFilterGroup/index.js"));
const ChartFilters = lazy(() => import("./ChartFilters.js"));

const ChartContainer = forwardRef((props, ref) => {
  let {
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    editHierarchyChildInstance,
    editHierarchyGrandChildInstance,
    allEditedGrandChildRowData,
    allEditedChildRowData,
    allEditedGrandChildRowMapping,
  } = ref;
  return (
    <Chart
      {...props}
      key={props.activeKey}
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
  );
});

const Chart = forwardRef((props, ref) => {
  let {
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    editHierarchyChildInstance,
    editHierarchyGrandChildInstance,
    allEditedGrandChildRowData,
    allEditedChildRowData,
    allEditedGrandChildRowMapping,
  } = ref;

  const {
    activeKey,
    id,
    chartConfig,
    lastEditedDrivers,
    activeChildHierarchyKey,
    counterOnEditHierarchyChange,
    parentControlledVal,
    refreshChartDataCounter,
    hideChartFilters,
    hideChartKPI,
    showRedirectToADAButton,
    hidePastHistoricData,
    accordionTitle,
    customStyleChartContainer,
    isRedirectedFromInventory,
    isCalledFromMFPDashboard,
    showHeader,
    isForecastSumarryEdited,
    isChartLabelFiltersHidden,
    activeTab,
    index,
  } = props;

  const dispatch = useDispatch();

  const globalClasses = globalStyles();

  const history = useHistory();

  const [graphKpiLoader, setGraphKpiLoader] = useState(false);

  const [chartData, setChartData] = useState([]);
  const [chartLoader, setChartLoader] = useState(0);
  // when multiplier is updated, chart section is not trigerring properly. so,
  // in order to show correct response useing below state to trigger change
  const [isMultiplierUpdated, setIsMultiplierUpdated] = useState(0);
  // when pulling historic data, we have to pass in the applied filters
  // that's why copying the applied filters
  const [selectedGraphFilters, setSelectedGraphFilters] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);

  // if filters are applied inside chart component, then we set this flag to true
  // this is to avoid duplicate api call. so, if user toggles, eligible SKU switch
  // and filters were not applied in the graph, then we take response from usehostoric actuals
  // and avoid api call from the chart component
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);

  // const { historicChartData, historicChartLoader } = useHistoricData(
  //   selectedGraphFilters,
  //   id === "IA",
  //   hidePastHistoricData,
  //   filterApplied,
  //   isCalledFromMFPDashboard
  // );

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const adaModuleConfiguratorReducer = useSelector(
    (store) =>
      store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
  );

  const adaVisualFilterConfiguration = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "adaVisualFilterConfiguration"
      ]
  );

  const classes = useStyles();

  const updateForecastData = (data, isForecastSumarryEdited) => {
    if (parentControlledVal === +1) {
      return data;
    }
    let chartDataCopy = cloneDeep(data);
    chartDataCopy?.ia_forecast_data?.forEach((week) => {
      let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
      let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];

      let multiplierDataCurrWeek =
        adaForecastMultiplierReducer?.[id]?.[currWeek];

      if (
        multiplierDataCurrWeek &&
        isForecastSumarryEdited?.includes(+currWeek)
      ) {
        let multiplierRatio = multiplierDataCurrWeek.ratio;
        week.adjusted_forecast_qty = week.predicted_qty * multiplierRatio;
      }

      return week;
    });

    return chartDataCopy;
  };

  const prepareChartDataPayload = (selected) => {
    const clonedReducer = cloneDeep(adaReducer);

    // Graph has tenant filter dropdown, so we are taking applied(~if) filters
    // and sending that in payload to get updated data

    let selectedStoreFilters = selected?.filter(
      (elem) => elem.dimension === "store"
    );

    let selectedProductFilters = selected?.filter(
      (elem) => elem.dimension === "product"
    );

    let updatedStoreFilter = clonedReducer.store;
    let updatedProductFilter = clonedReducer.product;

    if (selectedStoreFilters?.length) {
      updatedStoreFilter = selectedStoreFilters;
    }

    if (selectedProductFilters?.length) {
      updatedProductFilter = selectedProductFilters;
    }

    clonedReducer.store = updatedStoreFilter;
    clonedReducer.product = updatedProductFilter;

    let isMFPShownOnCharts =
      isCalledFromMFPDashboard ||
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.show_mfp_on_charts;

    const payload = chartDataPayload(
      clonedReducer,
      null,
      null,
      id === "IA",
      null,
      clonedReducer?.isEligible,
      isMFPShownOnCharts,
      true,
      null,
      "visualization",
      null,
      adaReducer?.isCompareWithDropdown
    );

    let adjusted = adjustedPayload(
      editHierarchyTotalRowInstance,
      lastEditedDrivers,
      editHierarchyInstance,
      allEditedChildRowData,
      editHierarchyChildInstance,
      activeChildHierarchyKey,
      allEditedGrandChildRowData,
      allEditedGrandChildRowMapping,
      editHierarchyGrandChildInstance,
      isCalledFromMFPDashboard,
      true,
      null,
      null,
      adaReducer?.predictedFiscalWeeks
    );

    let [
      adjustedDiscountPayload,
      adjustedPricePointPayload,
    ] = formattedAdjustedPayload(adjusted, lastEditedDrivers, adaReducer);

    payload.adjusted = adjustedDiscountPayload;
    payload.adjusted_price_point = adjustedPricePointPayload;
    return payload;
  };

  const fetchChartData = async (selected = selectedGraphFilters) => {
    try {
      // let payload = prepareChartDataPayload(selected);

      setChartLoader((prevState) => prevState + 1);

      const clonedReducer = cloneDeep(adaReducer);

      // Graph has tenant filter dropdown, so we are taking applied(~if) filters
      // and sending that in payload to get updated data

      let selectedStoreFilters = selected?.filter(
        (elem) => elem.dimension === "store"
      );

      let selectedProductFilters = selected?.filter(
        (elem) => elem.dimension === "product"
      );

      let updatedStoreFilter = clonedReducer.store;
      let updatedProductFilter = clonedReducer.product;

      if (selectedStoreFilters?.length) {
        updatedStoreFilter = selectedStoreFilters;
      }

      if (selectedProductFilters?.length) {
        updatedProductFilter = selectedProductFilters;
      }

      clonedReducer.store = updatedStoreFilter;
      clonedReducer.product = updatedProductFilter;

      const response = await getCombinedChartData(clonedReducer);

      setChartData(response);
      //setFilterApplied(false);
      setIsMultiplierUpdated((prev) => prev + 1);
    } catch (error) {
      // errorHandler(dispatch, error);
    } finally {
      setChartLoader((prevState) => prevState - 1);
    }
  };

  /**
   * Creates an updated chart configuration by renaming the series
   * where `data` is "ep_feed" to the client-specific forecast name
   * from adaModuleConfiguratorReducer (if available).
   * All other series remain unchanged.
   */
  const updatedChartConfig = {
    ...chartConfig,
    seriesData: chartConfig?.seriesData?.map((series) => {
      if (
        series?.data === "ep_feed" &&
        adaModuleConfiguratorReducer?.client_forecast_name
      ) {
        return {
          ...series,
          name: adaModuleConfiguratorReducer.client_forecast_name,
        };
      }
      return series;
    }),
  };

  return (
    <div className={classes.chartContainer}>
      <LoadingOverlay
        loader={
          chartLoader ||
          // historicChartLoader ||
          adaForecastMultiplierReducer?.multiplierLoaderCount ||
          adaReducer?.loaderComponentCount
        }
        isCustomLoader={true}
      >
        {showHeader && (
          <div className={classes.chartHeader}>Forecast Visualization</div>
        )}
        {/* {showRedirectToADAButton && (
          <div
            className={classNames(
              globalClasses.layoutAlignEnd,
              globalClasses.marginTop
            )}
            style={{
              paddingBottom: "15px",
              paddingTop: "15px",
              paddingRight: "15px",
              cursor: "pointer",
            }}
          >
            <Button
              id="forecastManagement"
              onClick={redirectToForecastManagement}
              variant="primary"
            >
              Forecast Management
            </Button>
          </div>
        )} */}
        <div
          className={clsx(classes.chartFilters, {
            [classes.chartFiltersHide]: isChartLabelFiltersHidden,
          })}
        >
          {!hideChartFilters &&
            !isChartLabelFiltersHidden &&
            activeTab === index && (
              <Suspense fallback={<LoadingOverlay loader={true} />}>
                {adaReducer?.clientConfig?.attribute_value?.client ===
                "Levis" ? (
                  <AdvanceFilterGroup
                    activeKey={activeKey}
                    id={id}
                    setChartLoader={setChartLoader}
                    fetchChartData={fetchChartData}
                    setSelectedGraphFilters={setSelectedGraphFilters}
                    setFilterApplied={setFilterApplied}
                  />
                ) : (
                  <ChartFilters
                    activeKey={activeKey}
                    id={id}
                    setChartLoader={setChartLoader}
                    fetchChartData={fetchChartData}
                    setSelectedGraphFilters={setSelectedGraphFilters}
                    setFilterApplied={setFilterApplied}
                  />
                )}
              </Suspense>
            )}
        </div>

        {/* {adaReducer?.clientConfig?.attribute_value?.show_features?.kpi &&
        !hideChartKPI && (
          <GraphKpi id={id} selectedGraphFilters={selectedGraphFilters} />
        )} */}

        {chartConfig &&
          (filterApplied ? (
            <ChartWithAppliedFilters
              activeKey={activeKey}
              refreshChartDataCounter={refreshChartDataCounter}
              counterOnEditHierarchyChange={counterOnEditHierarchyChange}
              id={id}
              chartConfig={updatedChartConfig}
              parentControlledVal={parentControlledVal}
              hidePastHistoricData={hidePastHistoricData}
              customStyleChartContainer={customStyleChartContainer}
              isCalledFromMFPDashboard={isCalledFromMFPDashboard}
              chartData={chartData}
              setChartData={setChartData}
              fetchChartData={fetchChartData}
              selectedGraphFilters={selectedGraphFilters}
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
          ) : (
            <ChartWithoutAppliedFilters
              id={id}
              chartConfig={updatedChartConfig}
              parentControlledVal={parentControlledVal}
              hidePastHistoricData={hidePastHistoricData}
              customStyleChartContainer={customStyleChartContainer}
              isCalledFromMFPDashboard={isCalledFromMFPDashboard}
              isChartLabelFiltersHidden={isChartLabelFiltersHidden}
            />
          ))}
      </LoadingOverlay>
    </div>
  );
});

export default ChartContainer;

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    boxShadow: "0px 0px 4px 0px rgba(0, 0, 0, 0.12)",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  chartHeader: {
    fontSize: "medium",
    fontWeight: "600",
    paddingLeft: "16px",
    paddingTop: "16px",
  },
  chartFilters: {
    paddingLeft: "16px",
    marginTop: "15px",
  },
  chartFiltersHide: {
    display: "none",
  },
}));
