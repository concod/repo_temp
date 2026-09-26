import { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { setChatbotContext, clearPersistedFormValues } from "core/actions/smartBotActions";
import { parseResponse } from "core/commonComponents/smartBot/utlis.js";
import TextContent from "./TextContent.jsx";
import ChipsContent from "./ChipsContent.jsx";
import ButtonContent from "./ButtonContent.jsx";
import TableContent from "./TableContent.jsx";
import GraphContent from "./GraphContent.jsx";
import SliderContent from "./SliderContent.jsx";
import SelectContent from "./SelectContent.jsx";
import DatePickerContent from "./DatePickerContent.jsx";
import DateRangePickerContent from "./DateRangePickerContent.jsx";
import CheckboxContent from "./CheckboxContent.jsx";
import RadioContent from "./RadioContent.jsx";
import InputContent from "./InputContent.jsx";
import ImageContent from "./ImageContent.jsx";

/**
 * Renders form widget data inline within a step.
 * Reuses the same rendering logic as CombinedContent but designed
 * to be embedded inside the Steps progress bar component.
 *
 * @param {Object} props
 * @param {Array} props.formData - Array of raw widget_data items from step_form chunk
 * @param {number} props.messageIndex - Index for form state persistence keys
 */
const StepFormContent = ({ formData, messageIndex = 0, isFormDisabled = false, showSavedFilters = true }) => {
  const dispatch = useDispatch();
  const savedFilterSets = useSelector(
    (state) => state.smartBotReducer.savedFilterSets
  );
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const stepFormStreamData = useSelector(
    (state) => state.smartBotReducer.stepFormStreamData
  );
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  useEffect(() => {
    if (stepFormStreamData?.status === "streaming_start") {
      setIsFormSubmitted(true);
    }
  }, [stepFormStreamData]);

  // Reset isFormSubmitted when parent signals the form should be enabled (new step_form from restream)
  useEffect(() => {
    if (!isFormDisabled) {
      setIsFormSubmitted(false);
    }
  }, [isFormDisabled]);
  const [isFilterSetOpen, setIsFilterSetOpen] = useState(false);
  const [selectedFilterSet, setSelectedFilterSet] = useState(() => {
    // Restore from chatbotContext if available (persists across tab switches)
    return chatbotContext?.__savedFilterSelection || [];
  });
  const [filterSetCurrentOptions, setFilterSetCurrentOptions] = useState([]);

  const filterSetOptions = useMemo(() => {
    const opts = (savedFilterSets || []).map((f) => ({
      label: f.name || f.label,
      value: f.fuc_code || f.name || f.label,
    }));
    setFilterSetCurrentOptions(opts);
    return opts;
  }, [savedFilterSets]);

  const isFilterSelected = Array.isArray(selectedFilterSet) ? selectedFilterSet.length > 0 : !!selectedFilterSet && Object.keys(selectedFilterSet).length > 0;

  const onFilterSetChange = useCallback((selected) => {
    try {
      const selectedValue = Array.isArray(selected) ? selected[0]?.value : selected?.value;
      if (!selectedValue) {
        dispatch(setChatbotContext({}));
        dispatch(clearPersistedFormValues());
        return;
      }
      const fullFilterObj = (savedFilterSets || []).find(
        (f) => (f.fuc_code || f.name || f.label) === selectedValue
      );
      if (!fullFilterObj?.saved_filter_preference) return;

      const newContext = {};
      fullFilterObj.saved_filter_preference.forEach((pref) => {
        const attrName = pref.attribute_name;
        if (!attrName) return;
        let filterValues = [];
        if (Array.isArray(pref.values)) {
          pref.values.forEach((v) => {
            if (v && Array.isArray(v.values)) {
              filterValues.push(...v.values.map(String));
            } else if (typeof v === "string" || typeof v === "number") {
              filterValues.push(String(v));
            }
          });
        }
        if (filterValues.length > 0) {
          newContext[attrName] = {
            [attrName]: filterValues,
            updated: true,
          };
        }
      });
      newContext.__fromSavedFilter = true;
      newContext.__savedFilterSelection = selected;
      dispatch(setChatbotContext(newContext));
    } catch (error) {
      console.error("[StepFormContent] onFilterSetChange error:", error);
    }
  }, [savedFilterSets, dispatch]);

  const isFormFieldUsed = useMemo(() => {
    if (!persistedFormValues) return false;
    const prefix = `${messageIndex}_`;
    return Object.keys(persistedFormValues).some((key) => {
      if (!key.startsWith(prefix)) return false;
      const val = persistedFormValues[key];
      return val && (Array.isArray(val) ? val.length > 0 : !!val);
    });
  }, [persistedFormValues, messageIndex]);

  const formFieldsDisabled = isFormDisabled || isFilterSelected || isFormSubmitted;
  const savedFilterDisabled = isFormDisabled || isFormFieldUsed || isFormSubmitted;

  const requiredFieldsFilled = useMemo(() => {
    if (!formData || !Array.isArray(formData)) return false;
    const requiredParams = formData
      .filter((item) => item?.data?.isRequired)
      .map((item) => item.data.param_name);
    if (requiredParams.length === 0) return true;
    return requiredParams.every((param) => {
      // Check chatbotContext (populated by saved filters)
      const ctx = chatbotContext?.[param];
      if (ctx && ctx.updated) {
        const val = ctx[param];
        if (val && (Array.isArray(val) ? val.length > 0 : !!val)) return true;
      }
      // Check persistedFormValues (populated by manual form field selection)
      const persistedKey = `${messageIndex}_${param}`;
      const persistedVal = persistedFormValues?.[persistedKey];
      if (persistedVal && (Array.isArray(persistedVal) ? persistedVal.length > 0 : !!persistedVal)) return true;
      return false;
    });
  }, [formData, chatbotContext, persistedFormValues, messageIndex]);

  if (!formData || !Array.isArray(formData) || formData.length === 0) {
    return null;
  }

  const renderItem = (parsedData, index) => {
    const key = `step-form-${index}-${formFieldsDisabled}`;

    switch (parsedData.bodyType) {
      case "text":
        return <TextContent key={key} bodyText={parsedData.bodyText} botData={parsedData} />;
      case "chips":
        return <ChipsContent key={key} bodyText={parsedData.bodyText} props={{}} />;
      case "table":
        return <TableContent key={key} bodyText={parsedData.bodyText} />;
      case "graph":
        return <GraphContent key={key} bodyText={parsedData.bodyText} />;
      case "slider":
        return <SliderContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "select":
        return <SelectContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "datePicker":
        return <DatePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "dateRangePicker":
        return <DateRangePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "checkbox":
        return <CheckboxContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "radio":
        return <RadioContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "button":
        return <ButtonContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled || isFormSubmitted} isStepFormSubmit={true} isFormValid={requiredFieldsFilled} />;
      case "input":
        return <InputContent key={key} bodyText={parsedData.bodyText} isFormDisabled={formFieldsDisabled} messageIndex={messageIndex} />;
      case "image":
        return <ImageContent key={key} bodyText={parsedData.bodyText} />;
      default:
        return null;
    }
  };

  const formFields = [];
  const buttonItems = [];

  formData.forEach((item, index) => {
    try {
      const parsedData = parseResponse(item, item.type, "", "", true);
      if (!parsedData) return;
      const rendered = renderItem(parsedData, index);
      if (!rendered) return;
      if (parsedData.bodyType === "button") {
        buttonItems.push(rendered);
      } else {
        formFields.push(rendered);
      }
    } catch (error) {
      console.error(`Error parsing step form item at index ${index}:`, error);
    }
  });

  if (formFields.length === 0 && buttonItems.length === 0) return null;

  return (
    <div className="step-form-content">
      {showSavedFilters && filterSetOptions.length > 0 && (
        <div style={{ width: "100%", marginTop: "10px" }}>
          <Select
            currentOptions={filterSetCurrentOptions}
            setCurrentOptions={setFilterSetCurrentOptions}
            label="Saved Filter Sets"
            labelOrientation="top"
            isRequired={false}
            isDisabled={savedFilterDisabled}
            handleChange={(selected) => onFilterSetChange(selected)}
            isCloseWhenClickOutside
            setIsOpen={setIsFilterSetOpen}
            isOpen={isFilterSetOpen}
            selectedOptions={selectedFilterSet}
            setSelectedOptions={setSelectedFilterSet}
            initialOptions={filterSetOptions}
            isMulti={false}
            isClearable={true}
          />
        </div>
      )}
      {showSavedFilters && filterSetOptions.length > 0 && (
        <hr style={{ border: "none", borderTop: "1px solid #E0E0E0", margin: "12px 0" }} />
      )}
      <div style={{
        ...(isFilterSelected && !isFormDisabled ? { pointerEvents: "none", opacity: 0.5 } : {}),
      }}>
        {formFields}
      </div>
      {buttonItems}
    </div>
  );
};

export default StepFormContent;
