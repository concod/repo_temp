import { cloneDeep, isEmpty } from "lodash";
import { getDriverForecastData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  getAllRows,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { MAX, MIN, STEP } from ".";
import { binaryClosestIdx } from "core/Utils/functions/utils";

export const useHistoricData = (
  showIAData,
  allDriverForecastRef,
  initialPromoTypeRowData,
  promoTypeTableInstance,
  initialAllDriverForecastRowData,
  setDriverForecastLoader,
  allDriverForecastRowData,
  isApiSuccss
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  // const updatedDriverForecast = getAllRows(allDriverForecastRef?.current?.api)
  const roundOffto5inIAtrue =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.nearest_multiple_of_five_for_ia_tab;
  const driversForecastRoundOffValue =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.drivers_forecast_roundoff_value || 5;

  const appendHistoricData = (historicData) => {
    const updatedDriverForecast = getAllRows(allDriverForecastRef);

    const updatedPromoType = getAllRows(promoTypeTableInstance);
    let historicPromoTypeRowData = historicData?.slice(0, 1);
    let historicAllDriverForecastRowData = historicData?.slice(1);

    if (!updatedDriverForecast?.length) return;

    for (let i in updatedPromoType) {
      if (historicPromoTypeRowData?.length) {
        let getHistoricOfCurrentFiscal =
          historicPromoTypeRowData?.find((elem) => {
            return elem?.row === updatedPromoType[i]?.row;
          }) || {};
        if (!isEmpty(getHistoricOfCurrentFiscal)) {
          Object.assign(updatedPromoType[i] || {}, getHistoricOfCurrentFiscal);

          Object.assign(
            initialPromoTypeRowData[i] || {},
            getHistoricOfCurrentFiscal
          );
        }
      }
    }
    promoTypeTableInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });

    for (let i in updatedDriverForecast) {
      if (historicAllDriverForecastRowData?.length) {
        let getHistoricOfCurrentFiscal =
          historicAllDriverForecastRowData?.find((elem) => {
            return elem?.row === updatedDriverForecast[i]?.row;
          }) || {};
        if (!isEmpty(getHistoricOfCurrentFiscal)) {
          Object.assign(
            updatedDriverForecast[i],
            getHistoricOfCurrentFiscal,
            {
              overall_value: updatedDriverForecast?.[i]?.overall_value,
            },
            {
              product_count: {
                ...(updatedDriverForecast?.[i]?.product_count || {}),
                ...(getHistoricOfCurrentFiscal?.[i]?.product_count || {}),
              },
            }
          );
          Object.assign(
            initialAllDriverForecastRowData[i] || {},
            getHistoricOfCurrentFiscal,
            { overall_value: updatedDriverForecast?.[i]?.overall_value }
          );
        }
      }
    }
    // allDriverForecastRef.current.api.setRowData(updatedDriverForecast);
    allDriverForecastRef.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  useEffect(() => {
    if (!isApiSuccss) return;
    if (
      !adaReducer?.selectedHistoricValue?.length ||
      !allDriverForecastRowData?.length ||
      !adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length
    )
      return;
    // setHistoricPromoTypeRowData([]);
    // setHistoricAllDriverForecastRowData([]);
    const getData = () => {
      const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;
      const historicalDataFiscalWeekCompare =
        adaReducer?.historicalDataFiscalWeekCompare;
      const updatedPayload = cloneDeep(adaReducer);

      updatedPayload.future = updatedPayload.fiscalDates;
      updatedPayload.fiscalDates = historicalDataFiscalWeek;
      updatedPayload.historicActuals = historicalDataFiscalWeekCompare;

      const payload = chartDataPayload(
        updatedPayload,
        null,
        null,
        showIAData,
        null,
        adaReducer?.isEligible
      );

      payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;
      payload.filters.promo_percentage = null;
      payload.filters.price_point = null;
      payload.filters.selected_promo_type = {
        label: "% Off",
        value: "promo_percentage",
      };

      let adjustedDiscountPayload = [];
      let predictedFiscalWeeks =
        adaReducer?.xAxisStaticHistoricDates?.fiscal_ids || [];

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

      const fetchRowData = async () => {
        try {
          setDriverForecastLoader((prevState) => prevState + 1);
          const response = await getDriverForecastData(payload);
          let formattedResponse = response?.data?.data || {};

          let predictedFutureFiscalWeeks =
            adaReducer?.xAxisStaticDates?.fiscal_ids || [];

          if (roundOffto5inIAtrue) {
            for (let week in formattedResponse?.[1]) {
              if (typeof Number(week) === "number" && !isNaN(Number(week))) {
                let val = binaryClosestIdx(
                  formattedResponse[1][week],
                  MIN,
                  MAX,
                  driversForecastRoundOffValue || 5
                );
                formattedResponse[1][week] = val;
              }
            }
          } else {
            if (!showIAData) {
              for (let week in formattedResponse?.[1]) {
                if (typeof Number(week) === "number" && !isNaN(Number(week))) {
                  let val = binaryClosestIdx(
                    formattedResponse[1][week],
                    MIN,
                    MAX,
                    driversForecastRoundOffValue || 5
                  );
                  formattedResponse[1][week] = val;
                }
              }
            }
          }

          predictedFiscalWeeks.forEach((week) => {
            // If fiscal key doesn't exist in response, append
            if (
              formattedResponse?.[1] &&
              !formattedResponse?.[1]?.hasOwnProperty([week])
            ) {
              formattedResponse[1][week] = null;
            }
            // For Month aggregation level, some weeks of the Last Month will fall under historic forecast
            // and some of the weeks will be under predicted forecast, since keys will be same.
            // Hence, modyfying the key for Historical in response
            if (
              formattedResponse?.[1] &&
              predictedFutureFiscalWeeks?.includes(week)
            ) {
              let historicCommonWeek = `${week}H`;
              formattedResponse[1][historicCommonWeek] =
                formattedResponse[1][week];

              delete formattedResponse[1][week];
            }
          });

          predictedFiscalWeeks.forEach((week) => {
            // If fiscal key doesn't exist in response, append
            if (
              formattedResponse?.[2] &&
              !formattedResponse?.[2]?.hasOwnProperty([week])
            ) {
              formattedResponse[2][week] = null;
            }
            // For Month aggregation level, some weeks of the Last Month will fall under historic forecast
            // and some of the weeks will be under predicted forecast, since keys will be same.
            // Hence, modyfying the key for Historical in response
            if (
              formattedResponse?.[2] &&
              predictedFutureFiscalWeeks?.includes(week)
            ) {
              let historicCommonWeek = `${week}H`;

              formattedResponse[2][historicCommonWeek] =
                formattedResponse[2][week];

              delete formattedResponse[2][week];
            }
          });

          appendHistoricData(formattedResponse);
        } catch (error) {
          // errorHandler(dispatch, error);
        } finally {
          setDriverForecastLoader((prevState) => prevState - 1);
        }
      };

      fetchRowData();
    };
    getData();
  }, [
    adaReducer?.selectedHistoricValue,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids,
    isApiSuccss,
  ]);
};
