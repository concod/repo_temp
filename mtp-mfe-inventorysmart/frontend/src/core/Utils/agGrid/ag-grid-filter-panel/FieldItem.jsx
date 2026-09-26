import { useEffect, useState } from "react";
import colours from "core/Styles/colours";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { pxToRem, splitStringFromLastUnderscore } from "../../functions/utils";
import makeStyles from "@mui/styles/makeStyles";
import _, { cloneDeep } from "lodash";
import { displaySnackMessages } from "../../utils";
import { useDispatch } from "react-redux";
import { summarizedByDropdownOptions } from "../constants";

const useStyles = makeStyles((theme) => ({
  fieldLabel: {
    padding: "0.25rem",
    marginLeft: 0,
    gap: "0.5rem",
    "& .MuiCheckbox-root": {
      border: `1px solid ${theme.palette.colours.checboxBorder}`,
      width: pxToRem(16),
      height: pxToRem(16),
      borderRadius: pxToRem(4),
      "& svg": {
        color: theme.palette.common.white,
      },
    },
    "& .Mui-checked": {
      borderColor: theme.palette.primary.main,
      "& svg": {
        color: `${theme.palette.primary.main} !important`,
      },
    },
    "& .MuiFormControlLabel-label": {
      lineHeight: pxToRem(21),
      color: theme.palette.text.primary,
    },
  },
}));

export const FieldItem = ({
  onDragStart,
  onDragEnd,
  label,
  value,
  selectedFieldItems,
  setSelectedFieldItems,
  type,
  availableFields,
  isFieldActive,
  config,
  id,
}) => {
  const classes = useStyles();
  const [isChecked, setIsChecked] = useState(
    selectedFieldItems.includes(value)
  );
  const dispatch = useDispatch();

  // Function to autoPopulate fieldItem to a field based on dataType on checkbox selection
  const autoPopulate = (dataType) => {
    const currentItem = {
      type,
      label,
      value,
      id,
    };
    const valueItems = ["number", "int", "percentage", "float", "dollar"];
    if (valueItems.includes(dataType)) {
      availableFields.values.setValuesFields([
        ...availableFields.values.valuesFields,
        currentItem,
      ]);
      let valuesData = [...availableFields.values.valuesFields, currentItem];
      let newIndex = valuesData?.length - 1;
      let valuesConfigData = {};
      valuesConfigData[`${value}_${newIndex}`] = {
        isOpen: false,
        selectedOptions: summarizedByDropdownOptions[0],
      };
      config.setValuesConfig({ ...config.valuesConfig, ...valuesConfigData });
      return;
    } else if (dataType === "string") {
      if (
        _.findIndex(availableFields.columns.columnFields, {
          value: value,
        }) > -1
      ) {
        displaySnackMessages(
          "Columns cannot contain same fields as rows",
          "warning",
          dispatch
        );
        return;
      }
      if (_.findIndex(availableFields.rows.rowFields, { value: value }) > -1) {
        displaySnackMessages(
          "Columns cannot contain duplicate fields",
          "warning",
          dispatch
        );
        return;
      }
      return availableFields.rows.setRowFields([
        ...availableFields.rows.rowFields,
        currentItem,
      ]);
    }
  };

  // Function to autoDelete fieldItem from all fields on checkbox selection
  const autoDelete = () => {
    Object.keys(availableFields).map((item) => {
      let field;
      let method;
      Object.keys(availableFields[item]).map((element) => {
        if (typeof availableFields[item]?.[element] === "object") {
          field = availableFields[item]?.[element];
        } else if (typeof availableFields[item]?.[element] === "function") {
          method = availableFields[item]?.[element];
        }
      });
      if (_.findIndex(field, { value: value }) > -1) {
        method([...field.filter((element) => element.value !== value)]);
        if (item === "values") {
          let valueConfigCopy = cloneDeep(config.valuesConfig);
          for (let key in valueConfigCopy) {
            let actualKey = splitStringFromLastUnderscore(key);
            if (actualKey === value) {
              delete valueConfigCopy[key];
            }
          }
          config.setValuesConfig(valueConfigCopy);
        }
      }
    });
  };

  useEffect(() => {
    // checking if the current FieldItem is present in any of the fields
    const isActive = isFieldActive(value);
    if (isActive) {
      setIsChecked(true);
      setSelectedFieldItems([...selectedFieldItems, value]);
    } else {
      setIsChecked(false);
    }
  }, [
    availableFields.values.valuesFields,
    availableFields.columns.columnFields,
    availableFields.rows.rowFields,
    availableFields.filters.filtersFields,
  ]);

  const handleCheckboxClick = (e) => {
    setIsChecked(!isChecked);
    if (!isChecked) {
      setSelectedFieldItems([...selectedFieldItems, value]);
      autoPopulate(type);
    } else {
      setSelectedFieldItems(
        selectedFieldItems.filter((element) => element !== value)
      );
      autoDelete();
    }
  };
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <FormControlLabel
        value={value}
        control={<Checkbox checked={isChecked} onClick={handleCheckboxClick} />}
        label={label}
        labelPlacement="end"
        className={classes.fieldLabel}
      />
    </div>
  );
};

export default FieldItem;
