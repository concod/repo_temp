import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  Grid,
  IconButton,
  FormControl,
  FormControlLabel,
  FormGroup,
  Typography,
  TextField,
  InputAdornment,
} from "@mui/material";
import "react-dates/initialize";
import {
  Input,
  Checkbox,
  RadioButtonGroup,
  Switch,
  Slider,
  Button,
  Chips,
  MonthRangePicker
} from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import ChipsInput from "../chips-input";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import RangePicker from "../../commonComponents/dateRangePicker";
import Select from "core/commonComponents/filters/Select/Select";
import "./index.scss";
import CreatableSelect from "core/commonComponents/filters/CreatableSelect/CreatableSelect";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import SimpleMonthRangePickerWrapper from "core/commonComponents/SimpleMonthRangePickerWrapper";
import { find, isObject, isNil, uniqueId } from "lodash";
import moment from "moment";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { pxToRem, replaceSpecialCharacter } from "core/Utils/functions/utils";
import MultipleDateRangePicker from "core/Utils/agGrid/cellsToBeRendered/multipleDateRangePicker/multipleDateRangePicker";
import DatePickerWrapper from "core/commonComponents/filters/DatePicker/DatePicker";
import colours from "core/Styles/colours";

const SIDEBAR_AND_SPACE_WIDTH = 164; // fixed width for sidebar and space we need only form render width
const FIXED_FIELD_WIDTH = 280; // 240 + 40 = 280 240 is the select field height and 40 is the space between 2 field
import ChipsTagInput from "../chips-input/ChipsTagInput";
import { DateTimePicker } from "@mui/x-date-pickers";
import TableWrapper from "../../dynamic/parser/commonComponents/ui/table-wrapper/table-wrapper";

const useStyles = makeStyles((theme) => ({
  TextField: {
    width: "100%",
    "& .MuiFormControl-root": {
      width: "100%",
    },
  },
  textfieldAttribute: {
    width: "100%",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
    "& .MuiFormHelperText-contained": {
      margin: "0px",
      color: "red",
    },
    // to render up and down arrows on the i/p field for the type number
    "& .MuiOutlinedInput-input": {
      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
        "-webkit-appearance": "auto",
      },
    },
  },
  checkbox: {
    padding: "0px",
  },
  verticalLabel: {
    marginBottom: "0.3rem",
  },
  dropDownError: {
    color: "#F44336",
    marginLeft: "14px",
    marginRight: "14px",
    marginTop: "3px",
    textAlign: "left",
    fontFamily: "Roboto, Helvetica, Arial, sans-serif",
    fontSize: "0.75em",
    fontWeight: "400",
    lineHeight: "1.66",
    letterSpacing: "0.03333em",
  },
  errorBorder: {
    borderRadius: "4px",
    border: "1px solid #F44336 !important",
    "&>div": {
      borderColor: theme.palette.common.white,
    },
  },
  inputLabel: {
    display: "flex",
    lineHeight: "normal",
    minHeight: "1rem",
    color: theme.palette.colours.filterLabelColor,
    lineHeight: "1.6",
    letterSpacing: "0px",
    opacity: 1,
    fontSize: "0.80rem",
    paddingBottom: "0.4rem",
    "& span:nth-child(1)": {
      maxWidth: "90%",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "& span:nth-child(2)": {
      maxWidth: "10%",
    },
  },
  IconButton: {
    padding: "0.25rem",
  },
  requiredField: {
    color: theme.palette.error.main,
    marginLeft: theme.typography.pxToRem(2),
  },
  formControlLabelStyle: {
    "& span": {
      "&:nth-last-child(2)": {
        padding: `${pxToRem(0)} ${pxToRem(9)}`,
      },
    },
  },
  marginRight1rem: {
    marginRight: "1rem",
  },
  marginBottom1rem: {
    marginBottom: "1rem",
  },
  label: {
    fontSize: pxToRem(14),
    fontWeight: 500,
    color: colours.cloudBurst,
    lineHeight: "1.25rem",
  },
  chipsWrapper:{
    gap: pxToRem(16)
  }
}));

/**
 * TableFormField component - handles table rendering within forms
 * This component is defined outside Form to prevent re-creation on every render
 */
const TableFormField = ({
  tableColumnKey,
  tableRowKey,
  inferredColumns,
  tableData,
  item,
  handleChange 
}) => {
  return (
    <div style={{ width: "100%", marginTop: "8px" }}>
      {item.label && (
        <Typography
          variant="body2"
          style={{ marginBottom: "8px", fontWeight: 500 }}
        >
          {item.label}
          {item.is_mandatory || item.is_required || item.required ? (
            <span style={{ color: "red" }}> *</span>
          ) : null}
        </Typography>
      )}
      <TableWrapper
        columnKey={tableColumnKey}
        rowKey={tableRowKey}
        isColumnDataFromApi={false}
        isRowDataFromApi={false}
        staticColumnData={inferredColumns}
        staticRowData={tableData}
        tableProps={{
          height: item.tableProps?.height || "400px",
          ...item.tableProps,
        }}
        onTableDataChange={(updatedData) => handleChange(updatedData, item.field_type, item.accessor, item)}
      />
    </div>
  );
};

const Form = (props) => {
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const [formData, setFormData] = useState(props.defaultValues);
  const [windowSize, setWindowSize] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const { customStyles = {}, suppressSymbolKeyPress=false } = props || {};

  useEffect(() => {
    if (props.formDataFromParent) {
      setFormData(props.formDataFromParent);
    }
  }, [props.formDataFromParent]);

  useEffect(() => {
    if (props?.isConfirmationChecking) {
      const hasValidValue = Object.values(formData).some(
        (value) => Boolean(value) || value === 0
      );
      props?.primaryButtonStateChange(!hasValidValue);
    }
  }, [formData]);

  useEffect(() => {
    if (!props.updateDefaultValue) {
      setFormData(props.defaultValues);
    }
  }, [props.defaultValues]);
  const handleChange = (e, type, id, field, checkConfiguration = []) => {
    let obj = { ...formData };
    let initialValue = obj[id];

    switch (type) {
      case "BooleanField":
        obj[id] = e.target.checked;
        break;
      case "CustomToggleField":
        obj[e.target.name] = e.target.checked;
        break;
      case "DateTimeField":
        obj[id] = e;
        break;
      case "DateAndTimeField":
        if (e) {
          let l_dateFormat = field?.extra?.dateFormat;
          let l_updatedDate = l_dateFormat ? moment(e).format(l_dateFormat) : e;
          obj[id] = l_updatedDate;
        } else {
          obj[id] = e;
        }
        break;
      case "list":
      case "dropdown":
      case "transparentDropdown":
        if (field.isMulti) {
          let newValue = e.map((opt) => opt.value);
          obj[id] = newValue;
          obj[`${id}_options`] = e;
        } else {
          obj[id] = e[0]?.value;
        }
        break;
      case "autocompleteDropdown":
        if (field.is_multiple_selection) {
          let newValue = e?.map((opt) => opt.value);
          obj[id] = newValue;
          obj[`${id}_options`] = e;
        } else {
          obj[id] = e?.[0]?.value;
        }
        break;
      case "ChipsInput":
        obj[id] = e ? e.value : "";
        break;
      case "ChipsTagInput":
        obj[id] = e.detail.value;
        break;
      case "radioGroup":
        obj[id] = e.target.value;
        break;
      case "checkBoxGroup":
        obj[id] = {
          ...obj[id],
          [e.target.value]: e.target.checked,
        };
        break;
      case "rangePicker":
        obj[id] = e;
        break;
      case "fiscalCalendar":
        obj[id] = e;
        break;
      case "monthRangePicker":
        obj[id] = e;
        break;
      case "deleteRow":
        obj[id] = true;
        break;
      case "toggle":
        obj[id] = e.target.checked;
        break;
      case "multiple_daterangepicker":
        obj[id] = e;
        break;
      case "sliderRange":
        obj[id] = { ...obj[id], value: e.target.value };
        break;
      case "table":
        // For table, e is the array of objects (row data)
        obj[id] = Array.isArray(e) ? e : [];
        break;
      case "chips":
        // Toggle the chip value - e is the option value
        // Check if this is a multi-select or single-select chip
        const chipOption = checkConfiguration;
        const chipType = chipOption?.type || "multi";

        if (chipType === "single") {
          // For single select, clear all other options and set only this one
          obj[id] = { [e]: true };
        } else {
          // For multi select, toggle the specific option
          obj[id] = {
            ...obj[id],
            [e]: !obj[id]?.[e],
          };
        }
        break;
      default:
        obj[id] = e.target.value;
        break;
    }
    setFormData(obj);
    props.handleChange(obj, id, field, e, initialValue, checkConfiguration);
  };
  const inputAttribute = (type) => {
    switch (type) {
      case "percentage":
        return "%";

      case "dollar":
        return "$";
      default:
        return " ";
    }
  };
  const genricValidation = (item, value) => {
    if ((item.error_type === "function" ? item.error(value) : item.error) && item.helperText) {
      return item.helperText;
    }
    // do not allow to enter negative values
    if (item?.no_negative_values) {
      if (item?.minValue && parseInt(value) < item?.minValue) {
        setFormData({ ...formData, [item.accessor]: item.minValue });
        props.handleChange(
          { ...formData, [item.accessor]: item.minValue },
          item.accessor,
          item,
          item.minValue
        );
      } else if (parseInt(value) < 0) {
        setFormData({ ...formData, [item.accessor]: "0" });
        props.handleChange(
          { ...formData, [item.accessor]: "0" },
          item.accessor,
          item,
          "0"
        );
      }
    }
    if (item.value_type === "percentage") {
      if (parseInt(value) >= 0 && parseInt(value) > 100) {
        setFormData({ ...formData, [item.accessor]: 100 });
        return " please Enter value less than 100 ";
      }
      if (item.is_negative_value_allowed) return "";
      if (parseInt(value) < 0) {
        setFormData({ ...formData, [item.accessor]: "0" });
        return " please Enter value greater than 0 ";
      }
    }
    if (item?.max_validation) {
      if (
        formData?.[props?.min_max_accessor[item?.accessor]] &&
        formData?.[props?.min_max_accessor[item?.accessor]] > 0 &&
        parseInt(value) > formData?.[props?.min_max_accessor[item?.accessor]]
      ) {
        return ` please enter numbers less than ${
          formData?.[props?.min_max_accessor[item?.accessor]]
        }`;
      }
    }
    if (item?.min_validation) {
      if (
        formData?.[props?.min_max_accessor[item?.accessor]] &&
        parseInt(value) < formData?.[props?.min_max_accessor[item?.accessor]]
      ) {
        return ` please enter numbers greater than ${
          formData?.[props?.min_max_accessor[item?.accessor]]
        }`;
      }
    }
  };
  const onBlur = (_e, type, id) => {
    props.onBlur && props.onBlur();
  };

  /**
   * Infers table columns from an array of objects
   * Extracts all unique keys from all objects in the array and creates column definitions
   * @param {Array} data - Array of objects (table rows)
   * @returns {Array} Array of column definitions compatible with AgGrid
   */
  const inferTableColumns = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Get all unique keys from all objects in the array
    const allKeys = new Set();
    data.forEach((row) => {
      if (row && typeof row === "object") {
        Object.keys(row).forEach((key) => {
          // Skip internal keys added by table wrapper
          if (key !== "table-wrapper-id") {
            allKeys.add(key);
          }
        });
      }
    });

    // Create column definitions
    const columns = Array.from(allKeys).map((key, index) => {
      // Infer type from first non-null value
      const firstValue = data.find((row) => row?.[key] != null)?.[key];
      let inferredType = "str"; // default

      if (typeof firstValue === "number") {
        inferredType = Number.isInteger(firstValue) ? "int" : "float";
      } else if (typeof firstValue === "boolean") {
        inferredType = "bool";
      } else if (firstValue instanceof Date || (typeof firstValue === "string" && /^\d{4}-\d{2}-\d{2}/.test(firstValue))) {
        inferredType = "date";
      }

      // Format label: "attribute_name" -> "Attribute Name"
      const label = key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return {
        column_name: key,
        label: label,
        type: inferredType,
        is_editable: true,
        is_frozen: false,
        is_hidden: false,
        is_required: false,
        order_of_display: index + 1,
        width: 150,
        dimension: "Product",
        extra: {},
      };
    });

    return columns;
  };

  const setSelectValue = (item) => {
    try {
      if (formData?.[item?.accessor]) {
        let data = item?.options?.filter((option) => {
          if (Array.isArray(formData?.[item?.accessor])) {
            const check = find(formData?.[item?.accessor], (item) => {
              if (isObject(item)) {
                return item.value === option.value;
              } else {
                return item === option.value;
              }
            });
            return !isNil(check);
          } else {
            return formData[item.accessor] === option.value;
          }
        });

        let mappedData = data?.map((opt) => {
          return {
            label: replaceSpecialCharacter(opt.label || opt.name),
            value: opt.value,
            isDisabled: opt.isDisabled,
          };
        });

        if (item.isMulti) {
          return mappedData;
        } else {
          return mappedData[0];
        }
      }
      return null;
    } catch (err) {
      console.log(err);
      return [];
    }
  };
  const renderForm = (item, index) => {
    let listOptions = [];
    if (
      item.field_type === "dropdown" ||
      item.field_type === "autocompleteDropdown" ||
      item.field_type === "list" ||
      item.field_type === "transparentDropdown"
    ) {
      listOptions = Array.isArray(item?.options)
        ? item.options.map((option) => {
            // Check if this is an option group (has 'options' array property)
            if (
              item.isGrouped &&
              option.options &&
              Array.isArray(option.options)
            ) {
              return {
                label: option.label,
                icon: option?.icon,
                options: option.options.map((opt) => ({
                  label: replaceSpecialCharacter(opt.label || opt.name),
                  value: opt.id || opt.value,
                  isDisabled: opt.isDisabled,
                })),
              };
            }
           
            return {
              label: replaceSpecialCharacter(option.label || option.name),
              value: option.id || option.value,
              isDisabled: option.isDisabled,
            };
          })
        : item?.options;
      listOptions = Array.isArray(listOptions)
        ? listOptions.map((item) => {
            // Check if this is an option group (has 'options' array property)  
          if (item.isGrouped && item.options && Array.isArray(item.options)) {
              return {
                label: item.label,
                icon: item?.icon,
                options: item.options.map((opt) => ({
                  ...opt,
                  label: opt.label
                    ? typeof opt.label === "object"
                      ? opt.label
                      : replaceSpecialCharacter(opt.label.toString())
                    : "",
                })),
              };
            }
            // Regular option
            item.label = item.label
              ? typeof item.label === "object"
                ? item.label
                : replaceSpecialCharacter(item.label.toString())
              : "";
            return item;
          })
        : listOptions;
    }

    const uniqueInputId = uniqueId(item.accessor);

    switch (item.field_type) {
      case "Heading":
        return (
          <div className="horizontal-panel">
            <Typography variant="h4" component="span">
              {item.title}
            </Typography>
          </div>
        );
      case "TextField":
        return (
          <Input
            key={index}
            label={item.label}
            type={item?.value_type || "text"}
            isDisabled={item.isDisabled || props.disabledFields}
            id={uniqueInputId}
            placeholder={item.label}
            onChange={(event) =>
              handleChange(event, item.field_type, item.accessor, item)
            }
            isRequired={item.required || item.is_mandatory || item.is_required}
            onBlur={(event) => props.handleOnBlur && props.handleOnBlur(event,item)}
            value={formData[item?.accessor] || ""}
            name={item.accessor}
            isHelperText={item.error}
            helperText={item.error ? item.helperText : ""}
            isError={item.error}
            inputProps={{
              maxLength: item.maxLengthLimit,
            }}
          />
        );
      case "transparentDropdown":
      case "list":
      case "dropdown":
        const selectedOptions = setSelectValue(item);
        return (
          <>
            <Select
              {...item}
              handleResetFlag={props?.handleResetFlag}
              handleReset={props?.handleReset}
              isDropdownTransparent={item.field_type === "transparentDropdown"}
              menuPosition={"fixed"}
              isDisabled={
                item.isDisabled || props.disabledFields ? true : false
              }
              name={item.accessor}
              isSearchable={props?.isSearchable !== false}
              menuShouldBlockScroll={true}
              pagination={item.pagination}
              fetchOptions={item.fetchOptions}
              is_multiple_selection={item.isMulti ? true : false}
              dependency={props.selectDependency ? props.selectDependency : []}
              initialData={listOptions}
              selectedOptions={formData?.[item.accessor] ? selectedOptions : []}
              id={uniqueInputId}
              data-testid={`select${item.name}`}
              updateDependency={(key, option) =>
                handleChange(
                  option,
                  item.field_type,
                  item.accessor,
                  item,
                  key.check_configuration
                )
              }
              label={item.label ? item.label : item.key}
              selectAllLabel={item.label || item?.key}
              isClearable={item.isClearable || item.is_clearable ? true : false}
              customPlaceholder={`${"Select"}${" "}${item.label}`}
              reset={props.resetOptions}
              updation={props.dependencyChange}
              doNotUpdateDefaultValue={props.updateDefaultValue}
              handleDropdownClose={props.handleDropdownClose ? true : false}
              isSelectAllButtonHidden={item.isSelectAllButtonHidden}
              labelOrientation={item?.labelOrientation}
              withPortal={props?.withPortal || false}
              width={props?.selectWidth}
              minWidth={props?.selectMinWidth}
              isFormComponent={props?.isFormComponent}
            />
          </>
        );

      case "sliderRange":
        return (
          <Slider
            header={item.header}
            label={item.label}
            max={formData[item?.accessor]?.range_max}
            disabled={item.isDisabled || item.is_disabled}
            required={item.is_mandatory || item.is_required}
            min={formData[item?.accessor]?.range_min}
            onChange={(e) => {
              handleChange(e, item.field_type, item.accessor, item);
            }}
            value={formData[item?.accessor]?.value}
            variant={item.variant}
            headerOrientation={item.headerOrientation}
            inputPosition={item.inputPosition}
          />
        );
      case "autocompleteDropdown":
        const selectedValues = item.is_multiple_selection
          ? formData[item.accessor].map((opt) => {
              return {
                label: opt.label || opt.name,
                value: opt.value,
              };
            }) || []
          : [
              {
                label: formData[item.accessor],
                value: formData[item.accessor],
              },
            ];
        return (
          <CreatableSelect
            name={item.accessor}
            key={`selectable__${index}`}
            isDisabled={item.isDisabled || props.disabledFields ? true : false}
            isSearchable={item.isSearchable ? true : false}
            is_multiple_selection={item.is_multiple_selection ? true : false}
            initialData={listOptions}
            selectedOptions={formData[item.accessor] ? selectedValues : []}
            updateDependency={(option) =>
              handleChange(option, item.field_type, item.accessor, item)
            }
            label={item.key ? item.key : item.label}
            isClearable={item.is_clearable ? true : false}
            id={uniqueInputId}
          />
        );
      case "list":
        const value = setSelectValue(item);
        return (
          <div>
            <ReactSelect
              id={uniqueInputId}
              menuPosition={"fixed"}
              isDisabled={
                item.isDisabled || props.disabledFields ? true : false
              }
              name={item.accessor}
              isSearchable={item.isSearchable ? true : false}
              isClearable={item.isClearable ? true : false}
              className={item.error ? classes.errorBorder : ""}
              onInputChange={
                item.onInputChange
                  ? (searchkey, param) => {
                      item.onInputChange(
                        searchkey,
                        param,
                        item,
                        formData[`${item.accessor}_options`]
                      );
                    }
                  : null
              }
              menuShouldBlockScroll={false}
              pagination={item.pagination}
              fetchOptions={item.fetchOptions}
              isMulti={item.isMulti ? true : false}
              options={listOptions}
              value={formData[item.accessor] ? value : ""}
              data-testid={`select${item.name}`}
              onChange={(option) =>
                handleChange(option, item.field_type, item.accessor, item)
              }
              menuPortalTarget={item.menuPortalTarget ? document.body : ""}
              withPortal={props?.withPortal || false}
            />
            <span className={item.error ? classes.dropDownError : ""}>
              {item.error ? item.helperText : ""}
            </span>
          </div>
        );
      case "IntegerField":
        return (
          <div className={sharedClasses.dashboardFilterContainer}>
            <Input
              key={index}
              label={item?.label || null}
              type="number"
              variant="outlined"
              size={item.size || "large"}
              className={
                item.value_type ? classes.textfieldAttribute : classes.TextField
              }
              id={uniqueInputId}
              onChange={(event) =>
                handleChange(event, item.field_type, item.accessor, item)
              }
              onKeyDown={(e) => {
                if (
                  !suppressSymbolKeyPress &&
                  (e.key === "." ||
                    (e.key === "-" && item.no_negative_values) ||
                    e.key.toLowerCase() === "e")
                ) {
                  e.preventDefault();
                }
              }}
              value={formData[item.accessor]}
              name={item.accessor}
              helperText={genricValidation(item, formData[item.accessor])}
              isError={
                item.error_type === "function"
                  ? item.error(formData[item.accessor])
                  : item.error
              }
              isHelperText={
                item.error_type === "function"
                  ? item.error(formData[item.accessor])
                  : item.error
              }
              isDisabled={item.isDisabled || props.disabledFields}
              inputProps={{ step: item.step_value ? item.step_value : 1 }}
              InputProps={{
                endAdornment: inputAttribute(item.value_type) !== " " && (
                  <InputAdornment position="end">
                    {inputAttribute(item.value_type)}
                  </InputAdornment>
                ),
              }}
              onBlur={(event) =>
                props.handleOnBlur && props.handleOnBlur(event, item)
              }
              isRequired={item.is_mandatory || item.is_required || item.required}
            />
            {props.renderForm ? props.renderForm(formData, item) : null}
          </div>
        );
      case "BooleanField":
        return (
          <Checkbox
            label={item.label}
            id={`${uniqueInputId}-checkBox`}
            disabled={item.isDisabled || props.disabledFields}
            name={item.accessor}
            required={props.is_mandatory || props.is_required || props.required}
            className={classes.checkbox}
            checked={formData[item.accessor] || false}
            onChange={(e) =>
              handleChange(e, item.field_type, item.accessor, item)
            }
          />
        );
      case "ChipsInput":
        return (
          <ChipsInput
            id={`${uniqueInputId}-formChip`}
            {...item}
            tagifyRef={props.tagifyRef}
            formData={formData}
            value={
              props.defaultValues[item.accessor]
                ? props.defaultValues[item.accessor]
                : ""
            }
            onBlur={() => {
              onBlur("", item.field_type, item.accessor);
            }}
          />
        );
      case "ChipsTagInput":
        return (
          <ChipsTagInput
            id={`${item.accessor}-formChip`}
            {...item}
            tagifyRef={props.tagifyRef}
            formData={formData}
            value={
              props.defaultValues[item.accessor]
                ? props.defaultValues[item.accessor]
                : ""
            }
            onChange={(event) =>
              handleChange(event, item.field_type, item.accessor, item)
            }
            onBlur={() => {
              onBlur("", item.field_type, item.accessor);
            }}
          />
        );
      case "DateTimeField":
        return (
          <DatePickerWrapper
            isDisabled={item.isDisabled || props.disabledFields}
            placeholder={item?.placeholder || ""}
            label={item?.label || ""}
            isError={item.error}
            disableFuture={item.disableFuture}
            isRequired={item.is_mandatory || item.is_required || item.required}
            disablePast={item.disablePast}
            disableHighlightToday={
              item?.maxDate &&
              moment(item.maxDate).isBefore(moment().format("MM-DD-YYYY"))
            }
            disableOnlyPast={item.disableOnlyPast || item.disablePast}
            clearable={true}
            helperText={item.error ? item.helperText : ""}
            onPrimaryButtonClick={(date) => {
              handleChange(date, item.field_type, item.accessor, item);
            }}
            minDate={item?.minDate || null}
            maxDate={item?.maxDate} //Having max date
            selectedDate={formData[item.accessor] || null}
            withPortal={props?.withPortal || false}
            customYears={item?.extra?.customYears}
            labelOrientation={item?.labelOrientation || "top"}
            suppressCustomYears={props?.suppressCustomYears || false}
            isOutsideRange={(date) =>
              item.shouldDisableDate
                ? item.shouldDisableDate(date, formData[item.accessor] || null)
                : null
            }
          />
        );
      case "DateAndTimeField":
        return (
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <DateTimePicker
              withPortal={props?.withPortal || false}
              disableToolbar
              variant="inline"
              clearable={true}
              inputVariant="outlined"
              inputFormat={item?.extra.dateFormat}
              id="date-picker"
              value={formData[item.accessor] || null}
              onChange={(e) => {
                handleChange(e, item.field_type, item.accessor, item);
              }}
              helperText={item.error ? item.helperText : ""}
              renderInput={(props) => (
                <TextField
                  helperText={item.error ? item.helperText : ""}
                  {...props}
                  variant="outlined"
                  size="small"
                  className={classes.TextField}
                />
              )}
              error={item.error}
              placeholder={item.label}
              keyboardIcon={<i class="fa fa-calendar" aria-hidden="true"></i>}
              InputProps={{
                endAdornment:
                  // to reset the selected value
                  !(item.isDisabled || props.disabledFields) && (
                    <IconButton
                      onClick={() =>
                        handleChange("", item.field_type, item.accessor, item)
                      }
                      className={classes.IconButton}
                    >
                      <ClearIcon id="closeIcon" />
                    </IconButton>
                  ),
              }}
              InputAdornmentProps={{
                position: "start",
              }}
              defaultCalendarMonth={(() => {
                if (item.accessor.includes("end_")) {
                  const defaultCalendarDate = moment(
                    formData[item.accessor.replace("end", "start")]
                  );
                  if (defaultCalendarDate.isValid()) {
                    return defaultCalendarDate;
                  }
                }
                return null;
              })()}
            />
          </LocalizationProvider>
        );

      case "fiscalCalendar":
        return (
          <NormalCalendarFiscalMapping
            selectedDate={formData[item.accessor]}
            onDateChange={(e) =>
              handleChange(e, item.field_type, item.accessor, item)
            }
            id={uniqueInputId}
            disablePastWeeks={item.disablePastWeeks}
            disableFutureWeeks={item.disableFutureWeeks}
            disabled={item.isDisabled || props.disabledFields}
            isMandatory={item.isMandatory}
            fiscalCalendarData={item.options}
            displayRow={item.displayRow}
            setValueOnBlur={item.setValueOnBlur}
            maxOneWeekSelection={item.maxOneWeekSelection}
            isOutsideRange={item.isOutsideRange}
            showClearDates={item.showClearDates}
            resetOptions={props.resetOptions}
            showDefaultLabel={item.showDefaultLabel} // Flag to display or hide the default Label
            label={item.label}
            dateFilterFormat={props.tenantDateFormat}
            isRequired={item.is_required || item.is_mandatory || item.required}
          />
        );
      case "monthRangePicker":
        return (
          <SimpleMonthRangePickerWrapper
            customWidth={item.customWidth || "282px"}
            displayFormat="MM/YY"
            startMonth={formData[item.accessor]?.startMonth || null}
            endMonth={formData[item.accessor]?.endMonth || null}
            focusedInput={formData[`${item.accessor}_focused`] || null}
            isOutsideRange={item.isOutsideRangeMonth || (() => false)}
            locale={item.locale || "en-US"}
            onApply={(startMonth, endMonth) =>
              handleChange({ startMonth, endMonth }, item.field_type, item.accessor, item)
            }
            disabled={item.isDisabled || props.disabledFields}
            showClearDates={item.showClearDates}
            label={item.label}
          />
        );
      case "radioGroup":
        return (
          <>
            <Typography
              className={`${classes.marginRight1rem} ${classes.label}`}
              color={colours.lightNeutrals}
            >
              {item.label}
            </Typography>
            <RadioButtonGroup
              options={item.options}
              isDisabled={item.is_disabled}
              value={formData[item.accessor] || ""}
              name="row-radio-buttons-group"
              onChange={(event) => {
                handleChange(event, item.field_type, item.accessor, item);
              }}
              orientation="row"
            />
          </>
        );
      case "checkBoxGroup":
        return (
          <FormControl
            id={`${uniqueInputId}-formRadioGrp`}
            component="fieldset"
          >
            <FormGroup
              value={formData[item.accessor] || ""}
              onChange={(event) => {
                handleChange(event, item.field_type, item.accessor, item);
              }}
              aria-label="form-field-radio-group"
              name="row-radio-buttons-group"
            >
              {item.options.map((option) => {
                return (
                  <FormControlLabel
                    className="form-field-radio-group-element"
                    disabled={option.isDisabled || props.disabledFields}
                    control={
                      <Checkbox
                        checked={
                          formData[item.accessor]?.[option.value] ? true : false
                        }
                        value={option.value}
                        defaultChecked={formData[item.accessor]?.[option.value]}
                      />
                    }
                    label={option.label}
                  />
                );
              })}
            </FormGroup>
          </FormControl>
        );
      case "rangePicker":
        return (
          <RangePicker
            {...item}
            id={uniqueInputId}
            disabled={item.isDisabled || props.disabledFields}
            disableType={
              item.startYear ? false : item.disableType || "disablePast"
            }
            isRequired={item.is_required || item.is_mandatory || item.required}
            label={item.label}
            startDateId={item.startDateId || "start_date_id"}
            endDateId={item.endDateId || "end_date_id"}
            showMonthYearSelect
            //when date range filter is saved as user pref then it comes as object instead of array.
            startDate={
              formData[item.accessor]
                ? moment.isMoment(formData[item.accessor][0])
                  ? formData[item.accessor][0]
                  : moment(formData[item.accessor][0]).isValid()
                  ? typeof formData[item.accessor][0] === "string"
                    ? moment(formData[item.accessor][0])
                    : moment(formData[item.accessor][0]?.value)
                  : null
                : null
            }
            endDate={
              formData[item.accessor]
                ? moment.isMoment(formData[item.accessor][1])
                  ? formData[item.accessor][1]
                  : moment(formData[item.accessor][1]).isValid()
                  ? typeof formData[item.accessor][1] === "string"
                    ? moment(formData[item.accessor][1])
                    : moment(formData[item.accessor][1]?.value)
                  : null
                : null
            }
            startYear={item.startYear}
            noPortal={props.noPortal !== undefined ? props.noPortal : true}
            onDatesChange={(start, end) => {
              handleChange([start, end], item.field_type, item.accessor, item);
            }}
            enabledStartDays={item.enabledStartDays}
            enabledEndDays={item.enabledEndDays}
            dateFormat={DEFAULT_DATE_FORMAT}
            onClose={
              props.onClose &&
              ((event) => {
                props.onClose(event);
              })
            }
            resetOptions={props.resetOptions}
            customYears={item?.extra?.customYears}
            {...props}
          />
        );
      case "deleteRow":
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "8px",
            }}
          >
            <Button
              onClick={() => handleChange(true, item.field_type, item.accessor)}
              size="large"
              disabled={item.disabled || props.disabledFields}
              id={uniqueInputId}
              variant="tertiary"
            >
              <DeleteIcon id="delete-Icon" />
            </Button>
          </div>
        );
      case "readOnly":
        return (
          <span className={classes.textReadOnly}>
            {formData[item.accessor] || ""}
          </span>
        );
      case "toggle":
        const checked =
          typeof formData[item?.accessor] === "string"
            ? formData[item?.accessor] !== item?.options[0]?.value
            : formData[item?.accessor];
        return (
          <FormControl
            id={`${uniqueInputId}-formtoggle`}
            component="fieldset"
            className={sharedClasses.searchGrid}
          >
            {item.options.length === 0 && (
              <Typography
                className={`${classes.marginRight1rem} ${classes.marginBottom1rem}`}
                color={colours.lightNeutrals}
              >
                {item.label}
              </Typography>
            )}
            <Switch
              onChange={(event) => {
                handleChange(event, item.field_type, item.accessor, item);
              }}
              checked={checked}
              leftLabel={item?.options[0]?.label || ""}
              rightLabel={item?.options[1]?.label || ""}
              aria-label="form-field-switch"
              value={formData[item.accessor]}
              name="switch-fields"
            />
          </FormControl>
        );
      case "CustomToggleField":
        return (
          <Switch
            onClick={(e) => {
              handleChange(e, item.field_type, item.accessor, item);
            }}
            defaultChecked={formData[item.accessor] ? true : false}
            name={item.accessor}
            color="primary"
          />
        );
      case "multiple_daterangepicker":
        return (
          <MultipleDateRangePicker
            onCellValueChanged={(values) => {
              handleChange(values, item.field_type, item.accessor, item);
            }}
            id={uniqueInputId}
            {...props?.cellData}
          />
        );
      case "table": {
        // Get table data from formData (array of objects)
        // Fallback to initialData if formData is empty
        let tableData = Array.isArray(formData[item.accessor])
          ? formData[item.accessor]
          : Array.isArray(item.initialData)
          ? item.initialData
          : [];

        // Infer columns from the data
        const inferredColumns = inferTableColumns(tableData);

        // Create unique keys for this table's Redux state (using jsonParserReducer for TableWrapper)
        const tableColumnKey = `${item.accessor}_columns`;
        const tableRowKey = `${item.accessor}_rows`;

        return (
          <TableFormField
            tableColumnKey={tableColumnKey}
            tableRowKey={tableRowKey}
            inferredColumns={inferredColumns}
            tableData={tableData}
            item={item}
            handleChange={handleChange}
          />
        );
      }
      case "chips": {
        return (
          <FormGroup
            aria-label="form-field-chips-group"
            className={classes.chipsWrapper}
            name="row-chips-group"
          >
            {item?.options?.map((option) => {
              return (
                <Chips
                  label={option?.label}
                  onClick={(label) => {
                  handleChange(option?.value, item.field_type, item.accessor, item, option);
                  }}
                  type={option?.type || "multi"}
                  isActive={formData[item.accessor]?.[option?.value]}
                  disabled={option.isDisabled || props.disabledFields}
                />
              );
            })}
          </FormGroup>
        );
      }
      default:
        return null;
    }
  };

  useEffect(() => {
    window.addEventListener("resize", () => {
      setWindowSize(window.innerWidth);
    });

    return () => {
      window.removeEventListener("resize", () => {
        setWindowSize(window.innerWidth);
      });
    };
  }, []);

  const render = () => {
    let num = props.maxFieldsInRow ? props.maxFieldsInRow : 1;

    const containerWidth = windowSize - SIDEBAR_AND_SPACE_WIDTH;
    const numberOfFieldPerRow = Math.floor(containerWidth / FIXED_FIELD_WIDTH);

    // 1 means 8px that's according to the Figma we added for FilterPanel and disableFilterModal
    const spacing = props.disableFilterModal ? 2 : 3;
    const rowSpacing = props.disableFilterModal ? 2 : 2.5;
    const alignFields = props?.alignFields ? props?.alignFields : "center";

    if (props.layout === "vertical") {
      return (
        <Grid
          container
          columnSpacing={{
            xs: spacing,
            md: props.spacing ? props.spacing : spacing,
          }}
          rowSpacing={props.rowSpacing ? props.rowSpacing : rowSpacing}
          alignItems={alignFields}
        >
          {props.fields.map((field, index) => {
            // Check if this is a table field - tables should always get full width
            const fieldType = field.display_type || field.field_type || "";
            const isTable = fieldType === "table" || fieldType.toLowerCase() === "table";

            return (
              <>
                {props.children &&
                  index !== 0 &&
                  index % numberOfFieldPerRow === 0 && (
                    <Grid item columnSpacing={5} xs={12}>
                      {props.children}
                    </Grid>
                  )}
                <Grid
                  item
                  xs={isTable ? 12 : undefined}
                  sm={isTable ? 12 : undefined}
                  md={isTable ? 12 : undefined}
                  lg={isTable ? 12 : undefined}
                  xl={isTable ? 12 : undefined}
                  sx={isTable ? { width: "100%", maxWidth: "100%" } : {}}
                  className="form-field-vertical-container"
                >
                  {props.separater &&
                    index !== 0 &&
                    index % numberOfFieldPerRow != 0 && (
                      <span className="separater" />
                    )}
                  <div style={isTable ? { width: "100%", maxWidth: "100%" } : {}}>
                    {renderForm(field, index)}
                  </div>
                </Grid>
              </>
            );
          })}
        </Grid>
      );
    } else if (props.layout === "clusterGraph") {
      let count = Math.trunc(12 / num);
      return (
        <div id="formbody">
          <Grid container alignItems={alignFields} spacing={props?.spacing}>
            {props?.fields?.map((field, index) => {
              count = props.lastElement === field.accessor ? 12 : count;
              return (
                field && (
                  <Grid container alignItems="left" item xs={count}>
                    <Grid
                      item
                      xs={
                        props.fieldTypeWidthSpan ? props.fieldTypeWidthSpan : 8
                      }
                      className="dropdown-label-padding"
                    >
                      {renderForm(field, index)}
                      <div style={{ width: "100%" }}>
                        {field.children ? field.children : ""}
                      </div>
                    </Grid>
                  </Grid>
                )
              );
            })}
          </Grid>
        </div>
      );
    } else {
      let count = Math.trunc(12 / num);
      return (
        <div id="formbody">
          <Grid container alignItems={alignFields} spacing={props.spacing}>
            {props?.fields?.map((field, index) => {
              return (
                field && (
                  <Grid container alignItems="left" item xs={count}>
                    {renderForm(field, index)}
                    <div style={{ width: "100%" }}>
                      {field.children ? field.children : ""}
                    </div>
                  </Grid>
                )
              );
            })}
          </Grid>
        </div>
      );
    }
  };

  return <>{render()}</>;
};

const mapStateToProps = (state) => {
  return {
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
  };
};

export default connect(mapStateToProps, null)(Form);
