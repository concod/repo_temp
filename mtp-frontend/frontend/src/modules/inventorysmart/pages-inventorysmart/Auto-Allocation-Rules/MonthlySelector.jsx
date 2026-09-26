import { Button } from "@mui/material";

import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import "./autoAllocation.css";
import { getOrdinal } from "core/Utils/functions/utils";
import { WEEK_DAYS, WEEK_SELECTION_CONST } from "./autoAllocationConstant";

const MonthlySelector = ({
  frequency,
  frequencyType,
  selectedDates,
  selectedDaysForMonth,
  selectedWeeksForMonth,
  handleSelectedDaysForMonth,
  handleSelectedWeeksForMonth,
  handleSelectedDatesChange,
}) => {
  const classes = useStyles();

  return (
    <div className={classes.marginAround}>
      {frequency.value === "monthly" && frequencyType.value === "date" && (
        <div className={classes.monthlyFreqSelector}>
          {[...Array(31)].map((_, index) => (
            <Button
              key={index}
              className="button-css"
              style={{
                backgroundColor: selectedDates.includes(index + 1)
                  ? "#0051A8"
                  : "#F7F7F7",
                color: selectedDates.includes(index + 1)
                  ? "#FFFFFF"
                  : "#000000",
              }}
              onClick={() => handleSelectedDatesChange(index + 1)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      )}
      {frequency.value === "monthly" && frequencyType.value === "day" && (
        <div className={classes.monthWeekWrapper}>
          <div className={classes.frequencyWrapper}>
            <div>Repeats on:<span style={{ color: "red" }}>*</span></div>
            <div>
              {WEEK_SELECTION_CONST.map((week) => (
                <Button
                  key={week}
                  className={`${classes.weekSelectionMargin} ${
                    selectedDaysForMonth.includes(week)
                      ? classes.weekSelectionCustomBorder
                      : ""
                  }`}
                  onClick={() => handleSelectedDaysForMonth(week)}
                >
                  {week}
                </Button>
              ))}
            </div>
          </div>
          <div className={classes.frequencyWrapper}>
            <div>Of </div>
            {/* Buttons for selecting weeks */}
            {WEEK_DAYS.map((week) => (
              <Button
                key={week}
                className={`${classes.weekSelectionMargin} ${
                  selectedWeeksForMonth.includes(week)
                    ? classes.weekSelectionCustomBorder
                    : ""
                }`}
                onClick={() => handleSelectedWeeksForMonth(week)}
              >
                {getOrdinal(week)} Week
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlySelector;
