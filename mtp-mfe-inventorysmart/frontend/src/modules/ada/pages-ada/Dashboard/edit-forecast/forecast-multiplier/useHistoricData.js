import { cloneDeep } from "lodash";
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
  forecastMultiplierTabNamelabelmapping,
  getAllRows,
  isNumber,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

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
  const dispatch = useDispatch();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

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
            ({ forecast_multiplier }) =>
              forecast_multiplier ===
              updatedForecastMultiplier[i].forecast_multiplier
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
          "Multiplier",
          "Adjusted User Forecast",
        ];
        let uniqueRowIdforecastMultiplierData = forecastMultiplierData?.map(
          (el) => el.forecast_multiplier
        );
        const allRowsAvailable = uniqueRowIdforecastMultiplierData.every(
          (val) => checkAvailableRows.includes(val)
        );

        if (allRowsAvailable) {
          for (let key in forecastMultiplierData?.[0] || {}) {
            if (isNumber(key)) {
              formattedData[key] = {
                IA: forecastMultiplierData?.[0]?.[key],
                ratio: forecastMultiplierData?.[1]?.[key],
                adjusted: forecastMultiplierData?.[2]?.[key],
              };
            } else {
              formattedData[key] = forecastMultiplierData?.[0]?.[key];
            }
          }

          dispatch(
            setAllForecastMultiplierData({
              key: id,
              value: formattedData,
            })
          );
        }
      }
      forecastMultiplierInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });

      if (setIsApiSuccssCounter !== null) {
        setTimeout(() => {
          setIsApiSuccssCounter((prev) => prev + 1);
        }, 0);
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (
      !adaReducer?.selectedHistoricValue?.length ||
      !adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length ||
      !isPredictedDataFetched
    )
      return;
    setHistoricColumnData([]);

    if (isCalledFromMFPDashboard) return;

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

      let predictedFutureFiscalWeeks =
        adaReducer?.xAxisStaticDates?.fiscal_ids || [];

      const fetchColumnData = async () => {
        try {
          setForecastMultiplierLoader((prevState) => prevState + 1);

          let decimalsToShow =
            adaReducer?.clientConfig?.attribute_value?.attribute_value
              ?.dashboard?.decimalConfig?.ForecastMultiplier;
          let formatter =
            adaReducer?.clientConfig?.attribute_value
              ?.decimal_rounding_off_mapping?.[decimalsToShow];

          let response = await getForecastColumns(
            {
              ...payload.filters.timeline,
              aggregation_level: payload.filters.aggregation_level,
              formatter,
            },
            {
              fullWidth: true,
              roundOffTo: decimalsToShow,
            }
          );

          // return;

          const isWeekEndDateLabelEnabled =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.is_week_end_date_label_enabled;

          let showWeekEndDateLabelEnabled =
            isWeekEndDateLabelEnabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W";

          const updatedColumnData = response?.data?.data
            ?.filter((val) => val.column_name !== "forecast_multiplier")
            .map((column) => ({
              ...column,
              disabled: true,
              is_lockable: false,
              is_sortable: false,
              is_searchable: false,
              // label: `F${adaReducer?.switchTimeLine?.[0]?.value}-${column.label}`,

              label: showWeekEndDateLabelEnabled
                ? weekEndDateLabel(column.label, adaReducer)
                : `F${adaReducer?.switchTimeLine?.[0]?.value}-${column.label} ${
                    predictedFutureFiscalWeeks?.includes(+column.label)
                      ? " (H)"
                      : ""
                  }`,
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
          forecastMultiplierPayload.filters.tab_name =
            forecastMultiplierTabNamelabelmapping[id];

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

          let response = await getForecastData(payload);

          let formattedResponse = response?.data?.data;

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

              delete formattedResponse[0][week];
              delete formattedResponse[1][week];
              delete formattedResponse[2][week];
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
    // adaReducer?.selectedHistoricValue,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
    isPredictedDataFetched,
    adaReducer?.isEligible,
  ]);

  return adaReducer?.selectedHistoricValue?.length
    ? {
        historicColumnData,
      }
    : {
        historicColumnData: [],
      };
};
