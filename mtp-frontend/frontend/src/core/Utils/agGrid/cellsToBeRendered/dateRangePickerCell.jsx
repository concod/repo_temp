import React, { useState, useEffect } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { DateRangePicker } from "react-dates";
import { isEmpty } from "lodash";
import { formatStringDate } from "core/Utils/functions/utils";
import { Button } from "@mui/material";

const DateRangePickerCell = (props) => {
  const [focusedInput, setFocusedInput] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  /** To update initial value on component mount we check if these conditions satisfy to update the date values */
  const canUpdateDate = () => {
    return (
      props.selectedDate?.fiscalInfoStartDate &&
      props.selectedDate?.fiscalInfoEndDate &&
      !startDate &&
      !endDate
    );
  };

  const handleDateChange = ({ startDate, endDate }) => {
    setStartDate(startDate);
    setEndDate(endDate);
    if (startDate || endDate) {
      return props.onDateChange({
        fiscalInfoStartDate: startDate,
        fiscalInfoEndDate: endDate,
      });
    }
  };

  const handleFocusChange = (focusedInput) => {
    setFocusedInput(focusedInput);
  };

  useEffect(() => {
    if (!isEmpty(props.selectedDate) && canUpdateDate()) {
      if (props.anyDayOfWeekAllowed) {
        setStartDate(
          formatStringDate(props.selectedDate?.fiscalInfoStartDate, false, true)
        );
        setEndDate(
          formatStringDate(props.selectedDate?.fiscalInfoEndDate, false, true)
        );
      }
    }
    if (props.resetOptions && props.selectedDate === undefined) {
      setStartDate(null);
      setEndDate(null);
    }
  }, [props.selectedDate]);

  const renderControls = () => {
    return (
      <section className="fiscal-calendar__calendar-controls">
        <Button onClick={clearDateSelection}>Clear</Button>
        <Button onClick={setDateSelection}>Apply</Button>
      </section>
    );
  };

  const clearDateSelection = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const setDateSelection = () => {};

  return (
    <div
      className={`fiscal-calendar__wrapper ${
        props.displayRow && "date-range-wrapper-row"
      }`}
    >
      <DateRangePicker
        readOnly
        displayFormat={() => props.tenantDateFormat}
        disabled={props.disabled}
        startDate={startDate}
        endDate={endDate}
        daySize={40}
        navPrev={<ChevronLeftIcon />}
        navNext={<ChevronRightIcon />}
        keepOpenOnDateSelect={
          props.keepOpenOnDateSelect === undefined
            ? true
            : props.keepOpenOnDateSelect
        }
        endDateId="endDate"
        focusedInput={focusedInput}
        onDatesChange={handleDateChange}
        onFocusChange={handleFocusChange}
        startDateId="startDate"
        small
        withPortal={props.withPortal}
        showDefaultInputIcon
        showClearDates={
          props.showClearDates === undefined ? true : props.showClearDates
        }
        renderCalendarInfo={renderControls}
      />
    </div>
  );
};

export default DateRangePickerCell;
