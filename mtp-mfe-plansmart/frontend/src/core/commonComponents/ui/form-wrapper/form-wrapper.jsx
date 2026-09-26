import { cloneDeep } from "lodash";
import React from "react";
import Form from "core/Utils/form/index";
import { useDispatch } from "react-redux";
import { updateReducerState } from "core/actions/configuratorActions";

const FormWrapper = (props) => {
  const { reducerKey } = props;
  const dispatch = useDispatch();

  const getDefaultFilterValues = () => {
    // update the format of intial selection required by form component
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
    let cloneFiltersData = cloneDeep(props.fields);
    cloneFiltersData = cloneFiltersData.map((item) => {
      if (item.display_type === "dropdown") {
        item.isClearable = item.is_clearable;
        item.isDisabled = item.is_disabled;
        item.isMulti = item.is_multiple_selection;
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
      dispatch(updateReducerState(reducerKey, cloneDeep(obj)));
    } catch (error) {
      console.error("form wrapper handleChange error", error);
    }
  };

  return (
    <Form
      layout={props.layout}
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
