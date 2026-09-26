import { Button } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { WEEK_SELECTION_CONST } from "./autoAllocationConstant";

const WeeklySelector = ({ selectedWeeks, handleSelectedWeeksChange }) => {
  const classes = useStyles();

  return (
    <div>
      <div className={classes.frequencyWrapper}>
        <div>Repeats On:<span style={{ color: "red" }}>*</span></div>
        <div>
          {WEEK_SELECTION_CONST.map((week) => (
            <Button
              key={week}
              className={`${classes.weekSelectionMargin} ${
                selectedWeeks.includes(week)
                  ? classes.weekSelectionCustomBorder
                  : ""
              }`}
              onClick={() => handleSelectedWeeksChange(week)}
            >
              {week}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklySelector;
