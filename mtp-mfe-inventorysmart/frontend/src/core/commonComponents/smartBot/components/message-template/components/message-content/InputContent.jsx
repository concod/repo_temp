import { useState, useRef } from "react";
import { Input } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

const InputContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const {
    label,
    placeholder,
    isRequired,
    isDisabled,
    inputType,
    labelOrientation,
    defaultValue,
    maxLength,
    minLength,
  } = bodyText;
  
  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
  const persistedFormValues = useSelector((state) => state.smartBotReducer.persistedFormValues);
  const dispatch = useDispatch();
  const [value, setValue] = useState(persistedFormValues[formKey] !== undefined ? persistedFormValues[formKey] : (defaultValue || ""));

  if (isEmpty(bodyText)) return null;

  const handleChange = (event) => {
    try {
      const newValue = event?.target?.value || event?.currentTarget?.value || "";
      setValue(newValue);
      
      const latestContext = chatbotContextRef.current;
      dispatch(setChatbotContext({
        ...latestContext,
        [bodyText?.paramName]: {
          ...latestContext?.[bodyText?.paramName],
          [bodyText?.paramName]: replaceSpecialCharToCharCode(newValue),
          updated: true,
          type: inputType,
        },
      }));
      dispatch(setPersistedFormValues({ [formKey]: newValue }));
    } catch (error) {
      console.error("Error in input handleChange", error);
    }
  };

  return (
    <div style={{ width: '100%', marginTop: '10px' }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        required={isRequired}
        isDisabled={isDisabled || isFormDisabled}
        type={inputType || "text"}
        labelOrientation={labelOrientation}
        maxLength={maxLength}
        minLength={minLength}
      />
    </div>
  );
};

export default InputContent; 