import { isEmpty, cloneDeep } from "lodash";
import {
  attributeFormatter,
  getL3OptPayload,
  isChannelMultiple,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import theme from "core/Styles/theme";
import { decimalsFormatter, groupByCustom } from "core/Utils/formatter";

export const fetchL2Details = async (planCode, props, isAfterUpdate) => {
  props.set2_1_Loader(true);
  let budgetL3Payload = getL3OptPayload(
    props.planDetails?.data,
    props.formData,
    false,
    props,
    false
  );
  //Adding extra key in payload for fetching l3 optimization data for dynamic l2 or l3 level table
  budgetL3Payload.filters.push({
    attribute_name: "optimization_level",
    operator: "in",
    value: ["l2_optimization"],
    prefix: "levels",
  });
  let budgetL3Response = await props.getL3OptData(
    budgetL3Payload,
    props.screenConfiguration?.common?.endpoint_project_name || "assort"
  );
  props.setL2OptData(budgetL3Response?.data || []);
  if (!isAfterUpdate) {
    props.set2_1_Loader(false);
  }
};

export const fetchL3Details = async (planCode, props, isAfterUpdate) => {
  props.set2_1_Loader(true);
  let budgetL3Payload = getL3OptPayload(
    props.planDetails?.data,
    props.formData,
    false,
    props,
    false
  );
  //Adding extra key in payload for fetching l3 optimization data for dynamic l2 or l3 level table
  if (props?.currentTableLevel === "l3_name") {
    budgetL3Payload.filters.push({
      attribute_name: "optimization_level",
      operator: "in",
      value: ["l3_optimization"],
      prefix: "levels",
    });
  } else if (props?.currentTableLevel === "l2_name") {
    budgetL3Payload.filters.push({
      attribute_name: "optimization_level",
      operator: "in",
      value: ["l2_optimization"],
      prefix: "levels",
    });
  }
  let budgetL3Response = await props.getL3OptData(
    budgetL3Payload,
    props.screenConfiguration?.common?.endpoint_project_name || "assort"
  );
  if (props?.currentTableLevel === "l2_name") {
    props.setL2OptData(budgetL3Response?.data || []);
  } else {
    props.setL3OptData(budgetL3Response?.data || []);
  }
  if (!isAfterUpdate) {
    props.set2_1_Loader(false);
  }
};

export const getBudgetLevelThreeSeriesData = (
  item,
  i,
  budgetLevelThreeFormData,
  currentTableLevel
) => {
  let value = budgetLevelThreeFormData.l3_optimization_constraint.includes(
    "penetration_ly"
  )
    ? Math.round(
        item[budgetLevelThreeFormData.l3_optimization_constraint] * 10000
      ) / 100
    : item[budgetLevelThreeFormData.l3_optimization_constraint];
  return {
    name: currentTableLevel === "l2_name" ? item.l2_name : item.l3_name,
    y: parseFloat(
      decimalsFormatter({
        value: value,
      })
    ),
    color: theme.palette.graphColours[i],
  };
};

export const generateLabelWithCompYear = (props, item) => {
  let label = item;
  let labelSplit = item.split("_");
  let yearKey = labelSplit[labelSplit?.length - 1];
  if (props.columnHeaderJson?.[yearKey.toUpperCase()]) {
    label = label.replace(
      yearKey,
      props.columnHeaderJson?.[yearKey.toUpperCase()]
    );
  } else {
    //To make ty year label to uppercase
    label = label.replace("_" + yearKey, "_" + yearKey.toUpperCase());
  }
  return attributeFormatter(label);
};

export const buildLevelThreeGraphData = (
  props,
  budgetLevelThreeFormData,
  formData,
  currentTableLevel
) => {
  if (!isEmpty(budgetLevelThreeFormData.l3_optimization_constraint)) {
    let xAxisCategories = [];
    let filteredData = cloneDeep(props.budgetL3ChartData);
    for (const key in budgetLevelThreeFormData) {
      switch (key) {
        case "drop":
        case "launch":
          filteredData = filteredData.filter((item) => {
            return item[key] === budgetLevelThreeFormData[key];
          });
          break;
        case "carryover_flag":
          filteredData = filteredData.filter((item) => {
            return (
              item.carryover_flag === budgetLevelThreeFormData.carryover_flag
            );
          });
          break;
        case "sub_channel":
          filteredData = filteredData.filter((item) => {
            return item.sub_channel === budgetLevelThreeFormData.sub_channel;
          });
          break;
        default:
          break;
      }
    }
    xAxisCategories = filteredData?.map((item) => {
      return currentTableLevel === "l3_name" ? item.l3_name : item.l2_name;
    });
    let seriesData = filteredData?.map((item, i) => {
      return getBudgetLevelThreeSeriesData(
        item,
        i,
        budgetLevelThreeFormData,
        props.currentTableLevel
      );
    });
    let chartData = {
      //  To map type and chartTitle from api's response
      type: props.budgetL3ChartDetails.data?.type || "column",
      chartType: "barChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          title: props?.columnHeaderJson[props.currentTableLevel] || "Program",
          categories: xAxisCategories,
        },
        yaxis: {
          title: generateLabelWithCompYear(
            props,
            budgetLevelThreeFormData.l3_optimization_constraint
          ),
        },
      },
      tooltip: {
        headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
        pointFormat:
          '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b><br/>',
      },
      series: [
        {
          name: props?.columnHeaderJson[props.currentTableLevel],
          data: seriesData,
        },
      ],
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
          },
        },
      },
    };
    if (
      budgetLevelThreeFormData?.l3_optimization_constraint.includes(
        "penetration"
      )
    ) {
      chartData["isPercentLabel"] = true;
    }
    if (
      budgetLevelThreeFormData.l3_optimization_constraint.includes("budget") ||
      budgetLevelThreeFormData.l3_optimization_constraint.includes("aur")
    ) {
      chartData["isDollarLabel"] = true;
    }
    if (
      budgetLevelThreeFormData.l3_optimization_constraint.includes(
        "receipts_quantity"
      )
    ) {
      chartData["isDecimalFormatLabel"] = true;
    }
    return chartData;
  }
};

export const getTotalFooterRow = (
  level3TableData,
  props,
  isLevelOneDropdownRequired,
  isLevelTwoDropdownRequired
) => {
  //To group data based on drop and sub_channel
  //To group data based on drop and sub_channel
  const groupBy_properties = [
    props.screenConfiguration?.common?.drop_key || "drop",
  ];
  let totalObj = [];
  if (isWholesalePlan(props.planDetails?.data)) {
    groupBy_properties.push("sub_channel");
  }

  groupBy_properties.push("channel");

  if (
    props.planDetails?.data?.l1_name?.length > 1 &&
    isLevelOneDropdownRequired
  ) {
    groupBy_properties.push("l1_name");
  }
  if (
    props.planDetails?.data?.l2_name?.length > 1 &&
    isLevelTwoDropdownRequired
  ) {
    groupBy_properties.push("l2_name");
  }
  const groupedDataArray = groupByCustom({
    Group: level3TableData,
    By: groupBy_properties,
  });
  groupedDataArray?.length &&
    groupedDataArray.forEach((groupedData) => {
      let total_penetration_ly = 0,
        total_penetration_ty = 0,
        total_receipts_quantity_ly = 0,
        total_receipts_quantity_ty = 0,
        total_budget_ly = 0,
        total_budget_ty = 0,
        total_budget_diff = 0,
        total_penetration_diff = 0,
        total_aur_ly = 0,
        total_aur_ty = 0,
        total_txn_aur_ly = 0,
        total_txn_aur_ty = 0,
        total_cogs_ty = 0,
        total_air_ly = 0,
        total_air_ty = 0,
        total_sales_units_ly = 0,
        total_sales_units_ty = 0,
        total_sales_ly = 0,
        total_sales_ty = 0,
        total_gross_margin_ly = 0,
        total_gross_margin_ty = 0,
        total_revenue_ly = 0,
        total_revenue_ty = 0,
        total_forecast_ly = 0,
        total_forecast_ty = 0,
        total_st_pen = 0,
        total_margin = 0;
      groupedData.forEach((data) => {
        let optimizationLevel =
          props.screenConfiguration?.["2.1"]?.budget_optimization_level;
        if (
          !optimizationLevel.includes("carryover") ||
          (optimizationLevel.includes("carryover") &&
            data.carryover_flag === "Total")
        ) {
          //In carryOver flow only parent row should be added up for footer
          total_penetration_ly = total_penetration_ly + data.penetration_ly;
          total_penetration_ty =
            total_penetration_ty + parseFloat(data.penetration_ty || 0);
          total_receipts_quantity_ly =
            total_receipts_quantity_ly + data.receipts_quantity_ly;
          total_receipts_quantity_ty =
            total_receipts_quantity_ty + data.receipts_quantity_ty;
          total_budget_ly = total_budget_ly + data.budget_ly;
          total_budget_ty = total_budget_ty + parseInt(data.budget_ty || 0);
          total_budget_diff = total_budget_diff + data.budget_diff;
          total_penetration_diff =
            total_penetration_diff + data.penetration_diff;
          total_aur_ly = total_aur_ly + data.aur_ly;
          total_aur_ty = total_aur_ty + parseFloat(data.aur_ty || 0);
          total_txn_aur_ly = total_txn_aur_ly + (data.txn_aur_ly * data.forecast_units_ly);
          total_txn_aur_ty = total_txn_aur_ty + (data.txn_aur_ty * data.forecast_units_ty);
          total_cogs_ty = total_cogs_ty + parseFloat(data.cogs_ty || 0);
          total_air_ly =
            total_air_ly +
            data.receipts_quantity_ly * parseFloat(data.air_ly || 0);
          total_air_ty =
            total_air_ty +
            data.receipts_quantity_ty * parseFloat(data.air_ty || 0);
          total_sales_units_ly = total_sales_units_ly + data.sales_units_ly;
          total_sales_units_ty = total_sales_units_ty + data.sales_units_ty;
          total_sales_ly = total_sales_ly + data.sales_ly;
          total_sales_ty = total_sales_ty + data.sales_ty;
          total_gross_margin_ly = total_gross_margin_ly + data.gross_margin_ly;
          total_gross_margin_ty = total_gross_margin_ty + data.gross_margin_ty;
          total_revenue_ly = total_revenue_ly + data.revenue_ly;
          total_revenue_ty = total_revenue_ty + data.revenue_ty;
          total_forecast_ly = total_forecast_ly + data.forecast_units_ly;
          total_forecast_ty = total_forecast_ty + data.forecast_units_ty;
          total_st_pen = total_st_pen + (data.sell_through * data.budget_ty);
          total_margin = total_margin + (data.margin_per_ly * data.budget_ty);
        }
      });
      totalObj.push({
        penetration_ly: total_penetration_ly,
        penetration_ty: Math.round(total_penetration_ty),
        receipts_quantity_ly: total_receipts_quantity_ly,
        receipts_quantity_ty: total_receipts_quantity_ty,
        budget_ly: total_budget_ly,
        budget_ty: total_budget_ty,
        budget_diff: total_budget_diff,
        penetration_diff: total_budget_diff / total_budget_ly,
        aur_ly: total_budget_ly / total_receipts_quantity_ly,
        aur_ty: total_budget_ty / total_receipts_quantity_ty,
        txn_aur_ly: total_txn_aur_ly / total_forecast_ly,
        txn_aur_ty: total_txn_aur_ty / total_forecast_ty,
        air_ly: total_air_ly / total_receipts_quantity_ly,
        air_ty: total_air_ty / total_receipts_quantity_ty,
        cogs_ty: total_cogs_ty,
        sales_units_ly: total_sales_units_ly,
        sales_units_ty: total_sales_units_ty,
        sales_ly: total_sales_ly,
        sales_ty: total_sales_ty,
        gross_margin_ly: total_gross_margin_ly,
        gross_margin_ty: total_gross_margin_ty,
        revenue_ly: total_revenue_ly,
        revenue_ty: total_revenue_ty,
        forecast_units_ly: total_forecast_ly,
        forecast_units_ty: total_forecast_ty,
        sell_through: total_st_pen / total_budget_ty,
        margin_per_ly: total_margin / total_budget_ty,
        l3_name: "Total",
        l2_name:
          isLevelTwoDropdownRequired || groupedData?.[0]?.l3_name
            ? groupedData?.[0]?.l2_name
            : "Total",
        l1_name: isLevelOneDropdownRequired
          ? groupedData?.[0]?.l1_name
          : "Total",
        [props.screenConfiguration?.common?.drop_key ||
        "drop"]: groupedData?.[0]?.[
          props.screenConfiguration?.common?.drop_key || "drop"
        ],
        sub_channel: groupedData?.[0]?.sub_channel,
        channel_list: groupedData?.[0]?.channel,
        hierarchy: ["Total"],
        uniqueId:
          "Total" +
          groupedData?.[0]?.[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] +
          groupedData?.[0]?.sub_channel +
          groupedData[0]?.l3_name +
          groupedData[0]?.l2_name +
          groupedData[0]?.l1_name,
      });
    });
  return totalObj;
};
