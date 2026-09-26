import { cloneDeep } from "lodash";
import { useTranslation } from "impact-ui-v3";
import {
  getForecastColumns,
  getForecastData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  setAllForecastMultiplierData,
  setHistoricalColumns,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  chartDataPayload,
  columnLabelHandler,
  forecastMultiplierTabNamelabelmapping,
  getAllRows,
  isNumber,
  weekEndDateLabel,
  handlePredictedTimePeriod,
  handleHistoricTimePeriod,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  forecastMultiplierColumnsTransformer,
  forecastMultiplierRowDataTransformer,
} from "modules/ada/utils-ada/formatData";

export const useHistoricData = (
  showIAData,
  id,
  forecastMultiplierInstance,
  setForecastMultiplierLoader,
  setIsApiSuccssCounter,
  isPredictedDataFetched,
  isCalledFromMFPDashboard,
  tableName,
  isHistoricMFPRequired
) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  let historicForecastMultiplierColumns =
    adaReducer?.historicTableColumns?.forecast_multiplier || [];

  const [historicColumnData, setHistoricColumnData] = useState([]);
  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );
  const appendHistoricData = (historicColumns, historicRowData) => {
    try {
      if (!isPredictedDataFetched) return;

      const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);

      for (let i in updatedForecastMultiplier) {
        if (historicRowData?.length) {
          let rowDataCurrHistoric = historicRowData?.find(
            ({ row }) => row === updatedForecastMultiplier[i].row
          );

          if (rowDataCurrHistoric) {
            // append historic Data
            Object.assign(updatedForecastMultiplier[i], rowDataCurrHistoric);

            // comparison screen response
          }
        } else {
          historicColumns?.forEach((elem) => {
            // Delete previous historic data if any, if historic data is not there for current historic selection
            let key = elem.id?.split(".")?.[0];
            delete updatedForecastMultiplier[i][key];
            let tabData = cloneDeep(adaForecastMultiplierReducer?.[id] || {});

            delete tabData[key];

            dispatch(
              setAllForecastMultiplierData({
                key: id,
                value: tabData,
              })
            );
          });
        }
      }

      if (historicRowData?.length) {
        let forecastMultiplierData = updatedForecastMultiplier;

        let formattedData = {};
        let checkAvailableRows = [
          "Adjusted IA Forecast",
          // "Multiplier",
          "Adjusted User Forecast",
        ];
        let uniqueRowIdforecastMultiplierData = forecastMultiplierData?.map(
          (el) => el.forecast_multiplier
        );
        const allRowsAvailable = uniqueRowIdforecastMultiplierData.every(
          (val) => checkAvailableRows.includes(val)
        );

        let adjustedIAForecastMultiplierRow = forecastMultiplierData?.find(
          (el) => el.row === "forecast"
        );
        let adjustedUserForecastMultiplierRow = forecastMultiplierData?.find(
          (el) => el.row === "adjusted_forecast"
        );

        let fiscalPeriods = handlePredictedTimePeriod(adaReducer);

        // if (allRowsAvailable) {
        for (let key in forecastMultiplierData?.[0] || {}) {
          if (isNumber(key) || fiscalPeriods?.includes(key)) {
            formattedData[key] = {
              IA: adjustedIAForecastMultiplierRow?.[key],
              ratio:
                adjustedUserForecastMultiplierRow?.[key] /
                adjustedIAForecastMultiplierRow?.[key],
              adjusted: adjustedUserForecastMultiplierRow?.[key],
            };
          } else {
            formattedData[key] = forecastMultiplierData?.[0]?.[key];
          }
        }
        if (!showIAData) {
          dispatch(
            setAllForecastMultiplierData({
              key: id,
              value: formattedData,
            })
          );
        }
        // }
      }
      forecastMultiplierInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });

      // if (setIsApiSuccssCounter !== null) {
      //   setTimeout(() => {
      //     setIsApiSuccssCounter((prev) => prev + 1);
      //   }, 0);
      // }
    } catch (error) {}
  };

  useEffect(() => {
    // if (
    //   !adaReducer?.selectedHistoricValue?.length ||
    //   !adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length ||
    //   !isPredictedDataFetched
    // )
    //   return;
    // setHistoricColumnData([]);

    if (isCalledFromMFPDashboard || !isPredictedDataFetched) return;

    const getData = async () => {
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
        adaReducer?.isEligible,
        false,
        false,
        null,
        tableName,
        isHistoricMFPRequired
      );
      payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;

      let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);

      const fetchColumnData = async () => {
        try {
          setForecastMultiplierLoader((prevState) => prevState + 1);

          let decimalsToShow =
            adaReducer?.clientConfig?.attribute_value?.attribute_value
              ?.dashboard?.decimalConfig?.ForecastMultiplier;
          let formatter =
            adaReducer?.clientConfig?.attribute_value
              ?.decimal_rounding_off_mapping?.[decimalsToShow];

          // let response = await getForecastColumns(
          //   {
          //     ...payload.filters.timeline,
          //     aggregation_level: payload.filters.aggregation_level,
          //     formatter,
          //   },
          //   {
          //     fullWidth: true,
          //     roundOffTo: decimalsToShow,
          //   }
          // );

          let response =
            forecastMultiplierColumnsTransformer(
              historicForecastMultiplierColumns
            ) || [];

          // return;

          const isWeekEndDateLabelEnabled =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.is_week_end_date_label_enabled;

          let showWeekEndDateLabelEnabled =
            isWeekEndDateLabelEnabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W";

          const isWeekStartDateLabelEnabled =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.is_week_start_date_label_enabled;

          let showWeekStartDateLabelEnabled =
            isWeekStartDateLabelEnabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W";

          const updatedColumnData = response
            ?.filter((val) => val.column_name !== "forecast_multiplier")
            .map((column) => ({
              ...column,
              disabled: true,
              is_lockable: false,
              is_sortable: false,
              is_searchable: false,
              // label: `F${adaReducer?.switchTimeLine?.[0]?.value}-${column.label}`,

              // label: showWeekEndDateLabelEnabled
              //   ? weekEndDateLabel(column.label, adaReducer)
              //   : `F${adaReducer?.switchTimeLine?.[0]?.value}-${column.label} ${
              //       predictedFutureFiscalWeeks?.includes(+column.label)
              //         ? " (H)"
              //         : ""
              //     }`,

              label: columnLabelHandler(
                column.label,
                adaReducer,
                showWeekEndDateLabelEnabled,
                predictedFutureFiscalWeeks,
                false,
                showWeekStartDateLabelEnabled
              ),

              // For Month aggregation level, some weeks of the Last Month will fall under historic forecast
              // and some of the weeks will be under predicted forecast, since keys will be same.
              // Hence, modyfying the key for Historical in response
              column_name: predictedFutureFiscalWeeks?.includes(
                +column.column_name
              )
                ? `${column.column_name}H`
                : column.column_name,
            }));

          const formattedResponse = agGridColumnFormatter(updatedColumnData);
          // for comparison tab

          dispatch(setHistoricalColumns(formattedResponse));

          setHistoricColumnData(formattedResponse);

          return formattedResponse;
        } catch (error) {
          console.log("Error in fetching Historic data", error);
          // errorHandler(dispatch, error);
        } finally {
          setForecastMultiplierLoader((prevState) => prevState - 1);
        }
      };

      const fetchRowData = async () => {
        try {
          setForecastMultiplierLoader((prevState) => prevState + 1);
          let forecastMultiplierPayload = { ...payload };
          forecastMultiplierPayload.filters.tab_name = t(
            forecastMultiplierTabNamelabelmapping[id]
          );

          let adjustedDiscountPayload = [];
          let predictedFiscalWeeks = handleHistoricTimePeriod(adaReducer);

          predictedFiscalWeeks?.forEach((elem) => {
            adjustedDiscountPayload.push({
              fiscal_timeperiod_id: `${elem}`,
              promo_percentage: null,
              price_point: null,
              modified: [],
            });
          });

          payload.adjusted = adjustedDiscountPayload;
          payload.adjusted_price_point = [];
          const customAdjustedIALabel =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.custom_adjusted_IA_label;
          const customMFPLabel =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.custom_mfp_label;

          // let response = await getForecastData(payload);
          let response = cloneDeep(
            forecastMultiplierRowDataTransformer(
              predictedFiscalWeeks,
              cloneDeep(adaReducer?.historicForecastAttributes),
              showIAData,
              adaReducer.clientConfig?.attribute_value?.mfp,
              id === "scenario1" || id === "scenario2",
              customAdjustedIALabel,
              customMFPLabel,
              adaReducer
            )
          );

          let formattedResponse = response;

          predictedFiscalWeeks.forEach((week) => {
            // If fiscal key doesn't exist in response, append
            if (
              formattedResponse?.[0] &&
              !formattedResponse?.[0]?.hasOwnProperty([week])
            ) {
              formattedResponse[0][week] = null;
              formattedResponse[1][week] = null;
              formattedResponse[2][week] = null;
            }

            if (
              formattedResponse?.[1] &&
              predictedFutureFiscalWeeks?.includes(week)
            ) {
              let historicCommonWeek = `${week}H`;

              formattedResponse[0][historicCommonWeek] =
                formattedResponse[0][week];
              formattedResponse[1][historicCommonWeek] =
                formattedResponse[1][week];
              formattedResponse[2][historicCommonWeek] =
                formattedResponse[2][week];

              // Handling case for client_forecast && final_forecast
              let clientForecast = formattedResponse.find(
                (item) => item?.row === "client_forecast"
              );
              let finalForecast = formattedResponse.find(
                (item) => item?.row === "final_forecast"
              );

              clientForecast &&
                (clientForecast[historicCommonWeek] = clientForecast[week]);
              finalForecast &&
                (finalForecast[historicCommonWeek] = finalForecast[week]);

              delete formattedResponse[0][week];
              delete formattedResponse[1][week];
              delete formattedResponse[2][week];
              clientForecast && delete clientForecast[week];
              finalForecast && delete finalForecast[week];
            }
          });

          if (showIAData) {
            if (showIAData && formattedResponse?.length) {
              formattedResponse?.splice(1, 2);
            }
          }
          return formattedResponse;
        } catch (error) {
          // errorHandler(dispatch, error);
        } finally {
          setForecastMultiplierLoader((prevState) => prevState - 1);
        }
      };

      const [
        historicColumnDataResponse,
        historicRowDataResponse,
      ] = await Promise.all([fetchColumnData(), fetchRowData()]);

      if (historicRowDataResponse) {
        appendHistoricData(historicColumnDataResponse, historicRowDataResponse);
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
    //   // selectedGraphFilters.length > 0
    // ) {
    getData();
    // }
  }, [
    JSON.stringify(historicForecastMultiplierColumns),
    JSON.stringify(adaReducer?.historicForecastAttributes),
    isPredictedDataFetched,
    adaReducer?.isEligible,
    adaReducer?.xAxisStaticDates?.fiscal_ids?.length &&
      adaReducer?.xAxisStaticDates?.fiscal_ids,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
  ]);

  return adaReducer?.selectedHistoricValue?.length
    ? {
        historicColumnData,
      }
    : {
        historicColumnData: [],
      };
};
