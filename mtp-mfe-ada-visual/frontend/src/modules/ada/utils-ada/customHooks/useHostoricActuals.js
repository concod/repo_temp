import { cloneDeep, invert, isEmpty } from "lodash";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import { getChartData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  setActuals,
  setActualsDiscount,
  setAllChartData,
  setAllForecastMultiplierData,
  setHistoricAllChartData,
  setHistoricalActualData,
  setMultiplierLoaderCount,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { setCompareScreenLoaderCount } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  isNumber,
  utilFetchHistoricActuals,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceValueByValue } from "../utilityFunctions";

// In the filter section, whatever is selected in compare with
// we get the corresponding historic actuals and save that to redux
// and from there we use this data to show in Forecast Multiplier and comparison screen

export const useHistoricActual = (
  activeKey,
  isMFPEnabled,
  isCalledFromMFPDashboard
) => {
  const dispatch = useDispatch();

  let historicalPastYearDataRef = useRef();
  let pastYearDataRef = useRef();
  let historicalActualDataRef = useRef();
  let actualDataRef = useRef();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  useEffect(() => {
    historicalPastYearDataRef.current = [];
    pastYearDataRef.current = [];
    historicalActualDataRef.current = [];
    actualDataRef.current = [];
  }, [activeKey]);

  //For MFP
  useEffect(() => {
    if (isCalledFromMFPDashboard) {
      if (!activeKey || !adaReducer?.predictedFiscalWeeks?.length) return;

      // if (isCalledFromMFPDashboard) {
      //   // if (isCalledFromMFPDashboard) return;
      //   if (!adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length) return;
      //   if (!adaReducer?.selectedHistoricValue?.length) return;
      // }

      const clonedReducer = cloneDeep(adaReducer);
      utilFetchHistoricActuals(
        clonedReducer,
        adaReducer,
        dispatch,
        setMultiplierLoaderCount,
        setCompareScreenLoaderCount,
        setAllChartData,
        pastYearDataRef,
        actualDataRef,
        historicalActualDataRef,
        setActuals,
        setActualsDiscount,
        historicalPastYearDataRef
      );
    }
  }, [activeKey, adaReducer?.isEligible, adaReducer?.predictedFiscalWeeks]);

  // Fiscal Historical Data
  useEffect(() => {
    if (!isCalledFromMFPDashboard) {
      if (!activeKey) return;

      const clonedReducer = cloneDeep(adaReducer);

      utilFetchHistoricActuals(
        clonedReducer,
        adaReducer,
        dispatch,
        setMultiplierLoaderCount,
        setCompareScreenLoaderCount,
        setAllChartData,
        pastYearDataRef,
        actualDataRef,
        historicalActualDataRef,
        setActuals,
        setActualsDiscount,
        historicalPastYearDataRef
      );
    }
  }, [
    activeKey,
    adaReducer?.isEligible,
    adaForecastMultiplierReducer?.counterToTriggerForecastCustomHook,
    // adaReducer?.xAxisStaticHistoricDates?.fiscal_ids,
  ]);

  // Historic Historical Data
  useEffect(() => {
    if (!adaReducer?.selectedHistoricValue?.length) return;
    if (!adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length) return;
    const fetchHistoricActuals = async () => {
      try {
        const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;
        const historicalDataFiscalWeekCompare =
          adaReducer?.historicalDataFiscalWeekCompare;
        const updatedPayload = cloneDeep(adaReducer);
        updatedPayload.future = updatedPayload.fiscalDates;

        updatedPayload.fiscalDates = historicalDataFiscalWeek;
        updatedPayload.historicActuals = historicalDataFiscalWeekCompare;

        let isMFPShownOnCharts =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.show_mfp_on_charts;

        const payload = chartDataPayload(
          updatedPayload,
          null,
          null,
          null,
          null,
          updatedPayload?.isEligible,
          null,
          true,
          null,
          null,
          isMFPShownOnCharts,
          adaReducer?.isCompareWithDropdown
        );
        payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;

        let timeline = adaReducer?.switchTimeLine?.[0]?.value;

        let adjustedDiscountPayload = [];
        let predictedFiscalWeeks =
          cloneDeep(adaReducer?.xAxisStaticHistoricDates?.fiscal_ids) || [];
        predictedFiscalWeeks?.forEach((elem) => {
          adjustedDiscountPayload.push({
            fiscal_timeperiod_id: elem,
            promo_percentage: null,
            price_point: null,
            modified: [],
          });
        });
        payload.adjusted = adjustedDiscountPayload;
        payload.adjusted_price_point = [];
        dispatch(setMultiplierLoaderCount(1));
        dispatch(setCompareScreenLoaderCount(1));

        let end_week_id =
          payload.adjusted[payload.adjusted.length - 1].fiscal_timeperiod_id;

        let start_week_id = payload.adjusted[0].fiscal_timeperiod_id;
        payload.filters.timeline = {
          ...payload.filters.timeline,
          start_week_id,
          end_week_id,
        };
        payload.filters.compare_timeline = [
          {
            start_week_id,
            end_week_id,
            complete_year: false,
            year: String(end_week_id)?.slice(0, 4) - 1,
          },
        ];

        let response = await getChartData(payload);
        dispatch(setHistoricAllChartData(cloneDeep(response)));

        let formattedResponse = cloneDeep(response);

        let predictedFutureFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];

        predictedFiscalWeeks?.forEach((fiscalWeek, i) => {
          if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
            //Since, historic and predicted both have common week, hence updating historic key by appending H to it
            predictedFiscalWeeks[i] = `${fiscalWeek}H`;

            //Since, historic and predicted both have common week, hence updating response fiscal week by replacing it with new key
            formattedResponse = replaceValueByValue(
              response,
              fiscalWeek,
              `${fiscalWeek}H`
            );
          }
        });

        let {
          historical_actuals_data,
          actuals_data,
          ia_default_forecast_data,
        } = formattedResponse;

        // if there is no prediction for selected histroic weeks then set null value for respective weeks manually
        let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;

        for (let i in historical_actuals_data) {
          for (let [key, value] of Object.entries(
            historical_actuals_data?.[i] || {}
          )) {
            const predictedHistoricCompareWithMapping =
              adaReducer?.predictedHistoricCompareWithMapping;
            let pastPredictedFiscalWeeks =
              cloneDeep(adaReducer?.xAxisStaticDates?.[`fy_${key}`]) || [];
            let pastHistoricFiscalWeeks =
              cloneDeep(
                adaReducer?.xAxisStaticHistoricDates?.[
                  `fy_${predictedHistoricCompareWithMapping?.[key]}`
                ]
              ) || [];

            pastHistoricFiscalWeeks?.forEach((fiscalWeek, i) => {
              if (pastPredictedFiscalWeeks?.includes(fiscalWeek)) {
                pastHistoricFiscalWeeks[i] = `${fiscalWeek}H`;

                historical_actuals_data = replaceValueByValue(
                  historical_actuals_data,
                  fiscalWeek,
                  `${fiscalWeek}H`
                );
              }
            });

            let availableHistoricalPredictionWeeks = value?.map(
              (elem) => +elem?.[FISCAL_KEY_MAPPING[aggLevelSelected]]
            );

            predictedFiscalWeeks?.forEach((week) => {
              if (!availableHistoricalPredictionWeeks?.includes(+week)) {
                value.push({
                  average_discount_percentage_weighted: null,
                  actual: null,
                  [FISCAL_KEY_MAPPING[aggLevelSelected]]: +week,
                });
              }
            });
          }
        }

        let availableActualsPredictionWeeks = actuals_data?.map(
          (elem) => +elem?.[FISCAL_KEY_MAPPING[aggLevelSelected]]
        );
        predictedFiscalWeeks?.forEach((week) => {
          if (!availableActualsPredictionWeeks?.includes(+week)) {
            actuals_data.push({
              average_discount_percentage_weighted: null,
              actual: null,
              [FISCAL_KEY_MAPPING[aggLevelSelected]]: +week,
            });
          }
        });

        let availableOriginalIAPredictionWeeks = ia_default_forecast_data?.map(
          (elem) => +elem?.[FISCAL_KEY_MAPPING[aggLevelSelected]]
        );
        predictedFiscalWeeks?.forEach((week) => {
          if (!availableOriginalIAPredictionWeeks?.includes(+week)) {
            ia_default_forecast_data.push({
              [FISCAL_KEY_MAPPING[aggLevelSelected]]: week,
              promo_percentage: null,
              predicted_qty: null,
              adjusted_forecast_qty: null,
            });
          }
        });

        let formattedData = {
          forecast_multiplier: "Original IA Forecast",
          row: "Original",
        };

        ia_default_forecast_data?.forEach((elem) => {
          let fiscal_year_week = elem?.[FISCAL_KEY_MAPPING[aggLevelSelected]];
          let predicted_qty = elem?.predicted_qty;

          if (
            isNumber(fiscal_year_week) ||
            isNumber(fiscal_year_week?.slice(0, -1))
          ) {
            formattedData[fiscal_year_week] = {
              IA: predicted_qty,
              ratio: 1,
              adjusted: predicted_qty,
            };
          }
        });

        dispatch(
          setAllForecastMultiplierData({
            key: "IA",
            value: formattedData,
          })
        );

        historicalPastYearDataRef.current = historical_actuals_data;

        let [formattedActuals, formattedActualsDiscount] = formatActualsData(
          actuals_data,
          adaReducer
        );

        let updatedActuals = {
          formattedActuals,
          formattedActualsDiscount,
        };

        historicalActualDataRef.current = updatedActuals;

        const { actualsMerged, actualsDiscountMerged } = mergeResponse(
          actualDataRef,
          updatedActuals
        );

        dispatch(setActuals(actualsMerged));
        dispatch(setActualsDiscount(actualsDiscountMerged));

        let mergedHistoricalData = mergeHistoricDataHandler(
          pastYearDataRef?.current,
          historical_actuals_data,
          adaReducer,
          false
        );

        dispatch(setHistoricalActualData(mergedHistoricalData));
      } catch (error) {
        console.log("error hostoric actuals", error);
      } finally {
        dispatch(setCompareScreenLoaderCount(-1));

        dispatch(setMultiplierLoaderCount(-1));
      }
    };
    // let historyWeekList = adaReducer?.xAxisStaticHistoricDates?.fiscal_ids;
    // let startOfHistoryWeekInSnapshot =
    //   adaReducer?.selectedHistoricValue[0].snapshot_week;
    // let startOfHistoryWeekInList = historyWeekList[0];
    // let historyWeekValue =
    //   adaReducer?.selectedHistoricValue[0].hist_week_values;
    // if (
    //   startOfHistoryWeekInSnapshot === startOfHistoryWeekInList &&
    //   historyWeekList.length === historyWeekValue
    // ) {
    fetchHistoricActuals();
    // }
  }, [
    adaReducer?.selectedHistoricValue,
    adaReducer?.isEligible,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids,
  ]);
};

// data structure for historical data is complex, this fn traverses through the data
// and merges historical historic data(Select historic weeks dropdown) & historic data
export const mergeHistoricDataHandler = (
  fiscalHistoricalData = [],
  historical_actuals_data = [],
  adaReducer,
  isPredicted
) => {
  const predictedHistoricCompareWithMapping =
    adaReducer?.predictedHistoricCompareWithMapping;

  if (
    isEmpty(fiscalHistoricalData) ||
    !adaReducer?.selectedHistoricValue?.length
  ) {
    return historical_actuals_data;
  }
  let mergedHistoricalData = [];

  if (fiscalHistoricalData?.length) {
    for (let i in fiscalHistoricalData) {
      for (let [key, value] of Object.entries(
        fiscalHistoricalData?.[i] || {}
      )) {
        let historicData = {};
        let currKey = null;

        if (!isPredicted) {
          currKey = predictedHistoricCompareWithMapping?.[key];
        } else {
          let invertedPredictedHistoricCompareWithMapping = invert(
            cloneDeep(predictedHistoricCompareWithMapping)
          );

          currKey = invertedPredictedHistoricCompareWithMapping?.[key];
        }

        let historicalActualsDataYear = historical_actuals_data?.find(
          (elem) => elem[currKey]
        );

        if (historicalActualsDataYear) {
          historicData[isPredicted ? currKey : key] = [
            ...(value || []),
            ...(historical_actuals_data?.[i]?.[currKey] || []),
          ];
          mergedHistoricalData.push(historicData);
        } else {
          mergedHistoricalData = [
            ...historical_actuals_data,
            ...fiscalHistoricalData,
          ];
        }
      }
    }
  }

  return mergedHistoricalData;
};

export const mergeResponse = (actualDataRef, currActualData) => {
  let { formattedActuals, formattedActualsDiscount } =
    actualDataRef?.current || {};

  return {
    actualsMerged: {
      ...(currActualData?.formattedActuals || {}),
      ...formattedActuals,
    },
    actualsDiscountMerged: {
      ...(currActualData?.formattedActualsDiscount || {}),
      ...formattedActualsDiscount,
    },
  };
};

export const formatActualsData = (actuals, adaReducer) => {
  let formattedActuals = {};
  let total = 0;
  let length = 0;
  let formattedActualsDiscount = {};
  let totalPromoPercentageIA = 0;
  let allProductSumIA = 0;
  actuals?.forEach((week) => {
    let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
    let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];
    formattedActuals[currWeek] = week?.actual;
    formattedActualsDiscount[currWeek] =
      week?.average_discount_percentage_weighted * 100;

    totalPromoPercentageIA +=
      (week?.product_count || 1) * week?.average_discount_percentage_weighted;

    allProductSumIA += week?.product_count || 1;
  });
  formattedActualsDiscount.avg =
    (totalPromoPercentageIA / allProductSumIA) * 100;

  return [formattedActuals, formattedActualsDiscount];
};
