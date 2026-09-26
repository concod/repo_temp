import moment from "moment";
import { getFiltersValues } from "core/actions/filterAction";
import {
  cloneDeep,
  compact,
  findIndex,
  get,
  isArray,
  isEmpty,
  uniqBy,
} from "lodash";
import { filterHierarchyOptions } from "core/Utils/filter-accessible-data";
import {
  Dashboard,
  common,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  updateLyColumnHeading,
  returnInArrayFormat,
  formatStringArray,
  getFiltersRespArr,
  calculateNoOfWeeks,
  convertCompareYrToNum,
  attributeFormatter,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  getDashboardFilterLevels,
  getStoreDropdownValues,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { formattedDate } from "core/Utils/formatter";

const configureAttributeOptions = (options) => {
  return options.map((item) => {
    return {
      value: item.attribute,
      label: item.attribute,
      id: item.attribute,
    };
  });
};

export const getFiltersOptions = async (
  initialDependency,
  planFields,
  setisLoading,
  index
) => {
  let fields = [...planFields];
  setisLoading(true);
  const filterElements = fields.map(async (key, Idx) => {
    if (
      Dashboard.__Non_Hierarchy_Fields.indexOf(key.accessor) === -1 &&
      !key.accessor.includes("drop_") && !key.accessor.includes("launch_") &&
      Idx > index
    ) {
      if (
        key.accessor !== "year" &&
        key.accessor !== "season" &&
        key.accessor !== "channel" &&
        key.accessor !== "channels" &&
        key.accessor !== "sub_channel" &&
        key.accessor !== "cluster_plan_code" &&
        !key.accessor?.includes("assort_year_value") &&
        !key.accessor?.includes("assort_season_value") &&
        !key.accessor?.includes("assort_selling_period_value") &&
        !key.accessor?.includes("weightage") &&
        key.accessor !== "filters_applied"
      ) {
        let body = {
          attribute_name: key.accessor,
          filter_type: key.filter_type,
          filters: initialDependency,
        };
        const options = await getFiltersValues("product", body)();
        key.options = configureAttributeOptions(options.data.data.attribute);
      }
    }
    return key;
  });

  await Promise.all(filterElements);
  setisLoading(false);
  return fields;
};
export const getFilterDependency = (selectedOptions, planFields, index) => {
  if (selectedOptions) {
    let dependency = [];
    let isFilterEmpty = false;
    planFields.forEach((key, Idx) => {
      if (
        Dashboard.__Non_Hierarchy_Fields.indexOf(key.column_name) === -1 &&
        !key.column_name.includes("drop_") && !key.column_name.includes("launch_") &&
        selectedOptions[key.column_name] &&
        Idx <= index
      ) {
        if (isEmpty(selectedOptions[key.column_name])) {
          isFilterEmpty = true;
          return [];
        }
        dependency.push({
          attribute_name: key.column_name,
          operator: "in",
          values: returnInArrayFormat(selectedOptions[key.column_name]),
          filter_type: key.filter_type || key.type || "cascaded",
        });
      }
    });
    if (isFilterEmpty) {
      return [];
    }
    return dependency;
  } else {
    return [];
  }
};

// export const addDropFields = (count, filterFields) => {
//   if (count > 1) {
//     for (let i = 0; i < count; i++) {
//       filterFields.push({
//         label: `Drop ${i + 1}`,
//         field_type: "IntegerField",
//         required: true,
//         column_name: "drops",
//         accessor: `drop_${i + 1}`,
//         name: `drop_${i + 1}`,
//         attribute_type: "selling_period",
//         isDisabled: true,
//       });
//     }
//   }
//   return filterFields;
// };

export const generateFilterConfig = async (
  configData,
  type,
  userAccessList,
  isWedgeScreen,
  location,
  formElementsData,
  planDimAppCode = 2,
  planData
) => {
  let filterConfig = cloneDeep(configData);
  const filterElements = filterConfig.map(async (key, index) => {
    let item = {
      accessor: key.column_name,
      label: key.label,
      attribute_type: "create_plan",
      column_name: key.column_name,
      field_type: key.display_type,
      filter_type: key.type,
      isDisabled: key.is_disabled,
      required: key.is_mandatory,
      isMulti: key.is_multiple_selection,
      isClearable: key.is_clearable,
      disablePast: true,
      options: [],
      dimension: key.dimension,
    };
    if (
      (type === "copy" || isWedgeScreen) &&
      key.column_name !== "plan_name" &&
      key.column_name !== "cluster_name" &&
      type !== "graph_filters"
    ) {
      item.isDisabled = true;
    }
    if (
      key.column_name === "year_comparision_metric" ||
      item.accessor === "compare_year"
    ) {
      item.options = common.__compare_yr_constants.map((constant) => {
        return {
          label: constant,
          value: constant,
          isDisabled: type === "copy",
        };
      });
    }

    if (key.column_name === "reference_data") {
      item.options = common.__reference_data_constants.map((constant) => {
        return {
          label: constant,
          value: constant,
          isDisabled: type === "copy",
        };
      });
    }

    if (key.column_name === "reference_period") {
      item.options = common.__reference_period_constants.map((constant) => {
        return {
          label: constant,
          value: constant,
          isDisabled: type === "copy",
        };
      });
    }

    if (key.column_name === "seed_with") {
      item.options = common.__seed_with_constants.map((constant) => {
        return {
          label: constant,
          value: constant,
        };
      });
    }
    if (key.dimension === "product") {
      let dependency = [];
      if(type === "graph_filters"){
        //Default cascading options selection for graph hierarchy filters
        const hierarchy = ["l0_name", "l1_name", "l2_name", "l3_name"];
        const fIndex = hierarchy.findIndex((item)=>{
          return item === key.column_name;
        });
        const hierarchyFields = hierarchy.slice(0,fIndex);
        for(let i=0; i<hierarchyFields?.length; i++){
          dependency.push({
            attribute_name: hierarchy[i],
            operator: "in",
            values: returnInArrayFormat(planData[hierarchy[i]]),
            filter_type: "cascaded",
          });
        }
      }else{
        let selectedOptions = {};
        if (planData) {
          selectedOptions = {
            l0_name: planData.l0_name?.[0],
            l1_name: planData.l1_name?.[0],
            l2_name: planData.l2_name?.[0],
          };
        }
        dependency = getFilterDependency(
          selectedOptions,
          filterConfig,
          index
        );
      }
      let body = {
        attribute_name: key.column_name,
        filter_type: key.type || "cascaded",
        filters: dependency,
      };
      const options = await getFiltersValues("product", body)();
      let accessibleOptions = filterHierarchyOptions(
        options.data.data.attribute,
        key.accessor,
        userAccessList
      );
      item.options = configureAttributeOptions(accessibleOptions);
    }
    if (key.dimension === "plan") {
      const optionsResponse = await getTenantConfigApplicationLevel(
        planDimAppCode,
        {
          attribute_name:
            key.column_name === "compare_year_value"
              ? "assort_year_value"
              : key.column_name,
        }
      )();
      let attributes = optionsResponse?.data?.data[0]?.attribute_value?.value;
      if (key.column_name !== "assort_selling_period_value") {
        let options;
        if (location.includes("alldoor")) {
          const optionsArray = formatStringArray(attributes);
          if (optionsArray.length) {
            //Disable previous year
            const currYear = new Date().getFullYear();
            options = optionsArray.filter((item) => {
              return item.value >= currYear;
            });
          }
        } else {
          options = formatStringArray(attributes || []);
        }
        item.options = options;
      } else {
        item.enabledStartDays = attributes?.enable_start_days || "";
        item.enabledEndDays = attributes?.enable_end_days || "";
      }
    }
    if (key.dimension === "store") {
      let channelBody = {
        attribute_name: key.column_name,
        operator: "in",
        values: [],
        filter_type: key.type,
      };
      let channelOptions = await getStoreDropdownValues(channelBody)();
      item.options = configureAttributeOptions(
        get(channelOptions, "data.data.attribute", [])
      );
    }
    return item;
  });
  let filterFields = await Promise.all(filterElements);
  return filterFields;
};

export const configurePlanHierarchyLevels = async (screenName) => {
  let planLvlsResp = await getDashboardFilterLevels(screenName)();
  const filterElements = planLvlsResp.data.data.map(async (key) => {
    key.accessor = key.column_name;
    if (key.display_type === "dropdown") {
      let filterBody = {
        attribute_name: key.column_name,
        filter_type: key.type,
        filters: [],
      };
      let isProduct = key.dimension === "product";

      //After fetching the levels, for each hierarchy level, fetch the values under the level
      const options = await (isProduct
        ? getFiltersValues("product", filterBody)()
        : null); //For now else condition is null because we don't have filters other than hierarchy
      key.filter_keyword = key.column_name;
      key.filter_type = key.type;
      key.field_type = key.display_type;
      //map the fetched options to initial data key if options are not null
      if (options != null) {
        key.initialData = configureAttributeOptions(
          options.data.data.attribute
        );
        key.options = configureAttributeOptions(options.data.data.attribute);
      }
      key.required = key.is_mandatory;
      key.isMulti = key.hasOwnProperty("is_multiple_selection")
        ? key.is_multiple_selection
        : key.isMulti;
    }else if(key.display_type === "rangePicker"){
      key.filter_keyword = "range-picker";
      key.field_type = "rangePicker";
    }
    return key;
  });
  await Promise.all(filterElements);
  return planLvlsResp.data.data;
};

export const filtersPayload = (filterValues, filterDependency) => {
  let isValid = true;
  const reqBody = filterValues.map((filter) => {
    let value = filterDependency[filter.column_name];
    if (filter.field_type === "rangePicker" && value.length) {
      isValid = !(Boolean(value[0]) ^ Boolean(value[1]));
      value =
        Boolean(value[0]) & Boolean(value[1])
          ? [
            moment(value[0]).format("YYYY-MM-DD"),
            moment(value[1]).format("YYYY-MM-DD"),
          ]
          : [];
    }
    return {
      filter_type: filter.type,
      attribute_name: filter.column_name,
      operator: "in",
      dimension: "Product",
      values: value ? [value].flat() : [],
    };
  });
  return { reqBody: reqBody, isValid: isValid };
};

export const planDefaultValues = (planDetails, fields, dropKey) => {
  let selectedObj = {};
  fields.forEach((field) => {
    switch (field.accessor) {
      case "assort_drop_value":
        selectedObj[field.accessor] =
          planDetails?.[`${dropKey || "drops"}_count`] || 1;
        break;
      case "plan_name":
        selectedObj[field.accessor] = planDetails["name"];
        break;
      case "cluster_name":
        selectedObj[field.accessor] = planDetails["name"];
        break;
      case "year_comparision_metric":
        selectedObj[field.accessor] = updateLyColumnHeading(
          planDetails["compare_year"]
        );
        break;
      case "completion_deadline":
        selectedObj[field.accessor] = moment(
          planDetails["deadline_date"],
          "YYYY-MM-DD"
        );
        break;
      case "sub_channel":
        if(planDetails[field.accessor]){
          selectedObj[field.accessor] = planDetails[field.accessor];
          break;
        }
        selectedObj[field.accessor] = planDetails["channel"];
        break;
      default:
        if (
          field.field_type === "dropdown" &&
          field.isMulti === false &&
          Array.isArray(planDetails[field.accessor])
        ) {
          selectedObj[field.accessor] = planDetails[field.accessor][0];
          break;
        }
        selectedObj[field.accessor] = planDetails[field.accessor];
        break;
    }
    if (field.accessor.includes("assort_selling_period_value")) {
      if (planDetails?.selling_period?.length) {
        let splitIndex = field.accessor.split("assort_selling_period_value")?.[1]
        planDetails?.selling_period.map((period, index) => {
          index = index ? `${index}` : ""
          if (index === splitIndex) {
            selectedObj[field.accessor] = [
              moment(period.start_date, "YYYY-MM-DD"),
              moment(period.end_date, "YYYY-MM-DD"),
            ]
          }
        })
      } else {
        selectedObj[field.accessor] = [
          moment(planDetails["selling_period_sdate"], "YYYY-MM-DD"),
          moment(planDetails["selling_period_edate"], "YYYY-MM-DD"),
        ]
      }
    }
    if (field.accessor.includes("assort_season_value")) {
      if (planDetails?.selling_period?.length) {
        let splitIndex = field.accessor.split("assort_season_value")?.[1]
        planDetails?.selling_period.map((period, index) => {
          index = index ? `${index}` : ""
          if (index === splitIndex) {
            selectedObj[field.accessor] = period.season_id;
            selectedObj[`assort_season_name${index}`] = period.season;
          }
        })
      } else { selectedObj[field.accessor] = planDetails?.season_id; }
    }
    if (field.accessor.includes("assort_year_value")) {
      //to get year from selling period value
      if (planDetails?.selling_period?.length) {
        let splitIndex = field.accessor.split("assort_year_value")?.[1]
        planDetails?.selling_period.map((period, index) => {
          index = index ? `${index}` : ""
          if (index === splitIndex) {
            selectedObj[field.accessor] = period.year
          }
        })
      } else { selectedObj[field.accessor] = planDetails?.year; }
    }
    if (field.accessor.includes("weightage")) {
      //to get weightage from selling period value
      if (planDetails?.selling_period?.length) {
        let splitIndex = field.accessor.split("weightage")?.[1]
        planDetails?.selling_period.map((period, index) => {
          index = index ? `${index}` : ""
          if (index === splitIndex) {
            selectedObj[field.accessor] = period.weightage
          }
        })
      } else { selectedObj[field.accessor] = planDetails?.weightage; }
    }

  });
  return selectedObj;
};

export const onDropsChange = (
  count,
  planFields,
  selectedAttrData,
  screenConfiguration
) => {
  /**
   * onDropsChange method is used to either add N drops or remove drops
   *
   */
  let updatedPlanFields = [...planFields];
  let updatedSelectedData = { ...selectedAttrData };

  //This variable gives the previous count before the change in dropdown value i.e no of drops
  let earlierCount = updatedPlanFields.filter((planfield) => {
    return (
      planfield.accessor.includes(
        `${screenConfiguration?.common?.drop_key || "drop"}_`
      ) && !planfield.accessor.includes("assort_drop_")
    );
  }).length;

  //If the current count is either 0 or 1
  //Remove the drops keys from the selection attributes
  if (!count || count === 1) {
    const deletedKeys = updatedPlanFields.filter((planfield) => {
      return (
        planfield.accessor.includes(
          `${screenConfiguration?.common?.drop_key || "drop"}_`
        ) && !planfield.accessor.includes("assort_drop_")
      );
    });

    //removed the key using delete command
    deletedKeys.forEach((key) => delete updatedSelectedData[key.accessor]);
    updatedPlanFields = updatedPlanFields.filter((planfield) => {
      return (
        !planfield.accessor.includes(
          `${screenConfiguration?.common?.drop_key || "drop"}_`
        ) || planfield.accessor.includes("assort_drop_")
      );
    });
  }
  if (count === earlierCount) {
    //If ealier count is same as current count, keep the drops as it is
    return [updatedSelectedData, updatedPlanFields];
  }

  //If count is greater, then add extra drops
  if (count > 1 && count > earlierCount) {
    let i = earlierCount > 0 ? earlierCount : 0;
    for (; i < count; i++) {
      updatedPlanFields.push({
        label:
          attributeFormatter(
            `${screenConfiguration?.common?.drop_key || "drop"}`
          ) + ` ${i + 1}`,
        field_type: "IntegerField",
        required: true,
        column_name: screenConfiguration?.common?.drop_key || "drops",
        accessor: `${screenConfiguration?.common?.drop_key || "drop"}_${i + 1}`,
        name: `${screenConfiguration?.common?.drop_key || "drop"}_${i + 1}`,
        attribute_type: "create_plan",
      });
    }
  }
  //This expression will remove extra drops if the new count is less than previous count
  updatedPlanFields = updatedPlanFields.filter((planfield) => {
    if (
      planfield.accessor.includes(
        `${screenConfiguration?.common?.drop_key || "drop"}_`
      ) &&
      !planfield.accessor.includes("assort_drop_")
    ) {
      const accessor = planfield.accessor;
      const splt_Arr = accessor.split("_");
      const drop_val = parseInt(splt_Arr[1]);
      if (drop_val > count || (drop_val === 1 && count === "1")) {
        delete updatedSelectedData[accessor];
        return false;
      }
    }
    return true;
  });
  updatedSelectedData["assort_drop_value"] = count;
  return [updatedSelectedData, updatedPlanFields];
};

export const extractDropsArr = (selectedAttrData, dropKey, type = "create") => {
  const arr = [];
  const Ndrops =
    type === "create"
      ? selectedAttrData["assort_drop_value"]
      : planDefaultValues(
        selectedAttrData,
        [{ accessor: "assort_drop_value" }],
        dropKey
      )["assort_drop_value"];
  for (let i = 1; i <= Ndrops; i++) {
    arr.push(
      type === "create"
        ? parseInt(selectedAttrData[`${dropKey || "drop"}_${i}`])
        : parseInt(selectedAttrData[`${dropKey || "drops"}_${i}`])
    );
  }
  return arr;
};

export const addAttributeValueBasedOnKey = (table) => {
  for (const key in table) {
    if (key === "attribute_value") {
      let convertStringResponseToObj = JSON.parse(table["attribute_value"]);

      let tempObj = {};
      for (const innerKey in convertStringResponseToObj) {
        tempObj[innerKey] =
          (convertStringResponseToObj[innerKey] * 100).toString() + "%";
        table[innerKey] = tempObj[innerKey];
      }
      table[key] = tempObj;
    }
  }

  return table;
};

export const getExcelHeaderForClusterRollup = (colData, rowData) => {
  let header = [];
  let tempData = cloneDeep(colData);
  tempData.forEach((item) => {
    header.push({ label: item.label, key: item.column_name });
  });
  if (rowData?.length) {
    if (rowData?.[0]?.attribute_value) {
      let item = rowData?.[0];
      for (const innerKey in item.attribute_value) {
        header.push({
          label: innerKey,
          key: innerKey,
        });
      }
    }
  }
  return header;
};

export const getExcelDataForClusterRollup = (data) => {
  let dataClone = cloneDeep(data);
  //Regex which takes alphabets
  var letters = /[a-zA-Z]/g;
  dataClone.forEach((item) => {
    Object.keys(item).forEach((key) => {
      item[key] = item[key]?.length
        ? item[key].toString().match(letters) //checking whether alphabet is there
          ? item[key]
          : // Add percentage symbol and multiply by 100 in case column type is %
          key.includes("%")
            ? parseFloat(item[key] * 100)?.toFixed(2) + "%"
            : // Add percentage symbol for attribute values
            item[key].includes("%")
              ? parseFloat(item[key].split("%")?.[0])?.toFixed(2) + "%"
              : parseFloat(item[key])?.toFixed(key === "sales_retail$" ? 0 : 2)
        : 0;
      return key;
    });
    return item;
  });
  return dataClone;
};

export const removeL2NameFromPlanAttributes = (planFilterConfig) => {
  return planFilterConfig.filter((field) => field.accessor !== "l2_name");
};

export const getSelectedL2NameArray = (options) => {
  let l2_name = [];
  options.map((field) => {
    if (field.accessor === "l2_name") {
      field.options.map((option) => {
        l2_name.push(option.value);
        return option;
      });
    }
    return field;
  });
  return l2_name;
};

/**
 * @function
 * @description Fetches all the multiple heirarhcy level dropdown options and selected value
 */
export const configureLevels = (
  planData,
  levelsJson,
  tableData,
  configureWithoutPlanData,
  filterSelected
) => {
  const levels = {
    options: {},
    selectedValue: {},
  };
  Object.keys(levelsJson).forEach((levelKey) => {
    if (planData?.[levelKey]?.length > 1 || configureWithoutPlanData) {
      let levelOptions;
      let selectedValue = cloneDeep(levels.selectedValue);
      let selectedLevelKey = Object.keys(selectedValue);
      let levelValues = uniqBy(tableData, levelKey);
      // Initially setting levelOption for the first multiple heirarchy
      if (isEmpty(selectedValue)) {
        levelOptions = levelValues?.map((item) => {
          return {
            label: item[levelKey],
            value: item[levelKey],
            id: item[levelKey],
          };
        });
      } else if (selectedLevelKey?.length) {
        // Based on the previous heirarchy selected value, getting options for the next heirarchy
        const filterLevel = configureWithoutPlanData
          ? selectedLevelKey?.[selectedLevelKey.length - 1]
          : selectedLevelKey?.[0];
        levelOptions = levelValues?.map((item) => {
          if (item[filterLevel] === selectedValue[filterLevel]?.value) {
            return {
              label: item[levelKey],
              value: item[levelKey],
              id: item[levelKey],
            };
          }
          return "";
        });
        levelOptions = compact(levelOptions);
      }
      levels.options[levelKey] = levelOptions || [];
      levels.selectedValue[levelKey] = levelOptions?.[0] || {};
    }
  });
  return levels;
};

export const configureCascading = (
  changedKey,
  data,
  option,
  filtersLevels,
  filterSelected,
  filterValues,
  setFilterOptions,
  setFilterSelected,
  props
) => {
  //cascading implementation of filters for l0, l1, l2 levels
  const levelsJsonKeys = Object.keys(props.levelsJson);
  const keyIndex = levelsJsonKeys.indexOf(changedKey);
  const cascadingLevels = Object.keys(props.levelsJson).slice(keyIndex + 1);
  let levelsOptions = cloneDeep(filtersLevels.current);
  let levelsSelected = { ...filterSelected };
  let currentLevelOptions = data?.filter((item) => {
    return item[changedKey] === option?.label;
  });
  levelsSelected[changedKey] = option;
  cascadingLevels.forEach((level) => {
    if (level !== "l3_name") {
      //cascading implementation of filters for l0, l1, l2 levels
      const prevLevelIndex = levelsJsonKeys?.indexOf(level) - 1;
      const prevLevel = levelsJsonKeys?.[prevLevelIndex];
      if (!isEmpty(levelsSelected[prevLevel]) && changedKey !== prevLevel) {
        currentLevelOptions = currentLevelOptions?.filter((item) => {
          return item[prevLevel] === levelsSelected[prevLevel]?.label;
        });
      }
      let levelValues = uniqBy(currentLevelOptions, level);
      levelsOptions[level] = levelValues?.map((item) => {
        return {
          label: item[level],
          value: item[level],
          id: item[level],
        };
      });
      levelsSelected[level] = levelsOptions[level][0];
      filterValues.current[level] = levelsOptions[level][0]?.label;
    }
  });
  setFilterOptions(levelsOptions);
  setFilterSelected(levelsSelected);
};

export const isValidDate = (dateString) => {
  //regex to check valid date format
  var regEx = /^\d{2}-\d{2}-\d{4}$/;
  if (!regEx.test(dateString)) return false; // Invalid format
  return true;
};

export const handleComparePlanValidation = (
  selectedPlans,
  displaySnackMessages,
  allEqual
) => {
  let isValid = true;
  const level0Data = [],
    level1Data = [],
    level2Data = [],
    sellingPeriodStartDate = [],
    sellingPeriodEndDate = [],
    dropPlanCode = [],
    planCode = [];
  selectedPlans?.forEach((item) => {
    level0Data.push(item?.l0_name?.toString());
    level1Data.push(item?.l1_name?.toString());
    level2Data.push(item?.l2_name?.toString());
    sellingPeriodStartDate.push(item?.selling_period_sdate);
    sellingPeriodEndDate.push(item?.selling_period_edate);
    if (item?.drops_1 || item?.drops_2) {
      dropPlanCode.push(item?.plan_code);
    } else {
      planCode.push(item?.plan_code);
    }
  });
  const planStepData = selectedPlans.filter((items) => {
    return items.plan_step === 3;
  });
  const validObj = {};
  if (selectedPlans?.length >= 2 && selectedPlans?.length <= 5) {
    if (planStepData && planStepData.length === 0) {
      displaySnackMessages("Only completed plans must be selected", "error");
      isValid = false;
    } else if (!allEqual(level0Data)) {
      displaySnackMessages("Level1 values must be the same", "error");
      isValid = false;
    } else if (!allEqual(level1Data)) {
      displaySnackMessages("Level2 values must be the same", "error");
      isValid = false;
    } else if (!allEqual(level2Data)) {
      displaySnackMessages("Level3 values must be the same", "error");
      isValid = false;
    } else if (
      !allEqual(sellingPeriodStartDate) &&
      !allEqual(sellingPeriodEndDate)
    ) {
      displaySnackMessages("Selling period must be the same", "error");
      isValid = false;
    } else {
      validObj["drop_plancode"] = dropPlanCode;
      validObj["plan_code"] = planCode;
    }
  } else {
    displaySnackMessages(
      "Maximum of 5 & minimum of 2 plans can be selected",
      "error"
    );
    isValid = false;
  }
  validObj.isValid = isValid;
  return validObj;
};

export const handleDownloadValidation = (
  completedPlansList,
  displaySnackMessages,
  seasonValues,
  allEqual,
  props
) => {
  let isValidPlan = true;
  if (completedPlansList.length > 1) {
    const plansData = props.selectedPlans;
    const concatenatedPlansData = [],
      seasonData = [];
    const selectedPlans =
      plansData &&
      plansData.map((items) => {
        return {
          level1Data: items.l0_name.toString(),
          level2Data: items.l1_name.toString(),
          level3Data: items.l2_name.toString(),
          channelData: items.channel.toString(),
        };
      });
    selectedPlans.forEach((item) => {
      concatenatedPlansData.push(JSON.stringify(item));
    });
    const uniquePlansSet = new Set(concatenatedPlansData);
    props.selectedPlans.forEach((data) => {
      seasonData.push(seasonValues[data.plan_code]);
    });
    if (!allEqual(seasonData)) {
      displaySnackMessages("Please select plans from the same season", "error");
      isValidPlan = false;
      props.setDashboardLoader(false);
      return;
    }
    if (concatenatedPlansData.length !== uniquePlansSet.size) {
      displaySnackMessages(
        "Hierarchy values for the selected plans must be unique",
        "error"
      );
      isValidPlan = false;
      props.setDashboardLoader(false);
      return;
    }
  } else {
    isValidPlan = false;
  }
  return isValidPlan;
};

export const configureFetchPlansPayload = (manualbody, mfpFilters, props) => {
  const payload = getFiltersRespArr(Dashboard.__plan_levels);
  let filters = [];
  if (
    props.location?.includes("MFP-dashboard") ||
    props.location.includes("master-plan-dashboard")
  ) {
    if (props.filterRef?.current?.length) {
      props.filterRef?.current?.forEach((item) => {
        if (item.values?.length) {
          let filterObj = {
            attribute_name:
              item.attribute_name === "channel" &&
                props.location?.includes("MFP-dashboard")
                ? "store_type"
                : item.attribute_name,
            value: item.values,
            operator: item.operator,
          };
          if (props.location?.includes("master-plan-dashboard")) {
            filterObj["prefix"] = "levels";
          }
          filters.push(filterObj);
        }
      });
      mfpFilters.current = filters;
    }
  } else {
    filters =
      props.filterRef?.current?.length > 0
        ? props.filterRef.current
        : props.selectedFilters.length === 0
          ? getFiltersRespArr(Dashboard.__plan_levels)
          : payload;
  }
  if (
    !(
      props?.location.includes("cluster-smart") ||
      props?.location.includes("cluster-dashboard") ||
      props.location.includes("MFP-dashboard") ||
      props.location.includes("master-plan-dashboard")
    )
  ) {
    filters.push({
      attribute_name: "season",
      operator: "in",
      filter_type: "non-cascaded",
      values: [],
    });
    if (props.screenConfiguration?.dashboard?.show_sub_channel) {
      filters.push({
        attribute_name: "sub_channel",
        operator: "in",
        filter_type: "non-cascaded",
        values: [],
      });
    }
  }
  const reqBody = {
    filters: filters,
    status: 0,
    meta: {
      sort: manualbody.sort,
      search: manualbody.search,
      range: manualbody.range,
    },
  };
  let isValid = true;
  if (reqBody.meta.sort?.length) {
    //change column name of Selling Period & plan Step accordimg to backend format
    reqBody.meta.sort.forEach((item) => {
      if (item["column"] === "selling_period") {
        item["column"] = "selling_period_sdate";
      } else if (item["column"] === "plan_step_desc") {
        item["column"] = "plan_step";
      }
    });
  }
  let searchArray = [];
  if (reqBody.meta.search?.length) {
    reqBody.meta.search.forEach((item, index) => {
      if (
        item["column"] === "updated_at" ||
        item["column"] === "selling_period" ||
        item["column"] === "created_at"
      ) {
        isValid = isValidDate(item.pattern);
        if (item["column"] === "selling_period") {
          item["column"] = "selling_period_sdate";
        }
        if (isValid) {
          item.pattern = formattedDate(item.pattern, "YYYY-MM-DD");
          searchArray.push(item);
        }
      } else {
        searchArray.push(item);
      }
    });
  }
  reqBody.meta.search = searchArray;
  if (props?.location.includes("omnichannel")) {
    reqBody["is_omnichannel"] = true;
  } else if (
    props?.location.includes("MFP-dashboard") ||
    props?.location.includes("master-plan-dashboard")
  ) {
    reqBody["filters"] = props.filterRef?.current?.length ? filters : [];
  } else {
    reqBody["is_hindsight"] = false;
  }
  return reqBody;
};

export const configureParams = (location, props) => {
  let param = "";
  if (location.includes("omnichannel") || props.isWedgeScreen) {
    param = "assort create plan - omnichannel";
  } else if (
    location.includes("alldoorchoiceconfiguration") ||
    location.includes("alldoorstyleconfiguration")
  ) {
    param = "Assort create core choice";
  } else if (
    location.includes("cluster-dashboard") ||
    location.includes("cluster-smart")
  ) {
    param = "cluster plan create";
  } else {
    param = "assort create plan";
  }
  return param;
};

export const handleSeasonValueChange = async (
  updatedCreateOrCopySelectionData,
  id,
  location,
  setnoOfWeeks,
  setplanFilterConfigSelection,
  setDefaultValues,
  props
) => {
  let sesasonResponse;
  // Check if assort_season_value has multiple rows
  let index = !id.split("assort_season_value")?.[1]
    ? ""
    : id.split("assort_season_value")?.[1];
  if (updatedCreateOrCopySelectionData[id]) {
    sesasonResponse = await props.getSeasonOptions({
      filters: [
        {
          attribute_name: "incremental_id",
          value: [updatedCreateOrCopySelectionData[id]],
          prefix: "attribute_value",
          operator: "=",
        },
      ],
    });
  } else {
    let formValues = cloneDeep(updatedCreateOrCopySelectionData);
    formValues[`assort_season_value${index}`] = "";
    formValues[`assort_selling_period_value${index}`][0] = null;
    formValues[`assort_selling_period_value${index}`][1] = null;
    setnoOfWeeks(-1);
    setplanFilterConfigSelection(formValues);
    setDefaultValues(formValues);
  }
  if (sesasonResponse?.data?.status) {
    let formValues = cloneDeep(updatedCreateOrCopySelectionData);
    formValues[`assort_selling_period_value${index}`][0] = moment(
      sesasonResponse?.data?.data?.[0]?.season_start_date,
      "YYYY-MM-DD"
    );
    formValues[`assort_selling_period_value${index}`][1] = moment(
      sesasonResponse?.data?.data?.[0]?.season_end_date,
      "YYYY-MM-DD"
    );
    const weeksCount = calculateNoOfWeeks(
      formValues[`assort_selling_period_value${index}`][0],
      formValues[`assort_selling_period_value${index}`][1]
    );
    setnoOfWeeks(weeksCount);
    setplanFilterConfigSelection(formValues);
    setDefaultValues(formValues);
  }
  if (
    !location.includes("omnichannel") &&
    !location.includes("alldoor") &&
    !location.includes("cluster-smart") &&
    !location.includes("cluster-dashboard")
  ) {
    let prevSesasonResponse = await props.getSeasonOptions({
      filters: [
        {
          attribute_name: "incremental_id",
          value: [updatedCreateOrCopySelectionData[id] - 1],
          prefix: "attribute_value",
          operator: "=",
        },
      ],
    });
    if (prevSesasonResponse?.data?.status) {
      const payload = {
        filters: [
          {
            attribute_name: "steps",
            value: common.__Finalize_Steps,
            operator: "in",
          },
          {
            attribute_name: "season",
            value: [prevSesasonResponse?.data?.data?.[0]?.name],
            operator: "in",
            filter_type: "non-cascaded",
          },
        ],
      };
      for (const key in updatedCreateOrCopySelectionData) {
        if (key === "l0_name" || key === "l1_name") {
          if (updatedCreateOrCopySelectionData[key]) {
            payload.filters.push({
              attribute_name: key,
              value: Array.isArray(updatedCreateOrCopySelectionData[key])
                ? updatedCreateOrCopySelectionData[key]
                : [updatedCreateOrCopySelectionData[key]],
              operator: "in",
              filter_type: "cascaded",
            });
          }
        }
      }
    }
  }
};

export const handleYearValueChange = async (
  updatedCreateOrCopySelectionData,
  id,
  updatedPlanFilterConfig,
  location,
  planFilterConfig,
  props
) => {
  let seasonResponse = await props.getSeasonOptions({
    filters: [
      {
        attribute_name: "year",
        value: [updatedCreateOrCopySelectionData[id]],
        operator: "=",
      },
    ],
  });
  if (seasonResponse?.data?.status) {
    updatedPlanFilterConfig.forEach((item) => {
      // Check if assort_year_value has multiple rows
      let index = !id.split("assort_year_value")?.[1]
        ? ""
        : id.split("assort_year_value")?.[1];
      if (item.accessor === `assort_season_value${index}`) {
        let seasonOptions = [];
        seasonResponse?.data?.data.forEach((opt) => {
          let seasonDate = new Date(opt.season_start_date);
          let currentDate = new Date();
          if (seasonDate < currentDate) {
            seasonOptions.push({
              label: opt.name,
              value: opt.attribute_value.incremental_id,
              id: opt.attribute_value.incremental_id,
            });
          } else if (
            !location.includes("cluster-smart") &&
            !location.includes("cluster-dashboard")
          ) {
            seasonOptions.push({
              label: opt.name,
              value: opt.attribute_value.incremental_id,
              id: opt.attribute_value.incremental_id,
            });
          }
        });
        item.options = seasonOptions;
      }
    });
  }
  return updatedPlanFilterConfig;
};

export const handleBOPPlansData = async (
  updatedCreateOrCopySelectionData,
  updatedPlanFilterConfig,
  location,
  planFilterConfig,
  props
) => {
  if (
    !location.includes("omnichannel") &&
    !location.includes("alldoor") &&
    !location.includes("cluster-smart") &&
    !location.includes("cluster-dashboard")
  ) {
    if (
      updatedCreateOrCopySelectionData["assort_season_value"] &&
      updatedCreateOrCopySelectionData["assort_season_value"] !== ""
    ) {
      const filters = [];
      const prevSesasonResponse = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "incremental_id",
            value: [
              updatedCreateOrCopySelectionData["assort_season_value"] - 1,
            ],
            prefix: "attribute_value",
            operator: "=",
          },
        ],
      });
      if (prevSesasonResponse?.data?.status) {
        filters.push({
          attribute_name: "season",
          value: [prevSesasonResponse?.data?.data?.[0]?.name],
          operator: "in",
          filter_type: "non-cascaded",
        });
      }
      for (const key in updatedCreateOrCopySelectionData) {
        if (key === "l0_name" || key === "l1_name") {
          if (
            updatedCreateOrCopySelectionData[key] &&
            updatedCreateOrCopySelectionData[key] !== ""
          ) {
            filters.push({
              attribute_name: key,
              value: Array.isArray(updatedCreateOrCopySelectionData[key])
                ? updatedCreateOrCopySelectionData[key]
                : [updatedCreateOrCopySelectionData[key]],
              operator: "in",
              filter_type: "cascaded",
            });
          }
        }
      }
      filters.push({
        attribute_name: "steps",
        value: common.__Finalize_Steps,
        operator: "in",
      });
      const payload = {
        filters: filters,
      };
      let bopResponse = await props.getBopTagData(payload);
      if (bopResponse?.data?.status) {
        let options = bopResponse?.data?.data?.data.map((item) => {
          return {
            label: item.name,
            value: item.plan_code,
            id: item.plan_code,
          };
        });
        let bopIndex = findIndex(
          planFilterConfig,
          (item) => item.column_name === "bop_tag_plan_code"
        );
        updatedPlanFilterConfig[bopIndex].options = options;
      }
    }
  }
  return updatedPlanFilterConfig;
};

export const handleLevelsChange = async (
  updatedCreateOrCopySelectionData,
  id,
  updatedPlanFilterConfig,
  location,
  planFilterConfig,
  createCoreChoiceLevels,
  hide_l2_name,
  setplanFilterConfigSelection,
  planFilterConfigWithL2Name,
  setcreateOrCopyModal_loader,
  channelOptions,
  subChannelOptions,
  props
) => {
  let levelsInfo = cloneDeep(props.levels);
  if (location.includes("alldoor")) {
    //price band, channel, choice count levels present only in core choice configuration, so need to add manually
    levelsInfo = levelsInfo.concat(createCoreChoiceLevels);
  }
  const selectedDeptLvlIndex = levelsInfo.findIndex((filter) => {
    return filter.column_name === id;
  });
  if (selectedDeptLvlIndex !== -1) {
    props.levels.forEach((filter, idx) => {
      if (
        hide_l2_name &&
        filter.column_name !== "l2_name" &&
        !location.includes("alldoor")
      ) {
        if (idx > selectedDeptLvlIndex) {
          if (
            !updatedCreateOrCopySelectionData[filter.column_name] &&
            updatedCreateOrCopySelectionData[id]
          ) {
            delete updatedCreateOrCopySelectionData[filter.column_name];
          }
        }
      } else {
        if (idx > selectedDeptLvlIndex) {
          if (
            !updatedCreateOrCopySelectionData[filter.column_name] &&
            updatedCreateOrCopySelectionData[id]
          ) {
            delete updatedCreateOrCopySelectionData[filter.column_name];
          }
        }
      }
    });
  }
  setplanFilterConfigSelection(updatedCreateOrCopySelectionData);
  const Idx = planFilterConfig.findIndex((filter) => {
    return filter.accessor === id;
  });
  let newdependency = getFilterDependency(
    updatedCreateOrCopySelectionData,
    planFilterConfig,
    Idx
  );
  if (hide_l2_name && !location.includes("alldoor")) {
    // Add l2_name field to generate filter options
    let l2_name_field = planFilterConfigWithL2Name.filter(
      (field) => field.accessor === "l2_name"
    );
    updatedPlanFilterConfig.push(l2_name_field[0]);
  }
  updatedPlanFilterConfig = await getFiltersOptions(
    newdependency,
    updatedPlanFilterConfig,
    setcreateOrCopyModal_loader,
    Idx
  );
  if (hide_l2_name && !location.includes("alldoor")) {
    // In case l2_name is hidden from fields, set all the l2_name options to planFilterConfigSelection
    let l2_name = getSelectedL2NameArray(updatedPlanFilterConfig);
    let formValues = cloneDeep(updatedCreateOrCopySelectionData);
    formValues["l2_name"] = l2_name;
    setplanFilterConfigSelection(formValues);
    updatedPlanFilterConfig = removeL2NameFromPlanAttributes(
      updatedPlanFilterConfig
    );
  }
  //To restore the channel options on change of planlevels
  if (location.includes("alldoor")) {
    updatedPlanFilterConfig.forEach((item) => {
      if (item.accessor === "channel") {
        item.options = channelOptions;
      } else if (item.accessor === "sub_channel") {
        item.options = subChannelOptions;
      }
    });
  }
  return updatedPlanFilterConfig;
};

export const handleChannelChange = async (
  updatedCreateOrCopySelectionData,
  id,
  updatedPlanFilterConfig,
  planFilterConfig,
  setplanFilterConfigSelection,
  setDefaultValues,
  setSubChannelOptions,
  appCode,
  props,
  location
) => {
  let formValues = cloneDeep(updatedCreateOrCopySelectionData);
  updatedPlanFilterConfig.forEach((item) => {
    if (item.accessor === "sub_channel") {
      if (updatedCreateOrCopySelectionData[id] !== "Wholesale") {
        item.options = [
          {
            label: updatedCreateOrCopySelectionData[id],
            value: updatedCreateOrCopySelectionData[id],
            id: updatedCreateOrCopySelectionData[id],
          },
        ];
        setSubChannelOptions(item.options);
        formValues.sub_channel = updatedCreateOrCopySelectionData[id];
        setplanFilterConfigSelection(formValues);
        setDefaultValues(formValues);
      } else {
        item.options = common.__sub_channel_wholesale.map((opt) => {
          return {
            label: opt,
            value: opt,
            id: opt,
          };
        });
        setSubChannelOptions(item.options);
        formValues.sub_channel = item.options[0].value;
        setplanFilterConfigSelection(formValues);
        setDefaultValues(formValues);
      }
    }
  });
  //based on selected channel populating sub channel options
  let subChannelResponse = await props.getCombinedFiltersValues({
    application_code: appCode,
    attributes: [
      {
        attribute_name: "sub_channel",
        dimension: "store",
      },
    ],
    filter_type: "cascaded",
    filters: [
      {
        attribute_name: "channel",
        dimension: "store",
        filter_id: "channel",
        filter_type: "cascaded",
        operator: "in",
        values: Array.isArray(updatedCreateOrCopySelectionData[id])
          ? updatedCreateOrCopySelectionData[id]
          : [updatedCreateOrCopySelectionData[id]],
      },
    ],
  });
  if (subChannelResponse?.data?.status) {
    let subChannelList = subChannelResponse?.data?.data?.sub_channel || [];
    let options = subChannelList.map((item) => {
      return {
        label: item,
        value: item,
        id: item,
      };
    });
    let subChannelIndex = findIndex(
      planFilterConfig,
      (item) => item.column_name === "sub_channel"
    );
    if(updatedPlanFilterConfig?.[subChannelIndex]?.options){
      updatedPlanFilterConfig[subChannelIndex].options = options;
    }
    if (location?.includes("plan-dashboard") && !location.includes("alldoor")) {
      if (formValues.sub_channel) {
        updatedCreateOrCopySelectionData["sub_channel"] =
          formValues.sub_channel;
      }
      if (
        formValues.l0_name?.length &&
        formValues.channel?.length &&
        formValues.sub_channel?.length
      ) {
        let filtersArray = [
          {
            attribute_name: "l0_name",
            operator: "in",
            filter_type: "cascaded",
            values: [formValues["l0_name"]],
          },
          {
            filter_type: "non-cascaded",
            attribute_name: "steps",
            operator: "in",
            dimension: "Product",
            values: ["1.3"], //Fetch only cluster finalized cluster plans
          },
          {
            attribute_name: "channel",
            operator: "in",
            filter_type: "non-cascaded",
            values: Array.isArray(formValues["channel"])
              ? formValues["channel"]
              : [formValues["channel"]],
          },
          {
            attribute_name: "sub_channel",
            operator: "in",
            filter_type: "non-cascaded",
            values: Array.isArray(formValues["sub_channel"])
              ? formValues["sub_channel"]
              : [formValues["sub_channel"]],
          },
        ];
        let body = {
          filters: filtersArray,
          status: 0,
          meta: {},
        };
        let clusterPlanRes = await props.fetchClusterDashboardTableData(
          body,
          1,
          -1
        );
        let clusterOptions = clusterPlanRes?.data?.data.map((item) => {
          return {
            label: item.name,
            value: item.cluster_plan_code,
            id: item.cluster_plan_code,
          };
        });
        let clusterPlanFeildIndex = findIndex(
          planFilterConfig,
          (item) => item.column_name === "cluster_plan_code"
        );
        if (clusterPlanFeildIndex !== -1) {
          updatedPlanFilterConfig[
            clusterPlanFeildIndex
          ].options = clusterOptions;
        }
      }
    }
  }
  return updatedPlanFilterConfig;
};

export const getAttributeKeyValue = (key) => {
  return key.includes("year")
    ? "year"
    : key.includes("season")
      ? "season_id"
      : key.includes("choice_count")
        ? "all_door_cc"
        : key;
};

export const getAttributeValue = (key, filterSelectionData, seasonValue) => {
  if (key.includes("year")) {
    return filterSelectionData[key].toString();
  }
  if (key.includes("season")) {
    return seasonValue;
  }
  return filterSelectionData[key];
};

export const coreChoiceLoopFun = (
  coreChoiceObj,
  colsArray,
  index,
  levelsJson,
  levelsArray
) => {
  if (index + 1 < colsArray?.length) {
    coreChoiceObj.levels[colsArray[index]]?.forEach((obj) => {
      levelsJson[colsArray[index]] = obj;
      return coreChoiceLoopFun(
        coreChoiceObj,
        colsArray,
        index + 1,
        levelsJson,
        levelsArray
      );
    });
  } else {
    coreChoiceObj.levels[colsArray[index]]?.forEach((obj) => {
      let tempLevels = cloneDeep(levelsJson);
      tempLevels[colsArray[index]] = obj;
      levelsArray.push({ ...coreChoiceObj.levels, ...tempLevels });
    });
  }
  return levelsArray;
};

export const createAllDoorCcPayload = async (
  planFilterConfigSelection,
  coreChoicePlanLevels,
  multiSelectCol,
  props
) => {
  let seasonValue = planFilterConfigSelection["assort_season_value"];
  let currentSeasonResponse = await props.getSeasonOptions({
    filters: [
      {
        attribute_name: "incremental_id",
        value: [planFilterConfigSelection["assort_season_value"]],
        prefix: "attribute_value",
        operator: "=",
      },
    ],
  });
  if (currentSeasonResponse?.data?.status) {
    seasonValue = currentSeasonResponse?.data?.data?.[0]?.season_code;
  }
  let coreChoiceObj = {},
    filters = [],
    levels = {};
  for (const key in planFilterConfigSelection) {
    if (coreChoicePlanLevels.includes(key)) {
      if (key === "l5_name") {
        levels["l3_name"] = planFilterConfigSelection[key];
      } else {
        levels[key] = planFilterConfigSelection[key];
      }
      //sub_channel need not to be added in filters
      if (key === "l5_name") {
        filters.push({
          attribute_name: "l3_name",
          value: isArray(planFilterConfigSelection[key])
            ? planFilterConfigSelection[key]
            : [planFilterConfigSelection[key]],
          operator: "in",
          prefix: "levels",
        });
      } else if (key !== "sub_channel") {
        filters.push({
          attribute_name: key,
          value: isArray(planFilterConfigSelection[key])
            ? planFilterConfigSelection[key]
            : [planFilterConfigSelection[key]],
          operator: "in",
          prefix: "levels",
        });
      }
    } else {
      if (key === "assort_year_value" || key === "assort_season_value") {
        const attribute_name_key = getAttributeKeyValue(key);
        const attribute_value = getAttributeValue(
          key,
          planFilterConfigSelection,
          seasonValue
        );
        filters.push({
          attribute_name: attribute_name_key,
          value: [attribute_value],
          operator: "in",
        });
      }
    }
  }
  levels["sub_channel"] = levels["sub_channel"]
    ? levels["sub_channel"]
    : levels["channel"];
  coreChoiceObj["season_id"] = seasonValue;
  coreChoiceObj["year"] = planFilterConfigSelection[
    "assort_year_value"
  ].toString();
  coreChoiceObj["all_door_cc"] = planFilterConfigSelection["all_door_cc"];
  coreChoiceObj["levels"] = levels;
  coreChoiceObj["filters"] = filters;
  const core_choice_data = [];
  let levelsArray = coreChoiceLoopFun(coreChoiceObj, multiSelectCol, 0, {}, []);
  levelsArray.forEach((obj) => {
    core_choice_data.push({
      ...coreChoiceObj,
      levels: obj,
    });
  });
  const reqBody = {
    core_choice_data: core_choice_data,
  };
  return reqBody;
};

export const validatePlanPayload = (
  planFilterConfigSelection,
  clusterPlanData
) => {
  let filters = [
    {
      attribute_name: "l0_name",
      value: [planFilterConfigSelection?.l0_name],
      prefix: "levels",
      operator: "in",
    },
    {
      attribute_name: "l1_name",
      value: Array.isArray(planFilterConfigSelection?.l1_name)
        ? planFilterConfigSelection?.l1_name
        : [planFilterConfigSelection?.l1_name],
      prefix: "levels",
      operator: "in",
    },
    {
      attribute_name: "start_date",
      value: [
        planFilterConfigSelection["assort_selling_period_value"][0].format(
          "YYYY-MM-DD"
        ),
      ],
      operator: "in",
    },
    {
      attribute_name: "end_date",
      value: [
        planFilterConfigSelection["assort_selling_period_value"][1].format(
          "YYYY-MM-DD"
        ),
      ],
      operator: "in",
    },
    {
      attribute_name: "compare_type",
      operator: "in",
      value: [
        `${convertCompareYrToNum(
          planFilterConfigSelection["year_comparision_metric"]
        )}`,
      ],
    },
    {
      attribute_name: "store_type",
      operator: "in",
      value:
        Array.isArray(planFilterConfigSelection["channel"]) ||
          !planFilterConfigSelection["channel"]
          ? planFilterConfigSelection["channel"]
          : [planFilterConfigSelection["channel"]],
    },
  ];
  if (planFilterConfigSelection["sub_channel"]?.length) {
    filters.push({
      attribute_name: "sub_channel",
      operator: "in",
      value:
        Array.isArray(planFilterConfigSelection["sub_channel"]) ||
          !planFilterConfigSelection["sub_channel"]
          ? planFilterConfigSelection["sub_channel"]
          : [planFilterConfigSelection["sub_channel"]],
    });
  }
  return { filters: filters };
};

export const createPlanPayload = async (
  planFilterConfigSelection,
  drops,
  location,
  hide_l2_name,
  props
) => {
  const filters = [];
  let assort_selling_period_value;
  if (
    location.includes("cluster-smart") ||
    location.includes("cluster-dashboard")
  ) {
    Object.keys(planFilterConfigSelection).map((key) => {
      if (
        !assort_selling_period_value &&
        key.includes("assort_selling_period_value")
      ) {
        assort_selling_period_value = planFilterConfigSelection[key];
      }
    });
  } else {
    assort_selling_period_value =
      planFilterConfigSelection["assort_selling_period_value"];
  }
  for (const attr in planFilterConfigSelection) {
    if (
      Dashboard.__Non_Hierarchy_Fields.indexOf(attr) === -1 &&
      !attr.includes("drop_") &&
      !attr.includes("_options") &&
      !attr.includes("launch_")
    ) {
      // Avoid adding non heirarchy fields (assort_selling_period_value, assort_year_value,assort_season_value, weightage) inside filters
      let non_heirarchy_fields = attr.includes("assort_year_value")
        ? "assort_year_value"
        : attr.includes("assort_season_value")
          ? "assort_season_value"
          : attr.includes("assort_selling_period_value")
            ? "assort_selling_period_value"
            : attr.includes("weightage")
              ? "weightage"
              : attr;
      let index = !attr.split(non_heirarchy_fields)?.[1]
        ? null
        : attr.split(non_heirarchy_fields)?.[1];
      if (!index) {
        if (
          hide_l2_name &&
          attr === "l2_name" &&
          !location.includes("alldoor")
        ) {
          filters.push({
            name: "l2_name",
            value: planFilterConfigSelection["l2_name"],
          });
        } else {
          filters.push({
            name: attr,
            value:
              (location.includes("cluster-smart") && attr !== "l0_name") ||
                (location.includes("cluster-dashboard") && attr !== "l0_name") ||
                Array.isArray(planFilterConfigSelection[attr])
                ? planFilterConfigSelection[attr]
                : [planFilterConfigSelection[attr]],
          });
        }
      }
    }
  }
  let currentSeason = planFilterConfigSelection["assort_season_value"];
  let seasonCode = planFilterConfigSelection["assort_season_value"];
  if (!props.isWedgeScreen) {
    let assort_season_value;
    if (
      location.includes("cluster-smart") ||
      location.includes("cluster-dashboard")
    ) {
      Object.keys(planFilterConfigSelection).map((key) => {
        if (!assort_season_value && key.includes("assort_season_value")) {
          assort_season_value = planFilterConfigSelection[key];
        }
      });
    } else {
      assort_season_value = planFilterConfigSelection["assort_season_value"];
    }
    let currentSeasonResponse = await props.getSeasonOptions({
      filters: [
        {
          attribute_name: "incremental_id",
          value: [
            assort_season_value ||
            planFilterConfigSelection["assort_season_value"],
          ],
          prefix: "attribute_value",
          operator: "=",
        },
      ],
    });
    currentSeason = planFilterConfigSelection["assort_season_value"];
    if (currentSeasonResponse?.data?.status) {
      currentSeason = currentSeasonResponse?.data?.data?.[0]?.name;
      seasonCode = currentSeasonResponse?.data?.data?.[0]?.season_code;
    }
  } else {
    let currentSeasonResponse = await props.getSeasonOptions({
      filters: [
        {
          attribute_name: "season_code",
          value: [planFilterConfigSelection["assort_season_value"]],
          operator: "=",
        },
      ],
    });
    if (currentSeasonResponse?.data?.status) {
      currentSeason = currentSeasonResponse?.data?.data?.[0]?.name;
      seasonCode = currentSeasonResponse?.data?.data?.[0]?.season_code;
    }
  }
  const reqBody = {
    name:
      location.includes("cluster-smart") ||
        location.includes("cluster-dashboard")
        ? planFilterConfigSelection["cluster_name"]
        : planFilterConfigSelection["plan_name"],
    description: "",
    selling_period_sdate:
      location.includes("cluster-smart") ||
        location.includes("cluster-dashboard")
        ? assort_selling_period_value?.[0].format("YYYY-MM-DD")
        : planFilterConfigSelection["assort_selling_period_value"][0].format(
          "YYYY-MM-DD"
        ),
    selling_period_edate:
      location.includes("cluster-smart") ||
        location.includes("cluster-dashboard")
        ? assort_selling_period_value?.[1].format("YYYY-MM-DD")
        : planFilterConfigSelection["assort_selling_period_value"][1].format(
          "YYYY-MM-DD"
        ),
    compare_year:
      location.includes("cluster-smart") ||
        location.includes("cluster-dashboard")
        ? 0
        : planFilterConfigSelection["reference_period"] === "Compare Season"
          ? 0
          : convertCompareYrToNum(
            planFilterConfigSelection["year_comparision_metric"]
          ),
    filters: filters,
    deadline_date:
      planFilterConfigSelection["completion_deadline"] ||
      assort_selling_period_value?.[0].format("YYYY-MM-DD") ||
      planFilterConfigSelection["assort_selling_period_value"][0].format(
        "YYYY-MM-DD"
      ),
    steps: 1.1,
    season: currentSeason,
    season_id: seasonCode,
    channel:
      Array.isArray(planFilterConfigSelection["channel"]) ||
        !planFilterConfigSelection["channel"]
        ? planFilterConfigSelection["channel"]
        : [planFilterConfigSelection["channel"]],
    sub_channel: Array.isArray(planFilterConfigSelection["sub_channel"])
        ? planFilterConfigSelection["sub_channel"]
        : planFilterConfigSelection["sub_channel"]
        ? [planFilterConfigSelection["sub_channel"]]
        : Array.isArray(planFilterConfigSelection["channel"])
        ? planFilterConfigSelection["channel"]
        : [planFilterConfigSelection["channel"]],
    year: planFilterConfigSelection["assort_year_value"],
    [props.screenConfiguration?.common?.drop_key || "drops"]: drops,
    [props.screenConfiguration?.common?.flow_key || "flow"]: drops,
    cluster_plan_code: planFilterConfigSelection["cluster_plan_code"],
  };
  return reqBody;
};
