import { DEFAULT_DATE_FORMAT } from "config/constants";
import RangePicker from "core/commonComponents/dateRangePicker";
import { Button, Menu, MenuItem } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import clsx from "clsx";

const useStyles = makeStyles((_theme) => ({
  list: {
    display: "flex",
    flexDirection: "column",
    height: "400px",
    justifyContent: "space-between",
    minWidth: "22rem",
  },
}));

const CustomDatePicker = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const divStyling = clsx(
    globalClasses.flexRow,
    globalClasses.layoutAlignBetweenCenter,
    globalClasses.marginHorizontal
  );

  return (
    <>
      {props.open && (
        <Menu
          anchorEl={props.anchorEl}
          open={props.open}
          onClose={props.handleClose}
          PaperProps={{
            style: {
              height: "400px",
            },
          }}
          classes={{ list: classes.list }}
        >
          <MenuItem>
            <RangePicker
              disabled={props.isDisabled}
              disableType={"disableOnlyPast"}
              startDateId="start_date_id"
              endDateId="end_date_id"
              startDate={props.startDate}
              endDate={props.endDate}
              noPortal={true}
              numberOfMonths={1}
              onDatesChange={(start, end) => {
                props.setstartDate(start);
                props.setendDate(end);
              }}
              dateFormat={DEFAULT_DATE_FORMAT}
            />
          </MenuItem>
          <div className={divStyling}>
            <Button onClick={props.handleClose}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={props.onDatesSelectionConfirm}
            >
              Apply
            </Button>
          </div>
        </Menu>
      )}
    </>
  );
};

export default CustomDatePicker;
