import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { setChatbotContext, clearPersistedFormValues } from "core/actions/smartBotActions";
import { parseResponse } from "core/commonComponents/smartBot/utlis.js";
import { CrossFilterProvider } from "core/commonComponents/crossFilterCascading";
import { fetchCrossFilterOptions } from "./utils/crossFilterAdapter.js";
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

// Key used to persist timeout state in sessionStorage (survives component remounts from tab switches)
const STEP_FORM_TIMEOUT_KEY = "__stepFormTimedOut";

/**
 * Renders form widget data inline within a step.
 * Reuses the same rendering logic as CombinedContent but designed
 * to be embedded inside the Steps progress bar component.
 *
 * @param {Object} props
 * @param {Array} props.formData - Array of raw widget_data items from step_form chunk
 * @param {number} props.messageIndex - Index for form state persistence keys
 */
const StepFormContent = ({ formData, messageIndex = 0, isFormDisabled = false, showSavedFilters = true, preSelectedFilters = null }) => {
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
  const chatbotFilterOptions = useSelector(
    (state) => state.smartBotReducer.chatbotFilterOptions
  );
  const dimensionHierarchies = useSelector(
    (state) => state.userRoleManagementService?.dimensionHierarchies
  );
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(() => sessionStorage.getItem(STEP_FORM_TIMEOUT_KEY) === "true");
  const timeoutRef = useRef(null);
  const prevIsFormDisabledRef = useRef(isFormDisabled);

  // 30-minute inactivity timeout: disable form and switch to agent_response tab
  const FORM_TIMEOUT_MS = 30 * 60 * 1000;
  useEffect(() => {
    if (isFormDisabled || isFormSubmitted || isTimedOut) return;

    const startTime = Date.now();
    timeoutRef.current = setTimeout(() => {
      setIsTimedOut(true);
      sessionStorage.setItem(STEP_FORM_TIMEOUT_KEY, "true");
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      window.dispatchEvent(new CustomEvent("stepFormTimeout", { detail: { elapsedSeconds } }));
    }, FORM_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isFormDisabled, isFormSubmitted, isTimedOut]);

  // Clear timeout when form is submitted
  useEffect(() => {
    if (isFormSubmitted && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [isFormSubmitted]);

  useEffect(() => {
    if (stepFormStreamData?.status === "streaming_start") {
      setIsFormSubmitted(true);
    }
  }, [stepFormStreamData]);

  // Reset isFormSubmitted and isTimedOut when parent signals the form should be enabled (new step_form from restream)
  // Only reset on a true→false TRANSITION (not on initial mount)
  useEffect(() => {
    if (prevIsFormDisabledRef.current && !isFormDisabled) {
      setIsFormSubmitted(false);
      setIsTimedOut(false);
      sessionStorage.removeItem(STEP_FORM_TIMEOUT_KEY);
    }
    prevIsFormDisabledRef.current = isFormDisabled;
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

  const formFieldsDisabled = isFormDisabled || isFilterSelected || isFormSubmitted || isTimedOut;
  const savedFilterDisabled = isFormDisabled || isFormFieldUsed || isFormSubmitted || isTimedOut;

  const requiredFieldsFilled = useMemo(() => {
    if (!formData || !Array.isArray(formData)) return false;
    // Only validate fields that are both isRequired AND of a type that visually
    // shows the mandatory indicator (*) to the user (currently only "select" fields).
    const requiredParams = formData
      .filter((item) => item?.data?.isRequired && item?.data?.is_mandatory)
      .map((item) => item.data.param_name);
    if (requiredParams.length === 0) {
      // Fallback: if no field has is_mandatory, check select-type fields with isRequired
      const selectRequiredParams = formData
        .filter((item) => item?.type === "select" && item?.data?.isRequired)
        .map((item) => item.data.param_name);
      if (selectRequiredParams.length === 0) {
        // No mandatory fields at all — require at least one field to be filled
        const allParams = formData
          .filter((item) => item?.data?.param_name && item?.type !== "button")
          .map((item) => item.data.param_name);
        return allParams.some((param) => {
          const ctx = chatbotContext?.[param];
          if (ctx && ctx.updated) {
            const val = ctx[param];
            if (val && (Array.isArray(val) ? val.length > 0 : !!val)) return true;
          }
          const persistedKey = `${messageIndex}_${param}`;
          const persistedVal = persistedFormValues?.[persistedKey];
          if (persistedVal && (Array.isArray(persistedVal) ? persistedVal.length > 0 : !!persistedVal)) return true;
          return false;
        });
      }
      return selectRequiredParams.every((param) => {
        const ctx = chatbotContext?.[param];
        if (ctx && ctx.updated) {
          const val = ctx[param];
          if (val && (Array.isArray(val) ? val.length > 0 : !!val)) return true;
        }
        const persistedKey = `${messageIndex}_${param}`;
        const persistedVal = persistedFormValues?.[persistedKey];
        if (persistedVal && (Array.isArray(persistedVal) ? persistedVal.length > 0 : !!persistedVal)) return true;
        return false;
      });
    }
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

  // Extract select-type filter configs from formData for cross-filter cascading
  // and sort them based on the filters_hierarchy_order from tenant config
  const crossFilterConfigs = useMemo(() => {
    if (!formData || !Array.isArray(formData)) return [];
    const configs = formData
      .filter((item) => item?.type === "select" && item?.data?.param_name)
      .map((item) => {
        const data = item.data;
        const paramName = data.param_name;
        // Try to find full filter config from chatbotFilterOptions (Redux)
        const fullConfig = (chatbotFilterOptions || []).find(
          (f) => f.column_name === paramName || f.attribute_name === paramName || f.name === paramName
        );
        return {
          paramName: paramName,
          param_name: paramName,
          column_name: fullConfig?.column_name || paramName,
          attribute_name: fullConfig?.attribute_name || paramName,
          dimension: fullConfig?.dimension || "product",
          display_type: fullConfig?.display_type || "dropdown",
          display_order: fullConfig?.display_order || item.ordering || 0,
          label: data.label,
          name: fullConfig?.name || data.label,
          is_mandatory: data.isRequired || false,
        };
      });

    // Sort configs based on dimensionHierarchies order.
    // Filters are sorted by their position in their dimension's hierarchy list.
    // This determines the cascading order (earlier = upstream/higher hierarchy).
    if (dimensionHierarchies && Object.keys(dimensionHierarchies).length > 0) {
      configs.sort((a, b) => {
        const aHierarchy = dimensionHierarchies[a.dimension] || [];
        const bHierarchy = dimensionHierarchies[b.dimension] || [];
        const aIndex = aHierarchy.indexOf(a.column_name) !== -1
          ? aHierarchy.indexOf(a.column_name)
          : aHierarchy.indexOf(a.attribute_name) !== -1
            ? aHierarchy.indexOf(a.attribute_name)
            : aHierarchy.indexOf(a.paramName) !== -1
              ? aHierarchy.indexOf(a.paramName)
              : 999;
        const bIndex = bHierarchy.indexOf(b.column_name) !== -1
          ? bHierarchy.indexOf(b.column_name)
          : bHierarchy.indexOf(b.attribute_name) !== -1
            ? bHierarchy.indexOf(b.attribute_name)
            : bHierarchy.indexOf(b.paramName) !== -1
              ? bHierarchy.indexOf(b.paramName)
              : 999;
        return aIndex - bIndex;
      });
    }

    return configs;
  }, [formData, chatbotFilterOptions, dimensionHierarchies]);

  // Build initial selections from chatbotContext and persistedFormValues (for restore on remount)
  const crossFilterInitialSelections = useMemo(() => {
    const selections = {};
    crossFilterConfigs.forEach((cfg) => {
      const ctx = chatbotContext?.[cfg.paramName];
      if (ctx && ctx.updated && ctx[cfg.paramName]) {
        const val = ctx[cfg.paramName];
        selections[cfg.paramName] = Array.isArray(val) ? val : [val];
      } else {
        // Fallback: check persistedFormValues for option objects
        const persistedKey = `${messageIndex}_${cfg.paramName}`;
        const persisted = persistedFormValues?.[persistedKey];
        if (persisted && Array.isArray(persisted) && persisted.length > 0) {
          selections[cfg.paramName] = persisted.map((opt) => opt.value || opt);
        }
      }
    });
    return selections;
  }, [crossFilterConfigs, chatbotContext, persistedFormValues, messageIndex]);

  // Extract the param names of the current form's fields so ButtonContent
  // can restrict user_input to only these keys (avoids leaking stale context).
  const formParamNames = useMemo(() => {
    if (!formData || !Array.isArray(formData)) return [];
    return formData
      .filter((item) => item?.type !== "button" && item?.data?.param_name)
      .map((item) => item.data.param_name);
  }, [formData]);

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
        return <ButtonContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled || isFormSubmitted || isTimedOut} isStepFormSubmit={true} isFormValid={requiredFieldsFilled} formParamNames={formParamNames} messageIndex={messageIndex} />;
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
        {crossFilterConfigs.length >= 1 ? (
          <CrossFilterProvider
            filters={crossFilterConfigs}
            fetchOptionsFn={(filterConfig, existingSelections, allFilters) =>
              fetchCrossFilterOptions(filterConfig, existingSelections, allFilters, preSelectedFilters)
            }
            initialSelections={crossFilterInitialSelections}
            fetchOnMount={false}
          >
            {formFields}
          </CrossFilterProvider>
        ) : (
          formFields
        )}
      </div>
      {buttonItems}
    </div>
  );
};

/** Reset the timeout flag (call when a new conversation/message starts) */
export const resetStepFormTimeoutFlag = () => {
  sessionStorage.removeItem(STEP_FORM_TIMEOUT_KEY);
};

export default StepFormContent;
