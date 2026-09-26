import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Button,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import {
  getOptimizeL3Data,
  updateBudgetL2Data,
  updateBudgetL2DropData,
  optimizeDropFlowConfiguration,
  set2_1_Loader,
  getDropPlanData,
  setDropFlowConfigData,
  getReviewBudgetAcrossDropsData,
  setReviewBudgetAcrossDropsData,
  updateClusterOptData,
  updateDropFlowData,
  fetchDropConfig,
  deleteL3Optimization,
  setDeleteOptimizationData,
  setUpdateDropData,
  getL3OptData,
  setL3OptData,
  setL2OptData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { cloneDeep, isEmpty, uniqBy } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import {
  filterView,
  getDefaultChannelValue,
  isChannelMultiple,
  assortAgGridCustomCellRenderer,
  getLevelFilters,
  isWholesalePlan,
  scrollIntoView,
  attributeFormatter,
  isDropPlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  getFooterRowForDropsTable,
  handlePlanLevelsChange,
  configureL3level,
} from "./plan-initial-functions";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import moment from "moment";
import { configureLevels } from "../../Plan-Dashboard/components/common-plan-functions";
import { Save } from "@mui/icons-material";
import { getDropFlowPayloadData } from "./budget-cluster-functions";
import {
  getOptimizeDropConfigPayload,
  getUpdateBudgetPayload,
} from "./budget-level-two-functions";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { fetchL3Details } from "./budget-level-three-functions";
import { Switch } from "impact-ui";

const DropFlowConfiguration = (props) => {
  const sharedClasses = useStyles();
  const [
    dropFlowConfigurationTableData,
    setDropFlowConfigurationTableData,
  ] = useState([]);
  let [
    dropFlowConfigurationTableColumns,
    setDropFlowConfigurationTableColumns,
  ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channelOptions, setChannelOptions] = useState([]);
  const [channel, setSelectedChannel] = useState(null);
  const [level3Value, setLevel3value] = useState({});
  const [levelsOptions, setLevelsOptions] = useState([]);
  const [levelSelected, setLevelSelected] = useState({});
  const [levelThreeOptions, setLevelThreeOptions] = useState([]);
  const [isDropFlowChanged, setIsDropFlowChanged] = useState(false);
  const [percentageView, setPercentageView] = useState(true);
  const AGInstance = useRef({});
  const formData = useRef({});
  let selectedChannel = {};
  let l3ValueSelected = {};

  useEffect(() => {
    return () => {
      props.setUpdateDropData({});
      props.setDeleteOptimizationData({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.planDetails?.data) {
      let channelOpt = props.planDetails?.data?.channel.map((data) => {
        return {
          label: data,
          value: data,
          id: data,
        };
      });
      setChannelOptions(channelOpt);
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      selectedChannel = defaultChannel?.value;
      setSelectedChannel(defaultChannel);
    }
  }, [props.planDetails?.data]);

  useEffect(() => {
    return () => {
      props.setDropFlowConfigData({});
    };
  }, []);

  const getDropConfigPayload = (planData, drops) => {
    const payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [planData?.plan_code],
          operator: "in",
        },
        ...getLevelFilters(planData, props.planLevels),
        {
          attribute_name: "date",
          value: [
            "'" +
              moment(planData.selling_period_sdate).format("YYYY-MM-DD") +
              "' and '" +
              moment(planData.selling_period_edate).format("YYYY-MM-DD") +
              "'",
          ],
          operator: "between",
        },
        {
          attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
          value: drops,
          prefix: "levels",
          operator: "in",
        },
        {
          attribute_name: "channel",
          value: planData?.channel,
          operator: "in",
          prefix: "levels",
        },
        {
          attribute_name: "sub_channel",
          value: planData?.sub_channel
            ? planData?.sub_channel
            : planData?.channel,
          operator: "in",
          prefix: "levels",
        },
      ],
      compare_type: planData?.compare_year,
      compare_season: planData?.compare_season || "",
    };
    if (planData?.data_pull_source) {
      payload.data_pull_source = planData?.data_pull_source;
    }
    return payload;
  };

  const getDropConfiguration = async () => {
    const planData = props.planDetails?.data;
    const drops = [];
    for (
      let index = 1;
      index <=
      planData[
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ];
      index++
    ) {
      drops.push(
        planData[
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_` + index
        ]
      );
    }
    try {
      setLoading(true);
      if (props.screenConfiguration["2.1"]?.show_drop_after_cluster) {
        // if (props.invalidL3Clusters?.length > 0) {
        //   props.addSnack({
        //     message: `Penetration exceeding/less than 100% for ${props.invalidL3Clusters.join(
        //       ","
        //     )}`,
        //     options: {
        //       variant: "warning",
        //     },
        //   });
        // }
        let updateCluster = await props.updateClusterOptData(
          {
            cluster_plan_data: props.clusterData.cluster_plan_data,
            is_update_plan_step: true,
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
        props.setIsClusterChanged(false);
        if (updateCluster?.data?.status) {
          const payload = getDropConfigPayload(planData, drops);
          let dropConfiguration = {};
          if (
            props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart"
          ) {
            dropConfiguration = await props.optimizeDropFlowConfiguration(
              payload,
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort"
            );
          } else {
            let fetchDropConfigPayload = getOptimizeDropConfigPayload(
              props.planDetails?.data,
              props.planLevels,
              props.isLevel2Required,
              props.screenConfiguration?.["2.1"]?.budget_optimization_level,
              props.screenConfiguration
            );
            dropConfiguration = await props.fetchDropConfig(
              fetchDropConfigPayload
            );
          }
          //if dropconfiguration api is successful, call fetch-drops api
          if (dropConfiguration?.data?.data?.status) {
            props.addSnack({
              message: dropConfiguration?.data?.data?.message,
              options: {
                variant: "success",
              },
            });
            fetchTableData();
          } else {
            props.addSnack({
              message: dropConfiguration?.data?.data?.message,
              options: {
                variant: "error",
              },
            });
            setLoading(false);
          }
        }
      } else {
        let payloadData = getUpdateBudgetPayload(
          props.planDetails?.data,
          props.BudgetLevel2Instance,
          props.maxMonths,
          props.monthMappingList
        );
        setLoading(true);
        let response = await props.updateBudgetL2Data(
          {
            plan_budget_data: payloadData,
          },
          props.planDetails?.data?.plan_code
        );
        if (
          response?.data?.status &&
          (!props.showLevel3 || props.isValueChanged)
        ) {
          try {
            let fetchDropConfigPayload = getOptimizeDropConfigPayload(
              props.planDetails?.data,
              props.planLevels,
              props.isLevel2Required,
              props.screenConfiguration?.["2.1"]?.budget_optimization_level,
              props.screenConfiguration
            );
            let dropConfiguration = await props.fetchDropConfig(
              fetchDropConfigPayload,
              props.planDetails?.data?.plan_code
            );
            props.setIsValueChanged(false);
            //if dropconfiguration api is successful, call fetch-drops api
            if (dropConfiguration?.data?.data?.status) {
              props.addSnack({
                message: dropConfiguration?.data?.data?.message,
                options: {
                  variant: "success",
                },
              });
              fetchTableData();
            } else {
              props.addSnack({
                message: dropConfiguration?.data?.data?.message,
                options: {
                  variant: "error",
                },
              });
              setLoading(false);
            }
          } catch (err) {
            setLoading(false);
            props.addSnack({
              message: "Something went wrong",
              options: {
                variant: "error",
              },
            });
          }
        } else {
          fetchTableData();
        }
      }
    } catch (error) {
      props.addSnack({
        message: `${
          props.screenConfiguration?.common?.drop_key || "drop"
        } config optimization failed`,
        options: {
          variant: "error",
        },
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    getDropConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.dropConfigLoader) {
      setLoading(false);
    }
  }, [props.dropConfigLoader]);

  useEffect(() => {
    if (props.dropFlowData?.data?.length) {
      let columnData = cloneDeep(props.dropFlowData?.columns);
      let cols = agGridColumnFormatter(
        cloneDeep(columnData),
        props.columnHeaderJson
      );
      //making noteditable based on drop
      formatEditableColumnBasedOnDrop(cols);
      const levelsData = configureLevels(
        props.planDetails?.data,
        props.levelsJson,
        props.dropFlowData?.data
      );
      let formValues = {};
      Object.keys(props.levelsJson).forEach((level) => {
        if (!isEmpty(levelsData?.selectedValue?.[level])) {
          formValues[level] = levelsData?.selectedValue?.[level]?.label;
        }
      });
      if (props.optimizationLevels.includes("carryover")) {
        const level3Data = configureL3level(
          levelsData,
          props.dropFlowData?.data,
          props.levelThreeOptions
        );
        setLevelThreeOptions(level3Data);
        setLevel3value(level3Data?.[0]);
      }
      formData.current = formValues;
      setLevelsOptions(levelsData?.options);
      setLevelSelected(levelsData?.selectedValue);
      //Table data mapping logic
      const dropFlowTableData = props.dropFlowData?.data;
      let tableData = [],
        tableObj = {};
      dropFlowTableData.forEach((item, i) => {
        tableObj = {};
        let totalFlowLy = 0,
          totalFlowTy = 0,
          totalBudgetLy = 0,
          totalBudgetTy = 0;
        tableObj["l0_name"] = item.l0_name;
        tableObj["l1_name"] = item.l1_name;
        tableObj["l2_name"] = item.l2_name;
        tableObj["l3_name"] = item.l3_name;
        tableObj["channel"] = item.channel;
        tableObj["sub_channel"] = item.sub_channel;
        tableObj[props.screenConfiguration?.common?.drop_key || "drop"] =
          item[props.screenConfiguration?.common?.drop_key || "drop"];
        //calculating flow total here
        for (
          let i = 1;
          i <=
          props.planDetails?.data?.[
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          ];
          i++
        ) {
          totalFlowLy +=
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_penetration_ly`
              ]
            ) || 0;
          totalFlowTy +=
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_penetration_ty`
              ]
            ) || 0;
          tableObj[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_penetration_ty`
          ] =
            (parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_penetration_ty`
              ]
            ) || 0) * 100;
          tableObj[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_penetration_ly`
          ] =
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_penetration_ly`
              ]
            ) || 0;

          totalBudgetLy +=
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_budget_ly`
              ]
            ) || 0;
          totalBudgetTy +=
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_budget_ty`
              ]
            ) || 0;
          tableObj[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_budget_ty`
          ] =
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_budget_ty`
              ]
            ) || 0;
          tableObj[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_budget_ly`
          ] =
            parseFloat(
              item[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_budget_ly`
              ]
            ) || 0;
        }
        tableObj[
          `${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_penetration_ty`
        ] =
          parseFloat(
            item[
              `${
                props.screenConfiguration?.common?.drop_key || "drop"
              }_penetration_ty`
            ] || 0
          ) * 100;
        tableObj[
          `${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_penetration_ly`
        ] = parseFloat(
          item[
            `${
              props.screenConfiguration?.common?.drop_key || "drop"
            }_penetration_ly`
          ] || 0
        );
        tableObj["receipt$_ly"] = parseFloat(item["receipt$_ly"] || 0);
        tableObj["receipt$_ty"] = parseFloat(item["receipt$_ty"] || 0);
        tableObj["chan_total_budget_ty"] = parseFloat(
          item["total_budget_ty"] || 0
        );
        tableObj["chan_total_budget_ly"] = parseFloat(
          item["total_budget_ly"] || 0
        );
        tableObj["total_penetration_ly"] = totalFlowLy;
        tableObj["total_penetration_ty"] = totalFlowTy;
        tableObj["total_budget_ly"] = totalBudgetLy;
        tableObj["total_budget_ty"] = totalBudgetTy;
        tableObj["carryover_flag"] = item.carryover_flag;
        tableObj["flow_count"] = item.flow_count;
        tableObj["uniqueID"] =
          item.l1_name +
          item.l2_name +
          item.l3_name +
          item.channel +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.carryover_flag +
          i;
        tableData.push(tableObj);
      });
      const updatedData = getFooterRowForDropsTable(
        tableData,
        false,
        props,
        false
      );
      setDropFlowConfigurationTableData(updatedData);
      setLoading(false);
    }
  }, [props.dropFlowData]);

  useEffect(() => {
    if (dropFlowConfigurationTableColumns?.length) {
      dropFlowConfigurationTableColumns.forEach((col) => {
        if (col.accessor.includes("_pen")) {
          col.sub_headers.map((sub) => {
            if (percentageView) {
              sub.is_hidden = false;
            } else {
              sub.is_hidden = true;
            }
          });
        }
        if (
          col.accessor.includes("_budget") ||
          col.accessor.includes("receipt$")
        ) {
          col.sub_headers.map((sub) => {
            if (percentageView) {
              sub.is_hidden = true;
            } else {
              sub.is_hidden = false;
            }
          });
        }
      });
      dropFlowConfigurationTableColumns = agGridColumnFormatter(
        dropFlowConfigurationTableColumns,
        props.columnHeaderJson
      );
      formatEditableColumnBasedOnDrop(dropFlowConfigurationTableColumns);
    }
  }, [percentageView]);

  const formatEditableColumnBasedOnDrop = (columns) => {
    columns.forEach((parCol) => {
      if (parCol.sub_headers?.length && parCol.column_name.includes("_pen")) {
        parCol.children.forEach((subCol) => {
          subCol.disableSortBy = true;
          if (
            subCol.column_name.includes(
              props.screenConfiguration?.common?.flow_key || "flow"
            ) &&
            subCol.column_name.includes("ty")
          ) {
            subCol.cellRenderer = (instance) => {
              let cellData = { ...instance };
              cellData.value = instance.value;
              let drop =
                instance?.data?.[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ];
              let dropNum = 1;
              if (drop) {
                let dropSplit = drop.split("_");
                dropNum = parseInt(dropSplit[1]);
              }
              let flowSplit = subCol.column_name.split("_");
              //flowSplit = flowSplit[0].split("flow");
              let flowNum = parseInt(flowSplit[1] || 1);
              if (
                flowNum < dropNum ||
                instance?.data?.l3_name?.includes("Total")
              ) {
                return <div>{instance.value}</div>;
              } else {
                return (
                  <CellRenderers
                    cellData={cellData}
                    column={subCol}
                  ></CellRenderers>
                );
              }
            };
          }
        });
      }
    });
    setDropFlowConfigurationTableColumns(columns);
  };

  const fetchTableData = async () => {
    let plan = props.planDetails?.data;
    setDropFlowConfigurationTableData([]);
    const drops = [];
    for (
      let index = 1;
      index <=
      plan[
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ];
      index++
    ) {
      drops.push(index);
    }
    try {
      let payload = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [plan.plan_code],
            operator: "in",
          },
          {
            attribute_name:
              props.screenConfiguration?.common?.drop_key || "drop",
            operator: "in",
            value: [
              plan[
                `${
                  props.screenConfiguration?.common?.drop_key.includes("drop")
                    ? "drops"
                    : props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              ],
            ],
            prefix: "levels",
          },
        ],
        agg_type: "l3_level",
      };
      let dropsDataResp = await props.getDropPlanData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setDropFlowConfigData(dropsDataResp?.data?.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      props.addSnack({
        message: `Fetching ${
          props.screenConfiguration?.common?.drop_key || "drop"
        }} plan details failed`,
        options: {
          variant: "error",
        },
      });
    }
  };

  const updateDropFlowConfigRowData = async (
    e,
    data,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
    let columnId = column.colDef.accessor;
    let row = data;
    let itemsToUpdate = [];
    setIsDropFlowChanged(true);
    AGInstance.current.api.forEachNode(function (rowNode, index) {
      const data = rowNode.data;
      //leaving the footer row
      if (!data.l3_name?.includes("Total")) {
        itemsToUpdate.push(data);
      }
    });
    itemsToUpdate.forEach((data) => {
      //finding the exact row if user has edited
      if (data.uniqueID === row.uniqueID) {
        data[columnId] =
          typeof newValue === "string" ? parseInt(newValue) : newValue;
        let flowTotal = 0,
          budgetTotal = 0;
        //if user has edited flow value recalculating flow total
        if (
          columnId.includes(
            props.screenConfiguration?.common?.flow_key || "flow"
          ) ||
          columnId === "drop_penetration_ty"
        ) {
          if (columnId === "drop_penetration_ty") {
            data["receipt$_ty"] =
              data["chan_total_budget_ty"] * (data[columnId] / 100);
          }
          for (
            let i = 1;
            i <=
            props.planDetails?.data?.[
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            ];
            i++
          ) {
            flowTotal += parseFloat(
              data[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_penetration_ty`
              ] || 0
            );
            data[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ty`
            ] =
              data["receipt$_ty"] *
              (data[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_penetration_ty`
              ] /
                100);
            budgetTotal += parseFloat(
              data[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}_budget_ty`
              ] || 0
            );
          }
          data["total_penetration_ty"] = flowTotal ? flowTotal / 100 : 0;
          data["total_budget_ty"] = budgetTotal;
        }
      }
    });
    let updatedData = getFooterRowForDropsTable(
      itemsToUpdate,
      false,
      props,
      false
    );
    setTimeout(() => {
      setDropFlowConfigurationTableData(updatedData);
    }, [100]);
    AGInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const loadTableInstance = (params) => {
    AGInstance.current = params;
  };

  const handleScaleUpDown = () => {
    setDropFlowConfigurationTableData([]);
    let tempData = [],
      newDropTotalPenPercentage = {},
      carryOverDroptotalPenPercentage = {};
    let formValues = formData.current;
    //getting total pen% for all drops for new & carryover type
    AGInstance.current.api?.forEachNode((node) => {
      if (!node?.data?.l3_name?.includes("Total")) {
        tempData.push(node.data);
        if (
          node?.data?.l3_name === level3Value?.value &&
          (!isChannelMultiple(props.planDetails?.data) ||
            isChannelMultiple(props.planDetails?.data)) &&
          ((!isEmpty(formValues) &&
            ((formValues.l1_name && formValues.l1_name === node.data.l1_name) ||
              !formValues.l1_name) &&
            ((formValues.l2_name && formValues.l2_name === node.data.l2_name) ||
              !formValues.l2_name)) ||
            isEmpty(formValues))
        ) {
          if (
            node.data[
              `${
                props.screenConfiguration?.common?.drop_key || "drop"
              }_penetration_ty`
            ]
          ) {
            if (
              node.data.carryover_flag === "New" ||
              node.data.carryover_flag === "new"
            ) {
              if (!newDropTotalPenPercentage?.[node.data.channel]) {
                newDropTotalPenPercentage[node.data.channel] = 0;
              }
              newDropTotalPenPercentage[node.data.channel] =
                newDropTotalPenPercentage?.[node.data.channel] +
                Math.round(
                  node.data[
                    `${
                      props.screenConfiguration?.common?.drop_key || "drop"
                    }_penetration_ty`
                  ] * 100
                ) /
                  100;
            } else {
              if (!carryOverDroptotalPenPercentage?.[node.data.channel]) {
                carryOverDroptotalPenPercentage[node.data.channel] = 0;
              }
              carryOverDroptotalPenPercentage[node.data.channel] =
                carryOverDroptotalPenPercentage[node.data.channel] +
                Math.round(
                  node.data[
                    `${
                      props.screenConfiguration?.common?.drop_key || "drop"
                    }_penetration_ty`
                  ] * 100
                ) /
                  100;
            }
          }
        }
      }
    });
    //scaleup down logic
    tempData.forEach((data) => {
      //Scale up down logic for drop rows
      let totalDropPen =
        data.carryover_flag === "New" || data.carryover_flag === "new"
          ? newDropTotalPenPercentage?.[data.channel]
          : carryOverDroptotalPenPercentage?.[data.channel];
      let dropPenValue = totalDropPen
        ? (parseFloat(
            Math.round(
              data[
                `${
                  props.screenConfiguration?.common?.drop_key || "drop"
                }_penetration_ty`
              ] * 100
            ) / 100
          ) /
            totalDropPen) *
          100
        : 0;
      data[
        `${
          props.screenConfiguration?.common?.drop_key || "drop"
        }_penetration_ty`
      ] = Math.round(dropPenValue * 100) / 100;
      data["receipt$_ty"] =
        data["chan_total_budget_ty"] *
        (data[
          `${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_penetration_ty`
        ] /
          100);

      let penTotal = 0,
        budgetTotal = 0,
        flowId = 0,
        totPenPercentage = 0,
        lockedPenPercentage = 0,
        unlockedPenPercentage = 0,
        remainingPenPercentage = 0;
      if (
        data?.l3_name === level3Value?.value &&
        ((!isEmpty(formValues) &&
          ((formValues.l1_name && formValues.l1_name === data.l1_name) ||
            !formValues.l1_name) &&
          ((formValues.l2_name && formValues.l2_name === data.l2_name) ||
            !formValues.l2_name)) ||
          isEmpty(formValues))
      ) {
        //Get maximum flow
        Object.keys(data).forEach((key) => {
          if (
            key.includes(
              props.screenConfiguration?.common?.flow_key || "flow"
            ) &&
            key.includes("_penetration_ty") &&
            !key.includes("_isLocked")
          ) {
            let maxFlowID = key.split("_")[1];
            //maxFlowID = maxFlowID.slice(maxFlowID.length - 1);
            flowId = maxFlowID > flowId ? maxFlowID : flowId;
            if (data[key]) {
              if (data[key + "_isLocked"]) {
                lockedPenPercentage = lockedPenPercentage + data[key];
              } else {
                totPenPercentage = totPenPercentage + data[key];
                unlockedPenPercentage = unlockedPenPercentage + data[key];
              }
            }
          }
        });
        remainingPenPercentage = 100 - lockedPenPercentage;
        //scaleupdown logic for flowPen% columns
        while (flowId && flowId > 0) {
          if (
            data[
              (props.screenConfiguration?.common?.flow_key || "flow") +
                "_" +
                flowId +
                "_penetration_ty"
            ] &&
            !data[
              (props.screenConfiguration?.common?.flow_key || "flow") +
                "_" +
                flowId +
                "_penetration_ty" +
                "_isLocked"
            ]
          ) {
            let value =
              (parseFloat(
                Math.round(
                  data[
                    (props.screenConfiguration?.common?.flow_key || "flow") +
                      "_" +
                      flowId +
                      "_penetration_ty"
                  ] * 100
                ) / 100
              ) /
                unlockedPenPercentage) *
              remainingPenPercentage;
            data[
              (props.screenConfiguration?.common?.flow_key || "flow") +
                "_" +
                flowId +
                "_penetration_ty"
            ] = Math.round(value * 100) / 100;
            data[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${flowId}_budget_ty`
            ] =
              data["receipt$_ty"] *
              (data[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${flowId}_penetration_ty`
              ] /
                100);
            penTotal =
              penTotal +
              data[
                (props.screenConfiguration?.common?.flow_key || "flow") +
                  "_" +
                  flowId +
                  "_penetration_ty"
              ];
            budgetTotal += parseFloat(
              data[
                `${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${flowId}_budget_ty`
              ] || 0
            );
          }
          flowId--;
        }
        data["total_penetration_ty"] = Math.round(penTotal / 100 || 0);
        data["total_budget_ty"] = budgetTotal;
      }
    });
    getFooterRowForDropsTable(tempData, false, props, false);
    setDropFlowConfigurationTableData(tempData);
    AGInstance?.current?.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const onChangeChannel = async (channel) => {
    selectedChannel = channel.value;
    setSelectedChannel(channel);
    AGInstance.current.api.onFilterChanged();
  };

  const handleLevelThreeChange = async (option) => {
    l3ValueSelected = option;
    setLevel3value(option);
    AGInstance.current.api.onFilterChanged();
  };

  const handleLevelsChange = (option, key) => {
    handlePlanLevelsChange(
      option,
      key,
      props.dropFlowData?.data,
      levelSelected,
      formData,
      levelsOptions,
      setLevelThreeOptions,
      setLevel3value,
      setLevelsOptions,
      setLevelSelected
    );
    AGInstance.current.api.onFilterChanged();
  };

  useEffect(() => {
    selectedChannel = channel?.value;
    l3ValueSelected = level3Value;
    if (AGInstance?.current?.api) {
      AGInstance.current.api.onFilterChanged();
    }
  }, [channel, AGInstance, level3Value]);

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    return isChannelMultiple(props.planDetails?.data) ||
      props.levelThreeOptions?.length > 1 ||
      props.planDetails?.data?.l1_name?.length > 1 ||
      props.planDetails?.data?.l2_name?.length > 1
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      // Filter based on channel
      if (node.data) {
        let defaultChannel = getDefaultChannelValue(
          channelOptions,
          props.planDetails?.data
        );
        let chan = channel?.value ? channel?.value : defaultChannel?.value;
        let formDataLevels = [];
        Object.keys(formData.current).forEach((formKey) => {
          if (Object.keys(props.levelsJson).includes(formKey)) {
            formDataLevels.push(formKey);
          }
        });
        if (formDataLevels?.length >= 1) {
          let filteredData = [];
          //filter table data based on selected filter values of different levels
          formDataLevels.forEach((level) => {
            if (
              formData.current[level] === node?.data?.[level] &&
              (level3Value?.value === node?.data?.l3_name ||
                (node?.data?.l3_name === "Total" &&
                  level3Value?.value === node?.data?.l3_name_key))
            ) {
              filteredData.push(node?.data?.[level]);
            }
          });
          //Return true if particular row matches levels(l0, l1, l2, etc) value with selected levels value
          return filteredData?.length === formDataLevels?.length;
        }
        if (isChannelMultiple(props.planDetails?.data) && level3Value?.value) {
          return (
            chan === node.data?.channel &&
            (level3Value?.value === node?.data?.l3_name ||
              (node?.data?.l3_name === "Total" &&
                level3Value?.value === node?.data?.l3_name_key))
          );
        } else if (isChannelMultiple(props.planDetails?.data)) {
          return chan === node.data?.channel;
        }
        return (
          level3Value?.value === node?.data?.l3_name ||
          (node?.data?.l3_name === "Total" &&
            level3Value?.value === node?.data?.l3_name_key)
        );
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedChannel, channel, level3Value, formData]
  );

  const fetchL3Data = async () => {
    props.setShowClusterLevel(false);
    await fetchOptimizeL3Data();
  };

  const handleOptimise = async () => {
    //TODO: APi integration of optimize & fetch review-across-drops table api
    props.set2_1_Loader(true);
    setLoading(true);
    props.setInitialLoadDepthChoice(true);
    props.setInitialLoadWedge(true);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_2(false);
    props.setFromDashboardScreen_2_3(false);
    props.setFromDashboardScreen_2_4(false);
    props.setShowReviewAcrossDropsTable(false);
    let footerData = dropFlowConfigurationTableData?.filter((row) => {
      return row.l3_name === "Total" && row.channel === channel?.value;
    });
    if (
      Math.round(footerData[0]?.drop_penetration_ty) > 100 ||
      Math.round(footerData[0]?.drop_penetration_ty) < 100
    ) {
      props.addSnack({
        message: "Penetration exceeding/less than 100",
        options: {
          variant: "warning",
        },
      });
    }
    let plan_sub_step = "optimization_table_l3_name";
    plan_sub_step = props.screenConfiguration["2.1"]?.show_drop_after_cluster
      ? "review_drop"
      : props.optimizationLevels?.[0]
      ? `optimization_table_${props.optimizationLevels?.[0]}`
      : "optimization_table_l3_name";
    let payload = {
      drop_flow_data: getDropFlowPayloadData(AGInstance, props),
      plan_sub_step: plan_sub_step,
      is_value_changed: isDropFlowChanged,
      is_update_plan_step: true,
      agg_type: "l3_level",
    };
    try {
      let response = await props.updateDropFlowData(
        payload,
        props.planDetails?.data?.plan_code
      );
      setIsDropFlowChanged(false);
      setLoading(false);
      if (response?.data?.status) {
        props.setEnableStep(2.1);
        props.closeDropConfiguration();
        if (!props.screenConfiguration["2.1"]?.show_drop_after_cluster) {
          props.setUpdateDropData(response?.data);
          onL3Optimise();
        } else {
          props.set2_1_Loader(false);
          scrollIntoView("review-across-drop-table");
          // after drop update calling l3 get and cluster get
          fetchL3Details(props.planDetails?.data?.plan_code, props, true);
          props.setCallCluster(true);
          props.setShowReviewAcrossDropsTable(true);
        }
      }
    } catch (error) {
      console.log("error:", error);
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Update drop configuartion failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const onL3Optimise = async () => {
    props.setShowLevel3(false);
    props.setShowLevel2(false);
    try {
      let deleteL3OptResponse = await props.deleteL3Optimization(
        {
          plan_code: props.planDetails?.data?.plan_code,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (deleteL3OptResponse?.data?.status) {
        fetchL3Data();
      }
    } catch (error) {
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Delete L3 optimization failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const onL3PollingSucess = () => {
    props.addSnack({
      message: `Successfully optimized ${props.columnHeaderJson?.l3_name} details`,
      options: {
        variant: "success",
      },
    });
    props.set2_1_Loader(false);
    if (props.screenConfiguration?.common?.final_level === "l2_name") {
      props.setShowLevel2(true);
    } else {
      props.setShowLevel3(true);
    }
    fetchL3Details(
      props.planDetails?.data?.plan_code,
      {
        ...props,
        currentTableLevel:
          props.screenConfiguration?.common?.final_level || "l3_name",
      },
      false,
      props.formData
    );
    props.closeDropConfiguration(false);
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

  const fetchOptimizeL3Data = async () => {
    try {
      let plan_sub_step = "optimization_table_l3_name";
      plan_sub_step = props.optimizationLevels.slice(1)?.[0]
        ? `optimization_table_${props.optimizationLevels.slice(1)?.[0]}`
        : "optimization_table_l3_name";
      props.optimisePayload.plan_sub_step = plan_sub_step;
      const optimizeResponse = await props.getOptimizeL3Data(
        props.optimisePayload,
        props.planDetails?.data?.plan_code
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

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  const updateClusterTable = async () => {
    setLoading(true);
    let plan_sub_step = "optimization_table_l3_name";
    plan_sub_step =
      props.screenConfiguration?.common?.endpoint_project_name ===
      "assort-smart"
        ? "review_drop"
        : props.optimizationLevels?.[0]
        ? `optimization_table_${props.optimizationLevels?.[0]}`
        : "optimization_table_l3_name";
    let payload = {
      drop_flow_data: getDropFlowPayloadData(AGInstance, props),
      plan_sub_step: plan_sub_step,
      is_value_changed: isDropFlowChanged,
      is_update_plan_step: true,
    };
    let response = await props.updateDropFlowData(
      payload,
      props.planDetails?.data?.plan_code
    );
    setIsDropFlowChanged(false);
    if (response?.data?.status) {
      fetchTableData();
    }
  };

  const lockCellApi = (cellProps, isLocked) => {
    let row = cellProps?.cellData?.data;
    let column = cellProps?.column?.column_name;
    dropFlowConfigurationTableData.forEach((data) => {
      if (data.drop === row.drop && data.channel === row.channel) {
        data[`${column}_isLocked`] = isLocked;
      }
    });
    setDropFlowConfigurationTableData(dropFlowConfigurationTableData);
    AGInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  let dropOrLaunch = attributeFormatter(
    props.screenConfiguration?.common?.drop_key || "drop"
  );

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      <LoadingOverlay loader={loading}>
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h3">{dropOrLaunch} Configuration</Typography>

            <IconButton
              aria-label="close"
              id="close-setupDrops-modal"
              onClick={() => props.closeDropConfiguration()}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={sharedClasses.flexAlignEndCenter}>
            {/* {props.dropType === "clusterTable" && (
              <Button
                variant="outlined"
                color="primary"
                id="save-cluster"
                onClick={() => updateClusterTable()}
              >
                <Save />
              </Button>
            )} */}
            <Button
              variant="outlined"
              color="primary"
              className={sharedClasses.scaleUpDownBtn}
              onClick={handleScaleUpDown}
              title={"Scale up/down"}
              id="budget-scale-up-down"
            >
              <CompareArrowsOutlinedIcon />
            </Button>
            <Switch
              checked={percentageView ? true : false}
              onChange={(e) => {
                setPercentageView(!percentageView);
              }}
              disabled={dropFlowConfigurationTableData?.length ? false : true}
              id="switch-size-percenatge-view"
              leftLabel="Percentage"
              rightLabel="Budget $"
            />
          </div>
          <div>
            {dropFlowConfigurationTableColumns.length > 0 && (
              <>
                <div className={sharedClasses.heading}>
                  {Object.keys(props.levelsJson).map((levelKey) => {
                    return (
                      levelsOptions[levelKey]?.length > 0 &&
                      filterView(
                        props.columnHeaderJson?.[levelKey],
                        levelKey,
                        levelsOptions[levelKey],
                        handleLevelsChange,
                        levelSelected[levelKey],
                        sharedClasses.formContainer,
                        sharedClasses.inputLabel
                      )
                    );
                  })}
                  {levelThreeOptions?.length
                    ? filterView(
                        props.columnHeaderJson?.l3_name,
                        "l3_name",
                        levelThreeOptions,
                        handleLevelThreeChange,
                        level3Value,
                        sharedClasses.formContainer,
                        sharedClasses.inputLabel
                      )
                    : null}
                  {isChannelMultiple(props.planDetails?.data) &&
                    channelOptions?.length > 1 &&
                    dropFlowConfigurationTableData?.length > 0 &&
                    filterView(
                      "Channel",
                      "channel",
                      channelOptions,
                      onChangeChannel,
                      channel
                    )}
                </div>
                <AgGridTable
                  rowdata={dropFlowConfigurationTableData || []}
                  columns={dropFlowConfigurationTableColumns}
                  loadTableInstance={loadTableInstance}
                  onBlur={updateDropFlowConfigRowData}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  uniqueRowId={"uniqueID"}
                  sideBar={false}
                  pagination={false}
                  customCellRenderer={(cellProps) =>
                    assortAgGridCustomCellRenderer(cellProps, "drop-flow-table")
                  }
                  noEditableCustomCellRender={(cellProps) => {
                    if (cellProps.colDef.column_name === "drop") {
                      return attributeFormatter(cellProps?.value);
                    }
                  }}
                  tableId={"drop-flow-table"}
                  enableRowSpan={true}
                  rowSpanColumn={[
                    "l3_name",
                    "l2_name",
                    props.screenConfiguration?.common?.drop_key || "drop",
                    "carryover_flag",
                  ]} // can send multiple columns
                  getRowData={getRowData}
                  lockCellApi={(cellProps, isLocked) =>
                    lockCellApi(cellProps, isLocked)
                  }
                  staticColId={true}
                />
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            variant="contained"
            id="generate-wedge"
            onClick={handleOptimise}
            disabled={dropFlowConfigurationTableData?.length > 0 ? false : true}
          >
            {props.screenConfiguration["2.1"]?.show_drop_after_cluster
              ? "Save"
              : "Optimize for " +
                `${
                  props?.screenConfiguration?.[
                    "2.1"
                  ]?.budget_optimization_level?.includes("l1_name")
                    ? props?.columnHeaderJson?.l2_name || ""
                    : props?.columnHeaderJson?.l3_name || ""
                }`}
          </Button>
        </DialogActions>
      </LoadingOverlay>
    </Dialog>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    dropFlowData: planInitialServiceActions.dropFlowDataSelector(state),
    reviewBudgetAcrossDropsData: planInitialServiceActions.reviewBudgetAcrossDropsSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    updateDropData: planInitialServiceActions.updateDropDataSelector(state),
    deleteOptimizationData: planInitialServiceActions.deleteOptimizationDataSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      updateBudgetL2Data,
      updateBudgetL2DropData,
      getOptimizeL3Data,
      addSnack,
      optimizeDropFlowConfiguration,
      set2_1_Loader,
      getDropPlanData,
      setDropFlowConfigData,
      getReviewBudgetAcrossDropsData,
      setReviewBudgetAcrossDropsData,
      updateClusterOptData,
      updateDropFlowData,
      fetchDropConfig,
      deleteL3Optimization,
      setDeleteOptimizationData,
      setUpdateDropData,
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
)(DropFlowConfiguration);
