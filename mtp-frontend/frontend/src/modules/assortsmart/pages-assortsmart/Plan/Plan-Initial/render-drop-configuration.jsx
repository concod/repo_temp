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
  fetchDropsData,
  getOptimizeL3Data,
  updateBudgetL2Data,
  updateBudgetL2DropData,
  deleteL3Optimization,
  setDeleteOptimizationData,
  setUpdateDropData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import {
  filterView,
  getDefaultChannelValue,
  isChannelMultiple,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { attributeFormatter } from "../../../utils-assortsmart/utilityFunctions";
import { Save } from "@mui/icons-material";
import { getDropFlowLevelPayloadData } from "./plan-initial-functions";
import {
  lockCellCustomConditionFn,
  lockCellApi,
} from "./budget-cluster-functions";

const RenderDropConfiguration = (props) => {
  const sharedClasses = useStyles();
  const [dropConfigurationTableData, setDropConfigurationTableData] = useState(
    []
  );
  const [
    dropConfigurationTableColumns,
    setDropConfigurationTableColumns,
  ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channelOptions, setChannelOptions] = useState([]);
  const [channel, setSelectedChannel] = useState(null);
  const AGInstance = useRef({});
  let selectedChannel = {};

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
    fetchTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (props.dropConfigLoader) {
      setLoading(false);
    }
  }, [props.dropConfigLoader]);

  const fetchTableData = async () => {
    let plan = props.planDetails?.data;
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [plan.plan_code],
          operator: "in",
        },
        {
          attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
          operator: "in",
          value: [plan.drops_count],
        },
      ],
    };
    let res = await props.fetchDropsData(
      payload,
      props.planDetails?.data?.plan_code
    );
    let dropsData = res?.data?.data;
    if (!isEmpty(dropsData)) {
      let columnData = cloneDeep(dropsData?.columns);
      let cols = agGridColumnFormatter(columnData, props.columnHeaderJson);
      cols.forEach((parCol) => {
        if (parCol.sub_headers?.length) {
          parCol.children.forEach((subCol) => {
            subCol.disableSortBy = true;
            if (subCol.column_name.includes("pen%")) {
              subCol.is_lockable = true;
            }
          });
        }
      });
      setDropConfigurationTableColumns(cols);
      setDataForDropConfigurationTable(dropsData);
      setLoading(false);
    }
  };
  const setDataForDropConfigurationTable = (dropsData) => {
    if (!isEmpty(dropsData?.data)) {
      let filteredDataWithoutTotalChannel = [];
      // Remove total from dropsData
      dropsData?.data.forEach((data) => {
        if (data.channel !== "Total") {
          filteredDataWithoutTotalChannel.push(data);
        }
      });
      // Group Data based on channel
      const groupBy_properties = ["channel"];
      if (props.planDetails?.data?.l1_name?.length > 0) {
        groupBy_properties.push("l1_name");
      }
      const groupByChannel = groupByCustom({
        Group: filteredDataWithoutTotalChannel,
        By: groupBy_properties,
      });
      let setupDropsTempData = Object.keys(groupByChannel).map((obj) => {
        // creating a new object
        let item = {},
          penTotal = 0,
          recTotal = 0;
        groupByChannel[obj].forEach((groupedData) => {
          // Select particular drop data
          let dropID = parseInt(
            groupedData?.attribute_value?.drop.split(
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_`
            )[1]
          );
          item[`pen%_drop ${dropID}`] =
            groupedData.attribute_value.pen_ty * 100;
          item[`receipt$_drop ${dropID}`] =
            groupedData.attribute_value.receipt$_ty;
          item["plan_code"] = groupedData.plan_code;
          item["l0_name"] = groupedData.l0_name;
          item["l1_name"] = groupedData.l1_name;
          item["l2_name"] = groupedData.l2_name;
          item["channel"] = groupedData.channel;
          item[`attribute_value_${dropID}`] = {
            l2_budget_ly: groupedData.attribute_value.l2_budget_ly,
            plan_budget_drop_id: groupedData.plan_budget_drop_id,
            pen_ly: groupedData.attribute_value.pen_ly,
            receipt$_ly: groupedData.attribute_value.receipt$_ly,
          };
          penTotal = penTotal + groupedData.attribute_value.pen_ty;
          recTotal = recTotal + groupedData.attribute_value.receipt$_ty;
          item["total_l2_budget_ty"] =
            groupedData.attribute_value.total_l2_budget_ty;
          item["total_l2_budget_ly"] =
            groupedData.attribute_value.total_l2_budget_ly;
          item["uniqueID"] = dropID + groupedData.channel;
        });
        item["pen%_Total"] = penTotal;
        item["receipt$_Total"] = recTotal;
        return item;
      });
      setDropConfigurationTableData(setupDropsTempData);
    }
  };

  const updateDropConfigRowData = async (
    e,
    data,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
    setDropConfigurationTableData([]);
    let columnId = column.colDef.accessor;
    let row = data;
    let itemsToUpdate = [];
    AGInstance.current.api.forEachNode(function (rowNode, index) {
      const data = rowNode.data;
      if (data.channel === row.channel) {
        data[columnId] =
          typeof newValue === "string" ? parseFloat(newValue) : newValue;
        let penTotal = 0,
          recTotal = 0,
          dropID = 0;
        Object.keys(data).forEach((key) => {
          // check and get the highest dropID
          let ID = parseInt(key.split("pen%_drop ")[1]);
          dropID = ID > dropID ? ID : dropID;
        });
        // Calculation Pen% drop and Receipt$ drop Total
        while (dropID && dropID > 0) {
          if (columnId.includes("receipt$_drop")) {
            data[`pen%_drop ${dropID}`] = Math.round(
              (data[`receipt$_drop ${dropID}`] / data[`total_l2_budget_ty`]) *
                100
            );
          }
          if (columnId.includes("pen%_drop")) {
            data[`receipt$_drop ${dropID}`] =
              (data[`pen%_drop ${dropID}`] / 100) * data[`total_l2_budget_ty`];
          }
          penTotal = penTotal + data[`pen%_drop ${dropID}`];
          recTotal = recTotal + data[`receipt$_drop ${dropID}`];
          dropID--;
        }
        penTotal = penTotal || 0;
        recTotal = recTotal || 0;
        data["pen%_Total"] = Math.round(penTotal) / 100;
        data["receipt$_Total"] = recTotal;
      }
      itemsToUpdate.push(data);
    });
    setDropConfigurationTableData(itemsToUpdate);
    AGInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const updateDropData = async (plan_budget_drop_data, callFetchData) => {
    const dropData = props.updateBudgetL2DropData(
      {
        plan_budget_drop_data,
      },
      props.planDetails?.data?.plan_code
    );
    dropData
      .then((response) => {
        props.setUpdateDropData(response);
        if (callFetchData) {
          fetchTableData();
        }
      })
      .catch((error) => {
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
      props.setShowClusterLevel(false);
      await props.fetchOptimizeL3Data();
    };
    if (props.updateDropData?.status && props.deleteOptimizationData?.status) {
      fetchL3Data();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.deleteOptimizationData, props.updateDropData]);

  const onL3Optimise = async () => {
    let plan_budget_drop_data = getDropFlowLevelPayloadData(AGInstance, props);
    setLoading(true);
    props.setShowLevel3(false);
    props.setShowLevel2(false);
    updateDropData(plan_budget_drop_data);
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
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    deleteL3OptResponse
      .then((response) => {
        props.setDeleteOptimizationData(response);
      })
      .catch((error) => {
        props.addSnack({
          message: "Delete optimization data failed",
          options: {
            variant: "error",
          },
        });
      });
  };

  const loadTableInstance = (params) => {
    AGInstance.current = params;
  };
  const scaleUpDown = () => {
    setDropConfigurationTableData([]);
    if (AGInstance?.current?.api) {
      let tempData = [];
      AGInstance.current.api.forEachNode((node) => {
        if (node.data.l3_name !== "Total") {
          tempData.push(node.data);
        }
      });

      tempData.forEach((row, index) => {
        let penTotal = 0,
          budgetTotal = 0,
          dropId = 0,
          totPenPercentage = 0,
          lockPen = 0,
          unlockPen = 0;
        Object.keys(row).forEach((key) => {
          // check and get the highest dropID
          let ID = parseInt(key.split("pen%_drop ")[1]);
          dropId = ID > dropId ? ID : dropId;
          if (key.includes("pen%_drop ")) {
            let lockKey = `${row.uniqueID}${key}`;
            if (row?.cellLocked?.[`${lockKey}`]) {
              lockPen += row[key];
            } else {
              unlockPen += row[key];
            }
            totPenPercentage = totPenPercentage + row[key];
          }
        });
        if (lockPen > 100) {
          props.addSnack({
            message: `Locked percentage cannot be more than 100%`,
            options: {
              variant: "error",
            },
          });
        } else if (unlockPen == 0) {
          props.addSnack({
            message: "Total Non-Locked penetration should not be 0",
            options: {
              variant: "error",
            },
          });
        } else {
          while (dropId && dropId > 0) {
            let lockKey = `${row.uniqueID}pen%_drop ${dropId}`;
            let value = parseFloat(
              Math.round(row["pen%_drop " + dropId] * 100) / 100
            );
            if (!row?.cellLocked?.[`${lockKey}`]) {
              value = (value / unlockPen) * (100 - lockPen);
            }
            row["pen%_drop " + dropId] = Math.round(value * 100) / 100;
            row["receipt$_drop " + dropId] =
              (row["pen%_drop " + dropId] / 100) * row[`total_l2_budget_ty`];
            penTotal = penTotal + row["pen%_drop " + dropId];
            budgetTotal = budgetTotal + row["receipt$_drop " + dropId];
            dropId--;
          }
          row["pen%_Total"] = Math.round(penTotal) / 100;
          row["receipt$_Total"] = budgetTotal;
        }
      });
      setTimeout(() => {
        setDropConfigurationTableData(tempData);
      }, [100]);
      AGInstance?.current?.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  const onChangeChannel = async (channel) => {
    selectedChannel = channel.value;
    setSelectedChannel(channel);
    AGInstance.current.api.onFilterChanged();
  };

  useEffect(() => {
    selectedChannel = channel?.value;
    if (AGInstance?.current?.api) {
      AGInstance.current.api.onFilterChanged();
    }
  }, [channel, AGInstance]);

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    return isChannelMultiple(props.planDetails?.data) ? true : false;
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
        return chan === node.data?.channel;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedChannel, channel, props.planDetails?.data]
  );

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
            {isChannelMultiple(props.planDetails?.data) &&
              channelOptions?.length > 1 &&
              dropConfigurationTableData?.length > 0 &&
              filterView(
                "Channel",
                "channel",
                channelOptions,
                onChangeChannel,
                channel,
                sharedClasses.formContainer,
                sharedClasses.inputLabel
              )}
            <div className={sharedClasses.rightEnd}>
              <Button
                variant="outlined"
                color="primary"
                className={sharedClasses.scaleUpDownBtn}
                onClick={scaleUpDown}
                title={"Scale up/down"}
                id="budget-scale-up-down"
              >
                <CompareArrowsOutlinedIcon />
              </Button>
            </div>
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
          <div>
            {dropConfigurationTableColumns.length > 0 && (
              <>
                <AgGridTable
                  rowdata={dropConfigurationTableData || []}
                  columns={dropConfigurationTableColumns}
                  loadTableInstance={loadTableInstance}
                  onBlur={updateDropConfigRowData}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  uniqueRowId={"uniqueID"}
                  sideBar={false}
                  pagination={false}
                  isCellLockable={true}
                  lockCellApi={(cellProps, isLocked) =>
                    lockCellApi(cellProps, isLocked, props.AGInstance)
                  }
                  lockCellCustomConditionFn={lockCellCustomConditionFn}
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
            onClick={() => onL3Optimise()}
            disabled={
              dropConfigurationTableData?.length > 0 && !loading ? false : true
            }
          >
            Optimize for{" "}
            {props?.screenConfiguration?.[
              "2.1"
            ]?.budget_optimization_level?.includes("l1_name")
              ? props?.columnHeaderJson?.l2_name || ""
              : props?.columnHeaderJson?.l3_name || ""}
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
    updateDropData: planInitialServiceActions.updateDropDataSelector(state),
    deleteOptimizationData: planInitialServiceActions.deleteOptimizationDataSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchDropsData,
      updateBudgetL2Data,
      updateBudgetL2DropData,
      getOptimizeL3Data,
      addSnack,
      deleteL3Optimization,
      setUpdateDropData,
      setDeleteOptimizationData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RenderDropConfiguration);
