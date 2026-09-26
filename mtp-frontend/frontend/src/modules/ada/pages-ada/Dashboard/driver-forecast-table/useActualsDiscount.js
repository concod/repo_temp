import { cloneDeep, isEmpty } from "lodash";
import {
  appendActualsDiscount,
  appendActualsDiscountPercentage,
  getAllRows,
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

    const updatedAllDriverForecast = getAllRows(allDriverForecastInstance);

    setAllDriverForecastRowData((prevState) => {
      let index = prevState?.findIndex(
        (elem) => elem?.row === formattedActualsDiscountPercent?.row
      );

      if (index > -1) {
        prevState[index] = formattedActualsDiscountPercent;
      } else {
        prevState.push(formattedActualsDiscountPercent);
      }

      return prevState;
    });

    setInitialAllDriverForecastRowData((prevState) => {
      let index = prevState?.findIndex(
        (elem) => elem?.row === formattedActualsDiscountPercent?.row
      );

      if (index > -1) {
        prevState[index] = cloneDeep(formattedActualsDiscountPercent);
      } else {
        prevState.push(cloneDeep(formattedActualsDiscountPercent));
      }

      return prevState;
    });

    let index = updatedAllDriverForecast?.findIndex(
      (elem) => elem?.row === formattedActualsDiscountPercent?.row
    );

    if (index > -1) {
      updatedAllDriverForecast[index] = formattedActualsDiscountPercent;
    } else {
      updatedAllDriverForecast.push(formattedActualsDiscountPercent);
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
