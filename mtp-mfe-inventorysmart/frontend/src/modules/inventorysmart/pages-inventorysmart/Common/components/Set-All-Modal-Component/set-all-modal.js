import React, { useEffect, useRef, useState } from "react";
import Form from "core/Utils/form";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import globalStyles from "core/Styles/globalStyles";
import { clone, cloneDeep, isEmpty, isNull, isUndefined, keyBy } from "lodash";
import { Grid } from "@mui/material";
import { MIN_MAX_ACCESSOR } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getTenantConfigData } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { setSetAllModalLoader } from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { setShowNewConstraintFlow as setShowNewConstraintFlowAction } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import {
  checkRedundantDate,
  dateValidationsCheck,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { displaySnackMessages } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import {
  getPartiallySelectedParentIds,
  isParentRowByLevel,
} from "../constraintSelectionUtils";
import moment from "moment";
import { Button, RadioButtonGroup, Alert } from "impact-ui-v3";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import makeStyles from "@mui/styles/makeStyles";
import { SetAllMinDistribution } from "./SetAllMinDistribution";
import {
  DEFAULT_MIN_DIST_STATE,
  applyMinDistributionToRow,
} from "./setAllMinDistributionUtils";

const useStyles = makeStyles({
  addRuleBox: {
    marginBottom: "8px",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  commonFieldsForm: {
    "& .MuiGrid-root > .MuiGrid-item": {
      paddingTop: "24px !important",
    },
  },
  constraintFieldsRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "21px",
    width: "100%",
    minWidth: 0,
  },
  constraintFormArea: {
    flex: "1 1 auto",
    minWidth: 0,
    "& #formbody > .MuiGrid-container": {
      marginTop: "0 !important",
    },
    "& #formbody > .MuiGrid-container > .MuiGrid-item": {
      paddingTop: "0 !important",
      paddingBottom: "8px !important",
    },
    "& #formbody .impact_inputbox_container": {
      width: "153px !important",
      maxWidth: "153px !important",
      minWidth: "153px !important",
    },
    "& #formbody .impact_inputbox_container .MuiInputBase-root": {
      width: "100% !important",
      maxWidth: "153px !important",
    },
    "& #formbody .impact_inputbox_container .MuiInputBase-root input.MuiInputBase-input": {
      minWidth: "0 !important",
      width: "100% !important",
      maxWidth: "153px !important",
    },
    "& #formbody .impact_inputbox_container .MuiFormHelperText-root": {
      whiteSpace: "normal",
      wordBreak: "break-word",
      maxWidth: "153px",
    },
    "& #formbody .impact-datepicker-main-container": {
      width: "153px !important",
      maxWidth: "153px !important",
    },
    "& #formbody .impact-datepicker-main-container .datePicker-input-container": {
      width: "100%",
    },
    "& #formbody .ia-select-main-container-v3, & #formbody .ia-select-styled-dropdown-main-button": {
      minWidth: "153px !important",
      maxWidth: "153px !important",
      width: "153px !important",
    },
  },
  alertContainer: {
    display: "flex",
    justifyContent: "center",
    
    "& .ia-styles.ia-alert  .ia-alert-body ": {
      fontWeight: "600 !important",
    },
  },
  infoText: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "12px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "16px",
    marginTop: "8px",
  },
  constraintsTitleContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  constraintsTitle: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "21px",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  hrStyle: {
    border: "none",
    borderTop: "1px solid #E0E3EB",
    margin: "0 0 24px 0",
  },
  deleteIcon: {
    display: "flex",
    alignItems: "flex-start",
    flexShrink: 0,
    paddingTop: "22px",
  },
});

const MAX_CONSTRAINT_ROWS = 5;

const SetAllModal = (props) => {
  const [initialFormFields, setInitialFormFields] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [commonFields, setCommonFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [commonFieldsData, setCommonFieldsData] = useState({});
  const [defaultData, setDefaultData] = useState({});
  const [minDistByRow, setMinDistByRow] = useState({});
  const [showActionButton, setShowActionButton] = useState(false);
  const globalClasses = globalStyles();
  const [selectedOption, setSelectedOption] = useState('existing_rows');
  const classes = useStyles();
  const [showInfo, setShowInfo] = useState(true);
  const [resetCounter, setResetCounter] = useState(0);
  const [maxAllowedRows, setMaxAllowedRows] = useState(MAX_CONSTRAINT_ROWS);
  const formConfigRef = useRef({
    initialFormFields: [],
    commonFields: [],
    commonFieldsData: {},
  });

  const withMinDistribution = (row, minDistState = DEFAULT_MIN_DIST_STATE) =>
    props.showNewConstraintFlow
      ? applyMinDistributionToRow({ ...row }, minDistState)
      : { ...row };

  useEffect(() => {
    if (!props?.constraintsConfigs?.showSingleMergedRows) {
      setShowActionButton(true);
    }
  }, [props?.constraintsConfigs?.showSingleMergedRows]);

  useEffect(() => {
    if (props?.showSetAllModal) {
      getSetAllModalFields();
    }
  }, [props?.showSetAllModal]);

  useEffect(() => {
    let tempFormsField = cloneDeep(formFields);
    if (formFields?.length > 0) {
      tempFormsField?.map((item, index) => {
        let uniqueId = item?.[0]?.uniqueId;
        let endDate = item?.filter((key) => key?.accessor === "end_date")?.[0];
        let startDate = item?.filter(
          (key) => key?.accessor === "start_date"
        )?.[0];

        // Convert stored date strings to moment objects for the DatePicker constraints
        Object.assign(endDate, {
          minDate: formData?.[uniqueId]?.start_date
            ? moment(formData?.[uniqueId]?.start_date, "YYYY-MM-DD") // Use ISO format internally
            : null,
        });
        Object.assign(startDate, {
          maxDate: formData?.[uniqueId]?.end_date
            ? moment(formData?.[uniqueId]?.end_date, "YYYY-MM-DD") // Use ISO format internally
            : null,
        });
      });
      setFormFields(tempFormsField);
    }
  }, [formData]);

  const getSetAllModalFields = () => {
    let allFields = cloneDeep(props.constraintsConfigs?.set_all_modal_fields);

    // Inject category_minimum and category_maximum fields only if enableCategoryMinMax is true
    const hasCategoryMin = allFields?.some((f) => f.accessor === "category_minimum");
    if (props.constraintsConfigs?.enableCategoryMinMax && !hasCategoryMin && allFields?.length) {
      const maxStockIndex = allFields.findIndex((f) => f.accessor === "max_stock");
      const insertIndex = maxStockIndex !== -1 ? maxStockIndex + 1 : allFields.length;
      const categoryFields = [
        {
          accessor: "category_minimum",
          label: "Category Min",
          field_type: "IntegerField",
          is_mandatory: false,
          required: false,
          no_negative_values: true,
          max_validation: "category_maximum",
        },
        {
          accessor: "category_maximum",
          label: "Category Max",
          field_type: "IntegerField",
          is_mandatory: false,
          required: false,
          no_negative_values: true,
          min_validation: "category_minimum",
        },
      ];
      allFields.splice(insertIndex, 0, ...categoryFields);
    }

    let tempFields = [];
    let tempCommonFields = [];
    allFields?.map((field, index) => {
      if (field.accessor === "rule_name") {
        if (props?.flow !== "exceptions") {
          tempCommonFields.push(field);
        }
      } else if (field.accessor === "exception_rule_name") {
        if (props?.showExceptionRuleName && props?.flow === "exceptions") {
          tempCommonFields.push(field);
        }
      } else {
        if (field.accessor === "min_distribution") {
          if (!props?.enableMinDistribution || props.showNewConstraintFlow) {
            return;
          }
        }
        field.uniqueId = "uniqueRow" + 1;
        if (field.accessor === "end_date") {
          field.disablePast = true;
        }
        if (field.field_type === "DateTimeField" && !field.placeholder) {
          field.placeholder = "Select Date";
        }
        tempFields.push(field);
      }
    });
    tempFields = [
      ...tempFields,
      {
        accessor: "deleteRow",
        field_type: "deleteRow",
        disabled: true,
      },
    ];
    let tempCommonFieldsData = {};
    tempCommonFields.map((item) => {
      tempCommonFieldsData[item.accessor] = null;
    });
    setCommonFieldsData(tempCommonFieldsData);
    setCommonFields(tempCommonFields);
    setInitialFormFields(tempFields);
    formConfigRef.current = {
      initialFormFields: tempFields,
      commonFields: tempCommonFields,
      commonFieldsData: tempCommonFieldsData,
    };
    initializeFormRows(tempFields, tempCommonFields, tempCommonFieldsData);
    setDefaultData(defaultData);
    props?.setErrorForForm(true);
  };

  const buildEmptyFormDataFromRows = (rows) => {
    const result = {};
    rows.forEach((row) => {
      const uniqueId = row.find((field) => field.field_type === "deleteRow")
        ?.uniqueId;
      if (!uniqueId) return;
      result[uniqueId] = {};
      row.forEach((field) => {
        if (field.accessor) {
          result[uniqueId][field.accessor] = null;
        }
      });
    });
    return result;
  };

  const initializeFormRows = (
    tempFields,
    tempCommonFields = commonFields,
    tempCommonFieldsData = commonFieldsData
  ) => {
    const row = cloneDeep(tempFields || initialFormFields);
    const deleteField = row.find((field) => field.field_type === "deleteRow");
    if (deleteField) {
      deleteField.disabled = true;
      deleteField.accessor = "uniqueId1";
    }
    row.forEach((field) => {
      field.uniqueId = "uniqueId1";
    });

    const nextMinDist = { uniqueId1: { ...DEFAULT_MIN_DIST_STATE } };
    const nextFormData = buildEmptyFormDataFromRows([row]);
    Object.keys(nextFormData).forEach((uniqueId) => {
      nextFormData[uniqueId] = withMinDistribution(
        nextFormData[uniqueId],
        nextMinDist[uniqueId]
      );
    });

    setFormFields([row]);
    setMinDistByRow(nextMinDist);
    setFormData(nextFormData);
    props?.setAllModalData(
      transformData(nextFormData, nextMinDist, {
        rowFieldDefs: row,
        commonFieldDefs: tempCommonFields,
        commonFieldValues: tempCommonFieldsData,
      })
    );
  };

  const handleMinDistChange = (uniqueId, next) => {
    setMinDistByRow((prev) => {
      const updatedMinDist = { ...prev, [uniqueId]: next };
      setFormData((prevFormData) => {
        const updated = cloneDeep(prevFormData);
        updated[uniqueId] = withMinDistribution(
          updated[uniqueId] || {},
          next
        );
        props?.setAllModalData(transformData(updated, updatedMinDist));
        return updated;
      });
      return updatedMinDist;
    });
  };

  const handleChange = (
    obj,
    id,
    field,
    e,
    initialValue,
    checkConfiguration
  ) => {
    let updatedFormData = cloneDeep(formData);
    if (id?.includes("unique")) {
      const updatedJson = deleteRowByAccessor(formFields, id);
      setFormFields(updatedJson);
      return;
    } else if (field?.field_type !== "deleteRow") {
      let value = 0;
      if (field?.field_type === "DateTimeField") {
        value = e;
        if (!value) {
          updatedFormData[field?.uniqueId][field?.accessor] = null;
          setFormData(updatedFormData);
        } else {
          // Get tenant date format for display
          const displayFormat =
            localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";

          // The value from DatePicker will be a moment object
          const parsedDate = moment.isMoment(value) ? value : moment(value);

          if (!parsedDate.isValid()) {
            displaySnackMessages(
              `Please enter a valid date in ${displayFormat} format`,
              "error",
              props
            );
            updatedFormData[field?.uniqueId][field?.accessor] = null;
            setFormData(updatedFormData);
            return;
          }

          // Store dates in ISO format internally for consistency
          const isoDate = parsedDate.format("YYYY-MM-DD");
          // Returns true when the date was rejected so the caller can short-circuit.
          const rejectDateWithinRange = (rangeMinDate, rangeMaxDate) => {
            if (
              !rangeMinDate ||
              !rangeMaxDate ||
              !parsedDate.isBetween(rangeMinDate, rangeMaxDate, "day", "[]")
            ) {
              return false;
            }
            displaySnackMessages(
              `Please choose dates that are not in the same range.`,
              "error",
              props
            );
            updatedFormData[field?.uniqueId][field?.accessor] = null;
            setFormData(updatedFormData);
            return true;
          };

          if (props.showNewConstraintFlow) {
            const isNewRows = selectedOption === "new_rows";
            const isExistingRowsWithConstraints =
              selectedOption === "existing_rows" &&
              props?.selectedParentAndChildRows?.some(
                (parent) => parent?.constraint?.length > 0
              );

            if (isNewRows || isExistingRowsWithConstraints) {
              const { minDate, maxDate } = getSelectedChildrenDateRange();
              if (rejectDateWithinRange(minDate, maxDate)) {
                return;
              }
            }
          }

          // Check for date overlaps using the ISO format
          if (dateValidationsCheck(formData, isoDate, field?.accessor)) {
            displaySnackMessages("Date can not be overlapping", "error", props);
            updatedFormData[field?.uniqueId][field?.accessor] = null;
            setFormData(updatedFormData);
          } else {
            // Additional validation for start_date and end_date
            if (
              field?.accessor === "end_date" &&
              updatedFormData[field?.uniqueId]?.start_date
            ) {
              const startDate = moment(
                updatedFormData[field?.uniqueId].start_date,
                "YYYY-MM-DD"
              );
              if (parsedDate.isBefore(startDate)) {
                displaySnackMessages(
                  "End date cannot be before start date",
                  "error",
                  props
                );
                updatedFormData[field?.uniqueId][field?.accessor] = null;
                setFormData(updatedFormData);
                return;
              }
            }

            // Store the ISO format date in form data
            updatedFormData[field?.uniqueId][field?.accessor] = isoDate;
            setFormData(updatedFormData);
          }
        }
      } else {
        if (field?.accessor === "min_distribution") {
          let value = e[0]?.value;
          updatedFormData[field?.uniqueId][field?.accessor] = {
            distribution_type: value,
            x_units_per_size: {},
          };
        } else {
          updatedFormData[field?.uniqueId][field?.accessor] = e?.target?.value
            ? e.target.value
            : e;
          if (
            field.minCappedValue &&
            updatedFormData[field?.uniqueId][field?.accessor] <
              field.minCappedValue
          ) {
            updatedFormData[field?.uniqueId][field?.accessor] =
              field.minCappedValue;
            displaySnackMessages(
              `${field.label} value should be atleast ${field?.minCappedValue}`,
              "info",
              props
            );
          }
          if (
            field.maxCappedValue &&
            updatedFormData[field?.uniqueId][field?.accessor] >
              field.maxCappedValue
          ) {
            updatedFormData[field?.uniqueId][field?.accessor] =
              field.maxCappedValue;
            displaySnackMessages(
              `${field.label} value is capped at ${field?.maxCappedValue}.`,
              "info",
              props
            );
          }
        }
        setFormData(updatedFormData);
      }
      props?.setAllModalData(transformData(updatedFormData));
    }
  };

  const transformData = (data, minDistState = minDistByRow, options = {}) => {
    let result = [];
    const displayFormat =
      localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";
    const rowFieldSource =
      options.rowFieldDefs ||
      (initialFormFields.length
        ? initialFormFields
        : formConfigRef.current.initialFormFields);
    const commonFieldSource =
      options.commonFieldDefs ||
      (commonFields.length
        ? commonFields
        : formConfigRef.current.commonFields);
    const commonValuesSource =
      options.commonFieldValues ||
      (!isEmpty(commonFieldsData)
        ? commonFieldsData
        : formConfigRef.current.commonFieldsData);
    const rowFieldDefs = rowFieldSource.filter(
      (field) => field.accessor && field.field_type !== "deleteRow"
    );

    Object.entries(data).forEach(([uniqueId, row]) => {
      const rowWithMinDist = withMinDistribution(
        row,
        minDistState[uniqueId] || DEFAULT_MIN_DIST_STATE
      );

      const attributes = rowFieldDefs.map((field) => {
        let value = rowWithMinDist[field.accessor] ?? null;
        if (field.field_type === "DateTimeField" && value) {
          value = moment(value, "YYYY-MM-DD").format(displayFormat);
        }
        const isRequired = Boolean(
          field.is_mandatory || field.required || field.is_required
        );
        return {
          attribute_name: field.accessor,
          attribute_value: value,
          ...field,
          is_mandatory: isRequired,
          required: isRequired,
          is_required: isRequired,
          uniqueId,
        };
      });

      if (
        props.showNewConstraintFlow &&
        rowWithMinDist.min_distribution !== undefined
      ) {
        attributes.push({
          attribute_name: "min_distribution",
          attribute_value: rowWithMinDist.min_distribution,
        });
      }

      commonFieldSource.forEach((field) => {
        if (attributes.some((attr) => attr.attribute_name === field.accessor)) {
          return;
        }
        const isRequired = Boolean(
          field.is_mandatory || field.required || field.is_required
        );
        attributes.push({
          attribute_name: field.accessor,
          attribute_value:
            commonValuesSource[field.accessor] ??
            rowWithMinDist[field.accessor] ??
            null,
          ...field,
          is_mandatory: isRequired,
          required: isRequired,
          is_required: isRequired,
          uniqueId,
        });
      });

      result.push(attributes.filter(Boolean));
    });
    return result;
  };

  const deleteRowByAccessor = (json, accessor) => {
    // Get deleted row index
    const deleteIndex = json.findIndex((row) =>
      row.some((field) => field.accessor === accessor)
    );

    // Filter deleted row
    const updatedData = json.filter((row) => {
      const hasDeleteRow = row.some((field) => field.accessor === accessor);
      return !hasDeleteRow;
    });

    // Update the uniqueIds for all rows after the deleted row
    updatedData.forEach((item, index) => {
      const newUniqueId = `uniqueId${index + 1}`;
      // Update the deleteRow accessor
      let temp = item.filter((key) => key.field_type === "deleteRow")?.[0];
      temp.disabled = updatedData?.length === 1 ? true : false;
      temp.accessor = newUniqueId;

      // Update uniqueId for all fields in the row
      item.forEach((field) => {
        field.uniqueId = newUniqueId;
      });
    });

    removeRowWithDeleteKey(accessor, deleteIndex, updatedData);
    return updatedData;
  };

  function removeRowWithDeleteKey(deleteKey, deleteIndex, updatedFormFields) {
    let tempFormData = cloneDeep(formData);

    // Create new formData with updated keys
    const newFormData = {};
    Object.entries(tempFormData).forEach(([key, value], index) => {
      if (key !== deleteKey) {
        // For items after the deleted row, update their uniqueId
        const newKey = `uniqueId${index >= deleteIndex ? index : index + 1}`;
        newFormData[newKey] = value;
      }
    });

    const nextMinDist = {};
    Object.entries(minDistByRow).forEach(([key, value], index) => {
      if (key === deleteKey) return;
      const newKey = `uniqueId${index >= deleteIndex ? index : index + 1}`;
      nextMinDist[newKey] = value;
    });
    setFormData(newFormData);
    setMinDistByRow(nextMinDist);
    props?.setAllModalData(transformData(newFormData, nextMinDist));
  }

  const addRowsToForm = (tempFields) => {
    let newAddedRow = cloneDeep(formFields);
    newAddedRow.push(tempFields || initialFormFields);
    newAddedRow.map((item, index) => {
      let temp = item.filter((key) => key.field_type === "deleteRow")?.[0];
      temp.disabled = newAddedRow?.length === 1 ? true : false;
      temp.accessor = `uniqueId${index + 1}`;
      Object.keys(item).map((key) => {
        return Object.assign(item[key], {
          uniqueId: `${"uniqueId" + (index + 1)}`,
        });
      });
    });
    setFormFields(newAddedRow);
    const newFormData = { ...formData, ...generateAttributeArray(newAddedRow) };
    const newMinDist = { ...minDistByRow };
    newAddedRow.forEach((_, index) => {
      const key = `uniqueId${index + 1}`;
      if (!newMinDist[key]) {
        newMinDist[key] = { ...DEFAULT_MIN_DIST_STATE };
      }
    });
    Object.keys(newFormData).forEach((uniqueId) => {
      if (!newMinDist[uniqueId]) {
        newMinDist[uniqueId] = { ...DEFAULT_MIN_DIST_STATE };
      }
      newFormData[uniqueId] = withMinDistribution(
        newFormData[uniqueId],
        newMinDist[uniqueId]
      );
    });
    setMinDistByRow(newMinDist);
    setFormData(newFormData);
    props?.setAllModalData(transformData(newFormData, newMinDist));
  };

  const generateAttributeArray = (data, values) => {
    let result = {};
    data.forEach((row) => {
      const uniqueId = row.find((key) => key.field_type === "deleteRow")
        ?.uniqueId;
      if (formData?.[uniqueId]) return;
      if (!result[uniqueId]) {
        result[uniqueId] = {};
      }
      row.forEach((field) => {
        if (field.accessor) {
          result[uniqueId][field.accessor] = null;
        }
      });
      if (!isEmpty(commonFieldsData)) {
        Object.entries(commonFieldsData)?.map(([key, value]) => {
          if (key === "rule_name" && value !== null && value != "") {
            result[uniqueId][key] = value;
          }
        });
      }
    });
    return result;
  };

  const handleOnBlur = (e, id) => {
    if (
      (id?.maxCappedValue && e.target.value > id.maxCappedValue) ||
      (id?.minCappedValue && e.target.value < id.minCappedValue)
    ) {
      displaySnackMessages(
        `Please enter a value between ${id.minCappedValue} and ${id.maxCappedValue}`,
        "error",
        props
      );
    }
    if (id?.min_validation || id?.max_validation) {
      if (props?.validationErrors?.minMaxError) {
        let rowId = id.uniqueId;
        let fields = cloneDeep(formFields);
        let rowIndex = fields.findIndex((item) =>
          item.some((key) => key.uniqueId === rowId)
        );
        if (rowIndex !== -1) {
          fields[rowIndex].forEach((field) => {
            if (field.min_validation || field.max_validation) {
              field.error = true;
            }
          });
          setFormFields(fields);
        }
      } else if (id.error) {
        let rowId = id.uniqueId;
        let fields = cloneDeep(formFields);
        let rowIndex = fields.findIndex((item) =>
          item.some((key) => key.uniqueId === rowId)
        );
        if (rowIndex !== -1) {
          fields[rowIndex].forEach((field) => {
            if (field.min_validation || field.max_validation) {
              field.error = false;
            }
          });
          setFormFields(fields);
        }
      }
    }
  };

  const handleChangeCommonFields = (
    obj,
    id,
    field,
    e,
    initialValue,
    checkConfiguration
  ) => {
    let updatedFormData = cloneDeep(commonFieldsData);
    updatedFormData[field.accessor] = e.target.value;
    setCommonFieldsData(updatedFormData);
    if (id === "rule_name" || id === "exception_rule_name") {
      let temp = cloneDeep(formData);
      Object.keys(temp).map((key) => {
        temp[key][field.accessor] = e.target.value;
      });
      setFormData(temp);
      props?.setAllModalData(transformData(temp));
    }
  };

  const handleReset = () => {
    // Build a single fresh constraint row from the initial fields
    let singleRow = cloneDeep(initialFormFields);
    let deleteField = singleRow.filter(
      (key) => key.field_type === "deleteRow"
    )?.[0];
    if (deleteField) {
      deleteField.disabled = true;
      deleteField.accessor = "uniqueId1";
    }
    singleRow.forEach((field) => {
      field.uniqueId = "uniqueId1";
      field.error = false;
      field.minDate = null;
      field.maxDate = null;
    });

    // Reset form data so no values remain selected in any field
    let resetFormData = { uniqueId1: {} };
    singleRow.forEach((field) => {
      if (field.accessor) {
        resetFormData.uniqueId1[field.accessor] = null;
      }
    });

    // Clear common fields (e.g. rule_name) as well
    let resetCommonFieldsData = {};
    commonFields.forEach((item) => {
      resetCommonFieldsData[item.accessor] = null;
    });

    const resetMinDist = { uniqueId1: { ...DEFAULT_MIN_DIST_STATE } };
    resetFormData.uniqueId1 = withMinDistribution(
      resetFormData.uniqueId1,
      resetMinDist.uniqueId1
    );

    setFormFields([singleRow]);
    setFormData(resetFormData);
    setMinDistByRow(resetMinDist);
    setCommonFieldsData(resetCommonFieldsData);
    // Force the Form fields to remount so previously typed inputs are cleared
    setResetCounter((prev) => prev + 1);
    props?.setAllModalData(transformData(resetFormData, resetMinDist));
  };

  const handleWarningClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setShowInfo(false);
  };

  const getMaxChildRowCountOfSelected = () => {
    let maxChildRows = 0;
    const api = props?.agGridInstance?.current?.api;
    if (!api?.forEachNode) {
      return maxChildRows;
    }
    const partiallySelectedParentIds =
      getPartiallySelectedParentIds(api);
    api.forEachNode((node) => {
      const isParent = isParentRowByLevel(node);
      const isSelectedOrPartialParent =
        isParent &&
        (node?.selected || partiallySelectedParentIds.has(node.id));
      if (isSelectedOrPartialParent) {
        const childCount = Array.isArray(node?.data?.data)
          ? node.data.data.length
          : 0;
        if (childCount > maxChildRows) {
          maxChildRows = childCount;
        }
      }
    });
    return maxChildRows;
  };

  const getMaxConstraintCountFromSelectedParents = () => {
    let maxConstraintCount = 0;
    if (!props?.selectedParentAndChildRows) {
      return maxConstraintCount;
    }
    props.selectedParentAndChildRows.forEach((parent) => {
      const constraintCount = Array.isArray(parent?.constraint)
        ? parent.constraint.length
        : 0;
      if (constraintCount > maxConstraintCount) {
        maxConstraintCount = constraintCount;
      }
    });
    return maxConstraintCount;
  };

  const getSelectedChildrenDateRange = () => {
    let minDate = null;
    let maxDate = null;

    // Widens [minDate, maxDate] to include the start/end dates of each item.
    const accumulateDateRange = (items) => {
      (Array.isArray(items) ? items : []).forEach((item) => {
        [item?.start_date, item?.end_date].forEach((rawDate) => {
          if (!rawDate) {
            return;
          }
          const parsed = moment(rawDate);
          if (!parsed.isValid()) {
            return;
          }
          if (!minDate || parsed.isBefore(minDate)) {
            minDate = parsed.clone();
          }
          if (!maxDate || parsed.isAfter(maxDate)) {
            maxDate = parsed.clone();
          }
        });
      });
    };

    // For existing_rows, use selectedParentAndChildRows constraint arrays if any have constraints
    if (
      selectedOption === "existing_rows" &&
      props?.selectedParentAndChildRows?.some(
        (parent) => parent?.constraint?.length > 0
      )
    ) {
      props.selectedParentAndChildRows.forEach((parent) => {
        accumulateDateRange(parent?.constraint);
      });
      return { minDate, maxDate };
    }

    // For new_rows or when selectedParentAndChildRows is not available, use AG Grid nodes
    const api = props?.agGridInstance?.current?.api;
    if (!api?.forEachNode || api?.isSelectAllRecords) {
      return { minDate, maxDate };
    }
    const partiallySelectedParentIds =
      getPartiallySelectedParentIds(api);
    api.forEachNode((node) => {
      const isParent = isParentRowByLevel(node);
      const isSelectedOrPartialParent =
        isParent &&
        (node?.selected || partiallySelectedParentIds.has(node.id));
      if (isSelectedOrPartialParent) {
        accumulateDateRange(node?.data?.data);
      }
    });
    return { minDate, maxDate };
  };

  const validateEnteredDatesAgainstRange = () => {
    const { minDate, maxDate } = getSelectedChildrenDateRange();
    if (!minDate || !maxDate) {
      return false;
    }
    const displayFormat =
      localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";
    let hasConflict = false;
    const updatedFormData = cloneDeep(formData || {});
    Object.keys(updatedFormData).forEach((uniqueId) => {
      ["start_date", "end_date"].forEach((accessor) => {
        const rawDate = updatedFormData[uniqueId]?.[accessor];
        if (!rawDate) {
          return;
        }
        const parsed = moment(rawDate, "YYYY-MM-DD");
        if (
          parsed.isValid() &&
          parsed.isBetween(minDate, maxDate, "day", "[]")
        ) {
          hasConflict = true;
          // Reset only the conflicting date selector (leave min/max/wos intact)
          updatedFormData[uniqueId][accessor] = null;
        }
      });
    });
    if (hasConflict) {
      setFormData(updatedFormData);
      props?.setAllModalData(transformData(updatedFormData));
      displaySnackMessages(
        `Selected date(s) must be outside the existing range (${minDate.format(
          displayFormat
        )} - ${maxDate.format(displayFormat)})`,
        "error",
        props
      );
    }
    return hasConflict;
  };

  const trimRowsTo = (limit) => {
    if (formFields.length <= limit) {
      return;
    }
    let trimmedFields = cloneDeep(formFields).slice(0, limit);
    trimmedFields.forEach((item) => {
      let deleteField = item.filter((key) => key.field_type === "deleteRow")?.[0];
      if (deleteField) {
        deleteField.disabled = trimmedFields.length === 1;
      }
    });

    let trimmedData = {};
    for (let i = 1; i <= limit; i++) {
      const key = `uniqueId${i}`;
      if (formData[key]) {
        trimmedData[key] = formData[key];
      }
    }

    setFormFields(trimmedFields);
    setFormData(trimmedData);
    props?.setAllModalData(transformData(trimmedData));
  };

  const isSelectAll = Boolean(
    props?.agGridInstance?.current?.api?.isSelectAllRecords
  );

  useEffect(() => {
    const fetchConstraintsNewFlow = async () => {
      try {
        const constraintsNewFlowResponse = await props?.tenantConfigApiCache(
          1,
          { attribute_name: "constraints_new_flow" }
        );
        const constraintsNewFlowValue =
          constraintsNewFlowResponse?.data?.data?.[0]?.attribute_value || {};
        const isNewFlow =
          constraintsNewFlowValue?.inventorysmart_constraints_screen
            ?.showNewConstraintFlow === true;

        props.setShowNewConstraintFlowRedux(isNewFlow);
      } catch (error) {
        console.error("Error fetching constraints new flow config:", error);
      }
    };
    if (props?.showSetAllModal) {
      fetchConstraintsNewFlow();
    }
  }, [props?.showSetAllModal]);

  useEffect(() => {
    if (!props?.showNewConstraintFlow) {
      return;
    }
    if (!props?.showSetAllModal) {
      return;
    }

    if (isSelectAll) {
      setMaxAllowedRows(MAX_CONSTRAINT_ROWS);
      return;
    }

    const maxChildRows = getMaxChildRowCountOfSelected();
    const allowed = Math.max(0, MAX_CONSTRAINT_ROWS - maxChildRows);

    if (selectedOption === "new_rows") {
      setMaxAllowedRows(allowed);
      if (allowed > 0) {
        trimRowsTo(allowed);
      } else {
        setSelectedOption("existing_rows");
        props?.setInsertAsNewRows?.(false);
      }
    } else {
      setMaxAllowedRows(MAX_CONSTRAINT_ROWS);
    }
  }, [
    selectedOption,
    props?.showSetAllModal,
    isSelectAll,
    props?.showNewConstraintFlow,
  ]);

  const maxChildRowsOfSelection = getMaxChildRowCountOfSelected();
  const availableNewRowSlots = Math.max(
    0,
    MAX_CONSTRAINT_ROWS - maxChildRowsOfSelection
  );
  const isInsertNewRowsDisabled =
    !isSelectAll && availableNewRowSlots === 0;

  const buildConstraintLimitMessage = () => {
    const defaultMessage = "Up to five constraints can be added at once.";
    const pluralize = (count) => (count > 1 ? "s" : "");

    if (isSelectAll) {
      return defaultMessage;
    }

    if (selectedOption === "new_rows") {
      return maxAllowedRows > 0
        ? `Up to ${maxAllowedRows} new constraint${pluralize(
            maxAllowedRows
          )} can be inserted, based on the existing constraints in the selected rows.`
        : "Selected rows already have the maximum of 3 constraints.";
    }

    const hasExistingConstraints =
      selectedOption === "existing_rows" &&
      props?.selectedParentAndChildRows?.some(
        (parent) => parent?.constraint?.length > 0
      );

    if (hasExistingConstraints) {
      const maxConstraintCount = getMaxConstraintCountFromSelectedParents();
      const allowedRows = Math.max(0, MAX_CONSTRAINT_ROWS - maxConstraintCount);
      return allowedRows > 0
        ? `Up to ${allowedRows} constraint${pluralize(
            allowedRows
          )} can be added, based on the existing constraints in the selected rows.`
        : `Selected rows already have the maximum of ${MAX_CONSTRAINT_ROWS} constraints.`;
    }

    return defaultMessage;
  };

  return (
    <Grid>
      {props.showNewConstraintFlow && showInfo && (
        <div className={classes.alertContainer}>
          <Alert
            severity="info"
            style={{
              width: "466px",
              boxShadow: "none",
              border: "none",
              marginBottom: "16px",
            }}
            title={buildConstraintLimitMessage()}
            onClose={handleWarningClose}
          />
        </div>
      )}
      {/* All the common fields which are at rule code level */}
      {(props.flow !== "exceptions" || (props.showExceptionRuleName && props.showNewConstraintFlow)) &&
        commonFieldsData &&
        !isEmpty(commonFieldsData) && (
          <div
            className={`${globalClasses.marginTop} ${classes.commonFieldsForm}`}
            style={
              props.showNewConstraintFlow ? { marginBottom: "24px" } : undefined
            }
          >
            <Form
              layout={"horizontal"}
              handleChange={(
                obj,
                id,
                field,
                e,
                initialValue,
                checkConfiguration
              ) =>
                handleChangeCommonFields(
                  obj,
                  id,
                  field,
                  e,
                  initialValue,
                  checkConfiguration
                )
              }
              fields={commonFields}
              maxFieldsInRow={1}
              minFieldsInRow={1}
              defaultValues={commonFieldsData}
              formDataFromParent={commonFieldsData}
              id={"commonFields"}
              fieldTypeWidthSpan={12}
              labelWidthSpan={8}
              spacing={4}
              rowSpacing={4}
              key={"commonFields"}
            ></Form>
          </div>
        )}
      {props.showNewConstraintFlow && <hr className={classes.hrStyle} />}
      {props.showNewConstraintFlow && (
        <div className={classes.constraintsTitleContainer}>
          <span className={classes.constraintsTitle}>Constraints</span>
          <div className={classes.actions}>
            <Button variant="tertiary" onClick={handleReset}>
              Reset
            </Button>
            {showActionButton && (
              <Button
                variant="secondary"
                onClick={() => addRowsToForm()}
                disabled={formFields?.length >= maxAllowedRows}
              >
                Add Constraint
              </Button>
            )}
          </div>
        </div>
      )}
      {/* All the fields which are at sub row level*/}
      {formFields?.length > 0 &&
        formFields.map((item, index) => {
          const uniqueAccessor = item[item.length - 1].accessor;
          if (props.showNewConstraintFlow) {
            return (
              <div
                className={` ${globalClasses.selectorContainer} ${classes.addRuleBox}`}
              >
                <div className={classes.constraintFieldsRow}>
                  <div className={classes.constraintFormArea}>
                    <Form
                      layout={"horizontal"}
                      handleChange={(
                        obj,
                        id,
                        field,
                        e,
                        initialValue,
                        checkConfiguration
                      ) =>
                        handleChange(
                          obj,
                          id,
                          field,
                          e,
                          initialValue,
                          checkConfiguration
                        )
                      }
                      handleOnBlur={(e, id) => handleOnBlur(e, id)}
                      fields={item.filter(
                        (field) => field.field_type !== "deleteRow"
                      )}
                      maxFieldsInRow={3}
                      minFieldsInRow={1}
                      defaultValues={defaultData}
                      formDataFromParent={formData[uniqueAccessor]}
                      id={index}
                      fieldTypeWidthSpan={6}
                      labelWidthSpan={4}
                      checkMinMaxValidation={true}
                      min_max_accessor={MIN_MAX_ACCESSOR}
                      spacing={2}
                      rowSpacing={4}
                      key={`${uniqueAccessor}_${resetCounter}`}
                      withPortal={true}
                    ></Form>
                  </div>
                  <div className={classes.deleteIcon}>
                    {item
                      .filter((field) => field.field_type === "deleteRow")
                      .map((deleteField) => (
                        <DeleteActionButton
                          key={deleteField.accessor}
                          disabled={!!deleteField.disabled}
                          onClick={() =>
                            handleChange(
                              { [deleteField.accessor]: true },
                              deleteField.accessor,
                              deleteField,
                              true
                            )
                          }
                        />
                      ))}
                  </div>
                </div>
                <SetAllMinDistribution
                    variant="setAll"
                    value={
                      minDistByRow[uniqueAccessor] || DEFAULT_MIN_DIST_STATE
                    }
                    onChange={(next) =>
                      handleMinDistChange(uniqueAccessor, next)
                    }
                    minStock={formData[uniqueAccessor]?.min_stock}
                    enableSizesFetch={
                      props.showSetAllModal && !props.setAllModalLoader
                    }
                    sizeApiProps={{
                      useTableName: props.useTableName,
                      rulesTableName: props.rulesTableName,
                      localstoreKeyTableName: props.localstoreKeyTableName,
                      selectedPlan: props.selectedPlan,
                    }}
                  />
              </div>
            );
          }
          return (
            <div
              className={`${globalClasses.marginTop} ${globalClasses.selectorContainer}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ flex: 1 }}>
                <Form
                  layout={"horizontal"}
                  handleChange={(
                    obj,
                    id,
                    field,
                    e,
                    initialValue,
                    checkConfiguration
                  ) =>
                    handleChange(
                      obj,
                      id,
                      field,
                      e,
                      initialValue,
                      checkConfiguration
                    )
                  }
                  handleOnBlur={(e, id) => handleOnBlur(e, id)}
                  fields={item.filter(
                    (field) => field.field_type !== "deleteRow"
                  )}
                  maxFieldsInRow={2}
                  minFieldsInRow={2}
                  defaultValues={defaultData}
                  formDataFromParent={formData[uniqueAccessor]}
                  id={index}
                  fieldTypeWidthSpan={10}
                  labelWidthSpan={6}
                  checkMinMaxValidation={true}
                  min_max_accessor={MIN_MAX_ACCESSOR}
                  spacing={2}
                  rowSpacing={4}
                  key={uniqueAccessor}
                  withPortal={true}
                ></Form>
              </div>
              <div className={classes.deleteIcon}>
                {item
                  .filter((field) => field.field_type === "deleteRow")
                  .map((deleteField) => (
                    <DeleteActionButton
                      key={deleteField.accessor}
                      disabled={!!deleteField.disabled}
                      onClick={() =>
                        handleChange(
                          { [deleteField.accessor]: true },
                          deleteField.accessor,
                          deleteField,
                          true
                        )
                      }
                    />
                  ))}
              </div>
            </div>
          );
        })}
      {!props.showNewConstraintFlow && (
        <div className={globalClasses.marginTop}>
          {showActionButton && (
            <Button
              icon={<AddCircleIcon fontSize="small" />}
              iconPlacement="left"
              variant="tertiary"
              onClick={() => addRowsToForm()}
              disabled={formFields?.length === 3 ? true : false}
              size="small"
            >
              Add Row
            </Button>
          )}
        </div>
      )}
      {props.showNewConstraintFlow && (
        <div>
          <RadioButtonGroup
            orientation="row"
            options={[
              {
                label: "Apply to Existing Rows",
                value: "existing_rows",
              },
              {
                label: " Insert as New Rows",
                value: "new_rows",
                disabled: isInsertNewRowsDisabled,
              },
            ]}
            selectedOption={selectedOption}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedOption(value);
              setShowInfo(true);
              props?.setInsertAsNewRows?.(value === "new_rows");
              if (value === "new_rows") {
                validateEnteredDatesAgainstRange();
              }
            }}
          />
          <div className={classes.infoText}>
            {selectedOption === "existing_rows"
              ? "Existing rows will be updated to reflect the new values."
              : "Adds the edited data as new rows without affecting any existing entries."}
          </div>
        </div>
      )}
    </Grid>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    setAllModalLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.setAllModalLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints.constraintsConfigs,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSetAllModalLoader: (body) => dispatch(setSetAllModalLoader(body)),
    tenantConfigApiCache: (application, queryParam) =>
      dispatch(tenantConfigApiCache(application, queryParam)),
    setShowNewConstraintFlowRedux: (payload) =>
      dispatch(setShowNewConstraintFlowAction(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetAllModal);
