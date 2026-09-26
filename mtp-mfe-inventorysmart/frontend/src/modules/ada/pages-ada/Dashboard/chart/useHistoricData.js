import { cloneDeep } from "lodash";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import { getChartData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { setHistoricLastYearData } from "modules/ada/services-ada/ada-dashboard/ada-edit-forecast-services";

import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceValueByValue } from "../../../utils-ada/utilityFunctions";

export const useHistoricData = (
  selectedGraphFilters,
  showIAData,
  hidePastHistoricData,
  filterApplied,
  isCalledFromMFPDashboard
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const [historicChartData, setHistoricChartData] = useState({});
  const [historicChartLoader, setHistoricChartLoader] = useState(false);
  const isEligible = adaReducer?.isEligible;

  useEffect(() => {
    if (isCalledFromMFPDashboard) return;
    if (!adaReducer?.selectedHistoricValue?.length) return;
    if (!adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length) return;
    setHistoricChartData([]);

    if (hidePastHistoricData) return;

    const getData = () => {
      const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;

      const historicalDataFiscalWeekCompare =
        adaReducer?.historicalDataFiscalWeekCompare;
      const updatedPayload = cloneDeep(adaReducer);
      updatedPayload.future = updatedPayload.fiscalDates;

      updatedPayload.fiscalDates = historicalDataFiscalWeek;
      updatedPayload.historicActuals = historicalDataFiscalWeekCompare;

      let selectedStoreFilters = selectedGraphFilters?.filter(
        (elem) => elem.dimension === "store"
      );
      let selectedProductFilters = selectedGraphFilters?.filter(
        (elem) => elem.dimension === "product"
      );

      let updatedStoreFilter = updatedPayload.store;
      let updatedProductFilter = updatedPayload.product;

      if (selectedStoreFilters?.length) {
        updatedStoreFilter = selectedStoreFilters;
      }

      if (selectedProductFilters?.length) {
        updatedProductFilter = selectedProductFilters;
      }

      updatedPayload.store = updatedStoreFilter;
      updatedPayload.product = updatedProductFilter;

      let isMFPShownOnCharts =
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_mfp_on_charts;

      const payload = chartDataPayload(
        updatedPayload,
        null,
        null,
        showIAData,
        null,
        isEligible,
        null,
        true,
        null,
        null,
        isMFPShownOnCharts,
        adaReducer?.isCompareWithDropdown
      );

      payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;
      let predictedFiscalWeeks =
        adaReducer?.xAxisStaticHistoricDates?.fiscal_ids || [];
      const fetchChartData = async () => {
        try {
          setHistoricChartLoader(true);
          let adjustedDiscountPayload = [];

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
          const response = await getChartData(payload);
          let formattedResponse = cloneDeep(response);

          let predictedFutureFiscalWeeks =
            adaReducer?.xAxisStaticDates?.fiscal_ids || [];

          predictedFiscalWeeks?.forEach((fiscalWeek) => {
            if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
              formattedResponse = replaceValueByValue(
                response,
                fiscalWeek,
                `${fiscalWeek}H`
              );
            }
          });

          // let formattedResponse = replaceKey(response, );

          setHistoricChartData(formattedResponse);
        } catch (error) {
          // errorHandler(dispatch, error);
        } finally {
          setHistoricChartLoader(false);
        }
      };

      if (filterApplied || showIAData) {
        fetchChartData();
      } else {
        let chartData = cloneDeep(
          adaForecastMultiplierReducer?.historicAllChartData
        );
        let formattedResponse = cloneDeep(chartData);
        // copying same data as one would be reference for new datA formation
        let response = cloneDeep(chartData);

        let predictedFutureFiscalWeeks =
          adaReducer?.xAxisStaticDates?.fiscal_ids || [];

        predictedFiscalWeeks?.forEach((fiscalWeek) => {
          if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
            formattedResponse = replaceValueByValue(
              response,
              fiscalWeek,
              `${fiscalWeek}H`
            );
          }
        });

        // let formattedResponse = replaceKey(response, );

        setHistoricChartData(formattedResponse);
      }
    };

    let historyWeekList = adaReducer?.xAxisStaticHistoricDates?.fiscal_ids;
    let startOfHistoryWeekInSnapshot =
      adaReducer?.selectedHistoricValue[0].snapshot_week;
    let startOfHistoryWeekInList = historyWeekList[0];
    let historyWeekValue =
      adaReducer?.selectedHistoricValue[0].hist_week_values;

    // if (
    //   startOfHistoryWeekInSnapshot === startOfHistoryWeekInList &&
    //   historyWeekList.length === historyWeekValue &&
    //   selectedGraphFilters.length > 0
    // ) {
    getData();
    // }
  }, [
    // adaReducer?.selectedHistoricValue,
    selectedGraphFilters,
    isEligible,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids,
    adaForecastMultiplierReducer?.historicAllChartData,
  ]);

  return adaReducer?.selectedHistoricValue?.length
    ? {
        historicChartData,
        historicChartLoader,
      }
    : {
        historicChartData: {},
        historicChartLoader: 0,
      };
};
