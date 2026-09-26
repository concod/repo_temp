import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { isEmpty, cloneDeep, groupBy, find } from "lodash";
import { StyledRadio } from "core/Utils/selection/selection";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputLabel,
  TextField,
  IconButton,
  FormControlLabel,
  RadioGroup,
  FormControl,
  Paper,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getPayloadForL3 } from "./plan-initial-functions";
import SelectVirtual from "../../Filters/VirtualisedSelect";
import {
  Plan,
  addSubDepartmentTabs,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { addSnack } from "core/actions/snackbarActions";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import {
  getL3OptData,
  setL3OptData,
  setL2OptData,
  set2_1_Loader,
  updateL3OptData,
  createNewL3,
  getOptimizeL3Data,
  deleteL3Optimization,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import Level3Modal from "./create-level-three-modal-table";
import { apostropheHandler, capitalize } from "core/Utils/formatter";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import {
  getPlanPayload,
  getL3OptPayload,
} from "../../../utils-assortsmart/utilityFunctions";
import globalStyles from "core/Styles/globalStyles";
import { fetchL3Details } from "./budget-level-three-functions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

const CreateNewLevelThreeComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [level3Selection, setLevel3Selection] = useState("existing");
  const [existingLevel3Data, setExistingLevel3Data] = useState([]);
  const [addedClassName, setAddedClassName] = useState("");
  const [exsistingData, setExsistingData] = useState([]);
  const [tabs, setTabs] = useState(addSubDepartmentTabs);
  const [selectedTab, setSelectedTab] = useState(
    addSubDepartmentTabs?.["Style View"]
  );
  const [indexFactor, setIndexFactor] = useState(1);
  const planCode = props.match.params.planCode;
  const createNewL3Instance = useRef({});
  const level2 = [];
  let finalLevel =
    props.productHierarchy?.final_level ||
    props.screenConfiguration?.common?.final_level ||
    "l3_name";
  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;
  props.dynamicL2TableData.forEach((data) => {
    if (data.l2_name !== "Total") level2.push(data.l2_name);
  });

  useEffect(()=>{
    addSubDepartmentTabs[props.columnHeaderJson?.l3_name] = props.columnHeaderJson?.l3_name;
    setTabs(addSubDepartmentTabs);
  },[addSubDepartmentTabs])

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const fetchData = async () => {
    let finalLevel =
      props.screenConfiguration?.common?.final_level || "l3_name";
    let optLevel = finalLevel.split("_name")[0];
    let budgetL3payload = getL3OptPayload(
      props.planDetails?.data,
      props.formData,
      true,
      props,
      false
    );
    budgetL3payload.filters.push({
      attribute_name: "optimization_level",
      operator: "in",
      value: [`${optLevel}_optimization`],
      prefix: "levels",
    });
    budgetL3payload.filters.push({
      attribute_name: "drop",
      operator: "in",
      value: ["Total", "-"],
      prefix: "levels",
    });
    let budgetL3Response = await props.getL3OptData(
      budgetL3payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (budgetL3Response?.data?.data?.data?.length) {
      setExsistingData(budgetL3Response.data.data.data);
      let existingL3Data = [];
      if (optimizationLevels.includes("carryover")) {
        let groupedData = groupBy(budgetL3Response.data.data.data, "l3_name");
        for (let level3 in groupedData) {
          let row = groupedData[level3][0];
          existingL3Data.push({
            label: row.l3_name,
            value: row.l3_name,
            ...row,
            penetration_ty: Math.round(row.penetration_ty * 10000) / 100,
          });
        }
      } else {
        existingL3Data = budgetL3Response.data.data.data.map((row) => {
          return {
            label: row.l3_name,
            value: row.l3_name,
            ...row,
            penetration_ty: Math.round(row.penetration_ty * 10000) / 100,
          };
        });
      }
      if (existingL3Data?.length) {
        setExistingLevel3Data(existingL3Data);
      }
      props.set2_1_Loader(false);
    } else {
      props.set2_1_Loader(false);
    }
  };

  useEffect(() => {
    const getL3Optimization = async () => {
      let finalLevel =
        props.screenConfiguration?.common?.final_level || "l3_name";
      let optLevel = finalLevel.split("_name")[0];
      if (level3Selection === "existing" && props.planDetails?.status) {
        props.set2_1_Loader(true);
        fetchData();
      }
      let level3Data = [];
      props.AGInstance.current.api.forEachNode((row) => {
        if (row?.data?.l3_name !== "Total") {
          level3Data.push(row.data);
        }
      });
      const l3Instance = {
        data: level3Data,
      };
      const updateL3Data = await props.updateL3OptData(
        {
          ...getPayloadForL3(
            l3Instance,
            props.levelsJson,
            false,
            [],
            props.screenConfiguration
          ),
          optimization_level: `${optLevel}_optimization`,
          is_cluster_pen_ty: props.isPenValueChanged,
          is_update_plan_step: true,
          plan_sub_step: "optimization_table_l3_name",
          is_value_changed: true,
          plan_code: props.planDetails?.data?.plan_code,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updateL3Data?.data.status) {
        let payload = getL3OptPayload(
          props.planDetails?.data,
          props.formData,
          false,
          props,
          false
        );
        payload.filters.push({
          attribute_name: "optimization_level",
          operator: "in",
          value: [`${optLevel}_optimization`],
          prefix: "levels",
        });
        payload.filters.push({
          attribute_name: "drop",
          operator: "in",
          value: ["Total", "-"],
          prefix: "levels",
        });
        const responseData = await props.getL3OptData(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (props?.currentTableLevel === "l2_name") {
          props.setL2OptData(responseData?.data || []);
        } else {
          props.setL3OptData(responseData?.data || []);
        }
      }
    };
    getL3Optimization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);

  const createExistingL3 = async () => {
    let finalLevel =
      props.screenConfiguration?.common?.final_level || "l3_name";
    let optLevel = finalLevel.split("_name")[0];
    props.set2_1_Loader(true);
    let payload = {};
    if (optimizationLevels.includes("carryover")) {
      let data = [];
      let groupedData = groupBy(exsistingData, "l3_name");
      for (let level3 in groupedData) {
        const levelData = find(existingLevel3Data, {
          label: level3,
        });
        if (levelData) {
          data.push(...groupedData[level3]);
        }
      }
      payload = {
        ...getPayloadForL3(
          { data: data },
          props.levelsJson,
          false,
          [],
          props.screenConfiguration
        ),
        is_update_plan_step: "true",
        optimization_level: `${optLevel}_optimization`,
      };
    } else {
      payload = {
        ...getPayloadForL3(
          { data: existingLevel3Data },
          props.levelsJson,
          false,
          [],
          props.screenConfiguration
        ),
        optimization_level: `${optLevel}_optimization`,
        is_cluster_pen_ty: props.isPenValueChanged,
        is_update_plan_step: true,
        plan_sub_step: "optimization_table_l3_name",
        is_value_changed: true,
        plan_code: props.planDetails?.data?.plan_code,
      };
    }
    let updateResponse = await props.updateL3OptData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (updateResponse?.data?.status) {
      fetchL3Details(planCode, props, false);
      props.setShowCreateLevelThree(false);
    } else {
      props.set2_1_Loader(false);
    }
    props.setEnableStep(2.1);
  };

  const createL3 = () => {
    let selectedRows = [];
    createNewL3Instance.current.api.forEachNode((node) => {
      if (node.selected) {
        node.selected && selectedRows.push({ ...node.data, is_selected: true });
      }
    });
    if (isEmpty(addedClassName) || selectedRows.length === 0) {
      if (isEmpty(addedClassName)) {
        displaySnackMessages(
          `${
            props.levelsJson[
              props?.screenConfiguration?.common?.final_level || "l3_name"
            ]
          } name cannot be empty`,
          "error"
        );
      } else {
        displaySnackMessages(`Selected ${props.levelsJson[finalLevel || "l3_name"]} cannot be empty`, "error");
      }
    } else if (
      (!indexFactor || indexFactor == 0) &&
      selectedTab === "Subdepartment View"
    ) {
      displaySnackMessages("Index factor cannot be empty or zero", "error");
    } else if (isNaN(indexFactor) && selectedTab === "Subdepartment View") {
      displaySnackMessages("Index factor must be a number", "error");
    } else if (indexFactor > 5 && selectedTab === "Subdepartment View") {
      displaySnackMessages("Index factor must be between 0 and 5", "error");
    } else {
      var regexForSpecialCharecter = /[|\\/~^:,;?!&%@*"+]/;
      if (addedClassName.match(regexForSpecialCharecter) !== null) {
        displaySnackMessages(
          `${
            props.levelsJson[
              props?.screenConfiguration?.common?.final_level || "l3_name"
            ]
          } name cannot contain any special character`,
          "error"
        );
      } else {
        receiveL3Details(selectedRows, addedClassName);
      }
    }
    props.setEnableStep(2.1);
  };

  const onL3PollingSucess = () => {
    props.setEnableStep(2.1);
    if (props?.currentTableLevel === "l2_name") {
      props.setL2OptData([]);
    } else {
      props.setL3OptData([]);
    }
    fetchL3Details(planCode, props, true);
    props.set2_1_Loader(false);
  };

  const onL3PollingFailure = () => {
    props.set2_1_Loader(false);
    props.addSnack({
      message: `Adding cluster details for new ${
        props.levelsJson[
          props?.screenConfiguration?.common?.final_level || "l3_name"
        ]
      } failed`,
      options: {
        variant: "error",
      },
    });
  };

  const fetchOptimizeL3Data = async () => {
    try {
      let payload = { ...props.optimisePayload };
      payload.new_l3_created = true;
      payload.plan_sub_step = `optimization_table_${
        props.screenConfiguration?.common?.final_level || "l3_name"
      }`;
      const optimizeResponse = await props.getOptimizeL3Data(
        payload,
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

  const receiveL3Details = async (productId, customClassName) => {
    let planDetailsData = cloneDeep(props.planDetails?.data);
    //Converting single quote value to double quote to avoid insertion issue in POSTGRES
    let className = apostropheHandler(customClassName);
    if (className) {
      if (props.levelOneSelected?.value) {
        planDetailsData.l1_name = props.levelOneSelected?.value;
      }
      if (props.levelTwoSelected?.value) {
        planDetailsData.l2_name = props.levelTwoSelected?.value;
      }
      let payload = getPlanPayload(planDetailsData, props.planLevels, true);
      if (selectedTab === "Style View") {
        payload.filters.push({
          attribute_name: "article",
          value: productId.map((data) => {
            return data.article;
          }),
          operator: "in",
        });
        payload.filters.push({
          attribute_name: "new_" + finalLevel,
          value: [className],
          prefix: "levels",
          operator: "in",
        });
      } else {
        payload.filters.push({
          attribute_name: finalLevel || "l3_name",
          value: productId.map((data) => {
            return data.l3_name;
          }),
          prefix: "levels",
          operator: "in",
        });
        payload.filters.push({
          attribute_name: "new_" + finalLevel,
          value: [className],
          prefix: "levels",
          operator: "in",
        });
      }
      payload.filters.push({
        attribute_name: "store_type",
        operator: "in",
        value: props.formData.channel_list || planDetailsData.channel,
      });
      payload.filters.push({
        attribute_name: "channel",
        prefix: "levels",
        operator: "in",
        value: props.formData.channel_list || planDetailsData.channel,
      });
      if (planDetailsData.sub_channel) {
        payload.filters.push({
          attribute_name: "sub_channel",
          prefix: "levels",
          operator: "in",
          value: planDetailsData.sub_channel,
        });
      }
      if (
        props.formData?.[props.screenConfiguration?.common?.drop_key || "drop"]
      ) {
        payload.filters.push({
          attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
          value: [
            props.formData?.[
              props.screenConfiguration?.common?.drop_key || "drop"
            ],
          ],
          prefix: "levels",
          operator: "in",
        });
      }
      payload.data_pull_source = planDetailsData?.data_pull_source || "";
      payload.compare_season = planDetailsData?.compare_season || "";
      payload.compare_type = planDetailsData.compare_year;
      if (selectedTab === "Subdepartment View") {
        payload.index_factor = Number(indexFactor);
      }
      props.set2_1_Loader(true);
      let response = await props.createNewL3(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (response?.data?.data?.status) {
        let deleteL3OptResponse = await props.deleteL3Optimization(
          {
            plan_code: props.planDetails?.data?.plan_code,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        props.setShowClusterLevel(false);
        props.setShowReviewAcrossDropsTable(false);
        displaySnackMessages(
          `${
            props.levelsJson[
              props?.screenConfiguration?.common?.final_level || "l3_name"
            ]
          } created successfully`,
          "success"
        );
        props.setShowCreateLevelThree(false);
        props.set2_1_Loader(true);
        try {
          if (!optimizationLevels.includes("carryover")) {
            fetchOptimizeL3Data();
          } else {
            fetchL3Details(planCode, props, true);
            props.set2_1_Loader(false);
          }
        } catch (err) {
          props.set2_1_Loader(false);
          props.addSnack({
            message: `Adding cluster details for new ${
              props.levelsJson[
                props?.screenConfiguration?.common?.final_level || "l3_name"
              ]
            } failed`,
            options: {
              variant: "error",
            },
          });
        }
      } else {
        props.set2_1_Loader(false);
        displaySnackMessages(
          response?.data?.data?.message?.replace(
            "class",
            props.levelsJson[
              props?.screenConfiguration?.common?.final_level || "l3_name"
            ]
          ),
          "error"
        );
      }
    } else {
      props.set2_1_Loader(false);
      displaySnackMessages(
        `${
          props.levelsJson[
            props?.screenConfiguration?.common?.final_level || "l3_name"
          ]
        } name cannot be empty`,
        "error"
      );
    }
  };
  const handleTabChange = (value) => {
    setSelectedTab(value);
  };
  return (
    <div>
      <FormControl component="fieldset" className={classes.inputGroup}>
        <RadioGroup
          row
          aria-label="selection"
          name="selection"
          defaultValue="existing"
        >
          <FormControlLabel
            value="existing"
            defaultChecked={true}
            onClick={() => setLevel3Selection("existing")}
            control={<StyledRadio color="primary" />}
            label={Plan.__Existing_Level3}
          />
          <FormControlLabel
            value="new"
            control={<StyledRadio color="primary" />}
            onClick={() => setLevel3Selection("new")}
            label={`New ${props.levelsJson[
              props?.screenConfiguration?.common?.final_level || "l3_name"
            ].toLowerCase()}`}
          />
        </RadioGroup>
      </FormControl>
      {level3Selection === "existing" && (
        <div>
          <Grid container direction="row">
            <Grid Item xs="6">
              <InputLabel>{Plan.__Default_Placeholder}</InputLabel>
              <SelectVirtual
                value={existingLevel3Data}
                onChange={(val) => {
                  setExistingLevel3Data(val);
                }}
              />
            </Grid>
          </Grid>
        </div>
      )}
      {level3Selection === "new" && (
        <div
        //  className={classes.minHeightForDiv}
        >
          <Grid direction="row" container>
            <Grid Item>
              <div>
                <InputLabel>{Plan.__Add_L3_Name}</InputLabel>
                <TextField
                  type="text"
                  variant="outlined"
                  className={classes.TextField}
                  id="new class name"
                  onChange={(e) => setAddedClassName(e.target.value)}
                  placeholder={Plan.__Add_L3_Name}
                  value={addedClassName}
                  name="new class name"
                />
              </div>
            </Grid>
            <PlanDropTabViewComponent
              groupedDrops={tabs}
              onChangeTab={handleTabChange}
              removeSorting={true}
              selectedTab={selectedTab}
            />
          </Grid>
          <Paper elevation={3} className={globalClasses.paper}>
            <Level3Modal
              createNewL3Instance={createNewL3Instance}
              formData={props.formData}
              levelTwoSelected={props.levelTwoSelected}
              levelOneSelected={props.levelOneSelected}
              finalLevel={finalLevel || "l3_name"}
              selectedTab={selectedTab}
              indexFactor={indexFactor}
              setIndexFactor={setIndexFactor}
            />
          </Paper>
        </div>
      )}
      <div className={classes.dashboardFiltersBtnsDiv}>
        <Button
          color="primary"
          variant="contained"
          className={classes.smallPrimaryButton}
          onClick={() =>
            level3Selection === "new" ? createL3() : createExistingL3()
          }
          disabled={
            level3Selection === "new" &&
            props.productList?.data?.length &&
            props.productList?.l3_data?.length
              ? false
              : !existingLevel3Data?.length
          }
        >
          Create
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    isLoading: store.assortsmartReducer.planInitialReducer.loader_2_1,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
    productList: store.assortsmartReducer.planInitialReducer.productList,
    productHierarchy:
      store.assortsmartReducer.planInitialReducer.productHierarchy,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      store
    ),
  };
};

const mapDispatchToProps = (dispatch) => ({
  getL3OptData: (payload, endpoint, objId) =>
    dispatch(getL3OptData(payload, endpoint, objId)),
  setL3OptData: (payload) => dispatch(setL3OptData(payload)),
  setL2OptData: (payload) => dispatch(setL2OptData(payload)),
  set2_1_Loader: (payload) => dispatch(set2_1_Loader(payload)),
  updateL3OptData: (payload, endpoint, objId) =>
    dispatch(updateL3OptData(payload, endpoint, objId)),
  createNewL3: (payload, endpoint, objId) =>
    dispatch(createNewL3(payload, endpoint, objId)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOptimizeL3Data: (payload, objId) =>
    dispatch(getOptimizeL3Data(payload, objId)),
  deleteL3Optimization: (payload, endpoint, objId) =>
    dispatch(deleteL3Optimization(payload, endpoint, objId)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateNewLevelThreeComponent));
