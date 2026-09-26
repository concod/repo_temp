import { isEmpty, cloneDeep, uniqBy } from "lodash";
import {
  attributeFormatter,
  getDefaultChannelValue,
  getL3OptPayload,
  isChannelMultiple,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import theme from "core/Styles/theme";
import { decimalsFormatter, groupByCustom } from "core/Utils/formatter";
import { getPayloadForL3 } from "./plan-initial-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  CHANNEL_FORM,
  SUB_CHANNEL_FORM,
} from "modules/assortsmart/constants-assortsmart/stringContants";

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
  budgetL3Payload.filters.push({
    attribute_name: "drop",
    operator: "in",
    value: ["Total", "-"],
    prefix: "levels",
  });
  let budgetL3Response = await props.getL3OptData(
    budgetL3Payload,
    props.screenConfiguration?.common?.endpoint_project_name || "assort",
    props.planDetails?.data?.plan_code
  );
  props.setL2OptData(budgetL3Response?.data || []);
  if (!isAfterUpdate) {
    props.set2_1_Loader(false);
  }
};

export const fetchL3Details = async (planCode, props, isAfterUpdate) => {
  if (props.setWorkStrategyLoader) {
    props.setWorkStrategyLoader(true);
  } else {
    props.set2_1_Loader(true);
  }
  let planDetails = props.planDetails;
  let budgetL3Payload = getL3OptPayload(
    planDetails?.data,
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
  budgetL3Payload.filters.push({
    attribute_name: "drop",
    operator: "in",
    value: ["Total", "-"],
    prefix: "levels",
  });
  let budgetL3Response = await props.getL3OptData(
    budgetL3Payload,
    props.screenConfiguration?.common?.endpoint_project_name || "assort",
    props.planDetails?.data?.plan_code
  );
  if (props?.currentTableLevel === "l2_name") {
    props.setL2OptData(budgetL3Response?.data || []);
  } else {
    props.setL3OptData(budgetL3Response?.data || []);
  }
  if (!isAfterUpdate) {
    if (props.setWorkStrategyLoader) {
      props.setWorkStrategyLoader(false);
    } else if (
      !props.showClusterLevel ||
      budgetL3Response?.data?.data?.data?.length < 1
    ) {
      props.set2_1_Loader(false);
    }
  }
  if (budgetL3Response?.data?.data?.length === 0) {
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
  isLevelTwoDropdownRequired,
  selectedChannel
) => {
  //To group data based on drop and sub_channel
  //To group data based on drop and sub_channel
  const groupBy_properties = [];
  let totalObj = [];
  if (isWholesalePlan(props.planDetails?.data)) {
    groupBy_properties.push("sub_channel");
  }
  if (!selectedChannel?.length > 1) {
    groupBy_properties.push("channel");
  }

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
  groupBy_properties.push(
    props.screenConfiguration?.common?.drop_key || "drop"
  );
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
        total_imu_ty = 0,
        total_imu_ly = 0,
        total_st_pen = 0,
        total_margin = 0;
      let total_aur_without_filters = 0;
      let total_total_quantity_without_filters = 0;
      let total_revenue_without_filters = 0;
      let total_margin_perc_without_filters = 0;
      let total_st_without_filters = 0;
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
          total_budget_ty = total_budget_ty + data.budget_ty || 0;
          total_budget_diff = total_budget_diff + data.budget_diff;
          total_penetration_diff =
            total_penetration_diff + data.penetration_diff;
          total_aur_ly = total_aur_ly + data.aur_ly;
          total_aur_ty = total_aur_ty + parseFloat(data.aur_ty || 0);
          total_txn_aur_ly =
            total_txn_aur_ly +
            data.txn_aur_ly * data.total_quantity_without_filters;
          total_txn_aur_ty =
            total_txn_aur_ty + data.txn_aur_ty * data.forecast_units_ty;
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
          total_st_pen = total_st_pen + data.sell_through * data.budget_ty;
          total_margin = total_margin + data.margin_per_ly * data.budget_ty;
          total_aur_without_filters =
            total_aur_without_filters +
            data.aur_without_filters * data.total_quantity_without_filters;
          total_total_quantity_without_filters =
            total_total_quantity_without_filters +
            data.total_quantity_without_filters;
          total_revenue_without_filters =
            total_revenue_without_filters + data.revenue_without_filters;
          total_margin_perc_without_filters =
            total_margin_perc_without_filters +
            data.margin_perc_without_filters * data.budget_ty;
          total_st_without_filters =
            total_st_without_filters + data.st_without_filters * data.budget_ty;
          total_imu_ly =
            total_imu_ly +
            data.receipts_quantity_ly * parseFloat(data.imu_ly || 0);
          total_imu_ty =
            total_imu_ty +
            data.receipts_quantity_ty * parseFloat(data.imu_ty || 0);
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
        aur_ty:
          total_budget_ty / total_receipts_quantity_ty === Infinity
            ? 0
            : total_budget_ty / total_receipts_quantity_ty,
        txn_aur_ly: total_txn_aur_ly / total_total_quantity_without_filters,
        txn_aur_ty: total_txn_aur_ty / total_forecast_ty,
        aur_without_filters:
          total_aur_without_filters / total_total_quantity_without_filters,
        air_ly: total_air_ly / total_receipts_quantity_ly,
        air_ty:
          total_air_ty / total_receipts_quantity_ty === Infinity
            ? 0
            : total_air_ty / total_receipts_quantity_ty || 0,
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
        total_quantity_without_filters: total_total_quantity_without_filters,
        st_without_filters: total_st_without_filters / total_budget_ty,
        revenue_without_filters: total_revenue_without_filters,
        margin_perc_without_filters:
          total_margin_perc_without_filters / total_budget_ty,
        imu_ly: total_imu_ly / total_receipts_quantity_ly,
        imu_ty:
          total_imu_ty / total_receipts_quantity_ty === Infinity
            ? 0
            : total_imu_ty / total_receipts_quantity_ty || 0,
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

export const plotBudgetL2TableData = (
  props,
  optimizationLevels,
  formData,
  subChannelFormFields,
  setDynamicL2TableData,
  setLevelTwoOptions,
  setLevelTwoSelected,
  setSelectedSubChannel,
  setSubChannelOptions,
  setFormData,
  setSubChannelFormFields
) => {
  if (props.l2OptData?.data?.data?.length) {
    setDynamicL2TableData([]);
    let subChannels = uniqBy(props.l2OptData?.data?.data, "sub_channel");
    let subChannelOpt = subChannels?.map((item) => {
      return {
        label: item.sub_channel,
        value: item.sub_channel,
        id: item.sub_channel,
      };
    });
    let l2Values = uniqBy(props.l2OptData?.data?.data, "l2_name");
    let l2ValuesOpt = l2Values?.map((item) => {
      return {
        label: item.l2_name,
        value: item.l2_name,
        id: item.l2_name,
      };
    });
    setLevelTwoOptions(l2ValuesOpt);
    setLevelTwoSelected(l2ValuesOpt[0]);
    if (setSelectedSubChannel) {
      setSelectedSubChannel(subChannelOpt[0]);
      setSubChannelOptions(subChannelOpt);
    }
    let tableData = [];
    if (optimizationLevels.includes("carryover")) {
      tableData = cloneDeep(props.l2OptData.data?.data).map((item) => {
        if (!(formData.channel_list?.length > 1)) {
          item.penetration_ty = Math.round(item.penetration_ty * 10000) / 100;
        }
        item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
          props.screenConfiguration?.common?.drop_key || "drop"
        ]
          ? item[props.screenConfiguration?.common?.drop_key || "drop"]
          : "_";
        item.receipts_quantity_op = item.receipts_quantity_op
          ? item.receipts_quantity_op
          : 0;
        item.hierarchy = [item.l1_name + item.l2_name];
        if (item.carryover_flag !== "Total") {
          //plotings the subRows
          item.hierarchy.push(item.carryover_flag);
          item.parent_col = "carryover_flag";
        }
        item[
          "original_" + props?.screenConfiguration?.common?.final_level ||
            "l3_name"
        ] = item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item[
          props?.screenConfiguration?.common?.final_level || "l3_name"
        ] = item.new_l3_flag === ("true" || true)
          ? `${
              item[props?.screenConfiguration?.common?.final_level || "l3_name"]
            }  **`
          : item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item.l2_name = replaceSpecialCharacter(item.l2_name);
        item.uniqueId =
          item.l1_name +
          item.l2_name +
          item.l3_name +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.channel +
          item.sub_channel +
          item.carryover_flag;
        return item;
      });
    } else {
      tableData = cloneDeep(props.l2OptData.data?.data).map((item) => {
        if (!(formData.channel_list?.length > 1)) {
          item.penetration_ty = Math.round(item.penetration_ty * 10000) / 100;
        }
        item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
          props.screenConfiguration?.common?.drop_key || "drop"
        ]
          ? item[props.screenConfiguration?.common?.drop_key || "drop"]
          : "_";
        item.receipts_quantity_op = item.receipts_quantity_op
          ? item.receipts_quantity_op
          : 0;
        item[
          "original_" + props?.screenConfiguration?.common?.final_level ||
            "l3_name"
        ] = item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item[
          props?.screenConfiguration?.common?.final_level || "l3_name"
        ] = item.new_l3_flag === ("true" || true)
          ? `${
              item[props?.screenConfiguration?.common?.final_level || "l3_name"]
            }  **`
          : item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item.l2_name = replaceSpecialCharacter(item.l2_name);
        item.uniqueId =
          item.l1_name +
          item.l2_name +
          item.l3_name +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.channel +
          item.sub_channel;

        return item;
      });
    }
    //Populate channel filter dropdown options in case of wholesale plan or plan having multiple channels
    let formFields = [];
    let formValue = formData;
    if (isWholesalePlan(props.planDetails?.data)) {
      let sub_channel = groupBy(tableData, "sub_channel");
      let subchannelOpt = Object.keys(sub_channel).map((data) => {
        return {
          label: data,
          value: data,
          id: data,
        };
      });
      formValue.sub_channel_list = subchannelOpt?.[0]?.label;
      let subChannelFields = SUB_CHANNEL_FORM;
      subChannelFields.options = subchannelOpt;
      formFields.push(subChannelFields);
    }
    if (
      isChannelMultiple(props.planDetails?.data) &&
      !(formData?.channel_list?.length > 0)
    ) {
      let channelOpt = props.planDetails.data.channel.map((channelData) => {
        return {
          label: channelData,
          value: channelData,
          id: channelData,
        };
      });
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      formValue.channel_list = [defaultChannel?.label];
      let channelFields = CHANNEL_FORM;
      channelFields.options = channelOpt;
      channelFields.isMulti = true;
      formFields.push(channelFields);
    }

    setFormData(formValue);
    if (!isEmpty(formFields)) {
      setSubChannelFormFields(formFields);
    }
    setDynamicL2TableData(tableData);
  } else {
    let formValue = formData;
    let formFields = subChannelFormFields;
    if (
      isChannelMultiple(props.planDetails?.data) &&
      !(formData?.channel_list?.length > 0)
    ) {
      let channelOpt = props.planDetails.data.channel.map((channelData) => {
        return {
          label: channelData,
          value: channelData,
          id: channelData,
        };
      });
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      formValue.channel_list = [defaultChannel?.label];
      let channelFields = CHANNEL_FORM;
      channelFields.options = channelOpt;
      channelFields.isMulti = true;
      formFields.push(channelFields);
    }

    setFormData(formValue);
    if (!isEmpty(formFields)) {
      setSubChannelFormFields(formFields);
    }
    setDynamicL2TableData([]);
  }
};

export const plotBudgetL3TableData = (
  props,
  formData,
  setLevel3TableData,
  setFormData,
  setSubChannelFormFields
) => {
  const L3TableData = props.l3OptData?.data;
  if (L3TableData?.data?.length) {
    setLevel3TableData([]);
    let tableData = [];
    let formValue = formData;
    if (
      props.screenConfiguration?.common?.endpoint_project_name ===
      "assort-smart"
    ) {
      //checking if we are ging with the new flow mapping is different for both
      tableData = cloneDeep(L3TableData?.data).map((item) => {
        if (!(formData.channel_list?.length > 1)) {
          item.penetration_ty = Math.round(item.penetration_ty * 10000) / 100;
        }
        item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
          props.screenConfiguration?.common?.drop_key || "drop"
        ]
          ? item[props.screenConfiguration?.common?.drop_key || "drop"]
          : "_";
        item.receipts_quantity_op = item.receipts_quantity_op
          ? item.receipts_quantity_op
          : 0;
        item.hierarchy = [item.l1_name + item.l2_name + item.l3_name];
        if (item.carryover_flag !== "Total") {
          //plotings the subRows
          item.hierarchy.push(item.carryover_flag);
          item.parent_col = "carryover_flag";
        }
        item[
          "original_" + props?.screenConfiguration?.common?.final_level ||
            "l3_name"
        ] = item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item[
          props?.screenConfiguration?.common?.final_level || "l3_name"
        ] = item.new_l3_flag === ("true" || true)
          ? `${
              item[props?.screenConfiguration?.common?.final_level || "l3_name"]
            }  **`
          : item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item.l2_name = replaceSpecialCharacter(item.l2_name);
        item.l3_name = replaceSpecialCharacter(item.l3_name);
        item.uniqueId =
          item[
            "original_" + props?.screenConfiguration?.common?.final_level ||
              "l3_name"
          ] +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.sub_channel +
          item.l2_name +
          item.l1_name +
          item.carryover_flag +
          item.drop;
        return item;
      });
    } else {
      tableData = cloneDeep(L3TableData?.data).map((item) => {
        if (!(formData.channel_list?.length > 1)) {
          item.penetration_ty = Math.round(item.penetration_ty * 10000) / 100;
        }
        item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
          props.screenConfiguration?.common?.drop_key || "drop"
        ]
          ? item[props.screenConfiguration?.common?.drop_key || "drop"]
          : "_";
        item[
          "original_" + props?.screenConfiguration?.common?.final_level ||
            "l3_name"
        ] = item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item[
          props?.screenConfiguration?.common?.final_level || "l3_name"
        ] = item.new_l3_flag === ("true" || true)
          ? `${
              item[props?.screenConfiguration?.common?.final_level || "l3_name"]
            }  **`
          : item[props?.screenConfiguration?.common?.final_level || "l3_name"];
        item.receipts_quantity_op = item.receipts_quantity_op
          ? item.receipts_quantity_op
          : 0;
        item.l2_name = replaceSpecialCharacter(item.l2_name);
        item.l3_name = replaceSpecialCharacter(item.l3_name);
        item.uniqueId =
          item[
            "original_" + props?.screenConfiguration?.common?.final_level ||
              "l3_name"
          ] +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.sub_channel +
          item.l2_name +
          item.l1_name +
          item.drop;
        return item;
      });
    }
    //Populate channel filter dropdown options in case of wholesale plan or plan having multiple channels
    let formFields = [];
    if (isWholesalePlan(props.planDetails?.data)) {
      let sub_channel = groupBy(tableData, "sub_channel");
      let subchannelOpt = Object.keys(sub_channel).map((data) => {
        return {
          label: data,
          value: data,
          id: data,
        };
      });
      formValue.sub_channel_list = subchannelOpt?.[0]?.label;
      let subChannelFeilds = SUB_CHANNEL_FORM;
      subChannelFeilds.options = subchannelOpt;
      formFields.push(subChannelFeilds);
    }
    if (
      isChannelMultiple(props.planDetails?.data) &&
      !(formData?.channel_list?.length > 0)
    ) {
      let channelOpt = props.planDetails.data.channel.map((chan) => {
        return {
          label: chan,
          value: chan,
          id: chan,
        };
      });
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      formValue.channel_list = [defaultChannel?.label];
      let channelFeilds = CHANNEL_FORM;
      channelFeilds.options = channelOpt;
      channelFeilds.isMulti = true;
      formFields.push(channelFeilds);
    }
    setFormData(formValue);
    if (!isEmpty(formFields)) {
      setSubChannelFormFields(formFields);
    }
    setLevel3TableData(tableData);
  } else if (L3TableData?.status) {
    setLevel3TableData([]);
  } else {
    setLevel3TableData([]);
  }
};

export const updateL3Data = async (
  level,
  is_update_plan_step,
  isLevel2Required,
  props
) => {
  let l3RowData = [];
  // Removing footer row
  if (isLevel2Required && level === "l2_name") {
    props.budgetL3Instance?.current.api.forEachNode((row) => {
      if (row.data.l3_name !== "Total") {
        l3RowData.push(row.data);
      }
    });
  } else {
    props.budgetL3Instance?.current.api.forEachNode((row) => {
      let rowData = cloneDeep(row.data);
      rowData["l3_name"] = rowData?.["l3_name"]?.split("  **")?.[0];
      if (row.data?.l3_name !== "Total") {
        l3RowData.push(rowData);
      }
    });
  }
  let l3Instance = {
    data: l3RowData,
  };
  let plan_sub_step = "optimization_table_cluster";
  if (level === "l2_name") {
    let index = props.optimizationLevels.findIndex(
      (level) => level === "l2_name"
    );
    plan_sub_step =
      `optimization_table_${props.optimizationLevels.slice(index + 1)?.[0]}` ||
      "optimization_table_cluster";
  }
  let updateL3Response = await props.updateL3OptData(
    {
      ...getPayloadForL3(
        l3Instance,
        props.levelsJson,
        false,
        level === "l2_name"
          ? props.l2OptData?.data?.data
          : props.l3OptData?.data?.data,
        props.screenConfiguration
      ),
      is_update_plan_step: is_update_plan_step || false,
      plan_sub_step: plan_sub_step,
      is_value_changed: props.isDataChanged,
      optimization_level:
        level === "l2_name" ? "l2_optimization" : "l3_optimization",
      is_cluster_pen_ty:
        level === "l2_name" ? false : props.isPenValueChanged || true,
      plan_code: props.planDetails?.data?.plan_code,
    },
    props.screenConfiguration?.common?.endpoint_project_name || "assort",
    props.planDetails?.data?.plan_code
  );
  if (updateL3Response?.data?.status) {
    return true;
  } else {
    props.setLoader(false);
    return false;
  }
};
