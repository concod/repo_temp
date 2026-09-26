import { cloneDeep } from "lodash";
import {
  fetchFiscalWeeks,
  getChartData,
  getGraphKPIdata,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

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
    if (!isCalledFromMFPDashboard) return;

    const getData = async () => {
      let defaultHistoricWeek =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.defaultHistoricWeek;
      let week = adaReducer?.historicDropDownSelectedWeeks;

      if (
        selectedGraphFilters?.length &&
        (defaultHistoricWeek === week.value || defaultHistoricWeek === null)
      ) {
        let { currDate, historicDate } = currentHistoricDates(week);
        let dates = await fetchFiscalWeeks(historicDate, currDate);
        let fiscalDatesInfo = dates?.data?.data?.start_date;

        let payload = graphKPIUtil(
          adaReducer,
          fiscalDatesInfo,
          selectedGraphFilters,
          isEligible
        );

        if (
          payload?.filters?.timeline?.start_week_id &&
          payload?.filters?.timeline?.end_week_id
        ) {
          let graphKPIdata = await getGraphKPIdata(payload);
          setGraphKPIData(graphKPIdata?.[0]);
        }
      }
    };

    getData();
  }, [adaReducer?.historicDropDownSelectedWeeks, selectedGraphFilters]);

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
