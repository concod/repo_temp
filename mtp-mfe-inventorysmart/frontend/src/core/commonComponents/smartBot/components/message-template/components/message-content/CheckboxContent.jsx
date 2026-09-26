import { useState, useRef } from "react";
import { Checkbox } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";

const CheckboxContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
    const {
        label,
        checked: checkedValue,
        required,
        disabled,
      } = bodyText;
  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
  const persistedFormValues = useSelector((state) => state.smartBotReducer.persistedFormValues);
  const dispatch = useDispatch();
  const [checked, setChecked] = useState(persistedFormValues[formKey] !== undefined ? persistedFormValues[formKey] : checkedValue);

  if (isEmpty(bodyText)) return null;


  const handleChange = (isChecked) => {
    try {
      setChecked(isChecked?.currentTarget?.checked);
      // chatbotContext.checkbox = {
      //   ...chatbotContext?.checkbox,
      //   [bodyText?.paramName]: isChecked?.currentTarget?.checked,
      //   updated: true
      // };
      const latestContext = chatbotContextRef.current;
      dispatch(setChatbotContext({
        ...latestContext,
        [bodyText?.paramName]: {
          ...latestContext?.[bodyText?.paramName],
          [bodyText?.paramName]: isChecked?.currentTarget?.checked,
          updated: true,
        },
      }));
      dispatch(setPersistedFormValues({ [formKey]: isChecked?.currentTarget?.checked }));
    } catch (error) {
      console.error("Error in checkbox handleChange", error);
    }
  };

  return (
    <div style={{ width: '100%', marginTop: '10px' }}>
      <Checkbox
        label={label}
        checked={checked}
        required={required}
        disabled={disabled || isFormDisabled}
        onChange={(e) => handleChange(e)}
        variant="default"
      />
    </div>
  );
};

export default CheckboxContent; 