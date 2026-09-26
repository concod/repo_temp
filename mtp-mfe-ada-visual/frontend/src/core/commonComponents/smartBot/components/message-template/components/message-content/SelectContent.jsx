import { useEffect, useState } from "react";
import { Select } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const SelectContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const {
    header,
    inputPosition,
    labelOrientation,
    label,
    options,
    isRequired,
    isDisabled,
    isMulti,
    paramName
  } = bodyText;
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const [currentSelectedOptions, setCurrentSelectedOptions] = useState(
    persistedFormValues?.[formKey] || []
  );
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [initialOptions, setInitialOptions] = useState([]);
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const heirarchyKeyValuePairs = useSelector(
    (state) => state.smartBotReducer.heirarchyKeyValuePairs
  );
  const dispatch = useDispatch();

  if (isEmpty(bodyText)) return null;

  const onChange = (selectedOptions) => {
    try {
      let value;
      if (Array.isArray(selectedOptions)) {
        value = selectedOptions.map((selectedValue) => selectedValue.value);
      } else {
        value = selectedOptions.value;
      }
      chatbotContext[bodyText?.paramName] = {
        ...chatbotContext?.[bodyText?.paramName],
        [bodyText?.paramName]: value,
        updated: true,
      };
      // chatbotContext.select = {
      //   ...chatbotContext?.select,
      //   [bodyText?.paramName]: selectedOptions,
      //   updated: true
      // };
      dispatch(setChatbotContext(chatbotContext));
      dispatch(setPersistedFormValues({ [formKey]: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions] }));
    } catch (error) {
      console.error("Error in select handleChange", error);
    }
  };

  useEffect(() => {
    const persisted = persistedFormValues?.[formKey];
    if (!persisted || (Array.isArray(persisted) && persisted.length === 0)) {
      setCurrentSelectedOptions([]);
    }
  }, [persistedFormValues, formKey]);

  useEffect(() => {
    let formattedOptions = options.map((option) => {
      return {
        ...option,
        label: replaceSpecialCharacter(option.label.toString()),
      };
    });
    setInitialOptions(formattedOptions);
    setCurrentOptions(formattedOptions);
  }, [])

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      <Select
        currentOptions={currentOptions}
        setCurrentOptions={setCurrentOptions}
        label={heirarchyKeyValuePairs[paramName] || label}
        labelOrientation={labelOrientation}
        // inputPosition={inputPosition}
        // header={header}
        isRequired={isRequired}
        isDisabled={isDisabled || isFormDisabled}
        handleChange={(selected) => onChange(selected)}
        isCloseWhenClickOutside
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        selectedOptions={currentSelectedOptions}
        setSelectedOptions={setCurrentSelectedOptions}
        initialOptions={initialOptions}
        isMulti={isMulti}
        isSelectAll={isAllSelected}
        setIsSelectAll={setIsAllSelected}
        toggleSelectAll={true}
        isWithSearch={isMulti ? true : false}
      />
    </div>
  );
};

export default SelectContent;
