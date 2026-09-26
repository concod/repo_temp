import moment from "moment";
import _ from "lodash";

export const getCurrent = (fiscalCalendar, minDate, maxDate) => {
  let currentMoWkQtrYr = {};
  fiscalCalendar?.map((year) => {
    year?.fiscal_data?.quarters?.map((quarter) => {
      quarter.months?.map((month) => {
        month.weeks.map((week) => {
          if (
            moment(minDate).isSameOrBefore(week.max_date, "day") &&
            moment(minDate).isSameOrAfter(week.min_date, "day")
          ) {
            currentMoWkQtrYr.currYr = year.year;
            currentMoWkQtrYr.currQtr = quarter.fiscal_quarter;
            currentMoWkQtrYr.currMo = month.fiscal_month;
            currentMoWkQtrYr.currWk = week.fiscal_week;
            currentMoWkQtrYr.minDate = currentMoWkQtrYr;
          }
          // Find max calendar date possible
          if (
            moment(maxDate).isSameOrBefore(week.max_date, "day") &&
            moment(maxDate).isSameOrAfter(week.min_date, "day")
          ) {
            const maxConfig = {};
            maxConfig.currYr = year.year;
            maxConfig.currQtr = quarter.fiscal_quarter;
            maxConfig.currMo = month.fiscal_month;
            maxConfig.currWk = week.fiscal_week;
            currentMoWkQtrYr.maxDate = maxConfig;
          }
        });
      });
    });
  });
  return currentMoWkQtrYr;
};

export const getQtrMoWkDateMapping = (
  fiscalCalendar,
  year,
  quarter,
  month,
  headerViewType,
  shouldGetCurrentQuarterMappingForViewType = false
) => {
  let qtrMoWkDateMapping = {};
  qtrMoWkDateMapping.year = year;
  const currentFiscalYear = fiscalCalendar?.find((data) => data.year === year);
  let quarterArray = [];
  currentFiscalYear?.fiscal_data?.quarters?.map((quarter, qi) => {
    let noOfDaysInQuarter = 0;
    const eachQuarter = {};
    eachQuarter.id = quarter.fiscal_quarter;
    eachQuarter.name = "Fiscal Quarter " + quarter.fiscal_quarter;
    let quarterMonths = [];
    let quarterMonthIds = [];
    let quarterWeekIds = [];
    quarter.months?.map((month, mi) => {
      let noOfDaysInMonth = 0;
      const eachMonth = {};
      eachMonth.id = month.fiscal_month;
      eachMonth.name = "FM " + month.fiscal_month;
      let monthWeeks = [];
      let monthWeekIds = [];
      month.weeks.map((week, wi) => {
        let eachWeek = {};
        eachWeek.id = week.fiscal_week;
        eachWeek.name = "FW " + week.fiscal_week;
        eachWeek.max_date = week.max_date;
        eachWeek.min_date = week.min_date;
        let daysInWeek =
          moment(week.max_date).diff(moment(week.min_date), "days") + 1;
        let datesInWeek = [];
        for (let i = 0; i < daysInWeek; i++) {
          const dt = moment(week.min_date, "YYYY-MM-DD").add(i, "days");

          dt.monthBorder = i === 0 && wi === 0;
          dt.weekBorder = i === 0 && wi !== 0;

          datesInWeek.push(dt);
        }
        eachWeek.days = datesInWeek;
        eachWeek.monthBorder = wi === 0;
        eachWeek.daysInWeek = daysInWeek;
        noOfDaysInMonth = noOfDaysInMonth + daysInWeek;
        monthWeeks.push(eachWeek);
        monthWeekIds.push(eachWeek.id);
        quarterWeekIds.push(eachWeek.id);
      });
      eachMonth.min_date = monthWeeks[0].min_date;
      eachMonth.max_date = monthWeeks[monthWeeks.length - 1].max_date;
      eachMonth.weekIds = monthWeekIds;
      eachMonth.weeks = monthWeeks;
      eachMonth.quarterBorder = mi === 0;
      eachMonth.daysInMonth = noOfDaysInMonth;
      eachMonth.year = year;
      noOfDaysInQuarter = noOfDaysInQuarter + noOfDaysInMonth;
      quarterMonths.push(eachMonth);
      quarterMonthIds.push(eachMonth.id);
    });
    eachQuarter.min_date = quarterMonths[0].min_date;
    eachQuarter.max_date = quarterMonths[quarterMonths.length - 1].max_date;
    eachQuarter.weekIds = quarterWeekIds;
    eachQuarter.monthIds = quarterMonthIds;
    eachQuarter.months = quarterMonths;
    eachQuarter.yearBorder = qi === 0;
    eachQuarter.daysInQuarter = noOfDaysInQuarter;
    eachQuarter.year = year;
    quarterArray.push(eachQuarter);
  });
  qtrMoWkDateMapping.quarters = quarterArray;
  qtrMoWkDateMapping.min_date = quarterArray[0].min_date;
  qtrMoWkDateMapping.max_date = quarterArray[quarterArray.length - 1].max_date;

  const {
    currentDateSelectionMapping,
    totalDaysInView,
  } = shouldGetCurrentQuarterMappingForViewType
    ? getCurrentQuarterMappingForViewType({
        headerViewType: headerViewType,
        headerMapping: qtrMoWkDateMapping,
        currentQuarter: quarter,
        currentMonth: month,
        fiscalCalendar: fiscalCalendar,
      })
    : {};
  return { qtrMoWkDateMapping, currentDateSelectionMapping, totalDaysInView };
};

export const getWeekAndQuarterFromMonth = (qtrMoWkDateMapping, monthId) => {
  const quarterForMonth = qtrMoWkDateMapping.quarters.find((q) =>
    q.monthIds.includes(monthId)
  );
  const month = quarterForMonth?.months.find((month) => month.id === monthId);
  return {
    quarterFromMonth: quarterForMonth?.id,
    weekFromMonth: month?.weekIds[0],
  };
};

export const getWeekAndMonthFromQuarter = (qtrMoWkDateMapping, quarterId) => {
  const quarter = qtrMoWkDateMapping.quarters.find((q) => q.id === quarterId);
  const monthForQuarter = quarter?.monthIds?.[0];
  const weekForQuarter = quarter?.weekIds?.[0];
  return { monthForQuarter, weekForQuarter };
};

export const getMonthAndQuarterFromWeek = (qtrMoWkDateMapping, weekId) => {
  const quarter = qtrMoWkDateMapping.quarters.find((q) =>
    q.weekIds.includes(weekId)
  );
  const month = quarter.months.find((m) => m.weekIds.includes(weekId));
  return { quarterFromWeek: quarter.id, monthFromWeek: month.id };
};

export const getWeekCount = (yr, fiscalCalendar) => {
  let weekCount = 0;
  const currentFiscalYear = fiscalCalendar?.find((data) => data.year === yr);
  currentFiscalYear?.fiscal_data?.quarters?.map((quarter) => {
    quarter.months?.map((month) => {
      weekCount = weekCount + month.weeks?.length;
    });
  });
  return weekCount;
};

export const geStartAndEndDate = (
  qtrMoWkDateMapping,
  currentDateSelectionMapping,
  quarterId,
  monthId,
  weekId,
  type
) => {
  const quarter = qtrMoWkDateMapping.quarters.find((q) => q.id === quarterId);
  if (type === "quarter") {
    return { minDate: quarter.min_date, maxDate: quarter.max_date };
  }

  if (type === "week") {
    const month = quarter.months.find((m) => m.id === monthId);
    const week = month.weeks.find((w) => w.id === weekId);
    return { minDate: week.min_date, maxDate: week.max_date };
  }

  if (type === "month") {
    return {
      minDate: currentDateSelectionMapping.min_date,
      maxDate: currentDateSelectionMapping.max_date,
    };
  }
};

export const getCurrentQuarterMappingForViewType = ({
  headerViewType,
  headerMapping,
  currentQuarter,
  currentMonth,
  fiscalCalendar,
}) => {
  let currentDateSelectionMapping = null;
  if (headerViewType === "quarter") {
    currentDateSelectionMapping = _.cloneDeep(
      headerMapping?.quarters?.find((quarter) => quarter.id === currentQuarter)
    );
  } else if (headerViewType === "month") {
    // Include 2 weeks from one month prev and one month next
    // If its the 1st month or last month, show only the one that belongs to the same year
    let monthsToDisplay = [];

    const currentQuarterIndex = headerMapping?.quarters?.findIndex(
      (quarter) => quarter.id === currentQuarter
    );

    currentDateSelectionMapping = _.cloneDeep(
      headerMapping?.quarters?.[currentQuarterIndex]
    );

    const currentMonthIndex = currentDateSelectionMapping.monthIds.findIndex(
      (m) => m === currentMonth
    );

    // Get last 2 weeks of previous Month
    if (currentMonthIndex === 0) {
      // Get last month of previous quarter
      // Check if currentQuarter is first quarter, then skip this cos prev year
      let prevHeaderMapping = _.cloneDeep(headerMapping);
      let prevQuarter = null;
      if (currentQuarterIndex === 0) {
        if (
          fiscalCalendar.find((data) => data.year === headerMapping.year - 1)
        ) {
          prevHeaderMapping = _.cloneDeep(
            getQtrMoWkDateMapping(
              fiscalCalendar,
              headerMapping.year - 1,
              4,
              12,
              headerViewType,
              false
            )?.qtrMoWkDateMapping
          );
          prevQuarter = _.cloneDeep(
            prevHeaderMapping?.quarters?.[
              prevHeaderMapping?.quarters?.length - 1
            ]
          );
        }
      } else {
        prevQuarter = _.cloneDeep(
          prevHeaderMapping?.quarters?.[currentQuarterIndex - 1]
        );
      }

      const prevMonth = _.cloneDeep(
        prevQuarter?.months?.[prevQuarter?.months?.length - 1]
      );
      prevMonth.weeks = [
        ...prevMonth.weeks.slice(Math.max(prevMonth.weeks.length - 1, 0)),
      ];
      prevMonth.weekIds = [
        ...prevMonth.weekIds.slice(Math.max(prevMonth.weeks.length - 1, 0)),
      ];
      prevMonth.daysInMonth = prevMonth.weeks.reduce(
        (total, week) => total + week.daysInWeek,
        0
      );
      prevMonth.min_date = prevMonth.weeks[0].min_date;
      prevMonth.max_date = prevMonth.weeks[prevMonth.weeks.length - 1].max_date;
      // Cut off weeks from prevMonth
      monthsToDisplay = [...monthsToDisplay, prevMonth];
    } else {
      const prevMonth = _.cloneDeep(
        currentDateSelectionMapping?.months?.[currentMonthIndex - 1]
      );
      // Cut off weeks from prevMonth
      prevMonth.weeks = [
        ...prevMonth.weeks.slice(Math.max(prevMonth.weeks.length - 1, 0)),
      ];
      prevMonth.weekIds = [
        ...prevMonth.weekIds.slice(Math.max(prevMonth.weeks.length - 1, 0)),
      ];
      prevMonth.daysInMonth = prevMonth.weeks.reduce(
        (total, week) => total + week.daysInWeek,
        0
      );
      prevMonth.min_date = prevMonth.weeks[0].min_date;
      prevMonth.max_date = prevMonth.weeks[prevMonth.weeks.length - 1].max_date;
      monthsToDisplay = [...monthsToDisplay, prevMonth];
    }
    // Add Current Month
    const activeMonth = _.cloneDeep(
      currentDateSelectionMapping?.months?.[currentMonthIndex]
    );
    monthsToDisplay = [...monthsToDisplay, activeMonth];
    // Get first 2 weeks of next month

    if (currentMonthIndex === currentDateSelectionMapping.monthIds.length - 1) {
      // Get first month of next quarter
      // If current quarter is last quarter, skip this cos next year

      let nextHeaderMapping = _.cloneDeep(headerMapping);
      let nextQuarter = null;
      if (currentQuarterIndex === headerMapping?.quarters?.length - 1) {
        if (
          fiscalCalendar.find((data) => data.year === headerMapping.year + 1)
        ) {
          nextHeaderMapping = _.cloneDeep(
            getQtrMoWkDateMapping(
              fiscalCalendar,
              headerMapping.year + 1,
              1,
              1,
              headerViewType,
              false
            )?.qtrMoWkDateMapping
          );
          nextQuarter = _.cloneDeep(nextHeaderMapping?.quarters?.[0]);
        }
      } else {
        nextQuarter = _.cloneDeep(
          nextHeaderMapping?.quarters?.[currentQuarterIndex + 1]
        );
      }
      const nextMonth = _.cloneDeep(nextQuarter?.months?.[0]);
      // Cut off weeks from nextMonth
      nextMonth.weeks = [...nextMonth.weeks.slice(0, 1)];
      nextMonth.weekIds = [...nextMonth.weekIds.slice(0, 1)];
      nextMonth.daysInMonth = nextMonth.weeks.reduce(
        (total, week) => total + week.daysInWeek,
        0
      );
      nextMonth.min_date = nextMonth.weeks[0].min_date;
      nextMonth.max_date = nextMonth.weeks[nextMonth.weeks.length - 1].max_date;
      monthsToDisplay = [...monthsToDisplay, nextMonth];
    } else {
      const nextMonth = _.cloneDeep(
        currentDateSelectionMapping?.months?.[currentMonthIndex + 1]
      );
      // Cut off weeks from nextMonth
      nextMonth.weeks = [...nextMonth.weeks.slice(0, 1)];
      nextMonth.weekIds = [...nextMonth.weekIds.slice(0, 1)];
      nextMonth.daysInMonth = nextMonth.weeks.reduce(
        (total, week) => total + week.daysInWeek,
        0
      );
      nextMonth.min_date = nextMonth.weeks[0].min_date;
      nextMonth.max_date = nextMonth.weeks[nextMonth.weeks.length - 1].max_date;
      monthsToDisplay = [...monthsToDisplay, nextMonth];
    }

    currentDateSelectionMapping.months = [...monthsToDisplay];
    currentDateSelectionMapping.monthIds = monthsToDisplay.map((m) => m.id);
    currentDateSelectionMapping.weekIds = monthsToDisplay.reduce(
      (weekIds, m) => [...weekIds, ...m.weekIds],
      []
    );
    currentDateSelectionMapping.daysInQuarter = monthsToDisplay.reduce(
      (total, month) => total + month.daysInMonth,
      0
    );
    currentDateSelectionMapping.min_date = monthsToDisplay[0].min_date;
    currentDateSelectionMapping.max_date =
      monthsToDisplay[monthsToDisplay.length - 1].max_date;
  }

  let totalDaysInView = 0;
  currentDateSelectionMapping?.months?.map((month) => {
    month.weeks?.map((week) => {
      totalDaysInView = totalDaysInView + week.days?.length;
    });
  });
  return { currentDateSelectionMapping, totalDaysInView };
};

export const getCalendarPlotForEvents = (filteredEvents) => {
  const calendarPlot = [];
  filteredEvents.sort((a, b) => {
    const startDateDiff = moment(a.start_date).diff(moment(b.start_date));
    if (startDateDiff !== 0) {
      return startDateDiff;
    }
    return moment(a.end_date).diff(moment(b.end_date));
  });

  filteredEvents.forEach((event) => {
    const currentEvent = event;
    let dataInserted = false;

    for (let i = 0; i < calendarPlot.length; i++) {
      let conflictFound = false;
      const row = calendarPlot[i];

      for (let j = 0; j < row.length; j++) {
        const existingEvent = row[j];

        if (
          moment(currentEvent.start_date).isBetween(
            existingEvent.start_date,
            existingEvent.end_date,
            null,
            "[]"
          ) ||
          moment(currentEvent.end_date).isBetween(
            existingEvent.start_date,
            existingEvent.end_date,
            null,
            "[]"
          ) ||
          moment(existingEvent.start_date).isBetween(
            currentEvent.start_date,
            currentEvent.end_date,
            null,
            "[]"
          ) ||
          moment(existingEvent.end_date).isBetween(
            currentEvent.start_date,
            currentEvent.end_date,
            null,
            "[]"
          )
        ) {
          conflictFound = true;
          break;
        }
      }

      if (!conflictFound) {
        row.push(currentEvent);
        calendarPlot[i] = row;
        dataInserted = true;
        break;
      }
    }

    if (!dataInserted) {
      calendarPlot.push([currentEvent]);
    }
  });

  return calendarPlot;
};

export const filterEventsforDisplay = ({ eventList, calStDt, calEnDt }) => {
  return eventList?.filter((event) => {
    const { start_date: eventStDt, end_date: eventEnDt } = event;
    const isCampaignInBetweenCalendar =
      moment(eventStDt).isBetween(calStDt, calEnDt, null, "[]") ||
      moment(eventEnDt).isBetween(calStDt, calEnDt, null, "[]");
    const isCalendarInBetweenCampaign =
      moment(calStDt).isBetween(eventStDt, eventEnDt, null, "[]") &&
      moment(calEnDt).isBetween(eventStDt, eventEnDt, null, "[]");
    return isCampaignInBetweenCalendar || isCalendarInBetweenCampaign;
  });
};

export const getEventLeftSpace = ({ eventStDt, calStDt, totalDaysInView }) => {
  // difference between event start date and calendar start date
  const diff = moment(eventStDt).diff(calStDt, "days");
  let leftSpace;
  if (diff <= 0) {
    leftSpace = 0;
  } else {
    leftSpace = (diff / totalDaysInView) * 100;
  }
  return leftSpace + 0.02;
};

export const getEventWidth = ({
  eventStDt,
  eventEnDt,
  calStDt,
  calEnDt,
  totalDaysInView,
}) => {
  // difference between event start date and event end date
  const diff = moment(eventEnDt).diff(eventStDt, "days") + 1;
  // difference between calendar start date and event start date
  const diff1 = moment(eventStDt).diff(calStDt, "days");
  // difference between calendar end date and event end date
  const diff2 = moment(eventEnDt).diff(calEnDt, "days");

  let widthInDays = diff;
  if (diff1 < 0) {
    widthInDays = diff + diff1;
  } else if (diff2 > 0) {
    widthInDays = diff - diff2;
  }
  if (diff1 < 0 && diff2 > 0) {
    widthInDays = totalDaysInView;
  }
  const width = (widthInDays * 100) / totalDaysInView;
  return width - 0.06;
};
