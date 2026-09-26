import React from "react";
import moment from "moment";

import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";

import { calendarConfig } from "config";
import { validateDateRange } from "../../inventorysmart-utility";

const { fstDayOfWk } = calendarConfig;
moment.updateLocale("en", {
  week: {
    dow: fstDayOfWk,
  },
});

const Calendar = (props) => {
  /** Adding logic for date validation if needed in any screen */
  const handleDateChange = async (val) => {
    if (props.restrictFutureDatesSelection) {
      const dateRange = validateDateRange(val, true);
      if (dateRange.isValid) {
        props.setSelectedDates(val);
      } else {
        /** Setting default dates to throw error when applier invalid dates or date out of range in case past or future dates restrictions */
        props.setSelectedDates({
          fiscalInfoStartDate: null,
          fiscalInfoEndDate: null,
        });
        props.displaySnackMessages(dateRange.error, "error");
      }
    } else {
      props.setSelectedDates(val);
    }
  };

  return (
    <>
      <NormalCalendarFiscalMapping
        selectedDate={props.selectedDates}
        onDateChange={handleDateChange}
        isMandatory={props.isMandatory || false}
        fiscalCalendarData={props.fiscalCalendarDetails}
        displayRow={props.displayRow}
        maxOneWeekSelection={props.maxOneWeekSelection}
        setValueOnBlur={props.setValueOnBlur}
      />
    </>
  );
};

export default Calendar;
