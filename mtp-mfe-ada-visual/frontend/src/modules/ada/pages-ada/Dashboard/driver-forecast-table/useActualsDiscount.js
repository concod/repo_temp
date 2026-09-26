import { cloneDeep, isEmpty } from "lodash";
import {
  appendActualsDiscount,
  appendActualsDiscountPercentage,
  getAllRows,
  isNumber,
  handleHistoricTimePeriod,
  handlePredictedTimePeriod,
} from "modules/ada/utils-ada/utilityFunctions";

import { useEffect } from "react";
import { useSelector } from "react-redux";

export const useActualsDiscount = (
  allDriverForecastInstance,
  setAllDriverForecastRowData,
  setInitialAllDriverForecastRowData,
  isApiSuccess
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  useEffect(() => {
    if (
      !adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_forecast_historic_discount ||
      !isApiSuccess
    ) {
      return;
    }
    let actualsDiscountPercent = adaForecastMultiplierReducer?.actualsDiscount;

    let formattedActualsDiscountPercent = appendActualsDiscountPercentage(
      adaForecastMultiplierReducer
    );
    let historicFiscalWeeks = handleHistoricTimePeriod(adaReducer);
    let predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);

    let processedActualsData = cloneDeep(formattedActualsDiscountPercent);
    Object.keys(formattedActualsDiscountPercent).forEach((key) => {
      if (
        (isNumber(key) || isNumber(key?.slice(0, -1))) &&
        historicFiscalWeeks?.includes(+key) &&
        predictedFiscalWeeks?.includes(+key)
      ) {
        processedActualsData[`${key}H`] = formattedActualsDiscountPercent[key];
        processedActualsData[key] = formattedActualsDiscountPercent[key];
      }
    });

    const updatedAllDriverForecast = getAllRows(allDriverForecastInstance);

    setAllDriverForecastRowData((prevState) => {
      let index = prevState?.findIndex(
        (elem) => elem?.row === formattedActualsDiscountPercent?.row
      );

      if (index > -1) {
        prevState[index] = processedActualsData;
      } else {
        prevState.push(processedActualsData);
      }

      return prevState;
    });

    setInitialAllDriverForecastRowData((prevState) => {
      let index = prevState?.findIndex(
        (elem) => elem?.row === formattedActualsDiscountPercent?.row
      );

      if (index > -1) {
        prevState[index] = cloneDeep(processedActualsData);
      } else {
        prevState.push(cloneDeep(processedActualsData));
      }

      return prevState;
    });

    let index = updatedAllDriverForecast?.findIndex(
      (elem) => elem?.row === formattedActualsDiscountPercent?.row
    );

    if (index > -1) {
      updatedAllDriverForecast[index] = {
        ...updatedAllDriverForecast[index],
        ...processedActualsData,
      };
    } else {
      updatedAllDriverForecast.push(processedActualsData);
    }

    allDriverForecastInstance?.current?.api?.setRowData(
      updatedAllDriverForecast
    );

    allDriverForecastInstance?.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [
    adaForecastMultiplierReducer?.actualsDiscount,
    // adaReducer?.forecastAttributesApiResolved,
    isApiSuccess,
  ]);
};
