import React, { lazy, Suspense, useEffect, useState } from "react";
import Charts from "core/Utils/charts";
import theme from "core/Styles/theme";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import globalStyles from "core/Styles/globalStyles";
import { makeStyles } from "@mui/styles";
import { useTranslation } from "impact-ui-v3";
import {
  appendPrevYearsData,
  appendPrevYearsDiscountData,
  getHistoricYearLabel,
  isNumber,
  PERIOD_MAPPING,
  weekEndDateLabel,
  handlePredictedTimePeriod,
  handleHistoricTimePeriod,
  markHistoricalWeeks,
  isAdjustedForecastHidden,
} from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import colours from "core/Styles/colours";
import { Accordion } from "impact-ui-v3";
import Highcharts from "highcharts";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import { getCombinedChartData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

const ChartFilters = lazy(() =>
  import("../../Dashboard/chart/ChartFilters.js")
);

const useStyles = makeStyles();

const mergeByRow = (arr1 = [], arr2 = []) => {
  const map = new Map(
    arr2.filter((item) => item?.row).map((item) => [item.row, item])
  );

  return arr1.map((item) => {
    if (!item?.row) return item;

    const match = map.get(item.row);

    return match ? { ...item, ...match } : item;
  });
};

const ScenarioComparisonChart = ({
  loader,
  showScenario,
  showScenario2,
  activeKey,
  id,
}) => {
  const { t } = useTranslation();
  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const [chartData, setChartData] = useState([]);
  const [discountActuals, setDiscountActuals] = useState([]);
  const [allFiscalWeeks, setAllFiscalWeeks] = useState([]);
  const [accordionValue, setAccordionValue] = useState(
    t("ada.dashboard.scenarioComparisonForecast")
  );

  const [chartLoader, setChartLoader] = useState(0);
  const [selectedGraphFilters, setSelectedGraphFilters] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const [filteredChartData, setFilteredChartData] = useState(null);
  const [showVisualizationFilters, setShowVisualizationFilters] = useState(
    false
  );

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const adaModuleConfiguratorReducer = useSelector(
    (store) =>
      store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
  );
  const predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const adjustedForecastHiddden = isAdjustedForecastHidden(
    adaModuleConfiguratorReducer,
    adaReducer
  );

  const fetchChartData = async (selected = selectedGraphFilters) => {
    try {
      setChartLoader((prevState) => prevState + 1);
      const clonedReducer = cloneDeep(adaReducer);

      let selectedStoreFilters = selected?.filter(
        (elem) => elem.dimension === "store"
      );
      let selectedProductFilters = selected?.filter(
        (elem) => elem.dimension === "product"
      );

      if (selectedStoreFilters?.length) {
        clonedReducer.store = selectedStoreFilters;
      }
      if (selectedProductFilters?.length) {
        clonedReducer.product = selectedProductFilters;
      }

      const response = await getCombinedChartData(clonedReducer);
      setFilteredChartData(response);
    } catch (error) {
      console.error("Error fetching comparison chart data:", error);
    } finally {
      setChartLoader((prevState) => prevState - 1);
    }
  };

  useEffect(() => {
    if (
      isEmpty(adaForecastMultiplierReducer?.IA) ||
      isEmpty(adaForecastMultiplierReducer?.adjusted)
    ) {
      return;
    }

    let allTabs =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.tabs;
    let adjustedTabSeriesData = allTabs?.[1]?.chartConfig?.seriesData;
    let scenario1TabSeriesData = allTabs?.[2]?.chartConfig?.seriesData;
    let scenario2TabSeriesData = allTabs?.[3]?.chartConfig?.seriesData;
    let comparisonTabConfig = allTabs?.find((tab) => tab?.id === "Comparison");
    if (comparisonTabConfig) {
      setShowVisualizationFilters(
        comparisonTabConfig?.showVisualizationFilters
      );
    }

    const customAdjustedIALabel =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_adjusted_IA_label;
    const customActualsLabel =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_actuals_label;

    let originalIAForecast = {
      name: "Original IA Forecast",
      color: adjustedTabSeriesData?.find(
        ({ name }) => name === "Original IA Forecast"
      )?.color,
      data: [],
    };
    let adjustedIAForecast = {
      name: "Adjusted IA Forecast",
      color: adjustedTabSeriesData?.find(
        ({ name }) => name === "Adjusted IA Forecast"
      )?.color,
      data: [],
    };

    let adjustedUserForecast = {
      name: customAdjustedIALabel || "Adjusted User Forecast",
      color: adjustedTabSeriesData?.find(
        ({ name }) => name === "Adjusted User Forecast"
      )?.color,
      data: [],
    };
    let scenario1IAForecast = {
      name: "Scenario 1 IA Forecast",
      color: scenario1TabSeriesData?.find(
        ({ name }) => name === "Scenario 1 IA Forecast"
      )?.color,
      data: [],
    };
    let scenario1UserForecast = {
      name: `Scenario 1 ${customAdjustedIALabel || "User Forecast"}`,
      color: scenario1TabSeriesData?.find(
        ({ name }) => name === `Scenario 1 "User Forecast"}`
      )?.color,
      data: [],
    };
    let scenario2IAForecast = {
      name: "Scenario 2 IA Forecast",
      color: scenario2TabSeriesData?.find(
        ({ name }) => name === "Scenario 2 IA Forecast"
      )?.color,
      data: [],
    };
    let scenario2UserForecast = {
      name: `Scenario 2 ${customAdjustedIALabel || "User Forecast"}`,
      color: scenario2TabSeriesData?.find(
        ({ name }) => name === "Scenario 2 User Forecast"
      )?.color,
      data: [],
    };

    let actualForecast = {
      name: customActualsLabel || "Actual data",
      color: adjustedTabSeriesData?.find(({ name }) => name === "Actual data")
        ?.color,
      data: [],
    };

    let actualsDiscountColor =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.actualsDiscountColor;

    let actualsDiscount = {
      name: "Actuals Discount %",
      color: actualsDiscountColor,
      data: [],
      yAxis: 1,
    };

    // actuals
    let historicFiscalWeeks = handleHistoricTimePeriod(adaReducer);
    let futuristicFiscalWeeks = handlePredictedTimePeriod(adaReducer);

    // for later---need to fix common weeks in comparison tabs

    // historicFiscalWeeks = historicFiscalWeeks.map((week) => {
    //   if (futuristicFiscalWeeks.includes(week)) {
    //     week = `${week}H`;
    //   }
    //   return week;
    // });

    let mergedFiscalWeeks = [
      "forecast_multiplier",
      ...historicFiscalWeeks,
      ...futuristicFiscalWeeks,
    ];
    let fiscalWeeks = [];
    let finalChartData = [];
    let combinedActualsDiscount = [];

    // if (
    //   !isEmpty(adaReducer?.selectedHistoricValue) &&
    //   !isEmpty(adaReducer?.historicalDataFiscalWeek) &&
    //   !isEmpty(adaForecastMultiplierReducer?.historicalColumns)
    // ) {
    //   let historicalColumns = [
    //     ...adaForecastMultiplierReducer?.historicalColumns,
    //   ];
    //   console.log(
    //     "🚀 ~ useEffect ~ adaReducer?.selectedHistoricValue:",
    //     adaReducer?.selectedHistoricValue
    //   );
    //   if (adaReducer?.selectedHistoricValue?.length) {
    //     let lastHistoricWeek = adaReducer?.historicalDataFiscalWeek?.start_fw;
    //     let index = historicalColumns.findIndex(
    //       (week) => week.column_name === lastHistoricWeek.toString()
    //     );
    //     let slicedCols = historicalColumns.slice(
    //       index - historicalColumns?.length
    //     );
    //     mergedFiscalWeeks.unshift(
    //       ...slicedCols?.map(({ column_name }) => column_name)
    //     );
    //   } else {
    //     mergedFiscalWeeks.unshift(
    //       ...historicalColumns?.map(({ column_name }) => column_name)
    //     );
    //   }
    // }
    let IATabData = adaForecastMultiplierReducer?.IA || {};
    let actualData = adaForecastMultiplierReducer?.actuals || {};
    let actualsData_discount =
      adaForecastMultiplierReducer?.actualsDiscount || {};
    let adjustedTabData = adaForecastMultiplierReducer?.adjusted || {};
    let scenario1TabData = adaForecastMultiplierReducer?.scenario1 || {};
    let scenario2TabData = adaForecastMultiplierReducer?.scenario2 || {};
    const keys = mergedFiscalWeeks;

    const fixedDecimals =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;

    keys.forEach((key) => {
      if (
        isNumber(key) ||
        isNumber(key?.slice(0, -1)) ||
        predictedFiscalWeeks?.includes(key)
      ) {
        fiscalWeeks.push(key);
        if (
          actualData &&
          actualData.hasOwnProperty(key) &&
          actualData[key] !== null
        ) {
          actualForecast.data.push(+actualData[key]);
        } else if (
          actualData &&
          actualData.hasOwnProperty(`${key}H`) &&
          actualData[`${key}H`] !== null
        ) {
          actualForecast.data.push(+actualData[`${key}H`]);
        } else {
          actualForecast.data.push(null);
        }
        if (
          actualsData_discount &&
          actualsData_discount.hasOwnProperty(key) &&
          actualsData_discount[key] !== null
        ) {
          actualsDiscount.data.push(+actualsData_discount[key]);
        } else if (
          actualsData_discount &&
          actualsData_discount.hasOwnProperty(`${key}H`) &&
          actualsData_discount[`${key}H`] !== null
        ) {
          actualsDiscount.data.push(+actualsData_discount[`${key}H`]);
        } else {
          actualsDiscount.data.push(null);
        }
        if (
          IATabData.hasOwnProperty(key) &&
          IATabData[key] !== null &&
          IATabData[key] !== undefined
        ) {
          if (+IATabData[key]) {
            originalIAForecast.data.push(
              +IATabData[key]?.toFixed(fixedDecimals)
            );
          } else {
            isNumber(+IATabData?.[key]) &&
              originalIAForecast.data.push(
                isNumber + IATabData?.[key]?.toFixed(fixedDecimals)
              );
          }
        } else {
          originalIAForecast.data.push(null);
        }
        if (
          adjustedTabData.hasOwnProperty(key) &&
          adjustedTabData[key]?.IA !== null &&
          adjustedTabData[key]?.IA !== undefined
        ) {
          adjustedIAForecast.data.push(
            +adjustedTabData[key]?.IA.toFixed(fixedDecimals)
          );
        } else {
          adjustedIAForecast.data.push(null);
        }
        if (
          adjustedTabData.hasOwnProperty(key) &&
          adjustedTabData[key]?.adjusted !== null &&
          adjustedTabData[key]?.adjusted !== undefined
        ) {
          let adjustedData = +adjustedTabData[key]?.adjusted;

          adjustedUserForecast.data.push(+adjustedData?.toFixed(fixedDecimals));
        } else {
          adjustedUserForecast.data.push(null);
        }
        if (
          scenario1TabData.hasOwnProperty(key) &&
          scenario1TabData[key]?.IA !== null &&
          scenario1TabData[key]?.IA !== undefined
        ) {
          scenario1IAForecast.data.push(
            +scenario1TabData[key]?.IA.toFixed(fixedDecimals)
          );
        } else {
          scenario1IAForecast.data.push(null);
        }
        if (
          scenario1TabData.hasOwnProperty(key) &&
          scenario1TabData[key]?.adjusted !== null &&
          scenario1TabData[key]?.adjusted !== undefined
        ) {
          let scenario1Data = +scenario1TabData[key]?.adjusted;

          scenario1UserForecast.data.push(
            +scenario1Data?.toFixed(fixedDecimals)
          );
        } else {
          scenario1UserForecast.data.push(null);
        }

        if (
          scenario2TabData.hasOwnProperty(key) &&
          scenario2TabData[key]?.IA !== null &&
          scenario2TabData[key]?.IA !== undefined
        ) {
          scenario2IAForecast.data.push(
            +scenario2TabData[key]?.IA.toFixed(fixedDecimals)
          );
        } else {
          scenario2IAForecast.data.push(null);
        }
        if (
          scenario2TabData.hasOwnProperty(key) &&
          scenario2TabData[key]?.adjusted !== null &&
          scenario2TabData[key]?.adjusted !== undefined
        ) {
          let scenario2Data = +scenario2TabData[key]?.adjusted;

          scenario2UserForecast.data.push(
            +scenario2Data?.toFixed(fixedDecimals)
          );
        } else {
          scenario2UserForecast.data.push(null);
        }
      }
    });

    //  let actualsDiscountData = actualData?.map((data) => data.average_discount_percentage_weighted)

    if (adjustedForecastHiddden) {
      finalChartData.push(originalIAForecast, adjustedUserForecast);
    } else {
      finalChartData.push(
        originalIAForecast,
        adjustedIAForecast,
        adjustedUserForecast
      );
    }

    const actualsDiscountFormatted = actualsDiscount.data.map((data) =>
      data ? Number(data.toFixed(fixedDecimals)) : null
    );
    actualsDiscount = { ...actualsDiscount, data: actualsDiscountFormatted };
    combinedActualsDiscount.push(actualsDiscount);
    if (showScenario) {
      if (adjustedForecastHiddden) {
        finalChartData.push(scenario1UserForecast);
      } else {
        finalChartData.push(scenario1IAForecast, scenario1UserForecast);
      }
    }

    if (showScenario2) {
      if (adjustedForecastHiddden) {
        finalChartData.push(scenario2UserForecast);
      } else {
        finalChartData.push(scenario2IAForecast, scenario2UserForecast);
      }
    }

    finalChartData.push(actualForecast);

    let allowedDecimal =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;

    let lastYearData = cloneDeep(
      adaForecastMultiplierReducer?.historicalActual
    );

    let lastYearDataDiscount = cloneDeep(
      adaForecastMultiplierReducer?.historicactualsDiscount
    );

    let historicalDiscount = cloneDeep(
      adaForecastMultiplierReducer.historicActualsDiscountLastYear
    );

    const predictedFiscalWeeksReducer = adaReducer?.predictedFiscalWeeks;

    const updatedhistoricalDiscount = markHistoricalWeeks(
      historicalDiscount,
      predictedFiscalWeeksReducer
    );

    let mergedDiscountpercentage = [];

    mergedDiscountpercentage = mergeByRow(
      lastYearDataDiscount,
      updatedhistoricalDiscount
    );

    let historicalYearsColorConfig =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.historicalYearsColorConfig || [];
    lastYearData?.forEach((lastYearRow, i) => {
      let lastYearRowGraphData = {
        name: lastYearRow.row,
        color: historicalYearsColorConfig?.[i],
        data: [],
      };

      const predictedWeeksForYear = handlePredictedTimePeriod(adaReducer);

      const keys = mergedFiscalWeeks;

      keys.forEach((key) => {
        if (
          isNumber(key) ||
          isNumber(key?.slice(0, -1)) ||
          predictedWeeksForYear?.includes(key)
        ) {
          fiscalWeeks.push(key);
          if (lastYearRow.hasOwnProperty(key)) {
            let fiscalPrevYearData = +lastYearRow[key];
            if (lastYearRow[key] !== null) {
              lastYearRowGraphData.data.push(
                +fiscalPrevYearData.toFixed(allowedDecimal)
              );
            } else {
              lastYearRowGraphData.data.push(null);
            }
          } else {
            lastYearRowGraphData.data.push(null);
          }
        }
      });

      finalChartData.push(lastYearRowGraphData);
    });

    let historicalYearsDiscountColorConfig =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.historicalYearsDiscountColorConfig;
    mergedDiscountpercentage?.forEach((lastYearRow, i) => {
      let lastYearRowGraphData = {
        name: lastYearRow.row,
        color: historicalYearsDiscountColorConfig?.[i],
        data: [],
        yAxis: 1,
      };

      const keys = mergedFiscalWeeks;
      keys.forEach((key) => {
        let fiscalPeriods = handlePredictedTimePeriod(adaReducer);
        if (isNumber(key) || fiscalPeriods?.includes(key)) {
          fiscalWeeks.push(key);
          if (lastYearRow.hasOwnProperty(key)) {
            let fiscalPrevYearData = +lastYearRow[key];

            lastYearRowGraphData.data.push(
              +fiscalPrevYearData.toFixed(allowedDecimal)
            );
          } else {
            lastYearRowGraphData.data.push(null);
          }
        }
      });
      const lastYearRowGraphDataFormatted = lastYearRowGraphData.data.map(
        (data) => (data !== null ? Number(data.toFixed(fixedDecimals)) : null)
      );
      lastYearRowGraphData = {
        ...lastYearRowGraphData,
        data: lastYearRowGraphDataFormatted,
      };
      combinedActualsDiscount.push(lastYearRowGraphData);
    });
    const commonWeeks = historicFiscalWeeks.filter((week) =>
      futuristicFiscalWeeks.includes(week)
    );
    const replacedWeeks = {};
    fiscalWeeks = fiscalWeeks.map((week) => {
      if (commonWeeks.includes(week) && !replacedWeeks[week]) {
        replacedWeeks[week] = true;
        return `${week}(H)`;
      }
      return week;
    });
    setChartData(finalChartData);

    setDiscountActuals(combinedActualsDiscount);

    setAllFiscalWeeks(fiscalWeeks);
  }, [
    adaForecastMultiplierReducer,
    adaForecastMultiplierReducer?.adjusted,
    adaReducer?.selectedHistoricValue,
    adaReducer?.xAxisStaticDates?.fiscal_ids?.length &&
      adaReducer?.xAxisStaticDates?.fiscal_ids,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
  ]);

  // Process filteredChartData from API when filters are applied
  useEffect(() => {
    if (!filteredChartData || !filterApplied) return;

    const {
      ia_forecast_data = [],
      ia_default_forecast_data = [],
      actuals_data = [],
      historical_actuals_data = [],
    } = filteredChartData;

    let allTabs =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.tabs;
    let adjustedTabSeriesData = allTabs?.[1]?.chartConfig?.seriesData;
    let scenario1TabSeriesData = allTabs?.[2]?.chartConfig?.seriesData;
    let scenario2TabSeriesData = allTabs?.[3]?.chartConfig?.seriesData;

    const customAdjustedIALabel =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_adjusted_IA_label;
    const customActualsLabel =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.custom_actuals_label;

    const fixedDecimals =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;

    const aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
    const fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

    let fiscalWeeks = [];
    let originalIAData = [];
    let adjustedIAData = [];
    let adjustedUserData = [];
    let actualData = [];
    let actualsDiscountData = [];

    ia_default_forecast_data.forEach((item) => {
      const week = item[fiscalKey];
      if (!fiscalWeeks.includes(week)) fiscalWeeks.push(week);
      originalIAData.push(
        isNumber(item?.predicted_qty)
          ? +(+item.predicted_qty).toFixed(fixedDecimals)
          : null
      );
    });

    ia_forecast_data.forEach((item) => {
      const week = item[fiscalKey];
      if (!fiscalWeeks.includes(week)) fiscalWeeks.push(week);
      adjustedIAData.push(
        isNumber(item?.predicted_qty)
          ? +(+item.predicted_qty).toFixed(fixedDecimals)
          : null
      );
      adjustedUserData.push(
        isNumber(item?.adjusted_forecast_qty)
          ? +(+item.adjusted_forecast_qty).toFixed(fixedDecimals)
          : null
      );
    });

    actuals_data.forEach((item) => {
      actualData.push(
        isNumber(item?.actual) ? +(+item.actual).toFixed(fixedDecimals) : null
      );
      actualsDiscountData.push(
        isNumber(item?.average_discount_percentage_weighted)
          ? +(item.average_discount_percentage_weighted * 100).toFixed(
              fixedDecimals
            )
          : null
      );
    });

    let originalIAForecast = {
      name: "Original IA Forecast",
      color: adjustedTabSeriesData?.find(
        ({ name }) => name === "Original IA Forecast"
      )?.color,
      data: originalIAData,
    };
    let adjustedIAForecast = {
      name: "Adjusted IA Forecast",
      color: adjustedTabSeriesData?.find(
        ({ name }) => name === "Adjusted IA Forecast"
      )?.color,
      data: adjustedIAData,
    };
    let adjustedUserForecast = {
      name: customAdjustedIALabel || "Adjusted User Forecast",
      color: adjustedTabSeriesData?.find(
        ({ name }) => name === "Adjusted User Forecast"
      )?.color,
      data: adjustedUserData,
    };
    let actualForecast = {
      name: customActualsLabel || "Actual data",
      color: adjustedTabSeriesData?.find(({ name }) => name === "Actual data")
        ?.color,
      data: actualData,
    };

    let actualsDiscountColor =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.actualsDiscountColor;
    let actualsDiscount = {
      name: "Actuals Discount %",
      color: actualsDiscountColor,
      data: actualsDiscountData,
      yAxis: 1,
    };

    let finalChartData = [];
    let combinedActualsDiscount = [actualsDiscount];

    if (adjustedForecastHiddden) {
      finalChartData.push(originalIAForecast, adjustedUserForecast);
    } else {
      finalChartData.push(
        originalIAForecast,
        adjustedIAForecast,
        adjustedUserForecast
      );
    }

    // Build Scenario 1/2 series from Redux (not returned by getCombinedChartData API)
    let scenario1TabData = adaForecastMultiplierReducer?.scenario1 || {};
    let scenario2TabData = adaForecastMultiplierReducer?.scenario2 || {};

    let scenario1IAForecastData = [];
    let scenario1UserForecastData = [];
    let scenario2IAForecastData = [];
    let scenario2UserForecastData = [];

    fiscalWeeks.forEach((key) => {
      if (
        scenario1TabData.hasOwnProperty(key) &&
        scenario1TabData[key]?.IA !== null &&
        scenario1TabData[key]?.IA !== undefined
      ) {
        scenario1IAForecastData.push(
          +scenario1TabData[key]?.IA.toFixed(fixedDecimals || 0)
        );
      } else {
        scenario1IAForecastData.push(null);
      }
      if (
        scenario1TabData.hasOwnProperty(key) &&
        scenario1TabData[key]?.adjusted !== null &&
        scenario1TabData[key]?.adjusted !== undefined
      ) {
        scenario1UserForecastData.push(
          +(+scenario1TabData[key]?.adjusted).toFixed(fixedDecimals || 0)
        );
      } else {
        scenario1UserForecastData.push(null);
      }
      if (
        scenario2TabData.hasOwnProperty(key) &&
        scenario2TabData[key]?.IA !== null &&
        scenario2TabData[key]?.IA !== undefined
      ) {
        scenario2IAForecastData.push(
          +scenario2TabData[key]?.IA.toFixed(fixedDecimals || 0)
        );
      } else {
        scenario2IAForecastData.push(null);
      }
      if (
        scenario2TabData.hasOwnProperty(key) &&
        scenario2TabData[key]?.adjusted !== null &&
        scenario2TabData[key]?.adjusted !== undefined
      ) {
        scenario2UserForecastData.push(
          +(+scenario2TabData[key]?.adjusted).toFixed(fixedDecimals || 0)
        );
      } else {
        scenario2UserForecastData.push(null);
      }
    });

    if (showScenario) {
      let scenario1IAForecast = {
        name: "Scenario 1 IA Forecast",
        color: scenario1TabSeriesData?.find(
          ({ name }) => name === "Scenario 1 IA Forecast"
        )?.color,
        data: scenario1IAForecastData,
      };
      let scenario1UserForecast = {
        name: `Scenario 1 ${customAdjustedIALabel || "User Forecast"}`,
        color: scenario1TabSeriesData?.find(
          ({ name }) => name === `Scenario 1 "User Forecast"}`
        )?.color,
        data: scenario1UserForecastData,
      };
      if (adjustedForecastHiddden) {
        finalChartData.push(scenario1UserForecast);
      } else {
        finalChartData.push(scenario1IAForecast, scenario1UserForecast);
      }
    }

    if (showScenario2) {
      let scenario2IAForecast = {
        name: "Scenario 2 IA Forecast",
        color: scenario2TabSeriesData?.find(
          ({ name }) => name === "Scenario 2 IA Forecast"
        )?.color,
        data: scenario2IAForecastData,
      };
      let scenario2UserForecast = {
        name: `Scenario 2 ${customAdjustedIALabel || "User Forecast"}`,
        color: scenario2TabSeriesData?.find(
          ({ name }) => name === "Scenario 2 User Forecast"
        )?.color,
        data: scenario2UserForecastData,
      };
      if (adjustedForecastHiddden) {
        finalChartData.push(scenario2UserForecast);
      } else {
        finalChartData.push(scenario2IAForecast, scenario2UserForecast);
      }
    }

    finalChartData.push(actualForecast);

    // Process historical actuals from API response
    let historicalYearsColorConfig =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.historicalYearsColorConfig || [];
    historical_actuals_data?.forEach((yearObj, i) => {
      const year = Object.keys(yearObj)?.[0];
      const yearData = yearObj[year] || [];
      let lastYearRowGraphData = {
        name:
          i === 0
            ? "Last year Actuals"
            : i === 1
            ? `${getHistoricYearLabel(adaReducer)} Actuals`
            : `FY ${year} Actuals`,
        color: historicalYearsColorConfig?.[i],
        data: yearData.map((item) =>
          isNumber(item?.actual) ? +(+item.actual).toFixed(fixedDecimals) : null
        ),
      };
      finalChartData.push(lastYearRowGraphData);
    });

    // Build Last Year Discount % from Redux (not returned by getCombinedChartData API)
    let lastYearDataDiscount = cloneDeep(
      adaForecastMultiplierReducer?.historicactualsDiscount
    );
    let historicalDiscount = cloneDeep(
      adaForecastMultiplierReducer?.historicActualsDiscountLastYear
    );
    const predictedFiscalWeeksReducer = adaReducer?.predictedFiscalWeeks;
    const updatedhistoricalDiscount = markHistoricalWeeks(
      historicalDiscount,
      predictedFiscalWeeksReducer
    );
    let mergedDiscountpercentage = mergeByRow(
      lastYearDataDiscount,
      updatedhistoricalDiscount
    );

    let historicalYearsDiscountColorConfig =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.historicalYearsDiscountColorConfig;
    mergedDiscountpercentage?.forEach((lastYearRow, i) => {
      let lastYearRowGraphData = {
        name: lastYearRow.row,
        color: historicalYearsDiscountColorConfig?.[i],
        data: [],
        yAxis: 1,
      };
      fiscalWeeks.forEach((key) => {
        if (lastYearRow.hasOwnProperty(key)) {
          let fiscalPrevYearData = +lastYearRow[key];
          lastYearRowGraphData.data.push(
            +fiscalPrevYearData.toFixed(fixedDecimals || 0)
          );
        } else {
          lastYearRowGraphData.data.push(null);
        }
      });
      combinedActualsDiscount.push(lastYearRowGraphData);
    });

    setChartData(finalChartData);
    setDiscountActuals(combinedActualsDiscount);
    setAllFiscalWeeks(fiscalWeeks);
  }, [filteredChartData, filterApplied]);

  return (
    <div className={globalClasses.accordianWrapper}>
      <Accordion
        label={t("ada.dashboard.scenarioComparisonForecast")}
        isSingleItem={true}
        singleData={{
          header: t("ada.dashboard.scenarioComparisonForecast"),
          content: (
            <LoadingOverlay loader={loader || chartLoader}>
              {showVisualizationFilters && (
                <div style={{ paddingLeft: "16px", marginTop: "15px" }}>
                  <Suspense fallback={<LoadingOverlay loader={true} />}>
                    <ChartFilters
                      activeKey={activeKey}
                      id={id || "adjusted"}
                      setChartLoader={setChartLoader}
                      fetchChartData={fetchChartData}
                      setSelectedGraphFilters={setSelectedGraphFilters}
                      setFilterApplied={setFilterApplied}
                    />
                  </Suspense>
                </div>
              )}
              <Charts
                options={updatedChartData(
                  allFiscalWeeks,
                  chartData,
                  discountActuals,
                  adaReducer
                )}
              />
            </LoadingOverlay>
          ),
          value: t("ada.dashboard.scenarioComparisonForecast"),
        }}
        expanded={accordionValue}
        onChange={(value) => {
          if (!accordionValue) {
            setAccordionValue(t("ada.dashboard.scenarioComparisonForecast"));
          } else {
            setAccordionValue(null);
          }
        }}
      />
    </div>
  );
};

export default ScenarioComparisonChart;
export { FISCAL_KEY_MAPPING };

let updatedChartData = (
  fiscalWeeks,
  seriesData,
  discountActuals,
  adaReducer
) => {
  let timeline = adaReducer?.switchTimeLine?.[0]?.value;
  seriesData = seriesData.map((elem) => {
    return { ...elem, yAxis: 0 };
  });

  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  const isDiscountEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.driver_forecast_historic_discount;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && adaReducer?.switchTimeLine?.[0]?.value === "W";
  let seasonBeginDate = [];
  if (showWeekEndDateLabelEnabled) {
    fiscalWeeks.forEach((elem) => {
      seasonBeginDate.push(weekEndDateLabel(elem, adaReducer));
    });
  }

  const chartOptions = {
    type: "line",
    chartType: "barLineChart",
    chartTitle: "",
    axisLegends: {
      xaxis: {
        title: `Fiscal ${PERIOD_MAPPING[timeline]}`,
        categories: showWeekEndDateLabelEnabled ? seasonBeginDate : fiscalWeeks,
        crosshair: true,
      },
      yaxis: {
        primaryAxisTitle: "Sales Unit",
        ...(isDiscountEnabled && {
          secondaryAxisTitle: "Discount %",
          color: colours.black,
          max: 100,
          min: 0,
        }),
      },
    },
    legend: {
      floating: true,
    },
    showToolTip: true,
    show_secondary_axis:
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.show_secondary_axis,
    series: adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_secondary_axis
      ? [...seriesData, ...(isDiscountEnabled ? discountActuals : [])]
      : seriesData,
    isBudgetLabel: true,
    tooltip: {
      valueDecimals:
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.decimalConfig?.chart,
    },
  };

  const decimalConfigForChart =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.chart;
  if (
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting !== true
  ) {
    chartOptions.labelFormatter = `{point.y:.${decimalConfigForChart}f}`;
  } else {
    chartOptions.labelFormatter = function () {
      if (this == null) return "";
      const y = this.y;
      if (y == null) return "";
      return Highcharts.numberFormat(y, decimalConfigForChart);
    };
  }
  return chartOptions;
};
