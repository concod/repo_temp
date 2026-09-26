import { cloneDeep } from "lodash";
import {
  fetchEditHierarchyData,
  fetchHistoricEditHierarchyColumnData,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";

import { chartDataPayload } from "../utils-matrix-summary/utilityFunctions";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const useHistoricData = (showIAData, isCalledFromMFPDashboard) => {
  const matrixSummaryReducer = useSelector(
    (store) => store?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );

  const [historicColumnData, setHistoricColumnData] = useState([]);
  const [historicRowData, setHistoricRowData] = useState([]);
  const [tableLoader, setTableLoader] = useState(0);

  useEffect(() => {
    if (isCalledFromMFPDashboard) {
      return;
    }
    if (
      !matrixSummaryReducer?.selectedHistoricValue?.length ||
      !matrixSummaryReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length
    )
      return;
    setHistoricColumnData([]);
    setHistoricRowData([]);
    const getData = () => {
      const historicalDataFiscalWeek =
        matrixSummaryReducer?.historicalDataFiscalWeek;
      const historicalDataFiscalWeekCompare =
        matrixSummaryReducer?.historicalDataFiscalWeekCompare;
      const updatedPayload = cloneDeep(matrixSummaryReducer);
      updatedPayload.future = updatedPayload.fiscalDates;

      updatedPayload.fiscalDates = historicalDataFiscalWeek;
      updatedPayload.historicActuals = historicalDataFiscalWeekCompare;

      const payload = chartDataPayload(updatedPayload, null, null, showIAData);

      payload.filters.snapshot = updatedPayload.fiscalDates.start_fw;

      const fetchColumnData = async () => {
        try {
          setTableLoader((prevState) => prevState + 1);
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
            matrixSummaryReducer?.xAxisStaticHistoricDates?.fiscal_ids || [];
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

          const response = await fetchEditHierarchyData(
            payload,
            matrixSummaryReducer
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
    matrixSummaryReducer?.selectedHistoricValue,
    isCalledFromMFPDashboard,
    matrixSummaryReducer?.xAxisStaticHistoricDates?.fiscal_ids?.length,
  ]);

  return matrixSummaryReducer?.selectedHistoricValue?.length
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
