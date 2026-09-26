import { cloneDeep } from "lodash";
import { getDriverForecastColumns } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  AllDriverForecastPayload,
  chartDataPayload,
  columnLabelHandler,
  handlePredictedTimePeriod,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { driverForecastColumnsTransformer } from "modules/ada/utils-ada/formatData";

export const useHistoricAllDriverForecast = (
  showIAData,
  setDriverForecastLoader
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  let historicDriverForecastColumns =
    adaReducer?.historicTableColumns?.drivers_of_forecast;

  const [
    historicAllDriverForecastColumnData,
    setHistoricAllDriverForecastColumnData,
  ] = useState([]);

  useEffect(() => {
    if (!historicDriverForecastColumns?.length) return;
    // setHistoricAllDriverForecastColumnData([]);
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

      const fetchColumnData = async () => {
        try {
          setDriverForecastLoader((prevState) => prevState + 1);
          const driverForecastPayload = AllDriverForecastPayload(
            payload,
            showIAData,
            adaReducer
          );

          let predictedFutureFiscalWeeks = handlePredictedTimePeriod(
            adaReducer
          );

          // let response = await getDriverForecastColumns(driverForecastPayload);
          let response = cloneDeep(
            driverForecastColumnsTransformer(
              historicDriverForecastColumns,
              adaReducer
            )
          );
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

          const updatedColumnData = response?.slice(2).map((column) => {
            return {
              ...column,
              disabled: true,
              is_lockable: false,
              is_sortable: false,
              is_searchable: false,

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
            };
          });

          const formattedResponse = agGridColumnFormatter(updatedColumnData);

          setHistoricAllDriverForecastColumnData(formattedResponse);
        } catch (error) {
          // errorHandler(dispatch, error);
        } finally {
          setDriverForecastLoader((prevState) => prevState - 1);
        }
      };

      fetchColumnData();
    };
    getData();
  }, [
    JSON.stringify(historicDriverForecastColumns),
    adaReducer?.xAxisStaticDates?.fiscal_ids?.length &&
      adaReducer?.xAxisStaticDates?.fiscal_ids,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
  ]);

  return adaReducer?.selectedHistoricValue?.length
    ? {
        historicAllDriverForecastColumnData,
      }
    : {
        historicAllDriverForecastColumnData: [],
      };
};
