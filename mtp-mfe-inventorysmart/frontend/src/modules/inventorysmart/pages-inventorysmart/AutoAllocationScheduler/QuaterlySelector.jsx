import { Button, Chips } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  MONTH_SELECTION_CONST,
  NO_OF_DAYS_IN_MONTH,
  WEEK_DAYS,
  WEEK_DAYS_SELECTION_CONST,
} from "./autoAllocationConstants";
import { getOrdinal } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { useEffect } from "react";
import { getWeekValue } from "./utility";

const QuaterlySelector = ({
  frequency,
  frequencyType,
  quaterlyState: {
    selectedMonths,
    selectedDatesForQuaterly,
    selectedDaysForQuaterly,
    selectedWeeksForQuarterly,
  },
  configDetails,
  handleSelectedDatesForQuaterly,
  handleSelectedMonthsForQuaterly,
  handleSelectedDaysForQuaterly,
  handleSelectedWeeksForQuaterly,
  resetQuaterlyState,
}) => {
  const classes = useStyles();

  useEffect(() => {
    return () => {
      resetQuaterlyState();
    };
  }, []);

  const handleMonthSelection = (month) => {
    if (selectedMonths.includes(month)) {
      // Remove the month from selectedMonths array
      const updatedMonths = selectedMonths.filter((m) => m !== month);
      handleSelectedMonthsForQuaterly(updatedMonths);
    } else {
      // Add the month to selectedMonths array
      const updatedMonths = [...selectedMonths, month];
      handleSelectedMonthsForQuaterly(updatedMonths);
    }
  };

  const handleDatesSelection = (date) => {
    const tempSelectedDates = [...selectedDatesForQuaterly];
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
      handleSelectedDatesForQuaterly(tempSelectedDates);
      return;
    }

    if (tempSelectedDates.includes(date)) {
      // Remove the date from tempSelectedDates array
      const updatedDates = tempSelectedDates.filter((d) => d !== date);
      handleSelectedDatesForQuaterly(updatedDates);
    } else {
      // Add the date to tempSelectedDates array
      const updatedDates = [...tempSelectedDates, date];
      handleSelectedDatesForQuaterly(updatedDates);
    }
  };

  const handleDaysSelection = (day) => {
    if (selectedDaysForQuaterly.includes(day)) {
      // Remove the day from selectedDaysForQuaterly array
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        handleSelectedDaysForQuaterly([]);
        return;
      }
      const updatedDays = selectedDaysForQuaterly.filter((d) => d !== day);
      handleSelectedDaysForQuaterly(updatedDays);
    } else {
      // Add the day to selectedDaysForQuaterly array
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        handleSelectedDaysForQuaterly([day]);
        return;
      }
      const updatedDays = [...selectedDaysForQuaterly, day];
      handleSelectedDaysForQuaterly(updatedDays);
    }
  };

  const handleWeeksSelection = (week) => {
    if (selectedWeeksForQuarterly.includes(week)) {
      // Remove the week from selectedWeeksForQuarterly array
      const updatedWeeks = selectedWeeksForQuarterly.filter((w) => w !== week);
      handleSelectedWeeksForQuaterly(updatedWeeks);
    } else {
      // Add the week to selectedWeeksForQuarterly array
      const updatedWeeks = [...selectedWeeksForQuarterly, week];
      handleSelectedWeeksForQuaterly(updatedWeeks);
    }
  };

  console.log(selectedMonths, "selectedMonths");
  return (
    <>
      {frequency.value === "quarterly" && (
        <div
          className={`${classes.monthlyFrequencyWrapper} ${classes.marginTop05}`}
        >
          <div className={classes.schedulerRepeatsLabel}>Repeats in the month</div>
          <div className={classes.schedulerLabelDivider} />
          <div className={classes.weekSelectionContainer}>
            {MONTH_SELECTION_CONST.map((month) => (
              <Chips
                key={month + "month"}
                label={getOrdinal(month)}
                isActive={selectedMonths.includes(month)}
                onClick={() => handleMonthSelection(month)}
                type="multi"
              />
            ))}
          </div>
        </div>
      )}
      {frequency.value === "quarterly" && frequencyType === "date" && (
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
                isActive={selectedDatesForQuaterly.includes(index + 1)}
                onClick={() => handleDatesSelection(index + 1)}
                type="multi"
              />
            ))}
          </div>
        </div>
      )}
      {frequency.value === "quarterly" && frequencyType === "day" && (
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
                  isActive={selectedDaysForQuaterly.includes(week)}
                  onClick={() => handleDaysSelection(week)}
                  type="multi"
                />
              ))}
            </div>

            <div>Of</div>
            <div className={classes.chipWrapRow}>
              {WEEK_DAYS.map((week) => (
                <Chips
                  key={week + "day"}
                  label={getOrdinal(week)}
                  isActive={selectedWeeksForQuarterly.includes(week)}
                  onClick={() => handleWeeksSelection(week)}
                  type="multi"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuaterlySelector;
