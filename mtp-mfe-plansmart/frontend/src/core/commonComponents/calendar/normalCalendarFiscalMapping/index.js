import React, { useState, useEffect } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import moment from "moment";
import { DateRangePicker } from "react-dates";
import colours from "core/Styles/colours";
import "./style.scss";
import { isEmpty } from "lodash";
import { formatMomentDate, formatStringDate } from "core/Utils/functions/utils";

const NormalCalendarFiscalMapping = (props) => {
  const [focusedInput, setFocusedInput] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const startDayOfWeek = moment().startOf("week");

  const isBeforeDay = (initialDate, newDate) => {
    if (!moment.isMoment(initialDate) || !moment.isMoment(newDate))
      return false;

    const initialDateYear = initialDate.year();
    const initialDateMonth = initialDate.month();

    const newDateYear = newDate.year();
    const newDateMonth = newDate.month();

    const isSameYear = initialDateYear === newDateYear;
    const isSameMonth = initialDateMonth === newDateMonth;

    if (isSameYear && isSameMonth) return initialDate.date() < newDate.date();
    if (isSameYear) return initialDateMonth < newDateMonth;
    return initialDateYear < newDateYear;
  };

  const isInclusivelyAfterDay = (initialDate, newDate) => {
    if (!moment.isMoment(initialDate) || !moment.isMoment(newDate))
      return false;
    return !isBeforeDay(initialDate, newDate);
  };

  /** To update initial value on component mount we check if these conditions satisfy to update the date values */
  const canUpdateDate = () => {
    return (
      props.selectedDate?.fiscalInfoStartDate &&
      props.selectedDate?.fiscalInfoEndDate &&
      !startDate &&
      !endDate
    );
  };

  const setDateChange = (startDate, endDate) => {
    let fiscalInfoStartDate = null;
    let fiscalInfoEndDate = null;

    if (!startDate || !endDate) {
      return props.onDateChange({
        fiscalInfoStartDate,
        fiscalInfoEndDate,
      });
    }

    let formattedEndDate = formatMomentDate(endDate);

    let endDateStartWeek = moment(formattedEndDate)?.startOf("week");
    props?.fiscalCalendarData?.forEach((fiscalDate) => {
      if (
        formatStringDate(fiscalDate?.calendar_week_start_date, true) ===
        formatMomentDate(startDate)
      ) {
        fiscalInfoStartDate = fiscalDate;
      }
      if (
        formatStringDate(fiscalDate?.calendar_week_start_date, true) ===
        formatMomentDate(endDateStartWeek)
      ) {
        fiscalInfoEndDate = fiscalDate;
      }
    });

    props.onDateChange({
      fiscalInfoStartDate,
      fiscalInfoEndDate,
    });
  };

  const handleDateChange = ({ startDate, endDate }) => {
    setStartDate(startDate);
    setEndDate(endDate);

    if (!props.setValueOnBlur) {
      setDateChange(startDate, endDate);
    }
  };

  const handleFocusChange = (focusedInput) => {
    setFocusedInput(focusedInput === "endDate" ? "startDate" : focusedInput);
  };

  useEffect(() => {
    if (!isEmpty(props.selectedDate) && canUpdateDate()) {
      setStartDate(
        formatStringDate(
          props.selectedDate?.fiscalInfoStartDate?.calendar_week_start_date,
          true,
          true
        )
      );
      setEndDate(
        formatStringDate(
          props.selectedDate?.fiscalInfoEndDate?.calendar_week_start_date,
          true,
          true
        ).endOf("week")
      );
    }

    if (props.resetOptions && props.selectedDate === undefined) {
      setStartDate(null);
      setEndDate(null);
    }
  }, [props.selectedDate]);

  useEffect(() => {
    if (endDate && !focusedInput && props.setValueOnBlur) {
      setDateChange(startDate, endDate);
    }
  }, [focusedInput]);

  const renderDayContents = (momentInstance, modifiers) => {
    let currentWeek = null;
    if (modifiers.has("first-day-of-week")) {
      currentWeek = props?.fiscalCalendarData?.find((fiscalDate) => {
        return (
          formatStringDate(fiscalDate?.calendar_week_start_date, true) ===
          formatMomentDate(momentInstance)
        );
      });
    }

    return (
      <>
        <span className="CalendarDayNumber">{momentInstance.format("D")}</span>
        {/* Add week numbers, adds one button each row */}
        {currentWeek && modifiers.has("first-day-of-week") && (
          <span className="CalendarDayWeekNumber">
            {String(currentWeek?.fiscal_year_week)?.slice(-2) || null}
          </span>
        )}
      </>
    );
  };

  return (
    <div
      className={`fiscal-calendar__wrapper ${
        props.displayRow && "date-range-wrapper-row"
      }`}
    >
      {props.showDefaultLabel && (
        <p
          className={
            props.displayRow ? "date-range-label-row" : "date-range-label"
          }
        >
          Date Range{" "}
          {props.isMandatory && <span style={{ color: colours.jaffa }}>*</span>}
        </p>
      )}

      <DateRangePicker
        readOnly
        isOutsideRange={
          props.isOutsideRange
            ? props.isOutsideRange
            : (day) => {
                if (props.disablePastWeeks)
                  return !isInclusivelyAfterDay(day, startDayOfWeek);
                else if (props.disableFutureWeeks)
                  return isInclusivelyAfterDay(day, startDayOfWeek);
                else return null;
              }
        }
        id={props.uniqueInputId}
        displayFormat={() => "MM-DD-YYYY"}
        disabled={props.disabled}
        startDate={startDate}
        endDate={endDate}
        daySize={40}
        navPrev={<ChevronLeftIcon />}
        navNext={<ChevronRightIcon />}
        keepOpenOnDateSelect
        endDateId="endDate"
        focusedInput={focusedInput}
        onDatesChange={handleDateChange}
        onFocusChange={handleFocusChange}
        startDateId="startDate"
        small
        showDefaultInputIcon
        showClearDates={
          props.showClearDates === undefined ? true : props.showClearDates
        }
        startDateOffset={(day) => {
          let days = day.diff(startDate, "days");
          if (startDate && days > 0 && !props.maxOneWeekSelection) {
            return startDate.startOf("week");
          }
          return day.startOf("week");
        }}
        endDateOffset={(day) => {
          return day.endOf("week");
        }}
        renderDayContents={(...renderDayContentsProps) =>
          renderDayContents(...renderDayContentsProps)
        }
      />
    </div>
  );
};

export default NormalCalendarFiscalMapping;
