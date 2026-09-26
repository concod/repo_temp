import { cloneDeep, find, groupBy, isArray } from "lodash";
import { DEFAULT_IMAGE_LINK } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  attributeFormatter,
  isChannelMultiple,
  isDropPlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

// export const calculateWedgeSubRow = (wedgeData) => {
//   let tempWedgeData = groupByCustom({
//     Group: wedgeData,
//     By: ["parent_wedge_id", "cluster_code"],
//   });
//   let parent = [];
//   Object.keys(tempWedgeData).forEach((data) => {
//     if (!parent[data]) parent[data] = {};
//     tempWedgeData[data].sort((a, b) =>
//       a[props.screenConfiguration?.common?.drop_key || "drop_name"].localeCompare(b[props.screenConfiguration?.common?.drop_key || "drop_name"] || "-")
//     );
//     Object.keys(tempWedgeData[data]).forEach((index) => {
//       //check if parent row's dropname exists
//       if (
//         tempWedgeData[data][index]?.[props.screenConfiguration?.common?.drop_key || "drop_name"] === "-" ||
//         tempWedgeData[data][index]?.[props.screenConfiguration?.common?.drop_key || "drop_name"] === null
//       ) {
//         // pick parent rows from list of data
//         parent[data] = tempWedgeData[data][index];
//       }
//       //check for subrows
//       if (
//         tempWedgeData[data][index]?.[props.screenConfiguration?.common?.drop_key || "drop_name"] &&
//         tempWedgeData[data][index]?.[props.screenConfiguration?.common?.drop_key || "drop_name"] !== "-"
//       ) {
//         if (!parent[data]["subRows"]) parent[data]["subRows"] = [];
//         //add subrows into the parent row
//         parent[data]["subRows"].push(tempWedgeData[data][index]);
//       }
//       return null;
//     });
//     return null;
//   });
//   return [].concat.apply([], parent);
// };

export const calculateFlowWedgeSubRow = (props, wedgeData) => {
  let tempWedgeData = groupByCustom({
    Group: wedgeData,
    By: ["parent_wedge_id", "cluster_code"],
  });
  let parent = [];
  Object.keys(tempWedgeData).forEach((data) => {
    if (!parent[data]) parent[data] = {};
    tempWedgeData[data].sort((a, b) =>
      a[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
      ].localeCompare(
        b[`${props.screenConfiguration?.common?.flow_key || "flow"}_name`] ||
          "-"
      )
    );
    Object.keys(tempWedgeData[data]).forEach((index) => {
      //check if parent row's flowname exists
      if (
        tempWedgeData[data][index]?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
        ] === "-" ||
        tempWedgeData[data][index]?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
        ] === null
      ) {
        // pick parent rows from list of data
        parent[data] = tempWedgeData[data][index];
      }
      //check for subrows
      if (
        tempWedgeData[data][index]?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
        ] &&
        tempWedgeData[data][index]?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
        ] !== "-"
      ) {
        if (!parent[data]["subRows"]) parent[data]["subRows"] = [];
        //add subrows into the parent row
        parent[data]["subRows"].push(tempWedgeData[data][index]);
      }
      return null;
    });
    return null;
  });
  return [].concat.apply([], parent);
};

export const calculateStyleCarryoverWedgeSubRow = (wedgeData) => {
  let tempWedgeData = groupByCustom({
    Group: wedgeData,
    By: ["style_id", "cluster_code"],
  });
  // Check if parent row is present for the grouped style_id and cluster_code
  let filteredData = [];
  tempWedgeData.map((data) => {
    let containsParentRow = data.find(
      (sub) => sub.attribute_value.choice_carryover_flag === "Total"
    );
    if (containsParentRow) {
      filteredData.push(data);
    }
  });
  tempWedgeData = filteredData;
  let parent = [];
  try {
    Object.keys(tempWedgeData).forEach((data) => {
      Object.keys(tempWedgeData[data]).forEach((index) => {
        //check if parent row's flowname exists
        tempWedgeData[data].sort((a, b) =>
          b.attribute_value?.choice_carryover_flag.localeCompare(
            a.attribute_value?.choice_carryover_flag || "Total"
          )
        );
        if (
          tempWedgeData[data][index]?.attribute_value?.choice_carryover_flag ===
            "Total" ||
          tempWedgeData[data][index]?.attribute_value?.choice_carryover_flag ===
            null ||
          !tempWedgeData[data][index]?.attribute_value?.choice_carryover_flag
        ) {
          // pick parent rows from list of data
          parent[data] = tempWedgeData[data][index];
        }
        //check for subrows
        if (
          tempWedgeData[data][index]?.attribute_value?.choice_carryover_flag &&
          tempWedgeData[data][index]?.attribute_value?.choice_carryover_flag !==
            "Total"
        ) {
          if (!parent[data]["subRows"]) parent[data]["subRows"] = [];
          //add subrows into the parent row
          parent[data]["subRows"].push(tempWedgeData[data][index]);
        }
        return null;
      });
      return null;
    });
    return [].concat.apply([], parent);
  } catch (err) {
    console.log("err", err);
  }
};

export const wedgeDataPlotting = (
  props,
  data,
  attribute_list,
  wedgeAttributesData,
  planDetails,
  setAttributesForStylesJson,
  setStylesForattributesJson,
  type
) => {
  let tableData = [],
    choiceLevelData = [],
    groupedWedgeData = [],
    attributeKey = [],
    tempWedgeTabelData;
  // integrate subrows into rows.
  if (type === "style_level") {
    tempWedgeTabelData = calculateStyleCarryoverWedgeSubRow(
      cloneDeep(data)?.sort((a, b) =>
        a.cluster_code.localeCompare(b.cluster_code)
      )
    );
  } else {
    tempWedgeTabelData = calculateFlowWedgeSubRow(
      props,
      cloneDeep(data)?.sort((a, b) =>
        a.cluster_code.localeCompare(b.cluster_code)
      )
    );
  }

  tempWedgeTabelData.map((k) => {
    if (
      choiceLevelData[
        k?.attribute_value?.choice_name +
          k[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`] +
          k.l1_name +
          k.l2_name
      ] === undefined
    )
      choiceLevelData[
        k.attribute_value?.choice_name +
          k[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`] +
          k.l1_name +
          k.l2_name
      ] = [];
    choiceLevelData[
      k.attribute_value?.choice_name +
        k[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`] +
        k.l1_name +
        k.l2_name
    ].push(k);
    return k;
  });
  Object.keys(choiceLevelData).forEach((group) => {
    groupedWedgeData.push(choiceLevelData[group]);
    return null;
  });
  if (type === "style_level") {
    let tempWedgeData = groupByCustom({
      Group: groupedWedgeData[0],
      By: [
        "style_id",
        `${props.screenConfiguration?.common?.flow_key || "flow"}_name`,
      ],
    });
    groupedWedgeData = tempWedgeData;
  }
  wedgeAttributesData &&
    wedgeAttributesData.map((attr) => {
      attributeKey.push(attr.attribute_name);
      return null;
    });
  //style id will be the key and attribute concatinated and set as value
  let attributeForStyle = {};
  // attribute concatinated and set as Key. value is an array because particular combo can have 2 are more styles
  let stylesForAttribute = {};
  // NOTE: remove when data is coming correct (for fewcases getting flow_1 and flow_2 without any total flow which means we have child rows without any parent, which is causing issue)
  let newData = [];
  groupedWedgeData.map((groupedData) => {
    let filteredData = groupedData.filter((data) => data.plan_wedge_opt_id);
    if (filteredData?.length) {
      newData.push(filteredData);
    }
  });
  groupedWedgeData = newData;
  //
  groupedWedgeData &&
    groupedWedgeData.map((item, j) => {
      let tempWedgeData = [],
        allSubRowOfRow = [];
      //sort the grouped rows so that cluster data rendering is in order.
      item.sort((a, b) => a.cluster_code.localeCompare(b.cluster_code));
      let totalQuantity = 0;
      let channelQuantity = {};
      let totalStoreCount = 0;
      let channelStoreCount = 0;
      let totalST = 0;
      let clusterCount = 0;
      for (let i = 0; i < item.length; i++) {
        let newObj = {};
        let clusterCode = item[i].cluster_display_name || item[i].cluster_code;
        newObj["channel" + (i + 1)] = item[i].channel;
        newObj["cluster_code" + (i + 1)] = item[i].cluster_code;
        newObj["cluster_display_name" + (i + 1)] = item[i].cluster_display_name;
        newObj["l0_name"] = item[i].l0_name;
        newObj["l1_name"] = item[i].l1_name;
        newObj["l2_name"] = item[i].l2_name;
        newObj["l3_name"] = item[i].l3_name;
        newObj["choice_name"] = item[i].attribute_value.choice_name;
        newObj["hero_status"] = item[i].attribute_value.hero_status;
        newObj["program"] = item[i].attribute_value.program;
        newObj["subbrand"] = item[i].attribute_value.sub_brand;
        newObj[item[i].channel + "_is_style_color_valid"] =
          item[i].attribute_value.is_style_color_valid;
        newObj["is_style_name_change"] =
          item[i].attribute_value.is_style_name_change;
        newObj[item[i].channel + "_is_price_change"] =
          item[i].attribute_value.is_price_change;
        newObj[item[i].channel + "_is_cost_change"] =
          item[i].attribute_value.is_cost_change;
        newObj["is_color_name_change"] =
          item[i].attribute_value.is_color_name_change;
        newObj["is_hero_status_change"] =
          item[i].attribute_value.is_hero_status_change;
        newObj["is_program_change"] = item[i].attribute_value.is_program_change;
        newObj["is_subbrand_change"] =
          item[i].attribute_value.is_subbrand_change;
        newObj["plan_code"] = item[i].plan_code;
        newObj["plan_wedge_opt_id" + (i + 1)] = item[i].plan_wedge_opt_id;
        clusterCount = i + 1;
        newObj["parent_wedge_id"] = item[i].parent_wedge_id;
        newObj["total_store_count"] =
          totalStoreCount + (item[i].attribute_value.cluster_store_count || 0);
        newObj[[item[i].channel + "_store_count"]] =
          channelStoreCount +
          (item[i].attribute_value.cluster_store_count || 0);
        newObj[
          `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
        ] =
          item[i][
            `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
          ];
        newObj[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
        ] =
          item[i][
            `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
          ];
        newObj["image_url"] = item[i]?.image_name_url?.image_url;
        newObj["updated_at" + (i + 1)] = item[i]?.attribute_value?.updated_at;
        newObj["channels"] = item[i].channel;
        newObj["total_door_count"] = item[i]?.attribute_value.total_door_count;
        newObj["wedge_level"] = item[i].wedge_level;
        newObj[
          `${
            props.screenConfiguration?.common?.flow_key || "flow"
          }_cluster_perc_clusters_` + item[i].cluster_display_name
        ] =
          item[i].attribute_value[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_cluster_perc`
          ];
        newObj[item[i].channel + "_units"] =
          item[i]?.attribute_value?.channel_qty;
        newObj[item[i].channel + "_previous_units"] =
          item[i]?.attribute_value?.channel_qty;
        newObj[item[i].channel + "_forecasted_qty"] =
          item[i]?.attribute_value?.channel_forecasted_units;
        newObj[item[i].channel + "_door_count"] =
          item[i]?.attribute_value.channel_door_count;
        newObj[item[i].channel + "_door_group"] =
          item[i]?.attribute_value.doors;
        newObj[item[i].channel + "_reg_weeks"] =
          item[i]?.attribute_value.avg_wk_cnt_ty;
        newObj[item[i].channel + "_inventory"] =
          item[i]?.attribute_value.channel_inv_qty;
        newObj[item[i].channel + "_drop_flow_perc"] =
          item[i]?.attribute_value.drop_flow_perc;
        newObj["door_group"] = item[i]?.attribute_value.doors;
        newObj["reg_weeks"] = item[i]?.attribute_value.avg_wk_cnt_ty;
        newObj["bop_unit"] = item[i]?.attribute_value.bop_qty;
        newObj["total_qty"] = item[i].attribute_value.total_qty;
        newObj["total_inventory"] = item[i].attribute_value.inv_qty;
        newObj[item[i].channel + "_total_qty"] =
          item[i].attribute_value.total_qty;
        newObj["forecasted_qty"] =
          item[i]?.attribute_value?.total_qty * item[i]?.attribute_value.st;
        newObj[item[i].channel + "_sales_ty"] =
          item[i]?.attribute_value?.sales_ty;
        newObj[item[i].channel + "_st"] = item[i]?.attribute_value?.st * 100;
        newObj[item[i].channel + "_aps"] = item[i]?.attribute_value?.aps;
        newObj[item[i].channel + "_bop_unit"] =
          item[i]?.attribute_value?.bop_qty;
        newObj[item[i].channel + "_avg_wk_cnt_ty"] =
          item[i]?.attribute_value?.avg_wk_cnt_ty;
        newObj[item[i].channel + "_moq"] = item[i]?.attribute_value?.moq;
        newObj[item[i].channel + "_actual_msrp"] =
          item[i]?.attribute_value?.price;
        newObj[item[i].channel + "_cost"] = item[i]?.attribute_value?.cost;
        newObj[item[i].channel + "_aur"] = item[i]?.attribute_value?.aur;
        newObj["image_name_url"] = item[i].image_name_url || DEFAULT_IMAGE_LINK;
        newObj["commercial_style_" + item[i].channel + "_style_no"] =
          item[i]?.attribute_value?.style_no_commercial;
        newObj["commercial_style_" + item[i].channel + "_color_code"] =
          item[i]?.attribute_value?.color_code_commercial;
        newObj["article_number"] =
          item[i]?.attribute_value?.style_no &&
          item[i]?.attribute_value?.color_code
            ? `${item[i]?.attribute_value?.style_no}-${item[i]?.attribute_value?.color_code}`
            : item[i]?.attribute_value?.article_number;
        attribute_list?.forEach((k) => {
          if (
            !k.includes("_forecasted_qty") &&
            !k.includes("_units") &&
            k !== "total_qty" &&
            !k.includes("_door_count") &&
            !k.includes("_aps") &&
            !k.includes("article_number")
          ) {
            newObj[k] =
              k === "style_id"
                ? replaceSpecialCharacter(item[i].attribute_value[k])
                : item[i].attribute_value[k];
          }
        });
        newObj.aic = item[i].attribute_value?.aur;
        let attributeCombo = ""; //Will store concatenated attribute value here
        Object.keys(item[i].attribute_value).forEach((index) => {
          if (
            !index.includes("_forecasted_qty") &&
            !index.includes("_units") &&
            index !== "total_qty" &&
            !index.includes("_door_count") &&
            index !== "style_id" &&
            !index.includes("_aps") &&
            !index.includes("article_number") &&
            index !== "market_style_changed_count"
          ) {
            if (attributeKey.indexOf(index) !== -1) {
              newObj[`attributes_${index}`] = item[i].attribute_value[
                index
              ]?.toString();
              //conatinating attributes
              attributeCombo = attributeCombo + item[i].attribute_value[index];
              // attributeFormatter(
              //   item[i].attribute_value[index],
              //   false
              // );
            } else {
              newObj[index] = item[i].attribute_value[index];
            }
          }
          return null;
        });
        // if that style is not present then inserting
        if (!attributeForStyle[item[i].attribute_value?.style_id]) {
          attributeForStyle[item[i].attribute_value?.style_id] = attributeCombo;
        }
        // if that attr key is not present then inserting
        if (!stylesForAttribute[attributeCombo]) {
          stylesForAttribute[attributeCombo] = [
            item[i].attribute_value?.style_id,
          ];
          //if attr key is present then checking whether this style id is not persent in that array then inserting
        } else if (
          !stylesForAttribute[attributeCombo].includes(
            item[i].attribute_value?.style_id
          )
        ) {
          stylesForAttribute[attributeCombo].push(
            item[i].attribute_value?.style_id
          );
        }
        newObj["clusters_" + clusterCode] =
          item[i].attribute_value.cluster_qty || 0;
        newObj["cluster_qty" + (i + 1)] =
          item[i].attribute_value.cluster_qty || 0;
        newObj["store_count" + (i + 1)] =
          item[i].attribute_value.cluster_store_count;
        totalQuantity =
          totalQuantity +
          (item[i].attribute_value.cluster_qty || 0) *
            (item[i].attribute_value.cluster_store_count || 1);
        let channelKey = item[i].channel;
        // if (channelQuantity[channelKey]) {
        //   channelQuantity[channelKey] +=
        //     (item[i].attribute_value.cluster_qty || 0) *
        //     (item[i].attribute_value.cluster_store_count || 1);
        // } else {
        //   channelQuantity[channelKey] =
        //     (item[i].attribute_value.cluster_qty || 0) *
        //     (item[i].attribute_value.cluster_store_count || 1);
        // }
        totalST += item[i].attribute_value.st;
        newObj["market_style_changed_count"] =
          item[i].attribute_value.style_no &&
          item[i]?.attribute_value?.color_code
            ? item[i].attribute_value.market_style_changed_count + 1
            : item[i].attribute_value.market_style_changed_count;
        newObj["is_changed"] =
          item[i].attribute_value.style_no &&
          item[i]?.attribute_value?.color_code
            ? true
            : false;
        newObj["uniqueID"] = item[i].plan_wedge_opt_id;
        if (item[i]["subRows"]) {
          Object.keys(item[i]["subRows"]).forEach((index) => {
            let temp = item[i]["subRows"][index];
            let tempSubRow = {};
            let subClusterCode = temp.cluster_display_name;
            tempSubRow["channel" + (i + 1)] = temp.channel;
            tempSubRow["cluster_code" + (i + 1)] = temp.cluster_code;
            tempSubRow["cluster_display_name" + (i + 1)] =
              temp.cluster_display_name;
            tempSubRow["choice_name"] = temp.attribute_value["choice_name"];
            tempSubRow["hero_status"] = temp.attribute_value.hero_status;
            tempSubRow["program"] = temp.attribute_value.program;
            tempSubRow["subbrand"] = temp.attribute_value.sub_brand;
            tempSubRow[temp.channel + "_is_style_color_valid"] =
              temp.attribute_value.is_style_color_valid;
            tempSubRow["is_style_name_change"] =
              temp.attribute_value.is_style_name_change;
            tempSubRow[temp.channel + "_is_price_change"] =
              temp.attribute_value.is_price_change;
            tempSubRow[temp.channel + "_is_cost_change"] =
              temp.attribute_value.is_cost_change;
            tempSubRow["is_color_name_change"] =
              temp.attribute_value.is_color_name_change;
            tempSubRow["is_hero_status_change"] =
              temp.attribute_value.is_hero_status_change;
            tempSubRow["is_program_change"] =
              temp.attribute_value.is_program_change;
            tempSubRow["is_subbrand_change"] =
              temp.attribute_value.is_subbrand_change;
            tempSubRow[
              `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
            ] =
              temp[
                `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
              ];
            tempSubRow[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
            ] =
              temp[
                `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
              ];
            tempSubRow["l0_name"] = temp.l0_name;
            tempSubRow["l1_name"] = temp.l1_name;
            tempSubRow["l2_name"] = temp.l2_name;
            tempSubRow["l3_name"] = temp.l3_name;
            tempSubRow["plan_code"] = temp.plan_code;
            tempSubRow["total_door_count"] =
              temp.attribute_value?.total_door_count;
            tempSubRow["plan_wedge_opt_id" + (i + 1)] = temp.plan_wedge_opt_id;
            tempSubRow["parent_wedge_id"] = temp.parent_wedge_id;
            tempSubRow["image_url"] = temp?.image_name_url?.image_url;
            tempSubRow[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_cluster_perc_clusters_` + temp.cluster_display_name
            ] =
              temp.attribute_value[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_cluster_perc`
              ];
            tempSubRow["updated_at" + (i + 1)] =
              temp?.attribute_value?.updated_at;
            tempSubRow["channels"] = temp.channel;
            attribute_list?.forEach((k) => {
              if (
                !k.includes("_forecasted_qty") &&
                !k.includes("_units") &&
                k !== "total_qty" &&
                !k.includes("_door_count") &&
                !k.includes("_aps") &&
                !k.includes("article_number")
              ) {
                tempSubRow[k] =
                  k === "style_id"
                    ? replaceSpecialCharacter(temp.attribute_value[k])
                    : temp.attribute_value[k];
              }
            });
            tempSubRow.aic = temp.attribute_value?.aur;
            Object.keys(temp.attribute_value).forEach((itr) => {
              if (
                !itr.includes("_forecasted_qty") &&
                !itr.includes("_units") &&
                itr !== "total_qty" &&
                !itr.includes("_door_count") &&
                itr !== "style_id" &&
                !itr.includes("_aps") &&
                !itr.includes("article_number")
              ) {
                if (attributeKey.indexOf(itr) !== -1) {
                  tempSubRow[`attributes_${itr}`] = replaceSpecialCharacter(
                    temp.attribute_value[itr]
                  );
                } else {
                  tempSubRow[itr] = temp.attribute_value[itr];
                }
              }
              return null;
            });
            tempSubRow["clusters_" + subClusterCode] =
              temp.attribute_value.cluster_qty || 0;
            tempSubRow["cluster_qty" + (i + 1)] =
              temp.attribute_value.cluster_qty || 0;
            tempSubRow["store_count" + (i + 1)] =
              temp.attribute_value.cluster_store_count;
            tempSubRow["uniqueID"] = temp.plan_wedge_opt_id;
            tempSubRow["total_st" + (i + 1)] = temp.attribute_value?.st;
            tempSubRow["wedge_level"] = temp.wedge_level;
            tempSubRow[temp.channel + "_units"] =
              temp?.attribute_value?.channel_qty;
            tempSubRow[temp.channel + "_previous_units"] =
              temp?.attribute_value?.channel_qty;
            tempSubRow[temp.channel + "_forecasted_qty"] =
              temp?.attribute_value?.channel_forecasted_units;
            tempSubRow[temp.channel + "_door_count"] =
              temp?.attribute_value.channel_door_count;
            tempSubRow[temp.channel + "_door_group"] =
              temp?.attribute_value.doors;
            tempSubRow[temp.channel + "_reg_weeks"] = temp?.reg_weeks;
            tempSubRow[temp.channel + "_inventory"] =
              temp?.attribute_value?.channel_inv_qty;
            tempSubRow["door_group"] = temp?.attribute_value.doors;
            tempSubRow["reg_weeks"] = temp?.attribute_value.avg_wk_cnt_ty;
            tempSubRow["bop_unit"] = temp?.attribute_value.bop_qty;
            tempSubRow["total_qty"] = temp.attribute_value.total_qty;
            tempSubRow["total_inventory"] = temp.attribute_value.inv_qty;
            tempSubRow[temp.channel + "_total_qty"] =
              temp.attribute_value.total_qty;
            tempSubRow["forecasted_qty"] =
              temp?.attribute_value?.total_qty * temp?.attribute_value.st;
            tempSubRow[temp.channel + "_sales_ty"] =
              temp?.attribute_value?.sales_ty;
            tempSubRow[temp.channel + "_st"] = temp.attribute_value?.st * 100;
            tempSubRow[temp.channel + "_aps"] = temp.attribute_value?.aps;
            tempSubRow[temp.channel + "_bop_unit"] =
              temp.attribute_value?.bop_qty;
            tempSubRow[temp.channel + "_avg_wk_cnt_ty"] =
              temp.attribute_value?.avg_wk_cnt_ty;
            tempSubRow[temp.channel + "_moq"] = temp?.attribute_value?.moq;
            tempSubRow[temp.channel + "_drop_flow_perc"] =
              temp?.attribute_value.drop_flow_perc;
            tempSubRow[temp.channel + "_actual_msrp"] =
              temp?.attribute_value?.price;
            tempSubRow[temp.channel + "_cost"] = temp?.attribute_value?.cost;
            tempSubRow[temp.channel + "_aur"] = temp?.attribute_value?.aur;
            tempSubRow["commercial_style_" + temp.channel + "_style_no"] =
              temp.attribute_value?.style_no_commercial;
            tempSubRow["commercial_style_" + temp.channel + "_color_code"] =
              temp.attribute_value?.color_code_commercial;
            tempSubRow["article_number"] =
              temp?.attribute_value?.style_no &&
              temp?.attribute_value?.color_code
                ? `${temp?.attribute_value?.style_no}-${temp?.attribute_value?.color_code}`
                : temp?.attribute_value?.article_number;
            tempSubRow["image_name_url"] =
              temp.image_name_url || DEFAULT_IMAGE_LINK;
            tempSubRow["market_style_changed_count"] =
              newObj["market_style_changed_count"];
            // delete tempSubRow.total_qty;
            if (type === "style_level") {
              if (
                allSubRowOfRow[temp?.attribute_value?.choice_carryover_flag] ===
                undefined
              )
                allSubRowOfRow[
                  temp?.attribute_value?.choice_carryover_flag
                ] = [];
              allSubRowOfRow[temp?.attribute_value?.choice_carryover_flag].push(
                tempSubRow
              );
              return null;
            } else {
              if (
                allSubRowOfRow[
                  temp[
                    `${
                      props.screenConfiguration?.common?.flow_key || "flow"
                    }_name`
                  ]
                ] === undefined
              )
                allSubRowOfRow[
                  temp[
                    `${
                      props.screenConfiguration?.common?.flow_key || "flow"
                    }_name`
                  ]
                ] = [];
              allSubRowOfRow[
                temp[
                  `${
                    props.screenConfiguration?.common?.flow_key || "flow"
                  }_name`
                ]
              ].push(tempSubRow);
              return null;
            }
          });
        }
        // merge all the subrows of all the cluster as single row.
        Object.keys(allSubRowOfRow).forEach((subRowData) => {
          if (newObj["subRows"] === undefined) newObj["subRows"] = [];
          newObj["subRows"].push(
            allSubRowOfRow[subRowData].reduce(function (result, current) {
              return Object.assign(result, current);
            }, {})
          );
          return null;
        });
        newObj["totalClusters"] = i + 1;
        newObj["expandableCols"] = newObj["subRows"]?.length
          ? `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
          : "";
        // delete newObj.total_qty;
        tempWedgeData.push(Object.assign(newObj));
      }
      tableData.push(
        tempWedgeData.reduce(function (result, current) {
          return Object.assign(result, current);
        }, {})
      );
      // tableData[j].total_qty = totalQuantity;
      // if (planDetails?.channel?.length > 1 || type === "style_level") {
      //   planDetails.channel.forEach((chn) => {
      //     let chnKey = chn;
      //     tableData[j][`${chnKey}_units`] = channelQuantity[chnKey] || 0;
      //     tableData[j][`${chnKey}_total_qty`] = channelQuantity[chnKey] || 0;
      //   });
      // }
      tableData[j].total_st = totalST;
      tableData[j].cluster_count = clusterCount;
      if (tableData[j]?.subRows?.length && type === "style_level") {
        tableData[j].subRows.forEach((row) => {
          let subRowTotalUnits = 0;
          let subRowChannelUnits = {};
          let subRowTotalST = 0;
          for (let cluInx = 0; cluInx < clusterCount; cluInx++) {
            let chanKey = row[`channel${cluInx + 1}`];
            if (subRowChannelUnits[chanKey]) {
              subRowChannelUnits[chanKey] +=
                (row["cluster_qty" + (cluInx + 1)] || 0) *
                (row["store_count" + (cluInx + 1)] || 0);
            } else {
              subRowChannelUnits[chanKey] =
                (row["cluster_qty" + (cluInx + 1)] || 0) *
                (row["store_count" + (cluInx + 1)] || 0);
            }
            subRowTotalUnits +=
              (row["cluster_qty" + (cluInx + 1)] || 0) *
              (row["store_count" + (cluInx + 1)] || 0);
            subRowTotalST += row["total_st" + (cluInx + 1)] || 0;
          }
          row.total_st = subRowTotalST;
          row["totalClusters"] = tableData[j]["totalClusters"];
          row.total_qty = subRowTotalUnits || 0;
          row.cluster_count = clusterCount;
          if (planDetails?.channel?.length > 1 || type === "style_level") {
            planDetails.channel.forEach((chn) => {
              let chnKey = chn;
              row[`${chnKey}_units`] = subRowChannelUnits[chnKey] || 0;
              row[`${chnKey}_total_qty`] = subRowChannelUnits[chnKey] || 0;
            });
          }
        });
      }
      return null;
    });
  if (type !== "style_level") {
    //setting the generated values in the parent component
    setAttributesForStylesJson(attributeForStyle);
    setStylesForattributesJson(stylesForAttribute);
  }
  return tableData;
};

export const generateDropDownOptions = (dropDownValues) => {
  return (
    dropDownValues?.length &&
    dropDownValues.map((obj) => {
      return {
        value: obj,
        label: obj === "-" ? "ALL" : attributeFormatter(obj),
        id: obj,
      };
    })
  );
};

export const setOptionsForAttribute = (colArray, attributeList, props) => {
  colArray.forEach((col) => {
    if (attributeList.includes(col.column_name)) {
      let col_key = col.column_name.split("attributes_");
      let attributeOptions =
        find(props.wedgeAttributeData || [], {
          attribute_name: col_key[1],
        }) || [];
      col.options = props.generateOptions(attributeOptions?.attribute_value);
    }
    if (col.sub_headers?.length) {
      setOptionsForAttribute(col.sub_headers, attributeList, props);
    }
  });
  return colArray;
};
export const displaySnackMessage = (msg, type = "error", addSnack) => {
  addSnack({
    message: msg,
    options: {
      variant: type,
    },
  });
};
export const getAddChoicePayload = (
  planDetails,
  AddChoiceInstance,
  finalLevelKey,
  props
) => {
  let payload = [];
  AddChoiceInstance.current.api.forEachNode((data) => {
    data = data.data;
    let addChoiceObj = {};
    let attributeObj = {};
    Object.keys(data).forEach((key) => {
      if (key.includes("selected_attributes_")) {
        let attrKey = key.split("selected_attributes_");
        attributeObj[attrKey[1]] = data[`${key}`];
      }
    });
    addChoiceObj.l0_name = planDetails?.l0_name[0];
    addChoiceObj.l1_name = planDetails?.l1_name[0];
    addChoiceObj.l2_name =
      props.selectedL2FilterValue?.value || planDetails?.l2_name[0];
    if (finalLevelKey === "l2_name") {
      addChoiceObj.l2_name = data.l2_name;
    } else {
      addChoiceObj.l3_name = data.l3_name;
    }
    addChoiceObj.choice_name = data?.original_choice_name || data.choice_name;
    addChoiceObj["is_style_color_valid"] = data.is_style_color_valid;
    addChoiceObj[props.screenConfiguration?.common?.drop_key || "drop"] = data[
      `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
    ]
      ? data[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`]
      : "-";
    addChoiceObj.attributes = attributeObj;
    if (!props.screenConfiguration?.common?.show_style_level) {
      addChoiceObj["forecasted_qty"] = data.forecasted_qty;
    }
    if (isChannelMultiple(planDetails)) {
      const channels = planDetails?.channel;
      channels.forEach((channel) => {
        if (
          props.planMetricsData?.length &&
          props.planMetricsData?.[0]?.channel?.[data[finalLevelKey]]
        ) {
          if (
            props.planMetricsData?.[0]?.channel[data[finalLevelKey]].includes(
              channel
            )
          ) {
            let addChoicePayloadObj = cloneDeep(addChoiceObj);
            addChoicePayloadObj["channel"] = channel;
            addChoicePayloadObj["sub_channel"] = channel;
            addChoicePayloadObj["new_qty"] =
              parseInt(data[channel + "_units"]) || 0;
            if (!props.screenConfiguration?.common?.show_style_level) {
              addChoicePayloadObj["forecasted_qty"] =
                parseInt(data[channel + "_forecasted_qty"]) || 0;
            }
            payload.push(addChoicePayloadObj);
          }
        }
      });
    } else {
      addChoiceObj.channel = planDetails?.channel?.[0];
      addChoiceObj.sub_channel =
        planDetails?.sub_channel?.[0] || planDetails?.channel?.[0];
      addChoiceObj.new_qty = parseInt(data.total_qty);
      payload.push(addChoiceObj);
    }
  });
  return payload;
};
export const getAddStylePayload = (planDetails, AddStyleInstance, props) => {
  let payload = [];
  AddStyleInstance.current.api.forEachNode((data) => {
    data = data.data;
    let addStyleObj = {};
    let attributeObj = {};
    Object.keys(data).forEach((key) => {
      if (key.includes("attributes_")) {
        let attrKey = key.split("attributes_");
        attributeObj[attrKey[1]] = data[`${key}`];
      }
    });
    addStyleObj.l0_name = planDetails?.l0_name[0];
    addStyleObj.l1_name = planDetails?.l1_name[0];
    addStyleObj.l2_name =
      props.selectedL2FilterValue?.value || planDetails?.l2_name[0];
    addStyleObj.l3_name = data.l3_name;
    addStyleObj.style_id = data.style_id;
    addStyleObj[
      `${props.screenConfiguration?.common?.drop_key || "drop"}`
    ] = data[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`]
      ? data[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`]
      : "-";
    addStyleObj.color_count = data.color_count_ty;
    addStyleObj.attributes = attributeObj;
    if (isChannelMultiple(planDetails)) {
      const channels = planDetails?.channel;
      channels.forEach((channel) => {
        let addStylePayloadObj = cloneDeep(addStyleObj);
        addStylePayloadObj.channel = channel;
        addStylePayloadObj["sub_channel"] = channel;
        addStylePayloadObj.new_qty = parseInt(data[`${channel}_total_qty`]);
        addStylePayloadObj.forecast_units = parseInt(
          data[`${channel}_forecasted_qty`]
        );
        payload.push(addStylePayloadObj);
      });
    } else {
      addStyleObj.channel = planDetails?.channel[0];
      addStyleObj.sub_channel =
        planDetails?.sub_channel?.[0] || planDetails?.channel?.[0];
      addStyleObj.new_qty = parseInt(
        data[`${planDetails?.channel?.[0]}_total_qty`]
      );
      addStyleObj.forecast_units = parseInt(
        data[`${planDetails?.channel?.[0]}_forecasted_qty`]
      );
      payload.push(addStyleObj);
    }
  });
  return payload;
};
export const editChoiceLevelTotalUnits = (
  selectedRow,
  rowData,
  oldValue,
  newValue,
  parentTotalQty,
  columnId,
  channelColumnId,
  props,
  displaySnackMessage,
  isSingleChannel
) => {
  newValue = newValue || 0;
  oldValue = oldValue || 0;
  let totalQty = columnId.includes("_units")
    ? rowData[columnId]
    : columnId.includes("_forecasted_qty")
    ? rowData[columnId] / (rowData[`${channelColumnId}_st`] / 100)
    : columnId.includes("_aps") || columnId.includes("_reg_weeks")
    ? rowData[`${channelColumnId}_forecasted_qty`] /
      (rowData[`${channelColumnId}_st`] / 100)
    : rowData.total_qty;
  let clusterObject = {};
  let clusterDoorGroup = "";
  let clusterStoreCountObject = {};
  let indexContainsChannel = [];
  if (selectedRow?.subRows && rowData?.hierarchy.length > 1) {
    totalQty = rowData[`${channelColumnId}_drop_flow_perc`] * parentTotalQty;
  }
  if (selectedRow.uniqueID !== rowData.uniqueID) {
    oldValue = rowData[`${channelColumnId}_units`];
  }
  if (columnId.includes("_aps") || columnId.includes("reg_weeks")) {
    oldValue = cloneDeep(selectedRow[`${channelColumnId}_previous_units`]);
  }
  Object.keys(rowData).map((key) => {
    let channelSplit = columnId.includes("_units")
      ? columnId.split("_units")?.[0]
      : columnId.includes("_forecasted_qty")
      ? columnId.split("_forecasted_qty")?.[0]
      : columnId.includes("_aps")
      ? columnId.split("_aps")?.[0]
      : "";
    if (key.includes("cluster_code")) {
      // Get store count for particular clusters
      let split = key.split("cluster_code");
      clusterStoreCountObject[
        `store_count_${rowData[`cluster_display_name${[split?.[1]]}`]}`
      ] = rowData[`store_count${split?.[1]}`];
      // Check if the cluster code and display name are different
      if (
        rowData[`cluster_code${split?.[1]}`].includes(channelSplit) &&
        !indexContainsChannel.includes(split?.[1])
      ) {
        if (
          rowData[`cluster_code${split?.[1]}`] !==
          rowData[`cluster_display_name${[split?.[1]]}`]
        )
          indexContainsChannel.push(
            `clusters_${rowData[`cluster_display_name${[split?.[1]]}`]}`
          );
      }
    }
    if (
      key.includes("clusters_") &&
      !key.includes(
        `${
          props.screenConfiguration?.common?.flow_key || "flow"
        } _cluster_perc_clusters_`
      )
    ) {
      if (props?.planMetricsData?.[0]?.channel?.[rowData.l3_name]?.length > 1) {
        if (key.includes(channelSplit) || indexContainsChannel.includes(key)) {
          clusterObject[key] = rowData[key];
        }
      } else {
        clusterObject[key] = rowData[key];
      }
    }
    return key;
  });
  let msgFlag = true;
  Object.keys(clusterObject).map((key) => {
    let split = key.split("clusters_");
    let lastElement = split.slice(-1);
    // Get percentage of particular clusters distrubted based on original total unit
    let pen =
      totalQty && oldValue
        ? (clusterStoreCountObject[`store_count_${lastElement}`] *
            clusterObject[key]) /
          oldValue
        : rowData[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_cluster_perc_${key}`
          ] || 0;
    // Distribute the new total unit based on cluster percentage
    let clusterValue =
      (pen * totalQty) / clusterStoreCountObject[`store_count_${lastElement}`];
    clusterObject[key] = clusterValue || 0;
    if (clusterValue && !key.includes("flow_")) {
      let clusterName = key.split("clusters_")?.[1];
      clusterDoorGroup =
        clusterDoorGroup !== ""
          ? clusterDoorGroup + "," + clusterName
          : clusterName;
    }
    clusterObject["subRows"] = rowData.subRows;
    clusterObject[
      `${props.screenConfiguration?.common?.flow_key || "flow"}_cluster_perc_` +
        key
    ] = pen;
    // Show warning msg if cluster value is less than the min value constraint
    if (
      props.l3MinQtyJson[selectedRow?.l3_name] > Math.round(clusterValue) &&
      Math.round(rowData[key]) !== 0 &&
      msgFlag &&
      !key.includes("flow_cluster_perc") &&
      rowData?.[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
      ] === "-"
    ) {
      msgFlag = false;
      displaySnackMessage(
        "Depth is going below min depth for updated choice",
        "warning",
        props.addSnack
      );
    }
    return key;
  });
  if (
    !columnId.includes("reg_weeks") ||
    selectedRow.flow_name === "-" ||
    rowData.uniqueID === selectedRow.uniqueID
  ) {
    clusterObject[`${channelColumnId}_units`] = totalQty || 0;
    clusterObject[`${channelColumnId}_forecasted_qty`] =
      totalQty * (rowData[`${channelColumnId}_st`] / 100);
    clusterObject[`${channelColumnId}_inventory`] =
      totalQty + parseInt(rowData[`${channelColumnId}_bop_unit`] || 0);
    clusterObject[`${channelColumnId}_door_group`] = clusterDoorGroup;
    if (!columnId.includes("reg_weeks")) {
      clusterObject[`${channelColumnId}_aps`] =
        clusterObject[`${channelColumnId}_forecasted_qty`] /
        rowData[`${channelColumnId}_reg_weeks`] /
        rowData[`${channelColumnId}_door_count`];
    }

    if (isSingleChannel) {
      clusterObject["reg_weeks"] =
        clusterObject[`${channelColumnId}_forecasted_qty`] /
        rowData["aps"] /
        rowData["total_door_count"];
    } else {
      clusterObject[`${channelColumnId}_reg_weeks`] =
        clusterObject[`${channelColumnId}_forecasted_qty`] /
        (!columnId.includes("reg_weeks")
          ? clusterObject[`${channelColumnId}_aps`]
          : rowData[`${channelColumnId}_aps`]) /
        rowData[`${channelColumnId}_door_count`];
    }
  }
  return clusterObject;
};

export const recalculateChoiceLevelTotalQty = (
  row,
  columnId,
  oldValue,
  setShowDeleteConfirmDialog,
  props
) => {
  let totalQty = 0,
    totalForecasetedQty = 0,
    totalInv = 0,
    isDeleteChoice = false;
  props.planMetricsData?.[0]?.channel?.[
    row[props.screenConfiguration?.common?.final_level || "l3_name"]
  ]?.forEach((chanKey) => {
    totalQty = totalQty + row[`${chanKey}_units`];
    totalInv = totalInv + parseInt(row[`${chanKey}_inventory`] || 0);
    totalForecasetedQty =
      totalForecasetedQty + row[`${chanKey}_forecasted_qty`];
  });
  // if(row.flow_name === "-"){
  if (
    !totalQty &&
    row?.dropship_choice === "No" &&
    setShowDeleteConfirmDialog &&
    row.flow_name === "-"
  ) {
    isDeleteChoice = true;
    row[columnId] = oldValue;
    row["delete_choice"] = "Yes";
    setShowDeleteConfirmDialog(true);
  } else {
    row["total_qty"] = totalQty || 0;
    row["forecasted_qty"] = totalForecasetedQty || 0;
    row["total_inventory"] = totalInv || 0;
  }
  // }
  return { row, isDeleteChoice };
};

export const recalculateChoiceClusterTotalQty = (
  eachRow,
  columnId,
  oldValue,
  setShowDeleteConfirmDialog,
  props
) => {
  let rowTotalQuantity = 0;
  let rowChannelUnits = {};
  for (let i = 0; i < eachRow.totalClusters; i++) {
    let chanKey = eachRow[`channel${i + 1}`];
    if (rowChannelUnits[chanKey]) {
      rowChannelUnits[chanKey] +=
        (eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] ||
          0) * (eachRow["store_count" + (i + 1)] || 0);
    } else {
      rowChannelUnits[chanKey] =
        (eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] ||
          0) * (eachRow["store_count" + (i + 1)] || 0);
    }
    rowTotalQuantity =
      rowTotalQuantity +
      (eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] || 0) *
        (eachRow["store_count" + (i + 1)] || 0);
  }
  if (props.planMetricsData?.[0]?.channel?.[eachRow.l3_name]?.length > 1) {
    Object.keys(rowChannelUnits).map((key) => {
      eachRow[`${key}_units`] = rowChannelUnits[key];
      eachRow[`${key}_forecasted_qty`] = eachRow.st * rowChannelUnits[key];
      return eachRow;
    });
  }
  if (!rowTotalQuantity && eachRow?.dropship_choice === "No") {
    eachRow[columnId] = oldValue;
    eachRow["delete_choice"] = "Yes";
    setShowDeleteConfirmDialog(true);
  } else {
    eachRow.total_qty = rowTotalQuantity;
    eachRow.forecasted_qty = eachRow.st * rowTotalQuantity;
    //eachRow.total_inventory = rowTotalQuantity + eachRow.bop_unit
  }
  return eachRow;
};

export const formatChoiceTableDataGrouping = (
  props,
  budgetData,
  selectedDropData
) => {
  let rowData = [];
  let selectedDrop = selectedDropData
    ? selectedDropData
    : Object.keys(
        groupBy(
          budgetData,
          `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
        )
      )[0];
  budgetData.forEach((data) => {
    if (
      data[`${props.screenConfiguration?.common?.drop_key || "drop"}_name`] ===
      selectedDrop
    ) {
      data?.subRows?.length > 0 &&
        data?.subRows.forEach((subRow) => {
          subRow.hierarchy = [
            data.choice_name,
            subRow[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
            ],
          ];
        });
      let flatRows = {
        ...data,
        hierarchy: [data.choice_name],
      };
      rowData.push(flatRows);
    }
  });
  return rowData;
};
export const recalculateTotalQty = (
  eachRow,
  oldValue,
  columnId,
  setShowDeleteConfirmDialog,
  props
) => {
  let initialTotalQty = cloneDeep(eachRow.total_qty);
  let totalQuantity = 0;
  let channelQuantity = {};
  for (let i = 0; i < eachRow.totalClusters; i++) {
    // calculating total quanity channel wise
    let chanKey = eachRow[`channel` + (i + 1)];
    if (channelQuantity[chanKey]) {
      //if already total quanity for that channel is present adding up with the exsisting
      channelQuantity[chanKey] +=
        eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] *
        eachRow["store_count" + (i + 1)];
    } else {
      //else assigning the channel with the qauntity
      channelQuantity[chanKey] =
        eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] *
        eachRow["store_count" + (i + 1)];
    }
    totalQuantity =
      totalQuantity +
      eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] *
        eachRow["store_count" + (i + 1)];
  }
  if (!totalQuantity && eachRow?.dropship_choice === "No") {
    eachRow[columnId] = oldValue;
    eachRow["delete_choice"] = "Yes";
    setShowDeleteConfirmDialog(true);
  } else {
    eachRow.total_qty = totalQuantity;
    eachRow.forecasted_qty = eachRow.st * totalQuantity;
    //eachRow.total_inventory = totalQuantity + eachRow.bop_unit
  }
  if (props.planDetails?.data?.channel?.length > 1) {
    //if a plan has multiple channel
    props.planDetails?.data?.channel.forEach((chn) => {
      let chnKey = chn;
      //assigning channel wise total quantity to each row
      eachRow[`${chnKey}_units`] = channelQuantity[chnKey] || 0;
    });
  }
  Object.keys(eachRow).map((key) => {
    if (key.includes("cluster_code")) {
      let index = key.split("cluster_code")?.[1];
      eachRow[
        `${
          props.screenConfiguration?.common?.flow_key || "flow"
        }_cluster_perc_clusters_${eachRow[`cluster_display_name${index}`]}`
      ] =
        (eachRow[`clusters_${eachRow[`cluster_display_name${index}`]}`] *
          eachRow[`store_count${index}`]) /
        eachRow.total_qty;
    }
    return key;
  });
  if (initialTotalQty !== eachRow.total_qty) {
    props.setIsScaleUpDownDisabled(false);
  }
  return eachRow;
};
// Creating parent and subrows
export const formatStyleTableDataGrouping = (tableData) => {
  let rowData = [];
  tableData.forEach((data) => {
    // Parent hierarchy
    let flatRows = {
      ...data,
      hierarchy: [data.unique_id],
    };
    rowData.push(flatRows);
  });
  return rowData;
};
export const editStyleLevelTotalUnits = (
  props,
  rowData,
  oldValue,
  channelColumnId
) => {
  let clusterObject = {};
  let clusterStoreCountObject = {};
  let totalQuantity = 0;
  // Calculate totalQty based on cluster
  for (let i = 0; i < rowData.totalClusters; i++) {
    if (rowData["cluster_display_name" + (i + 1)].includes(channelColumnId)) {
      totalQuantity =
        totalQuantity +
        rowData[`clusters_${rowData["cluster_display_name" + (i + 1)]}`] *
          rowData["store_count" + (i + 1)];
    }
  }
  Object.keys(rowData).map((key) => {
    if (key.includes("cluster_code")) {
      // Get store count for particular clusters
      let split = key.split("cluster_code");
      clusterStoreCountObject[
        `store_count_${rowData[`cluster_display_name${[split?.[1]]}`]}`
      ] = rowData[`store_count${split?.[1]}`];
    }
    if (
      key.includes("clusters_") &&
      !key.includes(
        `${
          props.screenConfiguration?.common?.flow_key || "flow"
        }_cluster_perc_clusters_`
      )
    ) {
      clusterObject[key] = rowData[key];
    }
    return clusterObject;
  });
  Object.keys(clusterObject).map((key) => {
    if (key.includes(channelColumnId)) {
      let split = key.split("_");
      let lastElement = split.slice(-1);
      // Get percentage of particular clusters distrubted based on original total unit
      let pen =
        totalQuantity && oldValue
          ? (clusterStoreCountObject[`store_count_${lastElement}`] *
              clusterObject[key]) /
            oldValue
          : rowData[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_cluster_perc_${key}`
            ] || 0;
      // Distribute the new total unit based on cluster percentage
      let clusterValue =
        (pen * rowData[`${channelColumnId}_total_qty`]) /
        clusterStoreCountObject[`store_count_${lastElement}`];
      clusterObject[key] = clusterValue || 0;
      clusterObject["subRows"] = rowData.subRows;
    }
    return clusterObject;
  });
  return clusterObject;
};

// Add wedge sets functions

export const calculateRatio = (tempData, columnId, primaryRow, changedRow) => {
  let calculatedRatios = [];
  // gcd = greatest common divisor
  // To calculate ratio on change of total_qty, divide total_qty by gcd
  // To calculate total_qty on change of ratio, multiply ratio with gcd
  const gcd = calculateGCD(tempData);
  tempData.map((num) => {
    if (columnId === "total_qty" || columnId === "choice_name") {
      calculatedRatios.push({
        ...num,
        ratio: num.total_qty / gcd || 0,
      });
    } else if (columnId === "ratio") {
      if (changedRow.is_set_primary && !num.isDropPlan) {
        calculatedRatios.push({
          ...num,
          total_qty:
            (primaryRow?.total_qty * num?.ratio) / primaryRow?.ratio &&
            (primaryRow?.total_qty * num?.ratio) / primaryRow?.ratio !==
              Infinity
              ? (primaryRow?.total_qty * num?.ratio) / primaryRow?.ratio
              : 0,
          channel_qty:
            (primaryRow?.total_qty * num?.ratio) / primaryRow?.ratio &&
            (primaryRow?.total_qty * num?.ratio) / primaryRow?.ratio !==
              Infinity
              ? (primaryRow?.total_qty * num?.ratio) / primaryRow?.ratio
              : 0,
        });
      } else if (
        !changedRow.is_set_primary &&
        num.uniqueID === changedRow.uniqueID
      ) {
        calculatedRatios.push({
          ...num,
          total_qty:
            (primaryRow?.total_qty * changedRow?.ratio) / primaryRow?.ratio &&
            (primaryRow?.total_qty * changedRow?.ratio) / primaryRow?.ratio !==
              Infinity
              ? (primaryRow?.total_qty * changedRow?.ratio) / primaryRow?.ratio
              : 0,
          channel_qty:
            (primaryRow?.total_qty * changedRow?.ratio) / primaryRow?.ratio &&
            (primaryRow?.total_qty * changedRow?.ratio) / primaryRow?.ratio !==
              Infinity
              ? (primaryRow?.total_qty * changedRow?.ratio) / primaryRow?.ratio
              : 0,
        });
      } else {
        calculatedRatios.push(num);
      }
    } else {
      calculatedRatios.push(num);
    }
  });
  return calculatedRatios;
};

// Finding greatest common divisor
export const calculateGCD = (tempData) => {
  const findGCD = (a, b) => {
    if (b === 0) {
      return a;
    }
    return findGCD(b, a % b);
  };

  let gcd = Math.round(tempData?.[0]?.total_qty);
  for (let i = 1; i < tempData.length; i++) {
    gcd = findGCD(gcd, Math.round(tempData[i]?.total_qty));
  }
  return gcd;
};

//Find the duplicate data
export const hasDuplicate = (arrayObj, colName) => {
  var hash = Object.create(null);
  return arrayObj.some((arr) => {
    return arr[colName] && (hash[arr[colName]] || !(hash[arr[colName]] = true));
  });
};

export const addDefaultRowData = (index, set_name, props) => {
  let planData = cloneDeep(props.planDetails.data);
  return {
    choice_name: ``,
    total_qty: 0,
    channel_qty: 0,
    ratio: 0,
    uniqueID: `new_pack_${index}`,
    l0_name: planData.l0_name?.[0],
    l1_name: props.selectedL1FilterValue?.value || planData.l1_name?.[0],
    l2_name: props.selectedL2FilterValue?.value || planData.l2_name?.[0],
    l3_name: isArray(props.selectedL3FilterValue)
      ? props.selectedL3FilterValue?.[0]?.value
      : props.selectedL3FilterValue?.value,
    sub_channel: planData.sub_channel?.[0],
    channel: planData.channel?.[0],
    [props.screenConfiguration?.common?.drop_key || "drop"]:
      props.selectedDropData || "-",
    wedge_level: "choice_level",
    choice_carryover_flag: "New",
    set_name: set_name,
    is_set_primary: index === 1 ? true : false,
  };
};

export const checkIfSetContainsChoice = (choiceSetDetails, row) => {
  let selectedChoice = choiceSetDetails.filter(
    (set) =>
      set.choice_name === row.choice_name && set.set_name && set.set_name !== ""
  );
  return selectedChoice;
};
