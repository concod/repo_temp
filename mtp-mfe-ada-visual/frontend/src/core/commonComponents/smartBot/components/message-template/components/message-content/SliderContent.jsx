import { useState } from "react";
import { Slider } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";

const SliderContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const {
    header,
    headerOrentiation,
    inputPosition,
    label,
    max,
    min,
    required,
    disabled,
  } = bodyText;

  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const dispatch = useDispatch();
  const [sliderValue, setSliderValue] = useState(persistedFormValues[formKey] !== undefined ? persistedFormValues[formKey] : 0);

  if (!bodyText) return null;

  const handleChange = (value) => {
    try {
      setSliderValue(value?.target?.value);
      chatbotContext[bodyText?.paramName] = {
        ...chatbotContext?.[bodyText?.paramName],
        [bodyText?.paramName]: value?.target?.value,
        updated: true
      };

      dispatch(setChatbotContext(chatbotContext));
      dispatch(setPersistedFormValues({ [formKey]: value?.target?.value }));
    } catch (error) {
      console.error("Error in slider handleChange", error);
    }
  };

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      <Slider
        header={header}
        headerOrientation={headerOrentiation}
        inputPosition={inputPosition}
        label={label}
        max={max}
        min={min}
        required={required}
        disabled={disabled || isFormDisabled}
        onChange={(e) => handleChange(e)}
        value={sliderValue}
      />
    </div>
  );
};

export default SliderContent;
