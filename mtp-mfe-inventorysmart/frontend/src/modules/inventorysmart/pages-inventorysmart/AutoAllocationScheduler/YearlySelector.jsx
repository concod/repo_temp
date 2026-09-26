import { useEffect } from "react";
import { Button, Chips } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
// import "./autoAllocation.css";

import {
  NO_OF_DAYS_IN_MONTH,
  WEEK_DAYS,
  WEEK_DAYS_SELECTION_CONST,
} from "./autoAllocationConstants";
import { common } from "../../constants-inventorysmart/stringConstants";

import { getOrdinal } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import colors from "core/Styles/colours";
import { getWeekValue } from "./utility";

const YearlySelector = ({
  frequency,
  frequencyType,
  yearlyState: {
    selectedMonthsForYearly,
    selectedDatesForYearly,
    selectedDaysForYearly,
    selectedWeeksForYearly,
  },
  configDetails,
  handleSelectedDatesForYearly,
  handleSelectedMonthsForYearly,
  handleSelectedDaysForYearly,
  handleSelectedWeeksForYearly,
  resetYearlyState,
}) => {
  const classes = useStyles();

  useEffect(() => {
    return () => {
      resetYearlyState();
    };
  }, []);

  const handleMonthSelection = (month) => {
    if (selectedMonthsForYearly.includes(month)) {
      // Remove the month from selectedMonths array
      const updatedMonths = selectedMonthsForYearly.filter((m) => m !== month);
      handleSelectedMonthsForYearly(updatedMonths);
    } else {
      // Add the month to selectedMonths array
      const updatedMonths = [...selectedMonthsForYearly, month];
      handleSelectedMonthsForYearly(updatedMonths);
    }
  };

  const handleDatesSelection = (date) => {
    const tempSelectedDates = [...selectedDatesForYearly];
    const week = getWeekValue(date); // Get the week number for the day

    if (
      configDetails &&
      configDetails?.schedulerDetails?.frequencyDetails?.date?.weeklySelectOne
    ) {
      //if no value is there then assign the value, if same value is there then remove it or replace it
      if (!tempSelectedDates[week]) {
        tempSelectedDates[week] = date;
      } else {
        if (tempSelectedDates[week] === date) {
          tempSelectedDates[week] = undefined;
        } else {
          tempSelectedDates[week] = date;
        }
      }
      handleSelectedDatesForYearly(tempSelectedDates);
      return;
    }

    if (tempSelectedDates.includes(date)) {
      // Remove the date from tempSelectedDates array
      const updatedDates = tempSelectedDates.filter((d) => d !== date);
      handleSelectedDatesForYearly(updatedDates);
    } else {
      // Add the date to tempSelectedDates array
      const updatedDates = [...tempSelectedDates, date];
      handleSelectedDatesForYearly(updatedDates);
    }
  };

  const handleDaysSelection = (day) => {
    if (selectedDaysForYearly.includes(day)) {
      // Remove the day from selectedDaysForYearly array
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        handleSelectedDaysForYearly([]);
        return;
      }
      const updatedDays = selectedDaysForYearly.filter((d) => d !== day);
      handleSelectedDaysForYearly(updatedDays);
    } else {
      // Add the day to selectedDaysForYearly array
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        handleSelectedDaysForYearly([day]);
        return;
      }
      const updatedDays = [...selectedDaysForYearly, day];
      handleSelectedDaysForYearly(updatedDays);
    }
  };

  const handleWeeksSelection = (week) => {
    if (selectedWeeksForYearly.includes(week)) {
      // Remove the week from selectedWeeksForQuarterly array
      const updatedWeeks = selectedWeeksForYearly.filter((w) => w !== week);
      handleSelectedWeeksForYearly(updatedWeeks);
    } else {
      // Add the week to selectedWeeksForQuarterly array
      const updatedWeeks = [...selectedWeeksForYearly, week];
      handleSelectedWeeksForYearly(updatedWeeks);
    }
  };

  return (
    <div className={classes.marginTop05}>
      {frequency.value === "yearly" && (
        <div
          className={`${classes.marginTop05} ${classes.monthlyFrequencyWrapper}`}
        >
          <div className={classes.schedulerRepeatsLabel}>Repeats on Month</div>
          <div className={classes.schedulerLabelDivider} />
          <div className={`${classes.weekSelectionContainer}`}>
            {common.__Month_mapping_list.map((month) => (
              <span
                key={month + "month"}
                title={month}
                className={classes.monthChipCell}
              >
                <Chips
                  label={month}
                  isActive={selectedMonthsForYearly.includes(month)}
                  onClick={() => handleMonthSelection(month)}
                  type="multi"
                />
              </span>
            ))}
          </div>
        </div>
      )}
      {frequency.value === "yearly" && frequencyType === "date" && (
        <div
          className={`${classes.marginTop05} ${classes.monthlyFrequencyWrapper}`}
        >
          <div className={classes.schedulerRepeatsLabel}>Repeats on</div>
          <div className={classes.schedulerLabelDivider} />
          <div className={`${classes.dateGridSelector}`}>
            {[...Array(NO_OF_DAYS_IN_MONTH)].map((_, index) => (
              <Chips
                key={index}
                label={index + 1}
                isActive={selectedDatesForYearly.includes(index + 1)}
                onClick={() => handleDatesSelection(index + 1)}
                type="multi"
              />
            ))}
          </div>
        </div>
      )}
      {frequency.value === "yearly" && frequencyType === "day" && (
        <div
          className={`${classes.marginTop05} ${classes.monthlyFrequencyWrapper}`}
        >
          <div className={classes.schedulerRepeatsLabel}>Repeats on</div>
          <div className={classes.schedulerLabelDivider} />
          <div className={classes.repeatsOnColumn}>
            <div className={classes.chipWrapRow}>
              {WEEK_DAYS_SELECTION_CONST.map((week) => (
                <Chips
                  key={week + "day"}
                  label={week}
                  isActive={selectedDaysForYearly.includes(week)}
                  onClick={() => handleDaysSelection(week)}
                  type="multi"
                />
              ))}
            </div>

            <div>Of</div>
            <div className={classes.chipWrapRow}>
              {WEEK_DAYS.map((week) => (
                <Chips
                  key={week + "week"}
                  label={`${getOrdinal(week)} Week`}
                  isActive={selectedWeeksForYearly.includes(week)}
                  onClick={() => handleWeeksSelection(week)}
                  type="multi"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlySelector;
