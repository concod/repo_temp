import globalStyles from "core/Styles/globalStyles";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import CloseIcon from "assets/closeIcon.svg";
import AddButtonIcon from "assets/addButtonIcon.svg";
import { useEffect, useState } from "react";
import "./index.scss";
import moment from "moment";
import { isEmpty } from "lodash";

const SingleDatePicker = (props) => {
  const { startDate: startDateCopy, endDate: endDateCopy, index, onDateChange } = props;
  const [startDate, setStartDate] = useState(startDateCopy);
  const [endDate, setEndDate] = useState(endDateCopy);
  const [focusedInput, setFocusedInput] = useState(null);

  const onFocusChange = (inp) => {
    setFocusedInput(inp);
  };

  const onChange = (startDate, endDate) => {
    setStartDate(startDate);
    setEndDate(endDate);
    onDateChange(startDate, endDate, index);
  }

  return (
    <DateRangePicker
      startDate={startDate ? moment(startDate) : ""}
      endDate={endDate ? moment(endDate) : ""}
      focusedInput={focusedInput}
      onDatesChange={onChange}
      onFocusChange={onFocusChange}
      showClearDates={false}
      disableType={"disableOnlyPast"}
      isAgGridCellRenderer={props?.isAgGridCellRenderer}
    />
  );
};

const MultipleDateRangePicker = (props) => {
  const [dateValues, setDateValues] = useState([]);

  const { onCellValueChanged } = props;
  /**
   * removeDatePicker function will be used to
   * remove a date range picker
   */
  const removeDatePicker = (index) => {
    try {
      let values = [...dateValues];
      values?.splice(index, 1);
      onCellValueChanged && onCellValueChanged(values);
      setDateValues(values);
    } catch (error) {
      console.error("removeDatePicker error", error);
    }
  };

  /**
   * addDatePicker function will be used to
   * add new date range picker
   */
  const addDatePicker = () => {
    try {
      let values = [...dateValues];
      let newDates = [moment().format("YYYY-MM-DD"), moment().add(10, 'years').format("YYYY-MM-DD")];
      values.push(newDates);
      onCellValueChanged && onCellValueChanged(values);
      setDateValues(values);
    } catch (error) {
      console.error("addDatePicker error", error);
    }
  };

/**
   * onDateChange function will be used to
   * edit an existing date range.
   */
  const onDateChange = (startDate, endDate, index) => {
    try {
      let newStartDate = startDate;
      let newEndDate = endDate;
  
      if (!startDate && !endDate) {
        // When both start and end dates are not present
        newStartDate = moment(); // Set start date to today's date
        newEndDate = moment().add(10, 'years'); // Set end date to 10 years ahead
      } else if (!endDate) {
        // When only end date is not present
        newStartDate = startDate;
        newEndDate = startDate.clone().add(10, 'years');
      }
  
      const newDates = [newStartDate.format('YYYY-MM-DD'), newEndDate.format('YYYY-MM-DD')];
      const updatedValues = dateValues.map((value, i) => (i === index ? newDates : value));
      setDateValues(updatedValues);
      onCellValueChanged && onCellValueChanged(updatedValues);
    } catch (error) {
      console.error('Error in setting dates', error);
    }
  };

  useEffect(() => {
    isEmpty(props.value) ? setDateValues([]) : setDateValues(props.value);
  }, [props.value]);

  return (
    <div className="date-containers">
      {dateValues?.map((date, index) => (
        <div className="date-containers__single">
          <SingleDatePicker
            startDate={date[0]}
            endDate={date[1]}
            index={index}
            onDateChange={onDateChange}
          />
          <div
            onClick={() => removeDatePicker(index)}
            className="date-containers__button--delete"
          >
            <CloseIcon viewBox="0 0 20 20" />
          </div>
        </div>
      ))}
      <div onClick={() => addDatePicker()} className="date-containers__button--add">
        <AddButtonIcon viewBox="0 0 24 24" />
      </div>
    </div>
  );
};

export default MultipleDateRangePicker;
