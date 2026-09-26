import React, { useReducer, useState } from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import ReactSelect from "core/Utils/select/index";
import DailySelector from "./DailySelector";
import WeeklySelector from "./WeeklySelector";
import MonthlySelector from "./MonthlySelector";
import { isEmpty } from "lodash";
import { connect } from "react-redux";
import moment from "moment";
import { useEffect } from "react";
import {
  MONTHLY_FREQUENCY_TYPE,
  NEVER_ENDING_DATE,
  WEEK_DAYS_SELECTION_CONST,
} from "./autoAllocationConstants";
import QuaterlySelector from "./QuaterlySelector";
import YearlySelector from "./YearlySelector";
import { arrangeDatesByWeek, getWeekValue } from "./utility";
import { Select, RadioButtonGroup } from "impact-ui-v3";

const FrequencySelector = ({
  formData,
  ruleData,
  setFormData,
  tenantDateFormat,
  configDetails,
  startingDate,
  frequencyOptions,
  setSchedulerRule,
}) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [frequency, setFrequency] = useState(frequencyOptions[0]);
  const [repeatOn, setRepeatOn] = useState("week_days");
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [startDate, setStartDate] = useState(moment());
  const [endDateOption, setEndDateOption] = useState("never_ending");
  const [endDate, setEndDate] = useState(moment(NEVER_ENDING_DATE));
  const [occurrences, setOccurrences] = useState(0);
  const [selectedDaysForMonth, setSelectedDaysForMonth] = useState([]);
  const [selectedWeeksForMonth, setSelectedWeeksForMonth] = useState([]);
  const [frequencyType, setFrequencyType] = useState("date");
  const [currentOptions, setCurrentOptions] = useState(frequencyOptions);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(frequency);

  const initialQuaterlyState = {
    selectedMonths: [],
    selectedDatesForQuaterly: [],
    selectedDaysForQuaterly: [],
    selectedWeeksForQuarterly: [],
  };
  const initialYearlyState = {
    selectedMonthsForYearly: [],
    selectedDatesForYearly: [],
    selectedDaysForYearly: [],
    selectedWeeksForYearly: [],
  };

  const quaterlyReducer = (state, action) => {
    switch (action.type) {
      case "SET_SELECTED_MONTHS":
        return { ...state, selectedMonths: action.payload };
      case "SET_SELECTED_DATES_FOR_QUATERLY":
        return { ...state, selectedDatesForQuaterly: action.payload };
      case "SET_SELECTED_DAYS_FOR_QUATERLY":
        return { ...state, selectedDaysForQuaterly: action.payload };
      case "SET_SELECTED_WEEKS_FOR_QUARTERLY":
        return { ...state, selectedWeeksForQuarterly: action.payload };
      case "RESET":
        return { ...initialQuaterlyState };
      case "PRESET_QUATERLY_STATE":
        return { ...action.payload };
      default:
        return state;
    }
  };
  const yearlyReducer = (state, action) => {
    switch (action.type) {
      case "SET_SELECTED_MONTHS_FOR_YEARLY":
        return { ...state, selectedMonthsForYearly: action.payload };
      case "SET_SELECTED_DATES_FOR_YEARLY":
        return { ...state, selectedDatesForYearly: action.payload };
      case "SET_SELECTED_DAYS_FOR_YEARLY":
        return { ...state, selectedDaysForYearly: action.payload };
      case "SET_SELECTED_WEEKS_FOR_YEARLY":
        return { ...state, selectedWeeksForYearly: action.payload };
      case "RESET":
        return { ...initialYearlyState };
      case "PRESET_YEARLY_STATE":
        return { ...action.payload };
      default:
        return state;
    }
  };

  const [quaterlyState, quaterlyDispatch] = useReducer(
    quaterlyReducer,
    initialQuaterlyState
  );
  const [yearlyState, yearlyDispatch] = useReducer(
    yearlyReducer,
    initialYearlyState
  );

  const handleSelectedMonthsChange = (months) => {
    quaterlyDispatch({ type: "SET_SELECTED_MONTHS", payload: months });
  };

  const handleSelectedDatesForQuaterlyChange = (dates) => {
    quaterlyDispatch({
      type: "SET_SELECTED_DATES_FOR_QUATERLY",
      payload: dates,
    });
  };

  const handleSelectedDaysForQuaterlyChange = (days) => {
    quaterlyDispatch({ type: "SET_SELECTED_DAYS_FOR_QUATERLY", payload: days });
  };

  const handleSelectedWeeksForQuaterlyChange = (weeks) => {
    quaterlyDispatch({
      type: "SET_SELECTED_WEEKS_FOR_QUARTERLY",
      payload: weeks,
    });
  };
  const resetQuaterlyState = () => {
    quaterlyDispatch({
      type: "RESET",
    });
  };
  const presetQuaterlyState = (presetState) => {
    quaterlyDispatch({ type: "PRESET_QUATERLY_STATE", payload: presetState });
  };

  const handleSelectedMonthsForYearlyChange = (months) => {
    yearlyDispatch({ type: "SET_SELECTED_MONTHS_FOR_YEARLY", payload: months });
  };

  const handleSelectedDatesForYearlyChange = (dates) => {
    yearlyDispatch({
      type: "SET_SELECTED_DATES_FOR_YEARLY",
      payload: dates,
    });
  };

  const handleSelectedDaysForYearlyChange = (days) => {
    yearlyDispatch({ type: "SET_SELECTED_DAYS_FOR_YEARLY", payload: days });
  };

  const handleSelectedWeeksForYearlyChange = (weeks) => {
    yearlyDispatch({
      type: "SET_SELECTED_WEEKS_FOR_YEARLY",
      payload: weeks,
    });
  };
  const resetYearlyState = () => {
    yearlyDispatch({
      type: "RESET",
    });
  };

  const presetYearlyState = (presetState) => {
    yearlyDispatch({ type: "PRESET_YEARLY_STATE", payload: presetState });
  };

  useEffect(() => {
    // This effect set All the states in case of an edit operation
    if (ruleData) {
      const tempSelectedDates = arrangeDatesByWeek(
        ruleData?.selectedDatesForMonthly,
        configDetails?.schedulerDetails?.frequencyDetails?.date?.weeklySelectOne
      );
      setFormData((prev) => {
        return { ...prev, ...ruleData };
      });
      setRepeatOn(ruleData?.dailyRepeatOn);
      setFrequency(
        frequencyOptions.find((item) => item.value === ruleData?.frequency_type)
      );
      if (ruleData?.month_toggle) {
        ruleData.month_toggle?.value
          ? setFrequencyType(ruleData?.month_toggle?.value)
          : setFrequencyType(ruleData?.month_toggle);
      }
      setSelectedOptions(
        frequencyOptions.find((item) => item.value === ruleData?.frequency_type)
      );
      setStartDate(ruleData?.start_date);
      setEndDate(ruleData?.end_date);
      setEndDateOption(ruleData?.end_date_options);
      setOccurrences(Number(ruleData?.num_of_occurrence));
      setSelectedDates(tempSelectedDates);
      setSelectedWeeks(ruleData?.selectedWeeks || []);
      setSelectedDaysForMonth(ruleData?.selectedDaysForMonthly || []);
      setSelectedWeeksForMonth(ruleData?.selectedWeeksForMonthly || []);
      presetQuaterlyState({
        selectedMonths: ruleData?.selectedMonths || [],
        selectedDatesForQuaterly: ruleData?.selectedDatesForQuaterly || [],
        selectedDaysForQuaterly: ruleData?.selectedDaysForQuaterly || [],
        selectedWeeksForQuarterly: ruleData?.selectedWeeksForQuarterly || [],
      });
      presetYearlyState({
        selectedMonthsForYearly: ruleData?.selectedMonthsForYearly || [],
        selectedDatesForYearly: ruleData?.selectedDatesForYearly || [],
        selectedDaysForYearly: ruleData?.selectedDaysForYearly || [],
        selectedWeeksForYearly: ruleData?.selectedWeeksForYearly || [],
      });
    }
  }, [ruleData]);

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
    setFormData((prev) => {
      return { ...prev, ...quaterlyState };
    });
  }, [quaterlyState]);

  useEffect(() => {
    setFormData((prev) => {
      return { ...prev, ...yearlyState };
    });
  }, [yearlyState]);

  useEffect(() => {
    let updatedEndDateOptions = { end_date_options: endDateOption };
    setFormData((prev) => {
      return { ...prev, ...updatedEndDateOptions };
    });
  }, [endDateOption]);

  const handleFrequencyChange = (frequency) => {
    let updatedData = { frequency_type: frequency.value };
    if (
      frequency.value === "monthly" ||
      frequency.value === "quaterly" ||
      (frequency.value === "yearly" && !formData["month_toggle"])
    ) {
      updatedData["month_toggle"] = "date";
    }
    setFormData((prev) => {
      return { ...prev, ...updatedData };
    });
    setSchedulerRule((prev) => ({ ...prev, ...updatedData }));
    setFrequency(frequency);
    setSelectedWeeks([]);
    setOccurrences(0);
    setSelectedDaysForMonth([]);
    setSelectedWeeksForMonth([]);
    setSelectedDates([]);
    resetQuaterlyState();
    resetYearlyState();
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
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        setSelectedWeeks([]);
        return;
      }
      setSelectedWeeks(selectedWeeks.filter((day) => day !== week));
    } else {
      // If the week is not selected, add it
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        setSelectedWeeks([week]);
        return;
      }
      setSelectedWeeks([...selectedWeeks, week]);
    }
  };

  const handleSelectedDatesChange = (date) => {
    const tempSelectedDates = [...selectedDates];
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
      setSelectedDates(tempSelectedDates);
      return;
    }

    if (tempSelectedDates.includes(date)) {
      // If the week is already selected, remove it
      setSelectedDates(tempSelectedDates.filter((day) => day !== date));
    } else {
      // If the week is not selected, add it
      setSelectedDates([...tempSelectedDates, date]);
    }
  };

  const handleFrequencyTypeChange = (option) => {
    setOccurrences(0);
    setSelectedDates([]);
    setSelectedDaysForMonth([]);
    setSelectedWeeksForMonth([]);
    resetQuaterlyState();
    resetYearlyState();
    setFrequencyType(option);
    setFormData((prev) => {
      return { [`month_toggle`]: option, frequency_type: prev.frequency_type };
    });
    setSchedulerRule((prev) => ({
      [`month_toggle`]: option,
      frequency_type: prev.frequency_type,
    }));
  };

  const handleSelectedDaysForMonth = (day) => {
    setOccurrences(0);
    if (selectedDaysForMonth.includes(day)) {
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        setSelectedDaysForMonth([]);
        return;
      }
      setSelectedDaysForMonth(
        selectedDaysForMonth.filter((d) => d !== day)
      );
    } else {
      if (
        configDetails &&
        configDetails?.schedulerDetails?.repeatsOn?.day?.singleSelect
      ) {
        setSelectedDaysForMonth([day]);
        return;
      }
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
    //convert days to lower case and get index
    const days = WEEK_DAYS_SELECTION_CONST;
    const lowerCaseDays = days.map((day) => day.toLowerCase());
    const dayIndex = lowerCaseDays.indexOf(day.toLowerCase());
    return dayIndex;
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

  return (
    <div
      className={`${classes.frequencyDetailsContainer} ${classes.marginTop05}`}
    >
      <div className={classes.frequencyWrapper}>
        <div className={classes.schedulerFieldLabel}>Select frequency</div>
        <div className={classes.frequencySelector}>
          <Select
            placeholder="Select Frequency"
            width="284px"
            minWidth="284px"
            isClearable={false}
            menuShouldBlockScroll={false}
            isMulti={false}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            setCurrentOptions={setCurrentOptions}
            currentOptions={currentOptions}
            selectedOptions={selectedOptions}
            initialOptions={currentOptions}
            data-testid={`select${"name"}`}
            handleChange={(option) => handleFrequencyChange(option)}
            setSelectedOptions={setSelectedOptions}
          />
        </div>
      </div>
      {!!frequency &&
      ["monthly", "quarterly", "yearly"].includes(frequency.value) ? (
        <div className={classes.marginTop05}>
          <RadioButtonGroup
            name="fr-selection-radio-group"
            onChange={(e) => handleFrequencyTypeChange(e.target.value)}
            options={MONTHLY_FREQUENCY_TYPE}
            orientation="row"
            selectedOption={frequencyType}
          />
        </div>
      ) : null}

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
          {frequency.value === "quarterly" && (
            <QuaterlySelector
              frequency={frequency}
              frequencyType={frequencyType}
              quaterlyState={quaterlyState}
              configDetails={configDetails}
              handleSelectedMonthsForQuaterly={handleSelectedMonthsChange}
              handleSelectedDatesForQuaterly={
                handleSelectedDatesForQuaterlyChange
              }
              handleSelectedDaysForQuaterly={
                handleSelectedDaysForQuaterlyChange
              }
              handleSelectedWeeksForQuaterly={
                handleSelectedWeeksForQuaterlyChange
              }
              resetQuaterlyState={resetQuaterlyState}
            />
          )}
          {frequency.value === "yearly" && (
            <YearlySelector
              frequency={frequency}
              frequencyType={frequencyType}
              yearlyState={yearlyState}
              configDetails={configDetails}
              handleSelectedMonthsForYearly={
                handleSelectedMonthsForYearlyChange
              }
              handleSelectedDatesForYearly={handleSelectedDatesForYearlyChange}
              handleSelectedDaysForYearly={handleSelectedDaysForYearlyChange}
              handleSelectedWeeksForYearly={handleSelectedWeeksForYearlyChange}
              resetYearlyState={resetYearlyState}
            />
          )}
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
  };
};

export const ConnectedFrequencySelector = connect(
  mapStateToProps,
  null
)(FrequencySelector);
