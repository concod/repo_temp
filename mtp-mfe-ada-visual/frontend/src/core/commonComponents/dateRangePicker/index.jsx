import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import "react-dates/lib/css/_datepicker.css";
import "./react_dates_overrides.scss";
import { DateRangePicker } from "impact-ui-v3";
import moment from "moment";
import makeStyles from "@mui/styles/makeStyles";
import { DEFAULT_DATE_FORMAT, START_DATE, END_DATE } from "config/constants";
import { isNull } from "lodash";

const useStyles = makeStyles((theme) => ({
  monthYearDropDown: {
    display: "inline-flex",
  },
  styledSelect: {
    border: "none",
    margin: "0 0.5rem",
    outline: "none",
    ...theme.typography.subtitle1,
    fontWeight: 600,
  },
}));
/**
 *
 * @param {moment} startDate
 * @param {moment} endDate
 * @param {string} disableType
 * @returns year
 *
 * This function takes in start date, end date and disable type as parameters
 * and based on the disable type conditions, it will return the current year,
 * from the calendar rendering should start
 *
 * For ex: if the dates are past disabled, we will either start rendering the calendar from
 * the start date year or if start date is not mentioned, we will render from the present year
 * Similarly if we have future disabled, we will either end rendering the calendar from the
 * end date year or if end date is not mentioned, we will render till the present year
 */
const getCurrentYear = (startDate, endDate, disableType) => {
  //If it is past disabled and we have a valid start date
  if (
    disableType &&
    disableType?.includes("Past") &&
    moment(startDate).isValid()
  ) {
    return moment(startDate).year(); //return start date year
  }

  //If it is future disabled and we have a valid end date
  if (
    disableType &&
    disableType?.includes("Future") &&
    moment(endDate).isValid()
  ) {
    return moment(endDate).year(); //return end date year
  }

  return moment().year(); //else return present date year
};

const DateRangePickerComponent = (props) => {
  const classes = useStyles();
  let monthSelect = null;
  let yearSelect = null;
  let monthMoment = null;
  const [focusedInput, setfocusedInput] = useState(null);
  const [yearArray, setyearArray] = useState([moment().year()]);
  const [startDate, setStartDate] = useState(props.startDate);
  const [endDate, setEndDate] = useState(props.endDate);
  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (
      (startDate && props.startDate && startDate.diff(props.startDate)) ||
      (endDate && props.endDate && endDate.diff(props.endDate)) ||
      (!startDate && props.startDate) ||
      (!endDate && props.endDate)
    ) {
      setStartDate(props.startDate);
      setEndDate(props.endDate);
    } else if (
      isNull(props.startDate) &&
      isNull(props.endDate) &&
      !isNull(startDate) &&
      !isNull(endDate)
    ) {
      setStartDate(null);
      setEndDate(null);
    }
  }, [props.startDate, props.endDate]);

  const configureYear = () => {
    const startYear = props.startDate
      ? props.startDate.isBefore(props.startYear)
      : props.startYear;
    const currentYearBasedOnDate = getCurrentYear(
      startYear,
      props.endDate,
      props.disableType
    );

    let yearArr = [currentYearBasedOnDate];
    //till 2050, it will add all the years
    for (let i = 0; i < 2050 - currentYearBasedOnDate; i++) {
      if (props.disableType && props.disableType.includes("Future")) {
        yearArr.push(yearArr[i] - 1);
      } else {
        yearArr.push(yearArr[i] + 1);
      }
    }
    if (props.startYear) {
      // Start year from 2019 incase of cluster plan
      let startYear = props.startYear;
      let pastYearArray = [];
      while (startYear < yearArr[0]) {
        pastYearArray.push(startYear);
        startYear++;
      }
      yearArr.unshift(...pastYearArray);
    }
    const currentYear = moment().year();
    if (!yearArr.includes(currentYear)) {
      yearArr.unshift(currentYear);
    }
    setyearArray(yearArr);
  };

  const isOutsideRange = (day) => {
    switch (props.disableType) {
      case "disableOnlyPast":
        //disables strictly past i.e current/today's date is not included
        return Boolean(
          moment(day.format(DEFAULT_DATE_FORMAT)).isBefore(
            moment().format(DEFAULT_DATE_FORMAT)
          )
        );
      case "disablePast":
        //disables past i.e current/today's date is included
        return Boolean(
          moment(day.format(DEFAULT_DATE_FORMAT)).isSame(
            moment().format(DEFAULT_DATE_FORMAT),
            "days"
          ) ||
            moment(day.format(DEFAULT_DATE_FORMAT)).isBefore(
              moment().format(DEFAULT_DATE_FORMAT)
            )
        );
      case "disableOnlyFuture":
        //disables strictly future i.e current/today's date is not included
        return Boolean(
          moment(day.format(DEFAULT_DATE_FORMAT)).isAfter(
            moment().format(DEFAULT_DATE_FORMAT)
          )
        );
      case "disableFuture":
        //disables future i.e current/today's date is included
        return Boolean(
          moment(day.format(DEFAULT_DATE_FORMAT)).isSame(
            moment().format(DEFAULT_DATE_FORMAT),
            "days"
          ) ||
            moment(day.format(DEFAULT_DATE_FORMAT)).isAfter(
              moment().format(DEFAULT_DATE_FORMAT)
            )
        );
      case "customRange":
        //we can pass custom range which evaluates if the date to be disabled or not
        //For example: disabling specific dates or only fridays etc..
        return props.customOutsideRange(day);
      default:
        //By default, it doesn't disable any date
        return false;
    }
  };

  const dateRangeCalculator = async (startDate, endDate) => {
    /**
     * If the date selection is weekly, we keep start date as starting day of the week,
     * i.e if we select a day, we return the output as starting day in that week
     */
    let weekStart = props.weeklySelection
      ? moment(startDate).startOf("week")
      : startDate;

    /**
     * If we make the date selection as weekly
     * End date would be end of the week but if the end date
     * is outside the range i.e future including today, we set
     * enddate as one day prior to today i.e subtract 1 day from today
     * We also make sure if the endDate is either null or invalid, we don't check for outside range
     */
    const validEndDate =
      endDate &&
      endDate.isValid() &&
      isOutsideRange(moment(endDate).endOf("week"))
        ? moment().subtract(1, "days")
        : moment(endDate).endOf("week");

    let weekEnd = props.weeklySelection ? validEndDate : endDate;
    if (weekStart && !weekStart.isValid()) {
      weekStart = null;
    }
    if (weekEnd && !weekEnd.isValid()) {
      weekEnd = null;
    }
    //If we clear, both weekStart and weekEnd will become null
    //Then we shift the month and year to current date
    if (!weekStart && !weekEnd) {
      await setTimeout(() => {
        monthSelect && monthSelect(monthMoment, moment().month() + 2);
      }, 100);
      yearSelect && yearSelect(monthMoment, moment().year());
    }
    props.onDatesChange(weekStart, weekEnd);
  };

  const isDayBlocked = (date) => {
    if (focusedInput === "startDate") {
      return (
        props.enabledStartDays &&
        !props.enabledStartDays.includes(moment(date).format("dddd"))
      );
    }
    if (focusedInput === "endDate") {
      return (
        props.enabledEndDays &&
        !props.enabledEndDays.includes(moment(date).format("dddd"))
      );
    }
    return false;
  };
  useEffect(() => {
    configureYear();
  }, []);


  useEffect(() => {
    if (props.resetOptions) {
      setStartDate(null);
      setEndDate(null);
    }
  }, [props.resetOptions]);

  const defaultYears = useMemo(() => {
    const startYear = Number(START_DATE.split("-")[0]);
    const endYear = Number(END_DATE.split("-")[0]);

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => ({
      label: String(startYear + index),
      value: String(startYear + index),
    }));
  }, []); // Only calculate once

  const yearList = props?.customYears ?? defaultYears;

  useEffect(() => {
    if(props?.extra?.autoApplyDateRange && !reset) {
      dateRangeCalculator(startDate, endDate);
    }
  }, [startDate, endDate]);

  return (
    <div id={"dateRangePicker"}>
      <DateRangePicker
        label={props?.label || ""}
        placeholder={props?.placeholder || ""}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        startDate={startDate}
        endDate={endDate}
        isDisabled={props.disabled}
        showClearDates
        displayFormat={props.tenantDateFormat}
        startDateId={props.startDateId || "startDate"}
        endDateId={props.endDateId || "endDate"}
        withPortal={!props.noPortal}
        isOutsideRange={isOutsideRange}
        isDayBlocked={isDayBlocked}
        autoFocus
        showMonthYearSelect
        isRequired={props.isRequired}
        onPrimaryButtonClick={() => dateRangeCalculator(startDate, endDate)}
        onSecondaryButtonClick={() => {
          setStartDate(null);
          setEndDate(null);
        }}
        onResetClick={() => {
          setStartDate(null);
          setEndDate(null);
          setReset(true);
          dateRangeCalculator(null, null);
          setTimeout(() => setReset(false), 0); 
        }}
        customYears={yearList}
        hideKeyboardShortcutsPanel
        enabledStartDays={props.enabledStartDays}
        enabledEndDays={props.enabledEndDays}
        handleStartDateFocus={() => setfocusedInput("startDate")}
        handleEndDateFocus={() => setfocusedInput("endDate")}
        isAgGridCellRenderer={props?.isAgGridCellRenderer}
        labelOrientation={props?.labelOrientation || "top"}
      />
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
  };
};

export default connect(mapStateToProps, null)(DateRangePickerComponent);
