import { cloneDeep, isEmpty } from "lodash";
import {
  appendPrevYearsDiscountData,
  getAllRows,
} from "modules/ada/utils-ada/utilityFunctions";

import { useEffect } from "react";
import { useSelector } from "react-redux";

export const useLastYearDiscount = (
  allDriverForecastInstance,
  setAllDriverForecastRowData,
  setInitialAllDriverForecastRowData,
  isApiSuccess
) => {
  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  useEffect(() => {
    if (
      !adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_forecast_historic_discount ||
      !isApiSuccess
    ) {
      return;
    }

    let lastYearData = adaForecastMultiplierReducer?.historicactualsDiscount;
    // let lastYearDiscountRows = appendPrevYearsDiscountData(
    //   adaReducer,
    //   adaForecastMultiplierReducer,
    //   true
    // );

    const updatedAllDriverForecast = getAllRows(allDriverForecastInstance);

    // if (!isApiSuccss) return;

    // if (isEmpty(lastYearData)) {
    //   return;
    // }

    if (!Array.isArray(lastYearData)) {
      return;
    }

    lastYearData.forEach((lastYearRow) => {
      let index = updatedAllDriverForecast?.findIndex(
        (elem) => elem?.row === lastYearRow?.row
      );

      if (index === -1) {
        updatedAllDriverForecast.push(lastYearRow);
      } else {
        updatedAllDriverForecast[index] = lastYearRow;
      }
    });

    allDriverForecastInstance?.current?.api?.setRowData(
      updatedAllDriverForecast
    );

    lastYearData.forEach((lastYearRow) => {
      setAllDriverForecastRowData((prevState) => {
        let index = prevState?.findIndex(
          (elem) => elem?.row === lastYearRow?.row
        );
        if (index === -1) {
          prevState.push(lastYearRow);
        } else {
          prevState[index] = lastYearRow;
        }
        //prevState[index] = lastYearRow;
        return prevState;
      });

      setInitialAllDriverForecastRowData((prevState) => {
        let index = prevState?.findIndex(
          (elem) => elem?.row === lastYearRow?.row
        );

        if (index === -1) {
          prevState.push(cloneDeep(lastYearRow));
        } else {
          prevState[index] = cloneDeep(lastYearRow);
        }
        return prevState;
      });
    });

    allDriverForecastInstance?.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [adaForecastMultiplierReducer?.historicactualsDiscount, isApiSuccess]);
};
