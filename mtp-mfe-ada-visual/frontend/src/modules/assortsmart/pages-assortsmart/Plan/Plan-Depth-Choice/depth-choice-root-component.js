import CheckIcon from "@mui/icons-material/Check";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Card, Grid, Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { groupByCustom } from "core/Utils/formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt, Switch } from "impact-ui";
import { cloneDeep, groupBy, isEmpty } from "lodash";
import { useHistory } from "react-router";
import {
  DepthChoice,
  PARAMETERS_FORM,
  common,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { configureLevels } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planDepthChoiceServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import {
  getDepthChoiceData,
  set2_2_Loader,
  setDepthChoiceData,
  setDepthChoiceGraphData,
  updateDepthChoiceData,
} from "../../../services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import {
  filterView,
  getDefaultChannelValue,
  isChannelMultiple,
  isEcomPlan,
  isWholesalePlan,
  scrollIntoView,
} from "../../../utils-assortsmart/utilityFunctions";
import PDCParameters from "./aps-st-table-component";
import {
  fetchDepthChoiceData,
  getChannelOptionDropdown,
  getDepthOrChoicePayload,
  getFinalDepthChoicePayloadData,
  getRecalculatePayload,
} from "./depth-choice-functions";
import DepthChoiceGraphComponent from "./depth-choice-graph-component";
import DepthChoiceTableComponent from "./depth-choice-table-component";

const PlanDepthChoiceComponent = (props) => {
  const [depthTableCols, setDepthTableCols] = useState([]);
  const [choiceTableCols, setChoiceTableCols] = useState([]);
  const [DepthRTinstance, setDepthRTinstance] = useState(null);
  const [ChoiceRTinstance, setChoiceRTinstance] = useState(null);
  const [ApsStRTinstance, setApsStRTinstance] = useState(null);
  const [uniqueClusterList, setUniqueClusterList] = useState([]);
  const [changedMasterIds, setChangedMasterIds] = useState([]);
  const [disableRecalculateChoiceBtn, setEnableRecalculateChoiceBtn] = useState(
    true
  );
  const [disableRecalculateDepthBtn, setEnableRecalculateDepthBtn] = useState(
    true
  );
  const [showDepthChoiceComponent, setShowDepthChoiceComponent] = useState(
    false
  );
  const [updateDepthDataPayload, setUpdateDepthDataPayload] = useState([]);
  const [updateChoiceDataPayload, setUpdateChoiceDataPayload] = useState([]);
  const [finalDepthChoicePayload, setFinalDepthChoicePayload] = useState([]);
  const [depthChoicePayload, setDepthChoicePayload] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [toggleCoreChoice, setToggleCoreChoice] = useState(false);
  const [showChnConfirm, setShowChnConfirm] = useState(false);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [showAllDoorCCPopup, setShowAllDoorCCPopup] = useState(false);
  const [subChannelFormFields, setSubChannelFormFields] = useState([]);
  const [parameterTableData, setParameterTableData] = useState([]);
  const [formData, setFormData] = useState({});
  const [tempSelectedChannel, setTempSelectedChannel] = useState({});
  //until userconfirm's the change we need to store the channel selected by user
  const [selectedChannel, setSelectedChannel] = useState({});
  const [channelOptions, setChannelOptions] = useState([]);
  const [levelsOptions, setLevelsOptions] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [checkSetAllValidation, setCheckSetAllValidation] = useState(false);
  const [callUpdateApsData, setCallUpdateApsData] = useState(false);
  const [isAPSsave, setAPSsave] = useState(false);

  const history = useHistory();
  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    let planCode = props.planDetails?.data?.plan_code;
    let AssortNLE = parseInt(localStorage.getItem("AssortNLE"));
    if (
      !props.initialLoadDepthChoice ||
      props.fromDashboardScreen_2_2 ||
      planCode === AssortNLE
    ) {
      setShowLoader(true);
      setShowDepthChoiceComponent(true);
      showDepthChoiceTableData(true);
    }
    return () => {
      props.setShowReceiptDrawer(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails?.data]);

  useEffect(() => {
    // get Parameters table form options for sub_channel and channel field
    if (
      parameterTableData?.length &&
      isWholesalePlan(props.planDetails?.data)
    ) {
      let sub_channel = groupBy(parameterTableData, "sub_channel");
      // get Parameters table form options for sub_channel field
      let channelOpt = getChannelOptionDropdown(sub_channel);
      let updatedFormData = formData;
      updatedFormData.sub_channel_list = channelOpt?.[0]?.value;
      setFormData(updatedFormData);
      PARAMETERS_FORM[0].options = channelOpt;
      // delete channel form field in case it does not have multiple channel
      if (!isChannelMultiple(props.planDetails?.data)) {
        delete PARAMETERS_FORM[1];
      }
      setSubChannelFormFields(PARAMETERS_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameterTableData]);

  useEffect(() => {
    if (isChannelMultiple(props.planDetails?.data)) {
      let channelOpt = props.planDetails?.data?.channel?.map((item) => {
        return {
          label: item,
          value: item,
          id: item,
        };
      });
      let defaultChannel = getDefaultChannelValue(
        channelOpt,
        props.planDetails?.data
      );
      setSelectedChannel(defaultChannel);
      setChannelOptions(channelOpt);
      let updatedFormData = formData;
      updatedFormData.channel_list = defaultChannel?.value;
      setFormData(updatedFormData);
      PARAMETERS_FORM[1].options = channelOpt;
      if (!isWholesalePlan(props.planDetails?.data)) {
        delete PARAMETERS_FORM[0];
      }
      setSubChannelFormFields(PARAMETERS_FORM);
    }
  }, [props.planDetails]);

  useEffect(() => {
    let formValues = formData;
    const levelsData = configureLevels(
      props.planDetails?.data,
      props.levelsJson,
      props.apsStData?.data
    );
    setLevelsOptions(levelsData?.options);
    if (isEmpty(levelSelected) && props.apsStData?.data) {
      setLevelSelected(levelsData?.selectedValue);
      //Configure formdata for levels
      Object.keys(props.levelsJson).forEach((level) => {
        if (!isEmpty(levelsData?.selectedValue?.[level])) {
          formValues[level] = levelsData?.selectedValue?.[level]?.label;
        }
      });
      setFormData(formValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.apsStData?.data, props.depthChoiceData]);

  useEffect(() => {
    if (DepthRTinstance?.data && ChoiceRTinstance?.data) {
      handleNextDepthChoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DepthRTinstance, ChoiceRTinstance]);

  useEffect(() => {
    if (
      props.apsStData?.data &&
      ((props.depthChoiceData?.choice_data &&
        props.depthChoiceData?.depth_data) ||
        !props.depthChoiceData?.length)
    ) {
      setShowLoader(false);
    }
  }, [props.apsStData, props.depthChoiceData]);

  useEffect(() => {
    if (DepthRTinstance && ChoiceRTinstance) {
      handleNextDepthChoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DepthRTinstance, ChoiceRTinstance]);

  useEffect(() => {
    if (showDepthChoiceComponent && props.planDetails?.data) {
      showDepthChoiceTableData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]);

  useEffect(() => {
    checkDepthChoiceWarning();
    if (finalDepthChoicePayload) {
      props.handleDepthChoiceData({
        cluster_depth_choice_data: finalDepthChoicePayload,
        //if user clicks on save and next,
        //value should be directly inserted on table without any recalculation
        recalculate: false,
      });
      props.setDisableNext(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalDepthChoicePayload]);

  const setCoreChoiceValue = (value) => {
    setToggleCoreChoice(value);
  };

  const showDepthChoiceTableData = (isShow) => {
    if (isShow) {
      fetchDepthChoiceData(
        props,
        selectedChannel,
        setDepthChoicePayload,
        setDepthTableCols,
        setChoiceTableCols,
        setShowDepthChoiceComponent
      );
    }
    setShowDepthChoiceComponent(isShow);
  };

  const handleNextDepthChoice = () => {
    //As soon as user edit's any cluster value this function will be called
    //This functions generates depthPayload and choicePayload and set it to state
    if (DepthRTinstance?.current?.api && ChoiceRTinstance?.current?.api) {
      let depthData = getDepthOrChoicePayload(
        DepthRTinstance,
        uniqueClusterList,
        "depth",
        props.planDetails.data.plan_code
      );
      let choiceData = getDepthOrChoicePayload(
        ChoiceRTinstance,
        uniqueClusterList,
        "choice",
        props.planDetails.data.plan_code,
        props.setIsDepthChoiceError
      );
      let choicePayload = [].concat.apply([], choiceData);
      let depthPayload = [].concat.apply([], depthData);

      setUpdateDepthDataPayload(depthPayload);
      setUpdateChoiceDataPayload(choicePayload);
      let finalDepthChoicePayloadData = getFinalDepthChoicePayloadData(
        depthPayload,
        choicePayload,
        changedMasterIds
      );
      setFinalDepthChoicePayload(finalDepthChoicePayloadData);
    }
  };

  const checkDepthChoiceWarning = () => {
    if (!disableRecalculateChoiceBtn || !disableRecalculateDepthBtn) {
      props.setIsDepthChoiceWarning(true);
      return true;
    } else {
      props.setIsDepthChoiceWarning(false);
      return false;
    }
  };

  const recalculateDepthChoice = async (depthOrChoice, isSave = false) => {
    props.set2_2_Loader(true);
    props.setDisableNext(true);
    checkDepthChoiceWarning();
    let payloadData =
      depthOrChoice === "depth"
        ? updateChoiceDataPayload
        : updateDepthDataPayload;

    let recalculatePayload = getRecalculatePayload(
      payloadData,
      depthOrChoice,
      changedMasterIds
    );
    setChangedMasterIds([]);
    try {
      setDepthRTinstance(null);
      setChoiceRTinstance(null);
      props.setInitialLoadWedge(true);
      props.setInitialLoadFinalize(true);
      props.setFromDashboardScreen_2_3(false);
      props.setFromDashboardScreen_2_4(false);
      let updateDataResponse = await props.updateDepthChoiceData(
        {
          cluster_depth_choice_data: recalculatePayload,
          //if user clicks on recalculate button,
          //values should be calculated and inserted into the table
          recalculate: !isSave,
          plan_code: props.planDetails?.data?.plan_code,
          is_value_changed: props.isDepthChoiceChanged,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updateDataResponse?.status) {
        props.setIsDepthChoiceChanged(false);
        props.addSnack({
          message: updateDataResponse?.data?.data?.message,
          options: {
            variant: "success",
          },
        });
        if (depthOrChoice === "choice") {
          setEnableRecalculateChoiceBtn(true);
        } else {
          setEnableRecalculateDepthBtn(true);
        }
        props.setDepthChoiceData([]);
        let response = await props.getDepthChoiceData(
          depthChoicePayload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        if (!isEmpty(response)) {
          let depthChoiceData = response?.data?.data?.data;
          if (depthChoiceData?.choice_data && depthChoiceData?.depth_data) {
            props.setDisableNext(false);
            props.setDepthChoiceData(depthChoiceData);
          } else {
            setShowDepthChoiceComponent(false);
            props.setDisableNext(true);
          }
          props.setDepthChoiceGraphData(response?.data?.data);
        }
      }
    } catch (err) {
      props.addSnack({
        message: "Updating depth choice details failed",
        options: {
          variant: "error",
        },
      });
    }
    props.set2_2_Loader(false);
  };

  const handleAllDoorCcPopup = (e) => {
    if (showDepthChoiceComponent) {
      setShowAllDoorCCPopup(true);
    } else {
      handleToggleCoreChoice(e);
    }
  };

  const handleToggleCoreChoice = (e) => {
    setShowDepthChoiceComponent(false);
    setToggleCoreChoice(!toggleCoreChoice);
    setDepthRTinstance(null);
    setChoiceRTinstance(null);
    if (showAllDoorCCPopup) {
      setShowAllDoorCCPopup(false);
    }
  };

  const confirmChannelChange = () => {
    setSelectedChannel(tempSelectedChannel);
    setShowChnConfirm(false);
    setEnableRecalculateDepthBtn(true);
    setEnableRecalculateChoiceBtn(true);
  };

  const handleChangeSubChannelFilter = (updatedFormData, id) => {
    setFormData(updatedFormData);
    setCallUpdateApsData(true);
  };

  const onChannelChange = (val) => {
    if (!disableRecalculateChoiceBtn || !disableRecalculateDepthBtn) {
      setTempSelectedChannel(val);
      setShowChnConfirm(true);
    } else {
      setSelectedChannel(val);
    }
  };

  const handleLevelsChange = (option, key) => {
    const selectedValue = levelSelected;
    let formOption = cloneDeep(formData);
    selectedValue[key.filter_id] = option;
    formOption[key.filter_id] = option?.label;
    if (key.filter_id === "l1_name") {
      let l2ValuesOpt = [];
      const groupByProperties = ["l1_name", "l2_name"];
      const groupResult = groupByCustom({
        Group: props.apsStData?.data,
        By: groupByProperties,
      });
      groupResult.forEach((item) => {
        let filter = item.filter((itm) => itm.l1_name === option?.label);
        if (filter?.length) {
          l2ValuesOpt.push({
            label: filter[0]?.l2_name,
            value: filter[0]?.l2_name,
            id: filter[0]?.l2_name,
          });
        }
      });
      levelsOptions.l2_name = l2ValuesOpt;
      formOption.l2_name = l2ValuesOpt[0]?.label;
      selectedValue.l2_name = l2ValuesOpt[0];
      setLevelsOptions(levelsOptions);
    }
    setFormData(formOption);
    setLevelSelected(selectedValue);
  };

  let styleOrChoice =
    props.screenConfiguration?.common.plan_step_names_assort?.["2.2"] ===
    "Depth & Style"
      ? "Style"
      : "Choice";
  let isDepthFirst = props.screenConfiguration?.["2.2"]?.depth_first || false;

  const depthChoiceArr = isDepthFirst
    ? ["Depth", "Choice"]
    : ["Choice", "Depth"];

  return (
    <>
      <LoadingOverlay loader={props.isLoading || showLoader} spinner>
        <Card className={globalClasses.paper}>
          <div className={classes.heading}>
            <Typography variant="h3" gutterBottom>
              Parameters
            </Typography>
            {Object.keys(props.levelsJson).map((levelKey) => {
              return (
                levelsOptions[levelKey]?.length > 0 &&
                filterView(
                  props.columnHeaderJson?.[levelKey],
                  levelKey,
                  levelsOptions[levelKey],
                  handleLevelsChange,
                  levelSelected[levelKey],
                  classes.formContainer,
                  classes.inputLabel
                )
              );
            })}
            {subChannelFormFields?.length > 0 &&
              parameterTableData?.length > 0 && (
                <div className={classes.formContainer}>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={1}
                    handleChange={handleChangeSubChannelFilter}
                    fields={subChannelFormFields}
                    updateDefaultValue={false}
                    defaultValues={formData}
                    handleDropdownClose={true}
                  ></Form>
                </div>
              )}
            {!history.location.pathname.includes("view") && (
              <>
                <div className={classes.rightEnd}>
                  <Switch
                    id="cluster-toggle"
                    checked={toggleCoreChoice ? true : false}
                    onChange={(e) => handleAllDoorCcPopup(e)}
                    leftLabel={`All-door ${styleOrChoice} configuration`}
                  />
                </div>
                <Button
                  variant="contained"
                  color="primary"
                  id="productSetAllBtn"
                  className={globalClasses.marginLeft1rem}
                  onClick={() => {
                    setCheckSetAllValidation(true);
                  }}
                >
                  Set All
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  className={globalClasses.marginLeft1rem}
                  onClick={() => {
                    setAPSsave(true);
                  }}
                >
                  <SaveIcon />
                </Button>
              </>
            )}
          </div>

          <Prompt
            isOpen={showAllDoorCCPopup}
            title="Confirm Changes"
            subHeading="Do you want to proceed with the current change?"
            infoList={[]}
            primaryButtonProps={{
              children: common.__ConfirmBtnText,
              onClick: () => {
                handleToggleCoreChoice();
                setShowAllDoorCCPopup(false);
              },
            }}
            tertiaryButtonProps={{
              children: common.__RejectBtnText,
              onClick: () => setShowAllDoorCCPopup(false),
            }}
          />
          <PDCParameters
            showDepthChoiceTable={showDepthChoiceTableData}
            setShowDepthChoiceComponent={setShowDepthChoiceComponent}
            initialLoadDepthChoice={props.initialLoadDepthChoice}
            setDisableNext={props.setDisableNext}
            RTinstance={ApsStRTinstance}
            setRTinstance={setApsStRTinstance}
            fromDashboardScreen_2_2={props.fromDashboardScreen_2_2}
            setEnableRecalculateChoiceBtn={setEnableRecalculateChoiceBtn}
            setEnableRecalculateDepthBtn={setEnableRecalculateDepthBtn}
            coreChoice={toggleCoreChoice}
            selectedDropData={selectedDropData}
            setSelectedDropData={setSelectedDropData}
            setCoreChoice={(value) => setCoreChoiceValue(value)}
            setSubChannelFormFields={setSubChannelFormFields}
            formData={formData}
            setFormData={setFormData}
            setParameterTableData={setParameterTableData}
            checkSetAllValidation={checkSetAllValidation}
            setCheckSetAllValidation={setCheckSetAllValidation}
            setInitialLoadWedge={props.setInitialLoadWedge}
            setInitialLoadFinalize={props.setInitialLoadFinalize}
            setFromDashboardScreen_2_2={props.setFromDashboardScreen_2_2}
            setFromDashboardScreen_2_3={props.setFromDashboardScreen_2_3}
            setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
            showDepthChoiceComponent={
              !props.initialLoadDepthChoice || props.fromDashboardScreen_2_2
            }
            callUpdateApsData={callUpdateApsData}
            setCallUpdateApsData={setCallUpdateApsData}
            isAPSsave={isAPSsave}
            setIsSave={setAPSsave}
          />
        </Card>
        {showDepthChoiceComponent ? (
          <>
            <div
              className={
                isEcomPlan(props.planDetails?.data) ||
                uniqueClusterList?.length === 1
                  ? classes.depthChoiceFlex
                  : ""
              }
            >
              {depthChoiceArr.map((item) => {
                return (
                  <Card
                    className={globalClasses.paper}
                    id={item === "Choice" ? "choice-table" : "depth-table"}
                  >
                    <Grid className={classes.heading} container direction="row">
                      <Grid Item>
                        <Typography variant="h3">
                          {item === "Choice" ? styleOrChoice : "Depth"}
                        </Typography>
                      </Grid>
                      {Object.keys(props.levelsJson).map((levelKey) => {
                        return (
                          levelsOptions[levelKey]?.length > 0 &&
                          filterView(
                            props.columnHeaderJson?.[levelKey],
                            levelKey,
                            levelsOptions[levelKey],
                            handleLevelsChange,
                            levelSelected[levelKey],
                            classes.formContainer,
                            classes.inputLabel
                          )
                        );
                      })}
                      {isChannelMultiple(props.planDetails?.data) &&
                        filterView(
                          "Channel",
                          "channel",
                          channelOptions,
                          onChannelChange,
                          selectedChannel,
                          classes.formContainer,
                          classes.inputLabel
                        )}
                      {!history.location.pathname.includes("view") && (
                        <div className={classes.rightEnd}>
                          <Button
                            variant="outlined"
                            color="primary"
                            className={globalClasses.marginLeft1rem}
                            onClick={() => {
                              recalculateDepthChoice(
                                item === "Choice" ? "depth" : "choice",
                                true
                              );
                            }}
                          >
                            <SaveIcon />
                          </Button>
                        </div>
                      )}
                    </Grid>

                    <DepthChoiceTableComponent
                      RTinstance={
                        item === "Choice" ? ChoiceRTinstance : DepthRTinstance
                      }
                      setRTinstance={
                        item === "Choice"
                          ? setChoiceRTinstance
                          : setDepthRTinstance
                      }
                      columns={
                        item === "Choice" ? choiceTableCols : depthTableCols
                      }
                      enableRecalculateBtn={
                        item === "Choice"
                          ? setEnableRecalculateDepthBtn
                          : setEnableRecalculateChoiceBtn
                      }
                      depthOrChoice={item === "Choice" ? "choice" : "depth"}
                      changedMasterIds={changedMasterIds}
                      handleChangedMasterIds={setChangedMasterIds}
                      setUniqueClusterList={setUniqueClusterList}
                      uniqueClusterList={uniqueClusterList}
                      handleNextDepthChoice={handleNextDepthChoice}
                      finalDepthChoicePayload={finalDepthChoicePayload}
                      checkDepthChoiceWarning={checkDepthChoiceWarning}
                      showDepthChoiceTableData={showDepthChoiceTableData}
                      selectedDropData={selectedDropData}
                      setSelectedDropData={setSelectedDropData}
                      formData={cloneDeep(formData)}
                      loading={props.isLoading || showLoader}
                      setDisableNext={props.setDisableNext}
                      selectedChannel={selectedChannel}
                      levelSelected={levelSelected}
                      setIsDepthChoiceChanged={props.setIsDepthChoiceChanged}
                      isDepthChoiceChanged={props.isDepthChoiceChanged}
                    />
                    {!history.location.pathname.includes("view") && (
                      <div className={classes.rightAlignButtonAssort}>
                        <Button
                          variant="contained"
                          color="primary"
                          className={classes.button}
                          id={
                            item === "Choice"
                              ? "reclculate-depth"
                              : "reclculate-choice"
                          }
                          onClick={() => {
                            recalculateDepthChoice(
                              item === "Choice" ? "depth" : "choice"
                            );
                            scrollIntoView(
                              item === "Choice" ? "depth-table" : "choice-table"
                            );
                          }}
                          disabled={
                            item === "Choice"
                              ? disableRecalculateDepthBtn
                              : disableRecalculateChoiceBtn
                          }
                          startIcon={<CheckIcon />}
                        >
                          Recalculate{" "}
                          {item === "Choice" ? "Depth" : styleOrChoice}
                        </Button>
                      </div>
                    )}
                    <Prompt
                      isOpen={showChnConfirm}
                      title={DepthChoice._channel_Change_confirm_header}
                      subHeading="Edited changes will be lost without clicking on 'Recalculate' button. Are you sure to proceed without saving?"
                      infoList={[]}
                      primaryButtonProps={{
                        label: common.__ConfirmBtnText,
                        onClick: () => {
                          confirmChannelChange();
                          setShowChnConfirm(false);
                        },
                      }}
                      tertiaryButtonProps={{
                        label: common.__RejectBtnText,
                        onClick: () => setShowChnConfirm(false),
                      }}
                    />
                  </Card>
                );
              })}
            </div>
            <div className={classes.chartComponent}>
              {formData &&
                depthChoiceArr?.map((item) => {
                  return (
                    <DepthChoiceGraphComponent
                      depthChoiceGraphData={props.depthChoiceGraphData}
                      planDetails={props.planDetails}
                      formData={formData}
                      screenConfiguration={props.screenConfiguration}
                      depthOrChoice={item}
                    />
                  );
                })}
            </div>
          </>
        ) : null}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    depthChoiceData: planDepthChoiceServiceActions.depthChoiceDataSelector(
      state
    ),
    depthChoiceGraphData: planDepthChoiceServiceActions.depthChoiceGraphDataSelector(
      state
    ),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    isLoading: planDepthChoiceServiceActions.loader_2_2_Selector(state),
    apsStData: planDepthChoiceServiceActions.apsStDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getDepthChoiceData,
      setDepthChoiceData,
      setDepthChoiceGraphData,
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
)(withRouter(PlanDepthChoiceComponent));
