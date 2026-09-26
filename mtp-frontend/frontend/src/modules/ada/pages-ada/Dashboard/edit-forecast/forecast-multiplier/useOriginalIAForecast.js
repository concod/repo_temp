import { cloneDeep, isEmpty } from "lodash";
import { getAllRows, isNumber } from "modules/ada/utils-ada/utilityFunctions";
import { useEffect } from "react";
import { useSelector } from "react-redux";

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

  // Append Original IA Row in Adjusted Tab
  useEffect(() => {
    if (!isApiSuccss) return;
    // Do not append in IA Forecast Tab
    // if (id === "IA") return;

    let IATabData = cloneDeep(adaForecastMultiplierReducer?.IA) || {};

    let gridApi = forecastMultiplierInstance?.current?.api;

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
    let IARowData = {};
    keys.forEach((key) => {
      if (
        isNumber(key) ||
        isNumber(key?.slice(0, -1)) ||
        predictedFiscalWeeks?.includes(key)
      ) {
        IARowData[key] = IATabData[key]?.IA ?? IATabData[key];
      } else {
        IARowData[key] = IATabData[key];
      }
    });

    gridApi.setPinnedTopRowData([IARowData]);
  }, [adaForecastMultiplierReducer?.IA, isApiSuccss]);
};
