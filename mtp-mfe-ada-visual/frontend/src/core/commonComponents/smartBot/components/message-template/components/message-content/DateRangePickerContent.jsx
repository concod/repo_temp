import { useState } from "react";
import { DateRangePicker } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import moment from "moment";

const DateRangePickerContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const {
    displayFormat,
    label,
    isRequired,
    labelOrientation,
    minDate,
    maxDate,
    isDisabled,
    showMonthYearSelect,
    minStartDate,
  } = bodyText;
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const dispatch = useDispatch();
  const [startDate, setStartDate] = useState(persistedFormValues[formKey]?.startDate || null);
  const [endDate, setEndDate] = useState(persistedFormValues[formKey]?.endDate || null);

  if (isEmpty(bodyText)) return null;

  const handleDatesChange = (start, end) => {
    try {
      setStartDate(start);
      setEndDate(end);
      chatbotContext[bodyText?.paramName] = {
        ...chatbotContext?.[bodyText?.paramName],
        [bodyText?.paramName]: {
          startDate: start ? moment(start).format(displayFormat) : null,
          endDate: end ? moment(end).format(displayFormat) : null,
        },
        updated: true,
      };
      dispatch(setChatbotContext(chatbotContext));
      dispatch(setPersistedFormValues({ [formKey]: { startDate: start, endDate: end } }));
    } catch (error) {
      console.error("Error in dateRangePicker handleDatesChange", error);
    }
  };

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      <DateRangePicker
        displayFormat={displayFormat}
        label={label}
        isRequired={isRequired}
        labelOrientation={labelOrientation || "top"}
        isOutsideRange={(day) => {
          // Disable dates before minStartDate
          const minimumStartDate = moment(minStartDate, displayFormat);
          return day <= minimumStartDate;
        }}
        // minDate={minDate}
        // maxDate={maxDate}
        isDisabled={isDisabled || isFormDisabled}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        showMonthYearSelect={showMonthYearSelect}
        handleDatesChange={handleDatesChange}
        onPrimaryButtonClick={() => handleDatesChange(startDate, endDate)}
        onSecondaryButtonClick={() => {
          setStartDate(null);
          setEndDate(null);
        }}
        onResetClick={() => {
          setStartDate(null);
          setEndDate(null);
          handleDatesChange(null, null);
        }}
      />
    </div>
  );
};

export default DateRangePickerContent;
