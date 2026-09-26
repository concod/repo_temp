import { cloneDeep } from "lodash";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import {
  getChartData,
  getCombinedChartHistoricData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

import { chartDataPayload, handlePredictedTimePeriod } from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceValueByValue } from "../../../utils-ada/utilityFunctions";
import { getHistoricActualsFiscalWeeks } from "modules/ada/utils-ada/formatData";

export const useHistoricData = (
  selectedGraphFilters,
  showIAData,
  hidePastHistoricData,
  filterApplied,
  isCalledFromMFPDashboard,
  chartData
) => {
  const dispatch = useDispatch();
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
    if (!adaReducer?.historicActualsFiscalWeeks?.length) return;
    // setHistoricChartData([]);

    if (hidePastHistoricData) return;

    const getData = () => {
      // const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;

      // const historicalDataFiscalWeekCompare =
      //   adaReducer?.historicalDataFiscalWeekCompare;
      // const updatedPayload = cloneDeep(adaReducer);
      // updatedPayload.future = updatedPayload.fiscalDates;

      // updatedPayload.fiscalDates = historicalDataFiscalWeek;
      // updatedPayload.historicActuals = historicalDataFiscalWeekCompare;

      // let selectedStoreFilters = selectedGraphFilters?.filter(
      //   (elem) => elem.dimension === "store"
      // );
      // let selectedProductFilters = selectedGraphFilters?.filter(
      //   (elem) => elem.dimension === "product"
      // );

      // let updatedStoreFilter = updatedPayload.store;
      // let updatedProductFilter = updatedPayload.product;

      // if (selectedStoreFilters?.length) {
      //   updatedStoreFilter = selectedStoreFilters;
      // }

      // if (selectedProductFilters?.length) {
      //   updatedProductFilter = selectedProductFilters;
      // }

      // updatedPayload.store = updatedStoreFilter;
      // updatedPayload.product = updatedProductFilter;
      // let isMFPShownOnCharts =
      //   adaReducer?.clientConfig?.attribute_value?.show_features
      //     ?.show_mfp_on_charts;

      // const payload = chartDataPayload(
      //   updatedPayload,
      //   null,
      //   null,
      //   showIAData,
      //   null,
      //   isEligible,
      //   null,
      //   true,
      //   null,
      //   null,
      //   isMFPShownOnCharts,
      //   adaReducer?.isCompareWithDropdown
      // );

      // payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;
      let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);

      if (filterApplied) {
        // const fetchChartData = async () => {
        //   try {
        //     setHistoricChartLoader(true);
        //     let adjustedDiscountPayload = [];
        //     let historicActualsFiscalWeeks =
        //       adaReducer?.historicActualsFiscalWeeks;

        //     let predictedFutureFiscalWeeks = adaReducer?.predictedFiscalWeeks;

        //     historicActualsFiscalWeeks?.forEach((elem) => {
        //       adjustedDiscountPayload.push({
        //         fiscal_timeperiod_id: elem,
        //         promo_percentage: null,
        //         price_point: null,
        //         modified: [],
        //       });
        //     });

        //     payload.adjusted = adjustedDiscountPayload;
        //     payload.adjusted_price_point = [];

        //     let historicDates = getHistoricActualsFiscalWeeks(
        //       adaReducer,
        //       adaReducer?.selectedHistoricValue?.[0]?.snapshot_week,
        //       adaReducer?.selectedHistoricValue?.[0]?.value
        //     );

        //     payload.filters.timeline = {
        //       future_start_week_id: adaReducer?.predictedFiscalWeeks?.[0],
        //       future_end_week_id:
        //         adaReducer?.predictedFiscalWeeks[
        //           adaReducer?.predictedFiscalWeeks?.length - 1
        //         ],
        //       start_week_id: historicDates[0],
        //       end_week_id: historicDates?.[1],
        //     };

        //     payload.filters.compare_timeline = payload.filters.compare_timeline.map(
        //       (elem) => {
        //         return {
        //           ...elem,
        //           start_week_id: historicDates[0],
        //           end_week_id: historicDates[1],
        //         };
        //       }
        //     );

        //     const response = await getChartData(payload);
        //     let formattedResponse = cloneDeep(response);

        //     historicActualsFiscalWeeks?.forEach((fiscalWeek) => {
        //       if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
        //         formattedResponse = replaceValueByValue(
        //           response,
        //           fiscalWeek,
        //           `${fiscalWeek}H`
        //         );
        //       }
        //     });

        //     // let formattedResponse = replaceKey(response, );

        //     setHistoricChartData(formattedResponse);
        //   } catch (error) {
        //     // errorHandler(dispatch, error);
        //   } finally {
        //     setHistoricChartLoader(false);
        //   }
        // };
        // fetchChartData();
        const fetchChartData = async () => {
          try {
            setHistoricChartLoader(true);
            //  setChartLoader((prevState) => prevState + 1);

            console.log("🚀 ~ fetchChartData ~ adaReducer:", adaReducer);
            const clonedReducer = cloneDeep(adaReducer);
            console.log("🚀 ~ fetchChartData ~ clonedReducer:", clonedReducer);

            // Graph has tenant filter dropdown, so we are taking applied(~if) filters
            // and sending that in payload to get updated data

            let selectedStoreFilters = selectedGraphFilters?.filter(
              (elem) => elem.dimension === "store"
            );

            let selectedProductFilters = selectedGraphFilters?.filter(
              (elem) => elem.dimension === "product"
            );
            console.log(
              "🚀 ~ fetchChartData ~ selectedProductFilters:",
              selectedProductFilters
            );

            let updatedStoreFilter = clonedReducer.store;
            let updatedProductFilter = clonedReducer.product;
            console.log(
              "🚀 ~ fetchChartData ~ updatedProductFilter:",
              updatedProductFilter
            );

            if (selectedStoreFilters?.length) {
              updatedStoreFilter = selectedStoreFilters;
            }

            if (selectedProductFilters?.length) {
              updatedProductFilter = selectedProductFilters;
              console.log(
                "🚀 ~ fetchChartData ~ updatedProductFilter:",
                updatedProductFilter
              );
            }

            console.log("🚀 ~ fetchChartData ~ clonedReducer:", clonedReducer);
            clonedReducer.store = updatedStoreFilter;
            clonedReducer.product = updatedProductFilter;
            console.log(
              "🚀 ~ fetchChartData ~ clonedReducer:",
              cloneDeep(clonedReducer)
            );

            const response = await getCombinedChartHistoricData(
              clonedReducer,
              adaReducer?.selectedHistoricValue?.[0]?.snapshot_week,
              adaReducer?.selectedHistoricValue?.[0]?.value,
              chartData,
              dispatch
            );
            console.log("🚀 ~ fetchChartData ~ response:", response);

            setHistoricChartData(response);
          } catch (error) {
            console.log("🚀 ~ fetchChartData ~ error:", error);
          } finally {
            setHistoricChartLoader(false);
          }
        };
        fetchChartData();
      } else {
        let chartData = cloneDeep(
          adaForecastMultiplierReducer?.historicAllChartData
        );
        let formattedResponse = cloneDeep(chartData);
        // copying same data as one would be reference for new datA formation
        let response = cloneDeep(chartData);

        let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);

        predictedFutureFiscalWeeks?.forEach((fiscalWeek) => {
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

    // let historyWeekList = adaReducer?.xAxisStaticHistoricDates?.fiscal_ids;
    // let startOfHistoryWeekInSnapshot =
    //   adaReducer?.selectedHistoricValue[0].snapshot_week;
    // let startOfHistoryWeekInList = historyWeekList[0];
    // let historyWeekValue =
    //   adaReducer?.selectedHistoricValue[0].hist_week_values;

    // if (
    //   startOfHistoryWeekInSnapshot === startOfHistoryWeekInList &&
    //   historyWeekList.length === historyWeekValue &&
    //   selectedGraphFilters.length > 0
    // ) {
    getData();
    // }
  }, [
    // JSON.stringify(adaReducer?.selectedHistoricValue),
    adaReducer?.selectedHistoricValue?.[0]?.snapshot_week,
    selectedGraphFilters,
    isEligible,
    // JSON.stringify(adaReducer?.xAxisStaticHistoricDates?.fiscal_ids),
    JSON.stringify(adaForecastMultiplierReducer?.historicAllChartData),
  ]);

  return {
    historicChartData,
    historicChartLoader,
  };
};
