import { useEffect, useState } from "react";
import { connect } from "react-redux";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "./react_dates_overrides.scss";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import {
  DateRangePicker,
  isInclusivelyBeforeDay,
  isInclusivelyAfterDay,
} from "react-dates";
import moment from "moment";
import makeStyles from "@mui/styles/makeStyles";
import { DEFAULT_DATE_FORMAT } from "config/constants";
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
  rangePicker: {
    "& .DateRangePickerInput__withBorder": {
      border: `1px solid ${theme.palette.colours.dropdownBorder}`,
      borderRadius: "0.25rem",
      '&:hover': {
        borderColor: theme.palette.primary.main,
      },
      '&:focus': {
        borderColor: theme.palette.primary.main,
        boxShadow: "0 0 0 3px #E5EDF7",
      },
    },
    "& .DateInput_input": {
      fontSize: theme.typography.pxToRem(14),
      color: theme.palette.text.primary,
      padding: "0.5rem"
    }
  }
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

  const configureYear = () => {
    const startYear = props.startDate
      ? props.startDate.isBefore(props.startYear)
      : props.startYear;
    const currentYear = getCurrentYear(
      startYear,
      props.endDate,
      props.disableType
    );
    let yearArr = [
      props.enablePreviousyearCount > 0
        ? currentYear - props.enablePreviousyearCount
        : currentYear,
    ];
    //till 2050, it will add all the years
    for (let i = 0; i < 2050 - currentYear; i++) {
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
    setyearArray(yearArr);
  };

  // To be removed once verified throughout
  // const checkStartEndRanges = (day) => {
  //   /**
  //    * This method checks what dates to disable along with the PAST/FUTURE disabled conditions
  //    * Once you select start date and end date, dates before of start date and dates after end
  //    * date would be disabled
  //    */
  //   if (props.startDate && props.endDate) {
  //     return (
  //       !isInclusivelyBeforeDay(day, props.endDate) ||
  //       !isInclusivelyAfterDay(day, props.startDate)
  //     );
  //   }
  //   if (props.startDate) {
  //     return !isInclusivelyAfterDay(day, props.startDate);
  //   }
  //   if (props.endDate) {
  //     return !isInclusivelyBeforeDay(day, props.endDate);
  //   }
  //   return false;
  // };
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
        return props.customOutsideRange();
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

  return (
    <div id={"dateRangePicker"} className={classes.rangePicker}>
      <DateRangePicker
        showClearDates
        startDateId={props.startDateId || "startDate"}
        endDateId={props.endDateId || "endDate"}
        startDate={props.startDate}
        endDate={props.endDate}
        withPortal={!props.noPortal}
        small
        daySize={40}
        navPrev={<ChevronLeftIcon />}
        navNext={<ChevronRightIcon />}
        autoFocus
        preventScroll
        displayFormat={props.tenantDateFormat}
        onDatesChange={({ startDate, endDate }) => {
          dateRangeCalculator(startDate, endDate);
        }}
        // this prop allows user to select both start and end date as same date
        minimumNights={0}
        onClose={props.onClose}
        focusedInput={
          props?.focusInputThroughProp ? props.focusedInput : focusedInput
        }
        onFocusChange={
          props?.focusInputThroughProp
            ? (focusedInp) => props.onFocusChange(focusedInp)
            : (focusedInp) => {
                setfocusedInput(focusedInp);
              }
        }
        onNextMonthClick={(e) => (monthMoment = e)}
        onPrevMonthClick={(e) => (monthMoment = e)}
        disabled={props.disabled}
        isOutsideRange={isOutsideRange}
        isDayBlocked={isDayBlocked}
        showDefaultInputIcon
        hideKeyboardShortcutsPanel
        numberOfMonths={props.numberOfMonths || 2} //default number of months is 2 else it can be passed from props
        renderMonthElement={function noRefCheck({
          month,
          onMonthSelect,
          onYearSelect,
        }) {
          //Assign the functions and month/year select functions to variable
          monthSelect = onMonthSelect;
          yearSelect = onYearSelect;
          monthMoment = month;
          return (
            <div className={classes.monthYearDropDown}>
              {yearArray.length ? (
                <>
                  <div>
                    <select
                      value={month.month()}
                      onChange={(e) => onMonthSelect(month, e.target.value)}
                      className={classes.styledSelect}
                    >
                      {moment.months().map((label, value) => (
                        <option value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={month.year()}
                      onChange={(e) => onYearSelect(month, e.target.value)}
                      className={classes.styledSelect}
                    >
                      {yearArray.map((item) => (
                        <option value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div />
              )}
            </div>
          );
        }}
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