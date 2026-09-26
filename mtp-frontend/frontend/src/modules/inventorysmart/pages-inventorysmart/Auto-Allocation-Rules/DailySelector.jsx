import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const DailySelector = ({
  repeatOn,
  handleRepeatOnChange,
}) => {
  const classes = useStyles();

  return (
    <div>
      <div className={classes.frequencyWrapper}>
        <div>Repeats on:<span style={{ color: "red" }}>*</span></div>
        <div>
          <FormControl>
            <RadioGroup
              row
              aria-labelledby="demo-radio-buttons-group-label"
              value={repeatOn}
              defaultValue="all_days"
              name="radio-buttons-group"
              onChange={handleRepeatOnChange}
            >
              <FormControlLabel
                value="all_days"
                control={<Radio />}
                label="All Days"
              />
              <FormControlLabel
                value="week_days"
                control={<Radio />}
                label="Week Days"
              />
            </RadioGroup>
          </FormControl>
        </div>
      </div>
    </div>
  );
};

export default DailySelector;
