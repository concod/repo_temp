import React from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

import {
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";

const DateAndOccurrenceComponent = (props) => {
  const {
    tenantDateFormat,
    startDate,
    handleStartDate,
    endDateOption,
    handleEndDateChange,
    endDate,
    setEndDate,
    handleOccurrencesChange,
    occurrences,
  } = props;
  const classes = useStyles();
  return (
    <>
      <div className={classes.frequencyWrapper}>
        <div>Starts On:</div>
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
        <div>End Date Option:</div>
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
              control={<Radio disabled={!startDate} />}
              label="Never Ending"
            />
            <FormControlLabel
              value="end_date"
              control={<Radio disabled={!startDate} />}
              label="End Date"
            />
            <FormControlLabel
              value="num_of_occurrence"
              control={<Radio disabled={!startDate} />}
              label="Number of Occurrences"
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
              variant="inline"
              inputVariant="outlined"
              inputFormat={tenantDateFormat}
              className={classes.autoAllocationDatePicker}
              id="date-picker"
              value={endDate}
              onChange={(event) => setEndDate(event)}
              renderInput={(props) => <TextField {...props} />}
              keyboardIcon={<CalendarMonthIcon />}
              disablePast
            />
          </LocalizationProvider>
        </div>
      )}
      {endDateOption === "num_of_occurrence" && (
        <div className={classes.frequencyWrapper}>
          <div>Number of Occurrences:</div>
          <TextField
            required={true}
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
                {typeof endDate === "string"
                  ? endDate
                  : endDate?.format("MM-DD-YYYY")}
              </h5>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DateAndOccurrenceComponent;
