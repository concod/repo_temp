import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  addDropToPayload,
  calculateNoOfWeeks,
  getPlanPayload,
  isWholesalePlan,
  attributeFormatter,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

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
          replaceSpecialCharacter(
            item[props.screenConfiguration?.common?.final_level || "l3_name"]
          ).includes(
            element[props.screenConfiguration?.common?.final_level || "l3_name"]
          ) &&
          item.l2_name === element.l2_name &&
          (attributeFormatter(
            item[props.screenConfiguration?.common?.drop_key || "drop"]
          ) || "-") ===
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

          returnItem["all_door_cc_enabled"] = props.coreChoice
            ? "True"
            : "False";

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
          returnItem["store_cnt"] = element[`store_cnt_${clusterCode}`];
          returnItem["cc_ly"] = element[`cc_${clusterCode}`];
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
          returnItem["choice_count_ly"] = element["choice_count_ly"];
          returnItem["receipt_units_ty"] = element["receipt_units_ty"];
          returnItem["receipt_units_ly"] = element["receipt_units_ly"];
          returnItem["sales_units_ty"] = element["sales_units_ty"];
          returnItem["sales_units_ly"] = element["sales_units_ly"];
          returnItem["min_cc_threshold"] = getFormatedValueIfPresent(
            element,
            "float",
            "min_cc_threshold"
          );
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

export const recalculateApsTotalCol = (tableData, clusterCodes) => {
  // tableData.forEach((data) => {
  //   let num = 0;
  //   let totalClusterQty = 0;
  //   clusterCodes.forEach((code) => {
  //     num = num + data[`aps_${code}_ty`] * data[`qty_${code}_ty`];
  //     totalClusterQty = totalClusterQty + data[`qty_${code}_ty`];
  //   });
  //   data["aps_total_ty"] = totalClusterQty > 0 ? num / totalClusterQty : 0;
  // });
  tableData.forEach((row) => {
    let num = 0,
      numLy = 0,
      sumStrCnt = 0;
    let regWksArr = [],
      regWksArrTy = [],
      ccArr = [];
    let totalClusterQty = 0,
      totalClusterQtyLy = 0;
      clusterCodes.forEach((code) => {
      num =
        num +
        row[`aps_${code}_ty`] *
          row[`reg_wks_${code}_ty`] *
          (row[`cc_${code}`] || 1) *
          row[`store_cnt_${code}`];
      numLy =
        numLy +
        row[`aps_${code}_ly`] *
          row[`reg_wks_${code}_ly`] *
          (row[`cc_${code}`] || 1) *
          row[`store_cnt_${code}`];

      sumStrCnt += row[`store_cnt_${code}`];
      regWksArr.push(row[`reg_wks_${code}_ly`]);
      regWksArrTy.push(row[`reg_wks_${code}_ty`]);
      ccArr.push(row[`cc_${code}`]);
    });
    if (
      Math.max(...ccArr) > 0 &&
      sumStrCnt > 0 &&
      Math.max(...regWksArrTy) > 0
    ) {
      row["aps_total_ty"] =
        num / Math.max(...ccArr) / sumStrCnt / Math.max(...regWksArrTy);
      row["aps_total_ly"] =
        numLy / Math.max(...ccArr) / sumStrCnt / Math.max(...regWksArr);
    } else {
      row["aps_total_ty"] = 0;
      row["aps_total_ly"] = 0;
    }
  });
  return tableData;
};

export const onFooterTotalRegWeekEdit = (
  tableData,
  footerRow,
  initialValue,
  colId,
  clusterCodes,
  isValid
) => {
  tableData?.forEach((data) => {
    if (data.drop === footerRow.drop) {
      if (data[colId]) {
        data[colId] = footerRow[colId];
      }
      if (
        colId.includes("reg_wks_") &&
        colId !== "reg_wks_total_ty" &&
        isValid
      ) {
        getTotalRegWeeksOfRow([data], clusterCodes);
      } else if (colId === "reg_wks_total_ty" && isValid) {
        clusterCodes.forEach((code) => {
          data[`reg_wks_${code}_ty`] = data[colId];
        });
      }
    }
  });
  return tableData;
};

export const onFooterTotalStEdit = (
  tableData,
  footerRow,
  initialValue,
  colId,
  clusterCodes
) => {
  tableData?.forEach((data) => {
    if (data.drop === footerRow.drop) {
      if (data[colId]) {
        data[colId] = footerRow[colId];
      }
      if (colId === "st_total_ty") {
        clusterCodes.forEach((code) => {
          data[`st_${code}_ty`] = data[colId];
        });
      } else {
        let num = 0;
        let totalClusterQty = 0;
        clusterCodes.forEach((code) => {
          num = num + data[`st_${code}_ty`] * data[`qty_${code}_ty`];
          totalClusterQty = totalClusterQty + data[`qty_${code}_ty`];
        });
        data["st_total_ty"] = num / totalClusterQty;
      }
    }
  });
  return tableData;
};

export const onFooterTotalApsEdit = (
  tableData,
  footerRow,
  initialValue,
  colId,
  clusterCodes,
  droplevelL3
) => {
  let changedL3TotalDrop = {};
  tableData?.forEach((data) => {
    if (data.drop === footerRow.drop) {
      let init = data[colId];
      data["old_" + colId] = data[colId];
      data[colId] =
        initialValue > 0
          ? (data[colId] * footerRow[colId]) / initialValue
          : footerRow[colId] / droplevelL3[footerRow.drop]?.length;
      if (colId.includes("aps_") && colId !== "aps_total_ty") {
        let num = 0;
        let totalClusterQty = 0;
        clusterCodes.forEach((code) => {
          num = num + data[`aps_${code}_ty`] * data[`qty_${code}_ty`];
          totalClusterQty = totalClusterQty + data[`qty_${code}_ty`];
        });
        data["aps_total_ty"] = totalClusterQty > 0 ? num / totalClusterQty : 0;
      } else if (colId === "aps_total_ty") {
        clusterCodes.forEach((code) => {
          data[`old_aps_${code}_ty`] = data[`aps_${code}_ty`];
          data[`aps_${code}_ty`] =
            init && init > 0
              ? (data[colId] / init) * data[`aps_${code}_ty`]
              : data[colId];
        });
      }
      if (footerRow.drop?.trim() === "Total") {
        changedL3TotalDrop[data.l3_name] = data;
      }
    }
  });
  tableData?.forEach((data) => {
    if (footerRow.drop?.trim() === "Total" && footerRow.drop !== data.drop) {
      if (colId.includes("aps_") && colId !== "aps_total_ty") {
        if (data[colId]) {
          let parentRow = changedL3TotalDrop[data.l3_name];
          data[colId] =
            (data[colId] * parentRow[colId]) / parentRow[`old_${colId}`];
          let num = 0;
          let totalClusterQty = 0;
          clusterCodes.forEach((code) => {
            num = num + data[`aps_${code}_ty`] * data[`qty_${code}_ty`];
            totalClusterQty = totalClusterQty + data[`qty_${code}_ty`];
          });
          data["aps_total_ty"] =
            totalClusterQty > 0 ? num / totalClusterQty : 0;
        }
      }
      if (colId === "aps_total_ty") {
        let totalTabL3row = changedL3TotalDrop[data.l3_name];
        clusterCodes.forEach((code) => {
          data[`aps_${code}_ty`] =
            totalTabL3row[`old_aps_${code}_ty`] &&
            totalTabL3row[`old_aps_${code}_ty`] > 0
              ? (totalTabL3row[`aps_${code}_ty`] /
                  totalTabL3row[`old_aps_${code}_ty`]) *
                data[`aps_${code}_ty`]
              : totalTabL3row[`aps_${code}_ty`];
        });
      }
    }
  });
  return tableData;
};

export const getAPSTotalFooterRow = (tableData, uniqueClusterData, props) => {
  let footer = [];

  //To group data based on drop
  const groupBy_properties = [
    props.screenConfiguration?.common?.drop_key || "drop",
  ];
  if (props.planDetails?.data?.channel?.length > 1) {
    groupBy_properties.push("channel");
  }
  if (props.planDetails?.data?.l2_name?.length > 1) {
    groupBy_properties.push("l2_name");
  }
  if (props.planDetails?.data?.l1_name?.length > 1) {
    groupBy_properties.push("l1_name");
  }
  const groupedDrop = groupByCustom({
    Group: tableData,
    By: groupBy_properties,
  });
  Object.keys(groupedDrop).forEach((drop) => {
    let totalAttr = {
      aps_total_ly: 0,
      aps_total_ty: 0,
      st_total_ly: 0,
      st_total_ty: 0,
      reg_wks_total_ty: 0,
      reg_wks_total_ly: 0,
      constraint_aps_total_ty: 0,
    };
    let totalQty = {
      qty_ty: 0,
      qty_ly: 0,
      aps_total_stqty_ly: 0,
      aps_total_stqty_ty: 0,
      receipt_units_ty: 0,
      receipt_units_ly: 0,
      sales_units_ty: 0,
      sales_units_ly: 0,
      choice_count_ly: 0,
    };
    let regWksArr = [],
      regWksArrTy = [],
      ccArr = [],
      strCntArr = [];
    let clusterAttr = {};
    let qtyStTy = 0;
    let qtyStLy = 0;
    uniqueClusterData.forEach((list) => {
      clusterAttr[`aps_${list}_ly`] = 0;
      clusterAttr[`aps_${list}_ty`] = 0;
      clusterAttr[`constraint_aps_${list}_ty`] = 0;
      clusterAttr[`st_${list}_ly`] = 0;
      clusterAttr[`st_${list}_ty`] = 0;
      clusterAttr[`reg_wks_${list}_ly`] = 0;
      clusterAttr[`reg_wks_${list}_ty`] = 0;
      totalQty[`qty_${list}_ly`] = 0;
      totalQty[`qty_${list}_ty`] = 0;
      totalQty[`aps_stqty_${list}_ty`] = 0;
      totalQty[`aps_stqty_${list}_ly`] = 0;
    });
    let num = 0,
      numLy = 0;
    groupedDrop[drop].forEach((data) => {
      regWksArr.push(data.reg_wks_total_ly);
      regWksArrTy.push(data.reg_wks_total_ty);
      let strCnt = 0;

      uniqueClusterData.forEach((clust) => {
        strCnt += data[`store_cnt_${clust}`];
        qtyStTy += data[`qty_${clust}_ty`] * (data[`st_${clust}_ty`] / 100);
        qtyStLy += data[`qty_${clust}_ly`] * data[`st_${clust}_ly`];
        ccArr.push(data[`cc_${clust}`]);
      });
      strCntArr.push(strCnt);
      Object.keys(totalAttr).forEach((totalKey) => {
        if (totalKey.includes("aps_")) {
          let keySplit = totalKey.split("aps_total_");
          if (totalKey.includes("ly")) {
            totalAttr[totalKey] += data[totalKey] * data["total_st_qty"];
          } else {
            totalAttr[totalKey] +=
              data[totalKey] *
              (data[`st_total_${keySplit[1]}`] *
                (keySplit[1].includes("ly") ? 100 : 1)) *
              data[`qty_${keySplit[1]}`];
          }
          if (!totalKey.includes("constraint_")) {
            if (totalKey.includes("ly")) {
              totalQty[`aps_total_stqty_${keySplit[1]}`] +=
                data["total_st_qty"];
            } else {
              totalQty[`aps_total_stqty_${keySplit[1]}`] +=
                data[`st_total_${keySplit[1]}`] *
                (keySplit[1].includes("ly") ? 100 : 1) *
                data[`qty_${keySplit[1]}`];
            }
          }
        } else if (totalKey.includes("st_") || totalKey.includes("reg_wks_")) {
          let keySplit = totalKey.split(
            totalKey.includes("st_") ? "st_total_" : "reg_wks_total_"
          );
          totalAttr[totalKey] += data[totalKey] * data[`qty_${keySplit[1]}`];
        }
      });
      Object.keys(totalQty).forEach((totalKey) => {
        if (totalKey.includes("aps_")) {
          if (!totalKey.includes("aps_total")) {
            let keySplit = totalKey.split("aps_stqty_");
            totalQty[totalKey] +=
              data[`st_${keySplit[1]}`] *
              (keySplit[1].includes("ly") ? 100 : 1) *
              data[`qty_${keySplit[1]}`];
          }
        } else {
          totalQty[totalKey] += data[totalKey];
        }
      });
      Object.keys(clusterAttr).forEach((attrKey) => {
        if (attrKey.includes("aps_")) {
          let keySplit = attrKey.split("aps_");
          clusterAttr[attrKey] +=
            data[attrKey] *
            (data[`st_${keySplit[1]}`] *
              (keySplit[1].includes("ly") ? 100 : 1)) *
            data[`qty_${keySplit[1]}`];
          clusterAttr[attrKey] += data[attrKey];
        } else if (attrKey.includes("st_") || attrKey.includes("reg_wks_")) {
          let keySplit = attrKey.split(
            attrKey.includes("st_") ? "st_" : "reg_wks_"
          );
          clusterAttr[attrKey] += data[attrKey] * data[`qty_${keySplit[1]}`];
        }
      });
      num +=
        data["aps_total_ty"] *
        data["reg_wks_total_ty"] *
        Math.max(...ccArr) *
        strCnt;
      numLy +=
        data["aps_total_ly"] *
        data["reg_wks_total_ly"] *
        Math.max(...ccArr) *
        strCnt;
    });
    Object.keys(clusterAttr).forEach((attrKey) => {
      if (!attrKey.includes("aps_")) {
        let keySplit = attrKey.split(
          attrKey.includes("st_") ? "st_" : "reg_wks_"
        );
        if (totalQty[`qty_${keySplit[1]}`]) {
          clusterAttr[attrKey] =
            clusterAttr[attrKey] / totalQty[`qty_${keySplit[1]}`];
        } else {
          clusterAttr[attrKey] = 0;
        }
      } else {
        let keySplit = attrKey.split("aps_");
        if (totalQty[`aps_stqty_${keySplit[1]}`]) {
          clusterAttr[attrKey] =
            clusterAttr[attrKey] / totalQty[`aps_stqty_${keySplit[1]}`];
        }
      }
    });
    totalAttr["st_total_ty"] =
      totalQty.qty_ty > 0 ? totalAttr["st_total_ty"] / totalQty.qty_ty : 0;
    totalAttr["st_total_ly"] =
      totalQty.qty_ly > 0 ? totalAttr["st_total_ly"] / totalQty.qty_ly : 0;
    // totalAttr["aps_total_ty"] =
    //   totalQty.aps_total_stqty_ty > 0
    //     ? totalAttr["aps_total_ty"] / totalQty.aps_total_stqty_ty
    //     : 0;
    totalAttr["constraint_aps_total_ty"] =
      totalQty.qty_ty > 0
        ? totalAttr["constraint_aps_total_ty"] / totalQty.aps_total_stqty_ty
        : 0;
    if (Math.max(...strCntArr)) {
      if (Math.max(...regWksArr)) {
        totalAttr["aps_total_ly"] =
          numLy /
          (totalQty.choice_count_ly || 1) /
          Math.max(...regWksArr) /
          Math.max(...strCntArr);
      } else {
        totalAttr["aps_total_ly"] = 0;
      }
      if (Math.max(...regWksArrTy)) {
        totalAttr["aps_total_ty"] =
          num /
          (totalQty.choice_count_ly || 1) /
          Math.max(...regWksArrTy) /
          Math.max(...strCntArr);
      } else {
        totalAttr["aps_total_ty"] = 0;
      }
    } else {
      totalAttr["aps_total_ty"] = 0;
      totalAttr["aps_total_ly"] = 0;
    }
    totalAttr["reg_wks_total_ty"] =
      totalQty.qty_ty > 0 ? totalAttr["reg_wks_total_ty"] / totalQty.qty_ty : 0;
    totalAttr["reg_wks_total_ly"] =
      totalQty.qty_ly > 0 ? totalAttr["reg_wks_total_ly"] / totalQty.qty_ly : 0;
    footer.push({
      l2_name: groupedDrop[drop][0]?.l2_name,
      l1_name: groupedDrop[drop][0]?.l1_name,
      l3_name: "Total",
      [props.screenConfiguration?.common?.drop_key || drop]: groupedDrop[
        drop
      ][0]?.[props.screenConfiguration?.common?.drop_key || "drop"],
      channel: groupedDrop[drop][0]?.channel,
      uniqueID:
        "total" +
        groupedDrop[drop][0]?.[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] +
        groupedDrop[drop][0]?.l1_name +
        groupedDrop[drop][0]?.l2_name +
        groupedDrop[drop][0]?.l3_name,
      ...totalAttr,
      ...clusterAttr,
      ...totalQty,
    });
  });
  return footer;
};
