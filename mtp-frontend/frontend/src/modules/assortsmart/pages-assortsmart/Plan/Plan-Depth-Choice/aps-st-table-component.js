import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Button } from "@mui/material";
import { cloneDeep, groupBy, uniqBy, isEmpty } from "lodash";
import { useHistory } from "react-router";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getApsStData,
  setApsStData,
  set2_2_Loader,
  updateL3ApsStData,
  updateClusterApsStData,
  optimizeApsSt,
  optimizeDepthChoice,
} from "../../../services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import {
  calculateNoOfWeeks,
  getPlanPayload,
  isWholesalePlan,
  attributeFormatter,
  isDropPlan,
  isChannelMultiple,
  externalFilterLevelsChannelSubChannel,
  scrollIntoView,
  getDefaultChannelValue,
  getFilteredFooter,
  assortAgGridCustomCellRenderer,
} from "../../../utils-assortsmart/utilityFunctions";
import {
  getClusterUpdatePayload,
  getL3UpdatePayload,
} from "./depth-choice-functions";
import { updatePlanAPI } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import AgGridTable from "core/Utils/agGrid";
import {
  getOptimizeApsStPayload,
  handleRegWksValidation,
  optimizeDepthChoicePayload,
  updateApsstPayload,
  getAPSTotalFooterRow,
  onFooterTotalRegWeekEdit,
  onFooterTotalStEdit,
  onFooterTotalApsEdit,
  recalculateApsTotalCol,
} from "./aps-st-table-functions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planDepthChoiceServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import { bindActionCreators } from "redux";
import SetallForm from "core/Utils/agGrid/setall-form";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { groupByCustom } from "core/Utils/formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const ApsStComponent = (props) => {
  const [apsStColumns, setApsStColumns] = useState([]);
  const [apsStTableData, setApsStTableData] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [apsTableColumns, setApsTableColumns] = useState({});
  const [showSetAllPopup, setShowSetAllPopup] = useState(false);
  const [clusterCodes, setClusterCodes] = useState([]);
  const [totalFooter, setTotalFooter] = useState([]);
  const [filteredFooter, setFilteredFooter] = useState([]);
  const [droplevelL3, setDropLevelL3] = useState({});
  //const [uniqueClusterList, setUniqueClusterList] = useState([]);

  const history = useHistory();
  const isView = history.location.pathname.includes("view");
  const classes = useStyles();
  const apsTableInstance = useRef({});
  let formData = props.formData;
  const coreChoice = useRef({});
  const isCalculateApsSuccess = useRef({});
  const selectedDropData = useRef(props.selectedDropData);

  useEffect(() => {
    let planData = props.planDetails?.data;
    const fetchData = async () => {
      props.set2_2_Loader(true);
      try {
        let planCode = props.planDetails?.data?.plan_code;
        let AssortNLE = parseInt(localStorage.getItem("AssortNLE"));
        if (
          props.initialLoadDepthChoice &&
          !props.fromDashboardScreen_2_2 &&
          planCode !== AssortNLE
        ) {
          let payload = getOptimizeApsStPayload(props);
          let apsStResponse = await props.optimizeApsSt(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name ||
              "assort",
            props.planDetails?.data?.plan_code
          );
          if (apsStResponse?.data?.status) {
            isCalculateApsSuccess.current = true;
            fetchApsSt(planData);
          }
        } else {
          fetchApsSt(planData);
        }
      } catch (err) {
        props.set2_2_Loader(false);
        props.addSnack({
          message: "Fetching APS ST details failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.callApsSt && props.planDetails?.data) {
      fetchApsSt(props.planDetails?.data);
      props.setCallApsSt(false);
    }
  }, [props.callApsSt]);

  useEffect(() => {
    formData = props.formData;
    if (apsTableInstance?.current?.api) {
      apsTableInstance.current.api.onFilterChanged();
      if (props.isDepthChannelChanged) {
        let planData = props.planDetails?.data;
        fetchApsSt(planData);
      }
    }
  }, [props.formData, apsTableInstance]);

  useEffect(() => {
    if (apsTableInstance?.current?.api) {
      apsTableInstance.current.api.onFilterChanged();
    }
  }, [props.selectedDropData]);

  useEffect(() => {
    if (totalFooter?.length > 0) {
      let formValue = {};
      if (!isEmpty(props.selectedChannel)) {
        formValue.channel = props.selectedChannel?.value;
      }
      if (!isEmpty(props.levelSelected)) {
        Object.keys(props.levelSelected).forEach((level) => {
          formValue[level] = props.levelSelected?.[level]?.value;
        });
      }
      setFilteredFooter([]);
      if (props.selectedDropData) {
        formValue[props.screenConfiguration?.common?.drop_key || "drop"] =
          props.selectedDropData;
      }
      setFilteredFooter(getFilteredFooter(totalFooter, formValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    totalFooter,
    props.selectedDropData,
    JSON.stringify(props.selectedChannel),
    JSON.stringify(props.levelSelected),
  ]);

  useEffect(() => {
    coreChoice.current = props.coreChoice;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      if (!isEmpty(apsTableColumns)) {
        let tableColumns = cloneDeep(apsTableColumns);
        const dropKeys = Object.keys(groupedDrops);
        //update "All Door CC" column is_hidden property false/true when all door cc is enabled/disabled for the selected drop
        dropKeys.forEach((drop) => {
          if (drop === props.selectedDropData) {
            let cols = cloneDeep(tableColumns["instance" + drop.split(" ")[1]]);
            cols?.forEach((col) => {
              if (col.accessor === "all_door_cc") {
                col.is_hidden = !props.coreChoice ? true : false;
              }
            });
            tableColumns["instance" + drop.split(" ")[1]] = cols;
          }
        });
        setApsTableColumns(tableColumns);
      }
    } else {
      //Update "All Door CC" column is_hidden property for non-drop plans
      if (apsStColumns.length) {
        const apstTableCols = cloneDeep(apsStColumns);
        apstTableCols.forEach((col) => {
          if (col.accessor === "all_door_cc") {
            col.is_hidden = !props.coreChoice ? true : false;
          }
          setApsStColumns(apstTableCols);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.coreChoice, props.selectedDropData]);

  useEffect(() => {
    if (
      apsStTableData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let drops = groupBy(
        apsStTableData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setGroupedDrops(drops);
      if (isEmpty(props.dropToggleCoreChoice.current)) {
        let toggleObj = {};
        Object.keys(drops).forEach((key) => {
          if (isChannelMultiple(props.planDetails?.data)) {
            props.planDetails?.data?.channel.forEach((chan) => {
              if (
                apsStTableData?.[0]?.all_door_cc_enabled?.toLowerCase() ===
                  "true" &&
                apsStTableData?.[0]?.channel === chan
              ) {
                toggleObj = { ...toggleObj, [`${key}_${chan}`]: true };
              } else {
                toggleObj = { ...toggleObj, [`${key}_${chan}`]: false };
              }
            });
          } else {
            if (
              apsStTableData?.[0]?.all_door_cc_enabled?.toLowerCase() === "true"
            ) {
              toggleObj = { ...toggleObj, [key]: true };
            } else {
              toggleObj = { ...toggleObj, [key]: false };
            }
          }
        });
        props.dropToggleCoreChoice.current = toggleObj;
      }
      let tableColumns = {},
        dropKeys = Object.keys(drops);
      //Setting aps table columns for each drop instance
      dropKeys.forEach((drop) => {
        if (drop?.trim() === "Total") {
          let columns = cloneDeep(apsStColumns);
          // View only for Total Drop data
          columns.forEach((item) => {
            if (item?.sub_headers?.length) {
              item.sub_headers.map((sub_col) => {
                if (sub_col.column_name.includes("_ty")) {
                  sub_col.is_editable = false;
                }
                sub_col.sub_headers.map((child) => {
                  if (child.column_name.includes("_ty")) {
                    child.is_editable = false;
                  }
                });
              });
            }
            if (
              item.column_name === "max_cc" ||
              item.column_name === "all_door_cc" ||
              item.column_name === "cc_threshold" ||
              item.column_name === "moq" ||
              item.column_name === "min_cc_threshold"
            ) {
              item.is_editable = false;
            }
          });
          let col = agGridColumnFormatter(
            columns,
            props.columnHeaderJson,
            {},
            true,
            null,
            history.location.pathname.includes("view")
          );
          col.forEach((obj) => {
            if (
              obj.accessor === props.screenConfiguration?.common?.drop_key ||
              "drop"
            ) {
              obj.filter = "agTextColumnFilter";
            }
          });
          tableColumns["instance" + "Total"] = col;
        } else {
          tableColumns["instance" + drop.split(" ")[1]] = apsStColumns;
        }
      });
      setApsTableColumns(tableColumns);
    } else if (
      apsStTableData?.length &&
      isChannelMultiple(props.planDetails?.data)
    ) {
      if (isEmpty(props.dropToggleCoreChoice.current)) {
        let toggleObj = {};
        props.planDetails?.data?.channel.forEach((chan) => {
          if (
            apsStTableData?.[0]?.all_door_cc_enabled?.toLowerCase() ===
              "true" &&
            apsStTableData?.[0]?.channel === chan
          ) {
            toggleObj = { ...toggleObj, [`${chan}`]: true };
          } else {
            toggleObj = { ...toggleObj, [`${chan}`]: false };
          }
        });
        props.dropToggleCoreChoice.current = toggleObj;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apsStTableData]);

  useEffect(() => {
    if (
      apsStTableData &&
      props.selectedDropData &&
      apsTableInstance?.current?.api &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      try {
        apsTableInstance?.current?.api?.setFilterModel(hardcodedFilter);
      } catch (e) {
        console.log("error:", e);
      }
    }
    selectedDropData.current = props.selectedDropData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apsTableInstance?.current?.api, props.selectedDropData, apsStTableData]);

  useEffect(() => {
    if (props.checkSetAllValidation) {
      setAllValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.checkSetAllValidation]);

  useEffect(() => {
    if (props.callUpdateApsData) {
      //NOTE: Will uncomment in case it cause some other issue
      // props.setSelectedDropData(null);
      updateApsSt();
    }
  }, [props.callUpdateApsData]);

  useEffect(() => {
    if (!showSetAllPopup) {
      props.setCheckSetAllValidation(false);
    }
  }, [showSetAllPopup]);

  const fetchApsSt = async (planData, callOptimizeDepthChoice) => {
    props.set2_2_Loader(true);
    setApsStTableData([]);
    let payload = getPlanPayload(planData, props.planLevels);
    if (isChannelMultiple(props.planDetails?.data)) {
      payload.filters.push({
        attribute_name: "channel",
        value: [formData?.channel_list || getDefaultChannelValue([], planData)],
        prefix: "levels",
        operator: "in",
      });
    }
    payload.optimization_level =
      props.screenConfiguration?.common?.final_level || "l3_name";
    let response = await props.getApsStData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    let apsData = response?.data?.data;
    if (apsData?.data?.length) {
      let apstTableCols = [];
      let allDoorCcEnabled = uniqBy(
        response?.data?.data?.data,
        "all_door_cc_enabled"
      );
      allDoorCcEnabled = allDoorCcEnabled[0]?.all_door_cc_enabled === "True";
      if (apsData?.columns?.length) {
        let cols = agGridColumnFormatter(
          apsData?.columns,
          props.columnHeaderJson,
          {},
          true,
          null,
          history.location.pathname.includes("view")
        );
        apstTableCols = cloneDeep(cols);
        apstTableCols.forEach((col) => {
          if (
            col.accessor === props.screenConfiguration?.common?.drop_key ||
            "drop"
          ) {
            col.filter = "agTextColumnFilter";
          }
          if (col.accessor === "reg_wks") {
            col.sub_headers.forEach((sub_col) => {
              if (sub_col.accessor === "reg_wks_ty") {
                sub_col["isDataValidate"] = true;
              }
            });
          }
          if (col.accessor === "all_door_cc") {
            col.is_hidden = !allDoorCcEnabled ? true : false;
          }
        });
        setApsStColumns(apstTableCols);
        props.setCoreChoice(allDoorCcEnabled);
      }
      apsData.data.forEach((item) => {
        item.reg_wks_ty = item.avg_wk_cnt_ty;
        item.reg_wks_ly = item.avg_wk_cnt_ly;
      });
    }
    props.setApsStData(response?.data?.data);
    let tableData = [];
    let dropL3 = {};
    let drop = props.screenConfiguration?.common?.drop_key || "drop";
    let groupedData = groupByCustom({
      Group: response?.data?.data?.data,
      By: ["plan_l3_aps_id", drop],
    });
    let clusterData = [];
    groupedData.map((obj) => {
      let tempData = { ...obj[0] };
      clusterData = [];
      obj.map((attri_value) => {
        if (dropL3[tempData?.drop]) {
          if (!dropL3[tempData?.drop].includes(attri_value?.l3_name)) {
            dropL3[tempData?.drop].push(attri_value?.l3_name);
          }
        } else {
          dropL3[tempData?.drop] = [];
          dropL3[tempData?.drop].push(attri_value?.l3_name);
        }
        let clusterCode =
          attri_value?.["cluster_display_name"]?.toLowerCase() ||
          attri_value?.["cluster_code"]?.toLowerCase();
        tempData["receipt_units_ty"] = attri_value.qty_ty;
        tempData["receipt_units_ly"] = attri_value.qty_ly;
        tempData["sales_units_ty"] = attri_value.forecast_units_ty;
        tempData["sales_units_ly"] = attri_value.forecast_units_ly;
        tempData["choice_count_ly"] = attri_value.cc_ly;
        tempData["str_cnt"] = attri_value.str_cnt;
        tempData[`constraint_aps_${clusterCode}_ty`] =
          attri_value.attribute_value["constraint_aps_ty"];
        tempData[`aps_${clusterCode}_ly`] =
          attri_value.attribute_value["aps_ly"];
        tempData[`aps_${clusterCode}_ty`] =
          attri_value.attribute_value["aps_ty"];
        tempData[`st_${clusterCode}_ly`] = attri_value.attribute_value["st_ly"];
        tempData[`st_${clusterCode}_ty`] =
          attri_value.attribute_value["st_ty"] *
          (attri_value[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] === "Total"
            ? 100
            : 1) *
          (isView || tempData?.drop?.trim() === "Total" ? 1 : 100);
        tempData[`reg_wks_${clusterCode}_ly`] =
          attri_value.attribute_value["avg_wk_cnt_ly"];
        tempData[`reg_wks_${clusterCode}_ty`] = Math.round(
          attri_value.attribute_value["avg_wk_cnt_ty"]
        );
        tempData[`store_cnt_${clusterCode}`] =
          attri_value.attribute_value["store_cnt"];
        tempData[`cc_${clusterCode}`] = Math.round(
          attri_value.attribute_value["cc_ly"]
        );
        tempData[`qty_${clusterCode}_ty`] =
          attri_value.attribute_value["qty_ty"];
        tempData[`qty_${clusterCode}_ly`] =
          attri_value.attribute_value["qty_ly"];
        tempData[`moq_${clusterCode}`] = attri_value.attribute_value["moq"];
        tempData[`plan_clu_aps_id_${clusterCode}`] =
          attri_value.plan_clu_aps_id;
        tempData[`receipt_index_${clusterCode}`] =
          attri_value.attribute_value["receipt_index"];
        tempData[props.screenConfiguration?.common?.drop_key || "drop"] =
          attri_value[props.screenConfiguration?.common?.drop_key || "drop"] !==
          "-"
            ? attributeFormatter(
                attri_value[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ]
              )
            : attri_value[
                props.screenConfiguration?.common?.drop_key || "drop"
              ];
        tempData["constraint_aps_total_ty"] = attri_value["constraint_aps_ty"];
        tempData["aps_total_ly"] = attri_value["aps_ly"];
        tempData["qty_ty"] = attri_value["qty_ty"];
        tempData["qty_ly"] = attri_value["qty_ly"];
        tempData["aps_total_ty"] = attri_value["aps_ty"];
        tempData["st_total_ly"] = attri_value["st_ly"];
        tempData["st_total_ty"] =
          attri_value["st_ty"] *
          (attri_value[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] === "Total"
            ? 100
            : 1) *
          (isView || tempData?.drop?.trim() === "Total" ? 1 : 100);
        tempData.l2_name = replaceSpecialCharacter(attri_value.l2_name);
        tempData.l3_name = replaceSpecialCharacter(attri_value.l3_name);
        if (tempData?.drop?.trim() === "Total") {
          tempData.min_cc_threshold = "-";
          tempData.cc_threshold = "-";
        }
        tempData.uniqID =
          (attri_value.l3_name || "") +
          attri_value.l2_name +
          attri_value.l1_name +
          attri_value[props.screenConfiguration?.common?.drop_key || "drop"] +
          attri_value.channel;
        clusterData.push(clusterCode);
      });
      tableData.push(tempData);
      setClusterCodes(clusterData);
    });
    getTotalRegWeeksApsOfRow(tableData, clusterData);
    props.setUniqueClusterList(clusterData);
    setDropLevelL3(dropL3);
    setApsStTableData(tableData);
    setTotalFooter(getAPSTotalFooterRow(tableData, clusterData, props));
    props.setParameterTableData(tableData);
    if (
      (props.isApsChannelChanged && props.showDepthChoiceComponent) ||
      (props.isDepthChannelChanged && props.showDepthChoiceComponent)
    ) {
      props.showDepthChoiceTable(true);
      props.setIsAPSChannelChanged(false);
      props.setIsDepthChannelChanged(false);
    }
    if (!props.showDepthChoiceComponent && !callOptimizeDepthChoice) {
      props.set2_2_Loader(false);
    }
  };

  const recalculateTotalTab = (apsData) => {
    let dropBasedArray = apsData.filter((obj) => obj.drop.trim() !== "Total");
    let groupedArray = groupByCustom({
      Group: apsStTableData,
      By: ["l3_name"],
    });
    let totalCalculatedDrop = [];
    groupedArray.forEach((groupedData) => {
      let totalDropObj = {
        aps_total_ty: 0,
        reg_wks_total_ty: 0,
        reg_wks_total_ly: 0,
        st_total_ty: 0,
        st_total_ly: 0,
      };
      let totalQtyObj = {};
      let totalObj = {};
      let totalQty = 0,
        totalQtyLy = 0;
      let sumStrCnt = 0;
      let regWksArr = [],
        regWksArrTy = [],
        ccArr = [];
      props.uniqueClusterList.forEach((list) => {
        totalDropObj["aps_" + list + "_ty"] = 0;
        totalDropObj["st_" + list + "_ty"] = 0;
        totalDropObj["st_" + list + "_ly"] = 0;
        totalDropObj["reg_wks_" + list + "_ty"] = 0;
        totalDropObj["reg_wks_" + list + "_ly"] = 0;
        totalQtyObj[list + "_qty_ty"] = 0;
        totalQtyObj[list + "_qty_ly"] = 0;
      });
      groupedData.forEach((data) => {
        //data = getMaxRegWeeks(data, props.uniqueClusterList);
        if (data.drop.trim() !== "Total") {
          props.uniqueClusterList.forEach((list) => {
            totalDropObj["aps_" + list + "_ty"] +=
              data["aps_" + list + "_ty"] * data["qty_" + list + "_ty"];
            totalDropObj["st_" + list + "_ty"] +=
              data["st_" + list + "_ty"] * data["qty_" + list + "_ty"];
            totalDropObj["st_" + list + "_ly"] +=
              data["st_" + list + "_ly"] * data["qty_" + list + "_ly"];
            totalDropObj["reg_wks_" + list + "_ty"] +=
              data["reg_wks_" + list + "_ty"] * data["qty_" + list + "_ty"];
            totalDropObj["reg_wks_" + list + "_ly"] +=
              data["reg_wks_" + list + "_ly"] * data["qty_" + list + "_ly"];
            totalQtyObj[list + "_qty_ty"] += data["qty_" + list + "_ty"];
            totalQtyObj[list + "_qty_ly"] += data["qty_" + list + "_ly"];
          });
        }
        if (data.drop.trim() == "Total") {
          totalObj = { ...data };
        }
      });
      props.uniqueClusterList.forEach((list) => {
        totalDropObj["aps_" + list + "_ty"] =
          totalQtyObj[list + "_qty_ty"] > 0
            ? totalDropObj["aps_" + list + "_ty"] /
              totalQtyObj[list + "_qty_ty"]
            : 0;
        totalDropObj["st_" + list + "_ty"] =
          totalQtyObj[list + "_qty_ty"] > 0
            ? totalDropObj["st_" + list + "_ty"] / totalQtyObj[list + "_qty_ty"]
            : 0;
        totalDropObj["st_" + list + "_ly"] =
          totalQtyObj[list + "_qty_ly"] > 0
            ? totalDropObj["st_" + list + "_ly"] / totalQtyObj[list + "_qty_ly"]
            : 0;
        totalDropObj["reg_wks_" + list + "_ty"] =
          totalQtyObj[list + "_qty_ty"] > 0
            ? totalDropObj["reg_wks_" + list + "_ty"] /
              totalQtyObj[list + "_qty_ty"]
            : 0;
        totalDropObj["reg_wks_" + list + "_ly"] =
          totalQtyObj[list + "_qty_ly"] > 0
            ? totalDropObj["reg_wks_" + list + "_ly"] /
              totalQtyObj[list + "_qty_ly"]
            : 0;
        totalDropObj["aps_total_ty"] +=
        totalDropObj[`aps_${list}_ty`] *
        totalDropObj[`reg_wks_${list}_ty`] *
            (totalObj[`cc_${list}`] || 1) *
            totalObj[`store_cnt_${list}`];
        totalDropObj["st_total_ty"] +=
          totalDropObj["st_" + list + "_ty"] * totalObj["qty_" + list + "_ty"];
        totalDropObj["st_total_ly"] +=
          totalDropObj["st_" + list + "_ly"] * totalObj["qty_" + list + "_ly"];
        totalDropObj["reg_wks_total_ty"] +=
          totalDropObj["reg_wks_" + list + "_ty"] *
          totalObj["qty_" + list + "_ty"];
        totalDropObj["reg_wks_total_ly"] +=
          totalDropObj["reg_wks_" + list + "_ly"] *
          totalObj["qty_" + list + "_ly"];
        totalQty += totalObj["qty_" + list + "_ty"];
        totalQtyLy += totalObj["qty_" + list + "_ly"];
        sumStrCnt += totalObj[`store_cnt_${list}`];
        regWksArr.push(totalObj[`reg_wks_${list}_ly`]);
        regWksArrTy.push(totalDropObj["reg_wks_" + list + "_ty"]);
        ccArr.push(totalObj[`cc_${list}`]);
      });
      totalDropObj["aps_total_ty"] = totalDropObj["aps_total_ty"] / Math.max(...ccArr) / sumStrCnt / Math.max(...regWksArrTy);
      totalDropObj["st_total_ty"] =
        totalQty > 0 ? totalDropObj["st_total_ty"] / totalQty : 0;
      totalDropObj["st_total_ly"] =
        totalQtyLy > 0 ? totalDropObj["st_total_ly"] / totalQtyLy : 0;
      totalDropObj["reg_wks_total_ty"] =
        totalQty > 0 ? totalDropObj["reg_wks_total_ty"] / totalQty : 0;
      totalDropObj["reg_wks_total_ly"] =
        totalQtyLy > 0 ? totalDropObj["reg_wks_total_ly"] / totalQtyLy : 0;
      totalCalculatedDrop.push({
        ...totalObj,
        ...totalDropObj,
        drop: "Total ",
        l3_name: groupedData?.[0]?.l3_name,
        uniqueID: "Total_" + groupedData?.[0]?.l3_name,
      });
    });
    dropBasedArray.push(...totalCalculatedDrop);
    return dropBasedArray;
  };

  useEffect(() => {
    if (props.selectedDropData && apsStTableData?.length) {
      if (props.selectedDropData.trim() === "Total") {
        setApsStTableData([]);
        const dropBasedArray = recalculateTotalTab(apsStTableData);
        getTotalRegWeeksApsOfRow(dropBasedArray, clusterCodes);
        setApsStTableData(dropBasedArray);
        setTotalFooter(
          getAPSTotalFooterRow(dropBasedArray, props.uniqueClusterList, props)
        );
        if (apsTableInstance.current.api) {
          apsTableInstance.current.api.refreshCells({
            update: dropBasedArray,
            force: true,
            suppressFlash: false,
          });
        }
      }
    }
  }, [props.selectedDropData]);

  const onUpdateApsSt = () => {
    props.setDisableNext(true);
    props.showDepthChoiceTable(false);
    props.setShowDepthChoiceComponent(false);
    props.setEnableRecalculateChoiceBtn(true);
    props.setEnableRecalculateDepthBtn(true);
    scrollIntoView("choice-table");
    props.setInitialLoadWedge(true);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_3(false);
    props.setFromDashboardScreen_2_4(false);
    updateApsSt(true);
    props.setEnableStep(2.2);
  };

  useEffect(() => {
    if (props.isAPSsave) {
      updateApsSt();
      props.setIsSave(false);
    }
  }, [props.isAPSsave]);

  const updateApsSt = async (callOptimizeDepthChoice) => {
    props.set2_2_Loader(true);
    setApsStTableData([]);
    let details = props.planDetails.data;
    let payloadData = [];
    if (props.apsStData?.data?.length) {
      payloadData = updateApsstPayload(
        props.apsStData?.data,
        apsTableInstance,
        clusterCodes,
        props
      );
    }
    if (payloadData?.length) {
      let deltaTY = getClusterUpdatePayload(
        payloadData,
        details.plan_code.toString(),
        props.planLevels,
        props.screenConfiguration
      );
      let L3Payload = getL3UpdatePayload(
        payloadData,
        details.plan_code.toString()
      );
      props.setCallUpdateApsData(false);
      try {
        let clusterUpdateResponse = await props.updateClusterApsStData(
          {
            number_of_weeks: calculateNoOfWeeks(
              details.selling_period_sdate,
              details.selling_period_edate
            ),
            cluster_aps_st_data: deltaTY,
            is_value_changed: props.isValueChanged,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        let L3UpdateResponse = await props.updateL3ApsStData(
          {
            cluster_l3_aps_st_data: [...L3Payload],
            is_value_changed: true,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (
          clusterUpdateResponse.status &&
          L3UpdateResponse.status &&
          callOptimizeDepthChoice
        ) {
          props.setIsValueChanged(false);
          let planData = props.planDetails?.data;
          fetchApsSt(planData, callOptimizeDepthChoice);
          let payload = optimizeDepthChoicePayload(planData, props);
          let optimizeDepthChoiceResponse = await props.optimizeDepthChoice(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name ||
              "assort",
            props.planDetails?.data?.plan_code
          );
          if (optimizeDepthChoiceResponse.status) {
            isCalculateApsSuccess.current = false;
            props.setFromDashboardScreen_2_2(true);
            if (!props.isDepthChannelChanged && !props.isApsChannelChanged) {
              props.showDepthChoiceTable(true);
            }
            props.setCallApsSt(true);
          } else {
            props.set2_2_Loader(false);
          }
        } else if (clusterUpdateResponse.status && L3UpdateResponse.status) {
          props.setIsValueChanged(false);
          let planData = props.planDetails?.data;
          fetchApsSt(planData, callOptimizeDepthChoice);
        } else {
          props.addSnack({
            message: `Something went wrong`,
            options: {
              variant: "error",
            },
          });
          props.set2_2_Loader(false);
        }
      } catch (err) {
        props.addSnack({
          message: `Something went wrong`,
          options: {
            variant: "error",
          },
        });
        props.set2_2_Loader(false);
      }
    }
  };

  const updateApsTableData = (
    _,
    row,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initVal, // New value
    previousValue
  ) => {
    let colId = column.colDef.accessor;
    let colData = row[colId];
    props.setIsValueChanged(true);
    let isValid = true;
    if (
      colId === "max_cc" &&
      parseInt(colData) < parseInt(row.all_door_cc) &&
      coreChoice.current
    ) {
      isValid = false;
      row[colId] = initialValue;
      props.addSnack({
        message: `Max ${styleOrChoice} count cannot be lesser than All door ${styleOrChoice} count`,
        options: {
          variant: "error",
        },
      });
    }
    if (colId === "min_cc" && parseInt(colData) > parseInt(row.max_cc)) {
      isValid = false;
      row[colId] = initialValue;
      props.addSnack({
        message: `Min ${styleOrChoice} count cannot be greater than Max ${styleOrChoice} count`,
        options: {
          variant: "error",
        },
      });
    }
    if (colId === "cc_threshold") {
      row[colId] = initVal;
    }
    if (colId === "min_cc_threshold") {
      row[colId] = initVal;
      if (row.cc_threshold) {
        if (colData >= row.cc_threshold) {
          row[colId] = initialValue;
          isValid = false;
          props.addSnack({
            message:
              "Min CC Constraint should be less than CC Constraint Index",
            options: {
              variant: "error",
            },
          });
        }
      }
      if (colData < 0) {
        isValid = false;
        row[colId] = initialValue;
        props.addSnack({
          message: "Min CC Constraint should be positive",
          options: {
            variant: "error",
          },
        });
      }
    }
    if (colId.includes("reg_wks_")) {
      let data = {
        reg_wks_ty: value,
      };
      isValid = handleRegWksValidation(data, props, props.planDetails);
      if (!isValid) {
        row[colId] = initialValue;
      }
    }
    let tempData = [];
    let totalTabL3row = {};
    if (
      colId.includes("reg_wks_") &&
      colId !== "reg_wks_total_ty" &&
      isValid &&
      row.l3_name !== "Total"
    ) {
      getTotalRegWeeksApsOfRow([row], clusterCodes);
    } else {
      if (row.drop?.trim() === "Total" && colId === "aps_total_ty") {
        totalTabL3row = cloneDeep(row);
        clusterCodes.forEach((code) => {
          totalTabL3row[`old_aps_${code}_ty`] = totalTabL3row[`aps_${code}_ty`];
          totalTabL3row[`aps_${code}_ty`] =
            initialValue && initialValue > 0
              ? (colData / initialValue) * totalTabL3row[`aps_${code}_ty`]
              : colData;
        });
      }
      setApsStTableData([]);
      apsTableInstance.current.api.forEachNode((eachRow) => {
        eachRow = eachRow.data;
        if (eachRow.plan_clu_aps_id === row.plan_clu_aps_id) {
          if (colId === "reg_wks_total_ty" && isValid) {
            clusterCodes.forEach((code) => {
              eachRow[`reg_wks_${code}_ty`] = colData;
            });
          }
          if (colId === "aps_total_ty") {
            clusterCodes.forEach((code) => {
              eachRow[`old_aps_${code}_ty`] = eachRow[`aps_${code}_ty`];
              eachRow[`aps_${code}_ty`] =
                initialValue && initialValue > 0
                  ? (colData / initialValue) * eachRow[`aps_${code}_ty`]
                  : colData;
            });
            totalTabL3row = eachRow;
          }
          if (colId.includes("aps_") && colId !== "aps_total_ty") {
            let num = 0;
            let totalClusterQty = 0;
            clusterCodes.forEach((code) => {
              num = num + eachRow[`aps_${code}_ty`] * eachRow[`qty_${code}_ty`];
              totalClusterQty = totalClusterQty + eachRow[`qty_${code}_ty`];
            });
            eachRow["aps_total_ty"] =
              totalClusterQty > 0 ? num / totalClusterQty : 0;
          }
          if (colId.includes("st_") && colId !== "st_total_ty") {
            let num = 0;
            let totalClusterQty = 0;
            clusterCodes.forEach((code) => {
              num = num + eachRow[`st_${code}_ty`] * eachRow[`qty_${code}_ty`];
              totalClusterQty = totalClusterQty + eachRow[`qty_${code}_ty`];
            });
            eachRow["st_total_ty"] = num / totalClusterQty;
          }
          if (colId === "st_total_ty") {
            if (colData < 0 || colData > 100) {
              props.addSnack({
                message: `ST should be more than 0 and less than 100`,
                options: {
                  variant: "error",
                },
              });
            } else {
              clusterCodes.forEach((code) => {
                eachRow[`st_${code}_ty`] = colData;
              });
            }
          }
        }
        if (
          row.drop?.trim() === "Total" &&
          eachRow.drop !== row.drop &&
          eachRow.l3_name === row.l3_name
        ) {
          if (colId.includes("aps_") && colId !== "aps_total_ty") {
            if (eachRow[colId]) {
              eachRow[colId] = (eachRow[colId] * row[colId]) / initialValue;

              let num = 0;
              let totalClusterQty = 0;
              clusterCodes.forEach((code) => {
                num =
                  num + eachRow[`aps_${code}_ty`] * eachRow[`qty_${code}_ty`];
                totalClusterQty = totalClusterQty + eachRow[`qty_${code}_ty`];
              });
              eachRow["aps_total_ty"] =
                totalClusterQty > 0 ? num / totalClusterQty : 0;
            }
          }
          if (colId === "aps_total_ty") {
            clusterCodes.forEach((code) => {
              eachRow[`aps_${code}_ty`] =
                totalTabL3row[`old_aps_${code}_ty`] &&
                totalTabL3row[`old_aps_${code}_ty`] > 0
                  ? (totalTabL3row[`aps_${code}_ty`] /
                      totalTabL3row[`old_aps_${code}_ty`]) *
                    eachRow[`aps_${code}_ty`]
                  : totalTabL3row[`aps_${code}_ty`];
            });
          }
        }
        if (eachRow.l3_name !== "Total") {
          tempData.push(eachRow);
        }
      });
      if (row.l3_name === "Total") {
        if (colId.includes("aps")) {
          tempData = onFooterTotalApsEdit(
            tempData,
            row,
            initialValue,
            colId,
            clusterCodes,
            droplevelL3
          );
        } else if (colId.includes("st_")) {
          if (initialValue > 0) {
            tempData = onFooterTotalStEdit(
              tempData,
              row,
              initialValue,
              colId,
              clusterCodes
            );
          } else {
            props.addSnack({
              message: `Cluster Pen % is 0, edit the pen% values for the changes to reflect`,
              options: {
                variant: "warning",
              },
            });
          }
        } else if (colId.includes("reg_wks_") && isValid) {
          if (initialValue > 0) {
            tempData = onFooterTotalRegWeekEdit(
              tempData,
              row,
              initialValue,
              colId,
              clusterCodes,
              isValid
            );
          } else {
            props.addSnack({
              message: `Cluster Pen % is 0, edit the pen% values for the changes to reflect`,
              options: {
                variant: "warning",
              },
            });
          }
        }
      }
      if (row.drop?.trim() !== "Total") {
      }
      if (row.drop?.trim() === "Total" && colId === "aps_total_ty") {
        tempData = recalculateApsTotalCol(tempData, clusterCodes);
      }
      if (
        isDropPlan(
          props.planDetails?.data,
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        )
      ) {
        tempData = recalculateTotalTab(tempData);
      }
      setApsStTableData(tempData);
      setTotalFooter(getAPSTotalFooterRow(tempData, clusterCodes, props));
    }
    apsTableInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const getTotalRegWeeksApsOfRow = (data, uniqueClusterList) => {
    //This function returns highest value in that row
    data.forEach((row) => {
      row = getMaxRegWeeks(row, uniqueClusterList);
      let num = 0,
        numLy = 0,
        sumStrCnt = 0;
      let regWksArr = [],
        regWksArrTy = [],
        ccArr = [];
      let totalClusterQty = 0,
        totalClusterQtyLy = 0;
      uniqueClusterList.forEach((code) => {
        num =
          num +
          row[`aps_${code}_ty`] *
            row[`reg_wks_${code}_ty`] *
            (row[`cc_${code}`] || 1) *
            row[`store_cnt_${code}`];
        totalClusterQty =
          totalClusterQty +
          row[`qty_${code}_ty`] * (row[`st_${code}_ty`] / 100);
        numLy =
          numLy +
          row[`aps_${code}_ly`] *
            row[`reg_wks_${code}_ly`] *
            (row[`cc_${code}`] || 1) *
            row[`store_cnt_${code}`];
        totalClusterQtyLy =
          totalClusterQtyLy + row[`qty_${code}_ly`] * row[`st_${code}_ly`];
        sumStrCnt += row[`store_cnt_${code}`];
        regWksArr.push(row[`reg_wks_${code}_ly`]);
        regWksArrTy.push(row[`reg_wks_${code}_ty`]);
        ccArr.push(row[`cc_${code}`]);
      });
      //uncomment while debuging
      // console.log("l3_name:", row.l3_name, row.drop)
      // //row["aps_total_ty"] = totalClusterQty > 0 ? num / totalClusterQty : 0;
      // console.log("totalClusterQty:", totalClusterQty)
      // console.log("totalClusterQtyLy:", totalClusterQtyLy)
      // console.log("ccArr:", ccArr, Math.max(...ccArr))
      // console.log("sumStrCnt:", sumStrCnt)
      // console.log("regWksArrTy:", regWksArrTy, Math.max(...regWksArrTy))
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
      row["total_st_qty"] = totalClusterQtyLy;

      row["total_st_qty"] = totalClusterQtyLy;
      if (isCalculateApsSuccess?.current === true) {
        row["constraint_aps_total_ty"] = row["aps_total_ty"];
      }
    });
    return data;
  };

  const getMaxRegWeeks = (row, uniqueClusterList) => {
    let tempTY = [],
      tempLY = [];
    uniqueClusterList.forEach((cluster) => {
      if (row[`reg_wks_${cluster}_ty`]) {
        tempTY.push(row[`reg_wks_${cluster}_ty`]);
      } else {
        tempTY.push(0);
      }
      if (row[`reg_wks_${cluster}_ly`]) {
        tempLY.push(row[`reg_wks_${cluster}_ly`]);
      } else {
        tempLY.push(0);
      }
    });
    row.reg_wks_total_ty = Math.max(...tempTY);
    row.reg_wks_total_ly = Math.max(...tempLY);
    return row;
  };

  const loadTableInstance = (params) => {
    apsTableInstance.current = params;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let selectedDrop = Object.keys(
        groupBy(
          apsStTableData,
          props.screenConfiguration?.common?.drop_key || "drop"
        )
      )[0];
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter:
            selectedDropData.current || props.selectedDropData || selectedDrop,
        },
      };
      apsTableInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  const onSetAllApply = (data) => {
    let rowNodes = apsTableInstance.current.api.getSelectedNodes();
    rowNodes.forEach((item) => {
      const rowNode = apsTableInstance.current.api.getRowNode(item.id);
      Object.keys(data).forEach((attribute) => {
        if (data[attribute] !== undefined) {
          if (attribute.includes("total_ty")) {
            let col = attribute.split("total_ty")?.[0];
            // Object.keys(item?.data).map((key) => {
            //   if (
            //     key.includes("_ty") &&
            //     key.includes(col) &&
            //     !(
            //       key.includes(`${col}ty`) ||
            //       key.includes(`${col}total_ty`) ||
            //       key.includes("aps")
            //     )
            //   ) {
            //     rowNode.setDataValue(key, data[attribute]);
            //   }
            // });
            if (col.includes("aps")) {
              clusterCodes.forEach((code) => {
                rowNode.setDataValue(
                  `aps_${code}_ty`,
                  item?.data?.aps_total_ty && item?.data?.aps_total_ty > 0
                    ? (data[attribute] / item?.data?.aps_total_ty) *
                        item?.data?.[`aps_${code}_ty`]
                    : data[attribute]
                );
              });
            }
            if (col.includes("reg_wks") || col.includes("st")) {
              clusterCodes.forEach((code) => {
                rowNode.setDataValue(`${col}${code}_ty`, data[attribute]);
              });
            }
          }
          rowNode.setDataValue(attribute, data[attribute]);
        }
      });
    });
    apsTableInstance.current.api.flashCells({ rowNodes });
    apsTableInstance.current.api.deselectAll();
    props.setCheckSetAllValidation(false);
    setShowSetAllPopup(false);
    props.setIsValueChanged(true);
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    let levelsFilter = false;
    Object.keys(props.levelsJson).forEach((level) => {
      if (props.planDetails?.data?.[level]?.length > 1)
        return (levelsFilter = true);
    });
    return isWholesalePlan(props.planDetails?.data) ||
      isChannelMultiple(props.planDetails?.data) ||
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) ||
      levelsFilter
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        apsStTableData,
        formData,
        props.planDetails?.data,
        props.levelsJson,
        props,
        props.selectedDropData || "-"
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, apsStTableData, props.selectedDropData]
  );
  const setAllValidate = () => {
    if (apsTableInstance.current.api.getSelectedNodes().length) {
      setShowSetAllPopup(true);
    } else {
      props.setCheckSetAllValidation(false);
      props.addSnack({
        message: `Please select at least one ${props.columnHeaderJson["l3_name"]}`,
        options: {
          variant: "error",
        },
      });
    }
  };
  const getEditableNothiddenCols = (columns) => {
    let ediatbleCols = [];
    columns.forEach((data) => {
      if (data.sub_headers?.length > 0) {
        ediatbleCols.push(...getEditableNothiddenCols(data.sub_headers));
      } else if (
        !data.is_hidden &&
        data.is_editable &&
        (data.column_name.includes("total_ty") ||
          data.column_name === "max_cc" ||
          data.column_name === "cc_threshold" ||
          data.column_name === "moq" ||
          data.column_name === "min_cc_threshold")
      ) {
        if (
          props.selectedDropData === "Total " &&
          data.column_name.includes("aps_")
        ) {
          ediatbleCols.push(data);
        } else if (props.selectedDropData !== "Total ") {
          ediatbleCols.push(data);
        }
      }
    });
    return ediatbleCols;
  };
  let styleOrChoice =
    props.screenConfiguration?.common.plan_step_names_assort?.["2.2"] ===
    "Depth & Style"
      ? "Style"
      : "choice";
  const getSetAllFields = () => [...getEditableNothiddenCols(apsStColumns)];

  return (
    <>
      {groupedDrops && (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={groupedDrops}
            onChangeTab={props.setSelectedDropData}
            selectedTab={props.selectedDropData}
          />
        </div>
      )}
      {showSetAllPopup &&
        apsStTableData?.length > 0 &&
        !history.location.pathname.includes("view") && (
          <SetallForm
            rowdata={apsStTableData}
            selectedRowIds={apsTableInstance.current.api.getSelectedNodes()}
            onApply={onSetAllApply}
            fields={getSetAllFields()}
            handleModalClose={setShowSetAllPopup}
            handleValidation={(formData, propsData) =>
              handleRegWksValidation(
                formData,
                propsData,
                props.planDetails,
                props.coreChoice
              )
            }
          />
        )}
      {apsStTableData?.length > 0 && apsStColumns?.length > 0 && (
        <div>
          <AgGridTable
            columns={
              isDropPlan(
                props.planDetails?.data,
                `${
                  props.screenConfiguration?.common?.drop_key.includes("drop")
                    ? "drops"
                    : props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              )
                ? props.selectedDropData &&
                  (apsTableColumns[
                    props.selectedDropData?.trim() === "Total"
                      ? "instanceTotal"
                      : "instance" + props.selectedDropData.split(" ")[1]
                  ] ||
                    [])
                : apsStColumns
            }
            rowdata={apsStTableData || []}
            loadTableInstance={loadTableInstance}
            sizeColumnsToFitFlag
            skipAutoSizeColumn
            showSetAll={false}
            onBlur={updateApsTableData}
            selectAllHeaderComponent={true}
            uniqueRowId={"plan_l3_aps_id"}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            handleValidation={(formData, propsData) =>
              handleRegWksValidation(
                formData,
                propsData,
                props.planDetails,
                props.coreChoice
              )
            }
            sideBar={false}
            pagination={false}
            tableId={"aps-st-table"}
            adjustTableHeight={true}
            pinnedBottomRowData={filteredFooter}
            customCellRenderer={(cellProps) =>
              assortAgGridCustomCellRenderer(cellProps, `aps-st-table`)
            }
            // staticColId={true}
          />
          {!history.location.pathname.includes("view") && (
            <div className={classes.rightAlignButtonAssort}>
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                id="optimize-depth-choice"
                onClick={() => {
                  props.set2_2_Loader(true);
                  setTimeout(() => {
                    onUpdateApsSt();
                  }, [100]);
                }}
              >
                Optimize
              </Button>
            </div>
          )}
        </div>
      )}
      {apsStTableData?.length === 0 && (
        <div>
          <AgGridTable
            rowdata={[]}
            columns={apsStColumns || []}
            sideBar={false}
            pagination={false}
            sizeColumnsToFitFlag={true}
            tableId={"aps-st-table"}
            adjustTableHeight={true}
            uniqueRowId={"plan_l3_aps_id"}
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    apsStData: planDepthChoiceServiceActions.apsStDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getApsStData,
      setApsStData,
      set2_2_Loader,
      updateL3ApsStData,
      updateClusterApsStData,
      optimizeApsSt,
      optimizeDepthChoice,
      updatePlanAPI,
      addSnack,
    },
    dispatch
  );
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ApsStComponent));
