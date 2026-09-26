import React, { useEffect, useState } from "react";
import Charts from "core/Utils/charts";
import theme from "core/Styles/theme";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import globalStyles from "core/Styles/globalStyles";
import { makeStyles } from "@mui/styles";
import {
  appendPrevYearsData,
  appendPrevYearsDiscountData,
  isNumber,
  PERIOD_MAPPING,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import { isEmpty } from "lodash";
import colours from "core/Styles/colours";
import { Accordion } from "impact-ui-v3";

const useStyles = makeStyles();

const ScenarioComparisonChart = ({ loader, showScenario, showScenario2 }) => {
  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const [chartData, setChartData] = useState([]);
  const [discountActuals, setDiscountActuals] = useState([]);
  const [allFiscalWeeks, setAllFiscalWeeks] = useState([]);
  const [accordionValue, setAccordionValue] = useState(
    "Scenario Comparison Forecast"
  );

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const classes = useStyles();
  const globalClasses = globalStyles();

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
        ({ name }) => name === "Scenario 1 User Forecast"
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

    let futuristicFiscalWeeks =
      adaForecastMultiplierReducer?.forecastColumns?.map(
        ({ column_name }) => column_name
      ) || [];

    let mergedFiscalWeeks = [...futuristicFiscalWeeks];
    let fiscalWeeks = [];
    let finalChartData = [];
    let combinedActualsDiscount = [];

    if (
      !isEmpty(adaReducer?.selectedHistoricValue) &&
      !isEmpty(adaReducer?.historicalDataFiscalWeek) &&
      !isEmpty(adaForecastMultiplierReducer?.historicalColumns)
    ) {
      let historicalColumns = [
        ...adaForecastMultiplierReducer?.historicalColumns,
      ];
      if (adaReducer?.selectedHistoricValue?.length) {
        let lastHistoricWeek = adaReducer?.historicalDataFiscalWeek?.start_fw;
        let index = historicalColumns.findIndex(
          (week) => week.column_name === lastHistoricWeek.toString()
        );
        let slicedCols = historicalColumns.slice(
          index - historicalColumns?.length
        );
        mergedFiscalWeeks.unshift(
          ...slicedCols?.map(({ column_name }) => column_name)
        );
      } else {
        mergedFiscalWeeks.unshift(
          ...historicalColumns?.map(({ column_name }) => column_name)
        );
      }
    }
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
      if (isNumber(key) || isNumber(key?.slice(0, -1))) {
        fiscalWeeks.push(key);
        if (
          actualData.hasOwnProperty(key) &&
          actualData[key] !== null &&
          key &&
          actualData !== undefined
        ) {
          actualForecast.data.push(+actualData[key]);
        } else {
          actualForecast.data.push(null);
        }
        if (
          actualsData_discount.hasOwnProperty(key) &&
          actualsData_discount[key] !== null &&
          key &&
          actualsData_discount !== undefined
        ) {
          actualsDiscount.data.push(+actualsData_discount[key]);
        } else {
          actualsDiscount.data.push(null);
        }
        if (
          IATabData.hasOwnProperty(key) &&
          IATabData[key].IA !== null &&
          IATabData[key].IA !== undefined
        ) {
          originalIAForecast.data.push(
            +IATabData[key].IA.toFixed(fixedDecimals)
          );
        } else {
          originalIAForecast.data.push(null);
        }
        if (
          adjustedTabData.hasOwnProperty(key) &&
          adjustedTabData[key].IA !== null &&
          adjustedTabData[key].IA !== undefined
        ) {
          adjustedIAForecast.data.push(
            +adjustedTabData[key].IA.toFixed(fixedDecimals)
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
            +scenario1TabData[key].IA.toFixed(fixedDecimals)
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
            +scenario2TabData[key].IA.toFixed(fixedDecimals)
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

    if (
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.show_ia_adjusted_forecast === false
    ) {
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
      if (
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_ia_adjusted_forecast === false
      ) {
        finalChartData.push(scenario1UserForecast);
      } else {
        finalChartData.push(scenario1IAForecast, scenario1UserForecast);
      }
    }

    if (showScenario2) {
      if (
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_ia_adjusted_forecast === false
      ) {
        finalChartData.push(scenario2UserForecast);
      } else {
        finalChartData.push(scenario2IAForecast, scenario2UserForecast);
      }
    }

    finalChartData.push(actualForecast);

    let allowedDecimal =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;

    let lastYearData = appendPrevYearsData(
      adaReducer,
      adaForecastMultiplierReducer
    );

    let lastYearDataDiscount = appendPrevYearsDiscountData(
      adaReducer,
      adaForecastMultiplierReducer
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

      const keys = mergedFiscalWeeks;

      keys.forEach((key) => {
        if (isNumber(key) || isNumber(key?.slice(0, -1))) {
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
    lastYearDataDiscount?.forEach((lastYearRow, i) => {
      let lastYearRowGraphData = {
        name: lastYearRow.row,
        color: historicalYearsDiscountColorConfig?.[i],
        data: [],
        yAxis: 1,
      };

      const keys = mergedFiscalWeeks;

      keys.forEach((key) => {
        if (isNumber(key)) {
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
    setChartData(finalChartData);

    setDiscountActuals(combinedActualsDiscount);

    setAllFiscalWeeks(fiscalWeeks);
  }, [adaForecastMultiplierReducer, adaReducer?.selectedHistoricValue]);

  return (
    <div className={globalClasses.accordianWrapper}>
      <Accordion
        label="Scenario Comparison Forecast"
        isSingleItem={true}
        singleData={{
          header: "Scenario Comparison Forecast",
          content: (
            <LoadingOverlay loader={loader}>
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
          value: "Scenario Comparison Forecast",
        }}
        expanded={accordionValue}
        onChange={(value) => {
          if (!accordionValue) {
            setAccordionValue("Scenario Comparison Forecast");
          } else {
            setAccordionValue(null);
          }
        }}
      />
    </div>
  );
};

export default ScenarioComparisonChart;

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
        secondaryAxisTitle: "Discount %",
        color: colours.black,
        max: 100,
        min: 0,
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
      ? [...seriesData, ...discountActuals]
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
  }
  return chartOptions;
};
