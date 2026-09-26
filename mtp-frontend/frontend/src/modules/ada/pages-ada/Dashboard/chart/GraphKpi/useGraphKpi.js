import { cloneDeep } from "lodash";
import {
  fetchFiscalWeeks,
  getChartData,
  getGraphKPIdata,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  getHistoricActualsFiscalWeeks,
  getHistoricFiscalWeeksFromPredictednWeekCount,
} from "modules/ada/utils-ada/formatData";

import {
  chartDataPayload,
  currentHistoricDates,
  graphKPIUtil,
} from "modules/ada/utils-ada/utilityFunctions";
import moment from "moment";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const useGraphKpi = (
  selectedGraphFilters,
  showIAData,
  isCalledFromMFPDashboard
) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [graphKPIData, setGraphKPIData] = useState([]);
  const isEligible = adaReducer?.isEligible;

  //Load KPI Matrix for MFP Dashboard
  useEffect(() => {
    if (
      // !isCalledFromMFPDashboard ||
      selectedGraphFilters?.length
      //  ||
      // !adaReducer?.isSnapshotResponseFetched
    ) {
      return;
    }

    const getData = async () => {
      let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks;

      let historicDates = getHistoricFiscalWeeksFromPredictednWeekCount(
        predictedFiscalWeeks[0],
        1,
        adaReducer
      );

      let snanpshotWeek = historicDates[0];
      let weekCount = 1;

      if (adaReducer?.selectedHistoricValue[0]?.value) {
        snanpshotWeek = adaReducer?.selectedHistoricValue[0]?.snapshot_week;
        weekCount = adaReducer?.selectedHistoricValue[0]?.value;
      }
      let [
        historicStartWeekId,
        historicEndWeekId,
      ] = getHistoricActualsFiscalWeeks(adaReducer, snanpshotWeek, weekCount);

      let fiscalDatesInfo = {
        end_fw: historicEndWeekId,
        start_fw: historicStartWeekId,
      };

      let payload = graphKPIUtil(
        adaReducer,
        fiscalDatesInfo,
        selectedGraphFilters,
        isEligible
      );

      let graphKPIdata = await getGraphKPIdata(payload);
      setGraphKPIData(graphKPIdata?.[0]);
    };

    getData();
  }, [
    adaReducer?.selectedHistoricValue[0]?.value,
    adaReducer?.isSnapshotResponseFetched,
  ]);

  useEffect(() => {
    if (!selectedGraphFilters?.length) {
      return;
    }
    if (isCalledFromMFPDashboard) return;

    const getData = async () => {
      const week = adaReducer?.historicDropDownSelectedWeeks;

      const { currDate, historicDate } = currentHistoricDates(week);

      if (!adaReducer?.selectedHistoricValue?.length) {
        const dates = await fetchFiscalWeeks(historicDate, currDate);
        const fiscalDatesInfo = dates?.data?.data?.start_date;

        const payload = graphKPIUtil(
          adaReducer,
          fiscalDatesInfo,
          selectedGraphFilters,
          isEligible
        );
        const graphKPIdata = await getGraphKPIdata(payload);
        setGraphKPIData(graphKPIdata?.[0]);
      } else {
        const payload = graphKPIUtil(
          adaReducer,
          adaReducer?.historicalDataFiscalWeek,
          selectedGraphFilters,
          isEligible
        );
        const graphKPIdata = await getGraphKPIdata(payload);
        setGraphKPIData(graphKPIdata?.[0]);
      }
    };
    getData();
  }, [adaReducer?.selectedHistoricValue, selectedGraphFilters, isEligible]);

  return graphKPIData;
};
