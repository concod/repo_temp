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

const DropFlowConfiguration = (props) => {
  const sharedClasses = useStyles();
  const [
    dropFlowConfigurationTableData,
    setDropFlowConfigurationTableData,
  ] = useState([]);
  const [
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
  const AGInstance = useRef({});
  const formData = useRef({});
  let selectedChannel = {};
  let l3ValueSelected = {};

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

  const getDropConfiguration = async () => {
    const planData = props.planDetails?.data;
    const drops = [];
    for (
      let index = 1;
      index <=
      planData[
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ];
      index++
    ) {
      drops.push(
        planData[
          `${props.screenConfiguration?.common?.drop_key || "drops"}_` + index
        ]
      );
    }
    try {
      setLoading(true);
      if (props.invalidL3Clusters?.length > 0) {
        props.addSnack({
          message: `Penetration exceeding/less than 100% for ${props.invalidL3Clusters.join(
            ","
          )}`,
          options: {
            variant: "warning",
          },
        });
      }
      let updateCluster = await props.updateClusterOptData(
        {
          cluster_plan_data: props.clusterData.cluster_plan_data,
          is_update_plan_step: true,
          plan_sub_step: isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
            ? "review_drop"
            : "aps_st_table",
          is_value_changed: props.isClusterChanged,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setIsClusterChanged(false);
      if (updateCluster?.data?.status) {
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
              attribute_name:
                props.screenConfiguration?.common?.drop_key || "drop",
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
        const dropConfiguration = await props.optimizeDropFlowConfiguration(
          payload
        );
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
      let columnData = props.dropFlowData?.columns;
      let cols = agGridColumnFormatter(
        cloneDeep(columnData),
        props.columnHeaderJson
      );
      //making noteditable based on drop
      cols.forEach((parCol) => {
        if (parCol.sub_headers?.length) {
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
      const level3Data = configureL3level(
        levelsData,
        props.dropFlowData?.data,
        props.levelThreeOptions
      );
      setLevelThreeOptions(level3Data);
      setLevel3value(level3Data[0]);
      formData.current = formValues;
      setLevelsOptions(levelsData?.options);
      setLevelSelected(levelsData?.selectedValue);
      //Table data mapping logic
      const dropFlowTableData = props.dropFlowData?.data;
      let tableData = [],
        tableObj = {};
      dropFlowTableData.forEach((item) => {
        tableObj = {};
        let totalFlowLy = 0,
          totalFlowTy = 0;
        tableObj["l0_name"] = item.l0_name;
        tableObj["l1_name"] = item.l1_name;
        tableObj["l2_name"] = item.l2_name;
        tableObj["l3_name"] = item.l3_name;
        tableObj["channel"] = item.channel;
        tableObj[props.screenConfiguration?.common?.drop_key || "drop"] =
          item[props.screenConfiguration?.common?.drop_key || "drop"];
        //calculating flow total here
        for (
          let i = 1;
          i <=
          props.planDetails?.data?.[
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
        tableObj["total_penetration_ly"] = totalFlowLy;
        tableObj["total_penetration_ty"] = totalFlowTy;
        tableObj["carryover_flag"] = item.carryover_flag;
        tableObj["uniqueID"] =
          item.l1_name +
          item.l2_name +
          item.l3_name +
          item[props.screenConfiguration?.common?.drop_key || "drop"] +
          item.carryover_flag;
        tableData.push(tableObj);
      });
      getFooterRowForDropsTable(tableData, false, props);
      setDropFlowConfigurationTableColumns(cols);
      setDropFlowConfigurationTableData(tableData);
      setLoading(false);
    }
  }, [props.dropFlowData]);

  const fetchTableData = async () => {
    let plan = props.planDetails?.data;
    setDropFlowConfigurationTableData([]);
    const drops = [];
    for (
      let index = 1;
      index <=
      plan[`${props.screenConfiguration?.common?.drop_key || "drops"}_count`];
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
            value: drops,
            prefix: "levels",
          },
        ],
      };
      let dropsDataResp = await props.getDropPlanData(payload);
      props.setDropFlowConfigData(dropsDataResp?.data?.data);
    } catch (error) {
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
    let columnId = column.colId;
    let row = data;
    let itemsToUpdate = [];
    setIsDropFlowChanged(true);
    AGInstance.current.api.forEachNode(function (rowNode, index) {
      const data = rowNode.data;
      //leaving the footer row
      if (!data.l3_name.includes("Total")) {
        itemsToUpdate.push(data);
      }
    });
    itemsToUpdate.forEach((data) => {
      //finding the exact row if user has edited
      if (data.uniqueID === row.uniqueID) {
        data[columnId] =
          typeof newValue === "string" ? parseInt(newValue) : newValue;
        let flowTotal = 0;
        //if user has edited flow value recalculating flow total
        if (
          columnId.includes(
            props.screenConfiguration?.common?.flow_key || "flow"
          )
        ) {
          for (
            let i = 1;
            i <=
            props.planDetails?.data?.[
              `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
          }
          data["total_penetration_ty"] = flowTotal ? flowTotal / 100 : 0;
        }
      }
    });
    getFooterRowForDropsTable(itemsToUpdate, false, props);
    setTimeout(() => {
      setDropFlowConfigurationTableData(itemsToUpdate);
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
      newDropTotalPenPercentage = 0,
      carryOverDroptotalPenPercentage = 0;
    let formValues = formData.current;
    //getting total pen% for all drops for new & carryover type
    AGInstance.current.api.forEachNode((node) => {
      if (!node.data.l3_name.includes("Total")) {
        tempData.push(node.data);
        if (
          node.data.l3_name === level3Value.value &&
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
              newDropTotalPenPercentage =
                newDropTotalPenPercentage +
                Math.round(
                  node.data[
                    `${
                      props.screenConfiguration?.common?.drop_key || "drop"
                    }_penetration_ty`
                  ] * 100
                ) /
                  100;
            } else {
              carryOverDroptotalPenPercentage =
                carryOverDroptotalPenPercentage +
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
      let penTotal = 0,
        flowId = 0,
        totPenPercentage = 0;
      if (
        data.l3_name === level3Value.value &&
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
            key.includes("_penetration_ty")
          ) {
            let maxFlowID = key.split("_")[1];
            //maxFlowID = maxFlowID.slice(maxFlowID.length - 1);
            flowId = maxFlowID > flowId ? maxFlowID : flowId;
            if (data[key]) {
              totPenPercentage = totPenPercentage + data[key];
            }
          }
        });
        //scaleupdown logic for flowPen% columns
        while (flowId && flowId > 0) {
          if (
            data[
              (props.screenConfiguration?.common?.flow_key || "flow") +
                "_" +
                flowId +
                "_penetration_ty"
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
                totPenPercentage) *
              100;
            data[
              (props.screenConfiguration?.common?.flow_key || "flow") +
                "_" +
                flowId +
                "_penetration_ty"
            ] = Math.round(value * 100) / 100;
            penTotal =
              penTotal +
              data[
                (props.screenConfiguration?.common?.flow_key || "flow") +
                  "_" +
                  flowId +
                  "_penetration_ty"
              ];
          }
          flowId--;
        }
        data["total_penetration_ty"] = Math.round(penTotal / 100 || 0);
        //Scale up down logic for drop rows
        let totalDropPen =
          data.carryover_flag === "New" || data.carryover_flag === "new"
            ? newDropTotalPenPercentage
            : carryOverDroptotalPenPercentage;
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
      }
    });
    getFooterRowForDropsTable(tempData, false, props);
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
        if (isChannelMultiple(props.planDetails?.data)) {
          return (
            chan === node.data?.channel &&
            (level3Value?.value === node?.data?.l3_name ||
              (node?.data?.l3_name === "Total" &&
                level3Value?.value === node?.data?.l3_name_key))
          );
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
    let payload = {
      drop_flow_data: getDropFlowPayloadData(AGInstance, props),
      plan_sub_step: "review_drop",
      is_value_changed: isDropFlowChanged,
      is_update_plan_step: true,
    };
    let response = await props.updateDropFlowData(payload);
    setIsDropFlowChanged(false);
    if (response?.data?.status) {
      props.closeDropConfiguration();
      scrollIntoView("review-across-drop-table");
      props.setShowReviewAcrossDropsTable(true);
    }
  };

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  const updateClusterTable = async () => {
    setLoading(true);
    let payload = {
      drop_flow_data: getDropFlowPayloadData(AGInstance, props),
      plan_sub_step: "review_drop",
      is_value_changed: isDropFlowChanged,
      is_update_plan_step: true,
    };
    let response = await props.updateDropFlowData(payload);
    setIsDropFlowChanged(false);
    if (response?.data?.status) {
      fetchTableData();
    }
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
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              id="save-cluster"
              onClick={() => updateClusterTable()}
            >
              <Save />
            </Button>
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
                  {levelThreeOptions?.length &&
                    filterView(
                      props.columnHeaderJson?.l3_name,
                      "l3_name",
                      levelThreeOptions,
                      handleLevelThreeChange,
                      level3Value,
                      sharedClasses.formContainer,
                      sharedClasses.inputLabel
                    )}
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
                  tableId={"drop-flow-table"}
                  enableRowSpan={true}
                  rowSpanColumn={[
                    "l3_name",
                    props.screenConfiguration?.common?.drop_key || "drop",
                    "carryover_flag",
                  ]} // can send multiple columns
                  getRowData={getRowData}
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
            Save
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
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DropFlowConfiguration);
