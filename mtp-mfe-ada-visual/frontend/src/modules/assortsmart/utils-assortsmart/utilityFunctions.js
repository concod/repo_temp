import React from "react";
import moment from "moment";
import Home from "@mui/icons-material/Home";
import {
  BREAD_CRUMB_TITLES,
  Plan,
  coreChoicePlanLevels,
} from "../constants-assortsmart/stringContants";
import Tooltip from "@mui/material/Tooltip";
import Select from "core/commonComponents/filters/Select/Select";
import {
  percentFormatter,
  numbersWithComma,
  dollarFormatter,
  decimalsFormatter,
  arrayToCommaFormatter,
  capitalize,
  isEcommOrWholeSale,
} from "core/Utils/formatter";
import { cloneDeep, isArray, isEmpty } from "lodash";
import { ASSORT_CLUSTER_DASHBOARD, HINDSIGHT_DASHBOARD } from "../constants-assortsmart/routesContants";
import ReactSelect from "core/Utils/select";
import { formattedDate } from "core/Utils/formatter";
import { Checkbox, Radio, RadioGroup, FormControlLabel } from "@mui/material";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

export const AgGridAssortnonEditableCell = (item, ins) => {
  //it returns the formatter to cell based on type
  let roundOffTo = null;
  if (item.formatter === "roundOff") {
    roundOffTo = 0;
  } else if (item.formatter === "roundOfftoOneDecimals") {
    roundOffTo = 1;
  } else if (item.formatter === "roundOfftoTwoDecimals") {
    roundOffTo = 2;
  } else if (item.formatter === "roundOfftoThreeDecimals") {
    roundOffTo = 3;
  }

  switch (item.type) {
    case "percentage":
      return percentFormatter(
        ins,
        roundOffTo,
        item.is_editable ? true : false //for footer we don't want to multiply it by 100 so passing true
      );
    case "int":
      return numbersWithComma(ins, roundOffTo);
    case "float":
      return decimalsFormatter(ins, roundOffTo);
    case "dollar":
      return dollarFormatter(ins, roundOffTo);
    case "attribute":
      return attributeFormatter(ins.value, false);
    case "bool":
      return ins?.value || "";
    case "array":
      return arrayToCommaFormatter(ins.value);
    default:
      if (ins.value === 0 || ins.value === false || ins.value) {
        return ins.value;
      }
      return "";
  }
};

export const updateLyColumnHeading = (compareType) => {
  //Used to update the LY columns as LY for -1, LLY for -2 and LLLY for -3
  switch (compareType) {
    case -1:
      return "LY";
    case -3:
      return "LLLY";
    default:
      return "LLY";
  }
};

export const updateTableData = (
  rowIndex,
  columnId,
  value,
  _initialValue,
  _column,
  instance,
  _row,
  _id
) => {
  instance.settabledata((old) =>
    old.map((eachRow, index) => {
      if (index === rowIndex) {
        return {
          ...eachRow,
          [columnId]: value,
        };
      }
      return eachRow;
    })
  );
};

//Check if drops option should be disabled or enabled
export const isDropsDisabled = (startDate, endDate, compareType) => {
  if (startDate && endDate) {
    let rangeEndDate = endDate.subtract(Math.abs(compareType), "years");
    return rangeEndDate.isAfter(moment());
  }
  return true;
};

//Calculate number of weeks in selling period
export const calculateNoOfWeeks = (startDate, endDate) => {
  if (startDate && endDate) {
    let date1 = new Date(startDate);
    let date2 = new Date(endDate);
    let diff = (date2.getTime() - date1.getTime()) / 1000;
    diff = diff / (60 * 60 * 24 * 7);
    return Math.abs(Math.round(diff));
  } else {
    return -1;
  }
};
//convert year into value
export const convertCompareYrToNum = (yrStr) => {
  switch (yrStr) {
    case "LY":
      return -1;
    case "LLY":
      return -2;
    case "LLLY":
      return -3;
    default:
      return -1;
  }
};
//Converts steps into texts
export const planStepFormatter = (value) => {
  switch (value) {
    case "1.2":
      return "Finalize Cluster";
    case "2.1":
      return "Plan";
    case "2.2":
      return "Depth and Choice";
    case "2.3":
      return "Build the wedge";
    case "2.4":
      return "Finalize";
    case "3":
      return "Completed";
    case "4":
      return "Approved";
    case "5":
      return "OMNI Plan";
    case "6":
      return "OMNI Plan Placeholder created";
    case "7":
      return "OMNI Plan Merged";
    case "8":
      return "Finalise for PO";
    default:
      return "Cluster Input";
  }
};

export const getFloatValue = (isPrice, val) => {
  if (parseFloat(val) >= 0) {
    return (isPrice ? "$" : "") + parseInt(val).toString();
  } else return "";
};

export const parseValue = (data) => {
  if (typeof data === "string") {
    //removing commas from numbers
    return data?.toString()?.replaceAll(",", "");
  }
  //parsing the data to float if it has values else returning zero
  if (parseFloat(data)) {
    return parseFloat(data);
  } else {
    return 0;
  }
};

//Prepare filters Array in format required to pass to API
export const getFiltersRespArr = (filterNames) => {
  return filterNames.map((filterName) => {
    return {
      attribute_name: filterName,
      operator: "in",
      filter_type: "cascaded",
      values: [],
    };
  });
};

export const attributeFormatter = function (value) {
  //isPrice key is used for inserting dollar in value formatter

  //If value is not a valid type, return empty string
  if (!value) {
    return "";
  }

  //If value is not a numerical type, return by camel casing the text
  let letter = /[a-zA-Z]/g;
  if (value.match(letter)) {
    return value.length < 4
      ? value
          .replace(" penetration", "")
          .split("_")
          .map((setAllfield) => {
            //If setAll field contains term "cc",e.g max_cc whole term needs to be converted to uppercase
            if (setAllfield === "cc" || setAllfield === "aur")
              return setAllfield.toUpperCase();
            return (
              setAllfield.charAt(0).toUpperCase() +
              setAllfield.slice(1).toUpperCase() +
              " "
            );
          })
          .join("")
      : value
          .replace(" penetration", "")
          .split("_")
          .map((setAllfield) => {
            //If setAll field contains term "cc",e.g max_cc whole term needs to be converted to uppercase
            if (setAllfield === "cc" || setAllfield === "aur")
              return setAllfield.toUpperCase() + " ";
            return (
              setAllfield.charAt(0).toUpperCase() + setAllfield.slice(1) + " "
            );
          })
          .join("");
  }

  //If value is in numerical format
  return value
    .replace(" penetration", "")
    .replace("_", " ")
    .split("_")
    .map((e) => {
      let temp = e.split(" ");
      temp[0] = parseFloat(temp[0]) >= 0 ? parseInt(temp[0]).toString() : "";
      temp[1] = parseFloat(temp[1]) >= 0 ? parseInt(temp[1]).toString() : "";
      return temp[1].length ? temp[0] + " - " + temp[1] : temp[0];
    })
    .join("");
};

//Format String Array into Label and Value array
export const formatStringArray = (strArr) => {
  return strArr.map((str) => {
    return {
      label: str,
      value: str,
      id: str,
    };
  });
};

export const generateLevelJson = (data) => {
  //From levels api response we are creating a json
  //{ "l1_name": "Department", "l2_name": "Sub Department"}
  let level = {};
  data.level_info.forEach((element) => {
    level[element.column_name] = element.label;
  });
  const final_plan_level = data.final_plan_level;
  level[final_plan_level.column_name] = final_plan_level.label;
  return level;
};

export const hyphenatedFormatter = (data) => {
  // Remove hyphen from string and format it into a readable text
  return data
    .split("-")
    .map((e) => {
      //Making non-clustered cluster lable to camel case & rest other clusters' lable to uppercase
      return ["clustered", "non"].includes(e)
        ? e.charAt(0)?.toUpperCase() + e.slice(1)?.toLowerCase() + " "
        : e?.toUpperCase();
    })
    .join("");
};

export const getBreadCrumbHeader = (planStep, location) => {
  if (planStep === 0) {
    if (location.includes("omnichannel")) {
      return BREAD_CRUMB_TITLES[3];
    } else if (location.includes("omnimapping")) {
      return BREAD_CRUMB_TITLES[4];
    } else if (location.includes("alldoorchoiceconfiguration")) {
      return BREAD_CRUMB_TITLES[5];
    } else if (location.includes("cluster-dashboard")) {
      return BREAD_CRUMB_TITLES[6];
    } else if (location.includes("alldoorstyleconfiguration")) {
      return BREAD_CRUMB_TITLES[8];
    } else if (location.includes("master-plan-dashboard")) {
      return BREAD_CRUMB_TITLES[9];
    } else if (location.includes("master-plan-view")) {
      return BREAD_CRUMB_TITLES[10];
    } else if (location.includes("MFP-dashboard")) {
      return BREAD_CRUMB_TITLES[11];
    } else if(location.includes("hindsight-dashboard")){
      return BREAD_CRUMB_TITLES[12];
    }
    return BREAD_CRUMB_TITLES[0];
  }
  if (planStep >= 1.1 && planStep <= 1.2) {
    if (location.includes("cluster-dashboard")) {
      let breadCrum = cloneDeep(BREAD_CRUMB_TITLES[7]);
      breadCrum[0] = {
        label: "AssortSmart",
        route: ASSORT_CLUSTER_DASHBOARD,
        icon: <Home />,
      };
      return breadCrum;
    }
    return BREAD_CRUMB_TITLES[1];
  }
  if (planStep >= 2.1 && planStep <= 2.4) {
    return BREAD_CRUMB_TITLES[2];
  }
  if(planStep === 9){
    if(location.includes("hindsight")){
      let breadCrum = cloneDeep(BREAD_CRUMB_TITLES[13]);
      breadCrum[0] = {
        label: "Hindsight Dashboard",
        route: HINDSIGHT_DASHBOARD,
        icon: <Home />,
      };
      return breadCrum;
    }
  }
  if(planStep === 9.1){
    let breadCrum = cloneDeep(BREAD_CRUMB_TITLES[14]);
    breadCrum[0] = {
      label: "Hindsight Dashboard",
      route: HINDSIGHT_DASHBOARD,
      icon: <Home />,
    }
    return breadCrum;
  }
};

export const formatBreadCrumbs = (steps) => {
  return steps.map((step) => {
    return {
      id: `${step.label}_scr`,
      label: step.label,
      action: step.action,
    };
  });
};

export const getDateFilterSubractCompareYear = (planData) => {
  return {
    attribute_name: "date",
    value: [
      "'" +
        moment(planData.selling_period_sdate)
          .subtract(Math.abs(planData.compare_year), "years")
          .format("YYYY-MM-DD") +
        "' and '" +
        moment(planData.selling_period_edate)
          .subtract(Math.abs(planData.compare_year), "years")
          .format("YYYY-MM-DD") +
        "'",
    ],
    operator: "between",
  };
};

export const getDateFilters = (planData) => {
  return {
    attribute_name: "date",
    value: [
      "'" +
        moment(planData.selling_period_sdate).format("YYYY-MM-DD") +
        "' and '" +
        moment(planData.selling_period_edate).format("YYYY-MM-DD") +
        "'",
    ],
    operator: "between",
  };
};

export const getLevelFiltersBigQuery = (planData, levels) => {
  return levels?.data?.level_info.map((level) => {
    return {
      attribute_name: level.column_name,
      value: planData[level.column_name],
      operator: "in",
    };
  });
};

export const getDefaultValues = (elementsData, selectedData) => {
  let defaultValues = {};
  elementsData.forEach((item) => {
    if (selectedData[item.accessor]) {
      defaultValues[item.accessor] = selectedData[item.accessor];
    } else {
      defaultValues[item.accessor] = "";
    }
  });
  return defaultValues;
};
export const getLevelFilters = (planData, levels) => {
  return levels?.data?.level_info.map((level) => {
    return {
      attribute_name: level.column_name,
      value: Array.isArray(planData[level.column_name])
        ? planData[level.column_name]
        : [planData[level.column_name]],
      prefix: "levels",
      operator: "in",
    };
  });
};

export const getBudgetTablePayload = (planData, levels, isReviewTarget) => {
  const payload = {
    filters: [
      {
        attribute_name: "plan_code",
        value: [planData.plan_code],
        operator: "in",
      },
      ...getLevelFilters(planData, levels),
      {
        attribute_name: "start_date",
        value: [formattedDate(planData.selling_period_sdate, "YYYY-MM-DD")],
        operator: "in",
      },
      {
        attribute_name: "end_date",
        value: [formattedDate(planData.selling_period_edate, "YYYY-MM-DD")],
        operator: "in",
      },
      {
        attribute_name: "compare_type",
        operator: "in",
        value: [planData.compare_year.toString()],
      },
      {
        attribute_name: "is_grouping",
        operator: "in",
        value: ["false"],
      },
      {
        attribute_name: "store_type",
        operator: "in",
        value: planData.channel,
      },
    ],
  };
  if (planData?.sub_channel?.length > 0) {
    payload.filters.push({
      attribute_name: "sub_channel",
      operator: "in",
      value: planData.sub_channel,
    });
  }
  if (planData?.data_pull_source) {
    payload.filters.push({
      attribute_name: "data_pull_source",
      operator: "in",
      value: [planData.data_pull_source],
    });
  }
  if ("compare_season" in planData && planData.compare_season !== null) {
    payload.filters.push({
      attribute_name: "compare_season",
      operator: "in",
      value: [planData.compare_season],
    });
  }
  return payload;
};

export const getOptimiseL3Payload = (planDetailsData) => {
  let optimisePayload = {
    plan_code: planDetailsData.plan_code,
    store_group_id: planDetailsData.store_group_id
      ? planDetailsData.store_group_id
      : 0, //Send "All stores" group ID by default if none selected
    channel: planDetailsData.channel,
    filters: {
      l0_name: planDetailsData.l0_name,
      l1_name: planDetailsData.l1_name,
      l2_name: planDetailsData.l2_name,
    },
    time_period: [
      moment(planDetailsData.selling_period_sdate).format("YYYY-MM-DD"),
      moment(planDetailsData.selling_period_edate).format("YYYY-MM-DD"),
    ],
    compare_year: planDetailsData?.compare_year,
    compare_season: planDetailsData?.compare_season,
  };
  if (planDetailsData?.data_pull_source) {
    optimisePayload["data_pull_source"] = planDetailsData?.data_pull_source;
  }
  return optimisePayload;
};

export const getSummaryViewPayload = (selectedData, planLevels) => {
  const payloadKeys = [
    "l0_name",
    "l1_name",
    "l2_name",
    "l3_name",
    "channel",
    "sub_channel",
  ];
  let filters = {};
  payloadKeys.forEach((key) => {
    filters[key] = new Set();
  });
  selectedData?.forEach((item) => {
    payloadKeys?.forEach((key) => {
      if (key !== "sub_channel") {
        if (item[key]) {
          Array.isArray(item[key])
            ? filters[key].add(...item[key])
            : filters[key].add(item[key]);
        }
      } else {
        const sub_channel_key = item.sub_channel ? "sub_channel" : "channel";
        Array.isArray(item[sub_channel_key])
          ? filters[key].add(...item[sub_channel_key])
          : filters[key].add(item[sub_channel_key]);
      }
    });
  });
  let planData = {};
  payloadKeys.forEach((key) => {
    planData[key] = [...filters[key]];
  });
  const levels = [];
  payloadKeys?.forEach((key) => {
    if (!isEmpty(planData[key])) {
      levels.push({
        attribute_name: key,
        value: planData[key],
        prefix: "levels",
        operator: "in",
      });
    }
  });
  return levels;
};

export const filterView = (
  label,
  key,
  options,
  onChange,
  value,
  className,
  labelClassName,
  isMulti,
  isClearable = false,
  customLabel,
  showDropdown
) => {
  if (options?.length > 1 || showDropdown) {
    // returning drop down if it has more than one options
    return (
      <div className={className || ""} id={label}>
        <label
          className={labelClassName || "drop-down-label"}
        >{`${label}: `}</label>
        <Select
          menuPosition={"fixed"}
          customLabel={customLabel}
          isSearchable={true}
          menuShouldBlockScroll={true}
          pagination={true}
          fetchOptions={options}
          initialData={options}
          selectedOptions={isMulti ? value : [value]}
          updateDependency={(_key, option) => {
            let selectedValue = isMulti ? option : option[0];
            onChange(selectedValue, _key);
          }}
          filter_keyword={key}
          label={key}
          handleDropdownClose={true}
          is_multiple_selection={isMulti ? true : false}
          isClearable={isClearable}
        />
      </div>
    );
  } else {
    // return label instead of drop down if it has only one option
    return (
      <div className={className} id={label}>
        <label className={labelClassName || "bold-label"}>
          {`${label}: `}{" "}
        </label>
        <Tooltip
          placement="top"
          title={
            <React.Fragment>
              {replaceSpecialCharacter(value?.label || "")}
            </React.Fragment>
          }
        >
          <span className={"truncate-text"}>
            {replaceSpecialCharacter(value?.label || "")}
          </span>
        </Tooltip>
      </div>
    );
  }
};

export const getPlanPayload = (
  planData,
  levels,
  isDateRequired,
  withoutPrefix = false
) => {
  let filtersArray = [
    {
      attribute_name: "plan_code",
      value: [planData.plan_code],
      operator: "in",
    },
  ];
  if (withoutPrefix) {
    filtersArray.push(...getLevelFiltersBigQuery(planData, levels));
  } else {
    filtersArray.push(...getLevelFilters(planData, levels));
  }
  if (isDateRequired) {
    filtersArray.push(getDateFilters(planData));
  }
  return {
    filters: filtersArray,
  };
};

export const getAttrGraphPayload = (
  planData,
  levels,
  formData,
  clusterPlanData,
  type
) => {
  let date = type === "view-cluster-detail" ? clusterPlanData : planData;
  let filtersArray = [
    {
      attribute_name: "cluster_plan_code",
      value: [planData.cluster_plan_code],
      operator: "in",
    },
  ];
  //getting levels filter json
  filtersArray.push(...getLevelFiltersBigQuery(planData, levels));

  //subtracting compare year from start date
  let startDate = new Date(date.selling_period_sdate);
  startDate.setFullYear(
    startDate.getFullYear() - Math.abs(date.compare_year || 0)
  );
  startDate = moment(startDate).format("YYYY-MM-DD");

  //subtracting compare year from end date
  let endDate = new Date(date.selling_period_edate);
  endDate.setFullYear(
    endDate.getFullYear() - Math.abs(date.compare_year || 0)
  );
  endDate = moment(endDate).format("YYYY-MM-DD");
  filtersArray.push({
    attribute_name: "date",
    operator: "between",
    value: [`'${startDate}' and '${endDate}'`],
  });

  if (formData?.attribute) {
    filtersArray.push({
      attribute_name: "attributes_selected",
      value: isArray(formData?.attribute)
        ? formData?.attribute
        : [formData?.attribute],
      operator: "in",
    });
  }

  if (formData?.attributeBucketId) {
    filtersArray.push({
      attribute_name: "bucket_id",
      value: [parseInt(formData?.attributeBucketId)],
      operator: "in",
    });
  }

  if (formData?.channel) {
    filtersArray.push({
      attribute_name: "channel",
      value: [formData?.channel],
      operator: "in",
    });
  }
  return {
    filters: filtersArray,
  };
};

export const prepareAttrGraphPayload = (
  planData,
  formData,
  props,
  clusterPlanData
) => {
  let reqBodyAttrGraph = getAttrGraphPayload(
    planData,
    props.planLevels,
    formData,
    clusterPlanData,
    props.type
  );
  let date = props.type === "view-cluster-detail" ? clusterPlanData : planData;
  if (date?.selling_period) {
    reqBodyAttrGraph["selling_period"] = date?.selling_period;
  } else {
    reqBodyAttrGraph["selling_period"] = [
      {
        start_date: date?.selling_period_sdate,
        end_date: date?.selling_period_edate,
        weightage: "100",
      },
    ];
  }
  return reqBodyAttrGraph;
};

export const getOmniLevelFilters = (planData, levels) => {
  return levels?.data?.level_info.map((level) => {
    return {
      attribute_name: level.column_name,
      value: planData[level.column_name],
      prefix: "source_levels",
      operator: "in",
    };
  });
};

export const getOmniPlanPayload = (planData, levels) => {
  let filtersArray = [
    {
      attribute_name: "source_plan_code",
      value: [planData.plan_code],
      operator: "in",
    },
  ];
  filtersArray.push(...getOmniLevelFilters(planData, levels));
  return {
    filters: filtersArray,
  };
};

/**
 *
 * @param {any} value
 * @returns array
 *
 * This method checks if the passed value is array or not and return in the array format
 */
export const returnInArrayFormat = (value) => {
  return Array.isArray(value) ? value : [value];
};

export const generateColumnsToFilter = (columns, levelsJson) => {
  if (columns?.length) {
    return columns.map((col) => {
      return {
        key: col,
        label: levelsJson[col] || attributeFormatter(col),
        defaultInx: 0,
      };
    });
  }
};

// export const assortCustomCellRenderer = (cellProps, history) => {
//   const { column, tableId, row } = cellProps;
//   if (column.type === "ToogleField") {
//     if (tableId === "assortDashboardPlansTable") {
//       if (history.location.pathname.includes("omnichannel")) {
//         if (row.original.plan_step < 7) {
//           return "-";
//         }
//         return "";
//       }
//       if (row.original.plan_step < 3) {
//         return "-";
//       }
//       return "";
//     }
//   }
//   if (tableId === "wedge table") {
//     if (column.id === "all_door_choice" || column.id === "dropship_choice") {
//       if (row.original[`${props.screenConfiguration?.common?.flow_key || "flow"}_name`] !== "-") {
//         return "-";
//       } else if (
//         cellProps.value === "Yes" ||
//         row.original.attributes_selling_collection === "collegiate"
//       ) {
//         return cellProps.value || "-";
//       }
//     }
//     if (
//       column.id === "attributes_selling_collection" &&
//       row.original.attributes_selling_collection === "collegiate"
//     ) {
//       return cellProps.value;
//     }
//     if (
//       Plan.__Wedge_Column_Type_disable.includes(column.type) &&
//       row.original[`${props.screenConfiguration?.common?.flow_key || "flow"}_name`] !== "-"
//     ) {
//       return cellProps.value || "-";
//     }
//     return "";
//   }
//   if (history.location.pathname.includes("alldoor")) {
//     if (
//       column.Header === "All Door Choice Count" ||
//       column.Header === "All Door Style Count"
//     ) {
//       if (row.original.is_finalised_plan) {
//         return row.original.all_door_cc;
//       }
//       return "";
//     }
//   }
//   return "";
// };

const handleDropDown = (e, instance) => {
  let cellNode = instance.data;
  let colId = instance.colDef.column_name;
  cellNode[`selected_${colId}`] = e.value;
};

export const assortAgGridCustomCellRenderer = (
  cellProps,
  tableID,
  history,
  props,
  handleEventChange,
  selectedValues,
  screenConfiguration
) => {
  const { data, colDef } = cellProps;
  switch (tableID) {
    case "dashboard":
      if (colDef.type === "ToogleField") {
        if (history.location.pathname.includes("omnichannel")) {
          if (data.plan_step < 7) {
            return "-";
          }
          return "";
        }
        if (data.plan_step < 3) {
          return "-";
        }
        return "";
      }
      break;
    case "budget-level2-table":
      if (data?.channel === "Total") {
        return colDef.column_name === "view_trends"
          ? " "
          : AgGridAssortnonEditableCell(colDef, {
              value: data[colDef.column_name],
            });
      }
      break;
    case "style_color-table":
      if (data?.style_color_id === "Total") {
        return colDef.column_name === "is_active" ||
          colDef.column_name === "is_locked"
          ? " "
          : AgGridAssortnonEditableCell(colDef, {
              value: data[colDef.column_name],
            });
      }
      break;
    case "budget-level3-table":
      if (data?.l3_name === "Total") {
        return colDef.column_name === "lock" || colDef.column_name === "delete"
          ? " "
          : colDef.column_name === "penetration_ty" ||
            colDef.column_name === "budget_ty" ||
            colDef.column_name === "aur_ty"
          ? AgGridAssortnonEditableCell(colDef, {
              value: data[colDef.column_name],
            })
          : //parseInt(data[colDef.column_name])
            null;
      }
      if (
        data?.carryover_flag === "Carryover" ||
        data?.carryover_flag === "Total"
      ) {
        if (colDef.column_name !== "lock")
          return AgGridAssortnonEditableCell(colDef, {
            value: data[colDef.column_name],
          });
      }
      if (
        data?.carryover_flag &&
        data?.carryover_flag !== "Total" &&
        colDef.column_name === "lock"
      ) {
        //lock check box enabled only for parent
        return " ";
      }
      break;
    case "NonLinearEditTable":
      if (data?.l3_name === "Total") {
        return colDef.column_name === "penetration_ty" ||
          colDef.column_name === "aur_ty"
          ? parseInt(data[colDef.column_name])
          : null;
      } else {
        if (
          data?.carryover_flag === "Carryover" ||
          data?.carryover_flag === "Total"
        ) {
          return AgGridAssortnonEditableCell(colDef, {
            value: data[colDef.column_name],
          });
        }
        return colDef.column_name === "budget_ty"
          ? parseInt(data?.[colDef.column_name]) === 0
            ? "0"
            : AgGridAssortnonEditableCell(colDef, {
                value: data?.[colDef.column_name] || 0,
              })
          : null;
      }
    case "depth-table":
    case "choice-table":
      if (data?.l3_name === "Total") {
        return colDef.column_name.includes("_ty")
          ? parseInt(data[colDef.column_name]) || "0"
          : null;
      }
      if (
        data?.carryover_flag === "Carryover" ||
        data?.carryover_flag === "Total"
      ) {
        let returnValue = AgGridAssortnonEditableCell(colDef, {
          value: data[colDef.column_name],
        });
        return returnValue || "0";
      }
      break;
    case "setupflowtable":
      if (data?.l3_name === "Total") {
        return colDef.column_name.includes("drop_split")
          ? " "
          : colDef.column_name.includes("penetration_flow_")
          ? parseInt(data[colDef.column_name]) || 0
          : null;
      }
      break;
    case "wedge_table":
      if (
        data?.[`${screenConfiguration?.common?.flow_key || "flow"}_name`] !==
          "-" &&
        colDef.column_name.includes("attributes_")
      ) {
        return cellProps?.value || "-";
      }
      if (
        colDef.column_name === "attributes_selling_collection" &&
        data.attributes_selling_collection === "collegiate"
      ) {
        return cellProps?.value;
      }
      if (
        colDef.column_name === "all_door_choice" ||
        colDef.column_name === "dropship_choice" ||
        colDef.column_name === "delete_choice"
      ) {
        if (
          data?.[`${screenConfiguration?.common?.flow_key || "flow"}_name`] !==
          "-"
        ) {
          return "-";
        } else if (
          cellProps?.value === "Yes" &&
          colDef.column_name !== "delete_choice"
        ) {
          return cellProps?.value || "-";
        }
      }
      if (
        colDef.column_name === "style_id" &&
        data?.style_carryover_flag &&
        data?.style_carryover_flag !== "New"
      ) {
        return cellProps?.value || "-";
      }
      if (
        (colDef.column_name === "color_name" ||
          colDef.column_name === "style_no" ||
          colDef.column_name === "color_code" ||
          colDef.column_name === "parent_style") &&
        data?.choice_carryover_flag &&
        data?.choice_carryover_flag !== "New"
      ) {
        return cellProps?.value || "-";
      }
      if (
        colDef.column_name === "total_qty" ||
        colDef.column_name === "forecasted_qty" ||
        colDef.column_name === "all_door_choice" ||
        colDef.column_name.includes("clusters_")
      ) {
        if (data.set_name && data.set_name !== "") {
          return (
            <Tooltip
              placement="top"
              title={
                <React.Fragment>{"Edit units through sets"}</React.Fragment>
              }
            >
              <span onClick={() => props.setShowPackModal(true)}>
                {cellProps?.value || "0"}
              </span>
            </Tooltip>
          );
        }
      }
      if (
        colDef.column_name === "map_style" &&
        data.flow_name === "-" &&
        data.set_name &&
        data.set_name !== ""
      ) {
        return (
          <Tooltip
            placement="top"
            title={
              <React.Fragment>
                {"Sets not applicable for style mapping"}
              </React.Fragment>
            }
          >
            <span>NA</span>
          </Tooltip>
        );
      }
      break;
    case "style_level_table":
      if (
        ((data?.style_carryover_flag && data?.style_carryover_flag !== "New") ||
          (data?.style_carryover_flag === "New" &&
            data?.choice_carryover_flag !== "Total")) &&
        colDef.accessor === "select"
      ) {
        return " ";
      }
      if (
        data?.choice_carryover_flag !== "Total" &&
        colDef.column_name.includes("attributes_")
      ) {
        return cellProps?.value || "-";
      }
      if (
        colDef.column_name === "attributes_selling_collection" &&
        data?.attributes_selling_collection === "collegiate"
      ) {
        return cellProps?.value;
      }
      if (
        colDef.column_name === "all_door_choice" ||
        colDef.column_name === "dropship_choice"
      ) {
        if (
          data?.[`${screenConfiguration?.common?.flow_key || "flow"}_name`] !==
          "-"
        ) {
          return "-";
        } else if (cellProps.value === "Yes") {
          return cellProps?.value || "-";
        }
      }
      if (
        data?.choice_carryover_flag === "Total" &&
        (colDef.column_name.includes("clusters_") ||
          colDef.column_name.includes("total_qty") ||
          colDef.column_name.includes("forecasted_qty") ||
          colDef.column_name === "st")
      ) {
        return Math.round(cellProps?.value) || "0";
      }
      if (
        data?.choice_carryover_flag !== "Total" &&
        (colDef.column_name === "gross_margin" ||
          colDef.column_name === "all_door_choice" ||
          colDef.column_name === "style_name" ||
          colDef.column_name === "style_des" ||
          colDef.column_name === "merchant_pyramid" ||
          colDef.column_name === "pillar")
      ) {
        return cellProps?.value || " ";
      }
      if (
        (data?.style_carryover_flag !== "New" ||
          (data?.choice_carryover_flag !== "Total" &&
            data?.style_carryover_flag === "New")) &&
        colDef.column_name === "style_no"
      ) {
        return cellProps?.value || " ";
      }
      if (
        data?.choice_carryover_flag !== "New" &&
        (colDef.column_name === "color_count_ty" ||
          colDef.column_name.includes("total_qty") ||
          colDef.column_name.includes("forecasted_qty") ||
          colDef.column_name.includes("clusters_"))
      ) {
        return Math.round(cellProps?.value) || "0";
      }
      if (
        data?.choice_carryover_flag !== "New" &&
        colDef.column_name === "st"
      ) {
        return Math.round(cellProps?.value) < 0
          ? 0 + "%"
          : Math.round(cellProps?.value) > 100
          ? 100 + "%"
          : Math.round(cellProps?.value) + "%" || " ";
      }
      if (colDef.column_name === "total_qty") {
        return Math.round(cellProps?.value) || "0";
      }
      break;
    case "cluster_table":
      if (data?.l3_name === "Total") {
        return colDef?.column_name?.includes("_ty")
          ? AgGridAssortnonEditableCell(colDef, {
              value: data[colDef.column_name],
            })
          : null;
      }
      break;
    case "all-door-cc":
      if (colDef.column_name === "all_door_cc") {
        if (data.is_finalised_plan) {
          return cellProps?.value;
        }
        return "";
      }
      break;
    case "add_choice_table":
      if (colDef.accessor.includes("attributes_")) {
        colDef.cellRenderer = (instance) => {
          return (
            <div style={{ width: "100%" }}>
              <ReactSelect
                menuShouldBlockScroll={true}
                menuPortalTarget={document.body}
                name={colDef.accessor}
                isMulti={colDef.isMulti}
                isSearchable={false}
                options={instance?.data?.[colDef.accessor] || []}
                data-testid={`select${colDef.name}`}
                onChange={(option) => handleDropDown(option, instance)}
                isDisabled={colDef.disabled}
              />
            </div>
          );
        };
      }
      if (
        colDef.accessor.includes("_units") &&
        props.planMetricsData?.length &&
        props.planMetricsData?.[0]?.channel?.[data.l3_name]
      ) {
        let channel = colDef.column_name.split("_units")[0];
        if (
          !props.planMetricsData?.[0]?.channel[data.l3_name].includes(channel)
        ) {
          return "0";
        }
      }
      break;
    case "add_style_table":
      if (colDef.accessor.includes("attributes_")) {
        colDef.cellRenderer = (instance) => {
          return (
            <div style={{ width: "100%" }}>
              <ReactSelect
                menuShouldBlockScroll={true}
                menuPortalTarget={document.body}
                name={colDef.accessor}
                isMulti={colDef.isMulti}
                isSearchable={false}
                options={instance?.data?.[colDef.accessor] || []}
                data-testid={`select${colDef.name}`}
                onChange={(option) => handleDropDown(option, instance)}
                isDisabled={colDef.disabled}
              />
            </div>
          );
        };
      }
      break;
    case "drop-flow-table":
      if (data?.l3_name.includes("Total")) {
        //check if it is a footer
        return colDef.column_name !== "carryover_flag" &&
          !colDef.column_name.includes("drop") &&
          !colDef.column_name.includes("launch")
          ? //for drop and carrover_flag column footer we need empty space
            " "
          : AgGridAssortnonEditableCell(colDef, {
              value: data[colDef.column_name] || 0,
            });
      }
      if (
        !data?.carryover_flag ||
        (data?.carryover_flag && data.carryover_flag !== "New")
      ) {
        return AgGridAssortnonEditableCell(colDef, {
          value: data[colDef.column_name],
        });
      }
      break;
    case "receipt-view-table":
      if (colDef.column_name !== "tag") {
        if (data?.tag?.includes("%")) {
          return parseFloat(cellProps.value * 100).toFixed(2) + "%";
        }
        return AgGridAssortnonEditableCell(colDef, {
          value: data[colDef.column_name],
        });
      }
      break;
    case "style-mapping-component":
      let selectedAttributes = [];
      let IsColumnHasAttribute = false;
      // Finding attributes selected keys
      selectedValues?.["attributes_selected"]?.length &&
        selectedValues?.["attributes_selected"].map((obj) => {
          Object.keys(obj).map((key) => {
            selectedAttributes.push(key);
          });
        });
      // Check if col_name matches with the attribute name
      props.wedgeAttributeData.map((attri) => {
        if (attri.attribute_name === colDef.column_name) {
          return (IsColumnHasAttribute = true);
        }
      });
      // Enable checkbox for aps, aur, sales and sales_units columns
      if (
        // If column_name is aps and selected attributes does not has sales_units enable aps checkbox
        ((colDef.column_name === "aps" &&
          selectedAttributes?.length &&
          !selectedAttributes.includes("sales_units")) ||
          // If column_name is aps and it does not have any selected attributes enable aps checkbox
          (colDef.column_name === "aps" && !selectedAttributes?.length) ||
          // If column_name is aur,eop_inv_quantity , attributes enable checkbox for respective columns
          colDef.column_name === "aur" ||
          colDef.column_name === "eop_inv_quantity" ||
          IsColumnHasAttribute ||
          // If column_name is sales_units and selected attributes does not has  enable sales_units checkbox
          (colDef.column_name === "sales_units" &&
            selectedAttributes?.length &&
            !selectedAttributes.includes("aps")) ||
          // If column_name is sales_units and it does not have any selected attributes enable sales_units checkbox
          (colDef.column_name === "sales_units" &&
            !selectedAttributes?.length)) &&
        // Enable checkbox for attributes only for the rows which are selected
        selectedValues?.["choices_selected"] &&
        selectedValues?.["choices_selected"].article +
          selectedValues?.["choices_selected"].season_name ===
          data.article + data.season_name
      ) {
        return (
          <p>
            <Checkbox
              checked={
                selectedAttributes?.length &&
                selectedAttributes.includes(colDef.column_name)
                  ? true
                  : false
              }
              onChange={(event) => {
                handleEventChange(event, "checkbox", colDef.column_name, data);
              }}
              color="primary"
            />
            {typeof cellProps.value === "number"
              ? parseFloat(cellProps.value).toFixed(2)
              : cellProps?.value || "0"}
          </p>
        );
      }
      if (colDef.column_name === "radio_select") {
        return (
          <p>
            <RadioGroup
              row
              name="radio"
              value={
                data.article &&
                !isEmpty(selectedValues) &&
                selectedValues?.["choices_selected"]?.article +
                  selectedValues?.["choices_selected"]?.season_name ===
                  data?.article + data?.season_name
                  ? true
                  : false
              }
              onClick={(event) => {
                handleEventChange(event, "radio", colDef.column_name, data);
              }}
            >
              <FormControlLabel
                value={true}
                control={<Radio color="primary" />}
                label=""
              />
            </RadioGroup>
          </p>
        );
      }
      return typeof cellProps.value === "number"
        ? parseFloat(cellProps.value).toFixed(2)
        : cellProps?.value || "0";
      break;
    case "add-pack-component":
      if (colDef.column_name === "is_set_primary") {
        return (
          <p>
            <RadioGroup
              row
              name="radio"
              value={data.is_set_primary ? true : false}
              onClick={(event) => {
                handleEventChange(event, "radio", colDef.column_name, data);
              }}
            >
              <FormControlLabel
                value={true}
                control={<Radio color="primary" />}
                label=""
              />
            </RadioGroup>
          </p>
        );
      }
      break;
    case "hindsight-dashboard": 
      if(colDef.type === "rangeSlider"){
        return "";
      }
      break;
    default:
      break;
  }
};

export const getDropName = (props, value) => {
  if (value) {
    if (value === "-") {
      return `All ${attributeFormatter(
        props.screenConfiguration?.common?.drop_key || "drops"
      )}`;
    } else {
      return capitalize(value.replace("_", ""));
    }
  }
};

export const isEcomPlan = (planDetails) => {
  if (
    Plan.__Ecom_Channel.includes(planDetails?.channel?.[0]) ||
    Plan.__Ecom_Channel.includes(planDetails?.sub_channel?.[0])
  ) {
    return true;
  }
  return false;
};

export const channelContainsEcomPlan = (planDetails) => {
  if (
    planDetails?.channel?.includes("Ecom") ||
    planDetails?.channel?.includes("ECOMM") ||
    planDetails?.channel?.includes("ecomm_outlet") ||
    planDetails?.channel?.includes("ecomm_fullprice") ||
    planDetails?.channel?.includes("Web")
  ) {
    return true;
  }
  return false;
};

export const isWholesalePlan = (planDetails) => {
  if (planDetails?.channel?.[0] === "Wholesale") {
    return true;
  }
  return false;
};

export const isDropPlan = (planDetails, key = "drops_count") => {
  if (planDetails?.[key] > 1) {
    return true;
  }
  return false;
};

export const showCreateStoreGroup = (planDetails) => {
  return !isEcommOrWholeSale(planDetails?.channel?.[0]);
};

export const getDateFormat = () => {
  return "MM/DD/YYYY";
};

export const removeNumberFromText = (data) => {
  return data.replace(/[0-9]/g, "");
};

export const generateFilterValues = (planData, levels) => {
  const filterValues = levels.map((level) => {
    return {
      attribute_name: level,
      operator: "in",
      filter_type: "cascaded",
      values: planData[level],
    };
  });
  return filterValues;
};

export const addDropToPayload = (data, payload, dropKey) => {
  if (data?.[`${dropKey || "drops"}_count`] > 1) {
    let dropArr = [];
    for (let i = 1; i <= data?.[`${dropKey || "drops"}_count`]; i++) {
      dropArr.push(data?.[`${dropKey || "drops"}_${i}`]);
    }
    payload.filters.push({
      attribute_name: dropKey || "drop",
      value: dropArr,
      prefix: "levels",
      operator: "in",
    });
  } else {
    payload.filters.push({
      attribute_name: dropKey || "drop",
      value: ["-"],
      prefix: "levels",
      operator: "in",
    });
  }
  return payload;
};

export const getCoreChoiceFilterPayload = (formData) => {
  const payload = [],
    planLevels = coreChoicePlanLevels;
  for (const key in formData) {
    if (formData[key] !== "") {
      if (planLevels.includes(key)) {
        if (key === "l5_name") {
          payload.push({
            attribute_name: "l3_name",
            operator: "in",
            value: [formData[key]],
            prefix: "levels",
          });
        } else {
          payload.push({
            attribute_name: key,
            operator: "in",
            value: [formData[key]],
            prefix: "levels",
          });
        }
      } else {
        if (key.includes("season")) {
          payload.push({
            attribute_name: "season_id",
            operator: "in",
            value: [formData[key]],
          });
        } else {
          payload.push({
            attribute_name: key,
            operator: "in",
            value: [formData[key]],
          });
        }
      }
    }
  }
  return payload;
};

export const isChannelMultiple = (planDetails) => {
  if (planDetails?.channel?.length > 1) {
    return true;
  }
  return false;
};

export const channelContainsTotal = (planDetails) => {
  if (
    planDetails?.channel.includes("CA") &&
    planDetails?.channel.includes("US")
  ) {
    return true;
  }
  return false;
};

/**
 * Call function to remove l0_name, l1_name, l2_name from l3_name
 * @param {string} rowData - selected data of the row
 * @param {string} type - type of the table column i.e. choice_name or l3_name
 */

export const getModifiedL3Name = (rowData, type) => {
  let name = rowData.l3_name;
  // Check if l0_name || l1_name || l2_name exists in l3_name.
  for (var i = 0; i < 3; i++) {
    if (name.includes(rowData[`l${i}_name`])) {
      name = name.replace(rowData[`l${i}_name`], "");
      name = name.replaceAll("-", "");
    }
  }
  if (
    type === "choice_name" ||
    type === "style_id" ||
    type === "global_style_number" ||
    type === "source_choice_id"
  ) {
    name = rowData?.attributes?.[type]
      ? rowData.attributes[type].replace(rowData.l3_name, name)
      : rowData[type].replace(rowData.l3_name, name);
  }
  return name;
};

export const externalFilterLevelsChannelSubChannel = (
  node,
  tableData,
  formData,
  planDetails,
  levelsJson
) => {
  if (node.data) {
    let channelOpt = planDetails.channel?.map((data) => {
      return {
        label: data,
        value: data,
        id: data,
      };
    });
    let defaultChannel = getDefaultChannelValue(channelOpt, planDetails);
    let selectedChannel = isEmpty(formData)
      ? defaultChannel?.value
      : formData?.channel_list;
    let selectedSubChannel = isEmpty(formData)
      ? tableData?.[0]?.sub_channel
      : formData?.sub_channel_list;
    let formDataLevels = [];
    Object.keys(formData).forEach((formKey) => {
      if (Object.keys(levelsJson).includes(formKey)) {
        formDataLevels.push(formKey);
      }
    });

    //If multiple plan levels have multiple values
    if (formDataLevels?.length >= 1) {
      let filteredData = [];
      //filter table data based on selected filter values of different levels
      formDataLevels.forEach((level) => {
        if (formData[level] === node?.data?.[level]) {
          filteredData.push(node?.data?.[level]);
        }
      });
      //Return true if particular row matches levels(l0, l1, l2, etc) value with selected levels value
      return filteredData?.length === formDataLevels?.length;
    } else if (isChannelMultiple(planDetails) && isWholesalePlan(planDetails)) {
      //If plan is having multiple channels & a wholesale plan
      return (
        selectedChannel === node?.data?.channel &&
        selectedSubChannel === node.data?.sub_channel
      );
    } else if (isWholesalePlan(planDetails)) {
      //if a plan is wholesale filtering based on selected sub_channel
      return selectedSubChannel === node.data?.sub_channel;
    } else if (isChannelMultiple(planDetails)) {
      return selectedChannel === node.data?.channel;
    }
  }
  return true;
};

export const externalFilterChannelSubChannel = (
  node,
  tableData,
  formData,
  planDetails
) => {
  if (node.data) {
    let channelOpt = planDetails.channel?.map((data) => {
      return {
        label: data,
        value: data,
        id: data,
      };
    });
    let defaultChannel = getDefaultChannelValue(channelOpt, planDetails);
    let selectedChannel = isEmpty(formData)
      ? defaultChannel?.value
      : formData?.channel_list;
    let selectedSubChannel = isEmpty(formData)
      ? tableData?.[0]?.sub_channel
      : formData?.sub_channel_list;
    if (isChannelMultiple(planDetails) && isWholesalePlan(planDetails)) {
      return (
        selectedChannel === node?.data?.channel &&
        selectedSubChannel === node.data?.sub_channel
      );
    } else if (isWholesalePlan(planDetails)) {
      //if a plan is wholesale filtering based on selected sub_channel
      return selectedSubChannel === node.data?.sub_channel;
    } else if (isChannelMultiple(planDetails)) {
      return selectedChannel === node.data?.channel;
    }
  }
  return true;
};

export const externalFilterSubChannel = (
  node,
  tableData,
  formData,
  planDetails
) => {
  if (node.data) {
    let selectedSubChannel = isEmpty(formData)
      ? tableData?.[0]?.sub_channel
      : formData?.sub_channel_list;
    if (isWholesalePlan(planDetails)) {
      //if a plan is wholesale filtering based on selected sub_channel
      return selectedSubChannel === node.data?.sub_channel;
    }
  }
  return true;
};

export const getL3OptPayload = (
  planDetails,
  formData,
  isCreateNew,
  props,
  isNLE
) => {
  let payload = {
    filters: [
      {
        attribute_name: "plan_code",
        value: [parseInt(planDetails.plan_code)],
        operator: "in",
      },
      {
        attribute_name: "channel",
        value:
          formData?.channel_list ||
          (planDetails.channel?.includes("US")
            ? ["US"]
            : [planDetails?.channel?.[0]]),
        prefix: "levels",
        operator: "in",
      },
      {
        attribute_name: "is_active",
        value: [isCreateNew ? "NO" : "YES"],
        operator: "in",
      },
      {
        attribute_name: "is_grouping",
        operator: "in",
        value: [formData?.channel_list?.length > 1 ? "true" : "false"],
      },
    ],
  };
  if (planDetails?.l1_name?.length > 1 && !isNLE) {
    payload.filters.push({
      attribute_name: "l1_name",
      value: [
        props.levelOneSelected?.value
          ? props.levelOneSelected?.value
          : planDetails?.l1_name?.[0],
      ],
      prefix: "levels",
      operator: "in",
    });
  }
  if (
    !isNLE &&
    props?.currentTableLevel === "l3_name" &&
    planDetails?.l2_name?.length > 1
  ) {
    payload.filters.push({
      attribute_name: "l2_name",
      value: [
        props.levelTwoSelected?.value
          ? props.levelTwoSelected?.value
          : planDetails?.l2_name?.[0],
      ],
      prefix: "levels",
      operator: "in",
    });
  }
  if (isCreateNew) {
    if (formData?.[props.screenConfiguration?.common?.drop_key || "drop"]) {
      payload.filters.push({
        attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
        value: [
          formData?.[props.screenConfiguration?.common?.drop_key || "drop"],
        ],
        prefix: "levels",
        operator: "in",
      });
    }
  }
  return payload;
};

export const setEdiableFalse = (cols) => {
  //making all columns non ediatble
  let columns = cols.map((col) => {
    if (col.column_name !== "view_trends" && col.column_name !== "delete") {
      col.editable = false;
      col.is_editable = false;
      if (col.column_name === "lock") {
        col.is_hidden = true;
        col.hide = true;
      }
      if (col.sub_headers?.length) {
        col.sub_headers = setEdiableFalse(col.sub_headers);
      }
    }
    return col;
  });
  return columns;
};

export const getDefaultChannelValue = (channelOpt, planDetails) => {
  if (planDetails.channel.includes("US")) {
    //CK/TH specific request.
    if (channelOpt?.length) {
      return channelOpt?.find((channel) => channel?.label === "US");
    } else {
      return "US";
    }
  }
  return channelOpt?.[0] || planDetails.channel?.[0];
};

export const externalFilterSubChannelDrop = (
  node,
  tableData,
  formData,
  planDetails
) => {
  if (node.data) {
    let selectedSubChannel = isEmpty(formData)
      ? tableData?.[0]?.sub_channel
      : formData?.sub_channel_list;
    if (isWholesalePlan(planDetails)) {
      //if a plan is wholesale filtering based on selected sub_channel
      return selectedSubChannel === node.data?.sub_channel;
    }
  }
  return true;
};

export const externalFilterLevelTwoSubchannel = (
  node,
  selectedDrop,
  tableData,
  formData,
  planDetails,
  screenConfiguration
) => {
  if (node.data) {
    let selectedSubChannel = isEmpty(formData)
      ? tableData?.[0]?.sub_channel
      : formData?.sub_channel_list;
    if (isWholesalePlan(planDetails)) {
      //if a plan is wholesale filtering based on selected sub_channel
      return selectedSubChannel === node.data?.sub_channel;
    } else if (
      isDropPlan(
        planDetails,
        `${screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      return (
        (selectedDrop || "-") ===
        node?.data?.[screenConfiguration?.common?.drop_key || "drop"]
      );
    }
  }
  return true;
};

/* Filter NLE data based on subchannel, l1_name & l2_name selected*/
export const externalFilterMultipleLevel = (
  node,
  formValues,
  tableData,
  planDetails,
  formData,
  type,
  screenConfiguration
) => {
  if (node.data) {
    let selectedSubChannel = formValues?.sub_channel_list
      ? formValues?.sub_channel_list
      : tableData[0]?.sub_channel;
    let selectedChannel = formValues?.channel_list
      ? formValues?.channel_list
      : [
          getDefaultChannelValue(
            formValues?.channel_list_options || [],
            planDetails
          )?.label,
        ];
    let selectedDrop = formValues?.[
      screenConfiguration?.common?.drop_key || "drop"
    ]
      ? formValues?.[screenConfiguration?.common?.drop_key || "drop"]
      : tableData[0]?.[screenConfiguration?.common?.drop_key || "drop"];
    let levelTwoValue = formValues?.l2_name
      ? formValues?.l2_name
      : formData?.l2_name;
    let levelOneVaue = formValues?.l1_name
      ? formValues?.l1_name
      : formData?.l1_name;
    /* Logic for multiple drops plan*/
    if (
      isDropPlan(
        planDetails,
        `${screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      /*Filter data for wholesale channel plan*/
      if (isWholesalePlan(planDetails)) {
        return (
          selectedSubChannel === node.data?.sub_channel &&
          selectedDrop ===
            node.data?.[screenConfiguration?.common?.drop_key || "drop"]
        );
      } else if (
        planDetails?.l2_name?.length > 1 &&
        planDetails?.l1_name?.length > 1 &&
        isChannelMultiple(planDetails) &&
        type !== "NLE"
      ) {
        /* Filter data for plan which has multiple levelone & leveltwo values*/
        return (
          levelTwoValue === node?.data?.l2_name &&
          levelOneVaue === node?.data?.l1_name &&
          selectedDrop ===
            node?.data?.[screenConfiguration?.common?.drop_key || "drop"] &&
          selectedChannel.includes(node?.data?.channel)
        );
      } else if (
        planDetails?.l2_name?.length > 1 &&
        planDetails?.l1_name?.length > 1
      ) {
        /* Filter data for plan which has multiple levelone & leveltwo values*/
        return (
          levelTwoValue === node?.data?.l2_name &&
          levelOneVaue === node?.data?.l1_name &&
          selectedDrop ===
            node?.data?.[screenConfiguration?.common?.drop_key || "drop"]
        );
      } else if (planDetails?.l2_name?.length > 1) {
        /* Filter data for plan which has multiple leveltwo values*/
        return (
          levelTwoValue === node?.data?.l2_name &&
          selectedDrop ===
            node?.data?.[screenConfiguration?.common?.drop_key || "drop"]
        );
      } else if (planDetails?.l1_name?.length > 1) {
        /*Filter data for plan which has multiple levelone values*/
        return (
          levelOneVaue === node?.data?.l1_name &&
          selectedDrop ===
            node?.data?.[screenConfiguration?.common?.drop_key || "drop"]
        );
      } else if (isChannelMultiple(planDetails) && type !== "NLE") {
        /*Filter data for plan which has multiple channel values*/
        return (
          selectedChannel.includes(node?.data?.channel) &&
          selectedDrop ===
            node?.data?.[screenConfiguration?.common?.drop_key || "drop"]
        );
      } else {
        /*Filter data for selected drop*/
        return (
          selectedDrop ===
          node.data?.[screenConfiguration?.common?.drop_key || "drop"]
        );
      }
    } else {
      if (isWholesalePlan(planDetails)) {
        return selectedChannel === node.data?.sub_channel;
      } else if (
        planDetails?.l2_name?.length > 1 &&
        planDetails?.l1_name?.length > 1 &&
        isChannelMultiple(planDetails) &&
        type !== "NLE"
      ) {
        return (
          levelTwoValue === node?.data?.l2_name &&
          levelOneVaue === node?.data?.l1_name &&
          selectedChannel.includes(node?.data?.channel)
        );
      } else if (
        planDetails?.l2_name?.length > 1 &&
        planDetails?.l1_name?.length > 1
      ) {
        return (
          levelTwoValue === node?.data?.l2_name &&
          levelOneVaue === node?.data?.l1_name
        );
      } else if (planDetails?.l2_name?.length > 1) {
        return levelTwoValue === node?.data?.l2_name;
      } else if (planDetails?.l1_name?.length > 1) {
        return levelOneVaue === node?.data?.l1_name;
      } else if (isChannelMultiple(planDetails) && type !== "NLE") {
        return selectedChannel.includes(node?.data?.channel);
      }
    }
  }
  return true;
};

export const scrollIntoView = (id) => {
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  }, 1000);
};

export const isColumnIdContainsChannel = (colId, planDetails) => {
  let currentChannel = "";
  planDetails.channel.forEach((chan) => {
    if (colId.includes(chan)) {
      currentChannel = chan;
    }
  });
  if (currentChannel) {
    return currentChannel;
  }
  return false;
};

export const getFilteredFooter = (allFooter, formData) => {
  let filteredFooter = [];
  if (!isEmpty(formData)) {
    allFooter.forEach((eachFooter) => {
      let isValidFooter = true;
      Object.keys(formData).forEach((key) => {
        if (formData[key] && key !== "channel_list_options") {
          if (Array.isArray(formData[key])) {
            //if user filtered multiple values (eg. channel)
            if (
              !Array.isArray(eachFooter[key]) &&
              !formData[key].includes(eachFooter[key])
            ) {
              //if footer channel is not array and footer channel is not present in selected filter
              isValidFooter = false;
            } else if (Array.isArray(eachFooter[key])) {
              let allChannelsPresent = true;
              formData[key].forEach((chan) => {
                if (!eachFooter[key].includes(chan)) {
                  allChannelsPresent = false;
                }
              });
              if (!allChannelsPresent) {
                isValidFooter = false;
              }
            }
          } else if (formData[key] !== eachFooter[key]) {
            isValidFooter = false;
          }
        }
      });
      if (isValidFooter) {
        filteredFooter.push(eachFooter);
      }
    });
    return filteredFooter;
  } else {
    return allFooter;
  }
};
