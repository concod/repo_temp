import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { makeStyles } from "@mui/styles";
import {
  fetchFiscalWeeks,
  fetchHistoricDataWeeks,
  getStaticForecastXaxis,
  setFilters,
  setFullScreenLoaderCount,
  setHistoricalFiscalData,
  setXaisStaticHistoricDates,
  setGraphKPIWeeks,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import moment from "moment";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  DEFAULT_WEEK,
  currentHistoricDates,
  handleCompareBtnClick,
} from "./utilityFunctions";

const ShowHistoricDropDown = ({
  activeKey,
  pastYear,
  isCalledFromMFPDashboard,
}) => {
  const [historicDataWeeks, setHistoricDataWeeks] = useState([]);

  const fiscalCalendarData = useSelector(
    (store) =>
      store?.matrixSummaryReducer?.matrixSummaryDashboardReducer
        ?.fiscalCalendarDetails
  );

  const selectStyleClasses = useSelectStyles();
  const dispatch = useDispatch();
  const matrixSummaryReducer = useSelector(
    (store) => store?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );
  const compareOnSave = useSelector(
    (store) =>
      store?.matrixSummaryReducer?.matrixSummaryDashboardReducer.compareSave
  );
  const switchTimeLine = useSelector(
    (store) =>
      store?.matrixSummaryReducer?.matrixSummaryDashboardReducer?.switchTimeLine
  );
  const selectedHistoricValue = useSelector(
    (store) =>
      store?.matrixSummaryReducer?.matrixSummaryDashboardReducer
        ?.selectedHistoricValue
  );
  useEffect(() => {
    if (!activeKey) return;

    if (switchTimeLine?.[0]?.value === "Q") {
      return setHistoricDataWeeks([]);
    }

    const fetchHistoricDataWeeksOptions = async () => {
      try {
        dispatch(setFullScreenLoaderCount(1));

        const startDate = moment().startOf("week").format("MM-DD-YYYY");

        const fiscalStartDate = fiscalCalendarData?.find((date) => {
          const formattedDate = formatStringDate(
            date?.calendar_week_start_date,
            true,
            false,
            "MM-DD-YYYY"
          );

          /** Moment isSame does not work with Mozilla Thus Using Or Operator */
          return (
            moment(formattedDate).isSame(startDate) ||
            formattedDate === startDate
          );
        });

        const { data } = await fetchHistoricDataWeeks({
          current_week: fiscalStartDate?.fiscal_year_week,
        });

        const historicData = data?.data.map((elem) => {
          return {
            ...elem,
            label: elem.available_hist_weeks,
            value: elem.hist_week_values,
          };
        });

        if (switchTimeLine?.[0]?.value === "M") {
          let monthHistoricData = [];

          let oneMonth = historicData.find((elem) => elem.value === 4);
          if (oneMonth) {
            monthHistoricData.push({ ...oneMonth, label: "1 Month" });
          }
          let twoMonth = historicData.find((elem) => elem.value === 8);
          if (twoMonth) {
            monthHistoricData.push({ ...twoMonth, label: "2 Months" });
          }
          setHistoricDataWeeks(monthHistoricData);
        } else {
          setHistoricDataWeeks(historicData);

          let defaultHistoricWeek =
            matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
              ?.dashboard?.defaultHistoricWeek;

          let defaultHistoricWeekData = historicData.find(
            (elem) => elem.value === defaultHistoricWeek
          );

          // if defaultHistoricWeek of client config is available in the historicData,
          // then proceed to show default historic data
          if (defaultHistoricWeekData && !compareOnSave) {
            updateDependency(null, [defaultHistoricWeekData]);
          }

          if (compareOnSave && selectedHistoricValue) {
            updateDependency(null, selectedHistoricValue);
          }
        }
      } catch (error) {
      } finally {
        dispatch(setFullScreenLoaderCount(-1));
      }
    };
    fetchHistoricDataWeeksOptions();

    return () => {
      dispatch(setFilters({ key: "selectedHistoricValue", value: [] }));
    };
  }, [activeKey]);

  const updateDependency = async (_, value) => {
    const onClearPayload = {
      selectedHistoricValue: [],
      historicalDataFiscalWeek: {},
      historicalDataFiscalWeekCompare: {},
    };

    if (!value?.length) {
      dispatch(setXaisStaticHistoricDates({}));
      dispatch(setGraphKPIWeeks(DEFAULT_WEEK));
      return dispatch(setHistoricalFiscalData(onClearPayload));
    }

    try {
      dispatch(setFullScreenLoaderCount(1));
      dispatch(setGraphKPIWeeks(value[0]));

      const { currDate, historicDate } = currentHistoricDates(value[0]);

      const response = await fetchFiscalWeeks(historicDate, currDate);

      const fiscalDatesInfo = response?.data?.data?.start_date;

      // Predicted compare with mapping with historic compare with mapping
      let predictedHistoricCompareWithMapping = {};

      let past_years = [];
      let historicViewEndYear = +String(fiscalDatesInfo.end_fw)?.slice(0, 4);

      // If compare with is selected via dropdown and predicted year and historic data of "See Historic View"
      // dropdown year does not fall in same year then in order to form correct payload to see the correct data
      // we need substract 1 from each year selected from "Compare with" dropdown
      if (matrixSummaryReducer?.isCompareWithDropdown) {
        let selectedCompareWith = matrixSummaryReducer?.compareWithSelectedDate?.map(
          (elem) => +elem.value
        );
        if (selectedCompareWith?.includes(+historicViewEndYear)) {
          let formattedCompareWithHistoricViewYears = selectedCompareWith.map(
            (elem) => {
              predictedHistoricCompareWithMapping[elem] = elem - 1;

              return elem - 1;
            }
          );

          past_years = formattedCompareWithHistoricViewYears;
        } else {
          selectedCompareWith.forEach((elem) => {
            predictedHistoricCompareWithMapping[elem] = elem;
          });
          past_years = selectedCompareWith;
        }
      } else {
        let lastYear = handleCompareBtnClick(
          matrixSummaryReducer?.fiscalDates?.end_fw,
          1
        );
        let lastToLastYear = handleCompareBtnClick(
          matrixSummaryReducer?.fiscalDates?.end_fw,
          2
        );
        let comparisonYear =
          matrixSummaryReducer?.compareWithSelectedDate?.[0]?.value;
        let historicCompareWith = null;
        if (
          !matrixSummaryReducer?.isCompareWithDropdown &&
          comparisonYear === lastYear?.value
        ) {
          historicCompareWith = historicViewEndYear - 1;
        }
        if (
          !matrixSummaryReducer?.isCompareWithDropdown &&
          comparisonYear === lastToLastYear?.value
        ) {
          historicCompareWith = historicViewEndYear - 2;
        }
        past_years.push(historicCompareWith);

        let currFormattedYear =
          matrixSummaryReducer?.compareWithSelectedDate?.[0]?.value;

        predictedHistoricCompareWithMapping[
          currFormattedYear
        ] = historicCompareWith;
      }

      let xAxispayload = {
        start_week_id: fiscalDatesInfo?.start_fw,
        end_week_id: fiscalDatesInfo?.end_fw,
        past_years,
        agg_level: switchTimeLine?.[0]?.value,
      };
      const data = await getStaticForecastXaxis(xAxispayload);

      const compareWithYear = past_years?.map((elem) => {
        return {
          year: elem,
          start_week_id: fiscalDatesInfo.start_fw,
          end_week_id: fiscalDatesInfo.end_fw,
        };
      });
      const payload = {
        selectedHistoricValue: value,
        historicalDataFiscalWeek: fiscalDatesInfo,
        historicalDataFiscalWeekCompare: compareWithYear,
        predictedHistoricCompareWithMapping,
      };

      dispatch(setHistoricalFiscalData(payload));
      dispatch(setXaisStaticHistoricDates(data));
    } catch (error) {
    } finally {
      dispatch(setFullScreenLoaderCount(-1));
    }
  };

  return (
    <SelectContainer
      selectedOptions={matrixSummaryReducer?.selectedHistoricValue || []}
      label=""
      filter_keyword={""}
      is_multiple_selection={false}
      initialData={activeKey ? historicDataWeeks || [] : []}
      updateDependency={updateDependency}
      customClass={
        isCalledFromMFPDashboard
          ? selectStyleClasses.hideHistoricSelectContainer
          : selectStyleClasses.historicSelectContainer
      }
      isClearable
      customPlaceholder="See Historic View"
    />
  );
};

export default ShowHistoricDropDown;

const styles = () => ({
  historicSelectContainer: {
    width: "200px",
    margin: "0",
  },
  hideHistoricSelectContainer: {
    display: "none",
  },
});

const useSelectStyles = makeStyles(styles);
