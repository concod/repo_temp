import { cloneDeep, isEmpty } from "lodash";
import { setOriginalPredictedIA } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  getAllRows,
  isNumber,
  handleHistoricTimePeriod,
  handlePredictedTimePeriod,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

export const useOriginalIAForecast = (
  showOriginalIAForecast,
  id,
  forecastMultiplierInstance,
  isApiSuccss,
  predictedFiscalWeeks
) => {
  const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const dispatch = useDispatch();

  //For storing IA for predicted weeks of the common historic month
  const OriginalPredictedIAData =
    cloneDeep(adaForecastMultiplierReducer?.originalPredictedIA) || null;
  const predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);
  const historicActualsFiscalWeeks = handleHistoricTimePeriod(adaReducer);
  let IARowData = {};
  // Append Original IA Row in Adjusted Tab
  useEffect(() => {
    if (!isApiSuccss) return;
    // Do not append in IA Forecast Tab
    // if (id === "IA") return;

    let IATabData = cloneDeep(adaForecastMultiplierReducer?.IA) || {};

    let gridApi = forecastMultiplierInstance?.current?.api;
    // Store original IA data when it hasn't been set yet or when historic dropdown is not selected
    if (!historicActualsFiscalWeeks.length && predictedFiscalWeeks) {
      dispatch(setOriginalPredictedIA(IATabData[predictedFiscalWeeks[0]]));
    }
    // Do not proceed if no data in redux yet or no data in adjusted tab
    // or showOriginalIAForecast in client config is false
    if (
      isEmpty(IATabData) ||
      // isEmpty(updatedForecastMultiplier) ||
      !showOriginalIAForecast
    ) {
      return;
    }

    const keys = Object.keys(IATabData);
    IATabData.row = "Original IA Forecast";
    IATabData.forecast_multiplier = "Original IA Forecast";

    keys.forEach((key) => {
      if (
        isNumber(key) ||
        isNumber(key?.slice(0, -1)) ||
        predictedFiscalWeeks?.includes(+key)
      ) {
        if (
          historicActualsFiscalWeeks?.includes(+key) &&
          predictedFutureFiscalWeeks?.includes(+key)
        ) {
          IARowData[`${key}H`] = IATabData[key]?.IA ?? IATabData[key];
          IARowData[key] = OriginalPredictedIAData ?? IATabData[key];
        } else {
          IARowData[key] = IATabData[key]?.IA ?? IATabData[key];
        }
      } else {
        IARowData[key] = IATabData[key];
      }
    });

    // gridApi.setPinnedTopRowData([IARowData]);
  }, [adaForecastMultiplierReducer?.IA, isApiSuccss]);

  return IARowData;
};
