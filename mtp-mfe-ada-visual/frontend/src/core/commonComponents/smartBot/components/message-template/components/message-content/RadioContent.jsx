import { useState } from "react";
import { RadioButtonGroup } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import { useStyles } from "../../../../styling.jsx";

const RadioContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const classes = useStyles();
  const { label, isDisabled, orientation, options } = bodyText;
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const dispatch = useDispatch();
  const [selectedOption, setSelectedOption] = useState(persistedFormValues[formKey] ?? null);
  if (isEmpty(bodyText)) return null;

  const handleChange = (selectedOption) => {
    try {
      let value = selectedOption.target.value;
      setSelectedOption(value);
      // chatbotContext.radio = {
      //   ...chatbotContext?.radio,
      //   [bodyText?.paramName]: value,
      //   updated: true,
      // };
      chatbotContext[bodyText?.paramName] = {
        ...chatbotContext?.[bodyText?.paramName],
        [bodyText?.paramName]: value,
        updated: true
      }
      dispatch(setChatbotContext(chatbotContext));
      dispatch(setPersistedFormValues({ [formKey]: value }));
    } catch (error) {
      console.error("Error in radio handleChange", error);
    }
  };

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      {bodyText?.label && <p className={classes.radioGrpLabel}>{bodyText.label}</p>}
      <RadioButtonGroup
        name="radio-group"
        options={options}
        onChange={(e) => handleChange(e)}
        orientation={orientation}
        isDisabled={isDisabled || isFormDisabled}
        selectedOption={selectedOption}
      />
    </div>
  );
};

export default RadioContent;
