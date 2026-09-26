import { cloneDeep, uniqBy } from "lodash";
import { setPredictedHistoricalActuals } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  appendActualsDiscount,
  appendPrevYearsData,
  getAdditionalRows,
  getAllRows,
  handleHistoricTimePeriod,
  handlePredictedTimePeriod,
  isNumber,
} from "modules/ada/utils-ada/utilityFunctions";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

export const usePastYearsForecast = (
  forecastMultiplierInstance,
  isApiSuccss,
  isCalledFromMFPDashboard,
  id,
  setRowData
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );
  const dispatch = useDispatch();

  const predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);

  const historicActualsFiscalWeeks = handleHistoricTimePeriod(adaReducer);

  const storedPredictedHistoricalActuals =
    adaForecastMultiplierReducer?.predictedHistoricalActuals || null;
  const showAddtionalRows =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_growth_deviation_rows;

  useEffect(() => {
    const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);

    let lastYearData = cloneDeep(
      adaForecastMultiplierReducer?.historicalActual
    );
    if (!historicActualsFiscalWeeks.length && predictedFutureFiscalWeeks?.[0]) {
      dispatch(
        setPredictedHistoricalActuals(
          lastYearData?.[0]?.[predictedFutureFiscalWeeks[0]]
        )
      );
    }

    lastYearData =
      lastYearData?.map((yearRow) => {
        let updatedRow = { ...yearRow };

        Object.keys(yearRow).forEach((key) => {
          if (isNumber(key) || isNumber(key?.slice(0, -1))) {
            if (
              historicActualsFiscalWeeks?.includes(+key) &&
              predictedFutureFiscalWeeks?.includes(+key)
            ) {
              updatedRow[`${key}H`] = yearRow[key];
              if (storedPredictedHistoricalActuals !== null) {
                updatedRow[key] = storedPredictedHistoricalActuals;
              }
            }
          }
        });

        return updatedRow;
      }) || [];

    if (!isApiSuccss) return;

    let actualsDiscount = appendActualsDiscount(
      adaForecastMultiplierReducer,
      adaReducer
    );
    actualsDiscount.forEach((actualsRow) => {
      let index = updatedForecastMultiplier?.findIndex(
        ({ row }) => row === actualsRow?.row
      );
      if (index > -1) {
        Object.assign(updatedForecastMultiplier[index], actualsRow);
      } else {
        updatedForecastMultiplier.push(actualsRow);
      }
    });

    lastYearData.forEach((lastYearRow) => {
      let index = updatedForecastMultiplier?.findIndex(
        ({ row }) => row === lastYearRow?.row
      );
      if (index > -1) {
        updatedForecastMultiplier[index] = {
          ...updatedForecastMultiplier[index],
          ...lastYearRow,
        };
      } else {
        lastYearRow?.row && updatedForecastMultiplier.push(lastYearRow);
      }
    });

    let formattedData = uniqBy(updatedForecastMultiplier, "row");
    if (showAddtionalRows) {
      let additionalRows = getAdditionalRows(
        adaReducer,
        adaForecastMultiplierReducer,
        formattedData,
        isCalledFromMFPDashboard,
        id
      );
      let nonAdditionalRows = formattedData.filter(
        (row) => !additionalRows.some((addRow) => addRow.row === row.row)
      );
      let finalRowData = [...nonAdditionalRows, ...additionalRows];

      if (setRowData) setRowData(finalRowData);
    } else {
      if (setRowData) setRowData(formattedData);
    }

    forecastMultiplierInstance?.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [adaForecastMultiplierReducer?.historicalActual, isApiSuccss]);
};
