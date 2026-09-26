import { cloneDeep } from "lodash";
import {
  fetchEditGrandChildHierarchyData,
  fetchHistoricalEditHierarchyGrandChildColumnData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

import {
  chartDataPayload,
  gethistoricalEditHierarchyGrandChildPayload,
} from "modules/ada/utils-ada/utilityFunctions";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const useHistoricData = (
  l0Name,
  l1Name,
  isDataFetched,
  showIAData,
  isCalledFromMFPDashboard
) => {
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
      !adaReducer?.selectedHistoricValue?.length ||
      !isDataFetched ||
      !adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length
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

      const payload = chartDataPayload(
        updatedPayload,
        null,
        null,
        showIAData,
        null,
        adaReducer?.isEligible
      );

      payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;

      const fetchColumnData = async () => {
        try {
          setTableLoader((prevState) => prevState + 1);
          const historicalEditHierarchyGrandChildPayload = gethistoricalEditHierarchyGrandChildPayload(
            payload,
            adaReducer
          );
          let predictedFutureFiscalWeeks =
            adaReducer?.xAxisStaticDates?.fiscal_ids || [];

          historicalEditHierarchyGrandChildPayload.predictedFutureFiscalWeeks = predictedFutureFiscalWeeks;
          let response = await fetchHistoricalEditHierarchyGrandChildColumnData(
            historicalEditHierarchyGrandChildPayload,
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
            adaReducer?.xAxisStaticHistoricDates?.fiscal_ids || [];
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

          const response = await fetchEditGrandChildHierarchyData(
            payload,
            l0Name,
            l1Name,
            adaReducer
          );

          setHistoricRowData(response);
        } catch (error) {
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
    isDataFetched,
    adaReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
    isCalledFromMFPDashboard,
    adaReducer?.isEligible,
  ]);

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
