import { cloneDeep, invert } from "lodash";
import { batch } from "react-redux";
import {
  driverForecastRowData,
  getForecastMultiplierRowData,
} from "../constants-ada/dataConstants";
import { FISCAL_KEY_MAPPING } from "../constants-ada/stringContants";
import {
  setActuals,
  setActualsDiscount,
  setAllActualsChartData,
  setAllForecastMultiplierData,
  setAllHistoricActualsChartData,
  setAllHistoricPredictedChartData,
  setAllPredictedChartData,
  setHistoricActualsDiscount,
  setHistoricalActualData,
  setHistoricActualsDiscountLastYear,
} from "../services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  getActualsForecastAttributesData,
  getForecastAttributesData,
  getHistoricForecastAttributesData,
  getLandingPageTableColumns,
  setComponentLoaderCount,
  setForecastAttributes,
  setForecastAttributesApiResolved,
  setHistoricActualsFiscalWeeks,
  setHistoricForecastAttributes,
  setHistoricTableColumns,
  setPredictedFiscalWeeks,
  setXaisStaticHistoricDates,
  setXaxisStaticDates,
} from "../services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  getHistoricYearLabel,
  getUniqueByMonth,
  handleCompareBtnClick,
  isNumber,
  mergeHistoricalPeriods,
} from "./utilityFunctions";
import { binaryClosestIdx } from "core/Utils/functions/utils";

export const driverForecastColumnsTransformer = (columns, adaReducer) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.driverForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];

  return columns.map((item) => {
    const newItem = { ...item };
    newItem.tc_code = parseInt(newItem.tc_code);
    newItem.order_of_display = parseInt(newItem.order_of_display);
    if (
      newItem.column_name !== "drivers" ||
      newItem.column_name !== "overall_value"
    ) {
      newItem.formatter = formatter;
    }
    if (
      (newItem.extra && newItem.extra.roundOffTo) ||
      newItem.column_name === "overall_value"
    ) {
      newItem.formatter = "roundOfftoTwoDecimals";
    }
    return newItem;
  }).sort((a, b) => +a.column_name - +b.column_name || a.order_of_display - b.order_of_display);
};

export const forecastMultiplierColumnsTransformer = (columns) => {
  return columns.map((item) => {
    const newItem = { ...item };
    newItem.tc_code = parseInt(newItem.tc_code);
    newItem.order_of_display = parseInt(newItem.order_of_display);
    if (newItem.extra && newItem.extra.roundOffTo) {
      newItem.formatter = "roundOfftoTwoDecimals";
    }
    return newItem;
  }).sort((a, b) => +a.column_name - +b.column_name || a.order_of_display - b.order_of_display);
};

export const driverForecastRowDataTransformer = (
  fiscalWeeks,
  forecastAttributes,
  isIA,
  adaReducer,
  isHistoric,
  t
) => {
  let totalPromoPercentage = 0;
  let allProductSum = 0;
  let isAnyPositiveValue = false;
  let isAllZeroValue = true;
  fiscalWeeks?.forEach((elem) => {
    let promoRow = driverForecastRowData[0];
    let discountRow = driverForecastRowData[1];

    if (adaReducer?.clientConfig?.attribute_value?.client === "Ralph Lauren") {
      discountRow.drivers = "Promo Week Discount Value";
    } else if (t) {
      discountRow.drivers = t("ada.common.discountValue");
    }
    let effectiveDiscountRow = driverForecastRowData[2];
    if (t) {
      effectiveDiscountRow.drivers = t(
        "ada.common.effectiveDiscountPercentage"
      );
    }
    promoRow[elem] = {
      label: "% Off",
      value: "promo_percentage",
    };
    let discountValueKey = isIA ? "ia_discount_value" : "adj_discount_value";
    let effectiveDiscountValueKey = isIA
      ? "ia_eff_discount_value"
      : "adj_eff_discount_value";
    discountRow[elem] = forecastAttributes?.[elem]?.[discountValueKey];

    effectiveDiscountRow[elem] =
      forecastAttributes?.[elem]?.[effectiveDiscountValueKey];

    const discountValue =
      forecastAttributes?.[elem]?.[effectiveDiscountValueKey];

    if (discountValue !== undefined && discountValue !== null) {
      isAnyPositiveValue = true;
      if (discountValue != 0) {
        isAllZeroValue = false;
      }
    }
    effectiveDiscountRow.product_count[elem] =
      forecastAttributes?.[elem]?.product_count || 1;

    totalPromoPercentage +=
      effectiveDiscountRow.product_count[elem] * (discountRow[elem] || 1);

    allProductSum += effectiveDiscountRow.product_count[elem];
  });

  const discountValue = totalPromoPercentage / allProductSum;

  if (!isHistoric) {
    if (totalPromoPercentage && allProductSum && isAnyPositiveValue) {
      driverForecastRowData[1]["overall_value"] = binaryClosestIdx(
        discountValue,
        5,
        95,
        5
      );
      driverForecastRowData[2]["overall_value"] = discountValue;
    } else {
      driverForecastRowData[1]["overall_value"] = null;
      driverForecastRowData[2]["overall_value"] = null;
    }

    if (isAllZeroValue && isAnyPositiveValue) {
      driverForecastRowData[1]["overall_value"] = 0;
      driverForecastRowData[2]["overall_value"] = 0;
    }
  }

  return driverForecastRowData;
};

export const forecastMultiplierRowDataTransformer = (
  fiscalWeeks,
  forecastAttributes,
  isIA,
  mfp,
  isScenarioTab,
  customAdjustedIALabel,
  customMFPLabel,
  adaDashboardReducer,
  showMFPForForecastTable
) => {
  const showDistinctStoreCount =
    adaDashboardReducer?.clientConfig?.attribute_value?.show_features
      ?.showDistinctStoreCount;
  const isMultiplierRoundOff =
    adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.isMultiplierRoundOff;
  const multiplierDecimalToShow =
    adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.multiplier;

  let forecastMultiplierRowData = getForecastMultiplierRowData(
    mfp,
    isScenarioTab,
    customAdjustedIALabel,
    customMFPLabel,
    showDistinctStoreCount,
    showMFPForForecastTable
  );

  fiscalWeeks?.forEach((elem) => {
    let adjustedIARow = forecastMultiplierRowData[0];
    let multiplierRow = forecastMultiplierRowData[1];
    let adjustedUserRow = forecastMultiplierRowData[2];

    // Set multiplier roundOffTo based on configuration
    multiplierRow["roundOffTo"] = isMultiplierRoundOff
      ? multiplierDecimalToShow
      : 2;

    let epFeedRow;
    let finalForecastRow;
    let distinctStoreCountRow;
    if (mfp || showMFPForForecastTable) {
      epFeedRow = forecastMultiplierRowData[3];
      finalForecastRow = forecastMultiplierRowData[4];
    }
    showDistinctStoreCount &&
      (distinctStoreCountRow = forecastMultiplierRowData[5]);
    let adjustedIAValueKey = isIA ? "ia_original_forecast" : "adj_forecast";

    let adjustedUserValueKey = isIA
      ? "ia_original_forecast"
      : "adj_user_forecast";

    adjustedIARow[elem] = forecastAttributes?.[elem]?.[adjustedIAValueKey];
    adjustedUserRow[elem] = forecastAttributes?.[elem]?.[adjustedUserValueKey];
    // Set multiplier only if adjustedUserRow[elem] is defined; otherwise, leave it undefined to avoid invalid division
    multiplierRow[elem] =
      adjustedUserRow[elem] !== undefined
        ? adjustedUserRow[elem] / adjustedIARow[elem]
        : undefined;
    if (mfp) {
      // Get the forecast attributes for the current element
      const attr = forecastAttributes?.[elem];

      // If "final_forecast" exists for this element, update finalForecastRow
      if ("final_forecast" in (attr ?? {})) {
        finalForecastRow[elem] = attr.final_forecast;
      } else {
        finalForecastRow[elem] = undefined;
      }

      // If "client_forecast" exists for this element, update epFeedRow
      if ("client_forecast" in (attr ?? {})) {
        epFeedRow[elem] = attr.client_forecast;
      } else {
        epFeedRow[elem] = undefined;
      }
    }
    showDistinctStoreCount &&
      (distinctStoreCountRow[elem] =
        forecastAttributes?.[elem]?.distinct_store_count);
  });

  return forecastMultiplierRowData;
};

export const visualizationPredictedDataTransformer = (
  fiscalWeeks,
  forecastAttributes,
  adaReducer,
  dispatch
) => {
  let response = {
    ia_forecast_data: [],
    ia_default_forecast_data: [],
  };

  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

  fiscalWeeks?.forEach((elem) => {
    // forecastAttributes?.[elem]?.[adjustedIAValueKey]
    response.ia_default_forecast_data.push({
      [fiscalKey]: elem,
      promo_percentage: forecastAttributes?.[elem]?.ia_discount_value,
      adjusted_forecast_qty: forecastAttributes?.[elem]?.ia_original_forecast,
      predicted_qty: forecastAttributes?.[elem]?.ia_original_forecast,
      ep_feed: forecastAttributes?.[elem]?.client_forecast,
      // Add only if exists
      ...(forecastAttributes?.[elem]?.final_forecast !== undefined && {
        final_forecast: forecastAttributes[elem].final_forecast,
      }),
    });
    response.ia_forecast_data.push({
      [fiscalKey]: elem,
      promo_percentage: forecastAttributes?.[elem]?.adj_eff_discount_value,
      adjusted_forecast_qty: forecastAttributes?.[elem]?.adj_user_forecast,
      predicted_qty: forecastAttributes?.[elem]?.adj_forecast,
      ep_feed: forecastAttributes?.[elem]?.client_forecast,
      // Add only if exists
      ...(forecastAttributes?.[elem]?.final_forecast !== undefined && {
        final_forecast: forecastAttributes[elem].final_forecast,
      }),
    });
  });
  dispatch(setAllPredictedChartData(response));
  return response;
};

export const visualizationHistoricDataTransformer = (
  fiscalWeeks,
  forecastAttributes,
  adaDaReducer,
  dispatch
) => {
  let response = {
    ia_forecast_data: [],
    ia_default_forecast_data: [],
  };

  let aggLevelSelected = adaDaReducer?.switchTimeLine?.[0]?.value;
  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

  fiscalWeeks?.forEach((elem) => {
    // forecastAttributes?.[elem]?.[adjustedIAValueKey]
    response.ia_default_forecast_data.push({
      [fiscalKey]: elem,
      promo_percentage: forecastAttributes?.[elem]?.ia_discount_value,
      adjusted_forecast_qty: forecastAttributes?.[elem]?.ia_original_forecast,
      predicted_qty: forecastAttributes?.[elem]?.ia_original_forecast,
      ep_feed: forecastAttributes?.[elem]?.client_forecast,
    });
    response.ia_forecast_data.push({
      [fiscalKey]: elem,
      promo_percentage: forecastAttributes?.[elem]?.adj_eff_discount_value,
      adjusted_forecast_qty: forecastAttributes?.[elem]?.adj_user_forecast,
      predicted_qty: forecastAttributes?.[elem]?.adj_forecast,
      ep_feed: forecastAttributes?.[elem]?.client_forecast,
    });
  });
  // return response;
  dispatch(setAllHistoricPredictedChartData(response));
  return response;
};

export const visualizationActualsDataTransformer = (
  formattedActualsForGraph,
  chartHistoricalData,
  dispatch
) => {
  let response = {
    actuals_data: formattedActualsForGraph,
    historical_actuals_data: chartHistoricalData,
  };

  dispatch(setAllActualsChartData(response));
  dispatch(setAllHistoricActualsChartData(response));
  return response;
};

export const getHistoricActualsFiscalWeeks = (
  adaReducer,
  startWeekId,
  weekCounts
) => {
  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  // let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let fiscalKey = "fiscal_year_week";
  let fiscalCalendarDetails = adaReducer?.fiscalCalendarDetails;

  let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === startWeekId;
    }
  );

  let historicEndWeekId =
    fiscalCalendarDetails?.[
      indexOFStartWeekIdInfiscalCalendarDetails + (weekCounts - 1)
    ]?.[fiscalKey];

  return [startWeekId, historicEndWeekId];
};

export const getFiscalWeeksFromFiscalDates = (
  startWeekId,
  endWeekId,
  isPredicted,
  adaReducer,
  dispatch,
  setFiscalWeeksInReducer
) => {
  let predictedFiscalWeeks = [];

  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  let fiscalKey = "fiscal_year_week";
  let fiscalCalendarDetails = adaReducer?.fiscalCalendarDetails;
  // let startWeekId = payload?.filters?.timeline?.start_week_id;
  // let endWeekId = payload?.filters?.timeline?.end_week_id;

  let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === startWeekId;
    }
  );

  let indexOFEndWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === endWeekId;
    }
  );

  for (
    let i = indexOFStartWeekIdInfiscalCalendarDetails;
    i <= indexOFEndWeekIdInfiscalCalendarDetails;
    i++
  ) {
    predictedFiscalWeeks.push(fiscalCalendarDetails?.[i]?.[fiscalKey]);
  }

  if (setFiscalWeeksInReducer) {
    let fiscalMonthOrQuartersPredicted = getFiscalMonthOrQuarterFromWeeks(
      predictedFiscalWeeks,
      adaReducer
    );
    if (isPredicted) {
      if (aggLevelSelected === "W") {
        dispatch(setPredictedFiscalWeeks(predictedFiscalWeeks));
      } else {
        dispatch(setPredictedFiscalWeeks(fiscalMonthOrQuartersPredicted));
      }
    } else {
      if (aggLevelSelected === "W") {
        dispatch(setHistoricActualsFiscalWeeks(predictedFiscalWeeks));
      } else {
        dispatch(setHistoricActualsFiscalWeeks(fiscalMonthOrQuartersPredicted));
      }
    }
  }

  return predictedFiscalWeeks;
};

export const getFiscalWeeks = (
  startWeekId,
  endWeekId,
  isPredicted,
  adaReducer,
  dispatch,
  setFiscalWeeksInReducer
) => {
  let predictedFiscalWeeks = [];

  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  // let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let fiscalKey = "fiscal_year_week";
  let fiscalCalendarDetails = adaReducer?.fiscalCalendarDetails;
  // let startWeekId = payload?.filters?.timeline?.start_week_id;
  // let endWeekId = payload?.filters?.timeline?.end_week_id;

  let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === startWeekId;
    }
  );

  let indexOFEndWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === endWeekId;
    }
  );

  for (
    let i = indexOFStartWeekIdInfiscalCalendarDetails;
    i <= indexOFEndWeekIdInfiscalCalendarDetails;
    i++
  ) {
    predictedFiscalWeeks.push(fiscalCalendarDetails?.[i]?.[fiscalKey]);
  }

  let fiscalMonthOrQuartersPredicted = [];
  if (setFiscalWeeksInReducer) {
    fiscalMonthOrQuartersPredicted = getFiscalMonthOrQuarterFromWeeks(
      predictedFiscalWeeks,
      adaReducer
    );
    if (isPredicted) {
      if (aggLevelSelected === "W") {
        dispatch(setPredictedFiscalWeeks(predictedFiscalWeeks));
      } else {
        dispatch(setPredictedFiscalWeeks(fiscalMonthOrQuartersPredicted));
      }
    } else {
      if (aggLevelSelected === "W") {
        dispatch(setHistoricActualsFiscalWeeks(predictedFiscalWeeks));
      } else {
        dispatch(setHistoricActualsFiscalWeeks(fiscalMonthOrQuartersPredicted));
      }
    }
  }
  if (aggLevelSelected === "W") {
    return predictedFiscalWeeks;
  }
  return fiscalMonthOrQuartersPredicted;
};

export const getFiscalMonthOrQuarterFromWeeks = (
  fiscalWeeks,

  adaReducer
) => {
  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let fiscalCalendarDetails = adaReducer?.fiscalCalendarDetails;

  let fiscalMonthOrQuarters = [];

  fiscalWeeks.forEach((elem) => {
    let currentFiscalMonthOrQuarter = fiscalCalendarDetails?.find(
      (fiscal) => fiscal["fiscal_year_week"] === elem
    )?.[fiscalKey];

    if (!fiscalMonthOrQuarters.includes(currentFiscalMonthOrQuarter)) {
      fiscalMonthOrQuarters.push(currentFiscalMonthOrQuarter);
    }
  });

  return fiscalMonthOrQuarters;
};

export const getHistoricFiscalWeeksFromPredictednWeekCount = (
  startWeekId,
  weekCounts,
  adaDashboardReducer
) => {
  let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let fiscalCalendarDetails = adaDashboardReducer?.fiscalCalendarDetails;

  let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === startWeekId;
    }
  );

  let historicStartWeekId =
    fiscalCalendarDetails?.[indexOFStartWeekIdInfiscalCalendarDetails - 1]?.[
      fiscalKey
    ];
  let historicEndWeekId =
    fiscalCalendarDetails?.[
      indexOFStartWeekIdInfiscalCalendarDetails - weekCounts
    ]?.[fiscalKey];

  return [historicStartWeekId, historicEndWeekId];
};

export const getHistoricPredictedData = (
  adaReducer,
  historicWeekSelected,
  weekCounts,
  dispatch
) => {
  let columnPayload = {};
  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  let historicDates = getHistoricActualsFiscalWeeks(
    adaReducer,
    historicWeekSelected,
    weekCounts
  );

  columnPayload.start_week_id = historicDates?.[0];
  columnPayload.end_week_id = historicDates?.[1];

  const getHistoricTableColumnsData = async () => {
    try {
      dispatch(setComponentLoaderCount(1));

      columnPayload.aggregation_level = aggLevelSelected;

      const tableColumns = await getLandingPageTableColumns(
        columnPayload.start_week_id,
        columnPayload.end_week_id,
        aggLevelSelected,
        adaReducer
      );

      dispatch(setHistoricTableColumns(tableColumns?.data?.data));
    } catch (error) {
      console.log("error getLandingPageTableColumns Historic", error);
    } finally {
      dispatch(setComponentLoaderCount(-1));
    }
  };

  const getHistoricForecastAttributes = async (isScenarioTab) => {
    try {
      dispatch(setComponentLoaderCount(1));

      const payload = chartDataPayload(
        adaReducer,
        null,
        null,
        null,
        null,
        adaReducer?.isEligible
      );

      let adjustedPayload = [];

      let fiscalWeeks = getFiscalWeeksFromFiscalDates(
        columnPayload.start_week_id,
        columnPayload.end_week_id,
        false,
        adaReducer,
        dispatch,
        true
      );

      let predictedFiscalWeeks = getFiscalMonthOrQuarterFromWeeks(
        fiscalWeeks,
        adaReducer
      );

      // let predictedFiscalWeeks =

      dispatch(setHistoricActualsFiscalWeeks(predictedFiscalWeeks));

      // let predictedFiscalWeeks = getPredictedFiscalWeeks(
      //   columnPayload.start_week_id,
      //   columnPayload.end_week_id,
      //   false,
      //   adaReducer,
      //   dispatch
      // );

      predictedFiscalWeeks?.forEach((elem) => {
        adjustedPayload.push({
          fiscal_timeperiod_id: elem,
          promo_percentage: null,
          price_point: null,
          modified: [],
        });
      });
      payload.adjusted = adjustedPayload;
      payload.adjusted_price_point = [];
      payload.filters.snapshot = columnPayload.start_week_id;
      payload.filters.timeline = {
        start_week_id: columnPayload.start_week_id,
        end_week_id: columnPayload.end_week_id,
        future_start_week_id: predictedFiscalWeeks?.[0],
        future_end_week_id:
          predictedFiscalWeeks?.[predictedFiscalWeeks?.length - 1],
      };
      payload.forecast_attributes = {
        IA: ["IA_PROMO", "ORG_IA"],
        ADJ: ["ADJ_PROMO", "ADJ_IA", "USR_IA"],
      };
      const historicalForecastAttributes = await getHistoricForecastAttributesData(
        payload
      );

      let originalIAData = forecastMultiplierRowDataTransformer(
        predictedFiscalWeeks,
        cloneDeep(historicalForecastAttributes),
        true,
        adaReducer?.clientConfig?.attribute_value?.mfp,
        isScenarioTab
      )?.[0];

      visualizationHistoricDataTransformer(
        predictedFiscalWeeks,
        historicalForecastAttributes,
        adaReducer,
        dispatch
      );

      originalIAData = {
        ...originalIAData,
        row: "Original IA Forecast",
        forecast_multiplier: "Original IA Forecast",
      };

      dispatch(
        setAllForecastMultiplierData({
          key: "IA",
          value: originalIAData,
        })
      );
      dispatch(setHistoricForecastAttributes(historicalForecastAttributes));
    } catch (error) {
      console.log("🚀 ~ getHistoricForecastAttributes ~ error:", error);
    } finally {
      dispatch(setComponentLoaderCount(-1));
    }
  };

  getHistoricForecastAttributes();
  // }, 0);
  getHistoricTableColumnsData();
};

export const actualsHandler = (
  actualsForecastAttributes,
  weeks,
  aggLevelSelected,
  predicterFiscalWeeks = [],
  isHistoric = false
) => {
  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let actuals = { row: "actuals", forecast_multiplier: "actuals" };
  let actualsDiscount = {
    row: "Actuals Discount %",
    drivers: "Actuals Discount %",
  };
  let formattedActualsForGraph = [];

  let totalPromoPercentageIA = 0;
  let allProductSumIA = 0;
  let hasActualPredictions = false;
  weeks.forEach((elem) => {
    let fiscalData = actualsForecastAttributes.data[elem];
    let fiscalWeekData = fiscalData?.[elem];
    if (fiscalWeekData?.["actual"] !== null) {
      hasActualPredictions = true;
    }
    // If no data exists for this specific week, skip processing this iteration.
    // This does NOT break the loop — remaining weeks will still be processed.
    if (!fiscalWeekData) return;

    // adding H for common weeks/months
    let newElem =
      isHistoric && predicterFiscalWeeks.includes(elem) ? `${elem}H` : elem;

    actuals[newElem] = fiscalWeekData["actual"];
    actualsDiscount[newElem] = fiscalWeekData["avg_discount_pct_weighted"];

    if (fiscalWeekData["avg_discount_pct_weighted"] !== null) {
      actualsDiscount[newElem] =
        fiscalWeekData["avg_discount_pct_weighted"] * 100;
    }

    if (isNumber(actualsDiscount[newElem])) {
      totalPromoPercentageIA +=
        (fiscalWeekData["product_count"] || 1) *
        fiscalWeekData["avg_discount_pct_weighted"];

      allProductSumIA += fiscalWeekData["product_count"] || 1;
    }

    formattedActualsForGraph.push({
      actual: fiscalWeekData["actual"],
      [fiscalKey]: newElem,
      average_discount_percentage_weighted:
        fiscalWeekData["avg_discount_pct_weighted"],
    });
  });

  if (hasActualPredictions) {
    actualsDiscount.avg = (totalPromoPercentageIA / allProductSumIA) * 100;
  }
  return {
    actuals,
    actualsDiscount,
    formattedActualsForGraph,
  };
};

export const getPredictedHistoricCompareWithMapping = (
  adaReducer,
  historicViewEndYear,
  predictedWeekEndFiscalWeek
) => {
  let predictedHistoricCompareWithMapping = {};

  let past_years = [];
  // let historicViewEndYear = +String(fiscalDatesInfo.end_fw)?.slice(0, 4);

  // If compare with is selected via dropdown and predicted year and historic data of "See Historic View"
  // dropdown year does not fall in same year then in order to form correct payload to see the correct data
  // we need subtract 1 from each year selected from "Compare with" dropdown
  if (adaReducer?.isCompareWithDropdown) {
    let selectedCompareWith = adaReducer?.compareWithSelectedDate?.map(
      (elem) => +elem.value
    );
    // if (selectedCompareWith?.includes(+historicViewEndYear)) {
    let formattedCompareWithHistoricViewYears = selectedCompareWith.map(
      (elem) => {
        predictedHistoricCompareWithMapping[elem] = elem - 1;

        return elem - 1;
      }
    );

    past_years = formattedCompareWithHistoricViewYears;
    // }
    // else {
    //   selectedCompareWith.forEach((elem) => {
    //     predictedHistoricCompareWithMapping[elem] = elem;
    //   });
    //   past_years = selectedCompareWith;
    // }
  } else {
    let lastYear = handleCompareBtnClick(predictedWeekEndFiscalWeek, 1);
    let lastToLastYear = handleCompareBtnClick(predictedWeekEndFiscalWeek, 2);
    let comparisonYear = adaReducer?.compareWithSelectedDate?.[0]?.id;
    let historicCompareWith = null;
    if (
      !adaReducer?.isCompareWithDropdown &&
      comparisonYear === lastYear?.value
    ) {
      historicCompareWith = historicViewEndYear - 1;
    }
    if (
      !adaReducer?.isCompareWithDropdown &&
      comparisonYear === lastToLastYear?.value
    ) {
      historicCompareWith = historicViewEndYear - 2;
    }
    past_years.push(historicCompareWith);

    let currFormattedYear = adaReducer?.compareWithSelectedDate?.[0]?.id;

    predictedHistoricCompareWithMapping[
      currFormattedYear
    ] = historicCompareWith;
  }
  return [predictedHistoricCompareWithMapping, past_years];
};

export const getHistoricActuals = (
  adaDashboardReducer,
  historicWeekSelected,
  weekCounts,
  dispatch,
  adaForecastMultiplierReducer,
  only_eligible
) => {
  try {
    dispatch(setComponentLoaderCount(1));

    let columnPayload = {};
    let historicDates = getHistoricActualsFiscalWeeks(
      adaDashboardReducer,
      historicWeekSelected,
      weekCounts
    );
    columnPayload.start_week_id = historicDates?.[0];
    columnPayload.end_week_id = historicDates?.[1];

    let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;

    const payload = cloneDeep(
      chartDataPayload(
        adaDashboardReducer,
        null,
        null,
        null,
        null,
        only_eligible !== undefined
          ? only_eligible
          : adaDashboardReducer?.isEligible
      )
    );
    let historicalFiscalWeeks = getFiscalWeeks(
      historicDates?.[0],
      historicDates?.[1],
      false,
      adaDashboardReducer,
      dispatch,
      true
    );
    payload.actuals_range = {};
    historicalFiscalWeeks?.forEach((elem) => {
      payload.actuals_range[elem] = {};
    });

    let predictedFiscalWeeks = adaDashboardReducer?.predictedFiscalWeeks;

    let [
      predictedHistoricCompareWithMapping,
      past_years,
    ] = getPredictedHistoricCompareWithMapping(
      adaDashboardReducer,
      String(columnPayload.end_week_id)?.slice(0, 4),
      predictedFiscalWeeks[predictedFiscalWeeks?.length - 1]
    );

    payload.filters.timeline = {
      start_week_id: historicDates[0],
      end_week_id: historicDates?.[1],

      future_start_week_id: predictedFiscalWeeks?.[0],
      future_end_week_id:
        predictedFiscalWeeks?.[predictedFiscalWeeks?.length - 1],
    };

    let compareWithYear = null;
    let comparisonYear = adaDashboardReducer?.compareWithSelectedDate?.[0]?.id;
    let lastYear = handleCompareBtnClick(
      adaDashboardReducer?.fiscalDates?.end_fw,
      1
    );
    let lastToLastYear = handleCompareBtnClick(
      adaDashboardReducer?.fiscalDates?.end_fw,
      2
    );
    if (
      !adaDashboardReducer?.isCompareWithDropdown &&
      comparisonYear === lastYear?.value
    ) {
      compareWithYear = String(historicDates?.[1])?.slice(0, 4) - 1;
    }
    if (
      !adaDashboardReducer?.isCompareWithDropdown &&
      comparisonYear === lastToLastYear?.value
    ) {
      compareWithYear = String(historicDates?.[1])?.slice(0, 4) - 2;
    }

    let predictedCompareWithYears = cloneDeep(payload.filters.compare_timeline);

    let historicEndDateYear = String(historicDates?.[1])?.slice(0, 4);
    let isHistoricEndWeekAndPredictedEndWeekIdInSameYear = false;

    payload?.filters?.compare_timeline?.forEach((elem, i) => {
      if (elem.year == historicEndDateYear) {
        isHistoricEndWeekAndPredictedEndWeekIdInSameYear = true;
      }
    });

    let pastYears = [];

    payload?.filters?.compare_timeline?.forEach((elem, i) => {
      elem.start_week_id = historicDates[0];
      elem.end_week_id = historicDates?.[1];
      elem.year =
        compareWithYear ||
        (isHistoricEndWeekAndPredictedEndWeekIdInSameYear
          ? elem.year - 1
          : elem.year);

      pastYears.push(elem.year);
    });

    const getActuals = async () => {
      const actualsForecastAttributes = await getActualsForecastAttributesData(
        payload
      );

      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

      let updatedActualsData = actualsHandler(
        actualsForecastAttributes,
        historicalFiscalWeeks,
        aggLevelSelected,
        adaDashboardReducer.predictedFiscalWeeks,
        true
      );

      let actuals = updatedActualsData.actuals;
      let actualsDiscount = updatedActualsData.actualsDiscount;
      let formattedActualsForGraph =
        updatedActualsData.formattedActualsForGraph;

      let pastYearActuals = [];
      // let pastYears = [];
      // let currYear = predictedFiscalWeeks[predictedFiscalWeeks?.length - 1];
      let currFormattedYear = String(historicDates?.[1] - 1)?.slice(0, 4);

      let chartHistoricalData = [];

      // payload?.filters?.compare_timeline?.forEach((elem) => {
      //   pastYears.push(elem.year);
      // });

      let allHistorical_actuals_data =
        adaForecastMultiplierReducer?.allChartData.historical_actuals_data;

      let oldHistoricDataForMultiplier =
        adaForecastMultiplierReducer?.historicalActual;

      let oldHistoricDiscountPercentage =
        adaForecastMultiplierReducer?.historicactualsDiscount;

      let lastYearDiscountPercentage = [];

      const historicMapping = {
        fiscal_ids: actualsForecastAttributes?.date_mapping?.fiscal_ids,
      };

      const invertedPredictedHistoricCompareWithMapping = isHistoricEndWeekAndPredictedEndWeekIdInSameYear
        ? invert(predictedHistoricCompareWithMapping)
        : null;

      pastYears.forEach((year, index) => {
        let historicYearMapping =
          actualsForecastAttributes.date_mapping[`fy_${year}`];

        let pastMappingYear = isHistoricEndWeekAndPredictedEndWeekIdInSameYear
          ? invertedPredictedHistoricCompareWithMapping[year]
          : year;

        let curryearHistoricData = {
          row: `FY ${pastMappingYear} Actuals`,
          forecast_multiplier: `FY ${pastMappingYear} Actuals`,
        };

        let currHistoricPercentage = {
          drivers: `FY ${pastMappingYear} Discount %`,
          row: `FY ${pastMappingYear} Discount %`,
        };

        let curryearHistoricDataForChart = [];
        if (
          !adaDashboardReducer?.isCompareWithDropdown &&
          currFormattedYear - 1 == year
        ) {
          curryearHistoricData.row = "Last year Actuals";
          currHistoricPercentage.row = "Last year Discount %";
          currHistoricPercentage.drivers = "Last year Discount %";
          curryearHistoricData.forecast_multiplier = "Last year Actuals";
        }
        if (
          !adaDashboardReducer?.isCompareWithDropdown &&
          currFormattedYear - 2 == year
        ) {
          curryearHistoricData.row = `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
          currHistoricPercentage.drivers = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
          currHistoricPercentage.row = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
          curryearHistoricData.forecast_multiplier =
            `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
        }

        let lastYearTotalPromoPercentageIA = 0;
        let lastYearAllProductSumIA = 0;
        let lastYearHasActualPredictions = false;

        historicalFiscalWeeks.forEach((fiscalWeek, i) => {
          let lastYearFiscalData =
            actualsForecastAttributes.data[fiscalWeek][historicYearMapping[i]];
          curryearHistoricData[fiscalWeek] = lastYearFiscalData?.["actual"];

          if (lastYearFiscalData) {
            lastYearHasActualPredictions = true;
          }
          if (lastYearFiscalData?.["avg_discount_pct_weighted"] !== null) {
            currHistoricPercentage[fiscalWeek] =
              lastYearFiscalData?.["avg_discount_pct_weighted"] * 100;
          }

          lastYearTotalPromoPercentageIA +=
            (lastYearFiscalData?.["product_count"] || 1) *
            lastYearFiscalData?.["avg_discount_pct_weighted"];

          lastYearAllProductSumIA += lastYearFiscalData?.["product_count"] || 1;

          curryearHistoricDataForChart.push({
            [fiscalKey]: historicYearMapping[i],
            actual: lastYearFiscalData?.["actual"],
            average_discount_percentage_weighted:
              lastYearFiscalData?.["avg_discount_pct_weighted"],
          });
        });

        if (lastYearHasActualPredictions) {
          currHistoricPercentage.overall_value =
            (lastYearTotalPromoPercentageIA / lastYearAllProductSumIA) * 100;
        }

        let filteredOldHistorical_actuals_data = {};

        const yearKey = `fy_${year}`;
        const pastMappingYearKey = `fy_${pastMappingYear}`;
        const yearMapping = actualsForecastAttributes?.date_mapping?.[yearKey];

        if (yearMapping) {
          historicMapping[pastMappingYearKey] = yearMapping;
        }

        let originalPredictedYear = predictedCompareWithYears?.[index]?.year;

        allHistorical_actuals_data?.forEach((elem) => {
          const keys = Object.keys(elem);

          for (let key of keys) {
            if (key == originalPredictedYear || key == pastMappingYear) {
              let data = elem[key];

              let predictedHistoricFiscalWeeks =
                adaDashboardReducer?.xAxisStaticDates?.[
                  `fy_${originalPredictedYear}`
                ] ||
                adaDashboardReducer?.xAxisStaticDates?.[
                  `fy_${pastMappingYear}`
                ] || [];

              // When xAxisStaticDates is not yet populated (stale closure),
              // use all data instead of filtering to empty
              let currFilteredOldHistorical_actuals_data =
                predictedHistoricFiscalWeeks.length
                  ? data?.filter((elem) => {
                      return predictedHistoricFiscalWeeks?.includes(
                        elem?.[fiscalKey]
                      );
                    })
                  : data || [];

              filteredOldHistorical_actuals_data[
                year
              ] = currFilteredOldHistorical_actuals_data;
              break;
            }
            // }
          }
        });

        let currOldActuals = oldHistoricDataForMultiplier?.find(
          (elem) => elem?.row === curryearHistoricData?.row
        );

        let currLastYearDiscountPercentage =
          oldHistoricDiscountPercentage?.find(
            (elem) => elem?.row === currHistoricPercentage?.row
          ) || {};

        lastYearDiscountPercentage.push({
          // ...currLastYearDiscountPercentage,
          ...currHistoricPercentage,
        });

        pastYearActuals.push({
          ...currOldActuals,
          ...curryearHistoricData,
        });

        let filteredOldHistoricalActualsDatForChart =
          filteredOldHistorical_actuals_data?.[year] || [];

        chartHistoricalData.push({
          [pastMappingYear]: [
            ...mergeHistoricalPeriods(
              curryearHistoricDataForChart,
              filteredOldHistoricalActualsDatForChart,
              FISCAL_KEY_MAPPING[aggLevelSelected]
            ),
            ...filteredOldHistoricalActualsDatForChart,
          ],
        });
      });

      let updatedXAxisStaticDates = cloneDeep(adaDashboardReducer?.xAxisStaticDates || {});
      const invertedMappingForDates = invert(predictedHistoricCompareWithMapping);
      pastYears.forEach((year, index) => {
        let originalYear = predictedCompareWithYears?.[index]?.year;
        let pastMappingYearForDates = isHistoricEndWeekAndPredictedEndWeekIdInSameYear
          ? invertedMappingForDates[year]
          : year;
        if (pastMappingYearForDates != originalYear && updatedXAxisStaticDates[`fy_${originalYear}`]) {
          updatedXAxisStaticDates[`fy_${pastMappingYearForDates}`] = updatedXAxisStaticDates[`fy_${originalYear}`];
        }
      });
      let pastWeeksActualsData =
        adaForecastMultiplierReducer?.historicAllChartData.actuals_data || [];

      let mergedActuals = [
        ...formattedActualsForGraph,
        ...pastWeeksActualsData,
      ];

      dispatch(setXaxisStaticDates(updatedXAxisStaticDates));
      dispatch(setXaisStaticHistoricDates(historicMapping));
      dispatch(setActualsDiscount(actualsDiscount));
      // dispatch(setHistoricActualsDiscount(lastYearDiscountPercentage));
      dispatch(setHistoricActualsDiscountLastYear(lastYearDiscountPercentage));
      dispatch(setActuals(actuals));
      dispatch(setHistoricalActualData(pastYearActuals));
      visualizationActualsDataTransformer(
        mergedActuals,
        chartHistoricalData,
        dispatch
      );
    };

    getActuals();
  } catch (error) {
    console.log("🚀 ~ error: historical Actuals", error);
  } finally {
    dispatch(setComponentLoaderCount(-1));
  }
};

export const getAllActuals = (
  adaDashboardReducer,
  historicWeekSelected,
  appliedDate,
  dispatch
) => {
  let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;

  const payload = cloneDeep(
    chartDataPayload(
      adaDashboardReducer,
      null,
      null,
      null,
      null,
      adaDashboardReducer?.isEligible
    )
  );

  let historicDates = getHistoricFiscalWeeksFromPredictednWeekCount(
    appliedDate,
    historicWeekSelected,
    adaDashboardReducer
  );

  let predictedFiscalWeeks = getFiscalWeeksFromFiscalDates(
    payload?.filters?.timeline?.start_week_id,
    payload?.filters?.timeline?.end_week_id,
    true,
    adaDashboardReducer,
    dispatch,
    false
  );

  let fiscalMonthOrQuartersPredicted = getFiscalMonthOrQuarterFromWeeks(
    predictedFiscalWeeks,
    adaDashboardReducer
  );

  let adjustedPayload = [];

  let historicalFiscalWeeks =
    aggLevelSelected === "W"
      ? getFiscalWeeks(
          historicDates?.[1],
          historicDates?.[0],
          false,
          adaDashboardReducer,
          dispatch,
          false
        )
      : [];

  payload.actuals_range = {};
  let mergedFiscalWeeks = [...historicalFiscalWeeks, ...predictedFiscalWeeks];
  mergedFiscalWeeks?.forEach((elem) => {
    payload.actuals_range[elem] = {};
  });

  payload.filters.timeline = {
    start_week_id: historicalFiscalWeeks[0] || predictedFiscalWeeks[0],
    end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
    future_start_week_id: predictedFiscalWeeks[0],
    future_end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
  };

  if (payload?.filters?.compare_timeline?.length) {
    payload.filters.compare_timeline.forEach((elem) => {
      elem.start_week_id = historicalFiscalWeeks[0] || predictedFiscalWeeks[0];
      elem.end_week_id = predictedFiscalWeeks[predictedFiscalWeeks?.length - 1];
    });
  } else {
    const endWeekIdPrevYear =
      parseInt(
        predictedFiscalWeeks[predictedFiscalWeeks?.length - 1]
          ?.toString()
          ?.substring(0, 4)
      ) - 1;

    payload.filters.compare_timeline = [
      {
        start_week_id: historicalFiscalWeeks[0] || predictedFiscalWeeks[0],
        end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
        complete_year: false,
        year: endWeekIdPrevYear,
      },
    ];
  }

  const getformattedActuals = () => {};

  const getActuals = async () => {
    try {
      dispatch(setComponentLoaderCount(1));

      const actualsForecastAttributes = await getActualsForecastAttributesData(
        payload
      );

      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

      const fiscalPeriodBasedOnAggLevel = getFiscalPeriodFromWeeks(
        mergedFiscalWeeks[0],
        mergedFiscalWeeks[mergedFiscalWeeks.length - 1],
        adaDashboardReducer
      );

      let updatedActualsData = actualsHandler(
        actualsForecastAttributes,
        fiscalPeriodBasedOnAggLevel,
        aggLevelSelected
      );

      let actuals = updatedActualsData.actuals;
      let actualsDiscount = updatedActualsData.actualsDiscount;
      let formattedActualsForGraph =
        updatedActualsData.formattedActualsForGraph;

      let pastYearActuals = [];
      let pastYears = [];
      let currYear = predictedFiscalWeeks[predictedFiscalWeeks?.length - 1];
      let currFormattedYear = String(currYear)?.slice(0, 4);

      let chartHistoricalData = [];

      payload?.filters?.compare_timeline?.forEach((elem) => {
        pastYears.push(elem.year);
      });

      let lastYearDiscountPercentage = [];

      pastYears.forEach((year, index) => {
        let historicYearMapping =
          actualsForecastAttributes.date_mapping[`fy_${year}`];
        let curryearHistoricData = {
          row: `FY ${year} Actuals`,
          forecast_multiplier: `FY ${year} Actuals`,
        };

        let currHistoricPercentage = {
          drivers: `FY ${year} Discount %`,
          row: `FY ${year} Discount %`,
        };

        let curryearHistoricDataForChart = [];

        if (
          !adaDashboardReducer?.isCompareWithDropdown &&
          currFormattedYear - 1 == year
        ) {
          curryearHistoricData.row = "Last year Actuals";
          currHistoricPercentage.row = "Last year Discount %";
          currHistoricPercentage.drivers = "Last year Discount %";
          curryearHistoricData.forecast_multiplier = "Last year Actuals";
        }
        if (
          !adaDashboardReducer?.isCompareWithDropdown &&
          currFormattedYear - 2 == year
        ) {
          curryearHistoricData.row = `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
          currHistoricPercentage.row = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
          currHistoricPercentage.drivers = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
          curryearHistoricData.forecast_multiplier =
            `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
        }

        let actualDataFiscalKeys = Object.keys(actualsForecastAttributes.data);

        let lastYearTotalPromoPercentageIA = 0;
        let lastYearAllProductSumIA = 0;
        let lastYearHasActualPredictions = false;

        actualDataFiscalKeys.forEach((fiscalWeek, i) => {
          // if (mergedFiscalWeeks?.includes(+fiscalWeek)) {
          let lastYearFiscalData =
            actualsForecastAttributes.data[fiscalWeek][historicYearMapping[i]];
          curryearHistoricData[fiscalWeek] = lastYearFiscalData?.["actual"];
          if (lastYearFiscalData) {
            lastYearHasActualPredictions = true;
          }
          if (lastYearFiscalData?.["avg_discount_pct_weighted"] !== null) {
            currHistoricPercentage[fiscalWeek] =
              lastYearFiscalData?.["avg_discount_pct_weighted"] * 100;
          }

          lastYearTotalPromoPercentageIA +=
            (lastYearFiscalData?.["product_count"] || 1) *
            lastYearFiscalData?.["avg_discount_pct_weighted"];

          lastYearAllProductSumIA += lastYearFiscalData?.["product_count"] || 1;

          curryearHistoricDataForChart.push({
            [fiscalKey]: historicYearMapping[i],
            actual: lastYearFiscalData?.["actual"],
            average_discount_percentage_weighted:
              lastYearFiscalData?.["avg_discount_pct_weighted"],
          });
          // }
        });

        if (lastYearHasActualPredictions) {
          currHistoricPercentage.overall_value =
            (lastYearTotalPromoPercentageIA / lastYearAllProductSumIA) * 100;
        }

        pastYearActuals.push(curryearHistoricData);
        lastYearDiscountPercentage.push(currHistoricPercentage);
        chartHistoricalData.push({ [year]: curryearHistoricDataForChart });
      });

      batch(() => {
        splitHistoricPredictedFiscalMapping(
          historicalFiscalWeeks,
          fiscalMonthOrQuartersPredicted,
          actualsForecastAttributes?.date_mapping,
          dispatch,
          pastYears
        );
        dispatch(setActualsDiscount(actualsDiscount));
        dispatch(setActuals(actuals));
        dispatch(setHistoricActualsDiscount(lastYearDiscountPercentage));
        dispatch(setHistoricalActualData(pastYearActuals));
        visualizationActualsDataTransformer(
          formattedActualsForGraph,
          chartHistoricalData,
          dispatch,
          true
        );
      });
    } catch (error) {
      console.log(error, "getAllActuals error");
    } finally {
      dispatch(setComponentLoaderCount(-1));
    }
  };

  getActuals();
};

/**
 * Splits fiscal mapping data into historic and predicted periods
 * @param {Object}  * @param {Array} historicalFiscalWeeks - Array of historical fiscal week IDs
 * @param {Array} predictedFiscalWeeks - Array of predicted fiscal week IDs
 * @param {Object} dateMapping - Original date mapping object containing fiscal IDs and year mappings
 * @param {Function} dispatch - Redux dispatch function
 * @param {Array} pastYears - Array of years to process
 * @returns {Object} Object containing historic and predicted mappings
 */
const splitHistoricPredictedFiscalMapping = (
  historicalFiscalWeeks,
  predictedFiscalWeeks,
  dateMapping,
  dispatch,
  pastYears
) => {
  // Initialize mapping objects
  const historicMapping = { fiscal_ids: historicalFiscalWeeks };
  const predictedMapping = { fiscal_ids: predictedFiscalWeeks };

  // Find split indices
  const predictedStartIndex = dateMapping.fiscal_ids.findIndex(
    (week) => week === predictedFiscalWeeks[0]
  );

  const historicEndIndex = dateMapping.fiscal_ids.findIndex(
    (week) => week === historicalFiscalWeeks[historicalFiscalWeeks.length - 1]
  );

  // Split mappings for each year
  pastYears.forEach((year) => {
    const yearKey = `fy_${year}`;
    const yearMapping = dateMapping[yearKey];

    if (yearMapping) {
      predictedMapping[yearKey] = yearMapping.slice(predictedStartIndex);
      historicMapping[yearKey] = yearMapping.slice(0, historicEndIndex + 1);
    }
  });

  // Update Redux store
  dispatch(setXaxisStaticDates(predictedMapping));
  dispatch(setXaisStaticHistoricDates(historicMapping));
};

export const getForecastAttributes = async (
  dispatch,
  adaDashboardReducer,
  startWeekId,
  endWeekId,
  isScenarioTab
) => {
  try {
    dispatch(setComponentLoaderCount(1));

    const payload = chartDataPayload(
      adaDashboardReducer,
      null,
      null,
      null,
      null,
      adaDashboardReducer?.isEligible
    );

    let adjustedPayload = [];

    let predictedFiscalWeeks = getPredictedFiscalWeeks(
      startWeekId || payload?.filters?.timeline?.start_week_id,
      endWeekId || payload?.filters?.timeline?.end_week_id,
      true,
      adaDashboardReducer,
      dispatch
    );

    predictedFiscalWeeks?.forEach((elem) => {
      adjustedPayload.push({
        fiscal_timeperiod_id: elem,
        promo_percentage: null,
        price_point: null,
        modified: [],
      });
    });
    payload.adjusted = adjustedPayload;
    adaDashboardReducer?.clientConfig?.attribute_value?.mfp &&
      (payload.filters.mfp = true);
    payload.adjusted_price_point = [];
    payload.forecast_attributes = {
      IA: ["IA_PROMO", "ORG_IA"],
      ADJ: ["ADJ_PROMO", "ADJ_IA", "USR_IA"],
    };
    dispatch(setForecastAttributesApiResolved(false));
    const forecastAttributes = await getForecastAttributesData(payload);

    let originalIAData = forecastMultiplierRowDataTransformer(
      predictedFiscalWeeks,
      forecastAttributes,
      true,
      adaDashboardReducer?.clientConfig?.attribute_value?.mfp,
      isScenarioTab
    )?.[0];

    originalIAData = {
      ...originalIAData,
      row: "original IA Forecast",
      forecast_multiplier: "original IA Forecast",
    };

    batch(() => {
      dispatch(
        setAllForecastMultiplierData({
          key: "IA",
          value: originalIAData,
        })
      );
      dispatch(setForecastAttributes(forecastAttributes));
      visualizationPredictedDataTransformer(
        predictedFiscalWeeks,
        forecastAttributes,
        adaDashboardReducer,
        dispatch
      );
      dispatch(setForecastAttributesApiResolved(true));
    });
  } catch (error) {
    console.log("🚀 ~ getForecastAttributes ~ error:", error);
  } finally {
    dispatch(setComponentLoaderCount(-1));
  }
};

export const getPredictedFiscalWeeks = (
  startWeekId,
  endWeekId,
  isPredicted,
  adaDashboardReducer,
  dispatch
) => {
  let predictedFiscalWeeks = [];

  let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
  // let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let fiscalKey = "fiscal_year_week";

  let fiscalCalendarDetails = adaDashboardReducer?.fiscalCalendarDetails;
  // let startWeekId = payload?.filters?.timeline?.start_week_id;
  // let endWeekId = payload?.filters?.timeline?.end_week_id;

  let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === startWeekId;
    }
  );

  let indexOFEndWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem[fiscalKey] === endWeekId;
    }
  );

  for (
    let i = indexOFStartWeekIdInfiscalCalendarDetails;
    i <= indexOFEndWeekIdInfiscalCalendarDetails;
    i++
  ) {
    let fiscalWeek = fiscalCalendarDetails?.[i]?.[fiscalKey];
    if (predictedFiscalWeeks[predictedFiscalWeeks?.length - 1] !== fiscalWeek) {
      predictedFiscalWeeks.push(fiscalWeek);
    }
  }

  let fiscalMonthOrQuartersPredicted = getFiscalMonthOrQuarterFromWeeks(
    predictedFiscalWeeks,
    adaDashboardReducer
  );
  if (isPredicted) {
    if (aggLevelSelected === "W") {
      dispatch(setPredictedFiscalWeeks(predictedFiscalWeeks));
    } else {
      dispatch(setPredictedFiscalWeeks(fiscalMonthOrQuartersPredicted));
    }
  } else {
    if (aggLevelSelected === "W") {
      dispatch(setHistoricActualsFiscalWeeks(predictedFiscalWeeks));
    } else {
      dispatch(setHistoricActualsFiscalWeeks(fiscalMonthOrQuartersPredicted));
    }
  }

  if (aggLevelSelected === "W") {
    return predictedFiscalWeeks;
  } else {
    return fiscalMonthOrQuartersPredicted;
  }
};

export const getFiscalPeriodFromWeeks = (
  startWeekId,
  endWeekId,
  adaDashboardReducer
) => {
  let predictedFiscalWeeks = [];

  let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
  let fiscalCalendarDetails = adaDashboardReducer?.fiscalCalendarDetails;
  // let startWeekId = payload?.filters?.timeline?.start_week_id;
  // let endWeekId = payload?.filters?.timeline?.end_week_id;

  let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem["fiscal_year_week"] === startWeekId;
    }
  );

  let indexOFEndWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
    (elem) => {
      return elem["fiscal_year_week"] === endWeekId;
    }
  );

  for (
    let i = indexOFStartWeekIdInfiscalCalendarDetails;
    i <= indexOFEndWeekIdInfiscalCalendarDetails;
    i++
  ) {
    let fiscalWeek = fiscalCalendarDetails?.[i]?.[fiscalKey];
    if (predictedFiscalWeeks[predictedFiscalWeeks?.length - 1] !== fiscalWeek) {
      predictedFiscalWeeks.push(fiscalWeek);
    }
  }

  return predictedFiscalWeeks;
};
