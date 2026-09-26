import React, { useState } from "react";
import {
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "Styles/globalStyles";
import classNames from "classnames";
import ReactSelect from "core/Utils/select/index";
import DailySelector from "./DailySelector";
import WeeklySelector from "./WeeklySelector";
import MonthlySelector from "./MonthlySelector";
import { isEmpty } from "lodash";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { connect } from "react-redux";
import moment from "moment";
import { useEffect } from "react";
import {
  FREQUENCY_OPTIONS,
  MONTHLY_FREQUENCY_TYPE,
  NEVER_ENDING_DATE,
  WEEKDAYS,
} from "./autoAllocationConstant";
import { formateDate } from "core/Utils/functions/utils";

const FrequencySelector = ({ ruleData, setFormData, tenantDateFormat }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [frequency, setFrequency] = useState({});
  const [repeatOn, setRepeatOn] = useState("all_days");
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [startDate, setStartDate] = useState(moment());
  const [endDateOption, setEndDateOption] = useState("never_ending");
  const [endDate, setEndDate] = useState(moment(NEVER_ENDING_DATE));
  const [occurrences, setOccurrences] = useState("");
  const [selectedDaysForMonth, setSelectedDaysForMonth] = useState([]);
  const [selectedWeeksForMonth, setSelectedWeeksForMonth] = useState([]);
  const [frequencyType, setFrequencyType] = useState({
    label: "Date",
    value: "date",
  });

  useEffect(() => {
    let updatedStartDate = { start_date: startDate };
    setFormData((prev) => {
      return { ...prev, ...updatedStartDate };
    });
  }, [startDate]);

  useEffect(() => {
    let updatedEndDate = { end_date: endDate };
    setFormData((prev) => {
      return { ...prev, ...updatedEndDate };
    });
  }, [endDate]);

  useEffect(() => {
    let updatedWeekData = { selectedWeeks: selectedWeeks };
    setFormData((prev) => {
      return { ...prev, ...updatedWeekData };
    });
  }, [selectedWeeks]);

  useEffect(() => {
    let dates = {
      selectedDatesForMonthly: selectedDates.map((date) => date),
    };
    setFormData((prev) => {
      return { ...prev, ...dates };
    });
  }, [selectedDates]);

  useEffect(() => {
    let days = {
      selectedDaysForMonthly: selectedDaysForMonth,
    };
    setFormData((prev) => {
      return { ...prev, ...days };
    });
  }, [selectedDaysForMonth]);

  useEffect(() => {
    let weeks = {
      selectedWeeksForMonthly: selectedWeeksForMonth,
    };
    setFormData((prev) => {
      return { ...prev, ...weeks };
    });
  }, [selectedWeeksForMonth]);

  useEffect(() => {
    setFormData((prev) => {
      return { ...prev, [`num_of_occurrence`]: occurrences };
    });
  }, [occurrences]);

  useEffect(() => {
    // This effect set All the states in case of an edit operation
    if (ruleData) {
      setRepeatOn(ruleData?.repeat_on);
      setFrequency(
        FREQUENCY_OPTIONS.find(
          (frequency) => frequency.value === ruleData?.frequency_type
        )
      );
      ruleData?.month_toggle &&
        setFrequencyType(
          MONTHLY_FREQUENCY_TYPE.find(
            (item) => item.value === ruleData?.month_toggle
          )
        );
      setStartDate(formateDate(ruleData?.start_date));
      setEndDate(formateDate(ruleData?.end_date));
      setEndDateOption(ruleData?.end_date_options);
      setOccurrences(Number(ruleData?.num_of_occurrence));
      setSelectedDates(ruleData?.day_of_month);
      setSelectedWeeks(ruleData?.day_of_week);
      setSelectedDaysForMonth(ruleData?.day_of_week);
      setSelectedWeeksForMonth(ruleData?.week_of_month);
    }
  }, [ruleData]);

  const handleFrequencyChange = (frequency) => {
    let updatedData = { frequency_type: frequency.value };
    setFormData((prev) => {
      return { ...prev, ...updatedData };
    });
    setFrequency(frequency);
    setSelectedWeeks([]);
    setOccurrences(0);
    setSelectedDaysForMonth([]);
    setSelectedWeeksForMonth([]);
  };

  const handleRepeatOnChange = (e) => {
    setRepeatOn(e.target.value);
    setOccurrences(0);
    let dailyRepeatOn = { dailyRepeatOn: e.target.value };
    setFormData((prev) => {
      return { ...prev, ...dailyRepeatOn };
    });
  };

  const handleSelectedWeeksChange = (week) => {
    setOccurrences(0);
    if (selectedWeeks.includes(week)) {
      // If the week is already selected, remove it
      setSelectedWeeks(selectedWeeks.filter((day) => day !== week));
    } else {
      // If the week is not selected, add it
      setSelectedWeeks([...selectedWeeks, week]);
    }
  };

  const handleSelectedDatesChange = (date) => {
    if (selectedDates.includes(date)) {
      // If the week is already selected, remove it
      setSelectedDates(selectedDates.filter((day) => day !== date));
    } else {
      // If the week is not selected, add it
      setSelectedDates([...selectedDates, date]);
    }
    setOccurrences(0); // Reset occurrence in case of date change.
  };

  const handleFrequencyTypeChange = (option) => {

    setOccurrences(0);
    setSelectedDates([]);
    setSelectedDaysForMonth([]);
    setSelectedWeeksForMonth([]);
    setFrequencyType(option);
    setFormData((prev) => {
      return { ...prev, [`month_toggle`]: option };
    });
  };

  const handleSelectedDaysForMonth = (day) => {
    setOccurrences(0);
    if (selectedDaysForMonth.includes(day)) {
      setSelectedDaysForMonth(
        selectedDaysForMonth.filter((item) => item !== day)
      );
    } else {
      setSelectedDaysForMonth([...selectedDaysForMonth, day]);
    }
  };

  const handleSelectedWeeksForMonth = (date) => {
    setOccurrences(0);
    if (selectedWeeksForMonth.includes(date)) {
      setSelectedWeeksForMonth(
        selectedWeeksForMonth.filter((day) => day !== date)
      );
    } else {
      setSelectedWeeksForMonth([...selectedWeeksForMonth, date]);
    }
  };

  const handleStartDate = (date) => {
    setStartDate(date);
    let startDate = { start_date: date };
    setFormData((prev) => {
      return { ...prev, ...startDate };
    });
  };

  const handleEndDateSetup = (option) => {
    if (option === "never_ending") {
      setEndDate(moment(NEVER_ENDING_DATE));
    } else {
      setEndDate(moment());
    }
  };

  const handleEndDateChange = (option) => {
    handleEndDateSetup(option);
    setEndDateOption(option);
    setFormData((prev) => {
      return { ...prev, [`end_date_options`]: option };
    });
    setOccurrences(0);
  };

  /**
   * This function calculates end date based on occurrence for Daily frequency.
   * @param newOccurrences 
   * @returns  moment object
   */
  const computeEndDateForDaily = (newOccurrences) => {
    if (repeatOn === "all_days") {
      const computedEndDate = moment(startDate).add(newOccurrences - 1, "days");
      return computedEndDate;
    } else if (repeatOn === "week_days") {
      let count = 0;
      let currentDate = moment(startDate);
      while (count < newOccurrences) {
        if (currentDate.day() !== 0 && currentDate.day() !== 6) {
          // Exclude weekends (Saturday and Sunday)
          count++;
        }
        currentDate.add(1, "days");
      }
      return currentDate.subtract(1, "days");
    }
  };

  /**
   * This function calculate end date for Weekly frequency.
   * @param {string} startDate 
   * @param {array} selectedDays 
   * @param {number} occurrences 
   * @returns moment object
   */
  const computeEndDateForWeekly = (startDate, selectedDays, occurrences) => {
    let currentDate = moment(startDate);
    let count = 0;

    // Loop until we reach the desired number of occurrences
    while (count < occurrences) {
      // Check if the current day is one of the selected repetitions days
      if (selectedDays.includes(currentDate.format("dddd"))) {
        count++;
      }
      // Move to the next day
      currentDate.add(1, "days");
    }

    // Subtract 1 day to get the last occurrence date
    currentDate.subtract(1, "days");

    return currentDate;
  };

  /**
   * This function calculates the end date based on dates selected for the month.
   * @param {moment} startDate 
   * @param {array} selectedDates 
   * @param {number} occurrences 
   * @returns moment object of end date
   */

  const computeEndDateFoMonthlyDateWise = (
    startDate,
    selectedDates,
    occurrences
  ) => {
    let currentDate = moment(startDate);

    // Move to the next month
    currentDate.add(1, "months");

    // Sort selected dates in ascending order
    const sortedSelectedDates = selectedDates.sort((a, b) => a - b);

    let occurrenceCounter = 0;

    // Loop until we reach the desired number of occurrences
    while (occurrenceCounter < occurrences) {
      // Loop through each selected date
      for (const date of sortedSelectedDates) {
        // Increment occurrence counter
        occurrenceCounter++;

        // Set the current date to the selected date
        currentDate.date(date);

        // If the occurrence counter reaches the desired number, break the loop
        if (occurrenceCounter === occurrences) {
          break;
        }
      }

      // Move to the next month if all selected dates for the current month are exhausted
      if (occurrenceCounter < occurrences) {
        currentDate.add(1, "months");
      }
    }
    return currentDate;
  };

/**
 * Function to calculate end date based of selected days and weeks starting from start date 
 * @param {string} startDate 
 * @param {array} selectedDaysForMonth 
 * @param {array} selectedWeeksForMonth 
 * @param {number} occurrences 
 * @returns moment object of end date
 */
  const computeEndDateFoMonthlyDayWeekWise = (
    startDate,
    selectedDaysForMonth,
    selectedWeeksForMonth,
    occurrences
  ) => {
    const selectedDays = selectedDaysForMonth.map((day) => getDayIndex(day));

    let currentDate = moment(startDate);
    let foundOccurrences = 0;
    let occurrenceDate = null;

    // Find occurrences
    while (foundOccurrences < occurrences) {
      const dayOfWeek = currentDate.day();
      const weekOfMonth = getWeekOfMonth(currentDate);

      if (
        selectedDays.includes(dayOfWeek) &&
        selectedWeeksForMonth.includes(weekOfMonth)
      ) {
        foundOccurrences++;
        occurrenceDate = currentDate.clone(); // Store the occurrence date
      }

      // Move to the next day
      currentDate.add(1, "day");
    }

    return occurrenceDate ? occurrenceDate.toDate() : null;
  };

  const getDayIndex = (day) => {
    const days = WEEKDAYS;
    return days.indexOf(day.toLowerCase());
  };

  /**
   * Helper function to find out the week of the month
   * @param {moment} date 
   * @returns week number
   */
  const getWeekOfMonth = (date) => {
    const firstDayOfMonth = moment(date).startOf("month");
    const firstDayOfWeek = firstDayOfMonth.day();
    const adjustedFirstDay = firstDayOfMonth.subtract(firstDayOfWeek, "days");
    const diff = date.diff(adjustedFirstDay, "days");
    return Math.ceil((diff + 1) / 7);
  };

  /**
   *  This function takes in the number of occurrence and as per the 
   *  frequency (Daily, Weekly or Monthly) initiate end date calculation
   */
  const handleOccurrencesChange = (e) => {
    const newOccurrences = parseInt(e.target.value);
    setOccurrences(newOccurrences);
    switch (frequency.value) {
      case "daily": {
        /**
         ****Exp case*******         
         check repeat on: All day  
         check start date: 21 Mar 2024
         calculate end date as per the Occurrences selected: 6

         End date should be 27 (21 + 6 ) if All day
         End date should be 29 (21 + 6 ) if Week days (eliminating weekends)
        *  */
        setEndDate(computeEndDateForDaily(newOccurrences));

        break;
      }
      case "weekly": {
        /**
         ****Exp case*******
         check repeat on: Tue and Fri  
         check start date: 21 Mar 2024
         calculate end date as per the Occurrences selected: 6

         End date should be 9 May
        *  */
        const endDateWeekly = computeEndDateForWeekly(
          startDate,
          selectedWeeks,
          newOccurrences
        );
        setEndDate(endDateWeekly);

        break;
      }
      case "monthly": {
        /**
         ****Exp case*******
         ------------Case 1 ------------
         check repeat on: 1 and 2  
         check start date: 21 Mar 2024
         calculate end date as per the Occurrences selected: 6

         End date should be 6 June
         *  */

        if (frequencyType.value === "date") {
          const endDateMonthlyDateWise = computeEndDateFoMonthlyDateWise(
            startDate,
            selectedDates,
            newOccurrences
          );
          setEndDate(endDateMonthlyDateWise);
        }
        /**
         ****Exp case*******
         ------------Case 2 ------------
         check repeat on: Mon and Tue of 2nd and 4th week   
         check start date: 21 Mar 2024
         calculate end date as per the Occurrences selected: 6

         1st occurrence 8 April
         2nd Occurrence 9 april
         3rd Occurrence 22 april
         4th Occurrence 23 april
         5th Occurrence 6 May
         6th Occurrence 7 May
         End date should be  7th May
        *  */

        if (frequencyType.value === "day") {
          const endDateMonthlyDayWeekWise = computeEndDateFoMonthlyDayWeekWise(
            startDate,
            selectedDaysForMonth,
            selectedWeeksForMonth,
            newOccurrences
          );
          setEndDate(moment(endDateMonthlyDayWeekWise));
        }

        break;
      }
      default:
        break;
    }
  };

  const isNumOfOccurrenceEnabled = !( // After label will be enabled only if any of the date, day or weeks selected respective to frequency_type
    isEmpty(startDate) ||
    (frequency.value === "weekly" && selectedWeeks.length === 0) ||
    (frequency.value === "monthly" &&
      frequencyType.value === "date" &&
      selectedDates.length === 0) ||
    (frequency.value === "monthly" &&
      frequencyType.value === "day" &&
      (selectedDaysForMonth.length === 0 || selectedWeeksForMonth.length === 0))
  );

  return (
    <Paper
      elevation={4}
      className={classNames(
        globalClasses.paperWrapper,
        globalClasses.marginAround
      )}
    >
      <div className={classes.autoFlexRow}>
        <div className={classes.frequencyWrapper}>
          <div>Select Frequency<span style={{ color: "red" }}>*</span>:</div>
          <div className={classes.frequencySelector}>
            <ReactSelect
              placeholder="Select Frequency"
              isClearable={false}
              menuShouldBlockScroll={false}
              isMulti={false}
              options={FREQUENCY_OPTIONS}
              value={frequency}
              onChange={(option) => handleFrequencyChange(option)}
            />
          </div>
          {frequency.value === "monthly" && (
            <div className={classes.frequencySelector}>
              <ReactSelect
                placeholder="Select Frequency"
                isClearable={false}
                menuShouldBlockScroll={false}
                isMulti={false}
                options={MONTHLY_FREQUENCY_TYPE}
                value={frequencyType}
                onChange={(option) => handleFrequencyTypeChange(option)}
              />
            </div>
          )}
        </div>
      </div>

      {!isEmpty(frequency) && (
        <div>
          {frequency.value === "daily" && (
            <DailySelector
              repeatOn={repeatOn}
              handleRepeatOnChange={handleRepeatOnChange}
            />
          )}
          {frequency.value === "weekly" && (
            <WeeklySelector
              selectedWeeks={selectedWeeks}
              handleSelectedWeeksChange={handleSelectedWeeksChange}
            />
          )}
          {frequency.value === "monthly" && (
            <MonthlySelector
              frequency={frequency}
              frequencyType={frequencyType}
              selectedDates={selectedDates}
              selectedDaysForMonth={selectedDaysForMonth}
              selectedWeeksForMonth={selectedWeeksForMonth}
              handleSelectedDatesChange={handleSelectedDatesChange}
              handleSelectedDaysForMonth={handleSelectedDaysForMonth}
              handleSelectedWeeksForMonth={handleSelectedWeeksForMonth}
            />
          )}
          <div className={classes.frequencyWrapper}>
            <div>Starts On<span style={{ color: "red" }}>*</span>:</div>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                disableToolbar
                disablePast
                variant="inline"
                inputVariant="outlined"
                inputFormat={tenantDateFormat}
                className={classes.autoAllocationDatePicker}
                id="date-picker"
                value={startDate}
                onChange={(event) => handleStartDate(event)}
                renderInput={(props) => <TextField {...props} />}
                keyboardIcon={<CalendarMonthIcon />}
              />
            </LocalizationProvider>
          </div>
          <div className={classes.frequencyWrapper}>
            <div>Ends On<span style={{ color: "red" }}>*</span>:</div>
            <FormControl component="fieldset">
              <RadioGroup
                row
                aria-label="end-date-option"
                name="end-date-option"
                value={endDateOption}
                onChange={(e) => handleEndDateChange(e.target.value)}
              >
                <FormControlLabel
                  value="never_ending"
                  control={<Radio disabled={isEmpty(startDate)} />}
                  label="Never"
                />
                <FormControlLabel
                  value="end_date"
                  control={<Radio disabled={isEmpty(startDate)} />}
                  label="On"
                />
                <FormControlLabel
                  value="num_of_occurrence"
                  control={<Radio     
                    disabled={!isNumOfOccurrenceEnabled} // if After forGroupLabel is disabled Number of occurance be hidden
                  />
                }
                  label="After"
                />
              </RadioGroup>
            </FormControl>
          </div>
          {endDateOption === "end_date" && (
            <div className={classes.frequencyWrapper}>
              <div>End Date:</div>
              <LocalizationProvider dateAdapter={AdapterMoment}>
                <DatePicker
                  disableToolbar
                  disablePast
                  minDate={startDate}
                  variant="inline"
                  inputVariant="outlined"
                  inputFormat={tenantDateFormat}
                  className={classes.autoAllocationDatePicker}
                  id="date-picker"
                  value={endDate}
                  onChange={(event) => setEndDate(event)}
                  renderInput={(props) => <TextField {...props} />}
                  keyboardIcon={<CalendarMonthIcon />}
                />
              </LocalizationProvider>
            </div>
          )}
          {endDateOption === "num_of_occurrence" && isNumOfOccurrenceEnabled && (
            <div className={classes.frequencyWrapper}>
              <div>Number of Occurrences<span style={{ color: "red" }}>*</span>:</div>
              <TextField
                required={true}
                id="standard-error-helper-text"
                error={isNaN(occurrences) || occurrences <= 0}
                helperText={isNaN(occurrences) || occurrences <= 0 && "Occurrence should be > 0"}
                variant="outlined"
                type="number"
                className={classes.autoAllocationTextField}
                value={occurrences}
                onChange={handleOccurrencesChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              {occurrences > 0 && (
                <div>
                  <h5>
                    Computed End Date:{" "}
                    {formateDate(endDate)}
                  </h5>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Paper>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
  };
};
export default connect(mapStateToProps, null)(FrequencySelector);
