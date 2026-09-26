import { isNaN, isUndefined, round, get, cloneDeep } from "lodash";
import {
  equalUpdateMetrics,
  // bucket_keys,
  //defaultMetrics,
  metricKeysList,
  proportionateMetrics,
  typeOfFunctions,
  zeroHandlingMetrics,
} from "modules/plansmart/constants-plansmart/stringConstants";
import {
  getReference,
  isWeekNumber,
} from "modules/plansmart/utils-plansmart/ConstantFunctions";

let plansmartConfigs = {};
let editableMetricFormulas = {};
let payloadForBudgetTableData = {};
let data = {};
let column = {};
let columnExtra = {};
let leafColumns = [];
let rowData = [];
let bucket_keys = [];
let oldValue;
let isChanged;
let tempValue;
let previousValue;
let updatedNodes = [];
let updatedColumn = new Set();
let skipCellLockCheck = false;

const totalCalculationForBudgetTable = (value, metricsFormula) => {
  const referenceKey = getReference(data?.reference);
  let totalMinusValue = 0;
  leafColumns.flatMap((a) => {
    if (
      isWeekNumber(a.accessor) &&
      (skipCellLockCheck
        ? true
        : data?.cellLocked?.[a.accessor] === true || !a.is_editable)
    ) {
      if (!columnExtra.is53Week && a.extra.is53Week) {
        return;
      }
      totalMinusValue = totalMinusValue + data[a.accessor];
    }
  });

  const clonedRowData = cloneDeep(rowData);

  leafColumns?.map((item, index) => {
    // array of leaf nodes includes item
    if ((!columnExtra.is53Week && item.extra.is53Week) || !item.is_editable) {
      return;
    }
    if (isWeekNumber(item.accessor) && item.is_editable) {
      if (
        data?.cellLocked?.[item.accessor] === undefined ||
        (data?.cellLocked?.[item.accessor] === false && item.is_editable) ||
        skipCellLockCheck
      ) {
        let metric = data?.metricWithoutBucket,
          bucket_key = data?.bucketKey;
        // TODO : Would have to optimize the below code.
        if (data?.reference === "variance") {
          let lyRowForCalc = updateOrReturnValueInTable(
            data.metric,
            item.accessor,
            null,
            "compare",
            false
          );
          let currentRowForTotal = updateOrReturnValueInTable(
            data.metric,
            item.accessor,
            null,
            referenceKey, // it will return current
            false
          );
          let sumOfLockedWp = leafColumns
            .filter(
              (item) =>
                isWeekNumber(item.accessor) &&
                (skipCellLockCheck
                  ? false
                  : data?.cellLocked?.[item.accessor] || !item.is_editable)
            )
            .reduce(function (previous, key) {
              if (!columnExtra.is53Week && key.extra.is53Week) {
                return previous;
              }
              return (
                parseFloat(previous) +
                parseFloat(currentRowForTotal[key.accessor])
              );
            }, 0);
          let sumOfLy = leafColumns
            .filter((item) => isWeekNumber(item.accessor))
            .reduce(function (previous, key) {
              if (!columnExtra.is53Week && key.extra.is53Week) {
                return previous;
              }
              return (
                parseFloat(previous) + parseFloat(lyRowForCalc[key.accessor])
              );
            }, 0);
          let sumOfUnLockedLy = leafColumns
            .filter(
              (item) =>
                isWeekNumber(item.accessor) &&
                (skipCellLockCheck
                  ? true
                  : !data?.cellLocked?.[item.accessor]) &&
                item.is_editable
            )
            .reduce(function (previous, key) {
              if (!columnExtra.is53Week && key.extra.is53Week) {
                return previous;
              }
              return (
                parseFloat(previous) + parseFloat(lyRowForCalc[key.accessor])
              );
            }, 0);
          let sumOfLockedLy = leafColumns
            .filter(
              (item) =>
                isWeekNumber(item.accessor) &&
                (skipCellLockCheck
                  ? false
                  : data?.cellLocked?.[item.accessor] || !item.is_editable)
            )
            .reduce(function (previous, key) {
              if (!columnExtra.is53Week && key.extra.is53Week) {
                return previous;
              }
              return (
                parseFloat(previous) + parseFloat(lyRowForCalc[key.accessor])
              );
            }, 0);
          // Total Variance * [{((sum of Locked LY - sum of Locked WP)/Total Variance) + (Sum of LY)}/(Sum of Unlocked LY)] based on new logic

          let tempValueForVariance =
            ((sumOfLockedLy - sumOfLockedWp) / value) * 100;
          let newValueOfVariance = checkFormatOfNumber(
            value * ((tempValueForVariance + sumOfLy) / sumOfUnLockedLy)
          );
          updateCurrentOnVarianceChange(
            data,
            newValueOfVariance,
            data?.metric,
            item.accessor,
            metricsFormula
          );
          updateOrReturnValueInTable(
            data.metric,
            item.accessor,
            newValueOfVariance,
            "variance",
            true
          );
        } else if (data?.reference === "current") {
          let newMetricValue;
          if (oldValue === 0) {
            if (equalUpdateMetrics.indexOf(data.metricWithoutBucket) > -1) {
              newMetricValue = value;
            } else if (
              proportionateMetrics.indexOf(data.metricWithoutBucket) > -1
            ) {
              newMetricValue =
                value /
                leafColumns?.filter(
                  (key) =>
                    isWeekNumber(key.accessor) &&
                    (skipCellLockCheck
                      ? true
                      : !data.cellLocked?.[key.accessor]) &&
                    key.is_editable
                ).length;
            }
            updateCurrentOnTotalChange(
              data,
              item.accessor,
              metricsFormula,
              newMetricValue
            );
          } else {
            const newMetricValue = checkFormatOfNumber(
              getNewNumberForMetric(
                clonedRowData,
                previousValue,
                value,
                metric,
                totalMinusValue,
                data[item.accessor],
                bucket_key,
                leafColumns,
                item.accessor,
                bucket_keys
              )
            );
            updateCurrentOnTotalChange(
              data,
              item.accessor,
              metricsFormula,
              newMetricValue
            );
          }
        }
        return item.accessor;
      }
    }
  });
};

const updateCurrentOnTotalChange = (
  data,
  item,
  metricsFormula,
  newMetricValue
) => {
  const tempOldValue = data[item];
  updateOrReturnValueInTable(
    data?.metric,
    item,
    newMetricValue,
    "current",
    true
  );
  updateBudgetTablePayload(newMetricValue, tempOldValue, data.metric, item);
  updateVarianceOnCurrentChange(data, newMetricValue, data?.metric, item);
  editableMetricCalculationBudgetTable(
    rowData,
    data?.bucketKey,
    item,
    data?.reference,
    metricsFormula,
    newMetricValue,
    tempOldValue
  );
};

const addMetricsWithBucket = (metric, bucket_key = "") => {
  let formattedBucketKey = bucket_key.toLowerCase().split(" ").join("_");
  const formattedBucketKeyWithUnderscore = formattedBucketKey.concat("_");
  return formattedBucketKeyWithUnderscore.concat(metric);
};

/* Updating the current of same metric row, where variance is changed */
const updateCurrentOnVarianceChange = (
  data,
  value,
  metric,
  columnId,
  metricsFormula
) => {
  let lyDatForCalculation = updateOrReturnValueInTable(
    metric,
    columnId,
    null,
    "compare"
  );

  const referenceKey = getReference(data.reference);

  // calculating new current value
  let newModifiedValue =
    (value * lyDatForCalculation?.[columnId]) / 100 +
    lyDatForCalculation?.[columnId];

  // if variance is changing it will return current
  let currentRowWithOldValue = updateOrReturnValueInTable(
    metric,
    columnId,
    null,
    referenceKey, // wp
    false
  );
  // track the old value
  updateBudgetTablePayload(
    newModifiedValue, // new value
    currentRowWithOldValue[columnId], // old value
    metric,
    columnId
  );
  // make change after tracking
  updateOrReturnValueInTable(
    metric,
    columnId,
    newModifiedValue,
    referenceKey, // wp
    true
  );
  const { getNodeList, result } = editableMetricCalculationBudgetTable(
    rowData,
    data.bucketKey,
    columnId,
    currentRowWithOldValue?.reference,
    metricsFormula,
    newModifiedValue,
    currentRowWithOldValue[columnId]
  );
};

const updateVarianceOnCurrentChange = (data, value, metricRef, colId) => {
  let columnId = colId,
    metric = data?.metric || metricRef;
  const metricWithoutBucket = data?.metricWithoutBucket || "";
  const referenceKey = getReference(data.reference);

  const lyDatForCalculation = updateOrReturnValueInTable(
    metric,
    colId,
    null,
    "compare"
  );
  let metrics_with_formatter = plansmartConfigs.metrics_with_formatter;
  const letMetricKey = metricWithoutBucket;
  let newModifiedValue =
    metrics_with_formatter[letMetricKey]?.formatter === "roundOfftoTwoDecimals"
      ? ((value - lyDatForCalculation?.[columnId]) /
          lyDatForCalculation?.[columnId]) *
        100
      : round(lyDatForCalculation?.[columnId]) === 0 && round(value) > 0
      ? 100
      : ((value - lyDatForCalculation?.[columnId]) /
          lyDatForCalculation?.[columnId]) *
        100;
  updateOrReturnValueInTable(
    metric,
    colId,
    newModifiedValue,
    referenceKey,
    true
  );
};

const getValueForMetrics = (
  tempFormula,
  key,
  tempDataCloned,
  varianceOrCurrent,
  columnId,
  bucket_key,
  newValue,
  oldValue
) => {
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
  return formulaSolved;
};

/* function to modify other related cells, based on current cell modification.
  1. Save the currently modified columnId and perform the following steps, except for the saved columnID state.  - done 
  2. Get the reference and metric of current row, oldValue, newValue, columnId. - done.
  3. Calculate the other same metric data first, like if current of sales_$ is modified then calulated these values. 
  4. calculate the total for these rows. 
  5. get the rows which are dependent on formula, say margin is dependent on sales_$ modification , apply formula and recalculate total. 
*/

const editableMetricCalculationBudgetTable = (
  tempDataCloned,
  bucket_key,
  column,
  varianceOrCurrent,
  metricsFormula,
  newValue,
  oldValue
) => {
  let columnId = column?.field || column;
  let data = metricsFormula,
    getNodeList = [];
  let tempFormulaArray = Object.keys(data)
    .sort(function (a, b) {
      return data?.[a]?.ranking - data?.[b]?.ranking;
    })
    .filter((key) => !!data[key]);
  const tempPromises = tempFormulaArray.map((key) => {
    let sortedFormulaList = { [key]: metricsFormula[key] };
    const value = getValueForMetrics(
      sortedFormulaList,
      key,
      tempDataCloned,
      varianceOrCurrent,
      columnId,
      bucket_key,
      newValue,
      oldValue
    );
    const newCalculatedValue = checkFormatOfNumber(value);
    let keytoMatch = bucket_key.concat("_").concat(key);
    let node = updateOrReturnValueInTable(
      keytoMatch,
      columnId,
      null,
      varianceOrCurrent,
      false
    );
    getNodeList.push(node);
    if (node?.reference === "current") {
      updateBudgetTablePayload(
        newCalculatedValue,
        node?.[columnId],
        node?.metric,
        columnId
      );
      updateVarianceOnCurrentChange(
        node,
        newCalculatedValue,
        node?.metric,
        columnId
      );
      Object.assign(node, {
        [columnId]: newCalculatedValue,
      });
    } else if (node?.reference === "variance") {
      Object.assign(node, {
        [columnId]: newCalculatedValue,
      });
      updateCurrentOnVarianceChange(
        node,
        newCalculatedValue,
        node.metric,
        columnId,
        sortedFormulaList
      );
    }
    return newCalculatedValue;
  });
  return { result: tempPromises, getNodeList };
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
      data[_obj].reference === varianceOrCurrent &&
      !data[_obj]?.comparePlan
    ) {
      foundValues[str] = data[_obj][columnId];
    }
  });
  return foundValues;
};

const updateBudgetTablePayload = (newValue, oldValue, metric, columnId) => {
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
  updatedColumn.add(columnId);
};

const updateOrReturnValueInTable = (
  metric,
  col,
  value,
  reference,
  updateRow
) => {
  for (let inx = 0; inx < rowData.length; inx++) {
    const node = rowData[inx];
    if (node?.metric === metric && node?.reference === reference) {
      if (updateRow) {
        node[col] = value;
        updatedNodes.push(node);
      }
      return node;
    }
  }
  return {};
};

const checkFormatOfNumber = (value) => {
  if (
    isUndefined(value) ||
    isNaN(value) ||
    value === Infinity ||
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
  leafColumn,
  bucket_keys
) => {
  if (allData)
    if (
      ![
        "aur",
        "auc",
        "margin_per",
        "adj_auc",
        "oo_auc_add",
        "rcpt_auc",
      ].includes(metric)
    ) {
      let proportionateNumber =
        (metric_value / (oldValue - totalMinusValue)) * 100;
      return isNaN(proportionateNumber)
        ? 0.000001
        : (proportionateNumber * (value - totalMinusValue)) / 100;
    } else {
      if (metric === "aur") {
        let locked_sales_total = 0,
          total_sales = 0,
          unlocked_sales_total = 0,
          unlocked_qty_total = 0,
          qty_total = 0,
          locked_qty_total = 0;
        // AUR =  (((new AUR/old AUR)*total sales)-sales for locked week)/(total sales for unlocked week)
        let locked_sales_row = allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (item_metric === "sales" && item?.metric.includes(bucket_key))
            return item;
        })?.[0];
        let qty_row = allData?.filter((item) => {
          if (
            item.metricWithoutBucket === "qty" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];
        let aur_row = allData?.filter((item) => {
          if (
            item.metricWithoutBucket === "aur" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];
        leafColumns?.reduce((prev, curr) => {
          // calculate total for locked sales
          if (
            (skipCellLockCheck
              ? false
              : locked_sales_row?.cellLocked?.[curr.accessor] === true ||
                !curr.is_editable) &&
            // curr.includes(month) &&
            isWeekNumber(curr.accessor)
          ) {
            locked_sales_total =
              locked_sales_row[curr.accessor] + locked_sales_total;
          }

          // calculate total for locked qty
          if (
            (skipCellLockCheck
              ? false
              : qty_row?.cellLocked?.[curr.accessor] === true ||
                !curr.is_editable) &&
            // curr.includes(month) &&
            isWeekNumber(curr.accessor)
          ) {
            locked_qty_total = qty_row[curr.accessor] + locked_qty_total;
          }

          // calculate total for unlocked sales
          if (
            (skipCellLockCheck
              ? true
              : !locked_sales_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable &&
            // curr.includes(month) &&
            isWeekNumber(curr.accessor)
          ) {
            unlocked_sales_total =
              locked_sales_row[curr.accessor] + unlocked_sales_total;
          }

          // calculate total for unlocked qty
          // curr.is_editable added this condition for actualized week calculation
          if (
            (skipCellLockCheck
              ? true
              : !qty_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable &&
            isWeekNumber(curr.accessor)
          ) {
            unlocked_qty_total = qty_row[curr.accessor] + unlocked_qty_total;
          }

          // calculate total
          if (isWeekNumber(curr.accessor)) {
            total_sales = total_sales + locked_sales_row[curr.accessor];
            qty_total = qty_total + aur_row[curr.accessor];
          }
        }, 0);

        //(old week qty/sum of unlocked week qty)*((Old Total Sales/new total AUR)-locked week qty)
        return (
          locked_sales_row[leafColumn] /
          ((qty_row[leafColumn] / unlocked_qty_total) *
            (total_sales / value - locked_qty_total))
        );
      }
      if (
        metric === "auc" ||
        metric === "adj_auc" ||
        metric === "oo_auc_add" ||
        metric === "rcpt_auc"
      ) {
        const metricCostKey = metric.replace(/auc/g, "cost");
        const metricUnitsKey =
          metric === "auc" ? "qty" : metric.replace(/auc/g, "units");
        let locked_cost_total = 0,
          total_cost = 0,
          unlocked_cost_total = 0,
          units_total = 0,
          locked_units_total = 0,
          unlocked_units_total = 0;
        // AUC =  scaling factor = (((new AUC/old AUC)*total cost)-cost for locked week)/(total cost for unlocked week)
        let locked_cost_row = allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (
            item_metric === metricCostKey &&
            item?.metric.includes(bucket_key)
          )
            return item;
        })?.[0];
        let units_row = allData?.filter((item) => {
          let item_metric = item.metricWithoutBucket;
          if (
            item_metric === metricUnitsKey &&
            item?.metric.includes(bucket_key)
          )
            return item;
        })?.[0];
        leafColumns?.reduce((prev, curr) => {
          if (
            (skipCellLockCheck
              ? false
              : locked_cost_row?.cellLocked?.[curr.accessor] === true ||
                !curr.is_editable) &&
            // curr.includes(month) &&
            isWeekNumber(curr.accessor)
          ) {
            locked_cost_total =
              locked_cost_row[curr.accessor] + locked_cost_total;
          }
          if (
            (skipCellLockCheck
              ? false
              : units_row?.cellLocked?.[curr.accessor] === true ||
                !curr.is_editable) &&
            isWeekNumber(curr.accessor)
          ) {
            locked_units_total = units_row[curr.accessor] + locked_units_total;
          }
          if (
            isWeekNumber(curr.accessor) &&
            (skipCellLockCheck
              ? true
              : !locked_cost_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable
          ) {
            unlocked_cost_total =
              unlocked_cost_total + locked_cost_row[curr.accessor];
          }
          if (
            isWeekNumber(curr.accessor) &&
            (skipCellLockCheck
              ? true
              : !units_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable
          ) {
            unlocked_units_total =
              unlocked_units_total + units_row[curr.accessor];
          }
          if (isWeekNumber(curr.accessor)) {
            total_cost = total_cost + locked_cost_row[curr.accessor];
            units_total = units_total + units_row[curr.accessor];
          }
        }, 0);

        //((old week cost/sum of unlocked week cost)*((Old total Units * new total AUC)-locked week cost))/old week units
        return (
          ((locked_cost_row[leafColumn] / unlocked_cost_total) *
            (units_total * value - locked_cost_total)) /
          units_row[leafColumn]
        );
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
            item.metricWithoutBucket === "sales" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];
        let qty_row = temp_cloned_allData?.filter((item) => {
          if (
            item.metricWithoutBucket === "qty" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];
        let cost_row = temp_cloned_allData?.filter((item) => {
          if (
            item.metricWithoutBucket === "cost" &&
            item?.bucketKey === bucket_key
          )
            return item;
        })?.[0];
        let aur_per_row = temp_cloned_allData?.filter((item) => {
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

        let unlocked_margin_per_total = 0,
          unlocked_sales_row_total = 0,
          total_sales_per_row = 0,
          total_unlocked_cost = 0,
          total_row_cost = 0,
          total_locked_cost = 0,
          total_qty = 0;
        leafColumns?.forEach((curr) => {
          if (
            isWeekNumber(curr.accessor) &&
            (skipCellLockCheck
              ? true
              : !margin_per_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable
          ) {
            unlocked_margin_per_total =
              unlocked_margin_per_total + margin_per_row[curr.accessor];
          }
          if (
            isWeekNumber(curr.accessor) &&
            (skipCellLockCheck
              ? true
              : !sales_per_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable
          ) {
            unlocked_sales_row_total =
              unlocked_sales_row_total + sales_per_row[curr.accessor];
          }
          if (
            isWeekNumber(curr.accessor) &&
            (skipCellLockCheck
              ? true
              : !cost_row?.cellLocked?.[curr.accessor]) &&
            curr.is_editable
          ) {
            total_unlocked_cost = total_unlocked_cost + cost_row[curr.accessor];
          }
          if (
            isWeekNumber(curr.accessor) &&
            (skipCellLockCheck
              ? false
              : cost_row?.cellLocked?.[curr.accessor] || !curr.is_editable)
          ) {
            total_locked_cost = total_locked_cost + cost_row[curr.accessor];
          }
          if (isWeekNumber(curr.accessor)) {
            total_sales_per_row =
              total_sales_per_row + sales_per_row[curr.accessor];
            total_row_cost = total_row_cost + cost_row[curr.accessor];
            total_qty = total_qty + qty_row[curr.accessor];
          }
        });

        const aur_total = total_sales_per_row / total_qty;
        const auc_total = total_row_cost / total_qty;

        // new formula
        //1-((old week AUC *((old total aur* (1-new total GM%)*old total cost / old total AUC) - cost of locked week) /old week AUR * (sum of unlocked week cost))
        const calValue =
          (1 -
            (auc_row[leafColumn] *
              ((aur_total * (1 - value / 100) * total_row_cost) / auc_total -
                total_locked_cost)) /
              (aur_per_row[leafColumn] * total_unlocked_cost)) *
          100;
        return checkFormatOfNumber(calValue);
      }
    }
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
  bucket_keys
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
      bucket_keys
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
      bucket_keys
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
  bucket_keys
) => {
  if (weekLevelBucketTotal) {
    let finalFormula = [];
    let temp_buckets_to_loop = params?.data?.metric.includes("total")
      ? bucket_keys
      : [bucket.concat("_")];
    temp_buckets_to_loop?.forEach((node, index) => {
      let tempValueForMetric = [];
      if (typeOfCalc === "sum") {
        if (!node?.toLowerCase().includes("total")) {
          formula.forEach((metrics) => {
            if (metricKeysList.includes(metrics)) {
              // TODO: optimize the bucket concat function
              let bucketMetric = addMetricsWithBucket(metrics, node);
              let bucketMetricData =
                rowData.find(
                  (ele) =>
                    ele.metric === bucketMetric &&
                    ele.reference === params?.data?.reference &&
                    ele?.comparePlan === params?.data?.comparePlan
                )?.[column] || 0;
              tempValueForMetric.push(checkFormatOfNumber(bucketMetricData));
            } else tempValueForMetric.push(metrics);
          });
        }
      }
      if (tempValueForMetric?.length > 0)
        finalFormula.push(checkFormatOfNumber(tempValueForMetric.join("")));
    });
    return checkFormatOfNumber(finalFormula.reduce((a, b) => a + b, 0));
  } else {
    let finalFormula = [],
      tempMonth = column?.split("_")?.[0];
    let allTheMonths = leafColumns?.filter(
      (ele) =>
        isWeekNumber(ele.accessor) &&
        (columnExtra?.is53Week ? true : !ele?.extra.is53Week)
    );
    allTheMonths?.map((month) => {
      let temp_buckets_to_loop = params?.data?.metric
        .toLowerCase()
        .includes("total")
        ? bucket_keys
        : [bucket];
      temp_buckets_to_loop?.forEach((node, index) => {
        let tempValueForMetric = [];
        if (typeOfCalc === "sum") {
          if (!node.toLowerCase().includes("total")) {
            formula.forEach((metrics) => {
              if (metricKeysList.includes(metrics)) {
                let bucketMetric = addMetricsWithBucket(metrics, node); // node = clr_, metrics = build_aur, => clr_build_aur
                let bucketMetricData = checkFormatOfNumber(
                  rowData.find(
                    (ele) =>
                      ele.metric === bucketMetric &&
                      ele.reference === params?.data?.reference &&
                      ele?.comparePlan === params?.data?.comparePlan
                  )?.[month.accessor]
                );
                tempValueForMetric.push(bucketMetricData);
              } else tempValueForMetric.push(metrics);
            });
            finalFormula.push(checkFormatOfNumber(tempValueForMetric));
          }
        }
        // max, min, avg
      });
    });
    let tempOutput = finalFormula.map((arr) =>
      checkFormatOfNumber(arr.join(""))
    );
    return tempOutput.reduce((a, b) => a + b, 0);
  }
};

const onChangeCalculation = () => {
  const value = checkFormatOfNumber(tempValue);
  // getting the key for metric calc.
  let metric_key_for_formula = Object.keys(editableMetricFormulas)
    .filter((k) => {
      if (data?.metricWithoutBucket === k) return k;
    })
    .flat();
  let metricKey = data?.metricWithoutBucket;
  let metricsFormula = editableMetricFormulas[metric_key_for_formula];
  let metrics_with_formatter = plansmartConfigs.metrics_with_formatter;
  // later will remove this redundant code
  let toBeRoundedCompared =
    metrics_with_formatter[metricKey]?.formatter === "roundOfftoTwoDecimals" ||
    metrics_with_formatter[metricKey]?.formatter === "roundOfftoOneDecimals"
      ? (isChanged && data[column?.field] !== value) || oldValue !== value
      : (isChanged && round(data[column?.field]) !== value) ||
        round(oldValue) !== round(value);

  if (toBeRoundedCompared) {
    if (columnExtra?.is_total) {
      totalCalculationForBudgetTable(value, metricsFormula);
    } else if (data?.reference === "variance") {
      updateCurrentOnVarianceChange(
        data,
        value,
        data?.metric,
        column?.field,
        metricsFormula
      );
    } else if (data?.reference === "current") {
      // updating the payload
      updateBudgetTablePayload(value, oldValue, data?.metric, column?.field);
      updateVarianceOnCurrentChange(data, value, data?.metric, column?.field);
      const { getNodeList } = editableMetricCalculationBudgetTable(
        rowData,
        data?.bucketKey,
        column,
        data?.reference,
        metricsFormula,
        value,
        oldValue
      );

      return getNodeList;
    }
  }
};

onmessage = function (oEvent) {
  const paramData = oEvent.data;
  const { valuesList } = paramData;

  plansmartConfigs = paramData.plansmartConfigs;
  editableMetricFormulas = paramData.editableMetricFormulas;
  payloadForBudgetTableData = paramData.payloadForBudgetTableData;
  rowData = paramData.rowData;
  bucket_keys = paramData.bucket_keys;
  isChanged = paramData.isChanged;
  updatedNodes = [];
  updatedColumn = new Set();
  skipCellLockCheck = !!paramData?.skipCellLockCheck;
  valuesList.forEach((valueObj) => {
    data = valueObj.data;
    column = valueObj.column;
    columnExtra = valueObj.columnExtra;
    leafColumns = valueObj.leafColumns;
    oldValue = valueObj.oldValue;
    tempValue = valueObj.tempValue;
    previousValue = valueObj.previousValue;
    onChangeCalculation();
  });
  postMessage({
    rowData,
    payloadForBudgetTableData,
    flashCellList: updatedNodes,
    updatedColumn: Array.from(updatedColumn),
  });
};
