import { isEmpty } from "lodash";
import { setPredictedActuals } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  appendActualsDiscount,
  getAllRows,
  isNumber,
  handlePredictedTimePeriod,
  handleHistoricTimePeriod,
} from "modules/ada/utils-ada/utilityFunctions";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

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

  const dispatch = useDispatch();

  const predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);
  const historicActualsFiscalWeeks = handleHistoricTimePeriod(adaReducer);

  const storedPredictedActuals =
    adaForecastMultiplierReducer?.predictedActuals || null;
  useEffect(() => {
    try {
      const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);

      if (isCalledFromMFPDashboard) return;
      if (!isApiSuccss) return;

      let actualsDiscount = appendActualsDiscount(
        adaForecastMultiplierReducer,
        adaReducer
      );
      if (
        !historicActualsFiscalWeeks.length &&
        predictedFutureFiscalWeeks?.[0]
      ) {
        dispatch(
          setPredictedActuals(
            actualsDiscount?.[0]?.[predictedFutureFiscalWeeks[0]]
          )
        );
      }

      actualsDiscount = actualsDiscount.map((actualsRow) => {
        let updatedRow = { ...actualsRow };

        Object.keys(actualsRow).forEach((key) => {
          if (isNumber(key) || isNumber(key?.slice(0, -1))) {
            // commenting below logic as already handled in actualsHandler function for historic weeks/months

            // if (
            //   historicActualsFiscalWeeks?.includes(+key) &&
            //   predictedFutureFiscalWeeks?.includes(+key)
            // ) {
            updatedRow[key] = actualsRow[key];
            // updatedRow[key] = storedPredictedActuals;
            // }
          }
        });

        return updatedRow;
      });
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
          // Mutate the existing node.data object in-place so AG Grid's
          // internal reference picks up the new week values on refreshCells.
          Object.assign(updatedForecastMultiplier[index], actualsDiscountRow);
        } else {
          updatedForecastMultiplier.push(actualsDiscountRow);
        }
      });

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
