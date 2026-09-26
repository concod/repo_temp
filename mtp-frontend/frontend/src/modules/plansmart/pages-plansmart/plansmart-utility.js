import {
  CreatePlan,
  CREATE_PLAN_IN_SEASON,
  CREATE_PLAN_PRE_SEASON,
  IN_SEASON_STATUS_CODES,
  PLAN_SMART_APPLICATION_CODE,
  PLAN_SMART_FILTER_START_YEAR,
  plan_stage,
  PRE_SEASON_STATUS_CODES,
  statusValueBasedOnTabSelection,
} from "../constants-plansmart/stringConstants";
import get from "lodash/get";
import { getFiltersValues } from "../../../core/actions/filterAction";
import {
  getDropdownValues,
  getStoreDropdownValues,
} from "../services-plansmart/CreateNewPlan/create-new-plan-service";
import moment from "moment";
import { cloneDeep } from "lodash";
import { setInputFormatForColumn } from "./plansmart-budget-table/budget-table-functions";
import { getSeasonOptions } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { filterHierarchyOptions } from "core/Utils/filter-accessible-data";
import { formatStringArray } from "core/Utils/functions/utils";
import {
  PLAN_SMART_IN_SEASON_DASHBOARD,
  PLAN_SMART_PRE_SEASON_DASHBOARD,
} from "../constants-plansmart/routesConstants";
import { getValueFromAttributeMaster } from "../services-plansmart/Report/report-services";
import { attributeFormatter } from "core/Utils/utils";
import { DEFAULT_ROUNDOFF } from "../../../core/Utils/agGrid/constants";
import {
  percentFormatter,
  numbersWithComma,
  dollarFormatter,
  decimalsFormatter,
  arrayToCommaFormatter,
  formattedDate,
} from "../../../core/Utils/formatter";
import { fetchDefaultValue, getDateFormat } from "core/Utils/agGrid/table-functions";

/**
 * @function
 * @description Fetches all the plans ans product dropdown attributes.
 * @param {Object} elementsData
 * @param {Boolean} isFilter
 * @returns {Object}
 */
export const getAllDropdownValues = async (
  elementsData,
  isFilter = false,
  tenantFilterUamConfig,
  screenName
) => {
  const fields = [...elementsData];
  const filterElements = elementsData.map(async (key) => {
    key.accessor = key.column_name;
    if (key.display_type === "dropdown") {
      let body = {
        attribute_name: key.column_name,
        filter_type: key.type,
        filters: [],
        is_urm_filter: screenName && tenantFilterUamConfig ? true : false,
        screen_name: screenName,
        application_code: 4,
      };
      const seasonBody = {
        option: "ALL",
      };
      let isProduct = key.dimension === "product";
      let isStore = key.dimension === "store";
      const fetchStoreOptions = key.accessor !== "store";
      const isSeason = key.accessor === "season";

      const request = isStore
        ? fetchStoreOptions
          ? getStoreDropdownValues(body)()
          : []
        : isProduct
        ? getFiltersValues("product", body)()
        : isSeason
        ? getSeasonOptions(seasonBody)()
        : getDropdownValues(key.column_name)();

      const options = await request;
      const optionData = isStore
        ? fetchStoreOptions
          ? get(options, "data.data.attribute", [])
          : []
        : isSeason
        ? get(options, "data.data", [])
        : get(options, "data.data.attribute", []);
      key.options = isSeason
        ? getSeasonsForFilter(optionData)
        : configureAttributeOptions(optionData);
      key.field_type = key.display_type;
      key.filter_type = key.type;
      key.required = key.is_mandatory;
      key.isMulti = key.hasOwnProperty("is_multiple_selection")
        ? key.is_multiple_selection
        : key.isMulti;
    }
    if (key.display_type === "rangePicker") {
      let disableType = isFilter ? "default" : isFilter;
      key.field_type = key.display_type;
      key.disableType = disableType;
      key.autoSize = true;
    }
    key.isDisabled = key.is_disabled;
    return key;
  });
  await Promise.all(filterElements);
  return fields;
};

/**
 * @function
 * @description Get the updated Element with updated Filter Options
 * @param {Object} initialDependency
 * @param {Integer} index
 * @returns {Object}
 */
export const getFiltersOptions = async (
  elementsData,
  initialDependency,
  index,
  screenName,
  dimension,
  tenantFilterUamConfig
) => {
  let fields = [...elementsData];
  const filterElements = fields.map(async (key, Idx) => {
    if (
      (CreatePlan.__plan_levels.indexOf(key.accessor) > -1 ||
        CreatePlan.__store_levels.indexOf(key.accessor) > -1) &&
      Idx > index &&
      dimension === key.dimension
    ) {
      let body = {
        attribute_name: key.accessor,
        filter_type: key.filter_type,
        filters: initialDependency,
        is_urm_filter: screenName && tenantFilterUamConfig ? true : false,
        screen_name: screenName,
        application_code: 4,
      };
      const options =
        initialDependency.length > 0
          ? await getFiltersValues(dimension, body)()
          : [];
      key.options = configureAttributeOptions(
        options?.data?.data?.attribute || []
      );
    }
    return key;
  });
  await Promise.all(filterElements);
  return fields;
};

export const getStoreFilterOption = (id, formData, fields) => {
  const result = [];
  const storeLevelWithStore = [...CreatePlan.__store_levels, "store"];
  const storeLevelInx = storeLevelWithStore.indexOf(id);
  if (storeLevelInx > -1) {
    const slicedValue = storeLevelWithStore.slice(0, storeLevelInx);
    fields.forEach((data) => {
      if (slicedValue.indexOf(data.accessor) > -1 && formData[data.accessor]) {
        const obj = {
          attribute_name: data.accessor,
          operator: "in",
          values: [formData[data.accessor]],
          filter_type: data.filter_type,
        };
        if (data.accessor === "store_group") {
          data.options.forEach((option) => {
            if (option.value === formData[data.accessor]) {
              obj.values = [option.sg_code];
            }
          });
        }
        result.push(obj);
      }
    });
  }
  return result;
};

export const getStoreFilterOptionBody = (formData, field) => {
  const storeLevelKeys = [...CreatePlan.__store_levels, "store"].slice(
    1,
    CreatePlan.__store_levels.length + 1
  );
  const result = [];
  field.forEach((storeData) => {
    const filterOptions = getStoreFilterOption(
      storeData.accessor,
      formData,
      field
    );
    if (storeLevelKeys.indexOf(storeData.accessor) > -1) {
      const obj = {
        attribute_name: storeData.column_name,
        filter_type: storeData.type,
        filters: filterOptions,
      };
      if (storeData.accessor === "store_group") {
        storeData.options.forEach((option) => {
          if (option.value === formData[storeData.accessor]) {
            obj.sg_code = option.sg_code;
          }
        });
      }
      result.push(obj);
    }
  });
  return result;
};

export const updateDependencyFiltersOptions = async (
  formElementsData,
  newUpdatedData,
  id
) => {
  if (id === "store_group" && !newUpdatedData[id]) {
    return formElementsData;
  }
  const fields = [...formElementsData];
  const storeLevelInx = CreatePlan.__store_levels.indexOf(id);
  if (storeLevelInx > -1) {
    const regionInx = fields.findIndex((filter) => {
      return filter.accessor === "region";
    });
    const storeGroupInx = fields.findIndex((filter) => {
      return filter.accessor === "store_group";
    });
    const storeInx = fields.findIndex((filter) => {
      return filter.accessor === "store";
    });
    const [regionBody, storeGroupBody, storeBody] = getStoreFilterOptionBody(
      newUpdatedData,
      fields
    );
    let regionOptions = [];
    let storeGroupOptions = [];
    let storeOptions = [];
    switch (id) {
      case "channel":
        regionOptions = await getStoreDropdownValues(regionBody)();
        fields[regionInx].options = configureAttributeOptions(
          get(regionOptions, "data.data.attribute", [])
        );
        break;
      case "region":
        storeGroupOptions = await getStoreDropdownValues(storeGroupBody)();
        fields[storeGroupInx].options = configureAttributeOptions(
          get(storeGroupOptions, "data.data.attribute", [])
        );
        break;
      case "store_group":
        storeOptions = await getStoreDropdownValues(storeBody)();
        fields[storeInx].options = configureAttributeOptions(
          get(storeOptions, "data.data.attribute", [])
        );
        break;
      default:
        break;
    }
  }
  return fields;
};

/**
 * @function
 * @description Return All the updated dependent element values
 * @param {Object} selectedOptions
 * @param {Integer} index
 * @returns {Object}
 */
export const getFilterDependency = (
  elementsData,
  selectedOptions,
  index,
  dimension
) => {
  if (selectedOptions) {
    let dependency = [];
    elementsData.forEach((key, Idx) => {
      if (
        (CreatePlan.__plan_levels.indexOf(key.accessor) > -1 ||
          CreatePlan.__store_levels.indexOf(key.accessor) > -1) &&
        selectedOptions[key.accessor] &&
        Idx <= index &&
        dimension === key.dimension
      ) {
        let val = [selectedOptions[key.accessor]].flat();
        dependency.push({
          attribute_name: key.accessor,
          operator: "in",
          values: val,
          filter_type: key.filter_type,
          dimension: dimension,
        });
      }
    });
    return dependency;
  } else {
    return [];
  }
};

export const getSeasonsForFilter = (seasons) =>
  seasons.map((season) => ({
    ...season,
    value: season.name,
    label: season.name,
  }));

/**
 * @function
 * @description Return Dropdown Options in a specific format
 * @param {Object} options
 * @returns {Object}
 */
export const configureAttributeOptions = (options) => {
  return options.map((item) => {
    return {
      ...item,
      value: item.attribute,
      label: item.attribute,
      id: item.attribute,
    };
  });
};

/**
 * @function
 * @description Get Default values for the form.
 * @returns {Object}
 */
export const getDefaultValues = (elementsData, selectedData) => {
  let defaultValues = {};
  elementsData?.forEach((item) => {
    if (selectedData[item.accessor]) {
      defaultValues[item.accessor] = selectedData[item.accessor];
    } else {
      defaultValues[item.accessor] = "";
    }
  });
  return defaultValues;
};

/**
 * @function
 * @description Fetch Initial table data.
 */
export const fetchInitialPlans = async (planningScreenName, props) => {
  let initialFilterBody = CreatePlan.__plan_levels.map((planData) => {
    return {
      attribute_name: planData,
      operator: "in",
      filter_type: "cascaded",
      values: [],
    };
  });
  if (planningScreenName)
    initialFilterBody.push(getPlanningType(props?.path, props?.planType || 0));
  let body = {
    filters: initialFilterBody,
    meta: {
      range: [],
      sort: [],
      search: [],
    },
  };
  props.fetchPlansmartDashboardDataReq(body, props.planType);
};

/**
 * @function
 * @description Handle Data on every change of form Element
 * @param {String} formObjectName
 * @param {Object} formObjectValue
 */
export const dashboardFilterChange = async (
  updatedFormData,
  id,
  setFilterDependency,
  props,
  filterDependency,
  filterElements,
  setFilterElements,
  tenantFilterUamConfig
) => {
  props.setPlansmartFilterLoader(true);
  const newUpdatedData = { ...filterDependency, ...updatedFormData };
  const filterData = cloneDeep(filterElements);
  // Check if Id is present in the plan_levels
  if (CreatePlan.__plan_levels.indexOf(id) > -1) {
    // Retrieve array index where the update happened
    const filterIdx = filterData.findIndex((filter) => {
      return filter.column_name === id;
    });
    // Delete all depedency above the current updated array index
    filterData.forEach((filter, idx) => {
      if (idx > filterIdx) {
        delete newUpdatedData[filter.column_name];
      }
    });
    // Update the dependency to reset the Filter
    setFilterDependency(newUpdatedData);
    const Idx = filterData.findIndex((filter) => {
      return filter.accessor === id;
    });
    let newdependency = getFilterDependency(
      filterData,
      newUpdatedData,
      Idx,
      filterData[Idx]?.dimension
    );
    const dependencyWithValues = newdependency.filter((dependency) => {
      return dependency.values.length > 0;
    });
    // Fetch filter options witht the updated depedency.
    const options = getFiltersOptions(
      filterData,
      dependencyWithValues,
      Idx,
      false,
      filterData[Idx]?.dimension,
      tenantFilterUamConfig
    );
    options
      .then((data) => {
        setFilterElements(data);
        props.setPlansmartFilterLoader(false);
      })
      .catch((error) => {
        props.setPlansmartFilterLoader(false);
      });
  } else {
    setFilterDependency(newUpdatedData);
    props.setPlansmartFilterLoader(false);
  }
};

/**
 * @function
 * @description Reset Filter Elements on click of Reset Button
 */
export const onDashboardReset = (
  setFilterDependency,
  planningScreenName,
  props
) => {
  setFilterDependency({});
  fetchInitialPlans(planningScreenName, props);
};

/**
 * @function
 * @description Handle filter operations to show to the table.
 */
export const onDashboardFilter = (
  filterElements,
  filterDependency,
  tableRef,
  planType,
  props
) => {
  let isValid = true;
  const reqBody = filterElements.map((filter) => {
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
    return {
      filter_type: "non-cascaded",
      attribute_name: filter.column_name,
      operator: "in",
      values: value ? [value].flat() : [],
    };
  });
  reqBody.push(getPlanningType(props.path, planType));
  if (isValid) {
    let body = {
      filters: reqBody,
      meta: {
        range: [],
        sort: [],
        search: [],
      },
    };
    props.fetchPlansmartDashboardDataReq(body, props.planType);
  } else {
    props.addSnack({
      message: "Enter complete date range",
      options: {
        variant: "error",
      },
    });
  }
};

export const getPlanningType = (path, selectedTab) => {
  return {
    attribute_name: "status",
    filter_type: "non-cascaded",
    operator: "in",
    values: statusValueBasedOnTabSelection?.[path]?.[selectedTab],
  };
};

export const getHeaderForExcel = (data) => {
  let header = [];
  let tempData = cloneDeep(data);

  tempData.forEach((item) => {
    if (item.sub_headers.length > 0) {
      for (let i of item.sub_headers) {
        header.push({
          label: `${item.label}/${i.label}`,
          key: i.column_name,
        });
      }
    } else header.push({ label: item.label, key: item.column_name });
  });
  return header;
};

//adding symbol and commas to download values
const formatDownloadValues = (row) => {
  for (const [key, value] of Object.entries(row)) {
    let temp = Number(value);
    if (!isNaN(temp)) {
      temp = Math.round(temp * 100) / 100;
      if (row.symbol === "%") {
        let str = Math.round(temp) + "%";
        temp = str;
      } else if (row.symbol === "$") {
        let str = "$" + temp;
        temp = str;
      } else {
        temp = Math.round(temp);
      }
      row[key] = temp.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
    }
  }
};

//formatting the parsed data for downloading as csv
export const csvFormatter = (data, headers) => {
  let tableData = [];
  data.forEach((item) => {
    let label = "";
    //condition for downloading report in KPI view
    if (item.metric) label = item.metric;
    else {
      label = item.month;
      let parentRow = { ...item };
      parentRow.month = `${label}/Total`;
      tableData.push(parentRow);
    }

    item.subRows.forEach((row) => {
      //dummy object to utilize budgetTable function
      let cellProps = {
        row: {
          values: {
            metric: "",
            reference: "",
          },
        },
        column: { type: "", removeValidation: "false" },
      };
      cellProps.row.values.metric = row.metric;
      cellProps.row.values.reference = row.reference;
      row.symbol = setInputFormatForColumn(cellProps, true);

      //condition for downloading KPI view report
      if (row.metric) row.metric = `${label}/${row.metric}`;
      else row.month = `${label}/${row.month}`;

      delete row.uniqueId;

      //Formatting table values
      formatDownloadValues(row);

      tableData.push(row);
    });
  });
  //condition for downloading report if no data is there
  if (tableData.length === 0) {
    let row = {};
    headers.forEach((item) => {
      row[item.key] = "-";
    });
    tableData.push(row);
  }

  return tableData;
};

export const getListOptions = (metricConfig) => {
  let tempData = Object.entries(metricConfig);
  delete tempData[2][1].rcpt_units;
  let listOptions = [];
  tempData.forEach((item) => {
    let listData = Object.entries(item[1]);
    if (listData.length > 0) {
      for (let val of listData) {
        if (val[0] !== "category_order") {
          let obj = { value: val[0], ...val[1] };
          listOptions.push(obj);
        }
      }
    }
  });
  return listOptions;
};

export const updateMetricConfig = (currentConfig, metricConfig) => {
  Object.keys(metricConfig).forEach((category) =>
    Object.keys(metricConfig[category]).forEach((metric) => {
      if (typeof metricConfig[category][metric] === "object") {
        metricConfig[category][metric].default_visibility =
          currentConfig !== null && currentConfig !== undefined
            ? currentConfig?.[`${category}_category`]?.[metric]
                ?.default_visibility
            : false;
      }
    })
  );
  return metricConfig;
};

export const generateForecastData = async (newPlancode, props) => {
  let forecastedDatabody = {
    target_metrics: [
      {
        attribute_name: "target_margin",
        attribute_value: 0,
        update_flag: 0,
      },
      {
        attribute_name: "target_revenue_growth",
        attribute_value: 0,
        update_flag: 0,
      },
      {
        attribute_name: "target_sell_through",
        attribute_value: 0,
        update_flag: 0,
      },
    ],
    update_date: true,
  };
  await props.updateForecastedData(newPlancode, forecastedDatabody);
};

export const getAttributesGenerated = (formElementsData, selectedData) => {
  const attributesList = [];
  formElementsData.forEach((element) => {
    let rangePicker = element.field_type === "rangePicker";
    const storeList = [];
    const isStore =
      element.accessor === "store" || element.accessor === "store_group";

    if (element.accessor === "store") {
      const storeValues = selectedData[element.accessor];
      element.options.forEach((store) => {
        if (storeValues.indexOf(store.attribute) > -1) {
          storeList.push(store.store_code);
        }
      });
    } else if (element.accessor === "store_group") {
      element.options.forEach((store) => {
        if (store.attribute === selectedData[element.accessor]) {
          storeList.push(store.sg_code);
        }
      });
    } else if (element.accessor === "plan_stage") {
      attributesList.push({
        attribute_name: element.column_name,
        attribute_value: plan_stage[selectedData[element.accessor]],
        dimension: element.dimension ? element.dimension : "plan",
      });
      return;
    } else if (element.accessor === "plan_display_name") {
      attributesList.push({
        attribute_name: element.column_name,
        attribute_value: selectedData[element.accessor]?.trim(),
        dimension: element.dimension,
      });
      return;
    } else if (element.accessor === "season") {
      attributesList.push({
        attribute_name: element.column_name,
        attribute_value: selectedData["season_options"].map((k) => k.label),
        dimension: element.dimension ? element.dimension : "plan",
      });
      return;
    }
    let storeFilterVal = isStore
        ? storeList
        : selectedData[element.column_name],
      selectedFilterAttributeVal =
        element.dimension === "product" && selectedData[element.column_name]
          ? [selectedData[element.column_name]].flat()
          : storeFilterVal;

    if (
      selectedFilterAttributeVal ||
      storeFilterVal ||
      selectedData[element.column_name] ||
      rangePicker
    ) {
      if (
        element.dimension === "product" &&
        selectedData[element.column_name]?.length === 0
      ) {
        return;
      }
      attributesList.push({
        attribute_name: element.column_name,
        attribute_value: rangePicker
          ? [
              moment(selectedData[element.column_name][0]).format("YYYY-MM-DD"),
              moment(selectedData[element.column_name][1]).format("YYYY-MM-DD"),
            ]
          : selectedFilterAttributeVal,
        dimension: element.dimension ? element.dimension : "plan",
      });
    }
  });
  return attributesList;
};

export const createPlanGetSeasonType = (searchString) => {
  const query = new URLSearchParams(searchString);
  const seasonType = query.get("season_type");
  if (seasonType === CREATE_PLAN_IN_SEASON) {
    return CREATE_PLAN_IN_SEASON;
  } else if (seasonType === CREATE_PLAN_PRE_SEASON) {
    return CREATE_PLAN_PRE_SEASON;
  } else {
    return "";
  }
};

export const getPlanStageBasedOnSeasonType = (option, seasonType) => {
  switch (seasonType) {
    case CREATE_PLAN_IN_SEASON:
      return get(option, "data.data[0].attribute_value.in-season.value", []);
    case CREATE_PLAN_PRE_SEASON:
      return get(option, "data.data[0].attribute_value.pre-season.value", []);
    default:
      return [];
  }
};

export const getMasterPlanCrumbsUrl = (seasonType) => {
  switch (seasonType) {
    case CREATE_PLAN_IN_SEASON:
      return PLAN_SMART_IN_SEASON_DASHBOARD;
    case CREATE_PLAN_PRE_SEASON:
      return PLAN_SMART_PRE_SEASON_DASHBOARD;

    default:
      return PLAN_SMART_PRE_SEASON_DASHBOARD;
  }
};

export const generateFilterConfig = async (
  configData,
  userAccessList,
  seasonType,
  planData,
  screenName,
  addSnack,
  tenantFilterUamConfig,
  fetchOptionsOnDropdownOpen = false
) => {
  try {
    const planDimAppCode = PLAN_SMART_APPLICATION_CODE;
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
        isSelectAllButtonHidden: key.extra?.is_selectall_button_hidden,
        extra: key.extra,
        maxLengthLimit: key.extra?.maxLengthLimit,
      };
      if (!fetchOptionsOnDropdownOpen) {
        if (
          key.column_name === "plansmart_reports_buckets" ||
          key.column_name === "plansmart_bucket"
        ) {
          const buckets = await getValueFromAttributeMaster(
            4,
            "plansmart_reports_buckets"
          );

          item.options = Object.keys(buckets.value)?.map((bucket) => {
            const value = buckets.value[bucket];
            return {
              value: value,
              label: bucket,
              id: value,
            };
          });
          return item;
        }
        if (key.column_name === "plansmart_report_type") {
          const reportTypes = await getValueFromAttributeMaster(
            4,
            "plansmart_report_type"
          );

          item.options = reportTypes.value?.map((reportType) => {
            return {
              value: reportType.value,
              label: reportType.label,
              id: reportType.id,
            };
          });
          return item;
        }

        if (key.dimension === "product") {
          let selectedOptions = {};
          if (planData) {
            selectedOptions = {
              l0_name: planData.l0_name?.[0],
              l1_name: planData.l1_name?.[0],
              l2_name: planData.l2_name?.[0],
            };
          }
          const dependency = getFilterDependency(
            [],
            selectedOptions,
            index,
            key.dimension
          );
          let body = {
            attribute_name: key.column_name,
            filter_type: key.type || "cascaded",
            filters: dependency,
            is_urm_filter: screenName && tenantFilterUamConfig ? true : false,
            screen_name: screenName,
            application_code: 4,
          };
          const options = await getFiltersValues("product", body)();
          let accessibleOptions = filterHierarchyOptions(
            options.data.data.attribute,
            key.accessor,
            userAccessList
          );
          item.options = configureAttributeOptions(accessibleOptions);
        }
        if (key.column_name === "season") {
          const seasonBody = {
            option: "ALL",
          };
          const seasonOptions = await getSeasonOptions(seasonBody)();
          item.options = seasonOptions?.data.data.map((data) => {
            return {
              value: data.attribute_value.incremental_id,
              label: data.name,
              id: data.attribute_value.incremental_id,
            };
          });
        }
        if (key.column_name === "version") {
          let version = await getValueFromAttributeMaster(
            4,
            "plansmart_reports_versions"
          );
          item.options = version.value?.map((item) => {
            return {
              value: item,
              label: item,
              id: item,
            };
          });
        }
        if (key.dimension === "plan") {
          const optionsResponse = await getTenantConfigApplicationLevel(
            planDimAppCode,
            {
              attribute_name: key.column_name,
            }
          )();
          let attributes =
            key.column_name === "plan_stage" ||
            key.column_name === "master_plan_stage"
              ? getPlanStageBasedOnSeasonType(optionsResponse, seasonType)
              : optionsResponse?.data?.data[0]?.attribute_value?.value;
          item.options = formatStringArray(attributes || []);
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
      }
      return item;
    });
    let filterFields = await Promise.all(filterElements);
    return filterFields;
  } catch (error) {
    console.log(error);
    addSnack({
      message: `Error fetching filters` || error,
      options: {
        variant: "error",
      },
    });
    return [];
  }
};

export const getPlanSmartSeasonType = (statusCode) => {
  if (statusCode >= 0) {
    if (PRE_SEASON_STATUS_CODES.includes(statusCode)) {
      return CREATE_PLAN_PRE_SEASON;
    } else if (IN_SEASON_STATUS_CODES.includes(statusCode)) {
      return CREATE_PLAN_IN_SEASON;
    }
  } else {
    return "";
  }
};

export const getColumnsToExport = (tableRef) => {
  const displayedColumns =
    tableRef.current?.columnApi?.getAllDisplayedColumns() || [];
  const allColumns = tableRef.current?.columnApi?.getAllColumns() || [];
  const columns = [...allColumns.slice(0, 3), ...displayedColumns];
  return columns;
};

export const getBudgetTableFormattingAttributes = (instance) => {
  const metrics_with_formatter =
    instance.api.gridOptionsWrapper.gridOptions?.metrics_with_formatter;
  let metric = instance.data?.metricWithoutBucket || "";

  let type = metrics_with_formatter?.[metric]?.typeFormat || instance.type;
  let inputType = instance.inputType;
  let formatter = metrics_with_formatter?.[metric]?.formatter;
  let roundOffTo = instance.roundOffTo;

  if (instance.data?.reference?.includes("variance")) {
    type = "number";
    formatter = "roundOfftoTwoDecimals";
    inputType = "percentage";
  }

  if (formatter === "roundOff") {
    roundOffTo = 0;
  } else if (formatter === "roundOfftoOneDecimals") {
    roundOffTo = 1;
  } else if (formatter === "roundOfftoTwoDecimals") {
    roundOffTo = 2;
  } else if (formatter === "roundOfftoThreeDecimals") {
    roundOffTo = 3;
  }

  return { type, inputType, roundOffTo };
};

export const plansmartNonEditableCell = (
  item,
  cellProps,
  metrics_with_formatter
) => {
  const shouldRoundOff = false;

  const metric = cellProps.data.metricWithoutBucket;
  const ignoreColumns =
    cellProps.column.userProvidedColDef.dimension === "Plan";
  let formatter = item.formatter;
  let type = item.type;
  if (metric && !ignoreColumns) {
    type = metrics_with_formatter?.[metric]?.type || item.type;
    formatter = metrics_with_formatter?.[metric]?.formatter;

    if (cellProps.data?.reference.includes("variance")) {
      type = "percentage";
      formatter = "roundOfftoTwoDecimals";
    }
  }

  //it returns the formatter to cell based on type
  let roundOffTo = DEFAULT_ROUNDOFF;
  if (formatter === "roundOff") {
    roundOffTo = 0;
  } else if (formatter === "roundOfftoOneDecimals") {
    roundOffTo = 1;
  } else if (formatter === "roundOfftoTwoDecimals") {
    roundOffTo = 2;
  } else if (formatter === "roundOfftoThreeDecimals") {
    roundOffTo = 3;
  }

  switch (type) {
    case "percentage":
      return (ins) => percentFormatter(ins, roundOffTo, true);
    case "int":
      return (ins) =>
        numbersWithComma(ins, roundOffTo, item?.extra?.disableCommaFormatting);
    case "float":
      return (ins) => decimalsFormatter(ins, roundOffTo, shouldRoundOff);
    case "dollar":
      return (ins) => dollarFormatter(ins, roundOffTo);
    case "attribute":
      return (ins) => attributeFormatter(ins.value, false);
    case "bool":
      return (ins) => ins?.value || "";
    case "array":
      return (ins) => arrayToCommaFormatter(ins.value);
    case "date":
    case "DateTimeField":
      return (ins) => formattedDate(ins.value, getDateFormat(item));
    default:
      return (ins) => {
        // Adding numbersWithComma formatter for str type columns
        if (item.formatter && item.formatter === "numbersWithComma") {
          return numbersWithComma(ins, roundOffTo);
        } else if (ins.value === 0 || ins.value === false || ins.value) {
          return fetchDefaultValue(ins);
        }
        return "";
      };
  }
};
