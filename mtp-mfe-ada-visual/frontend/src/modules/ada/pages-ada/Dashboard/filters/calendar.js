import React from "react";
import { useSelector } from "react-redux";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import moment from "moment";

const Calendar = ({ onDateChange, selectedDate }) => {
  const fiscalCalendarData = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.fiscalCalendarDetails
  );

  const dateRangeFilterConfig = useSelector(
    (store) =>
      store?.adaReducer?.adaDashboardReducer?.clientConfig?.attribute_value
        ?.date_range_filter
  );

  const dateRangeModuleConfig = useSelector(
    (store) =>
      store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
        ?.max_weeks
  );
  const dateFilterFormat = useSelector(
    (store) =>
      store?.adaReducer?.adaDashboardReducer?.clientConfig?.attribute_value
        ?.dateFilterFormat
  );

  const isOutsideRange = (date) => {
    try {
      let weekStartDay = moment().startOf("week");
      let daysCount =
        (dateRangeModuleConfig
          ? dateRangeModuleConfig
          : dateRangeFilterConfig?.outside_range_week_count) * 7;

      const lastWeekSelection = moment()
        .endOf("week")
        .day(daysCount - 1);
      return !moment(date).isBetween(
        weekStartDay,
        lastWeekSelection,
        undefined,
        "[]"
      );
    } catch (error) {
      console.log("Error in Fetching Calendar Date Range", error);
    }
  };

  const handle = (dates) => {
    onDateChange(dates);
  };

  return (
    <NormalCalendarFiscalMapping
      showDefaultLabel={true}
      selectedDate={selectedDate}
      onDateChange={handle}
      isMandatory
      fiscalCalendarData={fiscalCalendarData}
      disablePastWeeks={true}
      disableOutSideFiscalRange={false}
      isOutsideRange={
        dateRangeModuleConfig || dateRangeFilterConfig?.is_outside_range_enabled
          ? isOutsideRange
          : undefined
      }
      dateFilterFormat={dateFilterFormat}
      // HOTFIX : for CST timezone, week selection is not working as expected
      // originalOffset={true}
    />
  );
};

export default Calendar;
