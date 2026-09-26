import React from "react";
import { isEmpty, isObject, isString, isNil, isUndefined } from "lodash";
import { FormControlLabel, MenuItem } from "@mui/material";
import { withStyles } from "@mui/styles";
import { capitalize } from "core/Utils/formatter";
import { useBudgetStyles } from "../pages-plansmart/plansmart-budget-table/budget-table-style";
import moment from "moment";
import {
  downloadOptions,
  plan_stage,
} from "../constants-plansmart/stringConstants";
import TabbingUntil from "./TabbingUnits";

export const FILTER_FIELDS = [
  {
    label: "Target Margin",
    field_type: "IntegerField",
    value_type: "percentage",
    accessor: "gross_margin_per",
    is_negative_value_allowed: true,
  },
  {
    label: "Target Revenue Growth",
    field_type: "IntegerField",
    value_type: "percentage",
    accessor: "revenue_growth_per",
    is_negative_value_allowed: true,
  },
  {
    label: "Target EOP Variance",
    field_type: "IntegerField",
    value_type: "percentage",
    accessor: "eop_variance",
    is_negative_value_allowed: true,
  },
  {
    label: "Total revenue",
    field_type: "IntegerField",
    value_type: "int",
    accessor: "revenue_total",
    is_negative_value_allowed: true,
  },
];

export const ifEmpty = (val) => {
  if (isObject(val))
    return isEmpty(val) || (val.length === 1 && isEmpty(val[0]));
  if (val.length === 0) isNil(val);
  return isString(val);
};

export const tabData = [
  {
    id: "l0_name",
    type: "Division",
  },
  { id: "l1_name", type: "Department" },
  { id: "l2_name", type: "Category" },
  { id: "l3_name", type: "Sub class" },
];
export const monthList = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

export const displayRowsForBudgetTable = [
  "current",
  "compare",
  "variance",
  "variance_fcst",
  "forcasted",
  "rel_forcasted",
  "rel_variance_fcst",
];
export const displayRowsForReceiptPlanning = ["current", "compare", "variance"];

export const viewOption = [
  {
    label: "Weekly",
    value: "weekly",
  },
  {
    label: "Monthly",
    value: "monthly",
  },
];

export const maxLength = (tempData) =>
  tempData.reduce((a, i, ii) => {
    if (ii === 1) {
      return a;
    }
    if (i.length > a.length) {
      return i;
    }
    return a;
  });
export const getGroupedItems = (item, props) => {
  const returnArray = [];
  Object.keys(item).forEach((_array, i) => {
    returnArray.push(item?.[props[i]]);
  });
  return returnArray;
};

export const groupByRowSubrows = ({ Group: array, By: props }) => {
  const groups = {};
  if (array) {
    Object.keys(array).forEach((i) => {
      const arrayRecord = array[i];
      const group = JSON.stringify(getGroupedItems(arrayRecord, props));
      groups[group] = { ...arrayRecord, ...groups[group] };
    });
  }
  return groups;
};

export const TabTitle = (props) => {
  const classes = useBudgetStyles();
  return props.isActive === props.dataTab ? (
    <li
      onClick={props.onClick}
      className={classes.tab_title__active}
      data-tab={props.dataTab}
    >
      {capitalize(props.title)}
    </li>
  ) : (
    <li
      onClick={props.onClick}
      className={classes.tab_title}
      data-tab={props.dataTab}
      style={{ fontSize: "14px" }}
    >
      {capitalize(props.title)}
    </li>
  );
};

export const updateDefaultFilterValue = async ({
  filterElements,
  setFilter,
}) => {
  const obj = {};
  for (const filter of filterElements) {
    const value = filter.default_value;
    if (value) {
      if (filter.field_type === "rangePicker") {
        const date = [
          moment(value[0], "YYYY-MM-DD"),
          moment(value[1], "YYYY-MM-DD"),
        ];
        obj[filter.column_name] = date;
        await setFilter(obj, filter.column_name);
      } else {
        obj[filter.column_name] = value;
        await setFilter(obj, filter.column_name);
      }
    }
  }
  return obj;
};

export const handleMasterPlanAndReportSubmission = ({
  addSnack,
  filterElements,
  filterDependency,
  setFilterPayload,
}) => {
  let isValid = true;
  let formValid = true;
  const reqBody = [];
  filterElements.forEach((filter) => {
    let value = filterDependency[filter.column_name];
    if (filter.field_type === "rangePicker" && value?.length) {
      isValid = !(Boolean(value[0]) ^ Boolean(value[1]));
      value =
        Boolean(value[0]) & Boolean(value[1])
          ? [
              moment(value[0]).format("YYYY-MM-DD"),
              moment(value[1]).format("YYYY-MM-DD"),
            ]
          : [];
    }
    const isValuedArray = Array.isArray(value)
      ? value.filter((filterValue) => !!filterValue).length > 0
      : true;
    if (
      (filter.required || filter.is_mandatory) &&
      (!value || !isValuedArray)
    ) {
      formValid = false;
      addSnack({
        message: `${filter.label} is required`,
        options: {
          variant: "error",
        },
      });
    } else if (
      filter.accessor === "season" &&
      filterDependency["season_options"] &&
      filterDependency["season_options"]?.length > 0
    ) {
      reqBody.push({
        filter_type: "string",
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: filterDependency["season_options"]?.map((k) => k.label),
      });
    } else if (filter.column_name === "master_plan_stage") {
      reqBody.push({
        filter_type: "string",
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: value ? [plan_stage[value]].flat() : [],
      });
    } else if (Array.isArray(value) && value.length > 0) {
      reqBody.push({
        filter_type: "string",
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: value ? [value].flat() : [],
      });
    } else if (value && typeof value === "number") {
      reqBody.push({
        filter_type: "string",
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: value ? [value].flat() : [],
      });
    }
  });

  if (isValid) {
    if (formValid) {
      if (setFilterPayload) {
        setFilterPayload(reqBody);
      }
    }
  } else {
    addSnack({
      message: "Enter complete date range",
      options: {
        variant: "error",
      },
    });
  }
};

export const handleReportSubmission = ({
  addSnack,
  filterElements,
  filterDependency,
  setFilterPayload,
}) => {
  // Here we create payload for Report submission.
  let isValid = true;
  let formValid = true;
  const reqBody = [];
  filterElements.forEach((filter) => {
    let value = filterDependency[filter.column_name];
    if (filter.field_type === "rangePicker" && value?.length) {
      isValid = !(Boolean(value[0]) ^ Boolean(value[1]));
      value =
        Boolean(value[0]) & Boolean(value[1])
          ? [
              moment(value[0]).format("YYYY-MM-DD"),
              moment(value[1]).format("YYYY-MM-DD"),
            ]
          : [];
    }
    const isValuedArray = Array.isArray(value)
      ? value.filter((filterValue) => !!filterValue).length > 0
      : true;
    if (
      (filter.required || filter.is_mandatory) &&
      (!value || !isValuedArray)
    ) {
      formValid = false;
      addSnack({
        message: `${filter.label} is required`,
        options: {
          variant: "error",
        },
      });
    } else if (
      filter.accessor === "season" &&
      filterDependency["season_options"] &&
      filterDependency["season_options"]?.length > 0
    ) {
      reqBody.push({
        filter_type: filter.filter_type,
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: filterDependency["season_options"]?.map((k) => k.label),
      });
    } else if (
      filter.accessor === "channel" &&
      filterDependency["channel_options"] &&
      filterDependency["channel_options"]?.length > 0
    ) {
      reqBody.push({
        filter_type: filter.filter_type,
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: filterDependency["channel_options"]?.map((k) => k.label),
      });
    } else if (
      filter.accessor === "version" &&
      filterDependency["version_options"] &&
      filterDependency["version_options"]?.length > 0
    ) {
      reqBody.push({
        filter_type: filter.filter_type,
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: [
          ...filterDependency["version_options"]?.map((k) =>
            k.value.toLowerCase()
          ),
        ],
      });
    } else if (Array.isArray(value) && value.length > 0) {
      reqBody.push({
        filter_type: filter.filter_type,
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: value ? [value].flat() : [],
      });
    } else if (value && typeof value === "number") {
      reqBody.push({
        filter_type: filter.filter_type,
        attribute_name: filter.column_name,
        operator: "in",
        dimension: filter.dimension,
        values: value ? [value].flat() : [],
      });
    }
  });

  if (isValid) {
    if (formValid) {
      if (setFilterPayload) {
        setFilterPayload(reqBody);
      }
    }
  } else {
    addSnack({
      message: "Enter complete date range",
      options: {
        variant: "error",
      },
    });
  }
};

export const handleReportDownload = ({
  addSnack,
  filterElements,
  filterDependency,
  setFilterPayload,
  planSmartDownloadReport,
  reportType,
  plansmartReportScreenConfig,
}) => {
  // Here we create payload for Report submission.
  let isValid = true;
  let formValid = true;
  let reqBody = {
    source: "client",
    plan_code: 0,
  };

  filterElements.forEach((filter) => {
    let value = filterDependency[filter.column_name];
    
    if (value && !Array.isArray(value)) {
      // irrespective of is_multiple_selection: true/false passing the filter data as array of values.
      value = [value];
    }

    if (filter.field_type === "rangePicker" && value?.length) {
      isValid = !(Boolean(value[0]) ^ Boolean(value[1]));
      value =
        Boolean(value[0]) & Boolean(value[1])
          ? [
              moment(value[0]).format("YYYY-MM-DD"),
              moment(value[1]).format("YYYY-MM-DD"),
            ]
          : [];
    }
    const isValuedArray = Array.isArray(value)
      ? value.filter((filterValue) => !!filterValue).length > 0
      : true;

    if (plansmartReportScreenConfig[reportType].filter_validation) {
      const filterValidations =
        plansmartReportScreenConfig[reportType].filter_validation;

      Object.keys(filterValidations).map((validationKey) => {
        if (validationKey === "required_filters") {
          const validation = filterValidations[validationKey];

          if (filter.column_name === validation.id) {
            if (filterDependency[validation.id]?.includes(validation.value)) {
              let validationFlag = false;
              let errorMessage = "";

              const requiredFilters = validation.filters;

              requiredFilters.map((filter) => {
                const value = filterDependency[filter];

                if (value && value.length > 0) {
                  validationFlag = true;
                } else {
                  validationFlag = false;
                  const filterIndex = filterElements.findIndex(
                    (item) => item.column_name === filter
                  );
                  errorMessage =
                    errorMessage + `${filterElements[filterIndex].label}`;
                }
              });

              if (!validationFlag) {
                formValid = false;
                addSnack({
                  message: `${errorMessage} is required for current ${filter.label} selection`,
                  options: {
                    variant: "error",
                  },
                });
              }
            }
          }
        }
      });
    }

    if (
      (filter.required || filter.is_mandatory) &&
      (!value || !isValuedArray)
    ) {
      formValid = false;
      addSnack({
        message: `${filter.label} is required`,
        options: {
          variant: "error",
        },
      });
    }
    switch (filter.column_name) {
      case "plansmart_year_value":
        reqBody = {
          ...reqBody,
          year: value,
        };
        break;
      case "plansmart_reports_buckets":
      case "plansmart_bucket":
        if (value.length > 0) {
          reqBody = {
            ...reqBody,
            bucket: value,
          };
        } else {
          const value = filter.options.map((option) => option.value);
          reqBody = {
            ...reqBody,
            bucket: value,
          };
        }
        break;
      default:
        if (value && filter.isMulti && value.length > 0) {
          reqBody = {
            ...reqBody,
            [filter.column_name]: value,
          };
        } else if (value) {
          reqBody = {
            ...reqBody,
            [filter.column_name]: value,
          };
        }
        break;
    }
  });

  if (isValid) {
    if (formValid) {
      planSmartDownloadReport(reqBody, reportType);
    }
  } else {
    addSnack({
      message: "Enter complete date range",
      options: {
        variant: "error",
      },
    });
  }
};

const StyledMenuItem = withStyles({
  root: {
    display: "block",
    padding: "0.5rem",
  },
})(MenuItem);

const StyledFormControlLabel = withStyles({
  label: {
    marginLeft: "1rem",
  },
})(FormControlLabel);

export const getSpecificDownloadOption = (options) =>
  downloadOptions.filter((option) => options.indexOf(option.value) > -1);

export const getDownloadEntirePlanHierarchyValue = (
  hierarchyLevelData,
  planDetails
) => {
  const list = hierarchyLevelData.map((hierarchy) => ({
    value: hierarchy.column_name,
    label:
      hierarchy.label + `(${planDetails[hierarchy.column_name]?.length || 0})`,
  }));
  return list;
};

export const getHierarchyValuesForDownload = (hierarchyLevel, planDetails) => {
  const filters = {};
  hierarchyLevel.forEach((hierarchy) => {
    filters[hierarchy] = planDetails[hierarchy];
  });
  return filters;
};

export const autoPopulateFields = (formElementsData, selectedData) => {
  formElementsData.forEach((formElement) => {
    if (
      formElement.required &&
      formElement.field_type === "dropdown" &&
      formElement?.options?.length === 1
    ) {
      if (
        formElement.isMulti &&
        selectedData[formElement.accessor]?.length === 0
      ) {
        selectedData[formElement.accessor] = formElement?.options.map(
          (option) => option.value
        );
        selectedData[`${formElement.accessor}_options`] = formElement?.options;
      } else if (!formElement.isMulti) {
        selectedData[formElement.accessor] = formElement?.options[0].value;
      }
    }
  });
  return selectedData;
};

export const customTabFunction = (
  column,
  instance,
  event,
  metrics_with_formatter,
  planDetails
) => {
  const tabbingObj = new TabbingUntil(
    event,
    column,
    instance,
    metrics_with_formatter,
    planDetails
  );
  if (event?.key === "Tab" && !event?.shiftKey) {
     tabbingObj.forwardTabbing();
    return true
  } else if (event?.key === "Tab" && event?.shiftKey) {
     tabbingObj.reverseTabbing();
    return true
  }
};
