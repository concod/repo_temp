import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { withRouter } from "react-router-dom";
import { cloneDeep, groupBy, isEmpty, uniqBy } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import {
  assortAgGridCustomCellRenderer,
  isDropPlan,
  externalFilterLevelsChannelSubChannel,
  getFilteredFooter,
} from "../../../utils-assortsmart/utilityFunctions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import {
  getDepthChoiceData,
  set2_2_Loader,
  updateDepthChoiceData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import AgGridTable from "core/Utils/agGrid";
import {
  getChoiceTotalFooterRow,
  getDepthAndChoiceTableData,
  getTotalChoiceCountOfRow,
  recalculateTotal,
  updateChoiceValues,
  handleUpdateValidation,
  containsQuarterDrop,
  getTotalDepth,
} from "./depth-choice-functions";
import { bindActionCreators } from "redux";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planDepthChoiceServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { groupByCustom } from "core/Utils/formatter";
import moment from "moment";

const DepthOrChoiceComponent = (props) => {
  const [depthrChoiceTableData, setDepthrChoiceTableData] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const [totalFooter, setTotalFooter] = useState([]);
  const [filteredFooter, setFilteredFooter] = useState([]);
  const tableInstance = useRef({});
  const selectedDropData = useRef(props.selectedDropData);
  const classes = useStyles();
  let formData = cloneDeep(props.formData);
  const history = useHistory();
  const isView =
    history.location.pathname.includes("view") || props.isView || false;
  useEffect(() => {
    if (depthrChoiceTableData?.length) {
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
        let drops = groupBy(
          depthrChoiceTableData,
          props.screenConfiguration?.common?.drop_key || "drop"
        );
        if (Object.keys(drops).includes("Total ")) {
          props.setVersion("v2");
        }
        let season = moment(props.planDetails?.data.selling_period_edate).diff(
          moment(props.planDetails?.data.selling_period_sdate),
          "months"
        );
        if (season && season <= 3) {
          Object.keys(drops).map((key) => {
            if (key.includes("QTR")) {
              delete drops[key];
            }
            return;
          });
        }
        setGroupedDrops(drops);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depthrChoiceTableData]);

  useEffect(() => {
    setDepthrChoiceTableData([]);
    setTableData([]);
    generateTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.depthChoiceData]);

  useEffect(() => {
    selectedDropData.current = props.selectedDropData;
  }, [props.selectedDropData]);

  useEffect(() => {
    if (
      props.selectedDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) &&
      tableInstance?.current?.api
    ) {
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      tableInstance.current.api.setFilterModel(hardcodedFilter);
      return () => {};
    }
    selectedDropData.current = props.selectedDropData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData, tableInstance]);

  useEffect(() => {
    if (props.selectedDropData && tableData?.length) {
      // View only for Total Drop data
      props.columns.forEach((item) => {
        if (item?.sub_headers?.length) {
          item.sub_headers.map((sub_col) => {
            if (sub_col.column_name.includes("_ty")) {
              if (props.depthOrChoice === "depth") {
                sub_col.is_editable =
                  props.selectedDropData.trim() === "Total" ||
                  props.selectedDropData.includes("QTR") ||
                  isView
                    ? false
                    : true;
              } else {
                sub_col.is_editable =
                  props.selectedDropData.includes("QTR") || isView
                    ? false
                    : true;
              }
            }
          });
        }
      });
      let cols = agGridColumnFormatter(
        props.columns,
        props.columnHeaderJson,
        null,
        null,
        null,
        isView
      );
      cols.forEach((col) => {
        if (
          col.accessor === props.screenConfiguration?.common?.drop_key ||
          "drop"
        ) {
          col.floatingFilter = true;
          col.filter = "agTextColumnFilter";
          col.filterParams = {
            filterOptions: ["equals"],
            debounceMs: 1500,
          };
          col.floatingFilterComponentParams = { suppressFilterButton: true };
        }
      });
      props.setColumns(cols);
      // if (props.depthOrChoice === "choice") {
      if (
        props.selectedDropData.trim() === "Total" ||
        props.selectedDropData.includes("QTR")
      ) {
        setTableData([]);
        let totalTabL3 = {};
        let totalQtrL3 = {};
        let dropBasedArray = [];
        tableData.forEach((obj) => {
          if (obj.drop.trim() !== "Total") {
            dropBasedArray.push(obj);
          } else if (obj.drop.trim() === "Total") {
            totalTabL3[obj.l3_name] = obj;
          } else if (obj.drop.includes("QTR")) {
            totalQtrL3[obj.l3_name] = obj;
          }
        });
        let groupedArray = groupByCustom({
          Group: tableData,
          By: ["l3_name"],
        });
        let totalCalculatedDrop = [];
        let drops = Object.keys(groupedDrops);
        groupedArray.forEach((groupedData) => {
          let totalDropObj = {};
          let totalStrCCObj = {};
          let totalQuarterObj = {};
          let totalObj = {};
          props.uniqueClusterList.forEach((list) => {
            totalDropObj[list + "_ty"] = 0;
            totalDropObj[list + " productivity_ty"] = 0;
            totalStrCCObj[list + "StrCC_ty"] = 0;
            totalStrCCObj[list + "_total_choice_count"] = 0;
            totalDropObj["total_choice_count_ly"] = 0;
            totalDropObj["total_choice_count_ty"] = 0;
            totalQuarterObj[list + "_ty"] = 0;
          });
          groupedData.forEach((data) => {
            if (data.drop.trim() !== "Total" && !data.drop.includes("QTR")) {
              props.uniqueClusterList.forEach((list) => {
                if (props.depthOrChoice === "depth") {
                  totalDropObj[list + "_ty"] =
                    (totalDropObj[list + "_ty"] || 0) +
                    data[list + "_ty"] *
                      data[list + "_choice_ty"] *
                      data["store_cnt_" + list];
                  totalDropObj[list + " productivity_ty"] +=
                    data[list + " productivity_ty"] * data[list + "_choice_ty"];
                  totalStrCCObj[list + "_total_choice_count"] +=
                    data[list + "_choice_ty"];
                  totalStrCCObj[list + "StrCC_ty"] +=
                    data[list + "_choice_ty"] * data["store_cnt_" + list];
                } else {
                  totalDropObj[list + "_ty"] =
                    (totalDropObj[list + "_ty"] || 0) + data[list + "_ty"];
                }
              });
              totalDropObj["total_choice_count_ly"] =
                totalDropObj["total_choice_count_ly"] +
                data["total_choice_count_ly"];
              totalDropObj["total_choice_count_ty"] =
                totalDropObj["total_choice_count_ty"] +
                data["total_choice_count_ty"];
            }
            if (data.drop.trim() == "Total") {
              totalObj = { ...data };
            }
          });
          if (props.depthOrChoice === "depth") {
            props.uniqueClusterList.forEach((list) => {
              //calculating total productivity from total depth
              totalDropObj[list + "_ty"] =
                totalStrCCObj[list + "StrCC_ty"] > 0
                  ? totalDropObj[list + "_ty"] /
                    totalStrCCObj[list + "StrCC_ty"]
                  : 0;
              totalDropObj[list + " productivity_ty"] =
                totalStrCCObj[list + "_total_choice_count"] > 0
                  ? totalDropObj[list + " productivity_ty"] /
                    totalStrCCObj[list + "_total_choice_count"]
                  : 0;
              // (totalDropObj[list + "_ty"] || 0) *
              // totalObj[list + "_st_ty"] *
              // //totalObj[list + "_avg_wk_cnt_ty"] *
              // totalObj["store_cnt_" + list] *
              // totalObj[list + "_aur_ty"];
            });
          }
          totalDropObj["old_total_choice_count_ly"] =
            totalDropObj["total_choice_count_ly"];
          totalDropObj["old_total_choice_count_ty"] =
            totalDropObj["total_choice_count_ty"];
          totalCalculatedDrop.push({
            ...totalObj,
            ...totalDropObj,
            drop: "Total ",
            l3_name: groupedData?.[0]?.l3_name,
            uniqueID: "Total_" + groupedData?.[0]?.l3_name,
          });
          if (
            containsQuarterDrop(drops) &&
            props.selectedDropData.includes("QTR")
          ) {
            dropBasedArray = tableData.filter(
              (obj) => obj.drop.trim() !== "Total" && !obj.drop.includes("QTR")
            );
            let quarterGroupedArray = groupByCustom({
              Group: groupedData,
              By: ["quarter"],
            });
            quarterGroupedArray.forEach((quarterGroupedData) => {
              if (quarterGroupedData?.[0]?.quarter) {
                props.uniqueClusterList.forEach((list) => {
                  totalQuarterObj[list + "_ty"] = 0;
                  totalQuarterObj[list + "_ly"] = 0;
                  totalQuarterObj["total_choice_count_ly"] = 0;
                  totalQuarterObj["total_choice_count_ty"] = 0;
                });
                quarterGroupedData.forEach((data) => {
                  if (
                    data.drop.trim() !== "Total" &&
                    !data.drop.includes("QTR")
                  ) {
                    props.uniqueClusterList.forEach((list) => {
                      totalQuarterObj[list + "_ty"] =
                        (totalQuarterObj[list + "_ty"] || 0) +
                        data[list + "_ty"];
                      totalQuarterObj[list + "_ly"] =
                        (totalQuarterObj[list + "_ly"] || 0) +
                        data[list + "_ly"];
                    });
                    totalQuarterObj["total_choice_count_ly"] =
                      totalQuarterObj["total_choice_count_ly"] +
                      data["total_choice_count_ly"];
                    totalQuarterObj["total_choice_count_ty"] =
                      totalQuarterObj["total_choice_count_ty"] +
                      data["total_choice_count_ty"];
                  }
                  if (data.drop.trim() === props.selectedDropData.trim()) {
                    totalQuarterObj = { ...data, ...totalQuarterObj };
                  }
                });
                totalCalculatedDrop.push({
                  ...totalQuarterObj,
                  drop: `QTR ${quarterGroupedData?.[0]?.quarter} `,
                  l3_name: quarterGroupedData?.[0]?.l3_name,
                  uniqueID:
                    "QTR_" +
                    quarterGroupedData?.[0]?.quarter +
                    quarterGroupedData?.[0]?.l3_name,
                });
              }
            });
          }
        });
        dropBasedArray.push(...totalCalculatedDrop);
        dropBasedArray = getTotalDepth(dropBasedArray, props.uniqueClusterList);
        setTableData(dropBasedArray);
        setTotalFooter(
          getChoiceTotalFooterRow(
            dropBasedArray,
            props.uniqueClusterList,
            props
          )
        );
        if (tableInstance.current.api) {
          tableInstance.current.api.refreshCells({
            update: dropBasedArray,
            force: true,
            suppressFlash: false,
          });
        }
      }
      if (tableInstance?.current?.api) {
        tableInstance?.current?.api.onFilterChanged();
      }
      // }
    }
  }, [props.selectedDropData]);

  useEffect(() => {
    formData = props.formData;
    if (tableInstance?.current?.api) {
      tableInstance.current.api.onFilterChanged();
    }
  }, [props.formData, tableInstance, props.selectedDropData]);

  const generateTableData = () => {
    setDepthrChoiceTableData([]);
    setTableData([]);

    let tempDepthChoiceTableData =
      props.depthOrChoice === "choice"
        ? cloneDeep(props.depthChoiceData?.choice_data)
        : cloneDeep(props.depthChoiceData?.depth_data);

    if (tempDepthChoiceTableData?.length) {
      const uniqClusters = uniqBy(tempDepthChoiceTableData, "cluster_code");
      setClusterData(uniqClusters);
      let uniqueClusterData = tempDepthChoiceTableData
        .map((p) => p.cluster_display_name)
        .filter(
          (cluster_display_name, index, arr) =>
            arr.indexOf(cluster_display_name) === index
        )
        .sort();
      uniqueClusterData = uniqueClusterData?.map((data) => data?.toLowerCase());
      props.setUniqueClusterList(uniqueClusterData);
      let budgetData = getDepthAndChoiceTableData(
        tempDepthChoiceTableData,
        props
      );
      if (props.depthOrChoice === "choice") {
        getTotalChoiceCountOfRow(budgetData, uniqueClusterData, true);
        props.setVersion(null);
        setGroupedDrops(null);
        setDepthrChoiceTableData(budgetData);
        if (budgetData?.[0]?.carryover_flag) {
          budgetData = recalculateTotal(
            budgetData,
            "total_style_count_ty",
            props.screenConfiguration
          );
          budgetData = recalculateTotal(
            budgetData,
            "total_choice_count_ty",
            props.screenConfiguration
          );
        }
        setTotalFooter(
          getChoiceTotalFooterRow(budgetData, uniqueClusterData, props)
        );
        setTableData(budgetData);
      } else {
        setTotalFooter(
          getChoiceTotalFooterRow(budgetData, uniqueClusterData, props)
        );
        setTableData(budgetData);
        props.setVersion(null);
        setGroupedDrops(null);
        setDepthrChoiceTableData(budgetData);
      }
    }
  };

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

  const updateDepthChoiceTable = (
    _,
    rowData,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    uniqueClusterList
  ) => {
    let changedIds = props.changedMasterIds;
    let columnId = column.colDef.accessor;
    let row = rowData;
    let newValue = initValue;
    let oldValue = initialValue;
    let keysplit = columnId.split("_ty");
    let invalidIds = props.invalidChoiceIds;
    let index = 0;
    let changedL3TotalDrop = {};
    props.setIsDepthChoiceChanged(true);
    if (columnId.includes("ty")) {
      handleUpdateValidation(columnId, rowData, value);
    }
    uniqueClusterList.forEach((_data, ind) => {
      if (_data?.toLowerCase() === keysplit[0]) {
        index = ind;
      }
    });
    if (
      row?.[`plan_cls_depth_id${index + 1}`] &&
      !changedIds.includes(row?.[`plan_cls_depth_id${index + 1}`])
    ) {
      changedIds.push(row?.[`plan_cls_depth_id${index + 1}`]);
    }
    let isValidUpdate = true;
    if (
      columnId.includes("_ty") &&
      props.depthOrChoice === "choice" &&
      columnId !== "total_style_count_ty"
    ) {
      //IN 2-2 CC table whenever we change cluster column ty value it shouldn't exceed threshold and max_cc
      //Threshold will be calculated from ly value of same cluster in order to get the column id of ly we are replaing "t" with "l"
      const choiceKey = columnId.replace("ty", "ly");
      const threshold =
        row.cc_threshold &&
        Math.round(parseInt(row[choiceKey]) * row.cc_threshold);
      const cc_min_limit = Math.round(row[`cc_min_limit${index + 1}`]);
      let max_cc;
      if (row.max_cc && threshold) {
        max_cc =
          parseInt(row.max_cc) < threshold ? parseInt(row.max_cc) : threshold;
      } else if (row.max_cc) {
        max_cc = parseInt(row.max_cc);
      } else {
        max_cc = threshold;
      }
      if (max_cc && value > max_cc) {
        isValidUpdate = false;
        const msg = "Choice count value cannot be more than ";
        props.addSnack({
          message: msg + `${max_cc}`,
          options: {
            variant: "error",
          },
        });
        props.enableRecalculateBtn(true);
        if (!invalidIds.includes(row.uniqueID + columnId)) {
          invalidIds.push(row.uniqueID + columnId);
        }
      } else if (cc_min_limit && value < cc_min_limit) {
        isValidUpdate = false;
        const msg = "Choice count value cannot be less than ";
        props.addSnack({
          message: msg + `${cc_min_limit}`,
          options: {
            variant: "error",
          },
        });
        props.enableRecalculateBtn(true);
        if (!invalidIds.includes(row.uniqueID + columnId)) {
          invalidIds.push(row.uniqueID + columnId);
        }
      }
    }
    if (isValidUpdate) {
      row[columnId] = value;
    }
    if (columnId.includes("_ty")) {
      let tempData = [];
      tableInstance.current.api.forEachNode((node) => {
        if (node.data.l3_name !== "Total") {
          if (
            props.depthOrChoice === "depth" &&
            node.data.uniqueID === row.uniqueID
          ) {
            let keySplit = columnId.split("_ty");
            node.data[`${keySplit[0]} productivity_ty`] =
              newValue *
              node.data[`${keySplit[0]}_st_ty`] *
              node.data[`${keySplit[0]}_aur_ty`] *
              //node.data[`${keySplit[0]}_avg_wk_cnt_ty`] *
              node.data[`store_cnt_${keySplit[0]}`];
            node.data[`${keySplit[0]}_%var`] =
              (node.data[`${keySplit[0]}_ty`] -
                node.data[`${keySplit[0]}_ly`]) /
              node.data[`${keySplit[0]}_ly`];
            node.data[`${keySplit[0]} productivity_%var`] =
              (node.data[`${keySplit[0]} productivity_ty`] -
                node.data[`${keySplit[0]} productivity_ly`]) /
              node.data[`${keySplit[0]} productivity_ly`];
          }
          if (node.data.uniqueID === row.uniqueID) {
            node.data["old_" + columnId] = node.data[columnId];
          }
          //on total tab if you edit a cluster value for a l3 it will split across drops for that l3 for that cluster or
          // on total tab if you edit a cluster value at footer it will split across drops footer for that cluster
          if (
            row?.drop?.trim() === "Total" &&
            node.data.drop.trim() !== "Total" &&
            !node.data.drop.includes("QTR") &&
            node.data.l3_name === row.l3_name
          ) {
            let keySplit = columnId.split("_ty");
            node.data[columnId] =
              node.data["old_" + columnId] * (newValue / oldValue);
            node.data["old_" + columnId] = node.data[columnId];
            //Formula- Depth * ST% * Reg Weeks * Str Cnt * AUR
            node.data[`${keySplit[0]} productivity_ty`] =
              node.data[columnId] *
              node.data[`${keySplit[0]}_st_ty`] *
              node.data[`${keySplit[0]}_aur_ty`] *
              //node.data[`${keySplit[0]}_avg_wk_cnt_ty`] *
              node.data[`store_cnt_${keySplit[0]}`];
            node.data[`${keySplit[0]}_%var`] =
              (node.data[`${keySplit[0]}_ty`] -
                node.data[`${keySplit[0]}_ly`]) /
              node.data[`${keySplit[0]}_ly`];
            node.data[`${keySplit[0]} productivity_%var`] =
              (node.data[`${keySplit[0]} productivity_ty`] -
                node.data[`${keySplit[0]} productivity_ly`]) /
              node.data[`${keySplit[0]} productivity_ly`];
            if (
              !changedIds.includes(node.data?.[`plan_cls_depth_id${index + 1}`])
            ) {
              changedIds.push(node.data?.[`plan_cls_depth_id${index + 1}`]);
            }
          }
          //on any tab (drop/total) if you edit footer. footer value of that cluster split across l3.
          if (row.l3_name === "Total" && node.data.drop === row?.drop) {
            const newChoiceKey = columnId.replace("ty", "ly");
            let keySplit = columnId.split("_ty");
            let newClustValue =
              node.data["old_" + columnId] * (newValue / oldValue);
            let newthreshold =
              node.data.cc_threshold &&
              Math.round(
                parseInt(node.data[newChoiceKey]) * node.data.cc_threshold
              );
            let newcc_min_limit = Math.round(
              node.data[`cc_min_limit${index + 1}`]
            );
            let newMax_cc;
            if (node.data.max_cc && newthreshold) {
              newMax_cc =
                parseInt(node.data.max_cc) < newthreshold
                  ? parseInt(node.data.max_cc)
                  : newthreshold;
            } else if (node.data.max_cc) {
              newMax_cc = parseInt(row.max_cc);
            } else {
              newMax_cc = newthreshold;
            }
            if (newMax_cc && newClustValue > newMax_cc) {
              isValidUpdate = false;
              const msg = `${node.data.l3_name} Choice count value cannot be more than `;
              props.addSnack({
                message: msg + `${newMax_cc}`,
                options: {
                  variant: "error",
                },
              });
              props.enableRecalculateBtn(true);
              if (!invalidIds.includes(row.uniqueID + columnId)) {
                invalidIds.push(row.uniqueID + columnId);
              }
            } else if (newcc_min_limit && newClustValue < newcc_min_limit) {
              isValidUpdate = false;
              const msg = `${node.data.l3_name} Choice count value cannot be less than `;
              props.addSnack({
                message: msg + `${newcc_min_limit}`,
                options: {
                  variant: "error",
                },
              });
              props.enableRecalculateBtn(true);
              if (!invalidIds.includes(row.uniqueID + columnId)) {
                invalidIds.push(row.uniqueID + columnId);
              }
            }
            if (isValidUpdate) {
              node.data[columnId] = newClustValue;

              node.data[`${keySplit[0]} productivity_ty`] =
                node.data[columnId] *
                node.data[`${keySplit[0]}_st_ty`] *
                node.data[`${keySplit[0]}_aur_ty`] *
                //node.data[`${keySplit[0]}_avg_wk_cnt_ty`] *
                node.data[`store_cnt_${keySplit[0]}`];
              node.data[`${keySplit[0]}_%var`] =
                (node.data[`${keySplit[0]}_ty`] -
                  node.data[`${keySplit[0]}_ly`]) /
                node.data[`${keySplit[0]}_ly`];
              node.data[`${keySplit[0]} productivity_%var`] =
                (node.data[`${keySplit[0]} productivity_ty`] -
                  node.data[`${keySplit[0]} productivity_ly`]) /
                node.data[`${keySplit[0]} productivity_ly`];
              if (!index) {
                uniqueClusterList.forEach((_data, ind) => {
                  if (
                    node.data?.[
                      `cluster_display_name${ind + 1}`
                    ]?.toLowerCase() === keysplit[0]
                  ) {
                    index = ind;
                  }
                });
              }
              if (
                !changedIds.includes(
                  node.data?.[`plan_cls_depth_id${index + 1}`]
                )
              ) {
                changedIds.push(node.data?.[`plan_cls_depth_id${index + 1}`]);
              }
              // if the tab is total and footer got edited footer will split across l3 and those l3 rows were pushed to parent array
              if (row?.drop?.trim() === "Total") {
                changedL3TotalDrop[node.data?.l3_name] = cloneDeep(node.data);
              }
              node.data["old_" + columnId] = node.data[columnId];
            } else {
              node.data[columnId] = newClustValue;
              node.data["old_" + columnId] = node.data[columnId];
            }
          }
          if (row?.drop?.trim() === "Total" && row.l3_name === "Total") {
            if (columnId.includes("total_choice_count_ty")) {
              uniqueClusterList.forEach((_data, ind) => {
                if (
                  !changedIds.includes(
                    node.data?.[`plan_cls_depth_id${ind + 1}`]
                  )
                ) {
                  changedIds.push(node.data?.[`plan_cls_depth_id${ind + 1}`]);
                }
              });
            } else {
              if (
                !changedIds.includes(
                  node.data?.[`plan_cls_depth_id${index + 1}`]
                )
              ) {
                changedIds.push(node.data?.[`plan_cls_depth_id${index + 1}`]);
              }
            }
          } else {
            if (columnId.includes("total_choice_count_ty")) {
              uniqueClusterList.forEach((_data, ind) => {
                if (
                  !changedIds.includes(
                    node.data?.[`plan_cls_depth_id${ind + 1}`]
                  )
                ) {
                  changedIds.push(node.data?.[`plan_cls_depth_id${ind + 1}`]);
                }
              });
            }
          }
          if (
            row?.drop.includes("Drop") &&
            (row?.drop === node.data.drop ||
              node.data.drop?.trim() === "Total" ||
              node.data.drop.includes("QTR")) &&
            row.l3_name === node.data.l3_name
          ) {
            if (columnId.includes("total_choice_count_ty")) {
              uniqueClusterList.forEach((_data, ind) => {
                if (
                  !changedIds.includes(
                    node.data?.[`plan_cls_depth_id${ind + 1}`]
                  )
                ) {
                  changedIds.push(node.data?.[`plan_cls_depth_id${ind + 1}`]);
                }
              });
            } else if (
              !changedIds.includes(node.data?.[`plan_cls_depth_id${index + 1}`])
            ) {
              changedIds.push(node.data?.[`plan_cls_depth_id${index + 1}`]);
            }
          }
          //removing footer column since it will be recalculated below
          tempData.push(node.data);
        }
      });
      tableInstance.current.api.forEachNode((node) => {
        //on total tab if we edit footer and footer has now splited across l3 and stored in parent array.
        // now this l3 level updated cluster value has to split across the drop
        if (
          node?.data?.drop?.trim() !== "Total" &&
          row?.drop?.trim() === "Total" &&
          row.l3_name === "Total" &&
          !node.data.drop.includes("QTR") &&
          node.data?.l3_name !== "Total"
        ) {
          let parentRow = changedL3TotalDrop[node.data?.l3_name];
          let keySplit = columnId.split("_ty");
          node.data[columnId] =
            node.data["old_" + columnId] *
            (parentRow[columnId] / parentRow["old_" + columnId]);
          node.data["old_" + columnId] = node.data[columnId];
          if (
            !changedIds.includes(node.data?.[`plan_cls_depth_id${index + 1}`])
          ) {
            changedIds.push(node.data?.[`plan_cls_depth_id${index + 1}`]);
          }
          node.data[`${keySplit[0]} productivity_ty`] =
            node.data[columnId] *
            node.data[`${keySplit[0]}_st_ty`] *
            node.data[`${keySplit[0]}_aur_ty`] *
            //node.data[`${keySplit[0]}_avg_wk_cnt_ty`] *
            node.data[`store_cnt_${keySplit[0]}`];
          node.data[`${keySplit[0]}_%var`] =
            (node.data[`${keySplit[0]}_ty`] - node.data[`${keySplit[0]}_ly`]) /
            node.data[`${keySplit[0]}_ly`];
          node.data[`${keySplit[0]} productivity_%var`] =
            (node.data[`${keySplit[0]} productivity_ty`] -
              node.data[`${keySplit[0]} productivity_ly`]) /
            node.data[`${keySplit[0]} productivity_ly`];
        }
        if (
          row.l3_name === "Total" &&
          columnId.includes("total_choice_count_ty")
        ) {
          tempData = updateChoiceValues(
            columnId,
            node.data,
            value,
            initialValue,
            tempData,
            uniqueClusterList,
            changedIds,
            setTotalFooter,
            optimizationLevels,
            props,
            index
          );
        }
      });
      setTableData([]);
      if (row.carryover_flag === "New") {
        tempData = recalculateTotal(
          tempData,
          columnId,
          props.screenConfiguration
        );
      }
      props.handleChangedMasterIds(changedIds);
      if (props.depthOrChoice === "choice") {
        tempData = updateChoiceValues(
          columnId,
          row,
          value,
          initialValue,
          tempData,
          uniqueClusterList,
          changedIds,
          setTotalFooter,
          optimizationLevels,
          props,
          index
        );
        setTableData(tempData);
        setTotalFooter(
          getChoiceTotalFooterRow(tempData, uniqueClusterList, props)
        );
      } else {
        tempData = getTotalDepth(tempData, uniqueClusterList);
        setTotalFooter(
          getChoiceTotalFooterRow(tempData, uniqueClusterList, props)
        );
        setTableData(tempData);
      }
      tableInstance.current.api.refreshCells({
        update: tempData,
        force: true,
        suppressFlash: false,
      });
      setTableData(tempData);
    }
    if (isValidUpdate) {
      const index = invalidIds.indexOf(row.uniqueID + columnId);
      if (index > -1) {
        // only splice array when item is found
        invalidIds.splice(index, 1); // 2nd parameter means remove one item only
      }
      if (invalidIds.length === 0) {
        props.enableRecalculateBtn(false);
      }
    }
    props.setInvalidChoiceIds(invalidIds);
    tableInstance.current.api.onFilterChanged();
  };

  useEffect(() => {
    if (tableData?.length && !props.enableRecalculateDepthChoice) {
      props.handleNextDepthChoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData, JSON.stringify(totalFooter)]);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
    props.setRTinstance(tableInstance);
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
      let selectedDrop = props.selectedDropData
        ? props.selectedDropData
        : Object.keys(
            groupBy(
              tableData,
              props.screenConfiguration?.common?.drop_key || "drop"
            )
          )[0];
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: selectedDropData.current || selectedDrop,
        },
      };
      tableInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    let levelsFilter = false;
    Object.keys(props.levelsJson).forEach((level) => {
      if (props.planDetails?.data?.[level]?.length > 1)
        return (levelsFilter = true);
    });
    return levelsFilter ||
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails?.data]);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel, levels changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        tableData,
        formData,
        props.planDetails?.data,
        props.levelsJson,
        props,
        props.selectedDropData,
        true
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, tableData, props.selectedDropData]
  );

  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  const getSubrowPath = useMemo(() => {
    return (data) => {
      return data.hierarchy;
    };
  }, []);

  const autoGroupColumnDef = {
    headerName: props.columnHeaderJson["l3_name"],
    hide: true,
    cellRendererParams: {
      suppressCount: true,
    },
    pinned: "left",
    width: 200,
    type: "attribute",
    valueGetter: (props) =>
      props?.data?.hierarchy?.length > 1
        ? props?.data?.hierarchy?.[1]
        : props?.data?.l3_name,
  };

  return (
    <>
      {groupedDrops && (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={groupedDrops}
            onChangeTab={props.setSelectedDropData}
            selectedTab={props.selectedDropData}
            hideQtr={props.depthOrChoice === "depth" ? true : false}
          />
        </div>
      )}
      {props.columns?.length > 0 && tableData?.length > 0 && (
        <div className={clusterData.length <= 3 ? classes.depthTableWidth : ""}>
          <AgGridTable
            columns={props.columns || []}
            rowdata={tableData || []}
            loadTableInstance={loadTableInstance}
            onBlur={(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData,
              initValue
            ) =>
              updateDepthChoiceTable(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData,
                initValue,
                props.uniqueClusterList
              )
            }
            customCellRenderer={(cellProps) =>
              props.depthOrChoice === "choice"
                ? assortAgGridCustomCellRenderer(cellProps, `choice-table`)
                : assortAgGridCustomCellRenderer(cellProps, `depth-table`)
            }
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            uniqueRowId={"uniqueID"}
            sideBar={false}
            pagination={false}
            tableId={`${props.depthOrChoice}-table`}
            sizeColumnsToFitFlag={true}
            treeData={optimizationLevels.includes("carryover") ? true : false}
            getDataPath={getSubrowPath}
            autoGroupColumnDef={autoGroupColumnDef}
            adjustTableHeight={true}
            pinnedBottomRowData={filteredFooter}
            staticColId={true}
          />
        </div>
      )}
      {tableData?.length === 0 && (
        <div className={clusterData.length <= 3 ? classes.depthTableWidth : ""}>
          <AgGridTable
            columns={props.columns || []}
            rowdata={tableData || []}
            uniqueRowId={"uniqueID"}
            sideBar={false}
            pagination={false}
            tableId={`${props.depthOrChoice}-table`}
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    depthChoiceData: planDepthChoiceServiceActions.depthChoiceDataSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getDepthChoiceData,
      set2_2_Loader,
      updateDepthChoiceData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DepthOrChoiceComponent));
