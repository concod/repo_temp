import { cloneDeep, isEmpty } from "lodash";
import {
  appendPrevYearsDiscountData,
  getAllRows,
  isNumber,
  handleHistoricTimePeriod,
  handlePredictedTimePeriod,
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

  const mergeByRow = (arr1 = [], arr2 = []) => {
    const map = new Map(
      arr2.filter((item) => item?.row).map((item) => [item.row, item])
    );

    return arr1.map((item) => {
      if (!item?.row) return item;

      const match = map.get(item.row);

      return match ? { ...item, ...match } : item;
    });
  };

  useEffect(() => {
    if (
      !adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_forecast_historic_discount ||
      !isApiSuccess
    ) {
      return;
    }

    let lastYearData = adaForecastMultiplierReducer?.historicactualsDiscount;
    let lastYearDiscount =
      adaForecastMultiplierReducer?.historicActualsDiscountLastYear;

    let data = [];
    data = mergeByRow(lastYearData, lastYearDiscount);

    if (Array.isArray(lastYearData)) {
      let historicFiscalWeeks = handleHistoricTimePeriod(adaReducer);
      let predictedFiscalWeeks = handlePredictedTimePeriod(adaReducer);

      data = data.map((yearRow) => {
        let updatedRow = { ...yearRow };
        const currentFiscalRow = lastYearData?.find(
          (data) => data.row == yearRow.row
        );
        Object.keys(yearRow).forEach((key) => {
          if (
            (isNumber(key) || isNumber(key?.slice(0, -1))) &&
            historicFiscalWeeks?.includes(+key) &&
            predictedFiscalWeeks?.includes(+key)
          ) {
            updatedRow[`${key}H`] = yearRow[key];
            updatedRow[key] = currentFiscalRow?.[key];
          }
        });

        return updatedRow;
      });
    }
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

    data.forEach((lastYearRow) => {
      let index = updatedAllDriverForecast?.findIndex(
        (elem) => elem?.row === lastYearRow?.row
      );

      if (index === -1) {
        updatedAllDriverForecast.push(lastYearRow);
      } else {
        updatedAllDriverForecast[index] = {
          ...updatedAllDriverForecast[index],
          ...lastYearRow,
        };
      }
    });

    allDriverForecastInstance?.current?.api?.setRowData(
      updatedAllDriverForecast
    );

    data.forEach((lastYearRow) => {
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
  }, [
    adaForecastMultiplierReducer?.historicactualsDiscount,
    adaForecastMultiplierReducer.historicActualsDiscountLastYear,
    isApiSuccess,
  ]);
};
