import { useState, useEffect } from "react";
import moment from "moment";
import { DateRangePicker } from "impact-ui-v3";
import { isEmpty } from "lodash";
import { formatMomentDate, formatStringDate } from "core/Utils/functions/utils";
import { isOutsideRange } from "core/Utils/DatePicker/DatePickerUtils";
import colours from "core/Styles/colours";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { getSafeDisplayFormat } from "core/Utils/utils";

const NormalCalendarFiscalMapping = (props) => {
  const { disableOutSideFiscalRange = true } = props;
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const [focusedInput, setFocusedInput] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [fiscalWeekInfo, setFiscalWeekInfo] = useState([]);
  const [fiscalWeekStartDay, setFiscalWeekStartDay] = useState(1); // Default to Monday

  const startDayOfWeek = moment().startOf("week");

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

    let endDateStartWeek = getFiscalWeekStart(moment(formattedEndDate));
    if (props?.fiscalCalendarData.length > 0) {
    props?.fiscalCalendarData?.forEach((fiscalDate) => {
      if (
        formatStringDate(fiscalDate?.calendar_week_start_date, true) ===
        formatMomentDate(startDate)
      ) {
        fiscalInfoStartDate = {
          ...fiscalDate,
          actualSelectedDate: moment(startDate)?.format(tenantDateFormat),
        };
    }
      if (
        formatStringDate(fiscalDate?.calendar_week_start_date, true) ===
        formatMomentDate(endDateStartWeek)
      ) {
        fiscalInfoEndDate = {
          ...fiscalDate,
          actualSelectedDate: moment(endDate)?.format(tenantDateFormat),
        };
      }
    });
    } else {
      fiscalInfoStartDate = startDate;
      fiscalInfoEndDate = endDate;
    }

    props.onDateChange({
      fiscalInfoStartDate,
      fiscalInfoEndDate,
    });
  };

  const calculateFiscalWeekInfo = () => {
    try {
      let weekInfo = props?.fiscalCalendarData?.map((fiscalDate) => { 
        return {
          calendar_week_start_date: formatStringDate(fiscalDate?.calendar_week_start_date, true),
          calendar_year_week: String(fiscalDate?.fiscal_year_week)?.slice(-2),
        }
      });
      setFiscalWeekInfo(weekInfo);
    } catch (error) {
      console.error("calculateFiscalWeekInfo error:", error);
    }
  };

  // Function to determine fiscal week start day
  const determineFiscalWeekStartDay = () => {
    if (!props?.fiscalCalendarData?.length) return 1; // Default to Monday if no data
    
    // Get the first fiscal date and its corresponding moment
    const firstFiscalDate = props.fiscalCalendarData[0];
    const firstWeekStart = moment.utc(firstFiscalDate.calendar_week_start_date);
    
    // Get the day of week (0-6, where 0 is Sunday)
    const startDay = firstWeekStart.day();
    // Convert to ISO weekday format (1-7, where 1 is Monday, 7 is Sunday)
    return startDay === 0 ? 7 : startDay;
  };
  // Helper function to get fiscal week start date
  const getFiscalWeekStart = (momentDay) => {
    // Get the current day's weekday (1-7, where 1 is Monday)
    const currentWeekday = momentDay.isoWeekday();
    // Calculate how many days to subtract to get to the fiscal week start
    let daysToSubtract = (currentWeekday - fiscalWeekStartDay + 7) % 7;
    // If the current day is the fiscal week start day, daysToSubtract will be 0
    // If the current day is after the fiscal week start day, subtract the difference
    return momentDay.clone().subtract(daysToSubtract, "days");
  };
  // Helper function to get fiscal week end date
  const getFiscalWeekEnd = (momentDay) => {
    // Calculate the end day of fiscal week (day before the next fiscal week starts)
    const fiscalWeekEndDay = fiscalWeekStartDay === 1 ? 7 : fiscalWeekStartDay - 1;
    // Get the current day's weekday (1-7, where 1 is Monday)
    const currentWeekday = momentDay.isoWeekday();
    // Calculate how many days to add to get to the fiscal week end
    let daysToAdd = (fiscalWeekEndDay - currentWeekday + 7) % 7;
    // If the current day is the fiscal week end day, daysToAdd will be 0
    // If the current day is before the fiscal week end day, add the difference
    return momentDay.clone().add(daysToAdd, "days");
  };

  useEffect(() => {
    if (!isEmpty(props.selectedDate) && canUpdateDate()) {
      if (
        props.selectedDate?.fiscalInfoStartDate?.hasOwnProperty(
          "calendar_week_start_date"
        )
      ) {
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
      } else {
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

  useEffect(() => {
    if (endDate && !focusedInput && props.setValueOnBlur) {
      setDateChange(startDate, endDate);
    }
  }, [focusedInput]);

  useEffect(() => {
    if (!isEmpty(props?.fiscalCalendarData)) {
      calculateFiscalWeekInfo();
      let weekStartDay = determineFiscalWeekStartDay();
      setFiscalWeekStartDay(weekStartDay);
    }
  }, [props?.fiscalCalendarData]);

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
          {props?.label || "Date Range "}
          {props.isMandatory && <span style={{ color: colours.jaffa }}>*</span>}
        </p>
      )}

      <DateRangePicker
        label={props?.label || ""}
        placeholder={props?.placeholder || ""}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        isRequired={props?.isMandatory || props?.isRequired}
        isDisabled={props.disabled}
        startDate={startDate}
        endDate={endDate}
        showWeekNumbers
        keepOpenOnDateSelect
        showClearDates={
          props.showClearDates === undefined ? true : props.showClearDates
        }
        onPrimaryButtonClick={() => {
          setDateChange(startDate, endDate);
          props?.onPrimaryButtonClick?.();
        }}
        disablePastWeeks={props.disablePastWeeks}
        disableFutureWeeks={props.disableFutureWeeks}
        maxOneWeekSelection={props.maxOneWeekSelection}
        showMonthYearSelect
        isOutsideRange={
          props.isOutsideRange
            ? props.isOutsideRange
            : (day) =>
                isOutsideRange(
                  day,
                  startDayOfWeek,
                  props.disablePastWeeks,
                  props.disableFutureWeeks,
                  true,
                  false,
                  disableOutSideFiscalRange,
                  fiscalWeekInfo
                )
        }
        startDateOffset={(day) => {
          if (props.originalOffset) {
            let days = day.diff(startDate, "days");
            if (startDate && days > 0 && !props.maxOneWeekSelection) {
              return getFiscalWeekStart(moment(startDate));
            }
            return getFiscalWeekStart(moment(day));
          }

          let days = day.diff(startDate, "days");
          if (startDate && days > 0 && !props.maxOneWeekSelection) {
            return getFiscalWeekStart(moment(startDate));
          }
          return getFiscalWeekStart(moment(day));
        }}
        endDateOffset={(day) => {
          if (props.originalOffset) {
            return getFiscalWeekEnd(moment(day));
          }
          if (props?.maxEightWeekSelection) {
            //adding this case for custom selection range, always to maintain a fixed week range
            // First, align the clicked day to its fiscal week start
            const weekStart = getFiscalWeekStart(moment(day));

            // Then add (selectionRange - 1) weeks to get to the start of the last week in the range
            // This ensures we get exactly selectionRange weeks regardless of fiscal week start day

            const lastWeekStart = weekStart
              .clone()
              .add(props.selectionRange - 1, "week");

            if (props?.enableAutoSelectionForMonth) {
              if (props?.useWeekStartMonthOffset) {
                // Case 1: Count months starting from the actual selected week start date
                // The month offset is added directly to the week start
                let lastWeekStartDate = weekStart
                  .clone()
                  .add((props?.selectionMonthCount || 1) - 1, "months");
                return getFiscalWeekEnd(lastWeekStartDate);
              } else if (props?.useStartOfMonthOffset) {
                // Case 2: Count months starting from the first day of the month of the week start
                // Normalize to the start of the month, then add the month offset

                const startMonth = weekStart.clone().startOf("month");
                let lastWeekStartDate = startMonth.add(
                  (props?.selectionMonthCount || 1) - 1,
                  "months"
                );
                lastWeekStartDate = lastWeekStartDate.endOf("month");
                return getFiscalWeekEnd(lastWeekStartDate);
              } else if (props?.useFiscalMonthEnd) {
                // Case 3: End of selection is determined from fiscal calendar data
                // Normalize to the start of the month, then add the month offset and use Fiscal Calendar data for the end date of that month
                const startMonth = props?.useCurrentWeekStart ?  weekStart.clone() :  weekStart.clone().startOf("month");
                let lastWeekStartDate = startMonth.add(
                  (props?.selectionMonthCount || 1) - 1,
                  "months"
                );
                const calendarData = props?.fiscalCalendarData.find((data) =>
                  moment(data.fiscal_week_begin_date).isAfter(
                    lastWeekStartDate,
                    "day"
                  )
                );
                if (calendarData) {
                  return moment(calendarData?.fiscal_month_end_date);
                }
                return getFiscalWeekEnd(lastWeekStartDate);
              }
            }

            if (props?.restrictEndDateToMaxEndDate) {
              const computedEndDate = getFiscalWeekEnd(lastWeekStart);
              const outsideRangeFn = props.isOutsideRange
                ? props.isOutsideRange
                : (date) =>
                    isOutsideRange(
                      date,
                      startDayOfWeek,
                      props.disablePastWeeks,
                      props.disableFutureWeeks,
                      true,
                      false,
                      disableOutSideFiscalRange,
                      fiscalWeekInfo
                    );

              if (
                props?.maxWeekEndDate &&
                outsideRangeFn?.(computedEndDate) &&
                !outsideRangeFn?.(moment(props.maxWeekEndDate))
              ) {
                return moment(props.maxWeekEndDate);
              }
              return computedEndDate;
            }

            // Finally, get the fiscal week end of that week
            return getFiscalWeekEnd(lastWeekStart);
          }
          return getFiscalWeekEnd(moment(day));
        }}
        customWeekNumberData={!isEmpty(fiscalWeekInfo) ? fiscalWeekInfo : null}
        displayFormat={getSafeDisplayFormat(tenantDateFormat)}
        labelOrientation={props?.labelOrientation || "top"}
      />
    </div>
  );
};

export default NormalCalendarFiscalMapping;
