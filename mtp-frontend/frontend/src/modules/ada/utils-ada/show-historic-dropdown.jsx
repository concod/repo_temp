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
  setHistoricActualsFiscalWeeks,
} from "../services-ada/ada-dashboard/ada-dashboard-services";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import moment from "moment";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  DEFAULT_WEEK,
  currentHistoricDates,
  handleCompareBtnClick,
} from "./utilityFunctions";
import {
  getHistoricActuals,
  getHistoricActualsFiscalWeeks,
  getHistoricPredictedData,
} from "./formatData";

const ShowHistoricDropDown = ({
  activeKey,
  pastYear,
  isCalledFromMFPDashboard,
}) => {
  const [historicDataWeeks, setHistoricDataWeeks] = useState([]);

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const fiscalCalendarData = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.fiscalCalendarDetails
  );

  const selectStyleClasses = useSelectStyles();
  const dispatch = useDispatch();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const compareOnSave = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer.compareSave
  );
  const switchTimeLine = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.switchTimeLine
  );
  const selectedHistoricValue = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.selectedHistoricValue
  );
  useEffect(() => {
    if (!adaReducer?.predictedFiscalWeeks?.length) return;

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
            adaReducer?.clientConfig?.attribute_value?.attribute_value
              ?.dashboard?.defaultHistoricWeek;

          let defaultHistoricWeekData = historicData.find(
            (elem) => elem.value === defaultHistoricWeek
          );

          // if defaultHistoricWeek of client config is available in the historicData,
          // then proceed to show default historic data

          if (defaultHistoricWeekData) {
            preparePayload(defaultHistoricWeekData);
          } else {
            const onClearPayload = {
              selectedHistoricValue: [],
              historicalDataFiscalWeek: {},
              historicalDataFiscalWeekCompare: {},
              isSnapshotResponseFetched: true,
            };

            dispatch(setHistoricalFiscalData(onClearPayload));
          }
          // if (defaultHistoricWeekData && !compareOnSave) {
          //   updateDependency(null, [defaultHistoricWeekData]);
          // }

          // if (compareOnSave && selectedHistoricValue) {
          //   updateDependency(null, selectedHistoricValue);
          // }
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
  }, [adaReducer?.predictedFiscalWeeks?.length]);

  const preparePayload = (selectedWeeks) => {
    let [
      historicStartWeekId,
      historicEndWeekId,
    ] = getHistoricActualsFiscalWeeks(
      adaReducer,
      selectedWeeks?.snapshot_week,
      selectedWeeks?.value
      // true
    );

    dispatch(setGraphKPIWeeks(selectedWeeks));

    let [
      predictedHistoricCompareWithMapping,
      past_years,
    ] = getpredictedHistoricCompareWithMapping(
      adaReducer,
      String(historicEndWeekId)?.slice(0, 4),
      adaReducer?.predictedFiscalWeeks[
        adaReducer?.predictedFiscalWeeks?.length - 1
      ]
    );

    const compareWithYear = past_years?.map((elem) => {
      return {
        year: elem,
        start_week_id: historicStartWeekId,
        end_week_id: historicEndWeekId,
      };
    });
    const payload = {
      selectedHistoricValue: [selectedWeeks],
      historicalDataFiscalWeek: {
        end_fw: historicEndWeekId,
        start_fw: historicStartWeekId,
      },
      historicalDataFiscalWeekCompare: compareWithYear,
      predictedHistoricCompareWithMapping,
      isSnapshotResponseFetched: true,
    };

    dispatch(setHistoricalFiscalData(payload));

    // dispatch(setHistoricalFiscalData(payload));
  };

  const getpredictedHistoricCompareWithMapping = (
    adaReducer,
    historicViewEndYear,
    predictedWeekEndFiscalWeek
  ) => {
    let predictedHistoricCompareWithMapping = {};

    let past_years = [];
    // let historicViewEndYear = +String(fiscalDatesInfo.end_fw)?.slice(0, 4);

    // If compare with is selected via dropdown and predicted year and historic data of "See Historic View"
    // dropdown year does not fall in same year then in order to form correct payload to see the correct data
    // we need substract 1 from each year selected from "Compare with" dropdown
    if (adaReducer?.isCompareWithDropdown) {
      let selectedCompareWith = adaReducer?.compareWithSelectedDate?.map(
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
      let lastYear = handleCompareBtnClick(predictedWeekEndFiscalWeek, 1);
      let lastToLastYear = handleCompareBtnClick(predictedWeekEndFiscalWeek, 2);
      let comparisonYear = adaReducer?.compareWithSelectedDate?.[0]?.value;
      let historicCompareWith = null;
      if (
        !adaReducer?.isCompareWithDropdown &&
        comparisonYear === lastYear?.value
      ) {
        historicCompareWith = historicViewEndYear - 1;
      }
      if (
        !adaReducer?.isCompareWithDropdown &&
        comparisonYear === lastToLastYear?.value
      ) {
        historicCompareWith = historicViewEndYear - 2;
      }
      past_years.push(historicCompareWith);

      let currFormattedYear = adaReducer?.compareWithSelectedDate?.[0]?.value;

      predictedHistoricCompareWithMapping[
        currFormattedYear
      ] = historicCompareWith;
    }
    return [predictedHistoricCompareWithMapping, past_years];
  };

  const updateDependency = async (_, value) => {
    const onClearPayload = {
      selectedHistoricValue: [],
      historicalDataFiscalWeek: {},
      historicalDataFiscalWeekCompare: {},
    };

    if (!value?.length) {
      dispatch(setHistoricActualsFiscalWeeks([]));

      dispatch(setXaisStaticHistoricDates({}));
      dispatch(setGraphKPIWeeks(DEFAULT_WEEK));
      return dispatch(setHistoricalFiscalData(onClearPayload));
    }

    try {
      // dispatch(setFullScreenLoaderCount(1));
      // dispatch(setGraphKPIWeeks(value[0]));
      preparePayload(value[0]);

      getHistoricPredictedData(
        adaReducer,
        value[0]?.snapshot_week,
        value[0]?.value,
        dispatch
      );

      getHistoricActuals(
        adaReducer,
        value[0]?.snapshot_week,
        value[0]?.value,
        dispatch,
        adaForecastMultiplierReducer
      );

      // dispatch(setXaisStaticHistoricDates(data));
    } catch (error) {
    } finally {
      dispatch(setFullScreenLoaderCount(-1));
    }
  };

  return (
    <SelectContainer
      selectedOptions={adaReducer?.selectedHistoricValue || []}
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
