import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  InputLabel,
  Checkbox,
  Grid,
  IconButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  InputAdornment,
  TextField,
  FormGroup,
  Typography,
  Switch,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReactSelect from "../select";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import ChipsInput from "../chips-input";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import RangePicker from "../../commonComponents/dateRangePicker";
import Select from "core/commonComponents/filters/Select/Select";
import "./index.scss";
import { StyledRadio } from "core/Utils/selection/selection";
import CreatableSelect from "core/commonComponents/filters/CreatableSelect/CreatableSelect";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { find, isObject, isNil, isEmpty } from "lodash";
import moment from "moment";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { pxToRem, replaceSpecialCharacter } from "core/Utils/functions/utils";
import MultipleDateRangePicker from "core/Utils/agGrid/cellsToBeRendered/multipleDateRangePicker/multipleDateRangePicker";

const useStyles = makeStyles((theme) => ({
  TextField: {
    width: "100%",
    "& .MuiFormControl-root": {
      width: "100%",
    },
  },
  textfieldAttribute: {
    paddingLeft: "0.5rem",
    "& .MuiInputBase-input": {
      padding: "10px",
      borderRight: "1px solid lightgrey",
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
}));

const Form = (props) => {
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const [formData, setFormData] = useState(props.defaultValues);

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
        obj[e.target.name] = e.target.checked;
        break;
      case "DateTimeField":
        obj[id] = e;
        break;
      case "dropdown":
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
      case "list":
        if (field.isMulti) {
          let newValue = e.map((opt) => opt.value);
          obj[id] = newValue;
          obj[`${id}_options`] = e;
        } else {
          obj[id] = e.value;
        }
        break;
      case "ChipsInput":
        obj[id] = e ? e.value : "";
        break;
      case "radioGroup":
        obj[id] = e.target.value;
        break;
      case "checkBoxGroup":
        let newValue = e.map((opt) => opt.value);
        obj[id] = newValue;
        break;
      case "rangePicker":
        obj[id] = e;
        break;
      case "fiscalCalendar":
        obj[id] = e;
        break;
      case "deleteRow":
        obj[id] = true;
        break;
      case "toggle":
        obj[id] = field?.options?.filter((item) => {
          return item.label !== e.target.value;
        })?.[0]?.label;
        break;
      case "multiple_daterangepicker":
        obj[id] = e;
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
    if (item.error) {
      return item.helperText;
    }
    // do not allow to enter negative values
    if (item?.no_negative_values) {
      if (parseInt(value) < 0) {
        setFormData({ ...formData, [item.accessor]: "0" });
        formData[item.accessor] = "0";
        props.handleChange(formData, item.accessor, item);
      }
    }
    if (item.value_type === "percentage") {
      // parseFloat is used as the input accepts decimal values (100.5 should be reset to 100)
      if (parseInt(value) >= 0 && parseFloat(value) > 100) {
        setFormData({ ...formData, [item.accessor]: "100" });
        formData[item.accessor] = "100";
        props.handleChange(formData);
        return " please Enter value less than 100 ";
      }
      if (item.is_negative_value_allowed) {
        // max negative percentage value can be -100%
        if (item?.maxNegativePer && parseInt(value) < -100 && parseFloat(value) < -100) {

          setFormData({ ...formData, [item.accessor]: "-100" });
          formData[item.accessor] = "-100";
          props.handleChange(formData);
          return " please Enter value greater than -100 ";
        }
        return "";
      }
      if (parseInt(value) < 0) {
        setFormData({ ...formData, [item.accessor]: "0" });
        formData[item.accessor] = "0";
        props.handleChange(formData);
        return " please Enter value greater than 0 ";
      }
    }
    return "";
  };

  const onBlur = (_e, type, id) => {
    props.onBlur && props.onBlur();
  };

  const setSelectValue = (item) => {
    try {
      if (formData[item.accessor]) {
        let data = item?.options?.filter((option) => {
          if (Array.isArray(formData[item.accessor])) {
            const check = find(formData[item.accessor], (item) => {
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
      item.field_type === "list"
    ) {
      listOptions = Array.isArray(item?.options)
        ? item.options.map((option) => {
            return {
              label: replaceSpecialCharacter(option.label || option.name),
              value: option.id || option.value,
            };
          })
        : item?.options;
      listOptions = Array.isArray(listOptions)
        ? listOptions.map((item) => {
            item.label = item.label
              ? replaceSpecialCharacter(item.label.toString())
              : "";
            return item;
          })
        : listOptions;
    }

    switch (item.field_type) {
      case "TextField":
        return (
          <TextField
            key={index}
            type={item?.value_type || "text"}
            disabled={item.isDisabled || props.disabledFields}
            variant="outlined"
            size="small"
            multiline={item.multiline}
            rows={item.maxRows}
            className={classes.TextField}
            id={`new${item.accessor}`}
            onChange={(event) =>
              handleChange(event, item.field_type, item.accessor, item)
            }
            onBlur={(event) => props.handleOnBlur && props.handleOnBlur(event)}
            value={formData[item.accessor] || ""}
            name={item.accessor}
            helperText={item.error ? item.helperText : ""}
            error={item.error}
            inputProps={{ maxLength: item.maxLengthLimit }}
          />
        );
      case "dropdown":
        const newvalue = setSelectValue(item);
        const selectedOption = !item.isMulti ? [newvalue] : newvalue;
        return (
          <Select
            {...item}
            menuPosition={"fixed"}
            isDisabled={item.isDisabled || props.disabledFields ? true : false}
            name={item.accessor}
            isSearchable={item.isSearchable ? true : false}
            menuShouldBlockScroll={true}
            pagination={item.pagination}
            fetchOptions={item.fetchOptions}
            is_multiple_selection={item.isMulti ? true : false}
            dependency={props.selectDependency ? props.selectDependency : []}
            initialData={listOptions}
            selectedOptions={formData[item.accessor] ? selectedOption : []}
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
            isViewCluster = {props.isViewCluster || false}
            label={item.key ? item.key : item.label}
            selectAllLabel={item.label || item?.key}
            isClearable={item.isClearable || item.is_clearable ? true : false}
            customPlaceholder={`${"Select"}${" "}${item.label}`}
            reset={props.resetOptions}
            updation={props.dependencyChange}
            doNotUpdateDefaultValue={props.updateDefaultValue}
            handleDropdownClose={props.handleDropdownClose ? true : false}
            isSelectAllButtonHidden={item.isSelectAllButtonHidden}
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
          />
        );
      case "list":
        const value = setSelectValue(item);
        return (
          <div>
            <ReactSelect
              id={`new${item.accessor}`}
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
              maxMultiSelect={item.maxMultiSelect}
              onMaxLimitExceeded={props.onMaxLimitExceeded}
              options={listOptions}
              value={formData[item.accessor] ? value : ""}
              data-testid={`select${item.name}`}
              onChange={(option) =>
                handleChange(option, item.field_type, item.accessor, item)
              }
              menuPortalTarget={item.menuPortalTarget ? document.body : ""}
            />
            <span className={item.error ? classes.dropDownError : ""}>
              {item.error ? item.helperText : ""}
            </span>
          </div>
        );
      case "IntegerField":
        return (
          <div className={sharedClasses.dashboardFilterContainer}>
            <TextField
              key={index}
              type="number"
              variant="outlined"
              size="small"
              className={
                item.value_type ? classes.textfieldAttribute : classes.TextField
              }
              id={`new${item.accessor}`}
              onChange={(event) =>
                handleChange(event, item.field_type, item.accessor, item)
              }
              value={formData[item.accessor]}
              name={item.accessor}
              helperText={genricValidation(item, formData[item.accessor])}
              error={item.error}
              disabled={item.isDisabled || props.disabledFields}
              inputProps={{ step: item.step_value ? item.step_value : 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {inputAttribute(item.value_type)}
                  </InputAdornment>
                ),
              }}
            />
            {props.renderForm ? props.renderForm(formData, item) : null}
          </div>
        );
      case "BooleanField":
        return (
          <Checkbox
            id={`${item.accessor}-checkBox`}
            disabled={item.isDisabled || props.disabledFields}
            name={item.accessor}
            color="primary"
            className={classes.checkbox}
            checked={formData[item.accessor] || false}
            onChange={(e) => {
              handleChange(e, item.field_type, item.accessor, item);
            }}
          />
        );
      case "ChipsInput":
        return (
          <ChipsInput
            id={`${item.accessor}-formChip`}
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
      case "DateTimeField":
        return (
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <DatePicker
              disableToolbar
              disabled={item.isDisabled || props.disabledFields}
              disablePast={item.disablePast ? true : false}
              disableFuture={item.disableFuture}
              minDate={item?.minDate || null}
              disableHighlightToday={
                item?.maxDate &&
                moment(item.maxDate).isBefore(moment().format("MM-DD-YYYY"))
              } //If max date is present and max date is before today then don't highlight today's date
              maxDate={item?.maxDate} //Having max date
              minDateMessage={null}
              variant="inline"
              clearable={true}
              inputVariant="outlined"
              inputFormat={item?.displayDateFormat||props.tenantDateFormat}
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
              keyboardIcon={<CalendarMonthIcon />}
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
              inputProps={{
                ...props.inputProps,
                readOnly: item?.isKeyBoardDisable ? true : false, // Prevent manual input if we want to only select date from calender
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
          />
        );
      case "radioGroup":
        return (
          <FormControl
            id={`${item.accessor}-formRadioGrp`}
            component="fieldset"
          >
            <RadioGroup
              row
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
                    disabled={option.isDisabled || props.disabledFields}
                    value={option.value}
                    control={<StyledRadio color="primary" />}
                    label={option.label}
                    className={
                      props?.spacing ? classes.formControlLabelStyle : ""
                    }
                  />
                );
              })}
            </RadioGroup>
          </FormControl>
        );
      case "checkBoxGroup":
        return (
          <FormControl
            id={`${item.accessor}-formRadioGrp`}
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
                    disabled={option.isDisabled || props.disabledFields}
                    value={option.value}
                    control={<Checkbox />}
                    color="primary"
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
            disabled={item.isDisabled || props.disabledFields}
            disableType={
              item.startYear ? false : item.disableType || "disablePast"
            }
            startDateId="start_date_id"
            endDateId="end_date_id"
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
          />
        );
      case "deleteRow":
        return (
          <IconButton
            onClick={() => handleChange(true, item.field_type, item.accessor)}
            size="small"
            disabled={item.disabled || props.disabledFields}
            color="primary"
          >
            <DeleteIcon id="closeIcon" />
          </IconButton>
        );
      case "readOnly":
        let readonlyVal = formData[item.accessor];
        if (Array.isArray(formData[item.accessor])) {
          readonlyVal = formData[item.accessor].join(",");
        }
        return (
          <span className={classes.textReadOnly}>
            {readonlyVal ? replaceSpecialCharacter(readonlyVal) : ""}
          </span>
        );
      case "toggle":
        return (
          <div
            // if toggle is set to disabled:true, it can be enabled onClick
            {...(props.changeDeactive && { onClick: props.changeDeactive })}>

            <FormControl
              id={`${item.accessor}-formtoggle`}
              component="fieldset"
              className={sharedClasses.searchGrid}
            >
              <Typography className={sharedClasses.typographyMarginTop}>
                {item.options?.[0]?.label}
              </Typography>
              <Switch
                onChange={(event) => {
                  handleChange(event, item.field_type, item.accessor, item);
                }}
                checked={
                  formData[item.accessor] === item.options[0]?.label
                    ? false
                    : true
                }
                disabled={item.isDisabled ? item.isDisabled : false}
                color="primary"
                aria-label="form-field-switch"
                value={formData[item.accessor]}
                name="switch-fields"
              ></Switch>
              <Typography className={sharedClasses.typographyMarginTop}>
                {item.options?.[1]?.label}
              </Typography>
            </FormControl>
          </div>
        );
      case "multiple_daterangepicker":
        return (
          <MultipleDateRangePicker
            onCellValueChanged={(values) => {
              handleChange(values, item.field_type, item.accessor, item);
            }}
            {...props?.cellData}
          />
        );
      default:
        return null;
    }
  };

  const render = () => {
    let num = props.maxFieldsInRow ? props.maxFieldsInRow : 1;
    if (props.layout === "vertical") {
      let count = Math.trunc(12 / num);
      return (
        <Grid container alignItems="center" spacing={4}>
          {props.fields.map((field, index) => {
            return (
              <Grid
                item
                xs={
                  field.autoSize
                    ? "auto"
                    : props.sizeOfFieldsInRow && index < 5
                    ? props.sizeOfFieldsInRow
                    : count
                }
              >
                {!field.hideLabel && (
                  <InputLabel className={classes.inputLabel}>
                    {!isEmpty(field.label) && (
                      <span title={field.label}>{`${field.label}: `}</span>
                    )}
                    {(field.is_mandatory || field.required) && (
                      <span className={classes.requiredField}>*</span>
                    )}
                  </InputLabel>
                )}
                {renderForm(field, index)}
              </Grid>
            );
          })}
        </Grid>
      );
    } else {
      let count = Math.trunc(12 / num);
      return (
        <div id="formbody">
          <Grid
            container
            alignItems="center"
            spacing={props?.spacing ? props.spacing : 4}
          >
            {props?.fields?.map((field, index) => {
              return (
                field && (
                  <Grid container alignItems="center" item xs={count}>
                    {!field.hideLabel && (
                      <Grid
                        item
                        xs={props.labelWidthSpan ? props.labelWidthSpan : 4}
                      >
                        <InputLabel
                          className={`ticket-text ${classes.inputLabel}`}
                          required={field.required}
                          title={field.label}
                        >
                          {!isEmpty(field.label) && (
                            <span
                              title={field.label}
                            >{`${field.label}: `}</span>
                          )}
                        </InputLabel>
                      </Grid>
                    )}
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
