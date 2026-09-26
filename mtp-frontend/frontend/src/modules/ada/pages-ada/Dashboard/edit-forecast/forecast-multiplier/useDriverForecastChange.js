import { getForecastData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { setForecastMultiplierData } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import {
  chartDataPayload,
  forecastMultiplierTabNamelabelmapping,
  formattedAdjustedPayload,
  getAllRows,
  isNumber,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { handleWeekAppendResponse } from "./helper";
import { cloneDeep } from "lodash";

export const useDriverForecastChange = (
  forecastMultiplierInstance,
  initialRowData,
  setInitialRowData,
  id,
  setForecastMultiplierLoader,
  lastEditedDrivers
) => {
  const dispatch = useDispatch();
  let showIAData = id === "IA";
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  useEffect(() => {
    const updatedForecastMultiplier = getAllRows(forecastMultiplierInstance);

    // if (driverForecastVal === null) return;

    const appendForecastMultiplier = async () => {
      try {
        setForecastMultiplierLoader((prevState) => prevState + 1);
        const appendPayload = chartDataPayload(
          adaReducer,
          null,
          null,
          showIAData,
          null
        );

        appendPayload.filters.tab_name =
          forecastMultiplierTabNamelabelmapping[id];

        let [
          adjustedDiscountPayload,
          adjustedPricePointPayload,
        ] = formattedAdjustedPayload([], lastEditedDrivers, adaReducer);

        //when driver forecast is updated only send all the edited DF's
        appendPayload.adjusted = adjustedDiscountPayload;

        appendPayload.adjusted_price_point = [];

        const response = await getForecastData(appendPayload);

        let forecastMultiplierData = response?.data?.data;

        let formattedData = {};

        for (let key in forecastMultiplierData?.[0] || {}) {
          if (
            isNumber(key) ||
            adaReducer?.predictedFutureFiscalWeeks?.includes(key)
          ) {
            formattedData[key] = {
              IA: forecastMultiplierData?.[0]?.[key],
              ratio: forecastMultiplierData?.[1]?.[key],
              adjusted: forecastMultiplierData?.[2]?.[key],
            };
          }
        }

        dispatch(
          setForecastMultiplierData({
            key: id,
            value: formattedData,
          })
        );

        handleWeekAppendResponse(
          updatedForecastMultiplier,
          cloneDeep(response?.data?.data)
        );

        const updatedInitialResponse = handleWeekAppendResponse(
          initialRowData,
          cloneDeep(response?.data?.data)
        );
        forecastMultiplierInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        setInitialRowData(updatedInitialResponse);
      } catch (error) {
        // errorHandler(dispatch, error);
      } finally {
        setForecastMultiplierLoader((prevState) => prevState - 1);
      }
    };
    appendForecastMultiplier();
  }, [lastEditedDrivers]);
};
