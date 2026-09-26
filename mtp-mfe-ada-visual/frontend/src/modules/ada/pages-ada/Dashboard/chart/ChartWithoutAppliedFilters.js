import React, { forwardRef, useEffect, useState } from "react";
import Charts from "core/Utils/charts";
import { updatedChartData } from "modules/ada/utils-ada/utilityFunctions";
import { useDispatch, useSelector } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { useHistoricData } from "./useHistoricData";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import { setCounterToTriggerForecastCustomHook } from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { infoHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
import { useTranslation } from "impact-ui-v3";

const ChartWithoutAppliedFilters = forwardRef((props, ref) => {
  const { t } = useTranslation();
  const {
    activeKey,
    id,
    chartConfig,
    counterOnEditHierarchyChange,
    parentControlledVal,
    refreshChartDataCounter,
    hidePastHistoricData,
    customStyleChartContainer,
    isCalledFromMFPDashboard,
    isChartLabelFiltersHidden,
  } = props;

  const dispatch = useDispatch();

  const [chartData, setChartData] = useState([]);
  // when multiplier is updated, chart section is not trigerring properly. so,
  // in order to show correct response useing below state to trigger change
  // const [isMultiplierUpdated, setIsMultiplierUpdated] = useState(0);

  const { historicChartData, historicChartLoader } = useHistoricData(
    null,
    id === "IA",
    hidePastHistoricData,
    false,
    isCalledFromMFPDashboard
  );

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const isMultiplierChanged = adaForecastMultiplierReducer?.isMultiplierChanged;
  const weekChanged = adaForecastMultiplierReducer?.fiscalWeekEdited;
  const updateForecastData = (data) => {
    //for View Edit Hiererachy, return data from api, as it is, the multiplier won't impact it
    if (parentControlledVal === +1) {
      return data;
    }
    let isAnyPredictedZero = false;
    let chartDataCopy = cloneDeep(data);
    chartDataCopy?.ia_forecast_data?.forEach((week) => {
      let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
      let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];

      let multiplierDataCurrWeek =
        adaForecastMultiplierReducer?.[id]?.[currWeek];

      if (multiplierDataCurrWeek?.IA && currWeek == +weekChanged) {
        let multiplierRatio = multiplierDataCurrWeek.ratio;
        if (week?.predicted_qty === 0) {
          week.adjusted_forecast_qty = week.adjusted_forecast_qty;
          isAnyPredictedZero = true;
        } else {
          week.adjusted_forecast_qty = week.predicted_qty * multiplierRatio;
        }
      }

      return week;
    });
    if (isAnyPredictedZero && filterApplied) {
      infoHandler(dispatch, t("ada.common.predictedForecastZeroWarning"), 5000);
    }
    return chartDataCopy;
  };

  useEffect(() => {
    if (isEmpty(adaForecastMultiplierReducer?.[id])) return;
    let updatedChartDataWithMultiplierRatio = cloneDeep(
      updateForecastData(chartData)
    );
    setChartData(updatedChartDataWithMultiplierRatio);
  }, [isMultiplierChanged]);

  // useEffect(() => {
  //   if (isEmpty(adaForecastMultiplierReducer?.[id])) return;
  //   setIsMultiplierUpdated((prev) => prev + 1);
  // }, [);

  useEffect(() => {
    // if (!activeKey) return;

    let chartData = cloneDeep(adaForecastMultiplierReducer?.allChartData);
    setChartData(chartData);
  }, [JSON.stringify(adaForecastMultiplierReducer?.allChartData)]);

  useEffect(() => {
    if (!activeKey || isEmpty(chartData) || !refreshChartDataCounter) {
      return;
    }

    dispatch(setCounterToTriggerForecastCustomHook());
  }, [refreshChartDataCounter]);

  useEffect(() => {
    if (!activeKey || isEmpty(chartData) || !adaReducer?.[id]) {
      return;
    }

    dispatch(setCounterToTriggerForecastCustomHook());
  }, [adaReducer?.[id]]);

  useEffect(() => {
    if (!counterOnEditHierarchyChange) return;
    let L0TotalData = editHierarchyTotalRowInstance?.current?.api?.getRowNode(
      "total"
    )?.data;
    if (
      L0TotalData?.last_updated_data &&
      Object.keys(L0TotalData?.last_updated_data).length
    ) {
      let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
      let fiscal_year_week = [FISCAL_KEY_MAPPING[aggLevelSelected]];

      let key = Object.keys(L0TotalData?.last_updated_data);
      // let newValue = Object.values(L0TotalData?.last_updated_data);
      chartData?.ia_forecast_data?.map((data) => {
        key.map((val) => {
          if (data?.[fiscal_year_week] === parseInt(val)) {
            data.adjusted_forecast_qty = L0TotalData?.last_updated_data[val];
          }
        });
      });
    }
  }, [counterOnEditHierarchyChange]);

  return (
    chartConfig && (
      <Charts
        customStyleChartContainer={customStyleChartContainer}
        options={updatedChartData(
          chartConfig,
          chartData,
          historicChartData,
          adaReducer,
          id,
          hidePastHistoricData,
          isChartLabelFiltersHidden
        )}
      />
    )
  );
});

export default ChartWithoutAppliedFilters;
