import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { bindActionCreators } from "redux";
import { withRouter } from "react-router-dom";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import GlobalStyles from "core/Styles/globalStyles";
import { Card, Grid, Typography } from "@mui/material";
import StrategyKpiComponent from "../strategy-kpi-component";
import BudgetLevelThreeComponent from "../../Plan/Plan-Initial/budget-level-three-component";
import BudgetClusterComponent from "../../Plan/Plan-Initial/budget-cluster-component";
import ClusterScaleUpDown from "../../Plan/Plan-Initial/cluster-scale-up-down";
import {
  getClusterUpdateData,
  getSubRowTotal,
} from "../../Plan/Plan-Initial/budget-cluster-functions";
import { filterView } from "core/Utils/utils";
import { Switch } from "impact-ui";
import { Button } from "@mui/base";
import {
  CHANNEL_FORM,
  Plan,
  SUB_CHANNEL_FORM,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import { addSnack } from "core/actions/snackbarActions";
import { setWorkStrategyLoader } from "../../../services-assortsmart/Strategy-Module/strategy-module-service";
import {
  getCarryoverOptimizeL3Data,
  getL3OptData,
  setL3OptData,
  updateL3OptData,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import {
  getDefaultChannelValue,
  getOptimiseL3Payload,
  isChannelMultiple,
  isWholesalePlan,
  getFilteredFooter,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  optimizeDepthChoicePayload,
} from "modules/assortsmart/pages-assortsmart/Plan/Plan-Depth-Choice/aps-st-table-functions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import * as strategyAssortServiceActions from "modules/assortsmart/services-assortsmart/Strategy-Module/strategy-module-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { cloneDeep, groupBy, isEmpty, uniqBy } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  fetchL3Details,
  getTotalFooterRow,
  plotBudgetL2TableData,
  plotBudgetL3TableData,
  updateL3Data,
} from "../../Plan/Plan-Initial/budget-level-three-functions";
import LoadingOverlay from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { generateDropDownOptions } from "../../Plan/Plan-Wedge/plan-wedge-functions";
import { getPayloadForL3 } from "../../Plan/Plan-Initial/plan-initial-functions";
import WorkingStrageyDepthChoiceComponent from "./working-strategy-depth-choice-component";
import BudgetScaleUpDown from "../../Plan/Plan-Initial/budget-scale-up-down";
import AddIcon from "@mui/icons-material/Add";
import CreateNewLevelThreeDrawer from "./create-new-level-three-drawer";

const WorkingStrageyTabComponent = (props) => {
  const [clusterRTinstance, setClusterRTinstance] = useState(null);
  const [clusterTableData, setClusterTableData] = useState([]);
  const [uniqueClusterList, setUniqueClusterList] = useState([]);
  const [clusterLevelView, setClusterLevelView] = useState("table");
  const [togglePen, setTogglePen] = useState("total");
  const [selectedSubChannel, setSelectedSubChannel] = useState({});
  const [budgetClusterTableData, setBudgetClusterTableData] = useState([]);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [filteredClusterFooter, setFilteredClusterFooter] = useState([]);
  const [callUpdateClusterTable, setCallUpdateClusterTable] = useState(false);
  const [isClusterChanged, setIsClusterChanged] = useState(false);
  const [filterChanged, setFilterChanged] = useState(false);
  const [
    showBudgetLevelThreeComponent,
    setShowBudgetLevelThreeComponent,
  ] = useState(true);
  const [level2View, setLevel2View] = useState("table");
  const [level3View, setLevel3View] = useState("table");
  const [level3TableData, setLevel3TableData] = useState([]);
  const [level3RTinstance, setLevel3RTinstance] = useState(null);
  const [levelOneOptions, setLevelOneOptions] = useState([]);
  const [levelTwoOptions, setLevelTwoOptions] = useState([]);
  const [levelOneSelected, setLevelOneSelected] = useState({});
  const [levelTwoSelected, setLevelTwoSelected] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [dethChoiceFormData, setDepthChoiceFormData] = useState({});
  const [subChannelFormFields, setSubChannelFormFields] = useState([]);
  const [optimizationLevel, setOptimizationLevel] = useState("");
  const [commonLevelCol, setCommonLevelCol] = useState([]);
  const [formData, setFormData] = useState({});
  const [callKpi, setCallKPI] = useState(false);
  const [isL3DataChanged, setIsL3DataChanged] = useState(false);
  const [isLevel2Required, setIsLevel2Required] = useState(false);
  const [dynamicL2TableData, setDynamicL2TableData] = useState([]);
  const [dynamicL2RTinstance, setDynamicL2RTinstance] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isPenValueChanged, setIspenValueChanged] = useState(false);
  const [showCreateLevelThree, setShowCreateLevelThree] = useState(false);
  const [optimisePayload, setOptimisePayload] = useState({});
  const [showClusterLevelComponent, setShowClusterLevelComponent] = useState(
    true
  );
  const [isTotalDrop, setIsTotalDrop] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null)
  const dynamicL2AGInstance = useRef({});
  const l3AGInstance = useRef({});
  const history = useHistory();
  const globalClasses = GlobalStyles();
  const classes = useStyles();
  const ClusterAGInstance = useRef({});

  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  const updateClusterTable = async () => {
    setCallUpdateClusterTable(true);
  };

  const handleToggleChange = (e) => {
    if (e.target.checked) {
      setTogglePen("cluster");
    } else {
      setTogglePen("total");
    }
  };

  useEffect(() => {
    if (props.planDetails?.data) {
      if (props.planDetails?.data?.l1_name) {
        let l1NameOpt = generateDropDownOptions(
          props.planDetails?.data?.l1_name
        );
        setLevelOneSelected(l1NameOpt?.[0]);
        setLevelOneOptions(l1NameOpt);
      }
      if (props.planDetails?.data.plan_sub_step === "review_target") {
        fetchOptimizeL3Data();
      } else {
        setCallKPI(true);
        fetchBudgetLevelThreeColumn();
      }
    }
  }, [props.planDetails]);

  useEffect(() => {
    let levelsForm = {
      l1_name: levelOneSelected,
      l2_name: levelTwoSelected,
    };
    setLevelSelected(levelsForm);
    let formValue = {
      ...dethChoiceFormData,
      l2_name: levelTwoSelected?.id || "",
      l1_name: levelOneSelected?.id || "",
    };
    setDepthChoiceFormData(formValue);
  }, [levelOneSelected, levelTwoSelected]);

  useEffect(() => {
    if (props.planDetails.status) {
      const planDetailsData = props.planDetails?.data;
      let optimisePayload = getOptimiseL3Payload(
        planDetailsData,
        props.planLevels?.data?.level_info || []
      );
      setOptimisePayload(optimisePayload);
      setLevelTwoSelected(props.planDetails?.data?.l2_name?.[0])
    }
  }, [props.planDetails]);

  useEffect(() => {
    //Populate dynamic level2 table data
    setIsL3DataChanged(false);
    plotBudgetL2TableData(
      props,
      optimizationLevels,
      formData,
      subChannelFormFields,
      setDynamicL2TableData,
      setLevelTwoOptions,
      setLevelTwoSelected,
      null,
      null,
      setFormData,
      null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.l2OptData]);

  useEffect(() => {
    plotBudgetL3TableData(props, formData, setLevel3TableData, setFormData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.l3OptData]);

  const fetchOptimizeL3Data = async () => {
    try {
      const planDetailsData = props.planDetails?.data;
      let optimisePayload = getOptimiseL3Payload(
        planDetailsData,
        props.planLevels?.data?.level_info || []
      );
      if (planDetailsData.data_pull_source) {
        optimisePayload.data_pull_source = planDetailsData.data_pull_source;
      }
      if (planDetailsData.comapre_season) {
        optimisePayload.comapre_season = planDetailsData.comapre_season;
      }
      optimisePayload.optimization_level = ["l3_name"];
      optimisePayload.data_pull_source = "actual";
      let plan_sub_step = "optimization_table_l3_name";
      if (optimizationLevels.includes("carryover")) {
        plan_sub_step = optimizationLevels.slice(2)?.[0]
          ? `optimization_table_${
              optimizationLevels.slice(2)?.[0] || "cluster"
            }`
          : "optimization_table_l3_name";
      } else {
        plan_sub_step = optimizationLevels.slice(1)?.[0]
          ? `optimization_table_${
              optimizationLevels.slice(1)?.[0] || "cluster"
            }`
          : "optimization_table_l3_name";
      }
      optimisePayload.plan_sub_step = plan_sub_step;
      props.setWorkStrategyLoader(true);
      const optimizeResponse = await props.getStrategyOptimizeL3Data(
        optimisePayload,
        props.planDetails?.data?.plan_code
      );
      if (optimizeResponse?.data?.data?.status) {
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
        // calling calculate depth choice
        let payload = optimizeDepthChoicePayload(planData, props);
        let optimizeDepthChoiceResponse = await props.optimizeDepthChoice(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
      } else {
        props.addSnack({
          message: `Optimising ${props.columnHeaderJson?.l3_name} details failed`,
          options: {
            variant: "error",
          },
        });
        props.setWorkStrategyLoader(false);
      }
    } catch (error) {
      props.setWorkStrategyLoader(false);
      props.addSnack({
        message: "Something went wrong",
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
    props.setWorkStrategyLoader(false);
    setLevel3View("table");
    setCallKPI(true);
    fetchBudgetLevelThreeColumn();
  };

  const onL3PollingFailure = (data) => {
    props.addSnack({
      message: data.message,
      options: {
        variant: "error",
      },
    });
    props.setWorkStrategyLoader(false);
  };

  const fetchBudgetLevelThreeColumn = async () => {
    let cols = await getColumnsAg(
      "table_name=plan_l3_opt",
      props.columnHeaderJson,
      null,
      null
    )();
    setCommonLevelCol(cols);
  };

  const handleChangeSubChannelFilter = (
    updatedFormData,
    id,
    field,
    e,
    initialValue
  ) => {
    if (id === "channel_list") {
      setInitialValue(initialValue);
    }
    setFormData(updatedFormData);
    level3RTinstance?.current?.api?.onFilterChanged();
    setFilteredL3Footer(getFilteredFooter(totalL3Footer, updatedFormData));
  };

  const handleL1ValueChange = (option) => {
    setOptimizationLevel("l3_name");
    setLevelOneSelected(option);
  };

  const handleL2ValueChange = (option) => {
    setOptimizationLevel("l3_name");
    setLevelTwoSelected(option);
  };

  const getSelectedRowIds = (rowId) => {
    let items = selectedRowIds;
    if (selectedRowIds.length === 0) {
      items = [];
      //when no rows selected setting rowId directly to state
      items.push(rowId);
      setSelectedRowIds(items);
    } else {
      const index = items.indexOf(rowId);
      //getting the index of rowId
      if (index > -1) {
        //if rowId is already there we are removing that rowId from the List
        items.splice(index, 1);
      } else {
        //if rowId is not there we are pushing the rowId to the list
        items.push(rowId);
      }
      setSelectedRowIds(items);
    }
  };

  const handleViewSwitch = (view) => {
    let viewState =
      view === "level2View"
        ? level2View
        : view === "level3View"
        ? level3View
        : clusterLevelView;
    return (
      <Grid Item>
        {viewState === "table" ? (
          <Button
            variant={"contained"}
            color="primary"
            id={`${view}-table`}
            onClick={() => {
              if (view === "level3View") {
                if (level3View !== "table") {
                  setLevel3RTinstance(null);
                }
                setLevel3View("chart");
              } else if (view === "level2View") {
                if (level2View !== "table") {
                  setDynamicL2RTinstance(null);
                }
                setLevel2View("chart");
              } else {
                if (clusterLevelView !== "table") {
                  setClusterRTinstance(null);
                }
                setClusterLevelView("chart");
              }
            }}
            title={Plan.__Table_View}
          >
            <TableChartIcon />
          </Button>
        ) : (
          <Button
            variant={"contained"}
            color="primary"
            id={`${view}-chart`}
            onClick={() => {
              if (view === "level3View") {
                if (level3View !== "table") {
                  setLevel3RTinstance(null);
                }
                setLevel3View("table");
              } else if (view === "level2View") {
                if (level2View !== "table") {
                  setDynamicL2RTinstance(null);
                }
                setLevel2View("table");
              } else {
                setClusterLevelView("table");
              }
            }}
            title={Plan.__Chart_View}
          >
            <BarChartIcon />
          </Button>
        )}
      </Grid>
    );
  };

  const handleClusterNext = () => {
    let temp = getClusterUpdateData(
      props,
      ClusterAGInstance,
      uniqueClusterList
    );
    props.sendClusterTableData({
      cluster_plan_data: [].concat.apply([], temp),
      is_value_changed: isClusterChanged,
    });
  };

  return (
    <React.Fragment>
      <LoadingOverlay loader={props.loader} spinner>
        <StrategyKpiComponent
          expanded={props.expanded}
          callKpi={callKpi}
          setCallKPI={setCallKPI}
        />
        {optimizationLevels.slice(1)?.map((level) => {
          return (
            (level === "l2_name" || level === "l3_name") && (
              <div>
                <div className={classes.heading}>
                  <div className={globalClasses.layoutAlignSpaceBetween}>
                    <Typography fontWeight={600} fontSize={"16px"}>
                      {level === "l2_name"
                        ? (props?.columnHeaderJson?.l2_name || "").concat(
                            Plan.__Level3_Plan
                          )
                        : (props?.columnHeaderJson?.l3_name || "").concat(
                            Plan.__Level3_Plan
                          )}
                    </Typography>
                    <div className={classes.verticalLine}></div>
                    <Switch
                      checked={showBudgetLevelThreeComponent}
                      onChange={(e) => {
                        setShowBudgetLevelThreeComponent(
                          !showBudgetLevelThreeComponent
                        );
                      }}
                      leftLabel={
                        showBudgetLevelThreeComponent ? "Hide" : "Show"
                      }
                      rightLabel=""
                    />
                  </div>

                  {showBudgetLevelThreeComponent && (
                    <div className={classes.rightEnd}>
                      {level3View === "table" &&
                        levelOneOptions.length > 1 &&
                        filterView(
                          props.columnHeaderJson?.l1_name,
                          "l1_name",
                          levelOneOptions,
                          handleL1ValueChange,
                          levelOneSelected,
                          `${classes.assortMultiFilterView} ${classes.flexRow}`,
                          classes.inputLabel
                        )}
                      {level === "l3_name" &&
                        level3View === "table" &&
                        levelTwoOptions.length > 0 &&
                        filterView(
                          props.columnHeaderJson?.l2_name,
                          "l2_name",
                          levelTwoOptions,
                          handleL2ValueChange,
                          levelTwoSelected,
                          `${classes.assortMultiFilterView} ${classes.flexRow}`,
                          classes.inputLabel
                        )}
                      {level3View === "table" && subChannelFormFields && (
                        <div className={classes.formContainer}>
                          <Form
                            layout={"vertical"}
                            maxFieldsInRow={2}
                            handleChange={handleChangeSubChannelFilter}
                            fields={subChannelFormFields}
                            updateDefaultValue={false}
                            defaultValues={formData}
                            handleDropdownClose={true}
                          ></Form>
                        </div>
                      )}
                      {!props.isView &&
                        <Button
                          variant="outlined"
                          color="primary"
                          id="create-new-l3"
                          onClick={() => setShowCreateLevelThree(true)}
                          title={Plan.__Create_New}
                        >
                          <AddIcon />
                        </Button>
                      }
                      {!props.isView &&
                        <BudgetScaleUpDown
                          RTinstance={
                            level === "l2_name"
                              ? dynamicL2RTinstance
                              : level3RTinstance
                          }
                          selectedRowIds={selectedRowIds}
                          setTableData={(data) => {
                            level === "l2_name"
                              ? setDynamicL2TableData(data)
                              : setLevel3TableData(data);
                          }}
                          // hideClusterTable={hideClusterTable}
                          getSelectedRowIds={(rowId) => getSelectedRowIds(rowId)}
                          setDisableNext={props.setDisableNext}
                          addSnack={props.addSnack}
                          setSelectedRowIds={setSelectedRowIds}
                          getTotalFooterRow={getTotalFooterRow}
                          planDetails={props.planDetails}
                          setIsL3DataChanged={setIsL3DataChanged}
                          level={level}
                          screenConfiguration={props.screenConfiguration}
                          currentTableLevel={level}
                          selectedDropData={selectedDropData}
                          // isTotalDrop={isTotalDrop}
                        />
                      }
                      <div className={classes.verticalLine}></div>
                      <Grid className={classes.gridButton} Item>
                        {handleViewSwitch("level" + level.slice(1, 2) + "View")}
                      </Grid>
                    </div>
                  )}
                </div>
                {showBudgetLevelThreeComponent && (
                  <BudgetLevelThreeComponent
                    level3View={level === "l2_name" ? level2View : level3View}
                    currentTableLevel={level}
                    setLevel3TableData={setLevel3TableData}
                    budgetL3Instance={
                      level === "l2_name" ? dynamicL2AGInstance : l3AGInstance
                    }
                    RTinstance={level3RTinstance}
                    setRTinstance={
                      level === "l2_name"
                        ? setDynamicL2RTinstance
                        : setLevel3RTinstance
                    }
                    planDetails={props.planDetails}
                    levelTwoSelected={levelTwoSelected}
                    levelOneSelected={levelOneSelected}
                    initialValue={false}
                    commonLevelCol={commonLevelCol}
                    formData={formData}
                    setFormData={setFormData}
                    setOptimizationLevel={setOptimizationLevel}
                    optimizationLevel={optimizationLevel}
                    setIsL3DataChanged={setIsL3DataChanged}
                    setDynamicL2TableData={(data) =>
                      setDynamicL2TableData(data)
                    }
                    level3TableData={
                      level === "l2_name" ? dynamicL2TableData : level3TableData
                    }
                    setDisableNext={props.setDisableNext}
                    updateL3Data={updateL3Data}
                    isLevel2Required={isLevel2Required}
                    setLoader={props.setWorkStrategyLoader}
                    isDataChanged={isL3DataChanged}
                    setIspenValueChanged={setIspenValueChanged}
                    getTotalFooterRow={getTotalFooterRow}
                    setOptimisePayload={setOptimisePayload}
                    setIsTotalDrop={setIsTotalDrop}
                    selectedDropData={selectedDropData}
                    setSelectedDropData={setSelectedDropData}
                    isView={props.isView}
                  />
                )}
                {
                  <CreateNewLevelThreeDrawer
                    isActive={showCreateLevelThree}
                    setIsActive={setShowCreateLevelThree}
                    level3RTinstance={level3RTinstance}
                    optimisePayload={optimisePayload}
                    setShowClusterLevel={setShowClusterLevelComponent}
                    AGInstance={l3AGInstance}
                    formData={formData}
                    isLevel2Required={
                      optimizationLevels?.length === 3 &&
                      optimizationLevels.includes("l1_name")
                        ? true
                        : false
                    }
                    currentTableLevel={
                      props.screenConfiguration?.common?.final_level ||
                      "l3_name"
                    }
                    // setShowReviewAcrossDropsTable={
                    //   setShowReviewAcrossDropsTable
                    // }
                    dynamicL2TableData={dynamicL2TableData}
                    isPenValueChanged={isPenValueChanged}
                    levelTwoSelected={levelTwoSelected}
                    levelOneSelected={levelOneSelected}
                    isL3DataChanged={isL3DataChanged}
                  />
                }
              </div>
            )
          );
        })}

        <div>
          <div className={classes.heading}>
            <div className={globalClasses.layoutAlignSpaceBetween}>
              <Typography fontWeight={600} fontSize={"16px"}>
                Cluster Level Plan
              </Typography>
              <div className={classes.verticalLine}></div>
              <Switch
                checked={showClusterLevelComponent}
                onChange={(e) => {
                  setShowClusterLevelComponent(!showClusterLevelComponent);
                }}
                leftLabel={showClusterLevelComponent ? "Hide" : "Show"}
                rightLabel=""
              />
            </div>
            {showClusterLevelComponent && (
              <div className={classes.rightEnd}>
                {clusterLevelView === "table" &&
                  levelOneOptions.length > 1 &&
                  filterView(
                    props.columnHeaderJson?.l1_name,
                    "l1_name",
                    levelOneOptions,
                    handleL1ValueChange,
                    levelOneSelected,
                    `${classes.assortMultiFilterView} ${classes.flexRow}`,
                    classes.inputLabel
                  )}
                {clusterLevelView === "table" &&
                  levelTwoOptions.length > 0 &&
                  filterView(
                    props.columnHeaderJson?.l2_name,
                    "l2_name",
                    levelTwoOptions,
                    handleL2ValueChange,
                    levelTwoSelected,
                    `${classes.assortMultiFilterView} ${classes.flexRow}`,
                    classes.inputLabel
                  )}
                {clusterLevelView === "table" && subChannelFormFields && (
                  <div className={classes.formContainer}>
                    <Form
                      layout={"vertical"}
                      maxFieldsInRow={2}
                      handleChange={handleChangeSubChannelFilter}
                      fields={subChannelFormFields}
                      updateDefaultValue={false}
                      defaultValues={formData}
                      handleDropdownClose={true}
                    ></Form>
                  </div>
                )}
                {!isWholesalePlan(props.planDetails?.data) &&
                  !props.isView &&
                  clusterLevelView === "table" && (
                    <div
                      className={`${classes.rightEnd} ${globalClasses.layoutAlignCenter}`}
                    >
                      <Switch
                        id="cluster-toggle"
                        checked={togglePen === "total" ? false : true}
                        onChange={(e) => {
                          handleToggleChange(e);
                        }}
                        rightLabel="Edit total pen"
                        leftLabel="Edit cluster pen"
                      />
                    </div>
                  )}
                {clusterLevelView === "table" &&
                  !props.isView && (
                    <div>
                      <ClusterScaleUpDown
                        uniqueClusterList={uniqueClusterList}
                        setTableData={(data) => setClusterTableData(data)}
                        getSubRowTotal={getSubRowTotal}
                        AGInstance={ClusterAGInstance}
                        handleClusterNext={handleClusterNext}
                        addSnack={props.addSnack}
                        screenConfiguration={props.screenConfiguration}
                        setFilteredClusterFooter={setFilteredClusterFooter}
                        filteredClusterFooter={filteredClusterFooter}
                        setIsClusterChanged={setIsClusterChanged}
                        selectedDropData={selectedDropData}
                      />
                    </div>
                  )}
                <div className={classes.verticalLine}></div>
                <Grid className={classes.gridButton} Item>
                  {handleViewSwitch("clusterLevelView")}
                </Grid>
              </div>
            )}
          </div>
          {showClusterLevelComponent && (
            <BudgetClusterComponent
              clusterTableData={clusterTableData}
              setClusterTableData={(data) => setClusterTableData(data)}
              getSubRowTotal={getSubRowTotal}
              uniqueClusterList={uniqueClusterList}
              setUniqueClusterList={setUniqueClusterList}
              setDisableNext={props.setDisableNext}
              handleClusterNext={handleClusterNext}
              clusterLevelView={clusterLevelView}
              togglePen={togglePen}
              setTogglePen={setTogglePen}
              selectedSubChannel={selectedSubChannel}
              budgetClusterTableData={budgetClusterTableData}
              setBudgetClusterTableData={(data) =>
                setBudgetClusterTableData(data)
              }
              setSelectedDropData={setSelectedDropData}
              selectedDropData={selectedDropData}
              AGInstance={ClusterAGInstance}
              clusterData={props.clusterData}
              selectedChannel={props.selectedChannel}
              levelTwoOptions={levelTwoOptions}
              levelTwoSelected={levelTwoSelected}
              levelOneOptions={levelOneOptions}
              levelOneSelected={levelOneSelected}
              sendClusterTableData={props.sendClusterTableData}
              initialLoadBudgetComponent={props.initialLoadBudgetComponent}
              fromDashboardScreen_2_1={props.fromDashboardScreen_2_1}
              getFilteredFooter={getFilteredFooter}
              loading={props.isLoading}
              setFilteredClusterFooter={setFilteredClusterFooter}
              filteredClusterFooter={filteredClusterFooter}
              callUpdateClusterTable={callUpdateClusterTable}
              setCallUpdateClusterTable={setCallUpdateClusterTable}
              isClusterChanged={isClusterChanged}
              setIsClusterChanged={setIsClusterChanged}
              filterChanged={filterChanged}
              setFilterChanged={setFilterChanged}
              isView={props.isView}
            />
          )}
          <WorkingStrageyDepthChoiceComponent
            setDisableNext={props.setDisableNext}
            selectedChannel={selectedChannel}
            setIsDepthChoiceChanged={props.setIsDepthChoiceChanged}
            isDepthChoiceChanged={props.isDepthChoiceChanged}
            setShowReceiptDrawer={props.setShowReceiptDrawer}
            setVersion={props.setVersion}
            setIsDepthChoiceWarning={props.setIsDepthChoiceWarning}
            setIsDepthChoiceError={props.setIsDepthChoiceError}
            handleDepthChoiceData={props.handleDepthChoiceData}
            levelTwoOptions={levelTwoOptions}
            levelTwoSelected={levelTwoSelected}
            levelOneOptions={levelOneOptions}
            levelOneSelected={levelOneSelected}
            levelSelected={levelSelected}
            handleL1ValueChange={handleL1ValueChange}
            handleL2ValueChange={handleL2ValueChange}
            formData={dethChoiceFormData}
            setFormData={setDepthChoiceFormData}
            isView={props.isView}
            setSelectedChannel={setSelectedChannel}
          />
        </div>
      </LoadingOverlay>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
    isLoading: planInitialServiceActions.loader_2_1_Selector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    l3OptData: planInitialServiceActions.budgetLevelThreeTableDataSelector(
      state
    ),
    l2OptData: planInitialServiceActions.budgetLevelTwoTableDataSelector(state),
    loader: strategyAssortServiceActions.workStrategyLoaderSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
      getCarryoverOptimizeL3Data,
      getL3OptData,
      setL3OptData,
      updateL3OptData,
      addSnack,
      setWorkStrategyLoader,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(WorkingStrageyTabComponent));
