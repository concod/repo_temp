import { isEmpty } from "lodash";
import {
  appendActualsDiscount,
  getAllRows,
} from "modules/ada/utils-ada/utilityFunctions";

import { useEffect } from "react";
import { useSelector } from "react-redux";

export const useActualsForecast = (
  forecastMultiplierInstance,
  isApiSuccss,
  isCalledFromMFPDashboard
) => {
  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  useEffect(() => {
    try {
      const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);
      let actuals = adaForecastMultiplierReducer?.actuals;

      if (!isApiSuccss) return;
      if (isCalledFromMFPDashboard) return;
      if (!isCalledFromMFPDashboard && isEmpty(actuals)) {
        return;
      }

      let actualsDiscount = appendActualsDiscount(
        adaForecastMultiplierReducer,
        adaReducer,
      );
      // actuals?.forEach((actualsDiscountRow) => {
      //   let index = updatedForecastMultiplier?.findIndex(
      //     ({ row }) => row === actualsDiscountRow?.row
      //   );
      //   if (index > -1) {
      //     updatedForecastMultiplier[index] = actualsDiscountRow;
      //   } else {
      //     updatedForecastMultiplier.push(actualsDiscountRow);
      //   }
      // })

      actualsDiscount.forEach((actualsDiscountRow) => {
        let index = updatedForecastMultiplier?.findIndex(
          ({ row }) => row === actualsDiscountRow?.row
        );
        if (index > -1) {
          updatedForecastMultiplier[index] = actualsDiscountRow;
        } else {
          updatedForecastMultiplier.push(actualsDiscountRow);
        }
      });

      forecastMultiplierInstance?.current?.api?.setRowData(
        updatedForecastMultiplier
      );

      forecastMultiplierInstance?.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
      });
    } catch (error) {
      console.log("Something went wrong.", error);
    }
  }, [
    adaForecastMultiplierReducer?.historicalActual,
    adaForecastMultiplierReducer?.actuals,
    isApiSuccss,
    isCalledFromMFPDashboard,
  ]);
};
