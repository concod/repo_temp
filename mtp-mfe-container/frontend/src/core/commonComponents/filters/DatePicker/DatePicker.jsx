import { useEffect, useState, useMemo, useRef } from "react";
import { DatePicker } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment";
import { isOutsideRange } from "core/Utils/DatePicker/DatePickerUtils";
import { useSelector } from "react-redux";
import "./DatePicker.scss";
import { START_DATE, END_DATE } from "config/constants";
import { AG_FORM_END_DATE } from "./contants";
const useStyles = makeStyles((theme) => ({
  rangePicker: {
    "& .CalendarDay": {
      border: "none",
    },
  },
}));

const DatePickerWrapper = (props) => {
  const [selectedDate, setSelectedDate] = useState(
    props.selectedDate ? moment(props.selectedDate) : null
  );
  const [previousSelectedDate, setPreviousSelectedDate] = useState(props.selectedDate ? moment(props.selectedDate) : null);
  const dateState = useRef({
    clearState: null,
  });

  const tenantDateFormat = useSelector(
    (state) =>
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantDateFormat
  );

  const currentDate = moment();

  const classes = useStyles();

  useEffect(() => {
    const newDate = props.selectedDate ? moment(props.selectedDate) : null;
    setSelectedDate(newDate);
  }, [props.selectedDate]);

  const defaultYears = useMemo(() => {
    const startYear = Number(START_DATE.split("-")[0]);
    const endYear = props?.suppressCustomYears
      ? Number(AG_FORM_END_DATE.split("-")[0]) // custom year limit for table search
      : Number(END_DATE.split("-")[0]);

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => ({
      label: String(startYear + index),
      value: String(startYear + index),
    }));
  }, []); // Only calculate once

  const yearList = props?.customYears ?? defaultYears;

  return (
    <div className={classes.rangePicker}>
      <DatePicker
        label={props.label || null}
        isDisabled={props.isDisabled}
        placeholder={props.placeholder}
        onPrimaryButtonClick={() => {
          setPreviousSelectedDate(selectedDate);
          props.onPrimaryButtonClick(selectedDate);
        }}
        onSecondaryButtonClick={() => {
          setSelectedDate(previousSelectedDate);
        }}
        onTertiaryButtonClick={() => {
          setPreviousSelectedDate(null);
          setSelectedDate(null);
          dateState.current.clearState = true;
        }}
        onClickOutside={() => {
          if (!dateState.current.clearState) {
            setSelectedDate(previousSelectedDate);
          }
          dateState.current.clearState = null;
        }}
        selectedDate={selectedDate}
        setSelectedDate={(date) => setSelectedDate(date)}
        isError={props.isError}
        displayFormat={tenantDateFormat}
        isRequired={props.isRequired}
        showMonthYearSelect
        disableHighlightToday={props.disableHighlightToday}
        clearable={props.clearable}
        helperText={props.helperText}
        minDate={props.minDate}
        maxDate={props.maxDate || (props.disableFuture ? new Date() : null)}
        isOutsideRange={(day) => {
          // Check if day is outside minDate/maxDate range
          const isBeforeMinDate =
            props.minDate && day.isBefore(moment(props.minDate), "day");
          const isAfterMaxDate =
            props.maxDate && day.isAfter(moment(props.maxDate), "day");

          return (
            isOutsideRange(
              day,
              currentDate,
              props.disablePast,
              props.disableFuture,
              props?.disableOnlyPast
            ) ||
            props.isOutsideRange(day) ||
            isBeforeMinDate ||
            isAfterMaxDate
          );
        }}
        customYears={yearList}
        labelOrientation={props?.labelOrientation || "top"}
        withPortal={props?.withPortal || false}
        hideTertiaryButton={props.hideTertiaryButton}
      />
    </div>
  );
};

export default DatePickerWrapper;
