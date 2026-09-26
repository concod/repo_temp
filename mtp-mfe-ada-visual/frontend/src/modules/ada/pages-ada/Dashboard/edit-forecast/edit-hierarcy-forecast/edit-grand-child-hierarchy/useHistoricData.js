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
  isCalledFromMFPDashboard,
  selectedCompareWith
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

      const payload = chartDataPayload(
        updatedPayload,
        null,
        null,
        showIAData,
        null,
        adaReducer?.isEligible
      );

      // payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;

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
          const historicalEditHierarchyGrandChildPayload = gethistoricalEditHierarchyGrandChildPayload(
            payload,
            showIAData,
            adaReducer
          );
          let predictedFutureFiscalWeeks =
            adaReducer?.predictedFiscalWeeks || [];

          historicalEditHierarchyGrandChildPayload.predictedFutureFiscalWeeks = predictedFutureFiscalWeeks;
          let response = await fetchHistoricalEditHierarchyGrandChildColumnData(
            historicalEditHierarchyGrandChildPayload,
            adaReducer,
            selectedCompareWith
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
          payload.filters.mfp = false;

          const response = await fetchEditGrandChildHierarchyData(
            payload,
            l0Name,
            l1Name,
            adaReducer,
            selectedCompareWith
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
    adaReducer?.historicTableColumns,
    isCalledFromMFPDashboard,
    adaReducer?.isEligible,
    selectedCompareWith?.value,
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
