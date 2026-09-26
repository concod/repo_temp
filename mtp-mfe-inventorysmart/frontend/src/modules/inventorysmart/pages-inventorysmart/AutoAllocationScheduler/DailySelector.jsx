import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { RadioButtonGroup } from "impact-ui-v3";

const DailySelector = ({ repeatOn, handleRepeatOnChange }) => {
  const classes = useStyles();

  return (
    <div>
      <div className={`${classes.frequencyWrapper} ${classes.marginTop05}`}>
        <div className={classes.schedulerRepeatsLabel}>Repeats on</div>
        <div className={classes.schedulerLabelDivider} />
        <RadioButtonGroup
          name="day-selection-radio-group"
          onChange={handleRepeatOnChange}
          options={[
            {
              label: "Week Days",
              value: "week_days",
            },
          ]}
          orientation="row"
          selectedOption={repeatOn}
        />
      </div>
    </div>
  );
};

export default DailySelector;
