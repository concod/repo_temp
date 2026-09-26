import { Button, Chips } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { WEEK_DAYS_SELECTION_CONST } from "./autoAllocationConstants";
import colors from "core/Styles/colours";

const WeeklySelector = ({ selectedWeeks, handleSelectedWeeksChange }) => {
  const classes = useStyles();

  return (
    <div className={`${classes.frequencyWrapper} ${classes.marginTop05}`}>
      <div className={classes.schedulerRepeatsLabel}>Repeats on</div>
      <div className={classes.schedulerLabelDivider} />
      <div className={classes.weekSelectionContainer}>
        {WEEK_DAYS_SELECTION_CONST.map((week) => (
          <Chips
            key={week}
            label={week}
            isActive={selectedWeeks.includes(week)}
            onClick={() => handleSelectedWeeksChange(week)}
            type="multi"
          />
        ))}
      </div>
    </div>
  );
};

export default WeeklySelector;
