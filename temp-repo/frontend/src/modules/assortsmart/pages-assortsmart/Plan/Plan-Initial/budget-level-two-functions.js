import { times } from "lodash";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  channelContainsTotal,
  getPlanPayload,
  isWholesalePlan,
  parseValue,
  updateLyColumnHeading,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import theme from "core/Styles/theme";
import { decimalsFormatter } from "core/Utils/formatter";

export const updateL2RowData = (
  e,
  data,
  column,
  isChanged,
  value,
  initialValue,
  cellData,
  initValue,
  BudgetLevel2Instance,
  monthArray,
  setTableData,
  props
) => {
  let newValue = initValue;
  let columnId = column.colId;
  let row = data
  let itemsToUpdate = [];
  let isTotalRow = false;
  let old_total_budget_ty = data["total_budget_ty"]
  BudgetLevel2Instance.current.api.forEachNode((eachRow, index) => {
    eachRow = eachRow.data;
    if (row.uniqueID === eachRow.uniqueID) {
      eachRow[columnId] = parseInt(newValue || 0);
      let total_ty = 0,
        total_budget_ty = 0,
        total_pen_ty = 0;
      let lockPercentage = 0, unlockPercentage = 0, remaingPercentage = 0;

      monthArray.forEach((month) => {
        if (month) {
          total_ty += parseFloat(eachRow[month + "_ty"]);
          total_budget_ty += parseFloat(eachRow[month + "_budget_ty"])
          total_pen_ty += parseFloat(eachRow[month + "_pen_ty"]);
          if (columnId.includes("_pen_ty")) {
            if (columnId.includes(month)) {
              lockPercentage += eachRow[columnId];
              eachRow[month + "_budget_ty"] = old_total_budget_ty * (eachRow[month + "_pen_ty"] / 100)
            } else {
              unlockPercentage += parseFloat(eachRow[month + "_pen_ty"])
            }
          }
        }
      });
      remaingPercentage = 100 - lockPercentage;
      eachRow.total_ty = total_ty;
      eachRow.total_budget_ty = total_budget_ty;
      eachRow.total_pen_ty = total_pen_ty / 100;
      let updated_total_ty = 0,
        updated_total_budget_ty = 0,
        updated_total_pen_ty = 0;
      monthArray.forEach((month) => {
        if (month) {
          if (columnId.includes("_budget_ty") && columnId.includes(month)) {
            eachRow[month + "_pen_ty"] = (eachRow[month + "_budget_ty"] / total_budget_ty) * 100
          }
          // Scale up/down
          if (columnId.includes("_pen_ty") && !columnId.includes(month)) {
            let updated_pen = (eachRow[month + "_pen_ty"] / unlockPercentage) * remaingPercentage;
            eachRow[month + "_pen_ty"] = updated_pen;
            eachRow[month + "_budget_ty"] = old_total_budget_ty * (updated_pen / 100)
          }
          updated_total_ty += parseFloat(eachRow[month + "_ty"]);
          updated_total_budget_ty += parseFloat(eachRow[month + "_budget_ty"])
          updated_total_pen_ty += parseFloat(eachRow[month + "_pen_ty"]);
        }
      });
      eachRow.total_ty = updated_total_ty;
      eachRow.total_budget_ty = updated_total_budget_ty;
      eachRow.total_pen_ty = updated_total_pen_ty / 100;
    }
    if (eachRow?.channel === "Total") {
      isTotalRow = true;
    }
    itemsToUpdate.push(eachRow);
  });
  setTableData(itemsToUpdate);
  // Refresh table cell on data update
  BudgetLevel2Instance.current.api.refreshCells({
    force: true,
    suppressFlash: false,
  });
};

export const getTotalFooterRow = (tableData, monthArray) => {
  let totalRowOriginalData = {
    l1_name: "Total",
    l2_name: "Total",
    channel: "Total",
  },
    totalRowUpdatedData = {
      total_ly: 0, total_ty: 0, total_budget_ly: 0,
      total_budget_ty: 0,
      total_pen_ly: 0,
      total_pen_ty: 0
    };
  let totalObj = [];
  monthArray.forEach((month) => {
    totalRowUpdatedData[`${month}_ty`] = 0;
    totalRowUpdatedData[`${month}_ly`] = 0;
    totalRowUpdatedData[`${month}_budget_ly`] = 0;
    totalRowUpdatedData[`${month}_budget_ty`] = 0;
    totalRowUpdatedData[`${month}_pen_ly`] = 0;
    totalRowUpdatedData[`${month}_pen_ty`] = 0;
  });
  tableData.forEach((data) => {
    if (data.channel === "Total") {
      totalRowOriginalData = data;
      totalRowOriginalData["l1_name"] = "Total";
    } else {
      // Calculate total of all the rows w.r.t month
      Object.keys(data).forEach((key) => {
        if (key.includes("_ly")) {
          let monthName = key.split("_ly");
          if (monthArray.includes(monthName[0]) || key === "total_ly" || key.includes("_budget_ly") || key.includes("_pen_ly")) {
            totalRowUpdatedData[key] =
              totalRowUpdatedData[key] + parseFloat(data[key]);
          }
        } else if (key.includes("_ty")) {
          let monthName = key.split("_ty");
          if (monthArray.includes(monthName[0]) || key === "total_ty" || key.includes("_budget_ty") || key.includes("_pen_ty")) {
            totalRowUpdatedData[key] =
              totalRowUpdatedData[key] + parseFloat(data[key]);
          }
        }
      });
    }
  });
  Object.keys(totalRowUpdatedData).map(key => {
    let monthName = key === "total_budget_ty" || key === "total_budget_ly" ? "total" : key.includes("_ly") ? key.split("_ly")?.[0] : key.split("_ty")?.[0];
    if ((monthArray.includes(monthName) || key === "total_budget_ty" || key === "total_budget_ly")) {
      if (key.includes("_ly")) {
        let total = (totalRowUpdatedData[monthName + "_budget_ly"] / totalRowUpdatedData["total_budget_ly"])
        totalRowUpdatedData[monthName + "_pen_ly"] = total
      } else {
        let total = (totalRowUpdatedData[monthName + "_budget_ty"] / totalRowUpdatedData["total_budget_ty"])
        totalRowUpdatedData[monthName + "_pen_ty"] = key === "total_budget_ty" ? total : total * 100
      }
    }
  })

  tableData = tableData.filter((obj) => obj.channel !== "Total");
  totalObj.push({
    ...totalRowOriginalData,
    ...totalRowUpdatedData,
  });
  return totalObj;
};

export const getUpdateBudgetPayload = (
  planDetailsData,
  BudgetLevel2Instance,
  maxMonths,
  monthMappingList
) => {
  let payloadData = [];
  BudgetLevel2Instance?.current?.api.forEachNode((deptData) => {
    deptData = deptData.data;
    return times(maxMonths, (index) => {
      let month = monthMappingList?.[
        deptData[`fiscal_month${index + 1}`]
      ]?.toLowerCase();
      payloadData.push({
        //Nesting table data present as ty_budget1. ty_budget2, etc. to be grouped on basis of months (same format as the API's data)
        plan_code: planDetailsData.plan_code,
        plan_budget_id: deptData[`plan_budget_id${index + 1}`],
        attribute_value: {
          budget_ty: parseFloat(parseValue(deptData[`${month}_budget_ty`])),
          budget_ly: parseFloat(parseValue(deptData[`${month}_budget_ly`])),
          qty_ly: parseFloat(parseValue(deptData[`${month}_qty_ly`])),
          qty_ty: parseFloat(parseValue(deptData[`${month}_qty_ty`])),
          budget_pen_ly: parseFloat(deptData[`${month}_pen_ly`] / 100),
          budget_pen_ty: parseFloat(deptData[`${month}_pen_ty`] / 100),
          retail_budget_ty: parseFloat(
            parseValue(deptData[`${month}_retail_receipt_ty`])
          ),
          retail_budget_ly: parseFloat(
            parseValue(deptData[`${month}_retail_receipt_ly`])
          ),
          total_l2_budget_ty: deptData.total_ty,
        },
      });
    });
  });
  return payloadData;
};

export const getOptimizeDropConfigPayload = (
  planData,
  planLevels,
  isLevel2Required,
  budgetOptimizationLevel,
  screenConfiguration
) => {
  let fetchPlanDataPayload = getPlanPayload(planData, planLevels, true);
  let filters = [];
  fetchPlanDataPayload.filters.forEach((item) => {
    if (!(isLevel2Required && item.attribute_name === "l2_name")) {
      filters.push(item);
    }
  });
  // In case of Puma, remove l2_name from payload
  if (budgetOptimizationLevel?.[1] === "l2_name") {
    fetchPlanDataPayload.filters = fetchPlanDataPayload.filters.filter(
      (level) => level.attribute_name !== "l2_name"
    );
  }
  if (isLevel2Required) {
    fetchPlanDataPayload.filters = filters;
  }
  fetchPlanDataPayload.filters.push({
    attribute_name: "store_type",
    value: planData.channel,
    operator: "in",
  });
  fetchPlanDataPayload.filters.push({
    attribute_name: "channel",
    prefix: "levels",
    value: planData.channel,
    operator: "in",
  });
  fetchPlanDataPayload.filters.push({
    attribute_name: "sub_channel",
    prefix: "levels",
    value: isWholesalePlan(planData)
      ? common.__sub_channel_wholesale
      : planData.sub_channel || planData.channel,
    operator: "in",
  });
  let planDataDropValue = [];
  for (
    var i = 1;
    i <= planData[`${screenConfiguration?.common?.drop_key || "drops"}_count`];
    i++
  ) {
    planDataDropValue.push(
      planData[`${screenConfiguration?.common?.drop_key || "drops"}_${i}`]
    );
  }
  fetchPlanDataPayload.filters.push({
    attribute_name: screenConfiguration?.common?.drop_key || "drop",
    operator: "in",
    value: planDataDropValue,
    prefix: "levels",
  });
  fetchPlanDataPayload.compare_type = planData.compare_year;
  if (planData.data_pull_source) {
    fetchPlanDataPayload.data_pull_source = planData.data_pull_source;
  }
  fetchPlanDataPayload.compare_season = planData.compare_season || "";
  return fetchPlanDataPayload;
};

export const buildTrendsGraphData = (props) => {
  let ly_months = [],
    ty_months = [];
  const graphData = props.graphRawData[props.rowIndex];
  props.axisCategories.forEach((axis) => {
    let type = props.percentageView ? "_pen" : "_budget"
    ly_months.push(graphData[`${axis}${type}_ly`]);
    ty_months.push(graphData[`${axis}${type}_ty`]);
  });
  let lastYearReceipt = ly_months.map((obj) =>
    obj ? decimalsFormatter({ value: obj }, 0) : 0
  );
  let thisYearReceipt = ty_months.map((obj) =>
    obj ? decimalsFormatter({ value: obj }, 0) : 0
  );
  let seriesData = [
    {
      name: "TY",
      data: thisYearReceipt,
      color: theme.palette.graphColours[0],
    },
    {
      name: updateLyColumnHeading(
        props.planDetails?.data?.compare_year
      ),
      data: lastYearReceipt,
      color: theme.palette.graphColours[1],
    },
  ];
  return {
    type: props.graphDetails.data?.type,
    chartType: "multiLineChart",
    chartTitle: "",
    axisLegends: {
      xaxis: {
        title: "Month",
        categories: props.axisCategories.map(
          (month) => month?.[0].toUpperCase() + month.slice(1)
        ),
      },
      yaxis: {
        title: "Budget ($)",
      },
    },
    series: seriesData,
    isBudgetLabel: true,
  };
};
