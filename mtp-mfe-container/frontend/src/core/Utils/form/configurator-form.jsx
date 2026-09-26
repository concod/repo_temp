import React, { useEffect, useState, useRef } from "react";
import { connect, useDispatch } from "react-redux";
import {
  Grid,
  IconButton,
  FormControl,
  FormControlLabel,
  FormGroup,
  Typography,
  TextField,
  InputAdornment,
  Radio,
} from "@mui/material";
import styles from "core/pages/moduleConfiguratorScreen/designSystem.module.css";
import "react-dates/initialize";
import {
  Input,
  Checkbox,
  RadioButtonGroup,
  Switch,
  Slider,
  Button,
  Chips,
} from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ChipsInput from "../chips-input";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import RangePicker from "../../commonComponents/dateRangePicker";
import Select from "core/commonComponents/filters/Select/Select";
import "./index.scss";
import CreatableSelect from "core/commonComponents/filters/CreatableSelect/CreatableSelect";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { find, isObject, isNil, uniqueId } from "lodash";
import moment from "moment";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { pxToRem, replaceSpecialCharacter } from "core/Utils/functions/utils";
import MultipleDateRangePicker from "core/Utils/agGrid/cellsToBeRendered/multipleDateRangePicker/multipleDateRangePicker";
import DatePickerWrapper from "core/commonComponents/filters/DatePicker/DatePicker";
import colours from "core/Styles/colours";
import ChipsTagInput from "../chips-input/ChipsTagInput";
import { DateTimePicker } from "@mui/x-date-pickers";
import TableWrapper from "../../dynamic/parser/commonComponents/ui/table-wrapper/table-wrapper";
import DropdownGroupField from "./customFormFields/DropdownGroup/DropdownGroupField";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import CustomChipSet from "core/commonComponents/CustomChipSet";
import AdaFormGroup from "./customFormFields/AdaFormGroup";

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
  mapTableWrapper: {
    width: "100%",
    marginTop: pxToRem(8),
    marginBottom: pxToRem(16),
  },
  mapTableLabel: {
    marginBottom: pxToRem(12),
    fontWeight: 600,
    fontSize: pxToRem(14),
    color: colours.cloudBurst,
  },
  mapTableRequired: {
    color: "red",
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
  fieldContainer: {
    width: "100%",
    maxWidth: "100%",
    overflow: "visible", // Changed from "hidden" to allow dropdown menus to overflow
    boxSizing: "border-box",
    "& > *": {
      width: "100%",
      maxWidth: "100%",
    },
    // Ensure labels don't overflow - allow wrapping for better UX
    "& label": {
      maxWidth: "100%",
      overflow: "hidden",
      wordBreak: "break-word",
    },
  },
  ruleGroupContainer: {
    backgroundColor: "#fff",
    border: "1px solid #EFF2FA",
    borderRadius: "8px",
    overflow: "clip",
  },
  ruleGroupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 16px",
    cursor: "pointer",
    userSelect: "none",
  },
  ruleGroupArrowBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "#F5F6FA",
    borderRadius: "8px",
    transition: "transform 0.2s",
    flexShrink: 0,
  },
  ruleGroupArrowExpanded: {
    transform: "rotate(-90deg)",
  },
  ruleGroupArrowCollapsed: {
    transform: "rotate(0deg)",
  },
  ruleGroupTitleWrap: {
    display: "flex",
    alignItems: "center",
  },
  ruleGroupTitle: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    lineHeight: "21px",
    color: "#0D152C",
    textTransform: "capitalize",
  },
  ruleGroupTitleExpanded: {
    fontWeight: 800,
  },
  ruleGroupTitleCollapsed: {
    fontWeight: 600,
  },
  ruleGroupRequired: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    lineHeight: "21px",
    color: "#E15554",
  },
  ruleGroupBodyOuter: {
    padding: "4px 16px 16px",
  },
  ruleGroupBodyCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0px 0px 4px 0px rgba(0, 0, 0, 0.12)",
    padding: "12px",
  },
  ruleGroupTableHeader: {
    display: "grid",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: "8px",
    height: "40px",
  },
  ruleGroupTableHeaderText: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "21px",
    color: "#31416E",
    paddingLeft: "16px",
    textTransform: "capitalize",
  },
  ruleGroupTableHeaderDefault: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "21px",
    color: "#31416E",
    textAlign: "center",
    textTransform: "capitalize",
  },
  ruleGroupRows: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "12px",
  },
  ruleGroupRow: {
    display: "grid",
    alignItems: "center",
    height: "48px",
    borderRadius: "8px",
    transition: "background-color 0.15s, border-color 0.15s",
  },
  ruleGroupRowSelected: {
    backgroundColor: "#ECEEFD",
    border: "1px solid #B3BDF8",
  },
  ruleGroupRowUnselected: {
    backgroundColor: "#fff",
    border: "1px solid #D9DDE7",
  },
  ruleGroupCellCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: "4px",
  },
  ruleGroupCellCenterNoPad: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ruleGroupOptionLabel: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "21px",
    color: "#1F2B4D",
    paddingLeft: "16px",
    textTransform: "capitalize",
  },
  ruleGroupInputCell: {
    padding: "0 16px",
  },
  ruleGroupRadio: {
    color: "#C3C8D4",
    "&.Mui-checked": {
      color: "#4259EE",
    },
    padding: "4px",
  },
  customChipSetContainer: {
    width: "100%",
  },
  customChipSetWrapper: {
    display: "flex",
    padding: "12px",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "24px",
    alignSelf: "stretch",
    borderRadius: "12px",
    backgroundColor: "#F5F6FA",
  },
  customChipSetHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  customChipSetLabel: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: "12px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "20px",
    textTransform: "capitalize",
  },
  customChipSetSelectAll: {
    color: "#4259EE",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    textTransform: "capitalize",
    cursor: "pointer",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  customChipSetChipsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
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
  handleChange,
}) => {
  const classes = useStyles();
  const isKeyValueTable = item.as_map === true;
  // Fill tables (key/value tables and any field with fill_columns) stretch their columns
  // to fit the width; skipAutoSizeColumn stops AG Grid shrinking them back to content
  // width when TableWrapper recreates the columns on edit (initial fit still happens).
  const isFillTable = isKeyValueTable || item.fill_columns === true;
  const keyField = item.map_key_field || "key";
  const valueField = item.map_value_field || "value";
  const tableInstanceRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);

  const addRow = () =>
    tableInstanceRef.current?.api?.applyTransaction({ add: [{ [keyField]: "", [valueField]: "" }] });
  const deleteSelected = () => {
    const api = tableInstanceRef.current?.api;
    const selected = api?.getSelectedRows();
    if (selected?.length) api.applyTransaction({ remove: selected });
    setSelectedRows([]);
  };

  // Add Row / Delete follow the canonical InventorySmart grid toolbar pattern:
  // Add Row lives in the grid's bottom-left, and an icon-only Delete lives in the
  // top-right that stays disabled until one or more rows are selected.
  const toolbarProps = isKeyValueTable
    ? {
        bottomLeftOptions: (
          <Button icon={<AddIcon fontSize="large" />} onClick={addRow} variant="primary">
            Add Row
          </Button>
        ),
        topRightOptions: [
          <Button
            key="delete"
            icon={<DeleteIcon fontSize="large" />}
            onClick={deleteSelected}
            variant="tertiary"
            disabled={!selectedRows.length}
          />,
        ],
      }
    : {};

  return (
    <div className={classes.mapTableWrapper}>
      {item.label && (
        <Typography variant="body2" className={classes.mapTableLabel}>
          {item.label}
          {item.is_mandatory || item.is_required || item.required ? (
            <span className={classes.mapTableRequired}> *</span>
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
          ...toolbarProps,
          ...(isFillTable ? { skipAutoSizeColumn: true } : {}),
        }}
        onSelectionChanged={
          isKeyValueTable
            ? (event) => setSelectedRows(event.api.getSelectedRows())
            : undefined
        }
        renderWhenEmpty={isKeyValueTable}
        loadTableInstance={(instance) => { tableInstanceRef.current = instance; }}
        onTableDataChange={(updatedData) =>
          handleChange(updatedData, item.field_type, item.accessor, item)
        }
      />
    </div>
  );
};

/**
 * RuleGroupField - Renders a collapsible rule accordion with checkbox/radio table rows.
 * Each rule groups an "options" (checkboxes) and "default" (radio) selection together.
 * Styled to match Figma node 3515:14143.
 */
const RuleGroupField = ({
  label,
  ruleNumber,
  isRequired,
  showInput,
  inputPlaceholder,
  options,
  selectedOptions,
  defaultValue,
  inputValues,
  onOptionToggle,
  onSelectAll,
  onDefaultChange,
  onInputChange,
  isDisabled,
  classes,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const allSelected =
    options.length > 0 &&
    options.every((opt) => selectedOptions.includes(opt.value));

  const gridCols = showInput ? "52px 1fr 1fr 120px" : "52px 1fr 120px";

  return (
    <div className={classes.ruleGroupContainer}>
      {/* Accordion Header */}
      <div
        className={classes.ruleGroupHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className={`${classes.ruleGroupArrowBtn} ${
            isExpanded
              ? classes.ruleGroupArrowExpanded
              : classes.ruleGroupArrowCollapsed
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="#0D152C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={classes.ruleGroupTitleWrap}>
          <span
            className={`${classes.ruleGroupTitle} ${
              isExpanded
                ? classes.ruleGroupTitleExpanded
                : classes.ruleGroupTitleCollapsed
            }`}
          >
            Rule {ruleNumber}: {label}
          </span>
          {isRequired && (
            <span
              className={`${classes.ruleGroupRequired} ${
                isExpanded
                  ? classes.ruleGroupTitleExpanded
                  : classes.ruleGroupTitleCollapsed
              }`}
            >
              *
            </span>
          )}
        </div>
      </div>

      {/* Accordion Body */}
      {isExpanded && (
        <div className={classes.ruleGroupBodyOuter}>
          <div className={classes.ruleGroupBodyCard}>
            {/* Table Header Row */}
            <div
              className={classes.ruleGroupTableHeader}
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className={classes.ruleGroupCellCenter}>
                <Checkbox
                  checked={allSelected}
                  onChange={() => onSelectAll(!allSelected)}
                  disabled={isDisabled}
                />
              </div>
              <div className={classes.ruleGroupTableHeaderText}>
                Rule Option
              </div>
              {showInput && (
                <div className={classes.ruleGroupTableHeaderText}>Input</div>
              )}
              <div className={classes.ruleGroupTableHeaderDefault}>Default</div>
            </div>

            {/* Data Rows */}
            <div className={classes.ruleGroupRows}>
              {options.map((option) => {
                const isChecked = selectedOptions.includes(option.value);
                const isDefault = defaultValue === option.value;
                // Determine if this specific option should show an input field
                // Only show input for options that have a value in inputValues (APS, Fixed Push)
                const shouldShowInputForOption =
                  showInput && inputValues && option.value in inputValues;

                return (
                  <div
                    key={option.value}
                    className={`${classes.ruleGroupRow} ${
                      isChecked
                        ? classes.ruleGroupRowSelected
                        : classes.ruleGroupRowUnselected
                    }`}
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div className={classes.ruleGroupCellCenter}>
                      <Checkbox
                        checked={isChecked}
                        onChange={() => onOptionToggle(option.value)}
                        disabled={isDisabled}
                      />
                    </div>
                    <div className={classes.ruleGroupOptionLabel}>
                      {option.label}
                    </div>
                    {showInput && (
                      <div className={classes.ruleGroupInputCell}>
                        {shouldShowInputForOption ? (
                          <Input
                            type="number"
                            placeholder={inputPlaceholder || "Enter value"}
                            value={
                              inputValues && inputValues[option.value] != null
                                ? inputValues[option.value]
                                : ""
                            }
                            onChange={(e) => {
                              let value = e.target.value;
                              // Validation based on option type
                              if (option.value === "fixed_inventory_push") {
                                // Restrict to 1-100 for Fixed Inventory Push
                                const numValue = parseInt(value);
                                if (
                                  value === "" ||
                                  (numValue >= 1 && numValue <= 100)
                                ) {
                                  onInputChange(option.value, value);
                                }
                              } else if (option.value === "aps") {
                                // Restrict to 0-10000 for APS
                                const numValue = parseInt(value);
                                if (
                                  value === "" ||
                                  (numValue >= 0 && numValue <= 10000)
                                ) {
                                  onInputChange(option.value, value);
                                }
                              } else {
                                onInputChange(option.value, value);
                              }
                            }}
                            inputProps={{
                              min:
                                option.value === "fixed_inventory_push" ? 1 : 0,
                              max:
                                option.value === "fixed_inventory_push"
                                  ? 100
                                  : option.value === "aps"
                                  ? 10000
                                  : undefined,
                              step: 1,
                            }}
                            disabled={isDisabled || !isChecked}
                          />
                        ) : null}
                      </div>
                    )}
                    <div className={classes.ruleGroupCellCenterNoPad}>
                      <Radio
                        name={`rule-default-${ruleNumber}`}
                        checked={isDefault}
                        onChange={() => onDefaultChange(option.value)}
                        disabled={isDisabled || !isChecked}
                        size="small"
                        className={classes.ruleGroupRadio}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to check if a field should be rendered based on dependent_on
 * @param {Object} field - The field configuration
 * @param {Object} formData - Current form data state
 * @returns {boolean} - True if field should be rendered, false otherwise
 */
const shouldRenderField = (field, formData) => {
  // If no dependent_on property, always render
  if (!field.dependent_on) {
    return true;
  }

  // Get the value of the dependent field
  const dependentFieldValue = formData[field.dependent_on];

  // Field should be visible if dependent field value is truthy
  return !!dependentFieldValue;
};

const Form = (props) => {
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const [formData, setFormData] = useState(props.defaultValues);
  const [windowSize, setWindowSize] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const { customStyles = {}, suppressSymbolKeyPress = false } = props || {};
  const dispatch = useDispatch();
  useEffect(() => {
    if (props.formDataFromParent) {
      setFormData(props.formDataFromParent);
    }
  }, [props.formDataFromParent]);

  useEffect(() => {
    if (props?.isConfirmationChecking) {
      const hasValidValue = Object.values(formData).some((value) =>
        Boolean(value)
      );
      props?.primaryButtonStateChange(!hasValidValue);
    }
  }, [formData]);

  useEffect(() => {
    if (!props.updateDefaultValue) {
      setFormData(props.defaultValues);
    }
  }, [props.defaultValues]);

  const handleShowSnackbar = (e, snackbar) => {
    if (!snackbar) return;
    const isChecked = e.target.checked;

    const message = isChecked ? snackbar.on_msg : snackbar.off_msg;
    const variant = isChecked ? "info" : "warning";

    if (!message) return;
    // Close existing snackbar
    dispatch(closeSnack());
    // Delay ensures previous snackbar unmounts before showing new one
    const delay = props.snacks ? 100 : 0;

    setTimeout(() => {
      dispatch(
        addSnack({
          message,
          options: {
            variant,
            autoHideDuration: snackbar.duration,
          },
        })
      );
    }, delay);
  };

  const handleChange = (e, type, id, field, checkConfiguration = []) => {
    let obj = { ...formData };
    let initialValue = obj[id];

    if (field["show_snackbar"]) handleShowSnackbar(e, field.show_snackbar);

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
        const rawValueCF = e?.target?.value;
        const previousValueCF = obj[id]?.value;
        let processedSliderValueCF = rawValueCF;

        // If previous value was an array and new value is a string, convert back to array
        if (Array.isArray(previousValueCF) && (typeof rawValueCF === 'string' || typeof rawValueCF === 'number')) {
          const newNumValueCF = parseInt(rawValueCF, 10) || 0;
          const [prevMinCF, prevMaxCF] = previousValueCF;

          // Determine which physical input field was edited by walking up from the
          // target until we find the smallest ancestor containing exactly 2 <input>
          // elements (the min/max slider wrapper), regardless of actual class names.
          let fieldIndexCF = null;
          const targetElCF = e?.target;
          if (targetElCF) {
            let nodeCF = targetElCF.parentElement;
            let depthCF = 0;
            let containerCF = null;
            while (nodeCF && depthCF < 10) {
              const inputsInNodeCF = nodeCF.querySelectorAll ? nodeCF.querySelectorAll("input") : [];
              if (inputsInNodeCF.length === 2) {
                containerCF = nodeCF;
                break;
              }
              nodeCF = nodeCF.parentElement;
              depthCF++;
            }
            if (containerCF) {
              const inputsCF = Array.from(containerCF.querySelectorAll("input"));
              fieldIndexCF = inputsCF.indexOf(targetElCF);
            }
          }

          if (fieldIndexCF === 0) {
            processedSliderValueCF = [newNumValueCF, prevMaxCF];
          } else if (fieldIndexCF === 1) {
            processedSliderValueCF = [prevMinCF, newNumValueCF];
          } else {
            // DOM detection failed - keep original behavior (store raw value)
            processedSliderValueCF = rawValueCF;
          }
        }

        obj[id] = { ...obj[id], value: processedSliderValueCF };
        break;
      case "table":
        // For table, e is the array of objects (row data)
        obj[id] = Array.isArray(e) ? e : [];
        break;
      case "rule_group":
        // e = { options: [...], default: [...], inputs: {...} }
        obj[`${id}__options`] = e.options;
        obj[`${id}__default`] = e.default;
        if (e.inputs !== undefined) {
          obj[`${id}__inputs`] = e.inputs;
        }
        break;
      case "dropdownGroup":
        {
          const dropdownFieldName = field?.dropdownFieldName;
          const nextGroup = { ...(obj[id] || {}) };
          if (dropdownFieldName) {
            if (field?.isMulti) {
              nextGroup[dropdownFieldName] = Array.isArray(e) ? e : [];
            } else {
              nextGroup[dropdownFieldName] = e?.[0] || null;
            }
            obj[id] = nextGroup;
          }
        }
        break;
      case "custom_chip_set":
        // e is the updated array of chip objects with visible property
        // If formData value is an object {}, convert chip array back to object to preserve format
        if (
          obj[id] &&
          typeof obj[id] === "object" &&
          !Array.isArray(obj[id]) &&
          Array.isArray(e)
        ) {
          const origObj = obj[id];
          const converted = {};
          e.forEach((chip, index) => {
            const origEntry = origObj[chip.key] || {};
            const visKey = "enabled" in origEntry ? "enabled" : "visible";
            converted[chip.key] = {
              ...origEntry,
              label: chip.label,
              [visKey]: chip.visible,
              display_order: index + 1,
            };
          });
          obj[id] = converted;
        } else {
          obj[id] = Array.isArray(e) ? e : [];
        }
        break;
      default:
        obj[id] = e.target.value;
        break;
    }
    setFormData(obj);
    // Sanitize dropdownGroup payload before passing to the parent handler.
    // Internally, formData stores full option objects (with `hierarchyLevel` for cascading
    // and `value` as a synthetic identifier). The API expects:
    //   - `hierarchyLevel` stripped (internal-only, used for cascading logic)
    //   - `value` renamed to `column_name` (the canonical identifier for the API)
    // If the option already has a `column_name`, it is preserved as-is.
    let outputFormData = obj;
    if (type === "dropdownGroup") {
      const dropdownGroupValue = obj[id];
      if (dropdownGroupValue && typeof dropdownGroupValue === "object") {
        const sanitizedGroup = {};
        Object.entries(dropdownGroupValue).forEach(
          ([fieldName, selectedValue]) => {
            // Single-select: selectedValue is a single option object
            if (
              selectedValue &&
              typeof selectedValue === "object" &&
              !Array.isArray(selectedValue)
            ) {
              const {
                hierarchyLevel: _hierarchyLevel,
                value: syntheticValue,
                label: displayName,
                ...remainingProps
              } = selectedValue;
              sanitizedGroup[fieldName] = {
                ...remainingProps,
                column_name: remainingProps.column_name || syntheticValue,
                display_name: displayName,
              };
              // Multi-select: selectedValue is an array of option objects
            } else if (Array.isArray(selectedValue)) {
              sanitizedGroup[fieldName] = selectedValue.map((optionItem) => {
                if (optionItem && typeof optionItem === "object") {
                  const {
                    hierarchyLevel: _hierarchyLevel,
                    value: syntheticValue,
                    label: displayName,
                    ...remainingProps
                  } = optionItem;
                  return {
                    ...remainingProps,
                    column_name: remainingProps.column_name || syntheticValue,
                    display_name: displayName,
                  };
                }
                return optionItem;
              });
              // Fallback: pass through primitive or null values unchanged
            } else {
              sanitizedGroup[fieldName] = selectedValue;
            }
          }
        );
        outputFormData = { ...obj, [id]: sanitizedGroup };
      }
    }
    props.handleChange(
      outputFormData,
      id,
      field,
      e,
      initialValue,
      checkConfiguration
    );
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
    if (
      (item.error_type === "function" ? item.error(value) : item.error) &&
      item.helperText
    ) {
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
      } else if (
        firstValue instanceof Date ||
        (typeof firstValue === "string" &&
          /^\d{4}-\d{2}-\d{2}/.test(firstValue))
      ) {
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
            return {
              label: replaceSpecialCharacter(option.label || option.name),
              value: option.id || option.value,
              isDisabled: option.isDisabled,
            };
          })
        : item?.options;
      listOptions = Array.isArray(listOptions)
        ? listOptions.map((item) => {
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

    // Use display_type if available, otherwise fall back to field_type
    const fieldType = item.display_type || item.field_type;

    // Handle non-input field types that don't need accessor/uniqueInputId
    switch (fieldType) {
      case "Heading":
        return (
          <div className="horizontal-panel">
            <Typography variant="h4" component="span">
              {item.title}
            </Typography>
          </div>
        );
      case "section_title":
        return (
          <Typography
            key={`section-title-${index}`}
            variant="subtitle1"
            className={`${styles.text14} ${styles.fontSemibold} ${styles.mt16} ${styles.mb8}`}
            style={{
              color: "#1F2B4D",
            }}
          >
            {item.label}
          </Typography>
        );
      case "nested_box":
        return (
          <div
            key={`nested-box-${index}`}
            className={`${styles.border} ${styles.borderSolid} ${styles.rounded8} ${styles.p16} ${styles.mb16}`}
            style={{
              borderColor: colours.divider || "#F4F4F4",
              backgroundColor: "#ffffff",
            }}
          >
            <Typography
              variant="h6"
              className={`${styles.text16} ${styles.fontSemibold} ${styles.mb16}`}
              style={{
                color: "#1F2B4D",
              }}
            >
              {item.label}
            </Typography>
            {item.nested_fields && Array.isArray(item.nested_fields) && item.nested_fields.map((childItem, childIndex) => {
              // Ensure child has accessor set from field_name if not already set
              const processedChild = {
                ...childItem,
                accessor: childItem.accessor || childItem.field_name,
                field_type: childItem.field_type || childItem.display_type,
                options: childItem.options || childItem.initialData || []
              };

              // Check if nested child should be visible based on dependent_on
              const isChildVisible = shouldRenderField(processedChild, formData);
              
              const renderedChild = renderForm(processedChild, childIndex);
              
              return (
                <div key={`nested-child-${childIndex}`} style={{ display: isChildVisible ? "block" : "none" }}>
                  {renderedChild}
                </div>
              );
            })}
          </div>
        );
    }

    switch (fieldType) {
      case "TextField":
        return (
          <div
            style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
          >
            <Input
              key={index}
              label={item.label}
              type={item?.value_type || "text"}
              disabled={item.isDisabled || props.disabledFields}
              id={uniqueInputId}
              placeholder={item.placeholder || item.label}
              onChange={(event) =>
                handleChange(event, item.field_type, item.accessor, item)
              }
              required={item.required || item.is_mandatory || item.is_required}
              onBlur={(event) =>
                props.handleOnBlur && props.handleOnBlur(event, item)
              }
              value={formData[item?.accessor] || ""}
              name={item.accessor}
              maxLength={item.maxLengthLimit || item.max_length}
            />
          </div>
        );
      case "transparentDropdown":
      case "list":
      case "dropdown":
        const selectedOptions = setSelectValue(item);
        const isMultiple = item.isMulti ? true : false;
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
              isSearchable={item.isSearchable ? true : false}
              menuShouldBlockScroll={true}
              pagination={item.pagination}
              fetchOptions={item.fetchOptions}
              is_multiple_selection={isMultiple}
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

      case "dropdownGroup":
        return (
          <DropdownGroupField
            item={item}
            formData={formData}
            handleChange={handleChange}
            disabledFields={props.disabledFields}
            uniqueInputId={uniqueInputId}
          />
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
              size="small"
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
              isRequired={
                item.is_mandatory || item.is_required || item.required
              }
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
              handleChange(event, fieldType, item.accessor, item)
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

        // Box view: when is_box_view is true, render label, sub-label, and switch in a bordered container
        if (item?.is_box_view) {
          return (
            <div
              className={`${styles.border} ${styles.borderSolid} ${styles.rounded8} ${styles.p12} ${styles.flex} ${styles.flexRow} ${styles.itemsCenter} ${styles.justifyBetween} ${styles.gap16}`}
              style={{
                borderColor: colours.divider || "#F4F4F4",
                backgroundColor: "#ffffff",
              }}
            >
              <div
                className={`${styles.flex} ${styles.flexCol} ${styles.flex1} ${styles.gap4}`}
              >
                {item.label && (
                  <Typography
                    variant="body1"
                    className={`${styles.text14} ${styles.fontSemibold} ${styles.m0}`}
                    style={{
                      color: "#1F2B4D",
                    }}
                  >
                    {item.label}
                  </Typography>
                )}
                {item.sub_label && (
                  <Typography
                    variant="body2"
                    className={`${styles.text12} ${styles.m0}`}
                    style={{
                      color: "#7A8294",
                    }}
                  >
                    {item.sub_label}
                  </Typography>
                )}
              </div>
              <Switch
                id={uniqueInputId}
                onChange={(event) => {
                  handleChange(event, item.field_type, item.accessor, item);
                }}
                checked={checked}
                leftLabel={item?.options?.[0]?.label || ""}
                rightLabel={item?.options?.[1]?.label || ""}
                disabled={item.isDisabled || props.disabledFields}
                aria-label="form-field-switch"
                value={formData[item.accessor]}
                name={item.accessor || "switch-fields"}
              />
            </div>
          );
        }

        // Default view: existing implementation
        return (
          <Switch
            id={uniqueInputId}
            onChange={(event) => {
              handleChange(event, item.field_type, item.accessor, item);
            }}
            checked={checked}
            leftLabel={item.label || ""}
            rightLabel={item?.options[1]?.label || ""}
            disabled={item.isDisabled || props.disabledFields}
            aria-label="form-field-switch"
            value={formData[item.accessor]}
            name={item.accessor || "switch-fields"}
          />
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
        // Get table data from formData, falling back to initialData
        let tableData = formData[item.accessor] !== undefined
          ? formData[item.accessor]
          : item.initialData;

        let inferredColumns;
        if (item.as_map === true) {
          // as_map value is a map object (TAM structure) -> show as {key, value} rows.
          const keyField = item.map_key_field || "key";
          const valueField = item.map_value_field || "value";
          if (tableData && typeof tableData === "object" && !Array.isArray(tableData)) {
            tableData = Object.entries(tableData).map(([k, v]) => ({ [keyField]: k, [valueField]: typeof v === "string" ? v : JSON.stringify(v) }));
          }
          if (!Array.isArray(tableData)) tableData = [];
          // Infer columns (from one empty row when there are none, so the grid + Add Row
          // stay usable).
          inferredColumns = inferTableColumns(
            tableData.length ? tableData : [{ [keyField]: "", [valueField]: "" }]
          );
        } else {
          if (!Array.isArray(tableData)) tableData = [];
          inferredColumns = inferTableColumns(tableData);
        }

        // Stretch columns with flex so they fill the grid width and don't shrink when
        // TableWrapper recreates columns on edit. Opt-in per field via as_map (key/value
        // tables) or fill_columns (e.g. the Metric Columns table); other tables keep their
        // default sizing so no unrelated screen is affected.
        if (item.as_map === true || item.fill_columns === true) {
          inferredColumns = inferredColumns.map(({ width, ...col }) => ({
            ...col,
            flex: 1,
            minWidth: 160,
          }));
        }

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
      case "rule_group": {
        const baseKey = item.accessor;
        const optionsKey = `${baseKey}__options`;
        const defaultKey = `${baseKey}__default`;
        const inputsKey = `${baseKey}__inputs`;
        const selectedOpts = Array.isArray(formData[optionsKey])
          ? formData[optionsKey]
          : [];
        const defaultVal =
          Array.isArray(formData[defaultKey]) && formData[defaultKey].length > 0
            ? formData[defaultKey][0]
            : null;
        const inputVals = formData[inputsKey] || {};
        const allOpts = Array.isArray(item.options) ? item.options : [];

        const dispatchRuleChange = (newOptions, newDefault, newInputs) => {
          const payload = {
            options: newOptions,
            default: newDefault != null ? [newDefault] : [],
          };
          if (item.show_input) {
            payload.inputs = newInputs;
          }
          handleChange(payload, "rule_group", baseKey, item);
        };

        return (
          <RuleGroupField
            classes={classes}
            label={item.label}
            ruleNumber={item.rule_number}
            isRequired={item.is_mandatory || item.is_required}
            showInput={item.show_input}
            inputPlaceholder={item.input_placeholder}
            options={allOpts}
            selectedOptions={selectedOpts}
            defaultValue={defaultVal}
            inputValues={inputVals}
            isDisabled={item.isDisabled || props.disabledFields}
            onOptionToggle={(value) => {
              const isCurrentlySelected = selectedOpts.includes(value);
              const newSelected = isCurrentlySelected
                ? selectedOpts.filter((v) => v !== value)
                : [...selectedOpts, value];
              const newDefault =
                isCurrentlySelected && defaultVal === value ? null : defaultVal;
              dispatchRuleChange(newSelected, newDefault, inputVals);
            }}
            onSelectAll={(selectAll) => {
              const newSelected = selectAll ? allOpts.map((o) => o.value) : [];
              // When selecting all, set first option as default if no default exists
              const newDefault = selectAll
                ? defaultVal || (allOpts.length > 0 ? allOpts[0].value : null)
                : null;
              dispatchRuleChange(newSelected, newDefault, inputVals);
            }}
            onDefaultChange={(value) => {
              const newSelected = selectedOpts.includes(value)
                ? selectedOpts
                : [...selectedOpts, value];
              dispatchRuleChange(newSelected, value, inputVals);
            }}
            onInputChange={(optionValue, inputValue) => {
              const newInputs = { ...inputVals, [optionValue]: inputValue };
              dispatchRuleChange(selectedOpts, defaultVal, newInputs);
            }}
          />
        );
      }
      case "custom_chip_set": {
        // Get chip data from formData or initialData
        // Supports both array [{key, label, visible}] and object {key: {label, enabled, display_order}} formats
        const _objToChipArray = (obj) =>
          Object.keys(obj)
            .map((key) => {
              const entry = obj[key];
              return {
                key,
                label: entry.label || key,
                visible: "enabled" in entry ? entry.enabled : entry.visible !== false,
                display_order: entry.display_order,
              };
            })
            .sort((a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999))
            .map(({ display_order, ...rest }) => rest);

        let chipData = [];
        const _rawValue = formData[item.accessor];
        if (Array.isArray(_rawValue)) {
          chipData = _rawValue;
        } else if (_rawValue && typeof _rawValue === "object" && !Array.isArray(_rawValue)) {
          chipData = _objToChipArray(_rawValue);
        } else if (Array.isArray(item.initialData)) {
          chipData = item.initialData;
        } else if (item.initialData && typeof item.initialData === "object" && !Array.isArray(item.initialData)) {
          chipData = _objToChipArray(item.initialData);
        }

        return (
          <CustomChipSet
            classes={classes}
            label={item.label}
            chipData={chipData}
            isDisabled={item.isDisabled || props.disabledFields}
            isRequired={item.is_mandatory || item.is_required}
            showSelectAll={item.show_select_all !== false}
            backgroundColor={item.container_background_color}
            editable={item.editable || false}
            onChipToggle={(key, index) => {
              // Toggle the visible property for the clicked chip
              const updatedChipData = chipData.map((chip, idx) => {
                if (idx === index || chip.key === key) {
                  return { ...chip, visible: !chip.visible };
                }
                return chip;
              });
              handleChange(
                updatedChipData,
                "custom_chip_set",
                item.accessor,
                item
              );
            }}
            onSelectAll={(selectAll) => {
              // Set all chips' visible property to selectAll value
              const updatedChipData = chipData.map((chip) => ({
                ...chip,
                visible: selectAll,
              }));
              handleChange(
                updatedChipData,
                "custom_chip_set",
                item.accessor,
                item
              );
            }}
            onLabelChange={(key, index, newLabel) => {
              // Update the label for the specified chip
              const updatedChipData = chipData.map((chip, idx) => {
                if (idx === index || chip.key === key) {
                  return { ...chip, label: newLabel };
                }
                return chip;
              });
              handleChange(
                updatedChipData,
                "custom_chip_set",
                item.accessor,
                item
              );
            }}
            onChipReorder={(reorderedChipData) => {
              // Handle chip reordering from drag-and-drop
              handleChange(
                reorderedChipData,
                "custom_chip_set",
                item.accessor,
                item
              );
            }}
          />
        );
      }

      case "ada_form_group": {
        return (
          <AdaFormGroup
            item={item}
            formData={formData}
            handleChange={handleChange}
            renderForm={renderForm}
            disabledFields={props.disabledFields}
          />
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

  /**
   * Smart Auto-Layout: Categorize field and determine optimal width
   */
  const getFieldWidth = (field, screenSize) => {
    const type = field.display_type || field.field_type || "";
    const labelLength = (field.label || "").length;

    // Full width fields (always 12 columns)
    const fullWidthTypes = [
      "table",
      "rangePicker",
      "multiple_daterangepicker",
      "sliderRange",
      "Heading",
      "rule_group",
      "custom_chip_set",
      "dropdownGroup",
      "nested_box",
      "section_title",
    ];
    if (fullWidthTypes.includes(type)) {
      return 12;
    }

    // Responsive adjustments
    if (screenSize < 600) {
      // Mobile: all fields get full width
      return 12;
    }

    if (screenSize < 960) {
      // Tablet: most fields get full width, small fields can share
      const smallWidthTypes = [
        "BooleanField",
        "toggle",
        "CustomToggleField",
        "IntegerField",
      ];
      if (smallWidthTypes.includes(type)) {
        return 6; // Small fields can share a row on tablet
      }
      return 12; // Others get full width on tablet
    }

    // Desktop: optimize for multiple fields per row
    // Dropdowns: allow 3 per row (4 columns each) or 2 per row (6 columns each) for long labels
    if (
      type === "dropdown" ||
      type === "autocompleteDropdown" ||
      type === "transparentDropdown" ||
      type === "list"
    ) {
      // Very long labels (> 50 chars) get 6 columns (2 per row)
      if (labelLength > 50) {
        return 6;
      }
      // Normal dropdowns get 4 columns (3 per row)
      return 4;
    }

    // Date fields: 6 columns (2 per row)
    if (type === "DateTimeField" || type === "DateAndTimeField") {
      return 6;
    }

    // Chips/Tags: 6 columns (2 per row)
    if (type === "ChipsInput" || type === "ChipsTagInput") {
      return 6;
    }

    // TextField: based on label length
    if (type === "TextField" || type === "readOnly") {
      return labelLength > 40 ? 6 : 4;
    }

    // Small fields: 3 columns (4 per row)
    const smallWidthTypes = [
      "BooleanField",
      "toggle",
      "CustomToggleField",
      "IntegerField",
    ];
    if (smallWidthTypes.includes(type)) {
      return 3;
    }

    // Default: 4 columns (3 per row)
    return 4;
  };

  /**
   * Custom Layout: Arrange fields according to customLayout configuration
   * customLayout is an array where each element represents a row
   * Each element can be:
   *   - A number: number of fields in that row (e.g., 3 means 3 fields)
   *   - An object: { fields: 3, gap: "16px", className: "custom-row" }
   */
  const arrangeFieldsInCustomLayout = (fields, customLayout) => {
    if (!Array.isArray(customLayout) || customLayout.length === 0) {
      return [];
    }

    const rows = [];
    let fieldIndex = 0;

    customLayout.forEach((rowConfig, rowIndex) => {
      // Handle both number and object formats
      const fieldsPerRow =
        typeof rowConfig === "number" ? rowConfig : rowConfig.fields;
      const rowGap =
        typeof rowConfig === "object" && rowConfig.gap ? rowConfig.gap : null;
      const rowClassName =
        typeof rowConfig === "object" && rowConfig.className
          ? rowConfig.className
          : null;

      if (!fieldsPerRow || fieldsPerRow <= 0) {
        return; // Skip invalid row configs
      }

      const rowFields = [];
      for (let i = 0; i < fieldsPerRow && fieldIndex < fields.length; i++) {
        rowFields.push({
          field: fields[fieldIndex],
          index: fieldIndex,
          rowIndex,
          rowGap,
          rowClassName,
        });
        fieldIndex++;
      }

      if (rowFields.length > 0) {
        rows.push(rowFields);
      }
    });

    // Add any remaining fields to the last row
    if (fieldIndex < fields.length) {
      const remainingFields = [];
      while (fieldIndex < fields.length) {
        remainingFields.push({
          field: fields[fieldIndex],
          index: fieldIndex,
          rowIndex: rows.length,
        });
        fieldIndex++;
      }
      if (remainingFields.length > 0) {
        rows.push(remainingFields);
      }
    }

    return rows;
  };

  /**
   * Smart Auto-Layout: Pack fields into rows optimally
   * Aggressively fills rows with fields until no more space is available
   */
  const packFieldsIntoRows = (fields, screenSize) => {
    const rows = [];
    let currentRow = [];
    let currentRowWidth = 0;

    fields.forEach((field, index) => {
      const fieldType = field.display_type || field.field_type || "";
      const isTable = fieldType === "table";
      const fieldWidth = getFieldWidth(field, screenSize);

      // Full width fields (tables, headings, etc.) always start a new row
      // IMPORTANT: Tables MUST always be on their own row, even if width calculation fails
      if (fieldWidth === 12 || isTable) {
        // Save current row if it has fields
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
          currentRowWidth = 0;
        }
        // Add full width field as its own row
        // Force width to 12 for tables to ensure full width
        rows.push([{ field, width: isTable ? 12 : fieldWidth, index }]);
        return;
      }

      // Try to fit field in current row
      // If it doesn't fit exactly, try to expand it to fill remaining space
      if (currentRowWidth + fieldWidth <= 12) {
        // Field fits, add it
        currentRow.push({ field, width: fieldWidth, index });
        currentRowWidth += fieldWidth;

        // If this is the last field or next field won't fit, expand last field to fill row
        const isLastField = index === fields.length - 1;
        const nextField = fields[index + 1];
        if (nextField) {
          const nextFieldType =
            nextField.display_type || nextField.field_type || "";
          const nextIsTable = nextFieldType === "table";
          const nextFieldWidth = getFieldWidth(nextField, screenSize);

          // If next field is full width or won't fit, expand current row's last field
          if (
            nextIsTable ||
            nextFieldWidth === 12 ||
            currentRowWidth + nextFieldWidth > 12
          ) {
            if (currentRow.length > 0 && currentRowWidth < 12) {
              // Expand last field to fill remaining space
              const lastField = currentRow[currentRow.length - 1];
              lastField.width = 12 - (currentRowWidth - lastField.width);
            }
          }
        } else if (isLastField && currentRowWidth < 12) {
          // Last field, expand to fill remaining space
          if (currentRow.length > 0) {
            const lastField = currentRow[currentRow.length - 1];
            lastField.width = 12 - (currentRowWidth - lastField.width);
          }
        }
      } else {
        // Field doesn't fit, start new row
        if (currentRow.length > 0) {
          // Expand last field in previous row to fill space
          const lastField = currentRow[currentRow.length - 1];
          lastField.width = 12 - (currentRowWidth - lastField.width);
          rows.push(currentRow);
        }
        currentRow = [{ field, width: fieldWidth, index }];
        currentRowWidth = fieldWidth;
      }
    });

    // Add remaining row
    if (currentRow.length > 0) {
      // Expand last field to fill remaining space if needed
      if (currentRowWidth < 12 && currentRow.length > 0) {
        const lastField = currentRow[currentRow.length - 1];
        lastField.width = 12 - (currentRowWidth - lastField.width);
      }
      rows.push(currentRow);
    }

    return rows;
  };

  const render = () => {
    // Safety check: if no fields, return null
    if (
      !props.fields ||
      !Array.isArray(props.fields) ||
      props.fields.length === 0
    ) {
      return null;
    }

    // Don't filter fields - keep them in layout but hide with CSS to maintain layout structure
    // Custom Layout: If layout is "custom", use customLayout configuration
    if (props.layout === "custom" && props.customLayout) {
      const customRows = arrangeFieldsInCustomLayout(
        props.fields,
        props.customLayout
      );
      const rowGap = props.rowGap || "var(--space-16)";
      const colGap = props.colGap || "var(--space-16)";

      return (
        <div
          className={`${styles.flex} ${styles.flexCol} ${styles.wFull}`}
          style={{ gap: rowGap }}
        >
          {customRows.map((row, rowIndex) => {
            // Get row-specific gap and className if provided
            const currentRowGap = row[0]?.rowGap || colGap;
            const currentRowClassName = row[0]?.rowClassName || "";

            return (
              <div
                key={`custom-row-${rowIndex}`}
                className={`${styles.flex} ${styles.flexRow} ${styles.wFull} ${currentRowClassName}`}
                style={{ gap: currentRowGap }}
              >
                {row.map(({ field, index }) => {
                  const fieldType =
                    field.display_type || field.field_type || "";
                  const isTable =
                    fieldType === "table" ||
                    fieldType.toLowerCase() === "table";

                  // Tables always get full width
                  if (isTable) {
                    // Check if field should be visible based on dependent_on
                    const isFieldVisible = shouldRenderField(field, formData);
                    return (
                      <div
                        key={`field-${index}`}
                        className={`${styles.wFull} ${styles.overflowVisible}`}
                        style={{
                          display: isFieldVisible ? "block" : "none",
                        }}
                      >
                        {renderForm(field, index)}
                        {field.children && (
                          <div className={styles.wFull}>{field.children}</div>
                        )}
                      </div>
                    );
                  }

                  // Calculate flex-basis for each field in the row
                  // Each field gets equal width: 100% / number of fields in row
                  const flexBasis = `${100 / row.length}%`;

                  // Check if field should be visible based on dependent_on
                  const isFieldVisible = shouldRenderField(field, formData);

                  return (
                    <div
                      key={`field-${index}`}
                      className={`${styles.overflowVisible}`}
                      style={{
                        flexBasis: flexBasis,
                        flexGrow: 0,
                        flexShrink: 0,
                        minWidth: 0,
                        width: flexBasis,
                        maxWidth: flexBasis,
                        display: isFieldVisible ? "block" : "none",
                      }}
                    >
                      <div className={classes.fieldContainer}>
                        {renderForm(field, index)}
                        {field.children && (
                          <div className={styles.wFull}>{field.children}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    // Smart Auto-Layout: Automatically arrange fields optimally (default behavior)
    // Default spacing values (8px = 1 unit in Material-UI Grid)
    const spacing = props.disableFilterModal ? 2 : 3;
    const rowSpacing = props.disableFilterModal ? 2 : 2.5;
    const alignFields = props?.alignFields ? props?.alignFields : "center";

    const fieldRows = packFieldsIntoRows(props.fields || [], windowSize);

    // Safety check: if no rows after packing, return null
    if (!fieldRows || fieldRows.length === 0) {
      return null;
    }

    const autoSpacing = props.spacing !== undefined ? props.spacing : spacing;
    const autoRowSpacing =
      props.rowSpacing !== undefined ? props.rowSpacing : rowSpacing;

    return (
      <Grid
        container
        sx={{
          width: "100%",
          overflow: "visible", // Allow dropdown menus to overflow the container
        }}
        columnSpacing={{
          xs: autoSpacing,
          md: autoSpacing,
        }}
        rowSpacing={autoRowSpacing}
        alignItems={alignFields}
      >
        {fieldRows.map((row, rowIndex) => (
          <React.Fragment key={`auto-row-${rowIndex}`}>
            {row.map(({ field, width, index }) => {
              // For table fields, ensure full width across all breakpoints
              const fieldType = field.display_type || field.field_type || "";
              const isTable =
                fieldType === "table" || fieldType.toLowerCase() === "table";
              const isADAFormGroup = fieldType === "ada_form_group";
              // Force tables to always be full width, even if packing algorithm didn't set it correctly
              if (isTable || isADAFormGroup) {
                // Tables always get full width and their own row
                return (
                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={12}
                    lg={12}
                    xl={12}
                    key={`field-${index}`}
                    sx={{
                      width: "100%",
                      maxWidth: "100%",
                      flexBasis: "100%", // Force full width
                      flexGrow: 0, // Don't grow beyond 100%
                    }}
                  >
                    <div style={{ width: "100%", maxWidth: "100%" }}>
                      {renderForm(field, index)}
                      {field.children && (
                        <div style={{ width: "100%", maxWidth: "100%" }}>
                          {field.children}
                        </div>
                      )}
                    </div>
                  </Grid>
                );
              }

              // Check if field should be visible based on dependent_on
              const isFieldVisible = shouldRenderField(field, formData);

              return (
                <Grid
                  item
                  xs={12}
                  sm={12}
                  md={width}
                  lg={width}
                  xl={width}
                  key={`field-${index}`}
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "visible", // Changed to allow dropdown menus to overflow
                    display: isFieldVisible ? "block" : "none",
                  }}
                >
                  <div className={classes.fieldContainer}>
                    {renderForm(field, index)}
                    {field.children && (
                      <div style={{ width: "100%", maxWidth: "100%" }}>
                        {field.children}
                      </div>
                    )}
                  </div>
                </Grid>
              );
            })}
          </React.Fragment>
        ))}
      </Grid>
    );
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
