import { useState, useRef } from "react";
import { DatePicker } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import moment from "moment";

const DatePickerContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const {
    displayFormat,
    label,
    isRequired,
    labelOrientation,
    placeholder,
    minDate,
    maxDate,
    isDisabled,
    minStartDate,
  } = bodyText;
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState(persistedFormValues[formKey] || null);

  if (isEmpty(bodyText)) return null;

  const handleDateChange = (date) => {
    try {
      setSelectedDate(date);
      const latestContext = chatbotContextRef.current;
      dispatch(setChatbotContext({
        ...latestContext,
        [bodyText?.paramName]: {
          ...latestContext?.[bodyText?.paramName],
          [bodyText?.paramName]: moment(date).format(displayFormat),
          updated: true,
        },
      }));
      dispatch(setPersistedFormValues({ [formKey]: date }));
    } catch (error) {
      console.error("Error in datepicker handleChange", error);
    }
  };

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      <DatePicker
        displayFormat={displayFormat}
        label={label}
        required={isRequired}
        labelOrientation={labelOrientation}
        placeholder={placeholder}
        isOutsideRange={(day) => {
          // Disable dates before minStartDate
          const minimumStartDate = moment(minStartDate, displayFormat);
          return day <= minimumStartDate;
        }}
        // minDate={minDate}
        // maxDate={maxDate}
        isDisabled={isDisabled || isFormDisabled}
        setSelectedDate={(date) => handleDateChange(date)}
        // showMonthYearSelect
        // showWeekNumbers
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default DatePickerContent;
