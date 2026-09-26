import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  addDropToPayload,
  calculateNoOfWeeks,
  getPlanPayload,
  isWholesalePlan,
  attributeFormatter,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { cloneDeep } from "lodash";

export const getOptimizeApsStPayload = (props) => {
  let planData = props.planDetails?.data;
  let payload = getPlanPayload(planData, props.planLevels, true);
  payload.filters.push({
    attribute_name: "channel",
    prefix: "levels",
    value: planData.channel,
    operator: "in",
  });
  payload.filters.push({
    attribute_name: "store_type",
    value: planData.channel,
    operator: "in",
  });
  payload.filters.push({
    attribute_name: "sub_channel",
    prefix: "levels",
    value: isWholesalePlan(planData)
      ? common.__sub_channel_wholesale
      : planData.sub_channel || planData.channel,
    operator: "in",
  });
  payload = addDropToPayload(
    planData,
    payload,
    props.screenConfiguration?.common?.drop_key
  );
  payload.compare_type = planData.compare_year;
  payload.run_size_curve_flag = false;
  if (planData.data_pull_source) {
    payload.data_pull_source = planData.data_pull_source;
  }
  payload.compare_season = planData.compare_season || "";
  payload.plan_sub_step = "aps-st-table";
  return payload;
};

export const handleRegWksValidation = (
  formData,
  props,
  planDetails,
  coreChoice
) => {
  const noOfWeeks = calculateNoOfWeeks(
    planDetails?.data?.selling_period_edate,
    planDetails?.data?.selling_period_sdate
  );
  for (const key in formData) {
    if (key === "reg_wks_ty" && formData[key] > noOfWeeks) {
      props.addSnack({
        message: "Reg wks should not be more than " + noOfWeeks,
        options: {
          variant: "error",
        },
      });
      return false;
    }
    if (key === "min_cc") {
      const max_value = parseInt(props.selectedRowIds[0]?.data?.max_cc);
      if (
        (max_value && parseInt(formData[key]) > max_value) ||
        (formData["max_cc"] &&
          parseInt(formData[key]) > parseInt(formData["max_cc"]))
      ) {
        props.addSnack({
          message: "Min Choice Count should not be more tham Max Choice Count",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
    if (key === "max_cc") {
      let min_value = parseInt(props.selectedRowIds[0]?.data?.min_cc);
      if (
        coreChoice &&
        parseInt(formData[key]) <
          parseInt(props.selectedRowIds[0]?.data?.all_door_cc)
      ) {
        props.addSnack({
          message:
            "Max choice count cannot be lesser than All door choice count",
          options: {
            variant: "error",
          },
        });
        return false;
      }
      if (
        (min_value && parseInt(formData[key]) < min_value) ||
        (formData["min_cc"] &&
          parseInt(formData[key]) < parseInt(formData["min_cc"]))
      ) {
        props.addSnack({
          message: "Max Choice Count should be more tham Min Choice Count",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
  }
  return true;
};

export const getMultiplicativeFactor = (item, element, type, key) => {
  //This function is used to generate multiplicative factor for cluster update api payload
  //multipicative factor is 1 if both the instance data and api response data are same
  // else it will return the value which we get from dividing instance data by api response data
  if (type === "float") {
    if (key === "aps_ty") {
      return parseFloat(element[key]) === item[key]
        ? 1
        : parseFloat(element[key]) / item[key];
    }
    return parseFloat(element[key]) === Math.round(item[key] * 100) / 100
      ? 1
      : parseFloat(element[key]) / (Math.round(item[key] * 100) / 100);
  } else if (type === "int") {
    return parseInt(element[key]) === parseInt(item[key])
      ? 1
      : parseInt(element[key]) / parseInt(item[key]);
  }
};

export const getFormatedValueIfPresent = (element, type, key) => {
  //If the value was present for that particular key then it will format data based on type else it will return value without any formatting
  if (type === "float") {
    return element[key] ? parseFloat(element[key]) : element[key];
  } else if (type === "int") {
    return element[key] ? parseInt(element[key]) : element[key];
  }
};

export const updateApsstPayload = (
  apsStData,
  apsTableInstance,
  clusterCodes,
  props
) => {
  let payload = apsStData?.map((item) => {
    let returnItem = cloneDeep(item);
    apsTableInstance?.current?.api?.forEachNode((element) => {
      element = element.data;
      clusterCodes.forEach((clusterCode, index) => {
        clusterCode = clusterCode?.toLowerCase();
        if (
          item.l3_name.includes(element.l3_name) &&
          item.l2_name === element.l2_name &&
          attributeFormatter(
            item[props.screenConfiguration?.common?.drop_key || "drop"]
          ) ===
            element[props.screenConfiguration?.common?.drop_key || "drop"] &&
          item.channel === element.channel &&
          item.plan_clu_aps_id === element[`plan_clu_aps_id_${clusterCode}`] &&
          item.plan_l3_aps_id === element.plan_l3_aps_id
        ) {
          //L3 payload calculation
          returnItem["aps_total_ty"] = element["aps_total_ty"];
          returnItem["aps_total_ly"] = element["aps_total_ly"];
          returnItem["APS_TY"] = element[`aps_${clusterCode}_ty`];
          returnItem["st_total_ty"] = element["st_total_ty"] / 100;
          returnItem["st_total_ly"] = element["st_total_ly"];

          returnItem["ST_TY"] = element[`st_${clusterCode}_ty`] / 100;
          returnItem["reg_wks_total_ty"] = element["reg_wks_total_ty"];
          returnItem["reg_wks_total_ly"] = element["reg_wks_total_ly"];
          returnItem["REG_WKS_TY"] = element[`reg_wks_${clusterCode}_ty`];

          returnItem["all_door_cc"] = element["all_door_cc"];

          returnItem["all_door_cc_enabled"] = props.coreChoice;

          //cluster payload calculation
          returnItem["cluster_code"] = clusterCode?.toUpperCase();
          returnItem["aps_ly"] = element?.[`aps_${clusterCode}_ly`];
          returnItem["aps_ty"] = element?.[`aps_${clusterCode}_ty`];
          returnItem["aps_ty_changed"] =
            element[`aps_${clusterCode}_ty`] ===
            item?.attribute_value?.["aps_ty"]
              ? false
              : true;
          returnItem["st_ly"] = element[`st_${clusterCode}_ly`];
          returnItem["st_ty"] = element[`st_${clusterCode}_ty`] / 100;
          returnItem["reg_wks_ly"] = element[`reg_wks_${clusterCode}_ly`];
          returnItem["avg_wk_cnt_ly"] = element[`reg_wks_${clusterCode}_ly`];

          returnItem["reg_wks_ly"] = element[`reg_wks_${clusterCode}_ly`];
          returnItem["reg_wks_ty"] = element[`reg_wks_${clusterCode}_ty`];
          returnItem["avg_wk_cnt_ly"] = element[`reg_wks_${clusterCode}_ly`];
          returnItem["avg_wk_cnt_ty"] = element[`reg_wks_${clusterCode}_ty`];

          returnItem["max_cc"] = getFormatedValueIfPresent(
            element,
            "float",
            "max_cc"
          );
          returnItem["min_cc"] = getFormatedValueIfPresent(
            element,
            "float",
            "min_cc"
          );
          returnItem["moq"] = getFormatedValueIfPresent(element, "int", `moq`);
          returnItem["cc_threshold"] = getFormatedValueIfPresent(
            element,
            "float",
            "cc_threshold"
          );
          returnItem["receipt_index"] = element[`receipt_index_${clusterCode}`];
        }
      });
    });
    return returnItem;
  });
  return payload;
};

export const optimizeDepthChoicePayload = (planData, props) => {
  let payload = getPlanPayload(planData, props.planLevels, true);
  payload.compare_type = planData.compare_year;
  payload.run_size_curve_flag = false;
  payload.filters.push({
    attribute_name: "channel",
    prefix: "levels",
    value: planData.channel,
    operator: "in",
  });
  payload.filters.push({
    attribute_name: "sub_channel",
    prefix: "levels",
    value: isWholesalePlan(planData)
      ? common.__sub_channel_wholesale
      : planData.sub_channel || planData.channel,
    operator: "in",
  });
  payload = addDropToPayload(
    props.planDetails?.data,
    payload,
    props.screenConfiguration?.common?.drop_key
  );
  payload.all_door_cc = props.coreChoice ? true : false;
  payload.plan_sub_step = "depth-choice-table";
  return payload;
};
