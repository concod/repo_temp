import { Button, Chips } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  NO_OF_DAYS_IN_MONTH,
  WEEK_DAYS,
  WEEK_DAYS_SELECTION_CONST,
} from "./autoAllocationConstants";
import { getOrdinal } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import colors from "core/Styles/colours";
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
    <div className={classes.marginTop05}>
      {frequency.value === "monthly" && frequencyType === "date" && (
        <div className={classes.monthlyFrequencyWrapper}>
          <div className={classes.schedulerRepeatsLabel}>Repeats on</div>
          <div className={classes.schedulerLabelDivider} />
          <div className={classes.dateGridSelector}>
            {[...Array(NO_OF_DAYS_IN_MONTH)].map((_, index) => (
              <Chips
                key={index}
                label={index + 1}
                isActive={selectedDates.includes(index + 1)}
                onClick={() => handleSelectedDatesChange(index + 1)}
                type="multi"
              />
            ))}
          </div>
        </div>
      )}
      {frequency.value === "monthly" && frequencyType === "day" && (
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
                  isActive={selectedDaysForMonth.includes(week)}
                  onClick={() => handleSelectedDaysForMonth(week)}
                  type="multi"
                />
              ))}
            </div>

            <div>Of</div>
            <div className={classes.chipWrapRow}>
              {WEEK_DAYS.map((week) => (
                <Chips
                  key={week}
                  label={getOrdinal(week)}
                  isActive={selectedWeeksForMonth.includes(week)}
                  onClick={() => handleSelectedWeeksForMonth(week)}
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

export default MonthlySelector;
