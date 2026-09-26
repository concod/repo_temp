import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { cloneDeep, groupBy } from "lodash";
import {
  isWholesalePlan,
  isDropPlan,
  assortAgGridCustomCellRenderer,
  isChannelMultiple,
  externalFilterLevelTwoSubchannel,
  AgGridAssortnonEditableCell,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import {
  setClusterOptData,
  setClusterGraphdata,
  getClusterOptData,
  set2_1_Loader,
  updateClusterOptData,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { onBlurAgGridCluster, getRoundedTotal } from "./plan-initial-functions";
import BudgetClusterChartComponent from "./budget-cluster-chart-component";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import InfoComponent from "modules/assortsmart/pages-assortsmart/Plan/Plan-Initial/IP-details-component";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useHistory } from "react-router";
import { addSnack } from "core/actions/snackbarActions";
import {
  autoGroupColumnDef,
  calculateSubRows,
  formatTableDataGrouping,
  getColForEditCluster,
  getColForEditTotal,
  getTotalFooterRow,
  lockCellCustomConditionFn,
  lockCellApi,
} from "./budget-cluster-functions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { bindActionCreators } from "redux";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { makeStyles } from "@mui/styles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const useClusterStyle = makeStyles((theme) => ({
  tableCell: {
    "& .ag-cell": {
      justifyContent: "left !important",
      alignItems: "left !important",
    },
    "& .show-cell": {
      justifyContent: "center !important",
      alignItems: "center !important",
    },
  },
}));

const BudgetClusterComponent = (props) => {
  const [clusterColumns, setClusterColumns] = useState([]);
  const [level3AllData, setLevel3AllData] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [
    budgetClusterSelectedDropTableData,
    setBudgetClusterSelectedDropTableData,
  ] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const [showError, setShowError] = useState(false);
  const [totalFooter, setTotalFooter] = useState([]);
  const firstTimeRender = useRef(true);
  const classes = useStyles();
  const clusterClasses = useClusterStyle();
  const budgetClusterFilteredData = props.AGInstance?.current?.api
    ?.getModel()
    ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);
  const groupedDropsRef = useRef(null);

  const history = useHistory();
  const isView =
    history.location.pathname.includes("view") || props.isView || false;

  useEffect(() => {
    if (
      props.budgetClusterTableData?.length &&
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
        props.budgetClusterTableData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      groupedDropsRef.current = drops;
      setGroupedDrops(drops);
      if (!props.selectedDropData) {
        let tab = Object.keys(drops);
        props.setSelectedDropData(tab[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.budgetClusterTableData]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (props.planDetails?.data) {
        props.set2_1_Loader(true);
        if (isWholesalePlan(props.planDetails?.data)) {
          props.setTogglePen("cluster");
        }
        if (
          //if the plan has multiple sub channel and default value is also present or it has only one sub channel or no sub channel
          ((props.selectedSubChannel?.value &&
            props.planDetails?.data?.sub_channel?.length > 1) ||
            props.planDetails?.data?.sub_channel?.length <= 1 ||
            !props.planDetails?.data?.sub_channel) &&
          //if the plan has multiple l2 and default l2 is also present or it has only one l2
          ((props.levelTwoSelected?.value &&
            props.planDetails?.data?.l2_name?.length > 1) ||
            props.planDetails?.data?.l2_name?.length <= 1 ||
            !props.planDetails?.data?.l2_name) &&
          //if the plan has multiple l1 and default l1 is also present or it has only one l1
          ((props.levelOneSelected?.value &&
            props.planDetails?.data?.l1_name?.length > 1) ||
            props.planDetails?.data?.l1_name?.length <= 1) &&
          ((props.selectedChannel?.value &&
            props.planDetails?.data?.channel?.length > 1) ||
            props.planDetails?.data?.channel?.length <= 1 ||
            !props.planDetails?.data?.channel)
        ) {
          if (
            budgetClusterSelectedDropTableData?.length &&
            props.filterChanged &&
            !firstTimeRender.current
          ) {
            props.set2_1_Loader(true);
            if (props.invalidL3Clusters?.length > 0) {
              // props.addSnack({
              //   message: `Penetration exceeding/less than 100% for ${props.invalidL3Clusters.join(
              //     ","
              //   )}`,
              //   options: {
              //     variant: "warning",
              //   },
              // });
            }
            let isUpdate = false;
            if (!isView) {
              isUpdate = await props.updateClusterOptData(
                {
                  cluster_plan_data: props.clusterData.cluster_plan_data,
                  is_update_plan_step: false,
                  plan_sub_step: isDropPlan(
                    props.planDetails?.data,
                    `${
                      props.screenConfiguration?.common?.drop_key.includes(
                        "drop"
                      )
                        ? "drops"
                        : props.screenConfiguration?.common?.drop_key || "drops"
                    }_count`
                  )
                    ? "review_drop"
                    : "aps_st_table",
                  is_value_changed: props.isClusterChanged,
                },
                props.screenConfiguration?.common?.endpoint_project_name ||
                  "assort",
                props.planDetails?.data?.plan_code
              );
              props.setIsClusterChanged(false);
              props.setFilterChanged(false);
            }
            if (isUpdate || isView) {
              props.setClusterTableData([]);
              setBudgetClusterSelectedDropTableData([]);
              setGroupedDrops(null);
              props.setSelectedDropData(null);
              fetchData();
            }
          } else {
            props.setClusterTableData([]);
            setBudgetClusterSelectedDropTableData([]);
            setGroupedDrops(null);
            props.setSelectedDropData(null);
            fetchData();
            firstTimeRender.current = false;
          }
        }
      }
    };
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.planDetails?.data,
    props.selectedSubChannel?.value,
    props.levelTwoSelected?.value,
    props.levelOneSelected?.value,
    props.filterChanged,
  ]);

  useEffect(() => {
    if (props.clusterOptData?.length) {
      props.setUniqueClusterList([]);
      props.setClusterTableData([]);
      props.setBudgetClusterTableData([]);
      setBudgetClusterSelectedDropTableData([]);
      setGroupedDrops(null);
      props.setSelectedDropData(null);
      let budgetData = [],
        tempDeptData = calculateSubRows(cloneDeep(props.clusterOptData));
      let uniqueClusterData = tempDeptData
        .map((p) => p.cluster_display_name)
        .filter(
          (cluster_display_name, index, arr) =>
            arr.indexOf(cluster_display_name) === index
        )
        .sort();

      let groupByProperties = [
        "l1_name",
        props.screenConfiguration?.common?.final_level || "l3_name",
      ];
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
        groupByProperties = [
          "l1_name",
          props.screenConfiguration?.common?.drop_key || "drop",
          props.screenConfiguration?.common?.final_level || "l3_name",
        ];
      }
      let groupResult = groupByCustom({
        Group: tempDeptData,
        By: groupByProperties,
      });

      let carryoverGroup = [];
      groupResult.forEach((item) => {
        let tempGroup = groupByCustom({
          Group: item,
          By: ["carryover_flag"],
        });
        carryoverGroup.push(...tempGroup);
      });

      if (optimizationLevels.includes("carryover")) {
        groupResult = carryoverGroup;
      }

      groupResult &&
        groupResult.map((item) => {
          let tempData = [],
            tempSubRows = [],
            res = Object.keys(item).map((k) => {
              return item[k].cluster_code;
            });
          // need to check later next week
          // let clusterValue = uniqueClusterData.filter(function (el) {
          //   return res.indexOf(el) < 0;
          // });
          // clusterValue &&
          //   clusterValue.map((k, i) => {
          //     let newObj = { ...item[i] };
          //     newObj["l0_name"] = item[i].l0_name;
          //     newObj["l1_name"] = item[i].l1_name;
          //     newObj["l2_name"] = item[i].l2_name;
          //     newObj["l3_name"] = item[i].l3_name;
          //     newObj["drop"] = item[i].drop;
          //     newObj["sub_channel"] = item[i].sub_channel;
          //     newObj["penetration_ly"] = 0;
          //     newObj["penetration_ty"] = 0;
          //     newObj["cluster_code"] = k;
          //     newObj["cluster_display_name"] = item[i].cluster_display_name;
          //     newObj["attribute_name"] = item[i].attribute_name;
          //     newObj["margin_percentage"] = parseFloat(
          //       item[i].margin_percentage
          //     );
          //     newObj["sell_through"] = parseFloat(item[i].sell_through);
          //     newObj["uniqueID"] =
          //       item[i].l3_name + item[i].l1_name + item[i].l2_name;
          //     item.push(newObj);
          //     return k;
          //   });
          item.sort((a, b) => a.cluster_code.localeCompare(b.cluster_code));
          for (let i = 0; i < item.length; i++) {
            let clusterName = item[i].cluster_display_name?.toLowerCase();
            let newObj = {};
            newObj["l0_name"] = item[i].l0_name;
            newObj["l1_name"] = item[i].l1_name;
            newObj["l2_name"] = replaceSpecialCharacter(item[i].l2_name);
            newObj["l3_name"] = replaceSpecialCharacter(item[i].l3_name);
            newObj["is_highlight"] = item[i].is_cluster_imputed === "True";
            newObj["level"] = item[i].level;
            newObj["l3_budget_ty"] = item[i].l3_budget_ty;
            newObj["channel"] = item[i].channel;
            newObj["carryover_flag"] = item[i].carryover_flag;
            newObj["unique_key"] =
              item[i].l3_name +
              item[i].l1_name +
              item[i].l2_name +
              item[i][props.screenConfiguration?.common?.drop_key || "drop"] +
              item[i].carryover_flag;
            newObj[
              props.screenConfiguration?.common?.drop_key || "drop"
            ] = item[i][props.screenConfiguration?.common?.drop_key || "drop"]
              ? item[i][props.screenConfiguration?.common?.drop_key || "drop"]
              : "-";
            newObj["sub_channel"] = item[i].sub_channel;
            newObj["penetration_ly"] =
              item[i].l3_penetration_ly * (isView ? 1 : 100);
            newObj["penetration_ty"] =
              item[i].l3_penetration_ty * (isView ? 1 : 100);
            newObj["plan_clu_opt_id" + (i + 1)] = item[i].plan_clu_opt_id;
            newObj["overall_ty_pen"] = parseFloat(item[i].penetration_ty);
            newObj["overall_ly_pen"] = parseFloat(item[i].penetration_ly);
            newObj[clusterName + "_ty"] =
              Math.round(item[i].penetration_ty * (isView ? 100 : 10000)) / 100;
            newObj[clusterName + "_ly"] =
              Math.round(item[i].penetration_ly * (isView ? 100 : 10000)) / 100;
            newObj[clusterName + "_st"] =
              Math.round(item[i]["sell_through"] * (isView ? 100 : 10000)) /
              100;
            newObj[clusterName + "_margin"] =
              Math.round(
                item[i]["margin_percentage"] * (isView ? 100 : 10000)
              ) / 100;
            newObj["margin_percentage"] = parseFloat(item[i].margin_percentage);

            newObj["receipts_quantity_ty"] = parseFloat(
              item[i].receipts_quantity_ty
            );

            newObj["sell_through"] = parseFloat(item[i].sell_through);
            newObj["cluster_code" + (i + 1)] = item[i].cluster_code;
            newObj["cluster_display_name" + (i + 1)] =
              item[i].cluster_display_name;
            newObj["attribute_name" + (i + 1)] = item[i].attribute_name;
            newObj["attribute_value"] = item[i].carryover_flag;
            newObj["uniqueID"] =
              item[i].l3_name +
              item[i].l1_name +
              item[i].l2_name +
              item[i].channel +
              item[i][props.screenConfiguration?.common?.drop_key || "drop"] +
              item[i].carryover_flag +
              item?.l3_name;

            if (newObj["subRows"] === undefined) newObj["subRows"] = [];
            item[i].attribute_value &&
              Object.keys(item[i].attribute_value).length &&
              Object.keys(item[i].attribute_value).map((k) => {
                let row = item[i].attribute_value[k];
                let attributeKeys = [];
                Object.keys(row).forEach((data) => {
                  let splitData = replaceSpecialCharacter(data).split("__");
                  let attributeData = splitData[0];
                  if (!attributeKeys.includes(attributeData)) {
                    attributeKeys.push(attributeData);
                    let temp = {};
                    temp["cluster_code"] = item[i].cluster_code;
                    temp["cluster_display_name"] = item[i].cluster_display_name;
                    temp["l1_name"] = item[i].l1_name;
                    temp["l2_name"] = replaceSpecialCharacter(item[i].l2_name);
                    temp[
                      props.screenConfiguration?.common?.final_level ||
                        "l3_name"
                    ] = replaceSpecialCharacter(k);
                    temp["is_highlight"] =
                      item[i].is_cluster_imputed === "True";
                    temp["l3_budget_ty"] = item[i].l3_budget_ty;
                    temp["carryover_flag"] = item[i].carryover_flag;
                    temp["abc"] = k + item[i].carryover_flag;
                    temp["channel"] = item[i].channel;
                    temp[
                      props.screenConfiguration?.common?.drop_key || "drop"
                    ] = item[i][
                      props.screenConfiguration?.common?.drop_key || "drop"
                    ]
                      ? item[i][
                          props.screenConfiguration?.common?.drop_key || "drop"
                        ]
                      : "-";
                    temp["sub_channel"] = item[i].sub_channel;
                    temp["penetration_ly"] = "-";
                    temp["penetration_ty"] = "-";
                    temp["attribute_value"] = splitData[0];
                    temp["plan_clu_opt_id"] = item[i].plan_clu_opt_id;
                    temp["uniqueID"] =
                      attributeData +
                      item[i].l1_name +
                      item[i].l3_name +
                      k +
                      item[i].l2_name +
                      item[i].channel +
                      item[i][
                        props.screenConfiguration?.common?.drop_key || "drop"
                      ] +
                      item[i].carryover_flag +
                      item?.l3_name;
                    temp["attribute_name" + (i + 1)] = props.isStrategyFlow
                      ? row["attribute_name"]
                      : item[i].attribute_name
                          .split("_")
                          .map(
                            (e) => e.charAt(0).toUpperCase() + e.slice(1) + " "
                          );
                    newObj["overall_ty_pen"] = parseFloat(
                      item[i].penetration_ty
                    );
                    newObj["overall_ly_pen"] = parseFloat(
                      item[i].penetration_ly
                    );
                    temp[clusterName + "_ly"] =
                      Math.round(
                        row[`${attributeData}__penetration_ly`] *
                          (isView ? 100 : 10000)
                      ) / 100;

                    temp[clusterName + "_st"] =
                      Math.round(
                        row[`${attributeData}__sell_through`] *
                          (isView ? 100 : 10000)
                      ) / 100;
                    temp[clusterName + "_margin"] =
                      Math.round(
                        row[`${attributeData}__margin_percentage`] *
                          (isView ? 100 : 10000)
                      ) / 100;
                    temp[clusterName + "_ty"] =
                      Math.round(
                        row[`${attributeData}__penetration_ty`] *
                          (isView ? 100 : 10000)
                      ) / 100;
                    temp[clusterName + "_total_quantity"] =
                      row[`${attributeData}__total_quantity`];
                    temp[clusterName + "_sell_through"] =
                      row[`${attributeData}__sell_through`];
                    temp.parent_col = "attribute_value";
                    const index = k + attributeData;
                    if (tempSubRows[index] === undefined)
                      tempSubRows[index] = [];
                    tempSubRows[index].push(temp);
                  }
                  return data;
                });
                return k;
              });
            Object.keys(tempSubRows).forEach((data) => {
              if (newObj["subRows"] === undefined) newObj["subRows"] = [];
              newObj["subRows"].push(
                tempSubRows[data].reduce(function (result, current) {
                  return Object.assign(result, current);
                }, {})
              );
              return data;
            });
            newObj["subRows"] &&
              newObj["subRows"].sort(function (a, b) {
                return a[
                  props.screenConfiguration?.common?.final_level || "l3_name"
                ].localeCompare(
                  b[props.screenConfiguration?.common?.final_level || "l3_name"]
                );
              });
            tempData.push(newObj);
          }
          budgetData.push(
            tempData.reduce(function (result, current) {
              return Object.assign(result, current);
            }, {})
          );
          return item;
        });
      uniqueClusterData = uniqueClusterData.map((cluster) => {
        return cluster?.toLowerCase();
      });
      setClusterData(uniqueClusterData);
      budgetData.forEach((row) => {
        let total_ly = 0,
          total_ty = 0;
        uniqueClusterData.forEach((cluster) => {
          //sum of all cluster values of parent is total parent cluster
          total_ly += parseFloat(row[`${cluster}_ly`] || 0);
          total_ty += parseFloat(row[`${cluster}_ty`] || 0);
        });
        row.total_ly = Math.round(total_ly * 100) / 100;
        row.total_ty = Math.round(total_ty * 100) / 100;
        row.total_ly = getRoundedTotal(row.total_ly);
        row.total_ty = getRoundedTotal(row.total_ty);
        row.expandableCols = "attribute_value";
        props.getSubRowTotal(
          row,
          uniqueClusterData,
          displayMessage,
          props.screenConfiguration
        );
        return null;
      });
      let footerData = getTotalFooterRow(
        budgetData,
        level3AllData,
        setLevel3AllData,
        props.planDetails,
        props.screenConfiguration,
        isView
      );
      setTotalFooter(footerData);
      // Format budgetData to flatrows for ag-grid table grouping
      let rowData = formatTableDataGrouping(
        budgetData,
        props.selectedDropData,
        props.screenConfiguration
      );
      props.setUniqueClusterList(uniqueClusterData);
      props.setClusterTableData(budgetData);
      props.setBudgetClusterTableData(budgetData);
      setBudgetClusterSelectedDropTableData(rowData);
      if (props.AGInstance?.current?.api) {
        props.AGInstance?.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.clusterOptData]);

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
      !props.screenConfiguration["2.1"]?.show_drop_after_cluster &&
      props.AGInstance?.current?.api
    ) {
      console.log("going to set drop");
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      props.AGInstance.current.api.setFilterModel(hardcodedFilter);
      props.AGInstance.current.api.onFilterChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    budgetClusterSelectedDropTableData,
    props.AGInstance,
    props.selectedDropData,
  ]);

  useEffect(() => {
    if (clusterColumns?.length) {
      let col = clusterColumns;
      if (props.togglePen === "total") {
        col = getColForEditTotal(clusterColumns, props);
      }
      if (props.togglePen === "cluster") {
        col = getColForEditCluster(clusterColumns, props);
      }
      setClusterColumns(col);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.togglePen]);

  useEffect(() => {
    if (props.selectedDropData && props.AGInstance?.current?.api) {
      let rowData = formatTableDataGrouping(
        props.budgetClusterTableData,
        props.selectedDropData,
        props.screenConfiguration
      );
      setBudgetClusterSelectedDropTableData(rowData);
      props.AGInstance.current.api.refreshCells({
        update: rowData,
      });
      let formData = {
        [props.screenConfiguration?.common?.drop_key ||
        "drop"]: props.selectedDropData,
      };
      props.setFilteredClusterFooter(
        props.getFilteredFooter(totalFooter, {})
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData]);

  useEffect(() => {
    if (totalFooter?.length) {
      let formData = {
        [props.screenConfiguration?.common?.drop_key ||
        "drop"]: props.selectedDropData,
      };
      props.setFilteredClusterFooter(
        props.getFilteredFooter(totalFooter, {})
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFooter]);

  useEffect(() => {
    if (
      isChannelMultiple(props.planDetails?.data) &&
      props.clusterData?.cluster_plan_data?.length > 0 &&
      props.selectedChannel?.value &&
      props.filterChanged
    ) {
      callUpdateClustData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedChannel]);

  useEffect(() => {
    if (props.callUpdateClusterTable) {
      callUpdateClustData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.callUpdateClusterTable]);

  const callUpdateClustData = async () => {
    props.set2_1_Loader(true);
    if (props.invalidL3Clusters?.length > 0) {
      // props.addSnack({
      //   message: `Penetration exceeding/less than 100% for ${props.invalidL3Clusters.join(
      //     ","
      //   )}`,
      //   options: {
      //     variant: "warning",
      //   },
      // });
    }
    let updateResponse = {};
    if (!isView) {
      updateResponse = await props.updateClusterOptData(
        {
          cluster_plan_data: props.clusterData.cluster_plan_data,
          is_update_plan_step: false,
          plan_sub_step: isDropPlan(
            props.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          )
            ? "review_drop"
            : "aps_st_table",
          is_value_changed: props.isClusterChanged,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
    }
    props.setCallUpdateClusterTable(false);
    props.setIsClusterChanged(false);
    if (updateResponse?.data?.status || isView) {
      fetchData();
    }
  };

  const fetchData = async (doNotSetLoader) => {
    let finalLevel =
      props.screenConfiguration?.common?.final_level || "l3_name";
    let optLevel = finalLevel.split("_name")[0];
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          operator: "in",
          value: [props.planDetails?.data?.plan_code],
        },
        {
          attribute_name: "store_type",
          value: props.planDetails?.data?.channel,
          operator: "in",
          prefix: "levels",
        },
        {
          attribute_name: "sub_channel",
          value: props.planDetails?.data?.sub_channel?.length
            ? props.planDetails?.data?.sub_channel
            : props.planDetails?.data?.channel,
          operator: "in",
          prefix: "levels",
        },
        {
          attribute_name: "channel",
          value: isChannelMultiple(props.planDetails?.data)
            ? [props.selectedChannel?.value]
            : props.planDetails?.data?.channel,
          operator: "in",
          prefix: "levels",
        },
        {
          attribute_name: "optimization_level",
          value: [`${optLevel}_optimization`],
          operator: "in",
          prefix: "levels",
        },
      ],
    };
    if (props.planDetails?.data?.l1_name?.length > 1) {
      payload.filters.push({
        attribute_name: "l1_name",
        value: props.levelOneSelected?.value
          ? [props.levelOneSelected?.value]
          : [props.planDetails?.data?.l1_name?.[0]],
        operator: "in",
        prefix: "levels",
      });
    }
    if (props.planDetails?.data?.l2_name?.length > 1) {
      payload.filters.push({
        attribute_name: "l2_name",
        value: props.levelTwoSelected?.value
          ? [props.levelTwoSelected?.value]
          : [props.planDetails?.data?.l2_name?.[0]],
        operator: "in",
        prefix: "levels",
      });
    }
    
      payload.filters.push({
        attribute_name: "drop",
        value: ["Total", "-"],
        operator: "in",
        prefix: "levels",
      });
    
    let response = await props.getClusterOptData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    let col = agGridColumnFormatter(
      cloneDeep(response.data?.data?.columns || []),
      props.columnHeaderJson,
      null,
      null,
      null,
      isView
    );
    if (col?.length) {
      col.forEach((col) => {
        if (
          col.accessor === props.screenConfiguration?.common?.drop_key ||
          "drop"
        ) {
          col.filter = "agTextColumnFilter";
          //col.is_hidden = false
        }
        if (
          col.accessor === "attribute_value" &&
          !optimizationLevels.includes("carryover")
        ) {
          col.is_hidden = true;
        }
        if (
          col.accessor ===
          (props.screenConfiguration?.common?.final_level || "l3_name")
        ) {
          col.rowGroup = true;
        }
      });
      setLevel3AllData(col);
    }
    if (props.togglePen === "total" && !isView) {
      col = getColForEditTotal(col, props);
    }
    if (
      props.togglePen === "cluster" ||
      (isWholesalePlan(props.planDetails?.data) && !isView)
    ) {
      col = getColForEditCluster(col, props);
    }
    // Add Info icon on parent cluster column header
    col.forEach((item) => {
      if (
        item.footer === "cluster" &&
        item.sub_headers?.length &&
        (props.storeEligibilityData?.length ||
          props.screenConfiguration?.common?.show_store_eligiblity)
      ) {
        item.headerGroupComponent = InfoComponent;
      }
    });
    setClusterColumns(col);
    if (response?.data?.data?.data && !doNotSetLoader) {
      props.set2_1_Loader(false);
    }
    props.setClusterOptData(response.data?.data?.data || []);
    props.setClusterGraphdata(response.data);
  };

  useEffect(() => {
    if (props.AGInstance?.current?.api) {
      props.handleClusterNext();
    }
  }, [props.AGInstance?.current?.api]);

  useEffect(() => {
    if (
      !props.screenConfiguration["2.1"]?.show_drop_after_cluster ||
      (!isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) &&
        budgetClusterSelectedDropTableData.length)
    ) {
      props.setDisableNext(props.loading);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.loading, budgetClusterSelectedDropTableData]);

  const loadTableInstance = (params) => {
    props.AGInstance.current = params;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) &&
      !props.screenConfiguration["2.1"]?.show_drop_after_cluster
    ) {
      let selectedDrop =
        props.selectedDropData ||
        Object.keys(
          groupBy(
            props.budgetClusterTableData,
            props.screenConfiguration?.common?.drop_key || "drop"
          )
        )[0];
      console.log("going to set drop1");
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: selectedDrop,
        },
      };
      props.AGInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  const getDataPath = useMemo(() => {
    return (data) => {
      return data.hierarchy;
    };
  }, []);

  const onChangeDrop = async (val, value_changed) => {
    if (props.selectedDropData !== val && value_changed) {
      props.set2_1_Loader(true);
      props.setDisableNext(true);
      if (props.invalidL3Clusters?.length > 0) {
        // props.addSnack({
        //   message: `Penetration exceeding/less than 100% for ${props.invalidL3Clusters.join(
        //     ","
        //   )}`,
        //   options: {
        //     variant: "warning",
        //   },
        // });
      }
      let updateResponse = {};
      if (!isView) {
        updateResponse = await props.updateClusterOptData(
          {
            cluster_plan_data: props.clusterData.cluster_plan_data,
            is_update_plan_step: false,
            plan_sub_step: isDropPlan(
              props.planDetails?.data,
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            )
              ? "review_drop"
              : "aps_st_table",
            is_value_changed: props.isClusterChanged,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
      }
      props.setIsClusterChanged(false);
      if (updateResponse?.data?.status || isView) {
        props.setClusterOptData([]);
        setBudgetClusterSelectedDropTableData([]);
        setGroupedDrops(null);
        props.setSelectedDropData(null);
        fetchData();
        props.setSelectedDropData(val);
      }
    }
  };

  useEffect(() => {
    if (props.callCluster) {
      fetchData(true);
      props.setCallCluster(false);
    }
  }, [props.callCluster]);

  useEffect(() => {
    if (showError) {
      props.addSnack({
        message:
          "Enter cluster attribute penetration more than 0% to reflect the values",
        options: {
          variant: "error",
        },
      });
      setShowError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError]);

  const isExternalFilterPresent = useCallback(() => {
    // filter incase of wholesale plan and mulitple channels
    return isDropPlan(
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
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      return externalFilterLevelTwoSubchannel(
        node,
        props.selectedDropData,
        budgetClusterSelectedDropTableData,
        null,
        props.planDetails?.data,
        props.screenConfiguration
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budgetClusterSelectedDropTableData, props.selectedDropData]
  );

  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  if (optimizationLevels.includes("carryover")) {
    autoGroupColumnDef.headerName = "Attribute  Level";
  }

  const validateError =
    props.screenConfiguration["2.1"]?.validate_cluster_error || false;

  const displayMessage = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  return (
    <>
      {groupedDrops &&
        props.clusterLevelView === "table" &&
        !props.screenConfiguration["2.1"]?.show_drop_after_cluster && (
          <div>
            <PlanDropTabViewComponent
              groupedDrops={groupedDrops}
              onChangeTab={onChangeDrop}
              selectedTab={props.selectedDropData}
            />
          </div>
        )}
      {props.clusterLevelView === "table" &&
        clusterColumns?.length > 0 &&
        budgetClusterSelectedDropTableData?.length > 0 &&
        ((isDropPlan(
          props.planDetails?.data,
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        ) &&
          groupedDrops &&
          Object.keys(groupedDrops)?.length > 0) ||
          !isDropPlan(
            props.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          )) && (
          <div
            className={
              clusterData.length === 1
                ? `${classes.depthTableWidth} ${clusterClasses.tableCell}`
                : clusterClasses.tableCell
            }
          >
            <AgGridTable
              tableRef={props.AGInstance}
              rowdata={budgetClusterSelectedDropTableData || []}
              columns={clusterColumns || []}
              loadTableInstance={loadTableInstance}
              treeData={true}
              getDataPath={getDataPath}
              autoGroupColumnDef={autoGroupColumnDef}
              customCellRenderer={(cellProps) =>
                assortAgGridCustomCellRenderer(cellProps, "cluster_table")
              }
              noEditableCustomCellRender={(cellProps) => {
                if (
                  cellProps.colDef.column_name === "l3_name" &&
                  cellProps?.data?.is_highlight
                ) {
                  return (
                    <p style={{ backgroundColor: "#F0CBA3" }}>
                      {cellProps.value}
                    </p>
                  );
                } else {
                  return AgGridAssortnonEditableCell(cellProps.colDef, {
                    value: cellProps.value,
                  });
                }
              }}
              onBlur={(e, data, column, isChanged, value, initialValue) =>
                onBlurAgGridCluster(
                  data,
                  column,
                  isChanged,
                  value,
                  initialValue,
                  props.AGInstance,
                  props.uniqueClusterList,
                  props.handleClusterNext,
                  validateError,
                  setShowError,
                  displayMessage,
                  props.screenConfiguration,
                  props.setFilteredClusterFooter,
                  props.setIsClusterChanged,
                  groupedDropsRef?.current
                )
              }
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              // sideBar={false}
              pagination={false}
              sizeColumnsToFitFlag={true}
              tableId={"budget-cluster-table"}
              enableRowSpan={true}
              rowSpanColumn={
                props.screenConfiguration?.[
                  "2.1"
                ]?.budget_optimization_level?.includes("carryover")
                  ? [
                      props.screenConfiguration?.common?.final_level ||
                        "l3_name",
                      "carryover_flag",
                    ]
                  : []
              } // can send multiple columns
              getRowData={getRowData}
              pinnedBottomRowData={props.filteredClusterFooter}
              autoSizeColumnsFlag
              adjustTableHeight={true}
              uniqueRowId={"uniqueID"}
              isCellLockable={true}
              lockCellApi={(cellProps, isLocked) =>
                lockCellApi(cellProps, isLocked, props.AGInstance)
              }
              lockCellCustomConditionFn={lockCellCustomConditionFn}
              showSaveTableConfig={false}
              showSearchModalBtn={false}
              staticColId={true}
            />
          </div>
        )}

      {props.clusterLevelView === "table" &&
        budgetClusterSelectedDropTableData?.length === 0 && (
          <div
            className={
              clusterData.length === 1
                ? `${classes.depthTableWidth} ${clusterClasses.tableCell}`
                : clusterClasses.tableCell
            }
          >
            <AgGridTable
              rowdata={budgetClusterSelectedDropTableData || []}
              columns={clusterColumns || []}
              sideBar={false}
              pagination={false}
              sizeColumnsToFitFlag={true}
              tableId={"budget-cluster-table"}
              adjustTableHeight={
                budgetClusterFilteredData?.length &&
                budgetClusterFilteredData?.length <= 2
                  ? true
                  : false
              }
              uniqueRowId={"uniqueID"}
            />
          </div>
        )}
      {props.clusterTableData?.length > 0 &&
        props.clusterLevelView === "chart" && (
          <BudgetClusterChartComponent
            budgetSplitGraphDetails={props.clusterOptGraphData.data}
            budgetSplitGraphData={props.clusterTableData}
            levelsJson={props.levelsJson}
            level3AllData={level3AllData}
            planDetails={props.planDetails}
            screenConfiguration={props.screenConfiguration}
            optimizationLevels={optimizationLevels}
            isView={isView}
          />
        )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    clusterOptData: planInitialServiceActions.budgetClusterOcrptTableDataSelector(
      state
    ),
    clusterOptGraphData: planInitialServiceActions.budgetClusterOptGraphDataSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    storeEligibilityData: planInitialServiceActions.ClusterStoreEligibilitySelector(
      state
    ),
    dropFlowData: planInitialServiceActions.dropFlowDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      setClusterOptData,
      setClusterGraphdata,
      set2_1_Loader,
      getClusterOptData,
      updateClusterOptData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BudgetClusterComponent));
