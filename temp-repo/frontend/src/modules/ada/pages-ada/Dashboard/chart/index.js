import React, { forwardRef, useEffect, useState } from "react";
import Charts from "core/Utils/charts";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { getChartData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  adjustedPayload,
  chartDataPayload,
  createPayloadForADAVisual,
  formattedAdjustedPayload,
  getSelectedProductStoreFilters,
  overrideDeepNestedObject,
  updatedChartData,
} from "modules/ada/utils-ada/utilityFunctions";
import { connect, useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { cloneDeep, isEmpty } from "lodash";
import { useHistoricData } from "./useHistoricData";
import ChartFilters from "./ChartFilters";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import GraphKpi from "./GraphKpi";
import { Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { ADA_FORECAST_MANGEMENT } from "modules/ada/constants-ada/routesContants";
import classNames from "classnames";
import { useHistory } from "react-router";
import { ADA_VISUAL } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { setCounterToTriggerForecastCustomHook } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { makeStyles } from "@mui/styles";

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

  const { historicChartData, historicChartLoader } = useHistoricData(
    selectedGraphFilters,
    id === "IA",
    hidePastHistoricData,
    filterApplied,
    isCalledFromMFPDashboard
  );

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const adaVisualFilterConfiguration = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "adaVisualFilterConfiguration"
      ]
  );

  const classes = useStyles();

  const updateForecastData = (data) => {
    if (parentControlledVal === +1) {
      return data;
    }
    let chartDataCopy = cloneDeep(data);
    chartDataCopy?.ia_forecast_data?.forEach((week) => {
      let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
      let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];

      let multiplierDataCurrWeek =
        adaForecastMultiplierReducer?.[id]?.[currWeek];

      if (multiplierDataCurrWeek) {
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
      true
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
      let payload = prepareChartDataPayload(selected);

      setChartLoader((prevState) => prevState + 1);

      const response = await getChartData(payload);
      setChartData(response);
      //setFilterApplied(false);
      setIsMultiplierUpdated((prev) => prev + 1);
    } catch (error) {
      // errorHandler(dispatch, error);
    } finally {
      setChartLoader((prevState) => prevState - 1);
    }
  };

  useEffect(() => {
    if (isEmpty(adaForecastMultiplierReducer?.[id])) return;
    let updatedChartDataWithMultiplierRatio = cloneDeep(
      updateForecastData(chartData)
    );
    setChartData(updatedChartDataWithMultiplierRatio);
  }, [isMultiplierUpdated]);

  useEffect(() => {
    if (isEmpty(adaForecastMultiplierReducer?.[id])) return;
    setIsMultiplierUpdated((prev) => prev + 1);
  }, [adaForecastMultiplierReducer?.[id]]);

  useEffect(() => {
    if (!activeKey) return;

    // use response from custom hook for chart data if filters are not applied in chart
    //  as in both the places we are calling same api with same payload
    if (
      filterApplied ||
      isCalledFromMFPDashboard ||
      id === "IA" ||
      isPredictedDataFetched
    ) {
      fetchChartData();
    } else {
      let chartData = cloneDeep(adaForecastMultiplierReducer?.allChartData);
      setChartData(chartData);
    }
  }, [activeKey, adaForecastMultiplierReducer?.allChartData]);

  useEffect(() => {
    if (!activeKey || isEmpty(chartData) || !refreshChartDataCounter) {
      return;
    }

    if (filterApplied) {
      fetchChartData();
    } else {
      dispatch(setCounterToTriggerForecastCustomHook());
    }
  }, [refreshChartDataCounter]);

  useEffect(() => {
    if (!activeKey || isEmpty(chartData) || !adaReducer?.[id]) {
      return;
    }

    if (filterApplied) {
      fetchChartData();
    } else {
      dispatch(setCounterToTriggerForecastCustomHook());
    }
  }, [adaReducer?.[id]]);

  useEffect(() => {
    if (!activeKey || isEmpty(chartData)) return;

    if (
      filterApplied ||
      isCalledFromMFPDashboard ||
      id === "IA" ||
      isPredictedDataFetched
    ) {
      fetchChartData();
    }
  }, [adaReducer?.isEligible]);

  useEffect(() => {
    if (!counterOnEditHierarchyChange) return;
    if (!filterApplied) {
      let L0TotalData = editHierarchyTotalRowInstance?.current?.api?.getRowNode(
        "total"
      )?.data;
      if (
        L0TotalData?.last_updated_data &&
        Object.keys(L0TotalData?.last_updated_data).length
      ) {
        let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
        let fiscal_year_week = [FISCAL_KEY_MAPPING[aggLevelSelected]];

        let key = Object.keys(L0TotalData?.last_updated_data);
        // let newValue = Object.values(L0TotalData?.last_updated_data);
        chartData?.ia_forecast_data?.map((data) => {
          key.map((val) => {
            if (data?.[fiscal_year_week] === parseInt(val)) {
              data.adjusted_forecast_qty = L0TotalData?.last_updated_data[val];
            }
          });
        });
      }
    } else {
      fetchChartData();
    }

    //fetchChartData();
  }, [counterOnEditHierarchyChange]);

  useEffect(() => {
    if (!lastEditedDrivers?.length) return;
    const appendChart = async () => {
      try {
        let appendPayload = prepareChartDataPayload(selectedGraphFilters);

        //when driver forecast is updated only send all the edited DF's
        appendPayload.adjusted = appendPayload.adjusted.filter(
          ({ promo_percentage }) => promo_percentage
        );

        appendPayload.adjusted_price_point = appendPayload.adjusted_price_point.filter(
          ({ price_point }) => price_point
        );
        setChartLoader((prevState) => prevState + 1);

        const response = await getChartData(appendPayload);

        let updatedResponse = overrideDeepNestedObject(
          chartData,
          response,
          adaReducer
        );

        setChartData(updatedResponse);
        setIsPredictedDataFetched(true);
      } catch (error) {
        console.log("🚀 ~ file: index.js:267 ~ appendChart ~ error:", error);
        // errorHandler(dispatch, error);
      } finally {
        setChartLoader((prevState) => prevState - 1);
      }
    };
    appendChart();
  }, [lastEditedDrivers]);

  const redirectToForecastManagement = () => {
    let adaPayload = createPayloadForADAVisual(
      adaReducer,
      adaVisualFilterConfiguration?.appliedFilterData?.dependencyData,
      isRedirectedFromInventory
    );
    localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
    history.push({
      pathname:
        adaReducer?.isRedirectedFromInventory || isRedirectedFromInventory
          ? ADA_VISUAL
          : ADA_FORECAST_MANGEMENT,
      isRedirectedFromMFPDashboard: true,
      adaPayload: JSON.stringify(adaPayload),
    });
  };

  return (
    <div className={classes.chartContainer}>
      <LoadingOverlay
        loader={
          chartLoader ||
          historicChartLoader ||
          adaForecastMultiplierReducer?.multiplierLoaderCount
        }
        isCustomLoader={true}
      >
        {showHeader && (
          <div className={classes.chartHeader}>Forecast Visualization</div>
        )}
        {showRedirectToADAButton && (
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
        )}
        <div className={classes.chartFilters}>
          {!hideChartFilters && (
            <ChartFilters
              activeKey={activeKey}
              id={id}
              setChartLoader={setChartLoader}
              fetchChartData={fetchChartData}
              setSelectedGraphFilters={setSelectedGraphFilters}
              setFilterApplied={setFilterApplied}
            />
          )}
        </div>

        {adaReducer?.clientConfig?.attribute_value?.show_features?.kpi &&
          !hideChartKPI && (
            <GraphKpi id={id} selectedGraphFilters={selectedGraphFilters} />
          )}

        {chartConfig && (
          <Charts
            customStyleChartContainer={customStyleChartContainer}
            options={updatedChartData(
              chartConfig,
              chartData,
              historicChartData,
              adaReducer,
              id,
              hidePastHistoricData
            )}
          />
        )}
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
  },
}));
