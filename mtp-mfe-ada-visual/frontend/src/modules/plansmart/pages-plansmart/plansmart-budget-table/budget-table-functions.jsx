import { Typography, Box, Tabs, Tab, Button, Icon } from "@mui/material";
import {
  cloneDeep,
  forEach,
  isEqual,
  isNaN,
  isUndefined,
  orderBy,
  round,
} from "lodash";
import { getStoreData } from "../../../../store/index";
import {
  displayRowsForBudgetTable,
  monthList,
} from "modules/plansmart/utils-plansmart";
import {
  csvFormatter,
  getAllDropdownValues,
  getHeaderForExcel,
  getPlanSmartSeasonType,
  plansmartNonEditableCell,
} from "../plansmart-utility";
import moment from "moment";
import get from "lodash/get";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { decimalsFormatter } from "core/Utils/formatter";
import {
  bucket_keys,
  //defaultMetrics,
  MAX_ROW_ALLOWED_FOR_COMPARE,
  metricKeysList,
  //metrics_with_formatter,
  plan_stage,
  PRE_SEASON_STATUS_CODES,
  referencePercentArr,
  //totalBucketAggregrationFormulas,
  trackHiddenMetricOverallHierarchyKey,
  trackHiddenMetricReferenceHierarchyKey,
  //weekAggregationFormula,
  isInSeasonPlan,
  typeOfFunctions,
  trackHiddenMetricBucketKey,
  rowsWithoutEditablerenderer,
  manualCalculationHandledKpis,
} from "modules/plansmart/constants-plansmart/stringConstants";
import { nonEditableCell } from "core/Utils/agGrid/table-functions";
import {
  getColumnExtra,
  getCompareKey,
  getFlattenColumn,
  getReference,
  isWeekNumber,
} from "modules/plansmart/utils-plansmart/ConstantFunctions";
import { tableData } from "modules/plansmart/BudgetTableColDef";
import { calculateBuildRatio } from "./build-ratio-functions";
import { startCase } from "lodash";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import { Lock, LockClockOutlined, LockOutlined } from "@mui/icons-material";
import LockComponent from "core/Utils/agGrid/column-component/lockComponent";
import { SNACK_VARIANT } from "modules/plansmart/utils-plansmart/snackMessage";
import { getReferenceList, groupByKeys } from "./ShowHideMetrics";

export const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
};

export const setInputFormatForColumn = (
  metrics_with_formatter,
  cellProps,
  returnAttribute,
  bucket_keys
) => {
  //add metrics to respected array to assign appropriate symbol
  let inputAttribute = " ";
  let metric = cellProps?.data?.metricWithoutBucket || "";
  if (cellProps?.column?.colId === "total") {
    cellProps.column.is_lockable = false;
  } else {
    cellProps.column.is_lockable = false;
  }

  inputAttribute = metrics_with_formatter?.[metric]?.inputAttribute;
  cellProps.column.formatter = metrics_with_formatter?.[metric]?.formatter;
  cellProps.column.fixTo = metrics_with_formatter?.[metric]?.fixTo;
  cellProps.column.type = metrics_with_formatter?.[metric]?.type;
  cellProps.column.typeFormat = metrics_with_formatter?.[metric]?.typeFormat;
  // Hardcoding right now to fix the values getting multiplied by 100.
  if (
    cellProps?.data?.reference === "forcasted" ||
    metrics_with_formatter?.[metric]?.type === "percentage"
  ) {
    cellProps.column.multiplier = true;
  }
  // cellProps.column.isExpression = false;
  return returnAttribute ? inputAttribute : cellProps.column;
};

export const noEditableCustomCellRender = (
  metrics_with_formatter,
  cellProps
) => {
  //.includes("week")
  if (
    isWeekNumber(cellProps.column.colId) ||
    cellProps.column.colId.toLowerCase().includes("total")
  ) {
    const item = {
      ...setInputFormatForColumn(metrics_with_formatter, cellProps, false),
      is_editable: false,
    };
    return (
      plansmartNonEditableCell(
        item,
        cellProps,
        metrics_with_formatter
      )(cellProps) + ""
    );
  }
  return plansmartNonEditableCell(
    cellProps?.colDef,
    cellProps,
    metrics_with_formatter
  )(cellProps);
};

/**
 * @function
 * @description Used for conditional editable cells (reference === compare row will be non-editable)
 */
export const customCellRenderer = (
  metrics_with_formatter,
  cellProps,
  planType,
  weekLevelKeys,
  bucket_keys
) => {
  let metricKey = cellProps?.data?.metricWithoutBucket;
  if (metricKey) {
    let is_edit_metric =
      PRE_SEASON_STATUS_CODES.indexOf(plan_stage?.[planType]) > -1
        ? "pre_season"
        : "in_season";
    if (
      rowsWithoutEditablerenderer.indexOf(cellProps.data?.reference) > -1 ||
      cellProps.data?.comparePlan ||
      cellProps?.data?.metric?.toLowerCase().includes("total")
    ) {
      const item1 = {
        ...setInputFormatForColumn(
          metrics_with_formatter,
          cellProps,
          false,
          bucket_keys
        ),
        is_editable: false,
      };
      return (
        plansmartNonEditableCell(
          item1,
          cellProps,
          metrics_with_formatter
        )(cellProps) + " "
      );
    }

    // logic to disable editable option for st_perc total columns
    if (
      metricKey === "st_perc" &&
      cellProps?.column?.userProvidedColDef?.extra?.is_total
    ) {
      const item1 = {
        ...setInputFormatForColumn(
          metrics_with_formatter,
          cellProps,
          false,
          bucket_keys
        ),
        is_editable: false,
        // extra: {
        //   ...cellProps?.column?.userProvidedColDef?.extra,
        //   multiplyBy: true,
        // },
      };
      return (
        plansmartNonEditableCell(
          item1,
          cellProps,
          metrics_with_formatter
        )(cellProps) + " "
      );
    }

    if (
      metrics_with_formatter?.[metricKey]?.is_default_editable?.[
        is_edit_metric
      ]?.[cellProps?.data?.reference]
    ) {
      // logic to make only first week editbale of bop_units
      if (
        metricKey === "bop_units" ||
        metricKey === "bop_cost" ||
        metricKey === "bop_auc"
      ) {
        const allColumns = cellProps?.column?.columnApi?.getAllColumns();
        let columnIdFiltered = findTheWeekLevelMappingSortedMonth(
          "first",
          allColumns
        );
        if (columnIdFiltered !== cellProps?.column?.colId) {
          const item1 = {
            ...setInputFormatForColumn(
              metrics_with_formatter,
              cellProps,
              false,
              bucket_keys
            ),
            is_editable: false,
          };
          return (
            plansmartNonEditableCell(
              item1,
              cellProps,
              metrics_with_formatter
            )(cellProps) + " "
          );
        } else {
          return (
            <CellRenderers
              cellData={cellProps}
              column={setInputFormatForColumn(
                metrics_with_formatter,
                cellProps,
                false,
                bucket_keys
              )}
              className="reduced_space"
            ></CellRenderers>
          );
        }
      }

      return (
        <CellRenderers
          cellData={cellProps}
          column={setInputFormatForColumn(
            metrics_with_formatter,
            cellProps,
            false
          )}
          className="reduced_space"
        ></CellRenderers>
      );
    } else {
      const item = {
        ...setInputFormatForColumn(
          metrics_with_formatter,
          cellProps,
          false,
          bucket_keys
        ),
        is_editable: false,
      };
      return (
        plansmartNonEditableCell(
          item,
          cellProps,
          metrics_with_formatter
        )(cellProps) + ""
      );
    }
  }
};

const isMetricHidden = (
  defaultMetrics,
  defaultBucket = [],
  bucket,
  metricWithoutBucket,
  hiddenMetrics,
  category,
  metric,
  reference,
  planCode,
  hierarchyKey,
  isComparePlan = false
) => {
  let default_visibility =
    defaultMetrics?.indexOf(metricWithoutBucket) > -1 ? true : false;
  const defaultBucketVisibility =
    defaultBucket?.indexOf(bucket) > -1 ? true : false;
  if (isComparePlan) {
    const isCompareMetricHidden = get(
      hiddenMetrics,
      `${hierarchyKey}.${planCode}.${category}.${metric}.${reference}`,
      null
    );
    // Checking if original plan is already in hidden are not
    const isOriginalMetricHidden = get(
      hiddenMetrics,
      `${hierarchyKey}.${category}.${metric}.${reference}`,
      null
    );
    if (hierarchyKey === trackHiddenMetricReferenceHierarchyKey)
      return isCompareMetricHidden;
    else if (
      hierarchyKey === trackHiddenMetricBucketKey ||
      hierarchyKey === trackHiddenMetricOverallHierarchyKey
    ) {
      const isOtherVersionHidden = (function () {
        const metricHiddenObj = get(
          hiddenMetrics,
          `${hierarchyKey}.${category}.${metric}`,
          {}
        );
        const referenceKeys = Object.keys(metricHiddenObj);
        if (referenceKeys.length > 0) {
          return get(metricHiddenObj, `${referenceKeys[0]}`, null);
        }

        return null;
      })();
      return isCompareMetricHidden === null
        ? isOtherVersionHidden === null
          ? hierarchyKey === trackHiddenMetricBucketKey
            ? !defaultBucketVisibility
            : !default_visibility
          : isOtherVersionHidden
        : isCompareMetricHidden;
    }

    /**
     * first check to know added version is new or not
     * if version is new and original plan have track use the original plan or use default_visibility
     * if version is already added and it have track use the same
     */
    return isCompareMetricHidden === null
      ? isOriginalMetricHidden === null
        ? !default_visibility
        : isOriginalMetricHidden
      : isCompareMetricHidden;
  } else {
    const isMetricHiddenResult = get(
      hiddenMetrics,
      `${hierarchyKey}.${category}.${metric}.${reference}`,
      null
    );
    if (hierarchyKey === trackHiddenMetricReferenceHierarchyKey)
      return isMetricHiddenResult;
    else if (hierarchyKey === trackHiddenMetricBucketKey)
      return isMetricHiddenResult === null
        ? !defaultBucketVisibility
        : isMetricHiddenResult;
    else
      return isMetricHiddenResult === null
        ? !default_visibility
        : isMetricHiddenResult;
  }
};

const checkInsideComparePlanData = (
  defaultMetrics,
  defaultBucket,
  category,
  subCategory,
  comparePlan,
  hiddenMetrics
) => {
  if (comparePlan?.length > 0) {
    const result = [];
    for (const i in comparePlan) {
      const comparePlanData = comparePlan[i].compare_plans[0];
      const comparePlanRefColMap = comparePlanData.ref_col_mapping;
      const metricsData = comparePlanData.metrics;
      const comparePlanCode = comparePlanData.plan_code;
      const comparePlanLabel = comparePlanData.name;
      const bucketKey = getBucketKey(
        subCategory,
        metricsData[category][subCategory].value
      );
      const metricWithoutBucket = metricsData[category][subCategory].value;
      Object.keys(metricsData[category][subCategory]).forEach(
        (reference, inx) => {
          const referenceType = reference.split("_")?.[0];
          if (
            displayRowsForBudgetTable.includes(reference) ||
            displayRowsForBudgetTable.includes(referenceType)
          ) {
            result.push({
              ...metricsData[category][subCategory][reference],
              metric: subCategory,
              metricLabel: metricsData[category][subCategory].label,
              bucket_category:
                metricsData[category][subCategory].bucket_category,
              comparePlan: true,
              planCode: comparePlanCode,
              comparePlanName: comparePlanLabel,
              hide: isMetricHidden(
                defaultMetrics,
                defaultBucket,
                metricsData[category][subCategory].bucket,
                metricWithoutBucket,
                hiddenMetrics,
                category,
                subCategory,
                reference,
                comparePlanCode,
                trackHiddenMetricOverallHierarchyKey,
                true
              ),
              hideReference: isMetricHidden(
                defaultMetrics,
                defaultBucket,
                metricsData[category][subCategory].bucket,
                metricWithoutBucket,
                hiddenMetrics,
                category,
                subCategory,
                reference,
                comparePlanCode,
                trackHiddenMetricReferenceHierarchyKey,
                true
              ),
              hideBucket: isMetricHidden(
                defaultMetrics,
                defaultBucket,
                metricsData[category][subCategory].bucket,
                metricWithoutBucket,
                hiddenMetrics,
                category,
                subCategory,
                reference,
                comparePlanCode,
                trackHiddenMetricBucketKey,
                true
              ),
              reference: reference,
              referenceLabel: comparePlanRefColMap?.[reference] || reference,
              oldReference: reference,
              category: category.replace("_category", ""),
              originalCategory: category,
              // ...calculateTotalForBudgetTable(
              //   metricsData[category][subCategory][reference]
              // ),
              rowId: inx + reference + category + "imported",
              bucket: metricsData[category][subCategory].bucket,
              metricWithoutBucket: metricsData[category][subCategory].value,
              bucketKey: bucketKey,
              uniqueId:
                subCategory +
                reference +
                category +
                "compare" +
                comparePlanLabel +
                i,
            });
          }
        }
      );
    }
    return result.length > 0 ? result : false;
  } else {
    return false;
  }
};

/**
 * @function
 * @description Function to get the keys for match with dropdown
 */
const getMatchWithList = (data, setPlanRefColMapping) => {
  let arr = [];
  for (let key in data) {
    let obj = {};
    if (
      data[key]["reference"].includes("compare") ||
      data[key]["reference"] === "forcasted" ||
      (data[key]["comparePlan"] && data[key]["reference"] === "current")
    ) {
      obj["label"] = data[key]["comparePlan"]
        ? data[key]["comparePlanName"]
        : data[key]["referenceLabel"];
      obj["value"] = data[key]["comparePlan"]
        ? data[key]["planCode"]
        : data[key]["reference"];
      obj["comparePlan"] = data[key]["comparePlan"];
      if (!arr.some((arrObj) => isEqual(arrObj, obj))) {
        arr.push(obj);
      }
    }
  }
  setPlanRefColMapping(arr);
};

/**
 * @function
 * @param {response}
 * @returns {table data}
 * @description parse the response data into rows of table.
 */
export const parseBudgetTableResponseData = (
  defaultMetrics,
  defaultBucket,
  response,
  hiddenMetrics,
  comparePlanRes,
  setPlanRefColMapping
) => {
  let tempData = response?.metrics,
    ref_col_mapping = response?.ref_col_mapping;
  let subRow = [];
  let isCompareData = false;
  if (tempData) {
    Object.keys(tempData).forEach((category, index) => {
      let subRows = tempData[category];
      Object.keys(subRows).forEach((key) => {
        Object.keys(subRows[key]).forEach((reference) => {
          const referenceType = reference.split("_")?.[0];
          if (
            displayRowsForBudgetTable.includes(reference) ||
            displayRowsForBudgetTable.includes(referenceType)
          ) {
            const bucketKey = getBucketKey(key, subRows[key].value);
            const metricWithoutBucket = subRows[key].value;
            let tempKeyValue = {
              category: category.replace("_category", ""),
              metric: key,
              // max_val: subRows[key].max_val,
              // min_val: subRows[key].min_val,
              // max_color: subRows[key].max_color,
              // min_color: subRows[key].min_color,
              hide: isMetricHidden(
                defaultMetrics,
                defaultBucket,
                subRows[key]?.bucket,
                metricWithoutBucket,
                hiddenMetrics,
                category,
                key,
                reference,
                null,
                trackHiddenMetricOverallHierarchyKey
              ),
              hideReference: isMetricHidden(
                defaultMetrics,
                defaultBucket,
                subRows[key]?.bucket,
                metricWithoutBucket,
                hiddenMetrics,
                category,
                key,
                reference,
                null,
                trackHiddenMetricReferenceHierarchyKey
              ),
              hideBucket: isMetricHidden(
                defaultMetrics,
                defaultBucket,
                subRows[key]?.bucket,
                metricWithoutBucket,
                hiddenMetrics,
                category,
                key,
                reference,
                null,
                trackHiddenMetricBucketKey
              ),
              referenceLabel: ref_col_mapping?.[reference] || reference,
              reference: reference,
              ...subRows[key][reference],
              uniqueId: key + reference + category,
              metricLabel: subRows[key].label,
              rowId: key + reference + category,
              originalCategory: category,
              bucket_category: subRows[key].bucket_category,
              order: subRows[key].order,
              bucket: subRows[key].bucket,
              metricWithoutBucket: metricWithoutBucket,
              bucketKey: bucketKey,
            };
            subRow.push(tempKeyValue);
          }
        });
        isCompareData = checkInsideComparePlanData(
          defaultMetrics,
          defaultBucket,
          category,
          key,
          comparePlanRes,
          hiddenMetrics
        );
        if (isCompareData) {
          subRow.push(...isCompareData);
        }
      });
    });
  }
  if (setPlanRefColMapping) {
    /**
     *
     * 5 -> reference row(WP,LY etc...)
     * comparePlanRes.length * 2 -> there will 2 reference will add for each version
     *
     */
    const sliceLimit = 10 + comparePlanRes.length * 2;
    let listMatchList = subRow.slice(0, sliceLimit);
    getMatchWithList(listMatchList, setPlanRefColMapping);
  }
  return subRow.sort((a, b) => a.order - b.order);
};

const addSubCategory = (
  mainData,
  metricObj,
  MetricName,
  keyName,
  moveLeft,
  metricInx,
  subRow
) => {
  Object.keys(metricObj).forEach((reference, refInx) => {
    if (reference !== "label") {
      const referenceObj = metricObj[reference];
      const obj = {
        metric: MetricName,
        reference: reference,
        referenceLabel: reference,
        ...referenceObj.value,
        uniqueId: reference + keyName + MetricName + refInx + reference,
        moveLeft: moveLeft,
      };
      subRow.push(obj);
      if (referenceObj.SubCategory) {
        addSubCategory(
          mainData,
          referenceObj.SubCategory,
          MetricName,
          keyName,
          moveLeft + 15,
          metricInx,
          subRow
        );
      }
    }
  });
  return subRow;
};

export const pivotViewParsing = (data) => {
  const result = [];
  Object.keys(data).forEach((categoryKey, inx) => {
    const categoryObj = data[categoryKey];
    Object.keys(categoryObj).forEach((metricCategory, metricInx) => {
      const metricObj = categoryObj[metricCategory];
      if (metricCategory !== "category_order" && metricObj.value) {
        const metricName = metricObj.label;
        const subRows = addSubCategory(
          metricObj,
          metricObj.value,
          metricName,
          metricCategory,
          0,
          metricInx,
          []
        );
        result.push({
          metric: data[metricCategory]?.label || metricName,
          metricLabel: metricName,
          expandLabel: metricName,
          subRows: subRows,
          uniqueId: metricCategory + metricInx,
          expandableCols: "metricLabel",
          originalMetric: metricCategory,
        });
      }
    });
  });
  return result;
};

export const parserForSkuTable = (response) => {
  const tableRows = [];
  const styles = Object.keys(response);
  styles.forEach((style) => {
    const tableRow = {};
    tableRow.style = style;
    const metrics = Object.keys(response[style]);
    metrics.forEach((metric) => {
      const versions = Object.keys(response[style][metric]);
      versions.forEach((version) => {
        const weeks = Object.keys(response[style][metric][version]);
        weeks.forEach((week) => {
          const columnKey = `${week}_${metric}_${version}`;
          tableRow[columnKey] = response[style][metric][version][week];
        });
      });
      tableRows.push(tableRow);
    });
    // tableRow.w1_totalSalesU_wp = response[style].total_qty.current.MAY_week1
  });
  return tableRows;
};

export const setFilterOptions = async (
  filter,
  plancode,
  getPlanFilterDropdownOptions,
  filtersForRows,
  planDetails
) => {
  let finalTabs = filter.map(async (item) => {
    let postBody = {
      filter_type: "cascaded",
      attribute_name: item.column_name,
      filters: updateFilterDependency(filtersForRows, filter, item),
    };
    let opt = await getPlanFilterDropdownOptions(plancode, postBody);
    let filterOptions = opt.data.data.map((option) => {
      return {
        value: option.attribute,
        label: option.attribute,
        id: option.attribute,
      };
    });
    return {
      id: item.column_name,
      type: item.label,
      options: filterOptions,
      column_name: item.column_name,
      label: item.label,
    };
  });
  finalTabs = await Promise.all(finalTabs);
  if (planDetails?.plan_type === "bottom-up") {
    return finalTabs?.reverse();
  } else return finalTabs;
};

const updateFilterDependency = (selectedOptions, tabData, item) => {
  if (selectedOptions) {
    let dependency = [];
    const filterKeys = Object.keys(selectedOptions);
    tabData?.forEach((key, inx) => {
      if (selectedOptions[key.id] && inx < filterKeys.indexOf(item.id)) {
        dependency.push({
          attribute_name: key.id,
          operator: "in",
          values: selectedOptions[key.id],
          filter_type: "cascaded",
        });
      }
    });
    return dependency;
  } else {
    return [];
  }
};

export const comparePlanBudgetTable = (list) => {
  return list.map((planObj) => ({
    ...planObj,
    year: planObj.compare_year,
    created_by: planObj.created_at,
    plan_version: "",
    plan_status: "",
  }));
};

export const getCurPlanObjForCompReq = (list, isMetricObj = false) => {
  const result = {};
  const currentPlanObj = {};
  if (isMetricObj) {
    Object.keys(list).forEach((categoryKey) => {
      Object.keys(list[categoryKey]).forEach((metricKey) => {
        if (list[categoryKey][metricKey]["current"]) {
          result[metricKey] = {
            ...list[categoryKey][metricKey]["current"],
          };
        }
      });
    });
    return {
      curPlanForCompPlanReq: result,
    };
  }
  list.forEach((metric) => {
    const categoryKey = metric.originalCategory;
    const metricKey = metric.metric;
    const referenceKey = metric.reference;
    if (!metric.comparePlan) {
      if (!currentPlanObj[categoryKey]) currentPlanObj[categoryKey] = {};
      if (!currentPlanObj[categoryKey][metricKey])
        currentPlanObj[categoryKey][metricKey] = {
          label: metric.metricLabel,
          max_val: metric.max_val,
          min_val: metric.min_val,
          max_color: metric.max_color,
          min_color: metric.min_color,
          bucket_category: metric.bucket_category,
          bucket: metric.bucket,
          value: metric.metricWithoutBucket,
        };
      currentPlanObj[categoryKey][metricKey][referenceKey] = {
        ...metric,
      };

      if (referenceKey === "current") {
        const metricValueOnlyWeekObj = {};
        Object.keys(metric).forEach((metricDataKey) => {
          if (isWeekNumber(metricDataKey)) {
            metricValueOnlyWeekObj[metricDataKey] = metric[metricDataKey];
          }
        });
        result[metricKey] = metricValueOnlyWeekObj;
      }
    }
  });
  return {
    curPlanForCompPlanReq: result,
    originalCurrentPlan: currentPlanObj,
  };
};

export const handleImportPlan = async (data) => {
  let {
    selectedPlans,
    props,
    filtersForRows,
    setSelectedComparePlanRows,
    setComparePlanRes,
    comparePlanRes: prevComparePlan,
    setComparePlanModal,
    showSnackMessage,
    prevSelectedPlans,
    setPrevSelectedPlans,
    selectedComparePlanRows,
    planDetails,
    budgetTableRef,
    originalColRefMapping,
    setPlanBudgetData,
    fromTabChange,
    newTableData,
    hiddenMetrics,
    setPlanRefColMapping,
    fromAddVersionModal,
    agTableRef,
  } = data;
  props.setPlanSmartGetPlansToCompareLoader(true);

  const tableRows = get(agTableRef, "current.props.rowData", []);
  const {
    curPlanForCompPlanReq,
    originalCurrentPlan,
  } = getCurPlanObjForCompReq(
    fromTabChange ? newTableData.metrics : tableRows,
    !!newTableData
  );
  const bodyObj = {
    compare_plans: selectedPlans,
    metrics: curPlanForCompPlanReq,
    level: {
      ...filtersForRows,
    },
    channel: planDetails.channel,
    season: planDetails.season[0],
  };
  selectedPlans.forEach((selectedPlan) => {
    if (isNaN(Number(selectedPlan)) && !bodyObj.plan_code) {
      bodyObj.plan_code = planDetails.plan_code;
    }
  });
  agTableRef?.current?.api.showLoadingOverlay();
  try {
    const comparePlansRes = await props.getPlansToCompare(bodyObj);
    const comparePlans = get(comparePlansRes, "data.data.compare_plans", []);
    if (comparePlans.length > 0) {
      const concatComparePlans = newTableData
        ? comparePlans.map((comparePlanData) => ({
            compare_plans: [comparePlanData],
            week_mapping: comparePlansRes.data.data.week_mapping,
          }))
        : [...prevComparePlan, comparePlansRes.data.data];
      setPrevSelectedPlans(prevSelectedPlans);
      setComparePlanRes(concatComparePlans);
      const parsedData = parseBudgetTableResponseData(
        props.defaultMetrics,
        props.defaultBucket,
        {
          metrics: fromTabChange ? newTableData.metrics : originalCurrentPlan,
          ref_col_mapping: originalColRefMapping,
        },
        hiddenMetrics,
        concatComparePlans,
        setPlanRefColMapping
      );
      setPlanBudgetData(parsedData);
      if (fromAddVersionModal) {
        showSnackMessage(
          "Version added successfully",
          SNACK_VARIANT.SUCCESS,
          comparePlansRes
        );
      }
    } else {
      showSnackMessage(
        "Error in fetching import plan details.",
        SNACK_VARIANT.ERROR,
        comparePlansRes
      );
      const removeImportedPlan = selectedComparePlanRows.filter((plan) =>
        selectedPlans.indexOf(plan.plan_code)
      );
      setSelectedComparePlanRows(removeImportedPlan);
      setComparePlanRes([]);
    }
    agTableRef?.current?.api.hideOverlay();
  } catch (error) {
    showSnackMessage(
      "Error in fetching import plan details.",
      SNACK_VARIANT.ERROR,
      error?.response
    );
    const removeImportedPlan = selectedComparePlanRows.filter((plan) =>
      selectedPlans.indexOf(plan.plan_code)
    );
    agTableRef?.current?.api.hideOverlay();
    setSelectedComparePlanRows(removeImportedPlan);
    setComparePlanRes([]);
  }
  setComparePlanModal(false);
  props.setPlanSmartGetPlansToCompareLoader(false);
};

/**
 * remove particular imported version
 * @param {object} param0
 */

export const handleRemoveVersion = ({
  defaultMetrics,
  defaultBucket,
  removedPlanDetail,
  budgetTableRef,
  comparePlanRes,
  setComparePlanRes,
  prevSelectedPlans,
  setPrevSelectedPlans,
  originalColRefMapping,
  setPlanBudgetData,
  hiddenMetrics,
  setHiddenMetrics,
  setPlanRefColMapping,
  planRefColVal,
  setPlanRefColVal,
  agTableRef,
}) => {
  const prevSelectedPlanWithRemPlan = prevSelectedPlans.filter(
    (planCode) => planCode !== removedPlanDetail.plan_code
  );
  const comparePlanResWihRemPlan = comparePlanRes.filter(
    (data, inx) =>
      data.compare_plans[0].plan_code !== removedPlanDetail.plan_code
  );
  const rmComparePlanForHiddenMetric = cloneDeep(hiddenMetrics);
  if (
    hiddenMetrics[trackHiddenMetricOverallHierarchyKey] &&
    hiddenMetrics[trackHiddenMetricOverallHierarchyKey][
      removedPlanDetail.plan_code
    ]
  ) {
    delete rmComparePlanForHiddenMetric[trackHiddenMetricOverallHierarchyKey][
      removedPlanDetail.plan_code
    ];
  }
  if (
    hiddenMetrics[trackHiddenMetricReferenceHierarchyKey] &&
    hiddenMetrics[trackHiddenMetricReferenceHierarchyKey][
      removedPlanDetail.plan_code
    ]
  ) {
    delete rmComparePlanForHiddenMetric[trackHiddenMetricReferenceHierarchyKey][
      removedPlanDetail.plan_code
    ];
  }
  if (
    hiddenMetrics[trackHiddenMetricBucketKey] &&
    hiddenMetrics[trackHiddenMetricBucketKey][removedPlanDetail.plan_code]
  ) {
    delete rmComparePlanForHiddenMetric[trackHiddenMetricBucketKey][
      removedPlanDetail.plan_code
    ];
  }
  if (planRefColVal.value === removedPlanDetail.plan_code) {
    setPlanRefColVal({});
  }
  const tableRows = get(agTableRef, "current.props.rowData", []);
  const { originalCurrentPlan } = getCurPlanObjForCompReq(tableRows);
  const parsedData = parseBudgetTableResponseData(
    defaultMetrics,
    defaultBucket,
    {
      metrics: originalCurrentPlan,
      ref_col_mapping: originalColRefMapping,
    },
    hiddenMetrics,
    comparePlanResWihRemPlan,
    setPlanRefColMapping
  );
  setHiddenMetrics(rmComparePlanForHiddenMetric);
  setComparePlanRes(comparePlanResWihRemPlan);
  setPrevSelectedPlans(prevSelectedPlanWithRemPlan);
  setPlanBudgetData(parsedData);
};

//to get the table data for download in csv format
export const getDownloadData = async (
  setCsvHeaders,
  setCsvData,
  planBudgetColumns,
  planBudgetData,
  csvHeaders
) => {
  setCsvHeaders(getHeaderForExcel(cloneDeep(planBudgetColumns)));
  setCsvData(csvFormatter(cloneDeep(planBudgetData), csvHeaders));
};

export const customHeader = (
  setActiveTab,
  setTabIndex,
  tabData,
  tabIndex,
  cssClasses,
  planDetails,
  screenConfig,
  currIdxForStack,
  handleTabSwitch
) => {
  return (
    <Tabs
      value={tabIndex}
      onChange={(e, value) => {
        if (currIdxForStack > 0) {
          handleTabSwitch(e.target.id, value);
        } else {
          setActiveTab(e.target.id);
          setTabIndex(value);
        }
      }}
      aria-label="dasboard tabs"
      classes={{
        root: cssClasses.rootTab,
      }}
    >
      {tabData?.map((item) => (
        <Tab label={item.type} id={item.id} />
      ))}
      {screenConfig.planning_screen["in-season"]["sku-level-budget"] &&
        isInSeasonPlan(planDetails?.status) && <Tab label="Style" id="sku" />}
    </Tabs>
  );
};

export const handlePivotView = (
  value,
  tabData,
  setActiveTab,
  setPivotViewMode,
  commonBudgetTableFetch
) => {
  setPivotViewMode(value);
  if (value) {
    const tabValue = tabData[tabData.length - 1];
    setActiveTab(tabValue?.id);
  }
  if (commonBudgetTableFetch) {
    commonBudgetTableFetch(value);
  }
};

export const PivotViewBackButton = (
  planDetails,
  tabData,
  setActiveTab,
  setPivotViewMode,
  setPivotVersionsModal,
  submitPivotView,
  showSnackMessage,
  commonBudgetTableFetch
) => {
  return (
    <Box display="flex">
      {/* <Button
        variant="text"
        color="primary"
        disableRipple={true}
        onClick={() => setPivotVersionsModal(true)}
      >
        View previous versions
      </Button> */}
      <Button
        variant="outlined"
        id="plansmartImportPlanBtn"
        onClick={() => {
          handlePivotView(
            false,
            tabData,
            setActiveTab,
            setPivotViewMode,
            commonBudgetTableFetch
          );
        }}
        sx={{ marginRight: "10px" }}
      >
        Back to
        <Typography component="span" ml={0.5} noWrap width="50px">
          {planDetails?.name}
        </Typography>
      </Button>
      {/* <SavePivotMenu
        onSave={submitPivotView}
        showSnackMessage={showSnackMessage}
      /> */}
    </Box>
  );
};

const cellStyle = (params) => {
  let cellColorValues = params?.data;
  let rowsWithDifferentCellStyle = ["variance_fcst"];
  let style = {};
  if (rowsWithDifferentCellStyle.indexOf(params?.data?.reference) > -1) {
    if (
      params?.value >= cellColorValues?.min_val &&
      params?.value <= cellColorValues?.max_val
    ) {
      style.color = cellColorValues?.max_color;
    } else if (!isNaN(params?.value)) {
      style.color = cellColorValues?.min_color;
    }
    return style;
  } else {
    let rowsWithPaddingZero = ["variance", "current"];
    if (rowsWithPaddingZero.indexOf(params?.data?.reference) > -1)
      return { padding: "0" };
  }
};

export const getColumns = (props) => {
  let {
    weekAggregationFormula,
    totalBucketAggregrationFormulas,
    firstLastBucketTotalColumn,
    planBudgetColumn,
    agTableRef,
    bucket_keys,
    headerClasses,
    isMonthView,
    isMasterPlanColumns,
    useBudgetListData = [],
    plansmartConfigs = {},
    planDetails,
  } = props;
  let tempColumns = [
    {
      column_name: "category",
      type: "list",
      label: "KPI Category",
      tc_code: 69,
      is_frozen: true,
      hide: true,
      rowSpan: true,
      enableRowGroup: true,
      suppressToolPanel: true,
      initialHide: true,
      width: 20,
      dimension: "Plan",
    },
    // {
    //   column_name: "bucket_category",
    //   type: "list",
    //   label: "KPI category",
    //   tc_code: 69,
    //   is_frozen: true,
    //   hide: true,
    //   suppressToolPanel: true,
    //   initialHide: true,
    //   rowSpan: true,
    //   enableRowGroup: true,
    // },
  ];
  tempColumns.push(...planBudgetColumn);
  tempColumns.forEach((column, index) => {
    function addValueGetterToLeafChild(columns = []) {
      columns.forEach((childColumn) => {
        if (childColumn?.sub_headers?.length > 0) {
          delete childColumn.rowSpan;
          addValueGetterToLeafChild(childColumn?.sub_headers);
        } else {
          Object.assign(
            childColumn,
            !isMasterPlanColumns && {
              headerComponent: (params) => (
                <LockComponent
                  lockCellApi={(isLocked) => {
                    lockCellApi(params, isLocked);
                  }}
                  props={params}
                />
              ),
            },
            {
              menuTabs: ["generalMenuTab", "columnsMenuTab"],
              // is_lockable: true,
              headerClass: headerClasses,
              valueGetter: (params) => {
                let metricKey = params?.data.metricWithoutBucket;
                if (
                  (metricKey === "dollar_build_ratio" ||
                    metricKey === "qty_build_ratio") &&
                  params?.data?.reference === "current"
                ) {
                  return calculateBuildRatio(metricKey, params);
                }
                return childColumn?.extra?.is_total
                  ? totalValueGetter(
                      weekAggregationFormula,
                      totalBucketAggregrationFormulas,
                      firstLastBucketTotalColumn,
                      params,
                      agTableRef,
                      bucket_keys,
                      plansmartConfigs
                    )
                  : getBucketTotal(
                      weekAggregationFormula,
                      totalBucketAggregrationFormulas,
                      params,
                      bucket_keys,
                      useBudgetListData,
                      plansmartConfigs,
                      planDetails
                    );
              },
              menuVisible: true,
              width: isMonthView ? 135 : childColumn.width, // 135 is default editable column
              cellRenderer: "agAnimateShowChangeCellRenderer",
              // extra: { ...childColumn.extra, multiplyBy: true },
            }
          );

          if (isMonthView && childColumn.extra.is_total === false) {
            Object.assign(childColumn, {
              is_hidden: true,
            });
          }
        }
      });
    }
    delete column.rowSpan;
    if (column?.column_name === "metric") {
      return Object.assign(column, {
        valueGetter: (params) => params?.data?.metricLabel,
        enableRowGroup: true,
        hide: true,
        // rowSpan: true,
        showRowGroup: false,
      });
    }
    if (column?.column_name === "reference") {
      return Object.assign(column, {
        valueGetter: (params) => params?.data?.referenceLabel,
        is_frozen: true,
        enableRowGroup: true,
        menuTabs: ["generalMenuTab", "columnsMenuTab"],
      });
    }
    if (column?.extra?.is_total || column?.extra?.is53Week) {
      Object.assign(column, {
        valueGetter: (params) =>
          totalValueGetter(
            weekAggregationFormula,
            totalBucketAggregrationFormulas,
            firstLastBucketTotalColumn,
            params,
            agTableRef,
            bucket_keys,
            plansmartConfigs
          ),
        cellStyle: cellStyle,
        is_lockable: false,
      });
    }
    addValueGetterToLeafChild(column.sub_headers);
  });
  return agGridColumnFormatter(tempColumns);
};

export const lockCellApi = (cellProps, isLocked) => {
  let allColumns = cellProps?.column?.colDef?.extra?.is_total
    ? getFlattenColumn(cellProps.column)
    : [cellProps.column];

  allColumns?.forEach((columns) => {
    let columnId = columns?.colId || columns?.accessor;

    return cellProps?.api?.forEachNode(function (rowNode) {
      if (rowNode?.group) {
        return rowNode?.allChildren?.forEach((rows) => {
          return checkIfLockColumnExist(columnId, rows, isLocked, cellProps);
        });
      }
      return checkIfLockColumnExist(columnId, rowNode, isLocked, cellProps);
    });
  });
  cellProps.api.refreshCells({
    force: true,
  });
  cellProps.api.refreshHeader({
    force: true,
  });
};

const checkIfLockColumnExist = (
  columnId,
  rowsWithLock,
  isLocked,
  cellProps
) => {
  if (isLocked) {
    (function checkParentNeedToLock(leafColumns, parentObj) {
      let lockedWeekCount = 1;
      let weekCount = 0;
      leafColumns?.forEach((col) => {
        if (
          rowsWithLock?.data?.cellLocked?.[col?.colId] &&
          isWeekNumber(col?.colId)
        ) {
          lockedWeekCount++;
        }
        if (isWeekNumber(col?.colId)) {
          weekCount++;
        }
      });
      if (lockedWeekCount === weekCount) {
        leafColumns.forEach((col) => {
          if (col?.colDef?.extra?.is_total && isWeekNumber(columnId)) {
            Object.assign(rowsWithLock?.data?.cellLocked, {
              [col?.colId]: isLocked,
            });
          }
        });
        checkParentNeedToLock(
          parentObj?.originalParent?.getLeafColumns() || [],
          parentObj?.originalParent
        );
      }
    })(
      cellProps.column?.originalParent?.getLeafColumns() || [],
      cellProps.column?.originalParent
    );
  } else if (isWeekNumber(columnId)) {
    (function unlockTotalColumns(leafColumns, parentObj) {
      leafColumns.forEach((col) => {
        if (
          (col?.colDef?.extra?.is_total || col?.extra?.is_total) &&
          (col?.children || []).length === 0
        ) {
          Object.assign(rowsWithLock?.data?.cellLocked, {
            [col?.colId || col?.accessor]: false,
          });
        }
      });
      if (leafColumns.length === 0) return;
      unlockTotalColumns(
        parentObj?.originalParent?.colGroupDef.children || [],
        parentObj?.originalParent
      );
    })(
      cellProps.column?.originalParent?.children,
      cellProps.column?.originalParent
    );
  }
  if (rowsWithLock?.data?.cellLocked) {
    return Object.assign(rowsWithLock?.data?.cellLocked, {
      [columnId]: isLocked,
    });
  } else {
    return Object.assign(rowsWithLock?.data, {
      ["cellLocked"]: {
        [columnId]: isLocked,
      },
    });
  }
};

export const lockCellCustomConditionFn = (instance) => {
  const condition = (instance.data?.cellLocked || {})[instance.colDef.field]
    ? true
    : false;
  return condition;
};

export const updateFilterChips = (
  filterList,
  selectedValue,
  setFilterChips,
  accessorKey = "id",
  useDimension = true,
  labelKey = "type"
) => {
  const response = {
    filterConfig: [],
  };
  const chipsData = [];
  const dateFilter = {};
  filterList.forEach((filter) => {
    if (
      selectedValue[filter[accessorKey]] &&
      selectedValue[filter[accessorKey]]?.length > 0 &&
      filter?.display_type !== "rangePicker"
    ) {
      if (
        typeof selectedValue[filter[accessorKey]] === "string" ||
        typeof selectedValue[filter[accessorKey]] === "number"
      ) {
        chipsData.push({
          dimension: useDimension
            ? filter?.dimension || filter[labelKey]
            : filter[labelKey],
          filter_id: "district",
          filter_type: filter.field_type,
          values: [
            {
              value: selectedValue[filter[accessorKey]],
              label: selectedValue[filter[accessorKey]],
              id: selectedValue[filter[accessorKey]],
            },
          ],
        });
      } else {
        chipsData.push({
          dimension: useDimension
            ? filter?.dimension || filter[labelKey]
            : filter[labelKey],
          filter_id: "district",
          filter_type: filter.field_type,
          values: selectedValue[filter[accessorKey]]?.map((option) => ({
            value: option,
            label: option,
            id: option,
          })),
        });
      }
    } else if (
      filter?.display_type === "rangePicker" &&
      selectedValue[filter[accessorKey]]?.length > 0
    ) {
      const [startDate, endDate] = selectedValue[filter[accessorKey]];
      if (startDate) {
        dateFilter.start_date = moment.utc(startDate).format("l");
      }
      if (endDate) {
        dateFilter.end_date = moment.utc(endDate).format("l");
      }
    }
  });
  response.filterConfig = chipsData;
  if (Object.keys(dateFilter).length == 2) {
    response.dateFilter = dateFilter;
  }
  setFilterChips(response);
};

/**
 * To change target value to default value
 * @param {object} targetsData target values from the API
 * @param {function} setFormData to change target form data
 * @param {function} setTargetFormValues to track target change values
 * @param {function} updateChangedFormKey to track target key
 * @param {object} formData current target form data
 */

export const setTargetDefaultValue = (
  targetsData,
  setFormData,
  setTargetFormValues,
  updateChangedFormKey,
  formData
) => {
  const obj = {
    gross_margin_per:
      "" + decimalsFormatter({ value: targetsData?.gross_margin_per * 100 }, 2),
    revenue_growth_per:
      "" +
      decimalsFormatter(
        {
          value: targetsData?.revenue_growth_per * 100,
          is_negative_value_allowed: true,
        },
        2
      ),
    eop_variance:
      "" +
      decimalsFormatter(
        {
          value: targetsData?.eop_variance * 100,
          is_negative_value_allowed: true,
        },
        2
      ),
    revenue_total:
      "" +
      decimalsFormatter({
        value: targetsData?.revenue_total,
      }),
  };
  setFormData(obj);
  setTargetFormValues(formData);
  updateChangedFormKey([]);
};

/**
 *
 * @param {object} hiddenMetrics show/hide metrics details
 * @param {list} rowData specific row data object to find metric levels
 * @param {boolean} isHidden to know that row is hidden are not from show/hide metrics
 * @returns updated object to track show/hide metrics
 */

export const trackShowHideMetric = (
  hiddenMetrics,
  rowData,
  isHidden,
  isReference = false,
  isBucket = false
) => {
  const {
    comparePlan,
    planCode,
    originalCategory,
    metric,
    reference,
  } = rowData;
  const hierarchyKey = isBucket
    ? trackHiddenMetricBucketKey
    : isReference
    ? trackHiddenMetricReferenceHierarchyKey
    : trackHiddenMetricOverallHierarchyKey;
  const newHiddenObj = {
    ...hiddenMetrics,
  };
  if (!newHiddenObj[hierarchyKey]) newHiddenObj[hierarchyKey] = {};
  if (comparePlan) {
    if (!newHiddenObj[hierarchyKey][planCode])
      newHiddenObj[hierarchyKey][planCode] = {};
    if (!newHiddenObj[hierarchyKey][planCode][originalCategory])
      newHiddenObj[hierarchyKey][planCode][originalCategory] = {};

    if (!newHiddenObj[hierarchyKey][planCode][originalCategory][metric])
      newHiddenObj[hierarchyKey][planCode][originalCategory][metric] = {};

    newHiddenObj[hierarchyKey][planCode][originalCategory][metric][
      reference
    ] = isHidden;
  } else {
    if (!newHiddenObj[hierarchyKey][originalCategory])
      newHiddenObj[hierarchyKey][originalCategory] = {};

    if (!newHiddenObj[hierarchyKey][originalCategory][metric])
      newHiddenObj[hierarchyKey][originalCategory][metric] = {};

    newHiddenObj[hierarchyKey][originalCategory][metric][reference] = isHidden;
  }

  return newHiddenObj;
};

/**
 *
 * @param {list} rowData it is from the ag grid table data
 * @returns boolean it will return true only if that reference level is less that MAX_ROW_ALLOWED_FOR_COMPARE
 */

export const rowsToCompareValidCheckForComparePlan = (rowData) => {
  const metricObj = {};
  for (let rowInx = 0; rowInx < rowData.length; rowInx++) {
    const metric = rowData[rowInx];
    const categoryKey = metric.originalCategory;
    const metricKey = metric.metric;
    const referenceKey =
      metric.reference + (metric.comparePlan ? metric.planCode : "");
    if (!metric.hide && !metric.hideReference) {
      if (!metricObj[categoryKey]) metricObj[categoryKey] = {};
      if (!metricObj[categoryKey][metricKey])
        metricObj[categoryKey][metricKey] = {};
      metricObj[categoryKey][metricKey][referenceKey] = {
        ...metric,
      };
      if (
        Object.keys(metricObj[categoryKey][metricKey]).length >
        MAX_ROW_ALLOWED_FOR_COMPARE - 2
      ) {
        return false;
      }
    }
  }
  return true;
};

/**
 * remove particular imported version
 * @param {object} param0
 */

export const handleClearImportedPlan = (
  defaultMetrics,
  defaultBucket,
  setSelectedComparePlanRows,
  setComparePlanRes,
  prevSelectedPlans,
  setPrevSelectedPlans,
  budgetTableRef,
  setPlanBudgetData,
  originalColRefMapping,
  hiddenMetrics,
  setHiddenMetrics,
  setPlanRefColMapping,
  agTableRef
) => {
  setSelectedComparePlanRows([]);
  setPrevSelectedPlans([]);
  setComparePlanRes([]);
  const rmComparePlanForHiddenMetric = cloneDeep(hiddenMetrics);
  prevSelectedPlans.forEach((planCode) => {
    delete rmComparePlanForHiddenMetric[trackHiddenMetricOverallHierarchyKey][
      planCode
    ];
    delete rmComparePlanForHiddenMetric[trackHiddenMetricReferenceHierarchyKey][
      planCode
    ];
  });
  setHiddenMetrics(rmComparePlanForHiddenMetric);
  const tableRows = get(agTableRef, "current.props.rowData", []);
  const { originalCurrentPlan } = getCurPlanObjForCompReq(tableRows);
  const parsedData = parseBudgetTableResponseData(
    defaultMetrics,
    defaultBucket,
    {
      metrics: originalCurrentPlan,
      ref_col_mapping: originalColRefMapping,
    },
    hiddenMetrics,
    [],
    setPlanRefColMapping
  );
  setPlanBudgetData(parsedData);
};

export const getCsvParams = (columns, metrics_with_formatter) => {
  return {
    skipGroups: true,
    columnGroups: true,
    allColumns: false,
    columnKeys: columns,
    shouldRowBeSkipped(params) {
      if (params.node.id.includes("group")) {
        return true;
      }
      return false;
    },
    processCellCallback(params) {
      const dataValue = {
        ...params,
        data: params.node.data,
        colDef: params.column.colDef,
      };
      dataValue.column = {
        ...dataValue.column,
        multiplier: true,
      };
      const attribute = noEditableCustomCellRender(
        metrics_with_formatter,
        dataValue
      );
      return attribute;
    },
  };
};

/**
 * @function
 * @description Function to update the budget plan after changes
 */
export const updateBudgetTable = (
  payloadUpdateBudgetTable,
  setPayloadUpdateBudgetTable,
  props,
  showSnackMessage,
  filterArray,
  commonBudgetTableFetch,
  agTableRef,
  setCheckEopValChange,
  logoutAlert = {}
) => {
  props.setPlansmartBudgetUpdateLoader(true);
  let updateDataPayload = {
    level: { ...filterArray },
    plan_code: props.match.params.plancode,
    metrics: {
      ...payloadUpdateBudgetTable?.metrics,
    },
  };
  if (Object.keys(updateDataPayload?.metrics)?.length > 0) {
    let response = props.updateBudgetTableData(updateDataPayload);
    response
      .then((responseData) => {
        if (responseData.status) {
          // setPlanBudgetData(null);
          setPayloadUpdateBudgetTable(
            Object.assign(payloadUpdateBudgetTable, { metrics: {} })
          );
          showSnackMessage(
            "Plan updated successfully.",
            SNACK_VARIANT.SUCCESS,
            responseData
          );
          fetchMetricsFormulaForEditableMetrics(props);
          commonBudgetTableFetch();
          // if (setCheckEopValChange) setCheckEopValChange(true);
        }
        props.setPlansmartBudgetUpdateLoader(false);
        if (logoutAlert && logoutAlert.cb) {
          logoutAlert.cb();
        }
      })
      .catch((error) => {
        showSnackMessage(
          error?.response?.data?.detail || "Error in fetching plan details.",
          SNACK_VARIANT.ERROR,
          error?.response
        );
        props.setPlansmartBudgetUpdateLoader(false);
      });
  } else {
    props.setPlansmartBudgetUpdateLoader(false);
  }
};

// budget table fetching functionalities

export const fetchBudgetTableColumn = async (data) => {
  const {
    history,
    props,
    setPlanBudgetColumns,
    showSnackMessage,
    filtersForRows,
    setTabData,
    setActiveTab,
    setTabIndex,
    disableTabUpdate = false,
    editableMetricFormulas,
    agTableRef,
    planningScreenConfig,
    headerClasses,
    tempPlanDetails,
    plansmartConfigs,
    setIsMonthView,
  } = data;

  const bucket_keys = data?.bucket_keys;
  const action = props.match.params?.displayType === "view" ? "view" : "";
  const plancode = props.match.params.plancode;
  const validation = planningScreenConfig?.validation || {};
  props.setPlansmartBudgetFilterLoader(true);
  props.setPlanSmartBudgetTableColDefLoader(true);
  const useBudgetListData = get(
    plansmartConfigs,
    `useBudgetListData.${getPlanSmartSeasonType(tempPlanDetails?.status)}.${
      (tempPlanDetails || {})[plansmartConfigs.channelKey || ""] || ""
    }`,
    []
  );
  try {
    const details = await props.getPlanningTableColumns(plancode, action);
    details.data.data.forEach((item) => {
      if (item.column_name === "metric") {
        item.is_row_span = true;
      }
    });
    const tabsData = await props.getPlanHierarchies();
    let isMonthView = false;
    const showMonthView = plansmartConfigs.showMonthView || {};

    Object.keys(showMonthView).map((key) => {
      if (tempPlanDetails[key] && tempPlanDetails[key] === showMonthView[key]) {
        isMonthView = true;
        setIsMonthView(true);
      }
    });
    let tabInfo = await setFilterOptions(
      tabsData.data.data.level_info,
      plancode,
      props.getPlanFilterDropdownOptions,
      filtersForRows,
      tempPlanDetails
    );
    if (!disableTabUpdate) {
      let tabList = [];
      if (details.data.data?.plan_type === "bottom-up") {
        tabList = tabInfo?.reverse();
      } else tabList = tabInfo;
      let formattedTabList = tabList;
      for (let i = 0; i < tabList.length; i++) {
        if (validation?.multiply_selection_disable) {
          if (!!validation.multiply_selection_disable[tabList[i].column_name]) {
            const [tabData] = tabList.filter(
              (tabObj) =>
                tabObj.column_name ===
                validation.multiply_selection_disable[tabList[i].column_name]
            );
            if (tabData?.options?.length > 1) {
              formattedTabList = formattedTabList.filter(
                (tab) => !(tab.column_name === tabList[i].column_name)
              );
            }
          }
        }
        if (validation?.single_select_disable) {
          if (!!validation.single_select_disable[tabList[i].column_name]) {
            const column_name = tabList[i].column_name;
            const val = validation.single_select_disable;
            if (
              tempPlanDetails[val[column_name].id] === val[column_name].value
            ) {
              formattedTabList = formattedTabList.filter(
                (tab) => !(tab.column_name === column_name)
              );
            }
          }
        }
      }
      setTabData(formattedTabList);
    }
    let columns = details?.data.data.map((item) => {
      item.width = 170;
      if (!isMonthView) {
        item.width = 90;
      }
      if (isMonthView && item?.extra?.is_total) {
        //135 is default editable column width
        item.width = 135;
      }
      return item;
    });
    setActiveTab(tabInfo?.[0]?.id);
    setTabIndex(0);
    let {
      weekAggregationFormula,
      totalBucketAggregrationFormulas,
      firstLastBucketTotalColumn,
    } = props;
    columns = getColumns({
      weekAggregationFormula,
      totalBucketAggregrationFormulas,
      firstLastBucketTotalColumn,
      planBudgetColumn: columns,
      agTableRef,
      bucket_keys,
      headerClasses,
      isMonthView,
      useBudgetListData,
      plansmartConfigs,
      planDetails: tempPlanDetails,
    });
    setPlanBudgetColumns(columns);
    props.setPlansmartBudgetFilterLoader(false);
    props.setPlanSmartBudgetTableColDefLoader(false);
  } catch (error) {
    props.setPlansmartBudgetFilterLoader(false);
    props.setPlanSmartBudgetTableColDefLoader(false);

    showSnackMessage(
      error?.response?.data?.detail || "Error in fetching plan columns.",
      SNACK_VARIANT.ERROR,
      error?.response
    );
  }
};

export const fetchComparePlanFilterDef = async (
  props,
  plancode,
  setComparePlanFilterData,
  setComparePlanFilter,
  tenantFilterUamConfig
) => {
  props.setPlanSmartComparePlanFilterLoader(true);
  try {
    const filterData = await props.getComparePlanFilters(plancode);
    const fields = getAllDropdownValues(
      filterData.data.data.filters,
      true,
      tenantFilterUamConfig
    );
    fields
      .then((data) => {
        const selection = filterData?.data?.data?.selection;
        const selectedFilters = {
          ...filterData?.data?.data?.selection,
        };
        data?.forEach((field) => {
          if (field.accessor === "plan_period") {
            const startDate = moment(
              selection?.plan_period_sdate,
              "YYYY-MM-DD"
            );
            const endDate = moment(selection?.plan_period_edate, "YYYY-MM-DD");
            selectedFilters["plan_period"] = [startDate, endDate];
          } else if (
            field.isMulti === false &&
            Array.isArray(selection?.[field.accessor])
          ) {
            selectedFilters[field.accessor] = selection?.[field.accessor]?.[0];
          } else {
            selectedFilters[field.accessor] = selection?.[field.accessor];
          }
        });
        setComparePlanFilterData(selectedFilters);
        setComparePlanFilter(data);

        props.setPlanSmartComparePlanFilterLoader(false);
      })
      .catch(() => {
        props.setPlanSmartComparePlanFilterLoader(false);
      });
  } catch (error) {
    props.setPlanSmartComparePlanFilterLoader(false);
  }
};

export const fetchBudgetTableFn = async (
  props,
  disablePlanningScreen,
  plancode,
  setDisableAllOptions,
  setPlanDetails,
  showSnackMessage
) => {
  try {
    const details = await props.getPlanSmartPlanDetails(plancode);
    if (disablePlanningScreen.indexOf(details.data.data.status) > -1) {
      setDisableAllOptions(true);
    } else {
      setDisableAllOptions(false);
    }
    setPlanDetails(details.data.data);
    return details.data.data;
  } catch (error) {
    showSnackMessage(
      error?.response?.data?.detail || "Error in fetching plan data",
      SNACK_VARIANT.ERROR,
      error?.response
    );
  }
};

export const fetchMetricConfig = async (props, setMetricConfig) => {
  try {
    const config = await props.getMetricsConfig();
    setMetricConfig(config?.data?.data);
  } catch (error) {
    console.log(error);
  }
};
/**
 * @function
 * @description Function to get the metrics formula
 */

export const fetchMetricsFormulaForEditableMetrics = async (props) => {
  props?.setPlanSmartMetricFormulaLoader(true);
  try {
    const config = await props.fetchEditableMetricsFormula(
      props.planDetails.plan_code
    );
    props.setMetricsFormula(config?.data?.data);
  } catch (error) {
    console.log(error);
  }
  props?.setPlanSmartMetricFormulaLoader(false);
};

export const fetchBudgetTableData = async (dataTemp) => {
  const {
    props,
    planCode,
    pivotViewMode,
    filtersForRows,
    setCurrentConfig,
    setPlanBudgetData,
    setCurrentPlan,
    setWeekLevelKeys,
    setTargetsData,
    selectedComparePlanRows,
    showSnackMessage,
    setCompletePlanBudgetData,
    setPlanRefColMapping,
    setOriginalColRefMapping,
    setSelectedComparePlanRows,
    originalColRefMapping,
    prevSelectedPlans,
    setPrevSelectedPlans,
    setComparePlanRes,
    comparePlanRes,
    setComparePlanModal,
    planDetails,
    budgetTableRef,
    agTableRef,
    hiddenMetrics,
    skuViewMode,
  } = dataTemp;
  if (pivotViewMode) {
    return;
  }
  const postBody = {
    plan_code: planCode,
    level: {
      ...filtersForRows,
    },
  };
  // agTableRef?.current?.api.destroy();
  let details = props.fetchPlanBudgetDetails(postBody);
  // agTableRef?.current?.api.showLoadingOverlay();
  props.setPlansmartBudgetTableLoader(true);
  details
    .then(async (data) => {
      setCurrentConfig(data?.data?.data?.metrics);
      const budgetTableData = parseBudgetTableResponseData(
        props.defaultMetrics,
        props.defaultBucket,
        data?.data?.data,
        hiddenMetrics,
        [],
        setPlanRefColMapping
      );
      setPlanBudgetData(budgetTableData);
      setOriginalColRefMapping(data?.data?.data?.ref_col_mapping);
      setTargetsData(data?.data?.data?.targets);
      setCompletePlanBudgetData(cloneDeep(budgetTableData));
      setCurrentPlan(data?.data?.data || {});
      setWeekLevelKeys(data?.data?.data?.week_mapping);
      if (prevSelectedPlans.length > 0) {
        await handleImportPlan({
          selectedPlans: prevSelectedPlans,
          props,
          filtersForRows,
          setSelectedComparePlanRows,
          setComparePlanRes,
          comparePlanRes,
          setComparePlanModal,
          showSnackMessage,
          prevSelectedPlans: prevSelectedPlans,
          setPrevSelectedPlans,
          selectedComparePlanRows,
          planDetails,
          budgetTableRef,
          originalColRefMapping,
          setPlanBudgetData,
          fromTabChange: true,
          newTableData: data?.data?.data,
          hiddenMetrics,
          setPlanRefColMapping,
          agTableRef,
        });
      }
      // agTableRef?.current?.api?.hideOverlay();
      props.setPlansmartBudgetTableLoader(false);
    })
    .catch((error) => {
      props.setPlansmartBudgetTableLoader(false);
      setPlanBudgetData([]);
      showSnackMessage(
        error?.response?.data?.detail || "Error in fetching plan data",
        SNACK_VARIANT.ERROR,
        error?.response
      );
    });
};

// budget table calculations related functionalities.

export const totalValueGetter = (
  weekAggregationFormula,
  totalBucketAggregrationFormulas,
  firstLastBucketTotalColumn,
  params,
  agTableRef,
  bucket_keys,
  plansmartConfigs
) => {
  let rowData = [];
  const leafColumns = getFlattenColumn(params?.column, params);
  const leafWeekColumns = leafColumns.filter((col) =>
    isWeekNumber(col.accessor)
  );
  const columnExtra = getColumnExtra(params?.column);

  params?.api?.forEachNode((node) => {
    if (node.data) rowData.push(node.data);
  });
  /**
   * fixTo variable used to identify the number of decimal places that we need to show
   * example fixTo = 2 and value = 1.34367 then it will change to 1.34
   */
  const fixTo =
    params.api.gridOptionsWrapper.gridOptions.metrics_with_formatter[
      params.data.metricWithoutBucket
    ].fixTo;
  if (
    !params?.data?.reference.includes("variance") &&
    params?.data?.reference !== "variance_fcst" &&
    params?.data?.reference !== "rel_variance_fcst"
  ) {
    // common code
    let bucket_key = params?.data?.bucketKey;
    let metric_key_for_formula = params?.data.metricWithoutBucket;
    const useTotalAggCalcFunForTotalColumns =
      plansmartConfigs.useTotalAggCalcFunForTotalColumns || [];

    let useTotalAgg =
      bucket_key === "total" &&
      !(
        params.column.colId.toLowerCase().includes("total") &&
        firstLastBucketTotalColumn.indexOf(metric_key_for_formula) > -1
      );
    let totalCalcFormula = useTotalAgg
      ? totalBucketAggregrationFormulas[metric_key_for_formula]
      : weekAggregationFormula[metric_key_for_formula];
    if (totalCalcFormula) {
      totalCalcFormula = totalCalcFormula.replace(
        "num_of_weeks",
        leafWeekColumns.length
      );
    }
    let tableData = params.api.getModel().gridOptionsWrapper.gridOptions
      .rowData;
    let dataCalcTotal = getValueForFormula(
      tableData,
      totalCalcFormula,
      bucket_key,
      params?.column?.colId?.split("_")?.[0], // leaf keys to calc value
      params?.column?.colId,
      params,
      useTotalAggCalcFunForTotalColumns.indexOf(metric_key_for_formula) > -1 &&
        bucket_key === "total",
      leafColumns,
      columnExtra,
      bucket_keys,
      !useTotalAgg && bucket_key === "total"
    );
    Object.assign(params.data, {
      [params?.column?.colId]: dataCalcTotal,
    });
    agTableRef?.current?.api?.redrawRows({ rowNodes: params?.node });
    return dataCalcTotal;
  } else if (
    params?.data?.reference.includes("variance") &&
    params?.data?.reference !== "variance_fcst" &&
    params?.data?.reference !== "rel_variance_fcst"
  ) {
    const compareKey = getCompareKey(params?.data?.reference);
    let wpRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === "current" &&
        key.category === params?.data?.category &&
        !key?.comparePlan
    );
    /**
     * import SP plan, key will be current and variance
     * import lly, ly etc.. key will be compare_lly, variance_lly, compare_ly, variance_ly like that
     * if it is not a import plan and if it is variance then key will be compare
     */
    let lyValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference ===
          (params?.data?.reference === "variance"
            ? params?.data?.comparePlan
              ? !isNaN(Number(params?.data?.planCode))
                ? "current"
                : "compare"
              : "compare"
            : compareKey) &&
        key.category === params?.data?.category &&
        key?.comparePlan === params?.data?.comparePlan
    );

    let wpTotal = wpRowValue?.[params?.column?.colId];
    let lyTotal = lyValue?.[params?.column?.colId];

    let totalValue = varianceCalculationFunc(wpTotal, lyTotal, fixTo);
    Object.assign(params.data, {
      [params?.column?.colId]: checkFormatOfNumber(totalValue),
    });
    agTableRef?.current?.api?.redrawRows({ rowNodes: params?.node });
    return checkFormatOfNumber(totalValue);
  } else if (
    params?.data?.reference === "variance_fcst" ||
    params?.data?.reference === "rel_variance_fcst"
  ) {
    let wpRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === "current" &&
        key.category === params?.data?.category
    );
    let iafValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === getFcstKeyByVarFcst(params?.data?.reference) &&
        key.category === params?.data?.category &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const wpNode = params.api.getRowNode(wpRowValue?.uniqueId);
    const iafNode = params.api.getRowNode(iafValue?.uniqueId);
    const wpTotal = params.api?.getValue(params?.column?.colId, wpNode);
    const iafTotal = params.api?.getValue(params?.column?.colId, iafNode);
    let totalValue = varianceCalculationFunc(wpTotal, iafTotal, fixTo);
    Object.assign(params.data, {
      [params?.column?.colId]: checkFormatOfNumber(totalValue),
    });
    agTableRef?.current?.api?.redrawRows({ rowNodes: params?.node });
    return checkFormatOfNumber(totalValue);
  }
};

const getBucketTotal = (
  weekAggregationFormula,
  totalBucketAggregrationFormulas,
  params,
  bucket_keys,
  useBudgetListData,
  plansmartConfigs,
  planDetails
) => {
  let dataCalcTotal = 0;
  let column = params?.column?.colId;
  const columnExtra = getColumnExtra(params?.column);
  let rowData = params.api.getModel().gridOptionsWrapper.gridOptions.rowData;
  let bucket_key = params?.data?.bucketKey;
  let metric_key_for_formula = params?.data.metricWithoutBucket;
  const leafColumn = getFlattenColumn(params?.column, params);
  const leafWeekColumns = leafColumn.filter((col) =>
    isWeekNumber(col.accessor)
  );
  const allColumns = params?.column?.columnApi?.getAllColumns() || [];
  const allWeekColumns = allColumns.filter((columnObj) =>
    isWeekNumber(columnObj?.colId)
  );

  const channelKey = get(planDetails, get(plansmartConfigs, "channelKey"), "");

  const channelConfig = get(
    get(plansmartConfigs, "channelConfig", {}),
    channelKey,
    {}
  );

  /**
   * fixTo variable used to identify the number of decimal places that we need to show
   * example fixTo = 2 and value = 1.34367 then it will change to 1.34
   */
  const fixTo =
    params.api.gridOptionsWrapper.gridOptions.metrics_with_formatter[
      params.data.metricWithoutBucket
    ].fixTo;

  let totalCalcFormula =
    bucket_key === "total"
      ? totalBucketAggregrationFormulas[metric_key_for_formula]
      : weekAggregationFormula[metric_key_for_formula];
  if (totalCalcFormula) {
    totalCalcFormula = totalCalcFormula.replace(
      "num_of_weeks",
      leafWeekColumns.length
    );
  }
  if (
    useBudgetListData?.indexOf(params?.data?.metricWithoutBucket) > -1 &&
    params?.data?.reference === "current"
  ) {
    return params?.data?.[column];
  }
  if (
    !params?.data?.reference.includes("variance") &&
    params?.data?.metric.includes("total_") &&
    params?.data?.reference !== "forecasted"
  ) {
    if (bucket_key === "total")
      dataCalcTotal = getValueForFormula(
        rowData,
        totalCalcFormula,
        bucket_key,
        column?.split("_")?.[0],
        column,
        params,
        true,
        leafColumn,
        columnExtra,
        bucket_keys
      );
    else {
      let fp_clr_values = rowData.filter(
        (key) =>
          key?.metric?.includes(metric_key_for_formula) &&
          key.reference === params?.data?.reference &&
          key.category === params?.data?.category &&
          key.bucket_category === params?.data?.bucket_category &&
          (key.metric.includes("fp_") || key.metric.includes("clr_")) &&
          key?.comparePlan === params?.data?.comparePlan
      );
      dataCalcTotal = Object.keys(fp_clr_values).reduce(function (
        previous,
        key
      ) {
        return parseFloat(previous) + parseFloat(fp_clr_values[key]?.[column]);
      },
      0);
    }
    Object.assign(params?.data, {
      [column]: checkFormatOfNumber(dataCalcTotal),
    });
    return checkFormatOfNumber(dataCalcTotal);
  } else if (
    params?.data?.reference?.includes("variance") &&
    params?.data?.comparePlan &&
    params?.data?.reference !== "rel_variance_fcst" &&
    params?.data?.reference !== "variance_fcst"
  ) {
    const compareKey = getCompareKey(params?.data?.reference);
    let wpRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === "current" &&
        !key?.comparePlan
    );
    let lyRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference ===
          (params?.data?.reference === "variance" ? "current" : compareKey) &&
        key.comparePlan === params?.data?.comparePlan
    );
    const wpNode = params.api.getRowNode(wpRowValue?.uniqueId);
    const wpValue = params.api?.getValue(column, wpNode);
    const lyNode = params.api.getRowNode(lyRowValue?.uniqueId);
    const lyValue = params.api?.getValue(column, lyNode);
    return varianceCalculationFunc(wpValue, lyValue, fixTo);
  } else if (
    params?.data?.reference.includes("variance") &&
    params?.data?.reference !== "rel_variance_fcst" &&
    params?.data?.reference !== "variance_fcst" &&
    !params?.data?.metric.includes("total_") &&
    !params?.data?.comparePlan
  ) {
    const compareKey = getCompareKey(params?.data?.reference);
    let wpRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === "current" &&
        !key?.comparePlan
    );
    let lyRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference ===
          (params?.data?.reference === "variance" ? "compare" : compareKey) &&
        !key.comparePlan
    );

    const wpNode = params.api.getRowNode(wpRowValue?.uniqueId);
    const wpValue = params.api?.getValue(column, wpNode);
    const lyNode = params.api.getRowNode(lyRowValue?.uniqueId);
    const lyValue = params.api?.getValue(column, lyNode);
    let wpData = checkFormatOfNumber(wpValue);
    let lyData = checkFormatOfNumber(lyValue);
    return varianceCalculationFunc(wpData, lyData, fixTo);
  } else if (
    params?.data?.reference.includes("variance") &&
    params?.data?.metric.includes("total_") &&
    params?.data?.reference !== "rel_variance_fcst" &&
    params?.data?.reference !== "variance_fcst"
  ) {
    /**
     * fixTo variable used to identify the number of decimal places that we need to show
     * example fixTo = 2 and value = 1.34367 then it will change to 1.34
     */
    const fixTo =
      params.api.gridOptionsWrapper.gridOptions.metrics_with_formatter[
        params.data.metricWithoutBucket
      ].fixTo;

    const compareKey = getCompareKey(params?.data?.reference);
    let wpRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === "current" &&
        key.category === params?.data?.category &&
        key?.comparePlan === params?.data?.comparePlan
    );
    let lyRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === compareKey &&
        key.category === params?.data?.category &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const wpNode = params.api.getRowNode(wpRowValue?.uniqueId);
    const wpValue = params.api?.getValue(column, wpNode);
    const lyNode = params.api.getRowNode(lyRowValue?.uniqueId);
    const lyValue = params.api?.getValue(column, lyNode);
    return varianceCalculationFunc(wpValue, lyValue, fixTo);
  }
  // value getter for variance forecast row, irrespective of bucket.
  else if (
    params?.data?.reference === "variance_fcst" ||
    params?.data?.reference === "rel_variance_fcst"
  ) {
    let wpRowValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === "current" &&
        !key?.comparePlan
    );
    let forecastedValue = rowData.find(
      (key) =>
        key.metric === params?.data?.metric &&
        key.reference === getFcstKeyByVarFcst(params?.data?.reference) &&
        key?.comparePlan === params?.data?.comparePlan
    );

    const wpNode = params.api.getRowNode(wpRowValue?.uniqueId);
    const wpValue = params.api?.getValue(column, wpNode);
    const forcastedNode = params.api.getRowNode(forecastedValue?.uniqueId);
    const forcastedValue = params.api?.getValue(column, forcastedNode);

    return varianceCalculationFunc(wpValue, forcastedValue, fixTo);
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    (params?.data?.metricWithoutBucket === "bop_units" ||
      params?.data?.metricWithoutBucket === "bop_cost") &&
    !params?.data?.comparePlan
  ) {
    const currentColInx = allWeekColumns.findIndex((colObj) => {
      return column === colObj?.colId;
    });

    if (currentColInx >= 0) {
      if (currentColInx === 0) {
        return params?.data?.[column];
      } else {
        const eopKey =
          params?.data?.metricWithoutBucket === "bop_units"
            ? "eop_units"
            : "eop_cost";
        const bopWpRow = rowData.find(
          (key) =>
            key.metric === `${params?.data?.bucketKey}_${eopKey}` &&
            key.reference === "current" &&
            key?.comparePlan === params?.data?.comparePlan
        );
        const bopNode = params.api.getRowNode(bopWpRow?.uniqueId);
        const bopValue = params.api?.getValue(
          allWeekColumns[currentColInx - 1]?.colId,
          bopNode
        );
        let bopData = checkFormatOfNumber(bopValue);
        return bopData;
      }
    }
    return params?.data?.[column];
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    (params?.data?.metricWithoutBucket === "eop_units" ||
      params?.data?.metricWithoutBucket === "eop_cost") &&
    !params?.data?.comparePlan
  ) {
    const currentColInx = allWeekColumns.findIndex((colObj) => {
      return column === colObj?.colId;
    });

    if (currentColInx >= 0) {
      const bopKey =
        params?.data?.metricWithoutBucket === "eop_units"
          ? "bop_units"
          : "bop_cost";
      const rcptKey =
        params?.data?.metricWithoutBucket === "eop_units"
          ? "rcpt_units"
          : "rcpt_cost";

      let qtyOrCost =
        params?.data?.metricWithoutBucket === "eop_units" ? "qty" : "cost";

      if (channelConfig[params?.data?.metricWithoutBucket]) {
        if (channelConfig[params?.data?.metricWithoutBucket][qtyOrCost]) {
          qtyOrCost =
            channelConfig[params?.data?.metricWithoutBucket][qtyOrCost];
        }
      }

      const adjKey =
        params?.data?.metricWithoutBucket === "eop_units"
          ? "adj_units"
          : "adj_cost";
      const bopWpRow = rowData.find(
        (key) =>
          key.metric === `${params?.data?.bucketKey}_${bopKey}` &&
          key.reference === "current" &&
          key?.comparePlan === params?.data?.comparePlan
      );
      const recptWpRow = rowData.find(
        (key) =>
          key.metric === `${params?.data?.bucketKey}_${rcptKey}` &&
          key.reference === "current" &&
          key?.comparePlan === params?.data?.comparePlan
      )?.[column];
      const qtyWpRow = rowData.find(
        (key) =>
          key.metric === `${params?.data?.bucketKey}_${qtyOrCost}` &&
          key.reference === "current" &&
          key?.comparePlan === params?.data?.comparePlan
      )?.[column];
      const adjUnitsWpRow = rowData.find(
        (key) =>
          key.metric === `${params?.data?.bucketKey}_${adjKey}` &&
          key.reference === "current" &&
          key?.comparePlan === params?.data?.comparePlan
      )?.[column];
      const bopNode = params.api.getRowNode(bopWpRow?.uniqueId);
      const bopValue = params.api?.getValue(column, bopNode);
      let bopData = checkFormatOfNumber(bopValue);
      return checkFormatOfNumber(
        bopData + recptWpRow - qtyWpRow - adjUnitsWpRow
      );
    }
    return params?.data?.[column];
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    (params?.data?.metricWithoutBucket === "bop_auc" ||
      params?.data?.metricWithoutBucket === "eop_auc") &&
    !params?.data?.comparePlan
  ) {
    const currentColInx = allWeekColumns.findIndex((colObj) => {
      return column === colObj?.colId;
    });
    if (currentColInx >= 0) {
      const cost =
        params?.data?.metricWithoutBucket === "bop_auc"
          ? "bop_cost"
          : "eop_cost";
      const units =
        params?.data?.metricWithoutBucket === "bop_auc"
          ? "bop_units"
          : "eop_units";
      const costWpRow = rowData.find(
        (key) =>
          key.metric === `${params?.data?.bucketKey}_${cost}` &&
          key.reference === "current" &&
          key?.comparePlan === params?.data?.comparePlan
      );
      const unitsWpRow = rowData.find(
        (key) =>
          key.metric === `${params?.data?.bucketKey}_${units}` &&
          key.reference === "current" &&
          key?.comparePlan === params?.data?.comparePlan
      );
      const costNode = params.api.getRowNode(costWpRow?.uniqueId);
      const costValue = params.api?.getValue(column, costNode);
      const costData = checkFormatOfNumber(costValue);
      const unitsNode = params.api.getRowNode(unitsWpRow?.uniqueId);
      const unitsValue = params.api?.getValue(column, unitsNode);
      const unitsData = checkFormatOfNumber(unitsValue);
      return checkFormatOfNumber(costData / unitsData);
    }
    return params?.data?.[column];
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    params?.data?.metricWithoutBucket === "avg_inv" &&
    !params?.data?.comparePlan
  ) {
    const bopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_bop_units` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const eopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_eop_units` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const bopNode = params.api.getRowNode(bopWpRow?.uniqueId);
    const bopValue = params.api?.getValue(column, bopNode);
    const eopNode = params.api.getRowNode(eopWpRow?.uniqueId);
    const eopValue = params.api?.getValue(column, eopNode);
    let bopData = checkFormatOfNumber(bopValue);
    let eopData = checkFormatOfNumber(eopValue);
    return checkFormatOfNumber((bopData + eopData) / 2);
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    params?.data?.metricWithoutBucket === "st_perc" &&
    !params?.data?.comparePlan
  ) {
    const qtyWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_qty` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    )?.[column];
    const eopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_eop_units` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const eopNode = params.api.getRowNode(eopWpRow?.uniqueId);
    const eopValue = params.api?.getValue(column, eopNode);
    let eopData = checkFormatOfNumber(eopValue);
    return checkFormatOfNumber((qtyWpRow * 100) / (qtyWpRow + eopData));
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    params?.data?.metricWithoutBucket === "wos" &&
    !params?.data?.comparePlan
  ) {
    const qtyWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_qty` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    )?.[column];
    const bopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_bop_units` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const rcptUnitsRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_rcpt_units` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const adjUnitsRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_adj_units` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const bopNode = params.api.getRowNode(bopWpRow?.uniqueId);
    const bopValue = params.api?.getValue(column, bopNode);
    const rcptUnitsNode = params.api.getRowNode(rcptUnitsRow?.uniqueId);
    const rcptUnitsValue = params.api?.getValue(column, rcptUnitsNode);
    const adjUnitsNode = params.api.getRowNode(adjUnitsRow?.uniqueId);
    const adjUnitsValue = params.api?.getValue(column, adjUnitsNode);
    let bopData = checkFormatOfNumber(bopValue);
    let rcptUnitsData = checkFormatOfNumber(rcptUnitsValue);
    let adjUnitsData = checkFormatOfNumber(adjUnitsValue);
    return checkFormatOfNumber(
      (bopData + rcptUnitsData - adjUnitsData) / qtyWpRow
    );
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    (params?.data?.metricWithoutBucket === "turn_cost" ||
      params?.data?.metricWithoutBucket === "turn_units") &&
    !params?.data?.comparePlan
  ) {
    const qtyOrCostKey =
      params?.data?.metricWithoutBucket === "turn_cost" ? "cost" : "qty";
    const bopKey =
      params?.data?.metricWithoutBucket === "turn_cost"
        ? "bop_cost"
        : "bop_units";
    const eopKey =
      params?.data?.metricWithoutBucket === "turn_cost"
        ? "eop_cost"
        : "eop_units";
    const qtyOrCostWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_${qtyOrCostKey}` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const bopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_${bopKey}` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const eopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_${eopKey}` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const qtyOrCostNode = params.api.getRowNode(qtyOrCostWpRow?.uniqueId);
    const qtyORCostValue = params.api?.getValue(column, qtyOrCostNode);
    const bopNode = params.api.getRowNode(bopWpRow?.uniqueId);

    const eopNode = params.api.getRowNode(eopWpRow?.uniqueId);
    const eopValue = params.api?.getValue(column, eopNode);
    const bopData = checkFormatOfNumber(params.api?.getValue(column, bopNode));
    const qtyOrCostData = checkFormatOfNumber(qtyORCostValue);
    const eopData = checkFormatOfNumber(eopValue);
    return checkFormatOfNumber(qtyOrCostData / ((bopData + eopData) / 2));
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    params?.data?.metricWithoutBucket === "gmroi" &&
    !params?.data?.comparePlan
  ) {
    const marginWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_margin` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const bopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_bop_cost` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const eopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_eop_cost` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const marginNode = params.api.getRowNode(marginWpRow?.uniqueId);
    const marginValue = params.api?.getValue(column, marginNode);
    const bopNode = params.api.getRowNode(bopWpRow?.uniqueId);
    const eopNode = params.api.getRowNode(eopWpRow?.uniqueId);
    const eopValue = params.api?.getValue(column, eopNode);
    const bopData = checkFormatOfNumber(params.api?.getValue(column, bopNode));
    const marginData = checkFormatOfNumber(marginValue);
    const eopData = checkFormatOfNumber(eopValue);
    return checkFormatOfNumber(marginData / ((bopData + eopData) / 2));
  } else if (
    params?.data?.reference === "current" &&
    !params?.data?.metric.includes("total_") &&
    (params?.data?.metricWithoutBucket === "otb_lf" ||
      params?.data?.metricWithoutBucket === "otb_op") &&
    !params?.data?.comparePlan
  ) {
    const otbKey =
      params?.data?.metricWithoutBucket === "otb_lf"
        ? "eop_cost_lf"
        : "eop_cost_op";
    const otbWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_${otbKey}` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const eopWpRow = rowData.find(
      (key) =>
        key.metric === `${params?.data?.bucketKey}_eop_cost` &&
        key.reference === "current" &&
        key?.comparePlan === params?.data?.comparePlan
    );
    const otbNode = params.api.getRowNode(otbWpRow?.uniqueId);
    const otbValue = params.api?.getValue(column, otbNode);
    const eopNode = params.api.getRowNode(eopWpRow?.uniqueId);
    const eopValue = params.api?.getValue(column, eopNode);
    const eopData = checkFormatOfNumber(eopValue);
    const otbData = checkFormatOfNumber(otbValue);
    return checkFormatOfNumber(eopData - otbData);
  } else {
    return checkFormatOfNumber(params?.data?.[column]);
  }
};

const parseFormulaForBucket = (
  params,
  formulaTemp,
  rowData,
  metric,
  column
) => {
  let splittedFormula = formulaTemp?.split(/([\+\-\*\(\)\[\]\/])/),
    formulaSolved = "";

  let formulaForCalc = [];
  if (splittedFormula && splittedFormula?.length > 0) {
    splittedFormula?.forEach((symb, index) => {
      if (
        symb === "(" &&
        formulaForCalc?.[formulaForCalc.length - 1]?.match(/[a-z]/i)
      ) {
        formulaForCalc.push("*");
        formulaForCalc.push(symb);
      } else if (
        symb === ")" &&
        index !== splittedFormula.length - 1 &&
        !splittedFormula[index++]
      ) {
        formulaForCalc.push(symb);
        formulaForCalc.push("*");
      } else {
        formulaForCalc.push(symb);
      }
    });
    formulaForCalc = formulaForCalc.filter(Boolean);
    formulaForCalc.forEach((element) => {
      if (element?.match(/[a-z]/i)) {
        if (metricKeysList.indexOf(element) > -1) {
          let fp_metric = "fp_".concat(element);
          let clr_metric = "clr_".concat(element);
          let fp_clr_values = rowData.filter(
            (key) =>
              (fp_metric === key.metric || clr_metric === key.metric) &&
              key.reference === params?.data?.reference &&
              (key.metric.includes("fp_") || key.metric.includes("clr_")) &&
              !key.comparePlan
          );
          let dataCalcTotal =
            fp_clr_values?.length > 0
              ? Object.keys(fp_clr_values)?.reduce(function (previous, key) {
                  return (
                    parseFloat(previous) +
                    parseFloat(fp_clr_values[key]?.[column])
                  );
                }, 0)
              : 0;
          formulaSolved += dataCalcTotal;
        } else {
          formulaSolved += 1;
        }
      } else {
        formulaSolved += element;
      }
    });
    return formulaSolved;
  } else return 0;
};

const getBucketKey = (metricWithBucket, metricWithoutBucket = "") =>
  metricWithBucket.replace(`_${metricWithoutBucket}`, "");

const addMetricsWithBucket = (metric, bucket_key = "") =>
  bucket_key.concat(`_${metric}`);

/* function to modify other related cells, based on current cell modification.
  1. Save the currently modified columnId and perfor m the following steps, except for the saved columnID state.  - done 
  2. Get the reference and metric of current row, oldValue, newValue, columnId. - done.
  3. Calculate the other same metric data first, like if current of sales_$ is modified then calulated these values. 
  4. calculate the total for these rows. 
  5. get the rows which are dependent on formula, say margin is dependent on sales_$ modification , apply formula and recalculate total. 
*/

export const calculateTotalForBudgetTable = (row) => {
  let totalMonth = {},
    total = 0;
  Object.keys(row).forEach((prop) => {
    if (
      monthList.some(
        (v) => prop.includes(v) && !prop.toLowerCase().includes("total")
      )
    ) {
      let month = prop.split("_week")[0];
      total += row[prop];
      const totalVar = `${month}_total`;

      if (totalMonth[totalVar] === undefined) {
        totalMonth[totalVar] = 0;
      }
      //  get total for all the weeks level;
      totalMonth[totalVar] += row[prop];
    }
    return totalMonth;
  });
  return { total: total, ...totalMonth };
};

const getValueForMetrics = async (
  tempFormula,
  key,
  tempDataCloned,
  varianceOrCurrent,
  columnId,
  bucket_key,
  newValue,
  oldValue
) => {
  return new Promise((resolve, reject) => {
    let splittedFormula = tempFormula[key]?.formula?.split(
        /([\+\-\*\(\)\[\]\/])/
      ),
      formulaSolved = "";
    let formulaForCalc = [];
    splittedFormula?.forEach((symb, index) => {
      if (
        symb === "(" &&
        formulaForCalc?.[formulaForCalc.length - 1]?.match(/[a-z]/i)
      ) {
        formulaForCalc.push("*");
        formulaForCalc.push(symb);
      } else if (
        symb === ")" &&
        index !== splittedFormula.length - 1 &&
        !splittedFormula[index++]
      ) {
        formulaForCalc.push(symb);
        formulaForCalc.push("*");
      } else {
        formulaForCalc.push(symb);
      }
    });
    formulaForCalc = formulaForCalc.filter(Boolean);
    if (formulaForCalc)
      for (let str of formulaForCalc) {
        let mtrc = str.replace(" ", "");
        if (mtrc?.match(/[a-z]/i)) {
          if (str === "scaling_factor") {
            formulaSolved += newValue / oldValue;
          } else {
            let temp = findValueByKeyForMetricData(
              tempDataCloned,
              mtrc,
              varianceOrCurrent,
              columnId,
              bucket_key
            )?.[mtrc];
            if (
              temp === undefined ||
              temp === null ||
              isNaN(temp) ||
              temp === ""
            ) {
              formulaSolved += 0;
            } else formulaSolved += temp < 0 ? "(" + temp + ")" : temp; // temperory fix
          }
        } else formulaSolved += mtrc;
      }
    return resolve(formulaSolved);
  }).then((value) => value);
};

const findValueByKeyForMetricData = (
  data,
  str,
  varianceOrCurrent,
  columnId,
  bucket_key
) => {
  let foundValues = {};
  Object.keys(data).find((_obj) => {
    let metricKey = bucket_key.concat("_").concat(str);
    if (
      _obj &&
      data?.[_obj] &&
      data[_obj].metric === metricKey &&
      data[_obj].reference === varianceOrCurrent
    ) {
      foundValues[str] = data[_obj][columnId];
    }
  });
  return foundValues;
};

const updateBudgetTablePayload = async (
  payloadForBudgetTableData,
  newValue,
  oldValue,
  metric,
  columnId,
  setPayloadUpdateBudgetTable
) => {
  if (!columnId?.toLowerCase().includes("total") && !isUndefined(oldValue))
    if (payloadForBudgetTableData?.metrics?.[metric]?.[columnId]) {
      let oldValue =
        payloadForBudgetTableData?.metrics[metric]?.[columnId]?.[0];
      Object.assign(payloadForBudgetTableData?.metrics[metric]?.[columnId], [
        oldValue,
        newValue,
      ]);
    } else if (payloadForBudgetTableData?.metrics?.[metric]) {
      Object.assign(payloadForBudgetTableData.metrics?.[metric], {
        [columnId]: [oldValue, newValue],
      });
    } else if (payloadForBudgetTableData) {
      Object.assign(payloadForBudgetTableData?.metrics, {
        [metric]: { [columnId]: [oldValue, newValue] },
      });
    }
  // this we will remove after the testing is done for editable metrics calc.
  // console.log(payloadForBudgetTableData, "payloadForBudgetTableData");
  await setPayloadUpdateBudgetTable(payloadForBudgetTableData);
};
// Functionality return a row, if updateflag is false, otherwise set the value and return row.
const updateOrReturnValueInTable = (
  params,
  metric,
  col,
  value,
  reference,
  updateRow
) => {
  let nodeEx = {};
  params?.current?.api?.forEachNode((node) => {
    let rowNode = node?.data;
    if (rowNode?.metric === metric && rowNode?.reference === reference) {
      if (updateRow) {
        node.setDataValue(col, value);
        params?.current?.api.flashCells({
          rowNodes: [node],
        });
      }
      nodeEx = node;
    }
  });
  return nodeEx;
};

const findTheWeekLevelMappingSortedMonth = (firstOrLast, allColumns) => {
  if (allColumns) {
    const allWeekColumns = allColumns
      ?.filter(
        (columnObj) =>
          isWeekNumber(columnObj?.accessor) || isWeekNumber(columnObj?.colId)
      )
      ?.sort(
        (a, b) =>
          parseInt(a?.accessor || a?.colId) - parseInt(b?.accessor || b?.colId)
      );
    switch (firstOrLast) {
      case "first": {
        return allWeekColumns[0]?.accessor || allWeekColumns[0]?.colId;
      }
      case "last": {
        return (
          allWeekColumns[allWeekColumns.length - 1]?.accessor ||
          allWeekColumns[allWeekColumns.length - 1]?.colId
        );
      }
    }
  }
};

export const checkFormatOfNumber = (value) => {
  if (
    isUndefined(value) ||
    isNaN(value) ||
    value === Infinity ||
    value === -Infinity ||
    value === ""
  ) {
    return 0;
  } else if (typeof value === "string") {
    if (
      eval(value) === Infinity ||
      eval(value) === null ||
      eval(value) === -Infinity ||
      eval(value) === 0 ||
      isNaN(eval(value))
    )
      return 0;
    else {
      return eval(value);
    }
  } else if (value === 0) return 0;
  else return value;
};

const getNewNumberForMetric = (
  allData,
  oldValue,
  value,
  metric,
  totalMinusValue,
  metric_value,
  bucket_key,
  leafColumns,
  column,
  agTableRef,
  leafColumn
) => {
  let columnId = column?.colId;
  if (allData)
    if (!["aur", "auc", "margin_per"].includes(metric)) {
      let proportionateNumber =
        (metric_value / (oldValue - totalMinusValue)) * 100;
      return isNaN(proportionateNumber)
        ? 0.000001
        : (proportionateNumber * (value - totalMinusValue)) / 100;
    } else {
      if (metric === "aur") {
        let locked_sales_total = 0,
          total_sales = 0,
          unlocked_sales_total = 0;
        // AUR =  (((new AUR/old AUR)*total sales)-sales for locked week)/(total sales for unlocked week)
        let locked_sales_row = allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (item_metric === "sales" && item?.bucketKey === bucket_key)
            return item;
        })?.[0];
        leafColumns?.reduce((prev, curr) => {
          if (
            locked_sales_row?.cellLocked?.[curr.accessor] === true &&
            // curr.includes(month) &&
            isWeekNumber(curr.accessor)
          ) {
            locked_sales_total =
              locked_sales_row[curr.accessor] + locked_sales_total;
          }
          // curr.includes(month)
          if (isWeekNumber(curr.accessor)) {
            total_sales = total_sales + locked_sales_row[curr.accessor];
          }
        }, 0);
        let proportionateNumber =
          ((value / oldValue) * total_sales - locked_sales_total) /
          (total_sales - locked_sales_total);
        return isNaN(proportionateNumber)
          ? 1
          : proportionateNumber * metric_value;
      }
      if (metric === "auc") {
        let locked_cost_total = 0,
          total_cost = 0,
          unlocked_cost_total = 0;
        // AUC =  scaling factor = (((new AUC/old AUC)*total cost)-cost for locked week)/(total cost for unlocked week)
        let locked_cost_row = allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (item_metric === "cost" && item?.bucketKey === bucket_key)
            return item;
        })?.[0];
        leafColumns?.reduce((prev, curr) => {
          if (
            locked_cost_row?.cellLocked?.[curr.accessor] === true &&
            // curr.includes(month) &&
            isWeekNumber(curr.accessor)
          ) {
            locked_cost_total =
              locked_cost_row[curr.accessor] + locked_cost_total;
          }
          if (
            isWeekNumber(curr.accessor) &&
            !locked_cost_row?.cellLocked?.[curr.accessor]
          ) {
            unlocked_cost_total =
              unlocked_cost_total + locked_cost_row[curr.accessor];
          }
          if (isWeekNumber(curr.accessor)) {
            total_cost = total_cost + locked_cost_row[curr.accessor];
          }
        }, 0);

        let proportionateNumber =
          ((value / oldValue) * total_cost - locked_cost_total) /
          (total_cost - locked_cost_total);
        return isNaN(proportionateNumber)
          ? 1
          : proportionateNumber * metric_value;
      }
      if (metric === "margin_per") {
        const temp_cloned_allData = cloneDeep(allData);
        let margin_per_row = temp_cloned_allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (item_metric === "margin_per" && item?.bucketKey === bucket_key)
            return item;
        })?.[0];
        let sales_per_row = temp_cloned_allData?.filter((item) => {
          if (
            item.metricWithoutBucket === "qty" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];
        let unlocked_margin_per_total = 0,
          unlocked_sales_row_total = 0,
          total_sales_per_row = 0;
        leafColumns?.reduce((prev, curr) => {
          if (
            isWeekNumber(curr.accessor) &&
            !margin_per_row?.cellLocked?.[curr.accessor]
          ) {
            unlocked_margin_per_total =
              unlocked_margin_per_total + margin_per_row[curr.accessor];
            unlocked_sales_row_total =
              unlocked_sales_row_total + sales_per_row[curr.accessor];
          }
          if (isWeekNumber(curr.accessor)) {
            total_sales_per_row =
              total_sales_per_row + sales_per_row[curr.accessor];
          }
        });

        let aur_row = temp_cloned_allData?.filter((item) => {
          if (
            item.metricWithoutBucket === "aur" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];

        let auc_row = temp_cloned_allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (item_metric === "auc" && item?.bucketKey === bucket_key) {
            return item;
          }
        })?.[0];
        let auc_node = updateOrReturnValueInTable(
          agTableRef,
          addMetricsWithBucket("auc", bucket_key),
          columnId,
          null,
          "current",
          false
        );
        //(  (  ( (  1+(  ( (1-old total GM%)/(1-new total GM%)  )*old total sales- old total sales   )/(sum of unlocked sales)  )*old week AUR  ) - week AUC  )  /
        // (    (1+(  (  (1-old total GM%) / ( 1-new total GM%)  )old total sales- old total sales  )/  (sum of unlocked sales)  ) * old week AUR    )
        // (  (old week AUR)  /  (old AUR-week AUC)  ) )* old week GM%
        return (
          (1 +
            (((1 - oldValue) / (1 - value)) * total_sales_per_row -
              total_sales_per_row) /
              unlocked_sales_row_total) *
            aur_row[leafColumn] -
          auc_row[leafColumn] /
            ((1 +
              ((((1 - oldValue) / (1 - value)) * sales_per_row[leafColumn] -
                sales_per_row[columnId]) /
                unlocked_sales_row_total) *
                aur_row[columnId] *
                (aur_row[columnId] /
                  (aur_row[leafColumn] - auc_row[leafColumn]))) *
              oldValue)
        );
      }
    }
};

const getValueForFormula = (
  rowData = [],
  formulaTemp,
  bucket,
  month,
  column,
  params,
  weekLevelColumn,
  leafColumns = [],
  columnExtra,
  bucket_keys,
  doTotalBucket = false
) => {
  // sum(qty)/sum(sales)
  let formula = formulaTemp?.split(/([\+\-\*\(\)\[\]\/])/)?.filter((n) => n);
  // any operator but which is singular i.e, sum(qty)/sum(sales) => sum(qty) and sum(sales)
  let startIndex, endIndex;
  if (formulaTemp)
    formula?.forEach((element, index) => {
      if (typeOfFunctions.includes(element)) {
        startIndex = index;
        endIndex = null;
      } else if (element === ")") {
        endIndex = index + 1;
        if (endIndex || startIndex === 0) {
          const subFormula = formula.slice(startIndex, endIndex).join("");
          let value = getValuesForBucket(
            rowData,
            formula[startIndex],
            subFormula,
            bucket,
            month,
            column,
            params,
            weekLevelColumn,
            leafColumns,
            columnExtra,
            bucket_keys,
            doTotalBucket
          );
          formulaTemp = formulaTemp.replace(subFormula, value);
        }
        endIndex = null;
        startIndex = null;
      }
    });
  else {
    return 0;
  }
  return checkFormatOfNumber(formulaTemp);
};

// this would need more of optimization
const getValuesForBucket = (
  rowData,
  operationToDo,
  tempFormula,
  bucket,
  month,
  column,
  params,
  weekLevelColumn,
  leafColumns,
  columnExtra,
  bucket_keys,
  doTotalBucket = false
) => {
  const is53Week = columnExtra?.is53Week;
  var regExp = /\(([^)]+)\)/;
  var matches = regExp.exec(tempFormula);
  let subFormulaSplit = matches?.[1]?.split(/([\+\-\*\(\)\[\]\/])/);
  if (weekLevelColumn)
    return getWeekLevelDataForBucket(
      bucket,
      subFormulaSplit,
      column,
      operationToDo,
      rowData,
      params,
      true,
      leafColumns,
      columnExtra,
      bucket_keys,
      doTotalBucket
    );
  else {
    return getWeekLevelDataForBucket(
      bucket,
      subFormulaSplit,
      column,
      operationToDo,
      rowData,
      params,
      false,
      leafColumns,
      columnExtra,
      bucket_keys,
      doTotalBucket
    );
  }
};

const getWeekLevelDataForBucket = (
  bucket,
  formula,
  column,
  typeOfCalc,
  rowData,
  params,
  weekLevelBucketTotal,
  leafColumns,
  columnExtra,
  bucket_keys,
  doTotalBucket
) => {
  // month level total columns
  if (weekLevelBucketTotal) {
    let finalFormula = [];
    let temp_buckets_to_loop =
      params?.data?.metric.includes("total") && !doTotalBucket
        ? bucket_keys
        : [bucket.concat("_")];
    temp_buckets_to_loop?.forEach((node, index) => {
      let tempValueForMetric = [];
      if (typeOfCalc === "sum") {
        if (!node?.toLowerCase().includes("total") || doTotalBucket) {
          formula.forEach((metrics) => {
            if (metricKeysList.includes(metrics) || doTotalBucket) {
              // TODO: optimize the bucket concat function
              let bucketMetric = addMetricsWithBucket(metrics, node);
              let bucketMetricData = rowData.find(
                (ele) =>
                  ele.metric === bucketMetric &&
                  ele.reference === params?.data?.reference &&
                  ele?.comparePlan === params?.data?.comparePlan
              );
              const rowNode = params.api.getRowNode(bucketMetricData?.uniqueId);
              const value = params.api?.getValue(column, rowNode) || 0;
              tempValueForMetric.push(checkFormatOfNumber(value));
            } else tempValueForMetric.push(metrics);
          });
        }
      } else if (typeOfCalc === "first" || typeOfCalc === "last") {
        if (!node?.toLowerCase().includes("total") || doTotalBucket) {
          const colId = findTheWeekLevelMappingSortedMonth(
            typeOfCalc,
            leafColumns
          );
          formula.forEach((metrics) => {
            if (metricKeysList.includes(metrics)) {
              let bucketMetric = addMetricsWithBucket(metrics, node);
              let bucketMetricData = rowData.find(
                (ele) =>
                  ele.metric === bucketMetric &&
                  ele.reference === params?.data?.reference &&
                  ele?.comparePlan === params?.data?.comparePlan
              );
              const bucketMetricNode = params.api.getRowNode(
                bucketMetricData?.uniqueId
              );
              const bucketMetricValue = params.api?.getValue(
                colId,
                bucketMetricNode
              );
              tempValueForMetric.push(checkFormatOfNumber(bucketMetricValue));
            }
          });
        }
      }
      if (tempValueForMetric?.length > 0)
        finalFormula.push(checkFormatOfNumber(tempValueForMetric.join("")));
    });
    return checkFormatOfNumber(finalFormula.reduce((a, b) => a + b, 0));
  } else {
    // bucket level week value
    let finalFormula = [],
      tempMonth = column?.split("_")?.[0];
    let allTheMonths = leafColumns?.filter(
      (ele) =>
        isWeekNumber(ele.accessor) &&
        (columnExtra?.is53Week ? true : !ele?.extra.is53Week)
    );
    let temp_buckets_to_loop =
      params?.data?.metric.toLowerCase().includes("total") && !doTotalBucket
        ? bucket_keys
        : [bucket];
    if (typeOfCalc === "sum") {
      allTheMonths?.map((month) => {
        temp_buckets_to_loop?.forEach((node, index) => {
          let tempValueForMetric = [];
          if (!node.toLowerCase().includes("total") || doTotalBucket) {
            formula.forEach((metrics) => {
              if (metricKeysList.includes(metrics)) {
                let bucketMetric = addMetricsWithBucket(metrics, node); // node = clr_, metrics = build_aur, => clr_build_aur
                const rowObj = rowData.find(
                  (ele) =>
                    ele.metric === bucketMetric &&
                    ele.reference === params?.data?.reference &&
                    ele?.comparePlan === params?.data?.comparePlan
                );
                const rowNode = params.api.getRowNode(rowObj?.uniqueId);
                const value = params.api?.getValue(month.accessor, rowNode);
                let bucketMetricData = checkFormatOfNumber(value);
                tempValueForMetric.push(bucketMetricData);
              } else tempValueForMetric.push(metrics);
            });
            finalFormula.push(checkFormatOfNumber(tempValueForMetric));
          }
          // max, min, avg
        });
      });
    }

    if (typeOfCalc === "first" || typeOfCalc === "last") {
      temp_buckets_to_loop?.forEach((node, index) => {
        let tempValueForMetric = [];
        if (!node?.toLowerCase().includes("total") || doTotalBucket) {
          const colId = findTheWeekLevelMappingSortedMonth(
            typeOfCalc,
            leafColumns
          );
          formula.forEach((metrics) => {
            if (metricKeysList.includes(metrics)) {
              let bucketMetric = addMetricsWithBucket(metrics, node);
              let bucketMetricData = rowData.find(
                (ele) =>
                  ele.metric === bucketMetric &&
                  ele.reference === params?.data?.reference &&
                  ele?.comparePlan === params?.data?.comparePlan
              );
              const bucketMetricNode = params.api.getRowNode(
                bucketMetricData?.uniqueId
              );
              const bucketMetricValue = params.api?.getValue(
                colId,
                bucketMetricNode
              );
              tempValueForMetric.push(checkFormatOfNumber(bucketMetricValue));
            }
          });
          finalFormula.push(checkFormatOfNumber(tempValueForMetric));
        }
        // max, min, avg
      });
    }
    let tempOutput = finalFormula.map((arr) =>
      checkFormatOfNumber(arr.join(""))
    );
    return tempOutput.reduce((a, b) => a + b, 0);
  }
};

const getFcstKeyByVarFcst = (reference) => {
  switch (reference) {
    case "rel_variance_fcst":
      return "rel_forcasted";
    default:
      return "forcasted";
  }
};

const varianceCalculationFunc = (wpData, lyData, fixTo) => {
  const validWpData = isNaN(wpData) || isUndefined(wpData) ? 0 : wpData;
  const validLyData = isNaN(lyData) || isUndefined(lyData) ? 0 : lyData;
  if (validWpData === 0 && round(validLyData) === 0) return 0;
  // below  conditions are for the situation when ly is 0 and wp is not 0, here we return var as 100
  // here we use round when fixto is 0 as as user is shown 0 instead of the whole number
  // for eg. original value is 0.9080 but user is show 0, and so the same is used for the below conditions
  if (validWpData === 0 && round(validLyData) === 0) {
    return 0;
  }
  if (fixTo === 0 && round(validWpData) === 0 && round(validLyData) === 0) {
    return 0;
  } else if (fixTo === 0 && validWpData !== 0 && round(validLyData) === 0) {
    return 100;
  } else if (fixTo >= 2 && validWpData !== 0 && validLyData === 0) {
    return 100;
  }
  let tempValue =
    ((parseFloat(validWpData) - parseFloat(validLyData)) /
      parseFloat(validLyData)) *
    100;

  return checkFormatOfNumber(tempValue);
};

export const getDefaultMetricList = (planDetails = {}, plansmartConfig) => {
  const seasonType = getPlanSmartSeasonType(planDetails?.status);
  const channelValue = get(planDetails, `${plansmartConfig.channelKey}`, "");
  const defaultMetricByChannel = plansmartConfig.defaultMetricsByChannel;
  return get(defaultMetricByChannel, `${seasonType}.${channelValue}`, []);
};

export const getHiddenDetails = (tableRef, planDetails) => {
  const referenceGroupObj = {
    initialGroup: ["planCode"],
    referenceGroup: ["reference"],
    extraKeyToAdd: ["referenceLabel"],
  };
  const hiddenBuckets = [];
  const hiddenKpis = [];
  const hiddenRefs = [];
  const hiddenCols = [];

  const internalBuckets = planDetails?.Bucket_v1 || [];
  const labelBuckets = planDetails?.Bucket;
  const rowData = get(tableRef, "current.props.rowData", []);
  const kpiGroups = groupByKeys(rowData, 0, ["bucket_category"], 1);
  const bucketGroups = groupByKeys(rowData, 0, ["bucket"], 1, ["bucket"]);
  const referenceGroups = getReferenceList(rowData, referenceGroupObj);
  const allColumns = tableRef.current?.columnApi?.getAllColumns() || [];

  const isEnabled = (list = [], isReference = false, isBucket = false) => {
    const hierarchyKey = isBucket
      ? "hideBucket"
      : isReference
      ? "hideReference"
      : "hide";
    const noHiddenList = list.filter((data) => !data?.[hierarchyKey]);
    return noHiddenList.length !== 0;
  };
  bucketGroups.forEach((bucketObj) => {
    if (!isEnabled(bucketObj?.data || [], false, true)) {
      const labelBucketInx = labelBuckets.findIndex(
        (bucket) => bucket === bucketObj.label
      );
      if (labelBucketInx > -1) {
        hiddenBuckets.push(internalBuckets[labelBucketInx]);
      }
    }
  });

  kpiGroups.forEach((kpiObj) => {
    if (!isEnabled(kpiObj?.data || [])) {
      const kpi = get(kpiObj, "data[0].metricWithoutBucket", "");
      if (kpi) {
        hiddenKpis.push(kpi);
      }
    }
  });

  referenceGroups.forEach((referenceObj) => {
    if (!isEnabled(referenceObj?.data || [], true)) {
      hiddenRefs.push({
        version_name: referenceObj.label,
        plan_code: referenceObj.planCode || null,
      });
    }
  });

  allColumns.forEach((columnDef) => {
    if (
      (isWeekNumber(columnDef.colId) ||
        columnDef?.userProvidedColDef?.extra?.is_total) &&
      !columnDef.visible
    ) {
      hiddenCols.push(columnDef?.userProvidedColDef?.headerName);
    }
  });
  return {
    hidden_buckets: hiddenBuckets,
    hidden_vers: hiddenRefs,
    hidden_kpis: hiddenKpis,
    hidden_cols: hiddenCols,
  };
};

export const getBucketsBasedOnEopValueCheck = (
  eopValResp,
  bucketKeys,
  tableData,
  weekColumns,
  metrics_with_formatter
) => {
  const validatedBucketList = [];
  const firstColumn = weekColumns[0] || {};
  if (firstColumn) {
    bucketKeys.forEach((bucketKey) => {
      if (bucketKey !== "total") {
        const eopValue = get(eopValResp, `${bucketKey}_eop_units`, null);
        if (eopValue !== null) {
          const bopUnitsData =
            tableData.find(
              (ele) =>
                ele.metric === `${bucketKey}_bop_units` &&
                ele.reference === "current" &&
                !ele?.comparePlan
            ) || {};
          const cellFormat = {
            column: firstColumn.colDef,
            data: bopUnitsData,
          };
          const item = setInputFormatForColumn(
            metrics_with_formatter,
            cellFormat,
            false
          );
          const params = {
            column: firstColumn,
            data: bopUnitsData,
            item: item,
            value: bopUnitsData[firstColumn.colId],
          };
          cellFormat.item = item;
          const formattedBopValue = plansmartNonEditableCell(
            item,
            params,
            metrics_with_formatter
          )({
            ...params,
            value: checkFormatOfNumber(bopUnitsData[firstColumn.colId]),
          });
          const formattedEopValue = plansmartNonEditableCell(
            item,
            params,
            metrics_with_formatter
          )({ ...params, value: checkFormatOfNumber(eopValue) });
          if (bopUnitsData && formattedBopValue !== formattedEopValue) {
            validatedBucketList.push(bucketKey);
          }
        }
      }
    });
  }
  return validatedBucketList;
};
