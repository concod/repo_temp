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
import { Button } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { ADA_FORECAST_MANGEMENT } from "modules/ada/constants-ada/routesContants";
import classNames from "classnames";
import { useHistory } from "react-router";
import { ADA_VISUAL } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { setCounterToTriggerForecastCustomHook } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { infoHandler } from "core/Utils/functions/helpers/errorhandler-helpers";

const ChartWithAppliedFilters = forwardRef((props, ref) => {
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
    chartData,
    setChartData,
    fetchChartData,
    selectedGraphFilters,
  } = props;

  const dispatch = useDispatch();

  const globalClasses = globalStyles();

  const history = useHistory();

  const [graphKpiLoader, setGraphKpiLoader] = useState(false);

  // const [chartData, setChartData] = useState([]);
  console.log("🚀 ~ ChartWithAppliedFilters ~ chartData:", chartData);
  const [chartLoader, setChartLoader] = useState(0);
  // when multiplier is updated, chart section is not trigerring properly. so,
  // in order to show correct response useing below state to trigger change
  const [isMultiplierUpdated, setIsMultiplierUpdated] = useState(0);
  // when pulling historic data, we have to pass in the applied filters
  // that's why copying the applied filters
  // const [selectedGraphFilters, setSelectedGraphFilters] = useState([]);
  // const [filterApplied, setFilterApplied] = useState(false);

  // if filters are applied inside chart component, then we set this flag to true
  // this is to avoid duplicate api call. so, if user toggles, eligible SKU switch
  // and filters were not applied in the graph, then we take response from usehostoric actuals
  // and avoid api call from the chart component
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);

  const { historicChartData, historicChartLoader } = useHistoricData(
    selectedGraphFilters,
    id === "IA",
    hidePastHistoricData,
    true,
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

  const updateForecastData = (data) => {
    //for View Edit Hiererachy, return data from api, as it is, the multiplier won't impact it
    if (parentControlledVal === +1) {
      return data;
    }
    let isAnyPredictedZero = false;
    let chartDataCopy = cloneDeep(data);
    chartDataCopy?.ia_forecast_data?.forEach((week) => {
      let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
      let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];

      let multiplierDataCurrWeek =
        adaForecastMultiplierReducer?.[id]?.[currWeek];

      if (multiplierDataCurrWeek?.IA) {
        let multiplierRatio = multiplierDataCurrWeek.ratio;
        if (week?.predicted_qty === 0) {
          week.adjusted_forecast_qty = week.adjusted_forecast_qty;
          isAnyPredictedZero = true;
        } else {
          week.adjusted_forecast_qty = week.predicted_qty * multiplierRatio;
        }
      }

      return week;
    });
    if (isAnyPredictedZero && filterApplied) {
      infoHandler(
        dispatch,
        "Since Predicted forecast is 0. Hence, updating Adjusted User Forecast in Forecast Deepdive won't update the Adjusted User Forecast in Visualization section",
        5000
      );
    }
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

    const payload = chartDataPayload(
      clonedReducer,
      null,
      null,
      id === "IA",
      null,
      clonedReducer?.isEligible,
      isCalledFromMFPDashboard,
      true,
      null,
      "visualization"
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

  // const fetchChartData = async (selected = selectedGraphFilters) => {
  //   try {
  //     let payload = prepareChartDataPayload(selected);

  //     setChartLoader((prevState) => prevState + 1);

  //     const response = await getChartData(payload);
  //     console.log("🚀 ~ fetchChartData ~ response:", response);
  //     setChartData(response);
  //     //setFilterApplied(false);
  //     setIsMultiplierUpdated((prev) => prev + 1);
  //   } catch (error) {
  //     // errorHandler(dispatch, error);
  //   } finally {
  //     setChartLoader((prevState) => prevState - 1);
  //   }
  // };

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
      // filterApplied ||
      isCalledFromMFPDashboard
      //  ||
      // id === "IA" ||
      // isPredictedDataFetched
    ) {
      fetchChartData();
    }
  }, [activeKey, adaReducer?.isEligible]);

  useEffect(() => {
    if (!activeKey || isEmpty(chartData) || !refreshChartDataCounter) {
      return;
    }

    fetchChartData();
  }, [refreshChartDataCounter]);

  // useEffect(() => {
  //   if (!activeKey || isEmpty(chartData) || !adaReducer?.[id]) {
  //     return;
  //   }

  //   fetchChartData();
  // }, [adaReducer?.[id]]);

  // useEffect(() => {
  //   if (!activeKey || isEmpty(chartData)) return;

  //   if (
  //     filterApplied ||
  //     isCalledFromMFPDashboard ||
  //     id === "IA" ||
  //     isPredictedDataFetched
  //   ) {
  //     fetchChartData();
  //   }
  // }, [adaReducer?.isEligible]);

  useEffect(() => {
    if (!counterOnEditHierarchyChange) return;
    fetchChartData();
  }, [counterOnEditHierarchyChange]);

  // useEffect(() => {
  //   if (!lastEditedDrivers?.length) return;
  //   const appendChart = async () => {
  //     try {
  //       let appendPayload = prepareChartDataPayload(selectedGraphFilters);

  //       //when driver forecast is updated only send all the edited DF's
  //       appendPayload.adjusted = appendPayload.adjusted.filter(
  //         ({ promo_percentage }) => promo_percentage
  //       );

  //       appendPayload.adjusted_price_point = appendPayload.adjusted_price_point.filter(
  //         ({ price_point }) => price_point
  //       );
  //       setChartLoader((prevState) => prevState + 1);

  //       const response = await getChartData(appendPayload);
  //       console.log("🚀 ~ appendChart ~ response:", response);

  //       let updatedResponse = overrideDeepNestedObject(
  //         chartData,
  //         response,
  //         adaReducer
  //       );

  //       setChartData(updatedResponse);
  //       setIsPredictedDataFetched(true);
  //     } catch (error) {
  //       // errorHandler(dispatch, error);
  //     } finally {
  //       setChartLoader((prevState) => prevState - 1);
  //     }
  //   };
  //   appendChart();
  // }, [lastEditedDrivers]);

  return (
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
  );
});

export default ChartWithAppliedFilters;
