import moment from "moment";

export const formatDate = (date) => {
  return moment(date).format("YYYY-MM-DD");
};

export const callDropDownUpdateFunc = (columnDropDownValues, obj) => {
  let optionsKey = `${obj.column_name}_options`;
  columnDropDownValues[optionsKey] = obj.initialData || [];
  return columnDropDownValues;
};

//  return true to enable drop down selection
export const onChangeSisterStoreValidation = () => {
  return true;
};

export const mapOptionsValue = (arr) => {
    return arr?.map((item) => {
      return {
        label: item,
        value: item,
        id: item,
      };
    });
  };
