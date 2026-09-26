import { cloneDeep } from "lodash";
import { getPromoTypeColumns } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  columnLabelHandler,
  getPromoPayload,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

export const useHistoricPromoTypeData = (
  showIAData,
  setDriverForecastLoader
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [
    historicPromoTypeTableColumnData,
    setHistoricPromoTypeColumnData,
  ] = useState([]);

  useEffect(() => {
    if (!adaReducer?.selectedHistoricValue?.length) return;
    setHistoricPromoTypeColumnData([]);
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
          const promoPayload = getPromoPayload(payload, showIAData, adaReducer);
          let response = await getPromoTypeColumns(promoPayload);
          let predictedFutureFiscalWeeks =
            adaReducer?.predictedFiscalWeeks || [];
          const isWeekEndDateLabelEnabled =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.is_week_end_date_label_enabled;

          let showWeekEndDateLabelEnabled =
            isWeekEndDateLabelEnabled &&
            adaReducer?.switchTimeLine?.[0]?.value === "W";
          const updatedColumnData = response?.data?.data
            ?.slice(2)
            .map((column) => {
              return {
                ...column,
                disabled: true,
                is_lockable: false,
                is_sortable: false,
                is_searchable: false,
                // label: showWeekEndDateLabelEnabled
                //   ? weekEndDateLabel(column.label, adaReducer)
                //   : `F${adaReducer?.switchTimeLine?.[0]?.value}-${
                //       column.label
                //     } ${
                //       predictedFutureFiscalWeeks?.includes(+column.label)
                //         ? " (H)"
                //         : ""
                //     }`,

                label: columnLabelHandler(
                  column.label,
                  adaReducer,
                  showWeekEndDateLabelEnabled,
                  predictedFutureFiscalWeeks
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

          setHistoricPromoTypeColumnData(formattedResponse);
        } catch (error) {
          // errorHandler(dispatch, error);
        } finally {
          setDriverForecastLoader((prevState) => prevState - 1);
        }
      };

      fetchColumnData();
    };
    getData();
  }, [adaReducer?.selectedHistoricValue]);

  return adaReducer?.selectedHistoricValue?.length
    ? {
        historicPromoTypeTableColumnData,
      }
    : {
        historicPromoTypeTableColumnData: [],
      };
};
