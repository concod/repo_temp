import { cloneDeep } from "lodash";
import React from "react";
import Form from "core/Utils/form/index";
import moment from "moment";

const filterGroupFormWrapper = (props) => {
  const getDefaultFilterValues = () => {
    // update the format of intial selection required by form component
    let cloneInititalSelection = cloneDeep(props.inititalSelection);
    let defaultFilterValues = {};

    cloneInititalSelection.forEach((item) => {
      defaultFilterValues = {
        ...defaultFilterValues,
        [item.filter_id]: item.values,
      };
    });

    return defaultFilterValues;
  };

  const transformFiltersData = () => {
    let cloneFiltersData = cloneDeep(props.filters);
    cloneFiltersData = cloneFiltersData.map((item) => {
      if (item.display_type === "dropdown") {
        item.isClearable = item.is_clearable;
        item.isDisabled = item.is_disabled;
        item.isMulti = item.is_multiple_selection;
        item.isSelectAllButtonHidden = item.extra?.is_selectall_button_hidden;
      }
      item.options = item.initialData;
      item.accessor = item.column_name;
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
    // update the parameters required by filtergroup component
    let filterValue;
    let filterAttributes = {
      filter_name: field.label,
      filter_id: field.filter_keyword,
      filter_type: field.type,
      dimension: field.dimension,
      display_type: field.display_type,
      check_configuration: checkConfiguration,
    };
    switch (field.field_type) {
      case "TextField":
        filterValue = obj[field.accessor]?.trim() ? [obj[field.accessor]] : [];
        break;
      case "BooleanField":
        filterValue = obj[field.accessor];
        break;
      case "DateTimeField":
        filterAttributes.disablePast = field.disablePast;
        filterAttributes.disableFuture = field.disableFuture;
        filterValue = moment(fieldEvent).isValid()
          ? moment(fieldEvent).format("YYYY-MM-DD")
          : null;
        break;
      case "dropdown":
        filterValue = fieldEvent.map((opt) => {
          return {
            //Incase of custom filters where label & value for an option is different
            label: opt.label || opt.value,
            id: opt.value,
            value: opt.value,
          };
        });
        break;
      case "rangePicker":
        filterAttributes.disableType = field.disableType;
        filterAttributes.startYear = field.startYear;
        filterValue = [
          fieldEvent[0] ? moment(fieldEvent[0]).format("YYYY-MM-DD") : null,
          fieldEvent[1] ? moment(fieldEvent[1]).format("YYYY-MM-DD") : null,
        ];
        break;
      case "radioGroup":
        filterValue = fieldEvent.target.value;
        break;
      case "fiscalCalendar":
        filterAttributes.disablePastWeeks = field.disablePastWeeks;
        filterAttributes.disableFutureWeeks = field.disableFutureWeeks;
        filterValue = fieldEvent;
        break;
      default:
        filterValue = "";
        break;
    }

    props.updateDependency(filterAttributes, filterValue);
  };

  return (
    <Form
      layout={"vertical"}
      maxFieldsInRow={4}
      handleChange={handleChange}
      fields={transformFiltersData()}
      updateDefaultValue={false}
      defaultValues={getDefaultFilterValues()}
      selectDependency={props.inititalSelection}
      disabledFields={props.disabledFields}
      resetOptions={props.resetOptions}
      dependencyChange={props.dependencyChange}
      isViewCluster = {props.isViewCluster || false}
    ></Form>
  );
};

export default filterGroupFormWrapper;
