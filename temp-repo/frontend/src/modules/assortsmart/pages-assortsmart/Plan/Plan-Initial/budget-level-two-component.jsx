import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { uniqBy, cloneDeep, isArray, groupBy } from "lodash";
import { Button } from "@mui/material";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { addSnack } from "core/actions/snackbarActions";
import { useHistory } from "react-router";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import ViewTrendsModal from "./view-trends-modal";
import {
  set2_1_Loader,
  getBudgetL2Data,
  setBudgetL2Data,
  updateBudgetL2Data,
  getOptimizeL3Data,
  fetchDropConfig,
  deleteL3Optimization,
  setUpdateDropData,
  setDeleteOptimizationData,
  getL3OptData,
  setL3OptData,
  setL2OptData,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import {
  assortAgGridCustomCellRenderer,
  attributeFormatter,
  channelContainsTotal,
  getBudgetTablePayload,
  getOptimiseL3Payload,
  isChannelMultiple,
  isDropPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import RenderDropConfiguration from "./render-drop-configuration";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  getOptimizeDropConfigPayload,
  getTotalFooterRow,
  getUpdateBudgetPayload,
  updateL2RowData,
} from "./budget-level-two-functions";
import { bindActionCreators } from "redux";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { fetchL3Details } from "./budget-level-three-functions";

const BudgetLevelComponent = (props) => {
  let [level2Columns, setLevel2Columns] = useState([]);
  const [showViewTrends, setShowViewTrends] = useState(false);
  const [maxMonths, setMaxMonths] = useState();
  const [viewTrendRowIndex, setViewTrendRowIndex] = useState(0);
  const [showDropConfiguration, setShowDropConfiguration] = useState(false);
  const [dropConfigLoader, setDropConfigLoader] = useState(false);
  const [disableDropConfiguration, setDisableDropConfiguration] = useState(
    false
  );
  const [totalFooter, setTotalFooter] = useState([]);
  const history = useHistory();
  const classes = useStyles();
  const BudgetLevel2Instance = useRef({});

  useEffect(() => {
    return () => {
      props.setUpdateDropData({});
      props.setDeleteOptimizationData({});
    };
  }, []);

  useEffect(() => {
    if (props.planDetails?.status) {
      props.set2_1_Loader(true);
      fetchData();
    }
  }, [props.planDetails]);

  useEffect(() => {
    if (level2Columns?.length) {
      setLevel2Columns([]);
      level2Columns.forEach((col) => {
        if (col.accessor.includes("_budget")) {
          col.sub_headers.map((sub) => {
            if (props.percentageView) {
              sub.is_hidden = true;
            } else {
              sub.is_hidden = false;
            }
          });
        }
        if (col.accessor.includes("_pen")) {
          col.sub_headers.map((sub) => {
            if (props.percentageView) {
              sub.is_hidden = false;
              sub.formatter = "roundOfftoTwoDecimals";
            } else {
              sub.is_hidden = true;
            }
          });
        }
      });
      level2Columns = agGridColumnFormatter(level2Columns);
      setLevel2Columns(level2Columns);
    }
  }, [props.percentageView]);

  useEffect(() => {
    //Logic to set the table data
    let budgetData = [],
      columnCount = 1,
      tempMonthArray = props.monthArray;
    if (props.budgetL2Data?.status && props.budgetL2Data?.data?.data?.length) {
      setMaxMonths(
        uniqBy(props.budgetL2Data.data?.data, "fiscal_month").length
      );
      let total_ly = {},
        total_ty = {},
        total_budget_ly = {},
        total_budget_ty = {},
        total_pen_ly = {},
        total_pen_ty = {};
      props.budgetL2Data.data?.data.map((item) => {
        let newObj = {};
        // get month name from monthMappingList, change to lowercase and push to tempMonthArray
        let month = props.monthMappingList?.[item.fiscal_month]?.toLowerCase();
        // Check if month name already exist in tempMonthArray
        if (month && tempMonthArray.indexOf(month) === -1) {
          tempMonthArray.push(month);
        }
        if (budgetData.length !== 0) {
          let isIdenticalChannelArray = false;
          // Function to check if channel array elements for item.channel and budgetData are identical
          if (isArray(item.channel)) {
            budgetData.map((budget) => {
              const checkForIdenticalChannelArray = (item, budget) => {
                if (item.channel.length !== budget.channel.length) return false;
                // get unique set of channel value for both arrays
                const uniqueValues = new Set([
                  ...item.channel,
                  ...budget.channel,
                ]);
                for (const uniqueChannel of uniqueValues) {
                  // check if element of uniqueValues object exists in item array, and calculate length
                  const itemChannelCount = item.channel.filter(
                    (channel) => channel === uniqueChannel
                  ).length;
                  // check if element of uniqueValues object exists in budget array, and calculate length
                  const budgetChannelCount = budget.channel.filter(
                    (channel) => channel === uniqueChannel
                  ).length;
                  if (itemChannelCount !== budgetChannelCount) return false;
                }
                return true;
              };
              isIdenticalChannelArray = checkForIdenticalChannelArray(
                item,
                budget
              );
            });
          }
          let existingL2;
          existingL2 = budgetData.find((el) => {
            if (isIdenticalChannelArray) {
              return el.l3_name === item.l3_name && el.l2_name === item.l2_name;
            } else if (props.optimizationLevels?.[0] === "l1_name") {
              return (
                el.l3_name === item.l3_name &&
                el.l1_name === item.l1_name &&
                el.channel === item.channel &&
                el.sub_channel === item.sub_channel
              );
            } else {
              return (
                el.l3_name === item.l3_name &&
                el.l2_name === item.l2_name &&
                el.channel === item.channel &&
                el.sub_channel === item.sub_channel
              );
            }
          });
          if (existingL2 !== undefined) {
            columnCount++;
            existingL2[
              columnCount >
              uniqBy(props.budgetL2Data.data?.data, "fiscal_month").length
                ? "ty" + (columnCount - 1)
                : "ty" + columnCount
            ] = item.budget_ty ? parseFloat(item.budget_ty).toFixed(2) : 0;
            existingL2[
              columnCount >
              uniqBy(props.budgetL2Data.data?.data, "fiscal_month").length
                ? "ly" + (columnCount - 1)
                : "ly" + columnCount
            ] = item.budget_ly;
            existingL2["old_" + month + "_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            existingL2["old_" + month + "_budget_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            existingL2[month + "_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            existingL2[month + "_ly"] = item.budget_ly;
            existingL2[month + "_budget_ly"] = item.budget_ly;
            existingL2[month + "_pen_ly"] = item.budget_pen_ly;
            existingL2[month + "_budget_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            existingL2[month + "_pen_ty"] = item.budget_pen_ty
              ? parseFloat(item.budget_pen_ty * 100).toFixed(2)
              : 0;
            if (
              total_ly?.[`${item.channel}_ly`] ||
              total_budget_ly[`${item.channel}_budget_ty`] !== undefined ||
              total_pen_ty[`${item.channel}_pen_ty`] !== undefined
            ) {
              total_ly[`${item.channel}_ly`] += parseFloat(item.budget_ly);
              total_ty[`${item.channel}_ty`] += parseFloat(item.budget_ty);
              total_budget_ly[`${item.channel}_budget_ly`] += parseFloat(
                item.budget_ly
              );
              total_budget_ty[`${item.channel}_budget_ty`] += parseFloat(
                item.budget_ty
              );
              total_pen_ly[`${item.channel}_pen_ly`] += parseFloat(
                item.budget_pen_ly
              );
              total_pen_ty[`${item.channel}_pen_ty`] += parseFloat(
                item.budget_pen_ty
              );
            } else {
              total_ly[`${item.channel}_ly`] = 0;
              total_ly[`${item.channel}_ty`] = 0;
              total_ly[`${item.channel}_ly`] = parseFloat(item.budget_ly);
              total_ty[`${item.channel}_ty`] = parseFloat(item.budget_ty);
              total_budget_ly[`${item.channel}_budget_ly`] = 0;
              total_budget_ty[`${item.channel}_budget_ty`] = 0;
              total_pen_ly[`${item.channel}_pen_ly`] = 0;
              total_pen_ty[`${item.channel}_pen_ty`] = 0;
              total_budget_ly[`${item.channel}_budget_ly`] = parseFloat(
                item.budget_ly
              );
              total_budget_ty[`${item.channel}_budget_ty`] = parseFloat(
                item.budget_ty
              );
              total_pen_ly[`${item.channel}_pen_ly`] = parseFloat(
                item.budget_pen_ly
              );
              total_pen_ty[`${item.channel}_pen_ty`] = parseFloat(
                item.budget_pen_ty
              );
            }
            existingL2["total_ly"] = total_ly[`${item.channel}_ly`];
            existingL2["total_ty"] = total_ty[`${item.channel}_ty`];
            existingL2["total_budget_ly"] =
              total_budget_ly[`${item.channel}_budget_ly`];
            existingL2["total_budget_ty"] =
              total_budget_ty[`${item.channel}_budget_ty`];
            existingL2["total_pen_ly"] = total_pen_ly[`${item.channel}_pen_ly`];
            existingL2["total_pen_ty"] = total_pen_ty[`${item.channel}_pen_ty`];
            existingL2["plan_budget_id" + columnCount] = item.plan_budget_id;
            existingL2["fiscal_month" + columnCount] = item.fiscal_month;
            existingL2["fiscal_year" + columnCount] = item.fiscal_year;
            existingL2[month + "_qty_ly"] = item.qty_ly;
            existingL2[month + "_qty_ty"] = item.qty_ty;
            existingL2[month + "_retail_receipt_ly"] = item.retail_budget_ly;
            existingL2[month + "_retail_receipt_ty"] = item.retail_budget_ty;
          } else {
            columnCount = 1;
            if (props.isLevel2Required) {
              newObj["l2_name"] = item.l1_name;
            } else {
              newObj["l2_name"] = item.l2_name;
            }
            newObj["l1_name"] = item.l1_name;
            newObj["channel"] = item.channel;
            newObj["sub_channel"] = item.sub_channel;
            newObj[month + "_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            newObj["old_" + month + "_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            newObj["old_" + month + "_budget_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            newObj[month + "_ly"] = item.budget_ly;
            newObj[month + "_budget_ly"] = item.budget_ly;
            newObj[month + "_pen_ly"] = item.budget_pen_ly;
            newObj[month + "_budget_ty"] = item.budget_ty
              ? parseFloat(item.budget_ty).toFixed(2)
              : 0;
            newObj[month + "_pen_ty"] = item.budget_pen_ty
              ? parseFloat(item.budget_pen_ty * 100).toFixed(2)
              : 0;
            if (
              total_ly?.[`${item.channel}_ly`] ||
              total_budget_ly[`${item.channel}_budget_ty`] !== undefined ||
              total_pen_ty[`${item.channel}_pen_ty`] !== undefined
            ) {
              total_ly[`${item.channel}_ly`] += parseFloat(item.budget_ly);
              total_ty[`${item.channel}_ty`] += parseFloat(item.budget_ty);
              total_budget_ly[`${item.channel}_budget_ly`] += parseFloat(
                item.budget_ly
              );
              total_budget_ty[`${item.channel}_budget_ty`] += parseFloat(
                item.budget_ty
              );
              total_pen_ly[`${item.channel}_pen_ly`] += parseFloat(
                item.budget_pen_ly
              );
              total_pen_ty[`${item.channel}_pen_ty`] += parseFloat(
                item.budget_pen_ty
              );
            } else {
              total_ly[`${item.channel}_ly`] = 0;
              total_ly[`${item.channel}_ty`] = 0;
              total_ly[`${item.channel}_ly`] = parseFloat(item.budget_ly);
              total_ty[`${item.channel}_ty`] = parseFloat(item.budget_ty);
              total_budget_ly[`${item.channel}_budget_ly`] = 0;
              total_budget_ty[`${item.channel}_budget_ty`] = 0;
              total_pen_ly[`${item.channel}_pen_ly`] = 0;
              total_pen_ty[`${item.channel}_pen_ty`] = 0;
              total_budget_ly[`${item.channel}_budget_ly`] = parseFloat(
                item.budget_ly
              );
              total_budget_ty[`${item.channel}_budget_ty`] = parseFloat(
                item.budget_ty
              );
              total_pen_ly[`${item.channel}_pen_ly`] = parseFloat(
                item.budget_pen_ly
              );
              total_pen_ty[`${item.channel}_pen_ty`] = parseFloat(
                item.budget_pen_ty
              );
            }
            newObj["total_ly"] = total_ly[`${item.channel}_ly`];
            newObj["total_ty"] = total_ty[`${item.channel}_ty`];
            newObj["total_budget_ly"] =
              total_budget_ly[`${item.channel}_budget_ly`];
            newObj["total_budget_ty"] =
              total_budget_ty[`${item.channel}_budget_ty`];
            newObj["total_pen_ly"] = total_pen_ly[`${item.channel}_pen_ly`];
            newObj["total_pen_ty"] = total_pen_ty[`${item.channel}_pen_ty`];
            newObj["fiscal_month" + 1] = item.fiscal_month;
            newObj["fiscal_year" + 1] = item.fiscal_year;
            newObj["plan_budget_id" + 1] = item.plan_budget_id;
            newObj["l3_name"] = item.l3_name;
            newObj[month + "_qty_ly"] = item.qty_ly;
            newObj[month + "_qty_ty"] = item.qty_ty;
            newObj[month + "_retail_receipt_ly"] = item.retail_budget_ly;
            newObj[month + "_retail_receipt_ty"] = item.retail_budget_ty;
            newObj["uniqueID"] =
              item.l1_name +
              item.l2_name +
              item[props.screenConfiguration?.common?.drop_key || "drop"] +
              item.channel +
              item.sub_channel;
          }
        } else {
          columnCount = 1;
          if (props.isLevel2Required) {
            newObj["l2_name"] = item.l1_name;
          } else {
            newObj["l2_name"] = item.l2_name;
          }
          newObj["l1_name"] = item.l1_name;
          newObj["channel"] = item.channel;
          newObj["sub_channel"] = item.sub_channel;
          newObj["plan_budget_id" + 1] = item.plan_budget_id;
          newObj[month + "_ty"] = item.budget_ty
            ? parseFloat(item.budget_ty).toFixed(2)
            : 0;
          newObj["old_" + month + "_ty"] = item.budget_ty
            ? parseFloat(item.budget_ty).toFixed(2)
            : 0;
          newObj["old_" + month + "_budget_ty"] = item.budget_ty
            ? parseFloat(item.budget_ty).toFixed(2)
            : 0;
          newObj[month + "_ly"] = item.budget_ly;
          newObj[month + "_budget_ly"] = item.budget_ly;
          newObj[month + "_pen_ly"] = item.budget_pen_ly;
          newObj[month + "_budget_ty"] = item.budget_ty
            ? parseFloat(item.budget_ty).toFixed(2)
            : 0;
          newObj[month + "_pen_ty"] = item.budget_pen_ty
            ? parseFloat(item.budget_pen_ty * 100).toFixed(2)
            : 0;
          if (total_ly?.[`${item.channel}_ly`]) {
            total_ly[`${item.channel}_ly`] += parseFloat(item.budget_ly);
            total_ty[`${item.channel}_ty`] += parseFloat(item.budget_ty);
            total_budget_ly[`${item.channel}_budget_ly`] += parseFloat(
              item.budget_ly
            );
            total_budget_ty[`${item.channel}_budget_ty`] += parseFloat(
              item.budget_ty
            );
            total_pen_ly[`${item.channel}_pen_ly`] += parseFloat(
              item.budget_pen_ly
            );
            total_pen_ty[`${item.channel}_pen_ty`] += parseFloat(
              item.budget_pen_ty
            );
          } else {
            total_ly[`${item.channel}_ly`] = 0;
            total_ly[`${item.channel}_ty`] = 0;
            total_ly[`${item.channel}_ly`] = parseFloat(item.budget_ly);
            total_ty[`${item.channel}_ty`] = parseFloat(item.budget_ty);
            total_budget_ly[`${item.channel}_budget_ly`] = 0;
            total_budget_ty[`${item.channel}_budget_ty`] = 0;
            total_pen_ly[`${item.channel}_pen_ly`] = 0;
            total_pen_ty[`${item.channel}_pen_ty`] = 0;
            total_budget_ly[`${item.channel}_budget_ly`] = parseFloat(
              item.budget_ly
            );
            total_budget_ty[`${item.channel}_budget_ty`] = parseFloat(
              item.budget_ty
            );
            total_pen_ly[`${item.channel}_pen_ly`] = parseFloat(
              item.budget_pen_ly
            );
            total_pen_ty[`${item.channel}_pen_ty`] = parseFloat(
              item.budget_pen_ty
            );
          }
          newObj["total_ly"] = total_ly[`${item.channel}_ly`];
          newObj["total_ty"] = total_ty[`${item.channel}_ty`];
          newObj["total_budget_ly"] =
            total_budget_ly[`${item.channel}_budget_ly`];
          newObj["total_budget_ty"] =
            total_budget_ty[`${item.channel}_budget_ty`];
          newObj["total_pen_ly"] = total_pen_ly[`${item.channel}_pen_ly`];
          newObj["total_pen_ty"] = total_pen_ty[`${item.channel}_pen_ty`];
          newObj["fiscal_month" + 1] = item.fiscal_month;
          newObj["fiscal_year" + 1] = item.fiscal_year;
          newObj["l3_name"] = item.l3_name;
          newObj[month + "_qty_ly"] = item.qty_ly;
          newObj[month + "_qty_ty"] = item.qty_ty;
          newObj[month + "_retail_receipt_ly"] = item.retail_budget_ly;
          newObj[month + "_retail_receipt_ty"] = item.retail_budget_ty;
          newObj["uniqueID"] =
            item.l1_name +
            item.l2_name +
            item?.[props.screenConfiguration?.common?.drop_key || "drop"] +
            item.channel +
            item.sub_channel;
        }
        if (Object.keys(newObj).length !== 0) {
          // Total row removed in case, channel does not contain CA and US
          if (isChannelMultiple(props.planDetails?.data)) {
            budgetData.push(newObj);
          } else if (newObj.channel !== "Total") {
            budgetData.push(newObj);
          }
        }
        return newObj;
      });
      props.setLevel2TableData(budgetData);
    }
    props.setMonthArray(tempMonthArray);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.budgetL2Data]);

  const fetchData = async () => {
    props.set2_1_Loader(true);
    let planData = props.planDetails.data;
    props.setMonthMappingList(
      props.screenConfiguration?.["2.1"]?.fiscal_month_mapping_with_name || {}
    );
    const payload = getBudgetTablePayload(planData, props.planLevels);
    try {
      let budgetDetails = await props.getBudgetL2Data(payload);
      if (!budgetDetails?.data?.data?.status) {
        setDisableDropConfiguration(true);
        props.addSnack({
          message: budgetDetails?.data?.data?.data?.message,
          options: {
            variant: "error",
          },
        });
      } else {
        // Grouping all channel together
        let groupedData = groupBy(budgetDetails?.data?.data?.data, "channel")
        let budgetData = [];
        Object.keys(groupedData).map(key=>{
          budgetData.push(...groupedData[key])
        })
        budgetDetails.data.data.data = budgetData;
        props.setBudgetL2Data(budgetDetails?.data || []);
        let budgetL2Columns = agGridColumnFormatter(
          cloneDeep(budgetDetails?.data?.data?.columns || []),
          props.columnHeaderJson,
          null,
          null,
          null,
          history.location.pathname.includes("view")
        );
        budgetL2Columns.forEach((col) => {
          if (col.accessor.includes("_budget")) {
            col.sub_headers.map((sub) => {
              if (props.percentageView) {
                sub.is_hidden = true;
              } else {
                sub.is_hidden = false;
              }
            });
          }
          if (col.accessor.includes("_pen")) {
            col.sub_headers.map((sub) => {
              if (props.percentageView) {
                sub.is_hidden = false;
                sub.formatter = "roundOfftoTwoDecimals";
              } else {
                sub.is_hidden = true;
              }
            });
          }
          if (col.accessor === "channel") {
            col.is_hidden = false;
            col.cellRenderer = (data) => {
              if (data?.data?.channel === "Total") {
                return null;
              }
              return data.value;
            };
          }
          if (col.accessor === "l2_name") {
            col.cellRenderer = (data) => {
              if (data?.data?.channel === "Total") {
                return "Total";
              }
              return data.value;
            };
          }
        });
        setLevel2Columns(budgetL2Columns);
      }
    } catch (err) {
      props.addSnack({
        message: "Fetching budget details failed",
        options: {
          variant: "error",
        },
      });
    }
    props.set2_1_Loader(false);
  };

  const onChartClick = (ins) => {
    setViewTrendRowIndex(ins?.rowIndex);
    setShowViewTrends(true);
  };

  const onL3PollingSucess = () => {
    props.addSnack({
      message: `Successfully optimized ${props.columnHeaderJson?.l3_name} details`,
      options: {
        variant: "success",
      },
    });
    props.set2_1_Loader(false);
    if (props.isLevel2Required) {
      props.setShowLevel2(true);
    } else {
      props.setShowLevel3(true);
    }
    fetchL3Details(
      props.planDetails?.data?.plan_code,
      {
        ...props,
        currentTableLevel: props.isLevel2Required ? "l2_name" : "l3_name",
      },
      false,
      props.formData
    );
    setShowDropConfiguration(false);
    setDropConfigLoader(true);
  };

  const onL3PollingFailure = (data) => {
    props.addSnack({
      message: data.message,
      options: {
        variant: "error",
      },
    });
    props.set2_1_Loader(false);
  };

  const updateDropData = async (payloadData, callFetchData) => {
    const dropData = props.updateBudgetL2Data({
      plan_budget_data: payloadData,
    });
    props.setCallUpdateLevelTable(false);
    dropData
      .then((response) => {
        props.setUpdateDropData(response);
        if (callFetchData) {
          fetchData();
        }
      })
      .catch((error) => {
        props.set2_1_Loader(false);
        props.setShowReviewAcrossDropsTable(true);
        props.addSnack({
          message: "Updating drop data failed",
          options: {
            variant: "error",
          },
        });
      });
  };

  useEffect(() => {
    const fetchL3Data = async () => {
      try {
        props.set2_1_Loader(true);
        let fetchDropConfigPayload = getOptimizeDropConfigPayload(
          props.planDetails?.data,
          props.planLevels,
          props.isLevel2Required,
          props.screenConfiguration?.["2.1"]?.budget_optimization_level,
          props.screenConfiguration
        );
        let fetchDropConfigResponse = await props.fetchDropConfig(
          fetchDropConfigPayload
        );
        if (fetchDropConfigResponse?.data?.status) {
          props.setDeleteOptimizationData({});
          props.setUpdateDropData({});
          fetchOptimizeL3Data();
        } else {
          props.set2_1_Loader(false);
          props.addSnack({
            message: fetchDropConfigResponse?.data?.data?.message,
            options: {
              variant: "error",
            },
          });
        }
      } catch (err) {
        props.set2_1_Loader(false);
        props.addSnack({
          message: "Fetching Drop config failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    if (
      props.updateDropData?.status &&
      props.deleteOptimizationData?.status &&
      !isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      fetchL3Data();
    }
  }, [props.deleteOptimizationData, props.updateDropData]);

  useEffect(() => {
    if (props.callUpdateLevelTable) {
      props.setDisableNext(true);
      let payloadData = getUpdateBudgetPayload(
        props.planDetails?.data,
        BudgetLevel2Instance,
        maxMonths,
        props.monthMappingList
      );
      props.set2_1_Loader(true);
      updateDropData(payloadData, true);
    }
  }, [props.callUpdateLevelTable]);

  const onL3Optimise = async () => {
    props.setShowLevel3(false);
    props.setShowLevel2(false);
    props.setDisableNext(true);
    let payloadData = getUpdateBudgetPayload(
      props.planDetails?.data,
      BudgetLevel2Instance,
      maxMonths,
      props.monthMappingList
    );
    props.set2_1_Loader(true);
    props.setShowClusterLevel(false);
    props.setShowReviewAcrossDropsTable(false);
    updateDropData(payloadData);
    props.setInitialLoadDepthChoice(true);
    props.setInitialLoadWedge(true);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_2(false);
    props.setFromDashboardScreen_2_3(false);
    props.setFromDashboardScreen_2_4(false);
    let deleteL3OptResponse = props.deleteL3Optimization(
      {
        plan_code: props.planDetails?.data?.plan_code,
      },
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    deleteL3OptResponse
      .then((response) => {
        props.setDeleteOptimizationData(response);
      })
      .catch((error) => {
        props.set2_1_Loader(false);
        props.setShowReviewAcrossDropsTable(true);
        props.addSnack({
          message: "Delete optimization data failed",
          options: {
            variant: "error",
          },
        });
      });
  };
  const fetchOptimizeL3Data = async () => {
    try {
      let plan_sub_step = "optimization_table_l3_name";
      if (props.optimizationLevels.includes("carryover")) {
        plan_sub_step = props.optimizationLevels.slice(2)?.[0]
          ? `optimization_table_${props.optimizationLevels.slice(2)?.[0]}`
          : "optimization_table_l3_name";
      } else {
        plan_sub_step = props.optimizationLevels.slice(1)?.[0]
          ? `optimization_table_${props.optimizationLevels.slice(1)?.[0]}`
          : "optimization_table_l3_name";
      }
      props.optimisePayload.plan_sub_step = plan_sub_step;
      const optimizeResponse = await props.getOptimizeL3Data(
        props.optimisePayload
      );
      if (optimizeResponse.data.data.status) {
        const reqId = optimizeResponse?.data?.data?.task_id;
        //Poll to the server till we receive the response
        pollingService(
          `${BUDGET_POLL}${reqId}`,
          onL3PollingSucess,
          onL3PollingFailure
        );
        props.addSnack({
          message: "Please wait for sometime till we process!",
          options: {
            variant: "success",
          },
        });
      } else {
        props.addSnack({
          message: `Optimising ${props.columnHeaderJson?.l3_name} details failed`,
          options: {
            variant: "error",
          },
        });
        props.set2_1_Loader(false);
      }
    } catch (error) {
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };
  const closeDropConfiguration = () => {
    setShowDropConfiguration(false);
  };
  const onDropConfiguration = async () => {
    let payloadData = getUpdateBudgetPayload(
      props.planDetails?.data,
      BudgetLevel2Instance,
      maxMonths,
      props.monthMappingList
    );
    props.set2_1_Loader(true);
    let response = await props.updateBudgetL2Data({
      plan_budget_data: payloadData,
    });
    if (response?.data?.status && !props.showLevel3) {
      try {
        let fetchDropConfigPayload = getOptimizeDropConfigPayload(
          props.planDetails?.data,
          props.planLevels,
          null,
          props.screenConfiguration?.["2.1"]?.budget_optimization_level,
          props.screenConfiguration
        );
        let fetchDropConfigResponse = await props.fetchDropConfig(
          fetchDropConfigPayload
        );
        if (fetchDropConfigResponse?.data?.status) {
          props.set2_1_Loader(false);
          setShowDropConfiguration(true);
        } else {
          props.set2_1_Loader(false);
          props.addSnack({
            message: "Something went wrong",
            options: {
              variant: "error",
            },
          });
        }
      } catch (err) {
        props.set2_1_Loader(false);
        props.addSnack({
          message: "Something went wrong",
          options: {
            variant: "error",
          },
        });
      }
    } else {
      props.set2_1_Loader(false);
      setShowDropConfiguration(true);
    }
  };

  const loadTableInstance = (params) => {
    BudgetLevel2Instance.current = params;
    props.setRTinstance(BudgetLevel2Instance);
  };

  useEffect(() => {
    if (props.level2TableData?.length > 0) {
      // Get total of all the rows
      if (
        channelContainsTotal(props.planDetails?.data) ||
        (props.optimizationLevels?.[0] === "l1_name" &&
          props.planDetails?.data?.l1_name?.length > 1)
      ) {
        setTotalFooter(
          getTotalFooterRow(props.level2TableData, props.monthArray)
        );
      }
    }
    if (BudgetLevel2Instance?.current?.api) {
      BudgetLevel2Instance.current.api.onFilterChanged();
    }
  }, [props.level2TableData]);

  const isExternalFilterPresent = useCallback(() => {
    // filter incase of wholesale plan and mulitple channels
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (node.data) {
        //if a plan is wholesale filtering based on selected sub_channel
        return node.data?.channel !== "Total";
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.level3TableData, props.selectedDropData]
  );

  let dropOrLaunch = attributeFormatter(
    props.screenConfiguration?.common?.drop_key || "drop"
  );
  return (
    <>
      {level2Columns?.length > 0 && (
        <AgGridTable
          columns={level2Columns}
          rowdata={props.level2TableData || []}
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
            updateL2RowData(
              e,
              data,
              column,
              isChanged,
              value,
              initialValue,
              cellData,
              initValue,
              BudgetLevel2Instance,
              props.monthArray,
              props.setLevel2TableData,
              props
            )
          }
          onChartClick={(ins) => onChartClick(ins)}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          customCellRenderer={(cellProps) =>
            assortAgGridCustomCellRenderer(cellProps, "budget-level2-table")
          }
          adjustTableHeight={props.level2TableData?.length <= 2 ? true : false}
          sideBar={false}
          pagination={false}
          tableId={"budget-level2-table"}
          uniqueRowId={"uniqueID"}
          pinnedBottomRowData={totalFooter}
          applyFormatOnfocus={true}
        />
      )}
      {props.planDetails?.data?.drops_count > 1 &&
      !history.location.pathname.includes("view") ? (
        <div className={classes.rightAlignButtonAssort}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => onDropConfiguration()}
            id="l3-drop-configuration"
            disabled={disableDropConfiguration}
          >
            {dropOrLaunch} Configuration
          </Button>
        </div>
      ) : props.level2TableData?.length &&
        !history.location.pathname.includes("view") ? (
        <div className={classes.rightAlignButtonAssort}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => onL3Optimise()}
            disabled={props.level2TableData?.length > 0 ? false : true}
            id="optimise-for-l3"
          >
            {props.isLevel2Required
              ? `Optimize for ${props?.columnHeaderJson?.l2_name || ""}`
              : `Optimize for ${props?.columnHeaderJson?.l3_name || ""}`}
          </Button>
        </div>
      ) : null}
      {showViewTrends && (
        <ViewTrendsModal
          setShowViewTrends={setShowViewTrends}
          graphDetails={props.budgetL2Data}
          graphRawData={props.level2TableData}
          axisCategories={props.monthArray}
          planDetails={props.planDetails}
          rowIndex={viewTrendRowIndex}
          percentageView={props.percentageView}
        />
      )}
      {showDropConfiguration && (
        <RenderDropConfiguration
          closeDropConfiguration={closeDropConfiguration}
          drops_count={
            props.planDetails?.data?.[
              `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
            ]
          }
          optimisePayload={props.optimisePayload}
          fetchOptimizeL3Data={fetchOptimizeL3Data}
          showLevel3={props.showLevel3}
          setShowLevel3={props.setShowLevel3}
          setShowLevel2={props.setShowLevel2}
          dropConfigLoader={dropConfigLoader}
          setShowClusterLevel={props.setShowClusterLevel}
          screenConfiguration={
            props.screenConfiguration?.["2.1"]?.budget_optimization_level
          }
          setInitialLoadDepthChoice={props.setInitialLoadDepthChoice}
          setInitialLoadWedge={props.setInitialLoadWedge}
          setInitialLoadFinalize={props.setInitialLoadFinalize}
          setFromDashboardScreen_2_2={props.setFromDashboardScreen_2_2}
          setFromDashboardScreen_2_3={props.setFromDashboardScreen_2_3}
          setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
        />
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    budgetL2Data: planInitialServiceActions.budgetL2TableDataSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    updateDropData: planInitialServiceActions.updateDropDataSelector(state),
    deleteOptimizationData: planInitialServiceActions.deleteOptimizationDataSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      set2_1_Loader,
      setBudgetL2Data,
      updateBudgetL2Data,
      getBudgetL2Data,
      getOptimizeL3Data,
      addSnack,
      fetchDropConfig,
      deleteL3Optimization,
      setUpdateDropData,
      setDeleteOptimizationData,
      getL3OptData,
      setL3OptData,
      setL2OptData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BudgetLevelComponent));
