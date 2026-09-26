import { cloneDeep, isEmpty, uniqBy } from "lodash";
import {
  appendPrevYearsData,
  getAllRows,
} from "modules/ada/utils-ada/utilityFunctions";

import { useEffect } from "react";
import { useSelector } from "react-redux";

export const usePastYearsForecast = (
  forecastMultiplierInstance,
  isApiSuccss
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  useEffect(() => {
    const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);

    let lastYearData = cloneDeep(
      adaForecastMultiplierReducer?.historicalActual
    );

    if (!isApiSuccss) return;

    // let lastYearRows = appendPrevYearsData(
    //   adaReducer,
    //   adaForecastMultiplierReducer
    // );

    lastYearData.forEach((lastYearRow) => {
      let index = updatedForecastMultiplier?.findIndex(
        ({ row }) => row === lastYearRow?.row
      );
      if (index > -1) {
        updatedForecastMultiplier[index] = lastYearRow;
      } else {
        lastYearRow?.row && updatedForecastMultiplier.push(lastYearRow);
      }
    });

    let formattedData = uniqBy(updatedForecastMultiplier, "row");

    forecastMultiplierInstance?.current?.api?.setRowData(formattedData);

    forecastMultiplierInstance?.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [adaForecastMultiplierReducer?.historicalActual, isApiSuccss]);
};
