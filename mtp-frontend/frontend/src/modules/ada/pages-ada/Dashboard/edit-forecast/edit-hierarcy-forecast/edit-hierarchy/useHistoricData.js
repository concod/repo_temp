import { cloneDeep } from "lodash";
import {
  fetchEditHierarchyData,
  fetchHistoricEditHierarchyColumnData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

import {
  chartDataPayload,
  getHistoricEditHierarchyPayload,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const useHistoricData = (showIAData, isCalledFromMFPDashboard) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [historicColumnData, setHistoricColumnData] = useState([]);
  const [historicRowData, setHistoricRowData] = useState([]);
  const [tableLoader, setTableLoader] = useState(0);

  useEffect(() => {
    if (isCalledFromMFPDashboard) {
      return;
    }
    if (
      !adaReducer?.selectedHistoricValue?.length
      // ||
      // !adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length
    )
      return;
    setHistoricColumnData([]);
    setHistoricRowData([]);
    const getData = () => {
      const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;
      const historicalDataFiscalWeekCompare =
        adaReducer?.historicalDataFiscalWeekCompare;
      const updatedPayload = cloneDeep(adaReducer);
      updatedPayload.future = updatedPayload.fiscalDates;

      updatedPayload.fiscalDates = historicalDataFiscalWeek;
      updatedPayload.historicActuals = historicalDataFiscalWeekCompare;

      const payload = chartDataPayload(updatedPayload, null, null, showIAData);

      const historicFiscalWeeks = [
        historicalDataFiscalWeek.start_fw,
        historicalDataFiscalWeek.end_fw,
      ];

      payload.filters.snapshot = historicFiscalWeeks?.[0];
      payload.filters.timeline = {
        ...payload.filters.timeline,
        start_week_id: historicFiscalWeeks?.[0],
        end_week_id: historicFiscalWeeks?.[historicFiscalWeeks?.length - 1],
      };

      const fetchColumnData = async () => {
        try {
          setTableLoader((prevState) => prevState + 1);
          const historicEditHierarchyPayload = getHistoricEditHierarchyPayload(
            payload,
            showIAData,
            adaReducer
          );

          let predictedFutureFiscalWeeks =
            adaReducer?.predictedFiscalWeeks || [];

          historicEditHierarchyPayload.predictedFutureFiscalWeeks = predictedFutureFiscalWeeks;
          let response = await fetchHistoricEditHierarchyColumnData(
            historicEditHierarchyPayload,
            adaReducer
          );

          setHistoricColumnData(response);
        } catch (error) {
          // errorHandler(dispatch, error);
        } finally {
          setTableLoader((prevState) => prevState - 1);
        }
      };

      const fetchRowData = async () => {
        try {
          setTableLoader((prevState) => prevState + 1);

          let adjustedDiscountPayload = [];
          let predictedFiscalWeeks =
            adaReducer?.historicActualsFiscalWeeks || [];

          predictedFiscalWeeks?.forEach((elem) => {
            adjustedDiscountPayload.push({
              fiscal_timeperiod_id: elem,
              promo_percentage: null,
              price_point: null,
              modified: [],
            });
          });
          payload.adjusted = adjustedDiscountPayload;
          payload.adjusted_price_point = [];

          const response = await fetchEditHierarchyData(payload, adaReducer);

          setHistoricRowData(response);
        } catch (error) {
          console.log("🚀 ~ fetchRowData ~ error:", error);
          // errorHandler(dispatch, error);
        } finally {
          setTableLoader((prevState) => prevState - 1);
        }
      };
      fetchColumnData();
      fetchRowData();
    };
    getData();
  }, [
    adaReducer?.selectedHistoricValue,
    isCalledFromMFPDashboard,
    adaReducer?.historicTableColumns,
    // adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
  ]);

  // return {
  //   historicColumnData,
  //   historicRowData,
  //   tableLoader,
  // };

  return adaReducer?.selectedHistoricValue?.length
    ? {
        historicColumnData,
        historicRowData,
        tableLoader,
      }
    : {
        historicColumnData: [],
        historicRowData: [],
        tableLoader: 0,
      };
};
