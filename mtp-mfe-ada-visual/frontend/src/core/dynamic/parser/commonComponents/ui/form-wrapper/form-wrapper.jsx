import { cloneDeep } from "lodash";
import React, { useEffect } from "react";
import ConfiguratorForm from "core/Utils/form/configurator-form";
import DefaultForm from "core/Utils/form/index";
import { useDispatch, useSelector } from "react-redux";
import { updateReducerState } from "core/actions/configuratorActions";

const FormWrapper = (props) => {
  const { reducerKey } = props;
  const dispatch = useDispatch();
  
  // Get form data from Redux to watch for changes
  const formDataFromRedux = useSelector(
    (state) => state.configuratorReducer?.[reducerKey]
  );
  
  // Console log whenever form data changes in Redux
  // useEffect(() => {
  //   if (reducerKey && formDataFromRedux !== undefined) {
  //     console.log(`[FORM FIELD CHANGE] Reducer Key: "${reducerKey}"`, {
  //       reducerKey,
  //       formData: formDataFromRedux,
  //       timestamp: new Date().toISOString(),
  //     });
  //   }
  // }, [formDataFromRedux, reducerKey]);

  const getDefaultFilterValues = () => {
    // update the format of intial selection required by form component
    // Ensure fields is an array before processing
    if (!props.fields || !Array.isArray(props.fields)) {
      return {};
    }
    let cloneInititalSelection = cloneDeep(props.fields);
    let defaultFilterValues = {};

    cloneInititalSelection.forEach((item) => {
      if (item?.form_id && item?.values) {
        defaultFilterValues = {
          ...defaultFilterValues,
          [item.form_id]: item.values,
        };
      }
    });

    return defaultFilterValues;
  };

  const transformFormData = () => {
    // Ensure fields is an array before processing
    if (!props.fields || !Array.isArray(props.fields)) {
      return [];
    }
    let cloneFiltersData = cloneDeep(props.fields);
    cloneFiltersData = cloneFiltersData.map((item) => {
      if (item.display_type === "dropdown") {
        item.isClearable = item.is_clearable;
        item.isDisabled = item.is_disabled;
        // For dropdown with is_multiple_selection=true (arrays of primitives), always use multiple selection
        // Otherwise, respect the is_multiple_selection config
        item.isMulti = item.is_multiple_selection === true ? true : item.is_multiple_selection;
        item.isSelectAllButtonHidden = item.extra?.is_selectall_button_hidden;
      }
      item.options = item.initialData;
      item.accessor = item.field_name;
      item.field_type = item.display_type;
      item.autoSize = false;

      return item;
    });
    return cloneFiltersData;
  };

  const handleChange = (
    obj,
    id,
    field,
    fieldEvent,
    initialValue,
    checkConfiguration = []
  ) => {
    try {
      if (!reducerKey) {
        return;
      }
      dispatch(updateReducerState(reducerKey, cloneDeep(obj)));
    } catch (error) {
      console.error("form wrapper handleChange error", error);
    }
  };

  // Initialize reducer state with all form field default values on mount
  useEffect(() => {
    if (reducerKey && props.fields && Array.isArray(props.fields)) {
      // Build complete defaultValues object from all fields
      const initialFormData = { ...props.defaultValues };
      
      props.fields.forEach((field) => {
        const fieldName = field.field_name || field.accessor;
        if (fieldName) {
          // Only set if not already in defaultValues (to preserve existing values)
          if (!(fieldName in initialFormData)) {
            // Use appropriate default based on display_type
            if (field.display_type === "dropdown") {
              // For dropdowns, default to empty array (works for both single and multi-select)
              initialFormData[fieldName] = [];
            } else if (field.display_type === "BooleanField" || field.display_type === "toggle") {
              // For booleans, default to false
              initialFormData[fieldName] = false;
            } else if (field.display_type === "table") {
              // For tables, use initialData or empty array
              initialFormData[fieldName] = Array.isArray(field.initialData) ? field.initialData : [];
            } else if (field.display_type === "rule_group") {
              // rule_group manages __options and __default keys
              if (!(`${fieldName}__options` in initialFormData)) {
                initialFormData[`${fieldName}__options`] = [];
              }
              if (!(`${fieldName}__default` in initialFormData)) {
                initialFormData[`${fieldName}__default`] = [];
              }
            } else {
              // For other types, default to empty string
              initialFormData[fieldName] = "";
            }
          }
        }
      });
      
      // Initialize reducer state with all form field values
      // Only initialize if reducer state doesn't exist or is empty
      if (!formDataFromRedux || Object.keys(formDataFromRedux).length === 0) {
        dispatch(updateReducerState(reducerKey, cloneDeep(initialFormData)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducerKey, props.fields, props.defaultValues]);
  // Determine which Form component to use based on formType
  // If formType is "configurator-specific", use ConfiguratorForm, otherwise use DefaultForm
  const Form = props?.formType === "configurator-specific" ? ConfiguratorForm : DefaultForm;

  return (
    <Form
      layout={props?.layout}
      customLayout={props?.customLayout}
      rowGap={props?.rowGap}
      colGap={props?.colGap}
      maxFieldsInRow={props.maxFieldsInRow}
      handleChange={handleChange}
      fields={transformFormData()}
      updateDefaultValue={false}
      defaultValues={props.defaultValues}
      selectDependency={props.selectDependency}
      disabledFields={props.disabledFields}
      resetOptions={props.resetOptions}
      dependencyChange={props.dependencyChange}
    ></Form>
  );
};

export default FormWrapper;
