// Chart Icon cell renderer

import { useEffect, useState } from "react";
import { IconButton } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CustomDatePicker from "core/Utils/customDatePicker";

const CalendarCell = (props) => {
  const [startDate, setstartDate] = useState(
    props?.data?.add_icon ? props?.data?.add_icon[0] : null
  );
  const [endDate, setendDate] = useState(
    props?.data?.add_icon ? props?.data?.add_icon[1] : null
  );
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const onDatesSelectionConfirm = () => {
    if (startDate === null) {
      //Start date is mandatory, so we need to select atleast start date
      //and by default end date becomes 2050-12-31 if unselected to a specific date
      return;
    }
    const { onApplyCalendarDates, ...gridInstance } = props;
    onApplyCalendarDates(gridInstance, [startDate, endDate]);
    setAnchorEl(null);
    setstartDate(null);
    setendDate(null);
  };
  
  useEffect(() => {
    setstartDate(props.data.add_icon ? props.data.add_icon[0] : null);
    setendDate(props.data.add_icon ? props.data.add_icon[1] : null);
  }, [props.data.add_icon]);

  return (
    <>
      <IconButton
        onClick={handleClick}
        disabled={
          props.node.data.is_calendar_disabled || props.column.isDisabled
        }
      >
        <AddCircleIcon />
      </IconButton>
      <CustomDatePicker
        open={open}
        anchorEl={anchorEl}
        startDate={startDate}
        endDate={endDate}
        isDisabled={
          props.node.data.is_calendar_disabled || props.column.isDisabled
        }
        setstartDate={setstartDate}
        setendDate={setendDate}
        onDatesSelectionConfirm={onDatesSelectionConfirm}
        handleClose={handleClose}
      />
    </>
  );
};

export default CalendarCell;
