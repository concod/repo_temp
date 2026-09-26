import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { Button, Card, Typography, Box } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, uniqBy, isEmpty, compact } from "lodash";
import { useHistory } from "react-router";
import { Switch } from "impact-ui";
import { groupByCustom } from "core/Utils/formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  setPlanOptimizationConstraintData,
  getPlanOptimizationConstraintData,
  updateOptimizationConstraintData,
  setl3MinQtyJson,
  setConstraint_2_3_Loader,
  set2_3_Loader,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import SetupDropsTableComponent from "./setup-drops-table-component";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import {
  isChannelMultiple,
  filterView,
  getDefaultChannelValue,
  externalFilterLevelsChannelSubChannel,
  scrollIntoView,
  channelContainsEcomPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { configureLevels } from "../../Plan-Dashboard/components/common-plan-functions";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  renderSetupDropsTable,
  saveClusterOptimizationValues,
  saveOptimizationValues,
} from "./optimization-constraint-table-functions";
import { Save } from "@mui/icons-material";

const useStyles = makeStyles((theme) => ({
  constraintTableWidth: {
    width: "60%",
    margin: "0 auto",
  },
  clustertableWidth: {
    margin: `0 ${theme.typography.pxToRem(20)}`,
  },
  rightAlignButtonAssort: {
    textAlign: "right",
  },
}));

const OptimizationConstraintTableComponent = (props) => {
  const [toggleOptimizationState, setToggleOptimizationState] = useState(
    "overall"
  );
  const [
    optimizationConstraintTableColumns,
    setOptimizationConstraintTableColumns,
  ] = useState([]);
  const [
    optimizationConstraintTableData,
    setOptimizationConstraintTableData,
  ] = useState([]);
  const [setupDrops, enableSetupDrops] = useState(false);
  const [uniqueRowData, setUniqueRowData] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState({});
  const [initialLoad, setInitialLoad] = useState(true);
  const [clusterCodeData, setClusterCodeData] = useState([]);
  const [setupDropsLoader, setSetupDropsLoader] = useState(false);
  const [formValue, setFormData] = useState({});
  const [levelsOptions, setLevelsOptions] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [isValueChanged, setIsValueChanged] = useState(false);
  let formData = formValue;

  const history = useHistory();
  const OptConstraintInstance = useRef({});
  const sharedClasses = sharedStyles();
  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    if (selectedChannel?.value && initialLoad) {
      fetchOptimizationTableData("l3_name");
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]);

  useEffect(() => {
    if (!isEmpty(props.planOptimizationConstraintData)) {
      if (props.planOptimizationConstraintData?.data?.columns?.length > 0) {
        let copyOptimizationData = cloneDeep(
          props.planOptimizationConstraintData.data.columns
        );
        let col = agGridColumnFormatter(
          copyOptimizationData,
          props.columnHeaderJson,
          null,
          null,
          null,
          history.location.pathname.includes("view")
        );
        if (toggleOptimizationState === "overall" && col?.length) {
          col[4].sub_headers[0].Header = "MIN. SIZE";
        }
        setOptimizationConstraintTableColumns(col);
      }
      if (props.planOptimizationConstraintData?.data?.data?.length > 0) {
        const constraintTableData =
          props.planOptimizationConstraintData?.data?.data;
        //To get unique cluster count in the table
        const clusterData = uniqBy(constraintTableData, "cluster_display_name");
        setClusterCodeData(clusterData);
        if (toggleOptimizationState === "overall") {
          let optimizationTableData = [
            ...props.planOptimizationConstraintData?.data?.data,
          ];
          let l3MinQty = {};
          let data = optimizationTableData.map((obj) => {
            l3MinQty[obj.l3_name] = obj["min_value"];
            return {
              ...obj,
              store_type_min_size: obj["min_size"],
              store_type_min: obj["min_value"],
              store_type_max: obj["max_value"],
              store_type_increments: obj["increment"],
              store_type_moq: obj["moq"],
              uniqueID:
                obj.l1_name +
                obj.l2_name +
                obj.l3_name +
                obj.channel +
                obj.sub_channel +
                obj[props.screenConfiguration?.common?.drop_key || "drop"],
            };
          });
          props.setl3MinQtyJson(l3MinQty);
          setOptimizationConstraintTableData(data);
        } else {
          // mapping cluster wise row data to columns
          let cluseterWiseOptimizationTempData = [];
          let clusterRowTempData = [
            ...props.planOptimizationConstraintData?.data?.data,
          ];
          clusterRowTempData.sort((a, b) =>
            a.cluster_code?.localeCompare(b.cluster_code)
          );
          let uniqueType = uniqBy(clusterRowTempData, "cluster_display_name");
          setUniqueRowData(uniqueType);
          let data = groupByCustom({
            Group: clusterRowTempData,
            // grouping values based on level1 and level3
            By: ["l1_name", "l3_name"],
          });
          data.forEach((temp) => {
            let newObj = {};
            temp.forEach((item, index) => {
              let clusterCodeInLowerCase = item.cluster_display_name.toLowerCase();
              newObj["l0_name"] = item.l0_name;
              newObj["l1_name"] = item.l1_name;
              newObj["l2_name"] = item.l2_name;
              newObj["l3_name"] = item.l3_name;
              newObj["cluster_display_name" + (index + 1)] =
                item?.cluster_display_name;
              newObj["cluster_code" + (index + 1)] = item?.cluster_code;
              newObj[`${clusterCodeInLowerCase}_min`] = item["min_value"];
              newObj[`${clusterCodeInLowerCase}_max`] = item["max_value"];
              newObj[`${clusterCodeInLowerCase}_increments`] =
                item["increment"];
              newObj[`${clusterCodeInLowerCase}_min_size`] = item["min_size"];
              newObj["type"] = item["type"];
              newObj["plan_code"] = item.plan_code;
              newObj.uniqueID =
                item.l1_name +
                item.l2_name +
                item.l3_name +
                item.channel +
                item.sub_channel +
                item[props.screenConfiguration?.common?.drop_key || "drop"] +
                item.cluster_code;
              return item;
            });
            cluseterWiseOptimizationTempData.push(newObj);
          });
          setOptimizationConstraintTableData(cluseterWiseOptimizationTempData);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planOptimizationConstraintData]);

  useEffect(() => {
    if (props.updateSetupDropsResponse) enableSetupDrops(false);
  }, [props.updateSetupDropsResponse]);

  useEffect(() => {
    if (
      optimizationConstraintTableData?.length &&
      isEmpty(levelsOptions) &&
      isEmpty(levelSelected)
    ) {
      const levelsData = configureLevels(
        props.planDetails?.data,
        props.levelsJson,
        optimizationConstraintTableData
      );
      setLevelsOptions(levelsData?.options);
      setLevelSelected(levelsData?.selectedValue);
      // Configure formdata for levels
      Object.keys(props.levelsJson).forEach((level) => {
        if (!isEmpty(levelsData?.selectedValue?.[level])) {
          formData[level] = levelsData?.selectedValue?.[level]?.label;
        }
      });
      setFormData(formData);
    }
  }, [optimizationConstraintTableData]);

  useEffect(() => {
    if (selectedChannel?.value && !initialLoad) {
      if (toggleOptimizationState === "overall") {
        saveChangesMadeToOptimizationTable("overall");
      } else {
        saveChangesMadeToOptimizationTable("cluster");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel?.value]);

  useEffect(() => {
    if (props.updatedSetupDropTableDataResponse) enableSetupDrops(false);
  }, [props.updatedSetupDropTableDataResponse]);

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
      setSelectedChannel(defaultChannel);
    }
  }, [props.planDetails]);

  const fetchOptimizationTableData = async (dataLevel, reload_wedge) => {
    if (reload_wedge) {
      props.set2_3_Loader(true);
    } else {
      props.setConstraint_2_3_Loader(true);
    }
    try {
      let reqBody = {
        plan_code: props.planDetails.data?.plan_code,
        data_level: dataLevel,
        store_type: selectedChannel?.value,
      };
      let data = await props.getPlanOptimizationConstraintData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setPlanOptimizationConstraintData(data.data);
      if (reload_wedge) {
        props.set2_3_Loader(false);
      } else {
        props.setConstraint_2_3_Loader(false);
      }
    } catch (error) {
      if (reload_wedge) {
        props.set2_3_Loader(false);
      } else {
        props.setConstraint_2_3_Loader(false);
      }
      displaySnackBarMessage("Failed to fetch optimization data", "error");
    }
  };

  const displaySnackBarMessage = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const switchOptimizationState = (e) => {
    e.stopPropagation();
    if (toggleOptimizationState === "overall") {
      setOptimizationConstraintTableData([]);
      setToggleOptimizationState("cluster");
      saveChangesMadeToOptimizationTable("overall", "toggle");
    } else {
      setOptimizationConstraintTableData([]);
      setToggleOptimizationState("overall");
      saveChangesMadeToOptimizationTable("cluster", "toggle");
    }
  };

  const updateOptimizationConstraintTableData = (
    e,
    data,
    column,
    isChanged,
    newValue,
    initialValue
  ) => {
    let columnId = column.colId;
    let tempRowData = [];
    setIsValueChanged(true);
    OptConstraintInstance.current.api.forEachNode((obj, index) => {
      obj = obj.data;
      if (obj.uniqueID === data.uniqueID) {
        if (
          (toggleOptimizationState === "overall" &&
            columnId === "store_type_min_size") ||
          columnId === "store_type_min"
        ) {
          let apiResponse = [
            ...props.planOptimizationConstraintData?.data?.data,
          ];
          if (columnId === "store_type_min_size" && newValue) {
            obj["store_type_min"] =
              newValue * (apiResponse[index]["min_value"] || 1);
          }
          if (columnId === "store_type_min") {
            let l3MinQty = cloneDeep(props.l3MinQtyJson);
            l3MinQty[obj.l3_name] = newValue;
            props.setl3MinQtyJson(l3MinQty);
          }
        }
        obj[columnId] = newValue;
      }
      tempRowData.push(obj);
    });
    OptConstraintInstance.current.api.refreshCells({
      update: tempRowData,
    });
  };

  const saveChangesMadeToOptimizationTable = async (
    dataLevel,
    type,
    reload_wedge
  ) => {
    if (reload_wedge) {
      props.set2_3_Loader(true);
    } else {
      props.setConstraint_2_3_Loader(true);
    }
    let toggleState = dataLevel ? dataLevel : toggleOptimizationState;
    if (props.screenConfiguration?.common?.show_style_level) {
      scrollIntoView("style-wedge-table");
    } else {
      scrollIntoView("choice-wedge-table");
    }
    if (toggleState === "overall") {
      saveOptimizationValues(
        type,
        OptConstraintInstance,
        props,
        displaySnackBarMessage,
        fetchOptimizationTableData,
        reload_wedge,
        isValueChanged,
        setIsValueChanged,
        history?.location.pathname.includes("view")
      );
    } else {
      saveClusterOptimizationValues(
        type,
        OptConstraintInstance,
        props,
        uniqueRowData,
        displaySnackBarMessage,
        fetchOptimizationTableData,
        reload_wedge,
        isValueChanged,
        setIsValueChanged,
        history?.location.pathname.includes("view")
      );
    }
  };

  const getLevelDetailValues = (data) => {
    let levels = Object.keys(props.levelsJson).map((levelKey) => {
      return { [levelKey]: data[levelKey] };
    });
    return Object.assign(...levels);
  };

  const callSetUpDropsTable = () => {
    saveChangesMadeToOptimizationTable();
    enableSetupDrops(true);
    setSetupDropsLoader(true);
    setOptimizationConstraintTableData([]);
    props.setShowAddChoiceModal(false);
  };

  const optimizeConstraints = () => {
    props.setShowWedge(false);
    props.setShowAddChoiceModal(false);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_4(false);
    saveChangesMadeToOptimizationTable(null, null, "reload_wedge");
  };

  const handleLevelsChange = (option, key) => {
    const selectedValue = levelSelected;
    let formOption = cloneDeep(formValue);
    selectedValue[key.filter_id] = option;
    formOption[key.filter_id] = option?.label;
    formData[key.filter_id] = option?.label;
    if (key.filter_id === "l1_name") {
      let l2Values = uniqBy(optimizationConstraintTableData, "l2_name");
      let l2ValuesOpt = l2Values?.map((item) => {
        if (item.l1_name === option?.label) {
          return {
            label: item.l2_name,
            value: item.l2_name,
            id: item.l2_name,
          };
        }
      });
      l2ValuesOpt = compact(l2ValuesOpt);
      levelsOptions.l2_name_option = l2ValuesOpt;
      formOption.l2_name = l2ValuesOpt[0]?.label;
      formData.l2_name = l2ValuesOpt[0]?.label;
      selectedValue.l2_name = l2ValuesOpt[0];
      setLevelsOptions(levelsOptions);
    }
    setFormData(formOption);
    setLevelSelected(selectedValue);
    OptConstraintInstance.current.api.onFilterChanged();
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    let levelsFilter = false;
    Object.keys(props.levelsJson).forEach((level) => {
      if (props.planDetails?.data?.[level]?.length > 1)
        return (levelsFilter = true);
    });
    return levelsFilter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel, levels changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        optimizationConstraintTableData,
        formData,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, optimizationConstraintTableData]
  );

  const loadTableInstance = (params) => {
    OptConstraintInstance.current = params;
  };
  return (
    <Card className={globalClasses.paper}>
      <Box
        display="flex"
        justifyContent="space-between"
        className={sharedClasses.heading}
      >
        <Box display="flex" width="100%" alignItems="center">
          <Typography variant="h3">Optimization Constraints</Typography>
          {isChannelMultiple(props.planDetails?.data) &&
            channelOptions?.length > 1 &&
            filterView(
              "Channel",
              "channel",
              channelOptions,
              setSelectedChannel,
              selectedChannel,
              sharedClasses.formContainer,
              sharedClasses.inputLabel
            )}
          {Object.keys(props.levelsJson).map((levelKey) => {
            return (
              levelsOptions[levelKey]?.length > 0 &&
              filterView(
                props.columnHeaderJson?.[levelKey],
                levelKey,
                levelsOptions[levelKey],
                handleLevelsChange,
                levelSelected[levelKey],
                `${sharedClasses.formContainer} ${sharedClasses.assortSingleFilterView}`,
                sharedClasses.inputLabel
              )
            );
          })}
        </Box>
        <div className={globalClasses.flexRow}>
          {((!isChannelMultiple(props.planDetails?.data) &&
            !channelContainsEcomPlan(props.planDetails?.data)) ||
            selectedChannel?.value !== "ECOMM") && (
            <Switch
              checked={toggleOptimizationState === "cluster"}
              onChange={(e) => {
                switchOptimizationState(e);
              }}
              id="switch-cluster-wise-optimization"
              rightLabel="Overall Constraint"
              leftLabel="Cluster wise Constraint"
            />
          )}
          {!history?.location.pathname.includes("view") && (
            <Button
              variant="outlined"
              color="primary"
              id="save-optimization-constraint"
              className={sharedClasses.scaleUpDownBtn}
              onClick={() => saveChangesMadeToOptimizationTable()}
            >
              <Save />
            </Button>
          )}
        </div>
      </Box>
      {optimizationConstraintTableData?.length > 0 && (
        <>
          <div
            className={
              toggleOptimizationState === "overall" ||
              clusterCodeData.length <= 1
                ? classes.constraintTableWidth
                : classes.clustertableWidth
            }
          >
            <AgGridTable
              rowdata={optimizationConstraintTableData}
              columns={optimizationConstraintTableColumns}
              loadTableInstance={loadTableInstance}
              onBlur={updateOptimizationConstraintTableData}
              uniqueRowId={"uniqueID"}
              sideBar={false}
              pagination={false}
              tableId={"optimisation-constraint-table"}
              sizeColumnsToFitFlag={true}
              skipAutoSizeColumn
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              adjustTableHeight={true}
            />
          </div>
          {!history.location.pathname.includes("view") && (
            <div className={classes.rightAlignButtonAssort}>
              {props.planDetails?.data?.[
                `${
                  props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              ] <= 1 ||
              props.screenConfiguration?.common?.endpoint_project_name ===
                "assort-smart" ? (
                <Button
                  variant="contained"
                  color="primary"
                  className={sharedClasses.button}
                  id="optmize-constraints"
                  disabled={
                    optimizationConstraintTableData?.length > 0 &&
                    !props.isWedgeLoading
                      ? false
                      : true
                  }
                  onClick={() => optimizeConstraints()}
                >
                  Optimize
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  className={sharedClasses.button}
                  onClick={() => callSetUpDropsTable()}
                  id="setupdrops"
                >
                  Setup Flows
                </Button>
              )}
            </div>
          )}
        </>
      )}
      {setupDrops &&
        renderSetupDropsTable(
          props,
          enableSetupDrops,
          SetupDropsTableComponent,
          setupDropsLoader,
          setSetupDropsLoader,
          globalClasses
        )}
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    drops_count: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data?.drops_count,
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planOptimizationConstraintData: planWedgeServiceActions.planOptimizationConstraintDataSelector(
      state
    ),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    updateSetupDropsResponse: planWedgeServiceActions.updateSetupDropsSelector(
      state
    ),
    l3MinQtyJson: planWedgeServiceActions.l3MinQtyJsonSelector(state),
    isWedgeLoading: planWedgeServiceActions.set2_3_LoaderSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      setPlanOptimizationConstraintData,
      getPlanOptimizationConstraintData,
      updateOptimizationConstraintData,
      setl3MinQtyJson,
      setConstraint_2_3_Loader,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OptimizationConstraintTableComponent);
