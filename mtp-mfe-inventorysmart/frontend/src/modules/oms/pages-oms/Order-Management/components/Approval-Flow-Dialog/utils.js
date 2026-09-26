import moment from "moment";

export const findFiscalWeek = (date, fiscalCalendarDetails) => {
  if (!date || !fiscalCalendarDetails?.length) return null;
  return fiscalCalendarDetails.find(
    ({ fiscal_week_begin_date: start, fiscal_week_end_date: end }) => {
      // Compare at day granularity to avoid timezone issues
      return (
        moment(date).isSameOrAfter(moment(start), "day") &&
        moment(date).isSameOrBefore(moment(end), "day")
      );
    }
  );
};
