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
      // Layout-only field types that should not be stored in Redux state
      const NON_DATA_FIELD_TYPES = ['nested_box', 'section_title', 'Heading'];
      
      // Helper function to get default value for a field based on its type
      const getDefaultValue = (field) => {
        const fieldType = field.display_type || field.field_type;
        
        if (fieldType === "dropdown") {
          return [];
        } else if (fieldType === "BooleanField" || fieldType === "toggle") {
          return false;
        } else if (fieldType === "table") {
          return Array.isArray(field.initialData) ? field.initialData : [];
        } else {
          return "";
        }
      };
      
      // Recursive function to process fields and their nested children
      const processFields = (fields, formData) => {
        fields.forEach((field) => {
          const fieldType = field.display_type || field.field_type;
          const fieldName = field.field_name || field.accessor;
          
          // Check if this is a layout-only field
          if (NON_DATA_FIELD_TYPES.includes(fieldType)) {
            // Process nested children if they exist
            if (field.nested_fields && Array.isArray(field.nested_fields)) {
              processFields(field.nested_fields, formData);
            }
            // Don't add the container itself to formData
            return;
          }
          
          // Process actual data fields (existing behavior preserved)
          if (fieldName) {
            // Only set if not already in defaultValues (to preserve existing values)
            if (!(fieldName in formData)) {
              // Special handling for rule_group
              if (fieldType === "rule_group") {
                if (!(`${fieldName}__options` in formData)) {
                  formData[`${fieldName}__options`] = [];
                }
                if (!(`${fieldName}__default` in formData)) {
                  formData[`${fieldName}__default`] = [];
                }
              } else {
                // Use helper function for default value
                formData[fieldName] = getDefaultValue(field);
              }
            }
          }
        });
      };
      
      // Build complete defaultValues object from all fields
      const initialFormData = { ...props.defaultValues };
      processFields(props.fields, initialFormData);
      
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
