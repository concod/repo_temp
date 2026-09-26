import { cloneDeep, groupBy, isEmpty } from "lodash";
import theme from "core/Styles/theme";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { decimalsFormatter, groupByCustom } from "core/Utils/formatter";
import {
  attributeFormatter,
  getLevelFilters,
  getPlanPayload,
  isChannelMultiple,
  updateLyColumnHeading,
  getDefaultChannelValue,
} from "../../../utils-assortsmart/utilityFunctions";
export const checkDataChanged = (data, changedMasterIds) => {
  let dataChanged = false;
  changedMasterIds.forEach((id) => {
    if (id === data.plan_cls_depth_id) {
      dataChanged = true;
    }
  });
  return dataChanged;
};

export const getRecalculatePayload = (
  payloadData,
  depthOrChoice,
  changedMasterIds
) => {
  let recalculatePayload = [];
  payloadData.forEach((data) => {
    if (checkDataChanged(data, changedMasterIds)) {
      let attributeValue =
        depthOrChoice === "depth"
          ? {
              choice_ly: data.choice_ly,
              choice_ty: data.choice_ty,
              qty_ty: data.qty_ty,
              store_cnt: data.store_cnt,
            }
          : {
              depth_ly: data.depth_ly,
              depth_ty: data.depth_ty,
              qty_ty: data.qty_ty,
              max_cc: data.max_cc,
              total_cc_ly: data.total_cc_ly,
              total_cc_ty: data.total_cc_ty,
              store_cnt: data.store_cnt,
            };

      recalculatePayload.push({
        plan_code: data.plan_code,
        plan_cls_depth_id: data.plan_cls_depth_id,
        cluster_code: data.cluster_code,
        attribute_value: attributeValue,
        is_data_changed: checkDataChanged(data, changedMasterIds),
      });
    }
  });
  return recalculatePayload;
};

export const getDepthOrChoicePayload = (
  RTinstance,
  uniqueClusterList,
  depthOrChoice,
  planCode,
  setIsDepthChoiceError
) => {
  let isDepthChoiceError = true;
  let payload = [];
  RTinstance.current.api?.rowRenderer &&
    RTinstance.current.api.forEachNode((temp) => {
      temp = temp.data;
      let item = [];
      if (temp?.l3_name !== "Total") {
        if (depthOrChoice === "choice" && temp?.total_choice_count_ty > 0) {
          isDepthChoiceError = false;
        }
        uniqueClusterList.forEach((cluster_code, index) => {
          if (temp?.[`plan_cls_depth_id${index + 1}`]) {
            let clusterName = temp[
              `cluster_display_name${index + 1}`
            ]?.toLowerCase();
            let payload = {
              plan_code: planCode,
              plan_cls_depth_id: temp[`plan_cls_depth_id${index + 1}`],
              cluster_code: temp[`cluster_code${index + 1}`],
              [`${depthOrChoice}_ty`]: parseFloat(
                temp[`${clusterName}_ty`] || 0
              ),
              [`${depthOrChoice}_ly`]: parseFloat(
                temp[`${clusterName}_ly`] || 0
              ),
              qty_ty: temp[`qty_ty${index + 1}`],
              store_cnt: temp[`store_cnt${index + 1}`],
              id: temp.CLASS_NAME + temp[`cluster_code${index + 1}`],
            };
            if (depthOrChoice === "choice") {
              payload.total_cc_ly = temp.total_cc_ly;
              payload.total_cc_ty = temp.total_cc_ty;
              payload.max_cc = temp.max_cc;
            }
            item.push(payload);
          }
        });
        payload.push(item);
      }
      return item;
    });
  if (depthOrChoice === "choice" && RTinstance.current.api?.rowRenderer) {
    setIsDepthChoiceError(isDepthChoiceError);
  }
  return payload;
};

const getUpdateValueFromMultiplicativeFactor = (item, key) => {
  //If user has changed ST data, then send the new value, else send multiplicative factor (1)
  return item[key] !== 1 ? item[key.toUpperCase()] : item[key];
};

export const getClusterUpdatePayload = (
  payloadData,
  plan_code,
  levels,
  screenConfiguration
) => {
  return payloadData.map((item) => {
    let levelFilter = getLevelFilters(item, levels);
    levelFilter.push({
      attribute_name: "l3_name",
      operator: "in",
      prefix: "levels",
      value: item?.l3_name,
    });
    levelFilter.push({
      attribute_name: "sub_channel",
      operator: "in",
      prefix: "levels",
      value: item?.sub_channel,
    });
    levelFilter.push({
      attribute_name: "plan_code",
      value: plan_code,
      operator: "=",
    });
    levelFilter.push({
      attribute_name: "cluster_code",
      value: item?.["cluster_code"],
      operator: "=",
    });
    levelFilter.push({
      attribute_name: screenConfiguration?.common?.drop_key || "drop",
      value: item?.[screenConfiguration?.common?.drop_key || "drop"],
      operator: "in",
      prefix: "levels",
    });
    levelFilter.forEach((level) => {
      if (!Array.isArray(level.value) && level.attribute_name !== "plan_code") {
        // Convert the filter key's values to array for all metrics expect plan code
        level.value = [level.value];
      }
    });

    return {
      plan_code: plan_code,
      plan_clu_aps_id: item.plan_clu_aps_id,
      filters: levelFilter,
      attribute_value: {
        aps_ly: item.aps_ly,
        aps_ty: item.aps_ty === 0 ? 0 : item.aps_ty,
        st_ly: item.st_ly,
        st_ty: item.st_ty,
        avg_wk_cnt_ly: item.avg_wk_cnt_ly,
        avg_wk_cnt_ty: item.avg_wk_cnt_ty,
        max_cc: item.max_cc,
        min_cc: item.min_cc,
        moq: item.moq,
        cc_threshold: item.cc_threshold,
        receipt_index: item.receipt_index,
        aps_ty_changed: item.aps_ty_changed ? true : false,
        st_clust_ty_changed:
          item.st_ty < 0.99 || item.st_ty > 1.0 ? true : false, //If user has changed the ST data, then true
        avg_wk_ty_changed:
          item.reg_wks_ty < 0.99 || item.reg_wks_ty > 1.1 ? true : false, //If user has changed the Reg. Weeks data, then true
      },
    };
  });
};

export const getL3UpdatePayload = (payloadData, plan_code) => {
  let groupResult = groupBy(payloadData, "plan_l3_aps_id");
  return Object.keys(groupResult).map((keys) => {
    let item = groupResult[keys][0];
    return {
      plan_code: plan_code,
      plan_l3_aps_id: item.plan_l3_aps_id,
      attribute_value: {
        aps_ly: item.aps_total_ly,
        aps_ty: item.aps_total_ty === 0 ? 0 : item.aps_total_ty,
        st_ly: item.st_total_ly,
        st_ty: item.st_total_ty === 0 ? 0 : item.st_total_ty,
        avg_wk_cnt_ly: item.reg_wks_total_ly,
        avg_wk_cnt_ty: item.reg_wks_total_ty === 0 ? 0 : item.reg_wks_total_ty,
        max_cc: item.max_cc === "" ? null : item.max_cc,
        min_cc: item.min_cc === "" ? null : item.min_cc,
        moq: item.moq,
        cc_threshold: item.cc_threshold,
        receipt_index: item.receipt_index,
        all_door_cc: item.all_door_cc,
        all_door_cc_enabled: item.all_door_cc_enabled,
      },
    };
  });
};

export const getFinalDepthChoicePayloadData = (
  depthPayload,
  choicePayload,
  changedMasterIds
) => {
  let payloadData = depthPayload?.map((data, index) => {
    if (
      data[`plan_cls_depth_id${index + 1}`] ===
      choicePayload?.[index]?.[`plan_cls_depth_id${index + 1}`]
    ) {
      return { ...data, ...choicePayload[index] };
    }
    return data;
  });

  let finalDepthChoicePayloadData = [];
  payloadData.forEach((data) => {
    if (checkDataChanged(data, changedMasterIds)) {
      let attributeValue = {
        choice_ly: data.choice_ly,
        choice_ty: data.choice_ty,
        depth_ly: data.depth_ly,
        depth_ty: data.depth_ty,
        qty_ty: data.qty_ty,
        total_cc_ly: data.total_cc_ly,
        total_cc_ty: data.total_cc_ty,
        store_cnt: data.store_cnt,
      };

      finalDepthChoicePayloadData.push({
        plan_code: data.plan_code,
        plan_cls_depth_id: data.plan_cls_depth_id,
        cluster_code: data.cluster_code,
        attribute_value: attributeValue,
        is_data_changed: checkDataChanged(data, changedMasterIds),
      });
    }
  });
  return finalDepthChoicePayloadData;
};

export const getDepthAndChoiceTableData = (tempDepthChoiceTableData, props) => {
  let budgetData = [];
  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;
  const groupByProperties = [
    "l1_name",
    "l2_name",
    "l3_name",
    props.screenConfiguration?.common?.drop_key || "drop",
  ];
  if (optimizationLevels.includes("carryover")) {
    groupByProperties.push("carryover_flag");
  }
  const groupResult = groupByCustom({
    Group: tempDepthChoiceTableData,
    By: groupByProperties,
  });
  groupResult.forEach((item) => {
    let tempData = [];

    item.sort((a, b) => a.cluster_code.localeCompare(b.cluster_code));

    for (let i = 0; i < item.length; i++) {
      if (
        (item[i].carryover_flag !== "Carryover" &&
          props.screenConfiguration["2.2"]?.graph_hide_carryover) ||
        !props.screenConfiguration["2.2"]?.graph_hide_carryover
      ) {
        let clusterName = item[i].cluster_display_name?.toLowerCase();
        let newObj = {};
        newObj["l0_name"] = item[i].l0_name;
        newObj["l1_name"] = item[i].l1_name;
        newObj["l2_name"] = item[i].l2_name;
        newObj["l3_name"] = item[i].l3_name;
        newObj["carryover_flag"] = item[i].carryover_flag;
        newObj["para"] =
          item[i].l1_name +
          item[i].l2_name +
          item[i].l3_name +
          item[i][props.screenConfiguration?.common?.drop_key || "drop"];
        newObj.hierarchy = [
          item[i].l1_name +
            item[i].l2_name +
            item[i].l3_name +
            item[i][props.screenConfiguration?.common?.drop_key || "drop"],
        ];
        if (item[i].carryover_flag !== "Total") {
          //plotings the subRows
          newObj.hierarchy.push(item[i].carryover_flag);
          newObj.parent_col = "carryover_flag";
        }
        newObj["cluster_code" + (i + 1)] = item[i].cluster_code;
        newObj["cluster_display_name" + (i + 1)] = item[i].cluster_display_name;
        newObj["store_cnt" + (i + 1)] = item[i].store_cnt;
        newObj[`${clusterName}_ly`] = parseInt(
          Math.round(item[i][`${props.depthOrChoice}_ly`] || 0).toFixed()
        );
        newObj[`${clusterName}_ty`] = parseInt(
          Math.round(item[i][`${props.depthOrChoice}_ty`] || 0).toFixed()
        );
        newObj["plan_cls_depth_id" + (i + 1)] = item[i].plan_cls_depth_id;
        newObj["qty_ty" + (i + 1)] = item[i].qty_ty;
        newObj["total_depth_ly"] = item[i].total_depth_ly;
        newObj["total_depth_ty"] = item[i].total_depth_ty;
        newObj["uniqueID"] =
          item[i]["l1_name"] +
          item[i].l2_name +
          item[i].l3_name +
          item[i][props.screenConfiguration?.common?.drop_key || "drop"] +
          item[i].carryover_flag;
        newObj[props.screenConfiguration?.common?.drop_key || "drop"] =
          attributeFormatter(
            item[i][props.screenConfiguration?.common?.drop_key || "drop"]
          ) || "-";
        if (props.depthOrChoice === "choice") {
          newObj["max_cc"] = item[i].max_cc;
          newObj["cc_threshold"] = item[i].cc_threshold;
          newObj["ly_total_cc"] = item[i].ly_total_cc;
          newObj["ty_total_cc"] = item[i].ty_total_cc;
        }
        tempData.push(newObj);
      }
    }
    let groupByDrop = groupBy(tempData, (obj) => {
      return obj[props.screenConfiguration?.common?.drop_key || "drop"];
    });
    Object.keys(groupByDrop).forEach((key) => {
      budgetData.push({
        ...groupByDrop[key].reduce(function (result, current) {
          return Object.assign(result, current);
        }, {}),
        [`${
          props.screenConfiguration?.common?.drop_key || "drops"
        }_count`]: Object.keys(groupByDrop).length,
      });
    });
    return null;
  });
  return budgetData;
};

export const getTotalChoiceCountOfRow = (data, uniqueClusterList) => {
  //This function is used to get total_cc
  //This function returns highest value in that row
  data.forEach((row) => {
    row = getMaxCC(row, uniqueClusterList);
  });
  return data;
};

export const getMaxCC = (row, uniqueClusterList) => {
  let tempTY = [],
    tempLY = [];
  uniqueClusterList.forEach((cluster) => {
    if (row[`${cluster}_ty`]) {
      tempTY.push(row[`${cluster}_ty`]);
    } else {
      tempTY.push(0);
    }
    if (row[`${cluster}_ly`]) {
      tempLY.push(row[`${cluster}_ly`]);
    } else {
      tempLY.push(0);
    }
  });
  if (
    (row.carryover_flag && row.carryover_flag !== "Total") ||
    !row.carryover_flag
  ) {
    row.total_choice_count_ty = Math.max(...tempTY);
    row.total_style_count_ty = Math.max(...tempTY);
  }
  row.total_choice_count_ly = Math.max(...tempLY);
  row.total_style_count_ly = Math.max(...tempLY);
  return row;
};

/**
 *
 * @param {Object} budgetData
 * @param {Object} uniqueClusterData
 * @returns Array
 *
 * This method get total of all the rows
 */
export const getChoiceTotalFooterRow = (
  budgetData,
  uniqueClusterData,
  props
) => {
  let footer = [];
  let optimizationLevel =
    props.screenConfiguration?.["2.1"]?.budget_optimization_level;

  //To group data based on drop
  const groupBy_properties = [
    props.screenConfiguration?.common?.drop_key || "drop",
  ];
  if (props.planDetails?.data?.l2_name?.length > 1) {
    groupBy_properties.push("l2_name");
  }
  if (props.planDetails?.data?.l1_name?.length > 1) {
    groupBy_properties.push("l1_name");
  }
  const groupedDrop = groupByCustom({
    Group: budgetData,
    By: groupBy_properties,
  });
  Object.keys(groupedDrop).forEach((drop) => {
    let total_count_ly = 0,
      total_count_ty = 0;
    let uniqueLyCluster = {},
      uniqueTyCluster = {};
    uniqueClusterData.forEach((list) => {
      uniqueLyCluster[`${list}_ly`] = 0;
      uniqueTyCluster[`${list}_ty`] = 0;
    });
    groupedDrop[drop].forEach((data) => {
      if (
        !optimizationLevel.includes("carryover") ||
        (optimizationLevel.includes("carryover") &&
          data.carryover_flag === "Total")
      ) {
        total_count_ly =
          total_count_ly + (Math.round(data.total_choice_count_ly) || 0);
        total_count_ty =
          total_count_ty + (Math.round(data.total_choice_count_ty) || 0);
        uniqueClusterData.forEach((list) => {
          uniqueLyCluster[`${list}_ly`] =
            uniqueLyCluster[`${list}_ly`] +
            (Math.round(data[`${list}_ly`]) || 0);
          uniqueTyCluster[`${list}_ty`] =
            uniqueTyCluster[`${list}_ty`] +
            (Math.round(data[`${list}_ty`]) || 0);
        });
      }
    });
    footer.push({
      total_choice_count_ly: total_count_ly || 0,
      total_choice_count_ty: total_count_ty || 0,
      total_style_count_ly: total_count_ly || 0,
      total_style_count_ty: total_count_ty || 0,
      ...uniqueLyCluster,
      ...uniqueTyCluster,
      l3_name: "Total",
      l2_name: groupedDrop[drop][0]?.l2_name,
      l1_name: groupedDrop[drop][0]?.l1_name,
      [props.screenConfiguration?.common?.drop_key || drop]: groupedDrop[
        drop
      ][0]?.[props.screenConfiguration?.common?.drop_key || "drop"],
      para:
        "Total" +
        groupedDrop[drop][0]?.[
          props.screenConfiguration?.common?.drop_key || "drop"
        ],
      hierarchy: [
        groupedDrop[drop][0]?.l2_name +
          groupedDrop[drop][0]?.l1_name +
          "Total" +
          groupedDrop[drop][0]?.[
            props.screenConfiguration?.common?.drop_key || "drop"
          ],
      ],
      uniqueID:
        "total" +
        groupedDrop[drop][0]?.[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] +
        groupedDrop[drop][0]?.l1_name +
        groupedDrop[drop][0]?.l2_name +
        groupedDrop[drop][0]?.l3_name,
    });
  });
  return footer;
};

/**
 *
 * @param {Object} data - graph data
 * @param {Object} key
 * @returns Array
 *
 * This method returns depth and choice graph form dropdown options
 */
export const setDepthChoiceFormOptions = (data, key) => {
  return data.map((items) => {
    let label = items[key];
    return {
      value: items[key],
      label: attributeFormatter(label),
      id: items[key],
    };
  });
};

export const buildMultiLineGraphForDepthAndChoice = (
  depthFormData,
  choiceFormData,
  graphData,
  type,
  props
) => {
  if (
    !isEmpty(depthFormData.depth_cluster) &&
    !isEmpty(choiceFormData.choice_cluster)
  ) {
    let thisYearDepth = [],
      lastYearDepth = [],
      thisYearChoice = [],
      lastYearChoice = [];
    const l3Value =
      type === "depth"
        ? depthFormData.depth_cluster
        : choiceFormData.choice_cluster;
    const formData = type === "depth" ? depthFormData : choiceFormData;
    let dropdownValues = graphData.filter(
      (item) =>
        (item.l1_name === props.formData?.l1_name ||
          (!props.formData?.l1_name && item.l1_name)) &&
        (item.l2_name === props.formData?.l2_name ||
          (!props.formData?.l2_name && item.l2_name)) &&
        item.l3_name === l3Value &&
        ((formData[props.screenConfiguration?.common?.drop_key || "drop"]
          ?.length &&
          formData.carryover_flag?.length &&
          formData[props.screenConfiguration?.common?.drop_key || "drop"] ===
            item[props.screenConfiguration?.common?.drop_key || "drop"] &&
          formData.carryover_flag === item.carryover_flag) ||
          (!formData.carryover_flag &&
            formData[props.screenConfiguration?.common?.drop_key || "drop"] &&
            item[props.screenConfiguration?.common?.drop_key || "drop"] ===
              formData[
                props.screenConfiguration?.common?.drop_key || "drop"
              ]) ||
          (!formData[props.screenConfiguration?.common?.drop_key || "drop"] &&
            formData.carryover_flag &&
            item.carryover_flag === formData.carryover_flag) ||
          (!formData[props.screenConfiguration?.common?.drop_key || "drop"] &&
            !formData.carryover_flag))
    );
    if (type === "depth") {
      lastYearDepth = dropdownValues.map((value) =>
        parseFloat(decimalsFormatter({ value: value.depth_ly }))
      );
      thisYearDepth = dropdownValues.map((value) =>
        parseFloat(decimalsFormatter({ value: value.depth_ty }))
      );
    } else {
      lastYearChoice = dropdownValues.map((value) =>
        parseFloat(decimalsFormatter({ value: value.choice_ly }))
      );
      thisYearChoice = dropdownValues.map((value) =>
        parseFloat(decimalsFormatter({ value: value.choice_ty }))
      );
    }
    let xaxisL3UniqueValues = dropdownValues.map(
      (item) => item.cluster_display_name
    );

    let seriesData = [
      {
        name: "TY",
        data: type === "depth" ? thisYearDepth : thisYearChoice,
        color: theme.palette.graphColours[0],
      },
      {
        name: updateLyColumnHeading(props.planDetails?.data?.compare_year),
        data: type === "depth" ? lastYearDepth : lastYearChoice,
        color: theme.palette.graphColours[1],
      },
    ];
    return {
      type: props.depthChoiceGraphData.type?.depth_data,
      chartType: "multiLineChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          title: "Cluster",
          categories: xaxisL3UniqueValues,
        },
        yaxis: {
          //TO DO: Make this logic more generic in future
          title:
            type === "depth"
              ? props.depthChoiceGraphData.title?.depth_data
              : props.screenConfiguration[
                  "2.1"
                ]?.budget_optimization_level?.includes("carryover")
              ? "Style Count"
              : props.depthChoiceGraphData.title?.choice_data,
        },
      },
      series: seriesData,
    };
  }
};

/**
 *
 * @param {Object} type - field type (sub_channel, channel)
 * @returns Array
 *
 * This method returns parameters table form dropdown options
 */

export const getChannelOptionDropdown = (type) => {
  let dropDownOptions = [];
  Object.keys(type).map((data) => {
    dropDownOptions.push({
      label: data,
      value: data,
      id: data,
    });
    return data;
  });
  return dropDownOptions;
};

export const fetchDepthChoiceData = async (
  props,
  selectedChannel,
  setDepthChoicePayload,
  setDepthTableCols,
  setChoiceTableCols,
  setShowDepthChoiceComponent
) => {
  props.set2_2_Loader(true);
  let planData = props.planDetails?.data;
  let payload = getPlanPayload(planData, props.planLevels);
  setDepthChoicePayload(payload);
  payload.filters.push({
    attribute_name: "channel",
    value: isChannelMultiple(props.planDetails?.data)
      ? [
          selectedChannel?.value ||
            getDefaultChannelValue(null, props.planDetails?.data),
        ]
      : props.planDetails?.data?.channel,
    operator: "in",
    prefix: "levels",
  });
  props.setDepthChoiceData([]);
  let response = await props.getDepthChoiceData(
    payload,
    props.screenConfiguration?.common?.endpoint_project_name || "assort"
  );
  if (!isEmpty(response)) {
    let depthColumns = agGridColumnFormatter(
      cloneDeep(response?.data?.data?.columns?.depth_columns),
      props.columnHeaderJson,
      null,
      null,
      null,
      props.history.location.pathname.includes("view")
    );
    if (depthColumns?.length) {
      depthColumns.forEach((cols) => {
        if (
          cols.accessor === props.screenConfiguration?.common?.drop_key ||
          "drop"
        ) {
          cols.filter = "agTextColumnFilter";
        }
      });
    }
    setDepthTableCols(depthColumns);
    let choiceColumns = agGridColumnFormatter(
      cloneDeep(response?.data?.data?.columns?.choice_columns),
      props.columnHeaderJson,
      null,
      null,
      null,
      props.history.location.pathname.includes("view")
    );
    if (choiceColumns?.length) {
      choiceColumns.forEach((cols) => {
        if (cols?.children?.length) {
          cols.children = cols.children.map((children) => {
            return {
              ...children,
              aggFunc: "sum",
            };
          });
        }
        if (
          cols.accessor === props.screenConfiguration?.common?.drop_key ||
          "drop"
        ) {
          cols.filter = "agTextColumnFilter";
        }
      });
    }
    setChoiceTableCols(choiceColumns);
    let depthChoiceData = response?.data?.data?.data;
    if (depthChoiceData?.choice_data && depthChoiceData?.depth_data) {
      props.setDepthChoiceData(depthChoiceData);
      props.setDisableNext(false);
    } else {
      setShowDepthChoiceComponent(false);
      props.setDisableNext(true);
    }
    props.setDepthChoiceGraphData(response?.data?.data);
    props.setShowReceiptDrawer(true);
    props.set2_2_Loader(false);
  } else {
    props.set2_2_Loader(false);
  }
};

export const recalculateTotal = (tableData, columnId, screenConfiguration) => {
  //recalculating if new row changed in carryover flow
  let groupedData = groupByCustom({
    Group: tableData,
    By: ["l2_name", screenConfiguration?.common?.drop_key || "drop"],
  });
  let calculatedData = [];
  Object.keys(groupedData).forEach((items) => {
    let groupedResult = groupBy(groupedData[items], "l3_name");
    Object.keys(groupedResult).forEach((level3) => {
      groupedResult[level3].forEach((eachRow, index) => {
        if (eachRow.carryover_flag === "Total") {
          let dataL3 = groupedResult[level3];
          eachRow[columnId] =
            (dataL3[index + 2]?.[columnId] || 0) +
            (dataL3[index + 1]?.[columnId] || 0);
          calculatedData.push(eachRow);
        } else {
          calculatedData.push(eachRow);
        }
      });
    });
  });
  return calculatedData;
};

export const handleUpdateValidation = (
  columnId,
  rowData,
  value,
  tableInstance,
  props
) => {
  let row = rowData;
  let columnLy = columnId.replace("ty", "ly");
  let lyData = rowData[columnLy];
  let carryoverValueTY = 0,
    carryoverValueLY = 0;
  if (row.carryover_flag) {
    if (lyData) {
      tableInstance?.current?.api?.forEachNode((node) => {
        if (
          node.data.l3_name === row.l3_name &&
          node.data.carryover_flag === "Carryover"
        ) {
          carryoverValueTY = node.data[columnId];
          carryoverValueLY = node.data[columnId.replace("ty", "ly")];
        }
      });
      let totalValueTY = value + carryoverValueTY;
      let totalValueLY =
        (row[columnId.replace("ty", "ly")] + carryoverValueLY) / 2;
      if (
        Math.round((totalValueTY / totalValueLY) * 100) / 100 >
        row.cc_threshold
      ) {
        props.addSnack({
          message:
            "TY to LY values ratio should not be more than " + row.cc_threshold,
          options: {
            variant: "error",
          },
        });
      }
    }
  }
};

export const updateChoiceValues = (
  columnId,
  row,
  value,
  initialValue,
  tempData,
  uniqueClusterList,
  changedIds,
  setTotalFooter,
  optimizationLevels,
  props
) => {
  if (
    !columnId.includes("total_choice_count_ty") &&
    !columnId.includes("total_style_count_ty")
  ) {
    getTotalChoiceCountOfRow(tempData, cloneDeep(uniqueClusterList));
    props.handleChangedMasterIds(changedIds);
  }
  if (
    columnId === "total_style_count_ty" ||
    (optimizationLevels.includes("carryover") &&
      columnId === "total_choice_count_ty")
  ) {
    const masterIds = [];
    for (const key in row) {
      if (key.includes("plan_cls_depth_id")) {
        masterIds.push(row[key]);
      }
    }
    props.handleChangedMasterIds(masterIds);
    props.uniqueClusterList.forEach((clust) => {
      let splitPen = row[`${clust}_ty`] / (initialValue || 1);
      row[`${clust}_ty`] = value * splitPen;
      tempData = recalculateTotal(
        tempData,
        `${clust}_ty`,
        props.screenConfiguration
      );
    });
    tempData = recalculateTotal(tempData, columnId, props.screenConfiguration);
    tempData = getTotalChoiceCountOfRow(tempData, props.uniqueClusterList);
    setTotalFooter(getChoiceTotalFooterRow(tempData, uniqueClusterList, props));
  }
  tempData = recalculateTotal(
    tempData,
    "total_style_count_ty",
    props.screenConfiguration
  );
  tempData = recalculateTotal(
    tempData,
    "total_choice_count_ty",
    props.screenConfiguration
  );
};
