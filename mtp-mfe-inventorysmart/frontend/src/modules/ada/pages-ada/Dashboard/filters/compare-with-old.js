import { useEffect, useState } from "react";
import {
  setHistoricActuals,
  // getHistoricYears,
  setCompareWithSelectedDate,
  setIsCompareWithDropdown,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { useDispatch, useSelector } from "react-redux";
import {
  configureYearOptions,
  handleCompareBtnClick,
} from "modules/ada/utils-ada/utilityFunctions";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { formatStringDate } from "core/Utils/functions/utils";
import { isNumber } from "lodash";
import { RadioButtonGroup } from "impact-ui-v3";

const CompareWithOld = ({
  selectedDate,
  savedCompareWith,
  isRedirectedFromADAtoMFP,
}) => {
  const [historicYears, setHistoricYears] = useState([]);
  const [dropDownSelectYear, setDropDownSelectYear] = useState([]);
  const [fiscalDates, setFiscalDates] = useState({});
  const [compareSelectedDate, setCompareSelectedDate] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loaderCount, setLoaderCount] = useState(0);
  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    const dates = {
      start_fw: selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
      end_fw: selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
      start_date: formatStringDate(
        selectedDate?.fiscalInfoStartDate?.calendar_week_start_date,
        true
      ),
      end_date: formatStringDate(
        selectedDate?.fiscalInfoEndDate?.calendar_week_start_date,
        true
      ),
      selectedDate: selectedDate,
    };
    setFiscalDates(dates);
  }, [selectedDate]);

  const fiscalCalendarDetails = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.fiscalCalendarDetails
  );
  useEffect(() => {
    if (
      !adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
        ?.dashboard?.compareWith?.showYearsDropdown
    ) {
      return;
    }
    const getyearslist = (year) => {
      let yearsLength = 4;

      if (
        isNumber(
          adaDashboardReducer?.clientConfig?.attribute_value
            ?.compare_with_no_of_fiscal_year
        )
      ) {
        yearsLength =
          adaDashboardReducer?.clientConfig?.attribute_value
            ?.compare_with_no_of_fiscal_year;
      }

      let list = [];
      while (yearsLength > 0) {
        list.push(year);
        year--;
        yearsLength--;
      }
      list = list.reverse();
      return configureYearOptions(list);
    };
    const getYears = async () => {
      try {
        setLoaderCount((prev) => prev + 1);

        const currYear =
          parseInt(
            selectedDate?.fiscalInfoEndDate?.fiscal_year_week
              .toString()
              .substring(0, 4)
          ) - 1;
        if (currYear) {
          const yearsList = getyearslist(currYear);
          setHistoricYears(yearsList);
        }
      } catch (error) {
        // errorHandler(dispatch, error);
      } finally {
        setLoaderCount((prev) => prev - 1);
      }
    };
    getYears();
  }, [selectedDate]);

  const dispatch = useDispatch();

  useEffect(() => {
    setCompareSelectedDate([]);
    setDropDownSelectYear([]);
  }, [fiscalDates]);

  // Select compare with by default, if saved filters exist, checked if saved compare with is still valid,
  // If Yes, then select saved filter by default else select Last year by default
  // savedCompareWith has two values in array, first one is last saved compare with and
  //  the second one is if value was saved as dropdown value or Buttons i.e. Last year and Last to Last year
  useEffect(() => {
    if (fiscalDates?.end_fw) {
      let savedCompareYear = savedCompareWith?.[0]?.[0]?.value;
      let historicYearValues = historicYears?.map((elem) => elem?.value);
      if (
        savedCompareWith?.length &&
        historicYearValues?.includes(savedCompareYear)
      ) {
        if (!savedCompareWith?.[1]) {
          let comparisonYear = savedCompareYear;
          let lastYear = handleCompareBtnClick(fiscalDates?.end_fw, 1)?.value;

          if (+comparisonYear === +lastYear) {
            setCompareSelectedDate([handleCompareBtnClick(comparisonYear, 0)]);
            getFiscalCompareWith([handleCompareBtnClick(comparisonYear, 0)]);
          } else {
            setCompareSelectedDate([handleCompareBtnClick(comparisonYear, 0)]);
            getFiscalCompareWith([handleCompareBtnClick(comparisonYear, 0)]);
          }
          // getFiscalCompareWith(savedCompareWith?.[0]);
        } else {
          setDropDownSelectYear(savedCompareWith?.[0]);
          getFiscalCompareWith(savedCompareWith?.[0], true);
        }
      } else {
        if (isRedirectedFromADAtoMFP) {
          getFiscalCompareWith(
            adaDashboardReducer?.compareSelectedDate,
            adaDashboardReducer?.setIsCompareWithDropdown
          );
        } else {
          setCompareSelectedDate([
            handleCompareBtnClick(fiscalDates?.end_fw, 1),
          ]);
          getFiscalCompareWith([handleCompareBtnClick(fiscalDates?.end_fw, 1)]);
        }
      }
    }
  }, [fiscalDates, savedCompareWith, historicYears?.length]);

  const getCompareWithOptions = () => {
    const compareWithOptions =
      adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
        ?.dashboard?.compareWith?.labels;

    return compareWithOptions.map((option) => ({
      label: option.label,
      value: option.value,
      id: handleCompareBtnClick(fiscalDates?.end_fw, option.value)?.value,
    }));
  };

  const getSelectedOption = () => {
    const compareWithOptions = getCompareWithOptions();
    if (compareSelectedDate) {
      let value = compareWithOptions.find(
        (option) => option.id == compareSelectedDate?.[0]?.id
      )?.value;
      return value;
    }
  };

  useEffect(() => {
    if (compareSelectedDate?.length) {
      setSelectedOption(getSelectedOption());
    }
  }, [compareSelectedDate]);

  const updateDependency = async (_, value, isDropdown = false) => {
    console.log("value", value, isDropdown);
    if (!isDropdown) {
      setCompareSelectedDate(value);
      setDropDownSelectYear([]);
    } else {
      setCompareSelectedDate([]);
      setDropDownSelectYear(value);
      setSelectedOption(null);
    }

    getFiscalCompareWith(value, isDropdown);
  };

  const getFiscalCompareWith = async (selectedDate, isDropdown) => {
    const payload = selectedDate.map(({ value }) => ({
      year: Number(value),
      start_week_id: fiscalDates?.start_fw,
      end_week_id: fiscalDates?.end_fw,
      complete_year: false,
    }));
    console.log(
      payload,
      "🚀 ~ getFiscalCompareWith ~ selectedDate:",
      selectedDate
    );
    dispatch(setHistoricActuals(payload));
    dispatch(setCompareWithSelectedDate(selectedDate));
    dispatch(setIsCompareWithDropdown(isDropdown));
  };

  if (!fiscalDates?.end_fw) {
    return <p>Select TimeLine to select compare with</p>;
  }
  // commenting this as we are using radio button group instead of tabs
  // const tabPanel = (
  //   <div
  //     className={classNames(
  //       classes.compareWithContainer,
  //       globalClasses.flexRow,
  //       globalClasses.layoutAlignBetweenCenter
  //     )}
  //   >
  //     <div className={classes.compareButtonContainer}>
  //       {adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard?.compareWith?.labels?.map(
  //         (btn) => {
  //           return (
  //             <ComapareWithButton
  //               btnText={btn?.label}
  //               currYear={handleCompareBtnClick(
  //                 fiscalDates?.end_fw,
  //                 btn?.value
  //               )}
  //               selected={compareSelectedDate}
  //               updateDependency={updateDependency}
  //             />
  //           );
  //         }
  //       )}

  //       {adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
  //         ?.dashboard?.compareWith?.showYearsDropdown && (
  //         <span className={classes.separator}>or</span>
  //       )}
  //     </div>
  //     {!!fiscalCalendarDetails?.length &&
  //       adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
  //         ?.dashboard?.compareWith?.showYearsDropdown && (
  //         <SelectContainer
  //           is_multiple_selection
  //           customClass={classes.selectContainer}
  //           label="Select Fiscal Year"
  //           selectAllLabel="Fiscal Year"
  //           initialData={historicYears}
  //           updateDependency={(_, value) => updateDependency(_, value, true)}
  //           selectedOptions={dropDownSelectYear}
  //         />
  //       )}
  //   </div>
  // );

  // const COMPARE_WITH_CONSTANTS = [
  //   {
  //     id: "Historic Actuals",
  //     label: "Historic Actuals",
  //     TabPanel: tabPanel,
  //   },
  //   // { value: "Plan", label: "Plan", disabled: true },
  //   // { value: "Similar styles", label: "Similar styles", disabled: true },
  // ];

  const handleCompareWithChange = (e) => {
    const currYear = handleCompareBtnClick(fiscalDates?.end_fw, e.target.value);
    // keeping currYear in array, such that years dropdown & button work with same handler fn
    updateDependency(null, [currYear]);
  };

  return (
    <LoadingOverlay loader={loaderCount}>
      <div className={classes.compareWithContainer}>
        <p className={classes.compareWithLabel}>Historic Actuals</p>

        <div className={classes.compareWithOptionsContainer}>
          <RadioButtonGroup
            orientation="row"
            name="ia-test-radio-group"
            onChange={handleCompareWithChange}
            options={getCompareWithOptions()}
            selectedOption={selectedOption}
          />
          {adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.compareWith?.showYearsDropdown && (
            <span className={classes.separator}>Or</span>
          )}
          {!!fiscalCalendarDetails?.length &&
            adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
              ?.dashboard?.compareWith?.showYearsDropdown && (
              <SelectContainer
                is_multiple_selection
                customClass={classes.selectContainer}
                label="Select Fiscal Year"
                selectAllLabel="Fiscal Year"
                initialData={historicYears}
                updateDependency={(_, value) =>
                  updateDependency(_, value, true)
                }
                selectedOptions={dropDownSelectYear}
              />
            )}
        </div>
      </div>
    </LoadingOverlay>
  );
};

export default CompareWithOld;

const useStyles = makeStyles((theme) => ({
  compareWithContainer: {
    justifyContent: "flex-start",
  },
  compareWithOptionsContainer: {
    display: "flex",
    alignItems: "center",
  },
  compareWithLabel: {
    color: "#0D152C",
    fontSize: "1rem",
    fontWeight: "800",
    lineHeight: "1.5rem",
    marginRight: "0.75rem",
  },
  compareButtonContainer: {
    paddingTop: "0.7rem",
  },
  selectContainer: {
    marginLeft: "2rem",
    "& > label": {
      display: "none",
    },
    position: "relative",
    transform: "translateY(-15px)",
  },
  separator: {
    color: "0D152C",
  },
}));
