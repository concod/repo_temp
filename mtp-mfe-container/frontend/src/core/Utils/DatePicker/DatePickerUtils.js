import moment from "moment";

/**
 *
 * @param {*} day day that is given by the isOutsidefunctino
 * @param {*} currentDate its start date from where you want to disable the date From the start of week or perticular date
 * @param {*} disablePast if you want to disable past date or week then it should be true
 * @param {*} disableFuture if you want to disable future date or Week then it should be true
 * @param {*} isWeek if you want to disable the Whole week in that case it should be true
 * @returns
 */
export const isOutsideRange = (
  day,
  currentDate,
  disablePast,
  disableFuture,
  isWeek = false,
  disableOnlyPast,
  disableOutSideFiscalRange,
  fiscalWeekInfo
) => {
  if (disableOutSideFiscalRange) {
    return isInFiscalRange(day, fiscalWeekInfo);
  }
  if (disablePast)
    return !isInclusivelyAfterDay(day, currentDate, isWeek, disableOnlyPast);
  else if (disableFuture)
    return isInclusivelyAfterDay(day, currentDate, isWeek);
  else return null;
};

const isInFiscalRange = (day, fiscalWeekInfo) => {
  try {
    // Get first and last week dates
    const firstWeekStart = fiscalWeekInfo[0].calendar_week_start_date;
    const lastWeekStart =
      fiscalWeekInfo[fiscalWeekInfo.length - 1].calendar_week_start_date;
    // Add 6 days to last week start to get the end of the fiscal range
    const lastWeekEnd = moment(lastWeekStart)
      .add(6, "days")
      .format("YYYY-MM-DD");

    // Convert the day to YYYY-MM-DD format for comparison
    const dayStr = moment(day).format("YYYY-MM-DD");

    // Return true if day is outside the fiscal range
    if (dayStr < firstWeekStart || dayStr > lastWeekEnd) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("isInFiscalRange error:", error);
    return false;
  }
};

const isBeforeDay = (initialDate, newDate, isWeek, disableOnlyPast=false) => {
  if (!moment.isMoment(initialDate) || !moment.isMoment(newDate)) return false;

  const initialDateYear = initialDate.year();
  const initialDateMonth = initialDate.month();

  const newDateYear = newDate.year();
  const newDateMonth = newDate.month();

  const isSameYear = initialDateYear === newDateYear;
  const isSameMonth = initialDateMonth === newDateMonth;

  if (isSameYear && isSameMonth && isWeek)
    return initialDate.date() < newDate.date();
  if (isSameYear && isSameMonth && !isWeek)
    if (disableOnlyPast){
      return initialDate.date() < newDate.date();
    } else {
      return initialDate.date() <= newDate.date();
    }
  if (isSameYear) return initialDateMonth < newDateMonth;
  return initialDateYear < newDateYear;
};

const isInclusivelyAfterDay = (initialDate, newDate, isWeek,disableOnlyPast) => {
  if (!moment.isMoment(initialDate) || !moment.isMoment(newDate)) return false;
  return !isBeforeDay(initialDate, newDate, isWeek, disableOnlyPast);
};
