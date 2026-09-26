import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { bindActionCreators } from "redux";
import { withRouter } from "react-router-dom";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import GlobalStyles from "core/Styles/globalStyles";
import { Card, Grid, Typography } from "@mui/material";
import { filterView } from "core/Utils/utils";
import { Switch } from "impact-ui";
import { Button } from "@mui/base";
import { addSnack } from "core/actions/snackbarActions";
import { setWorkStrategyLoader } from "../../../services-assortsmart/Strategy-Module/strategy-module-service";
import {
  getL3OptData,
  setL3OptData,
  updateL3OptData,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import {
  getDefaultChannelValue,
  getOptimiseL3Payload,
  isChannelMultiple,
  isWholesalePlan,
  getFilteredFooter,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  fetchDepthChoiceData,
  getChannelOptionDropdown,
  getDepthOrChoicePayload,
  getFinalDepthChoicePayloadData,
  getRecalculatePayload,
} from "modules/assortsmart/pages-assortsmart/Plan/Plan-Depth-Choice/depth-choice-functions";
import DepthChoiceTableComponent from "modules/assortsmart/pages-assortsmart/Plan/Plan-Depth-Choice/depth-choice-table-component";
import { getColumnsAg } from "core/actions/tableColumnActions";
import * as strategyAssortServiceActions from "modules/assortsmart/services-assortsmart/Strategy-Module/strategy-module-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { cloneDeep, groupBy, isEmpty, uniqBy } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  getDepthChoiceData,
  set2_2_Loader,
  setDepthChoiceData,
  setDepthChoiceGraphData,
  updateDepthChoiceData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import LoadingOverlay from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { generateDropDownOptions } from "../../Plan/Plan-Wedge/plan-wedge-functions";
import { getPayloadForL3 } from "../../Plan/Plan-Initial/plan-initial-functions";
import { PARAMETERS_FORM } from "modules/assortsmart/constants-assortsmart/stringContants";

const WorkingStrageyDepthChoiceComponent = (props) => {
  const [showDepthComponent, setShowDepthComponent] = useState(true);
  const [showChoiceComponent, setShowChoiceComponent] = useState(true);
  const [channelOptions, setChannelOptions] = useState([]);
  const [depthTableCols, setDepthTableCols] = useState([]);
  const [choiceTableCols, setChoiceTableCols] = useState([]);
  const [DepthRTinstance, setDepthRTinstance] = useState(null);
  const [ChoiceRTinstance, setChoiceRTinstance] = useState(null);
  const [disableRecalculateChoiceBtn, setEnableRecalculateChoiceBtn] = useState(
    true
  );
  const [disableRecalculateDepthBtn, setEnableRecalculateDepthBtn] = useState(
    true
  );
  const [uniqueClusterList, setUniqueClusterList] = useState([]);
  const [changedMasterIds, setChangedMasterIds] = useState([]);
  const [updateDepthDataPayload, setUpdateDepthDataPayload] = useState([]);
  const [updateChoiceDataPayload, setUpdateChoiceDataPayload] = useState([]);
  const [finalDepthChoicePayload, setFinalDepthChoicePayload] = useState([]);
  const [depthChoicePayload, setDepthChoicePayload] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [showDepthChoiceComponent, setShowDepthChoiceComponent] = useState(
    false
  );
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [subChannelFormFields, setSubChannelFormFields] = useState({});

  const history = useHistory();
  const globalClasses = GlobalStyles();
  const classes = useStyles();

  const handleNextDepthChoice = () => {
    //As soon as user edit's any cluster value this function will be called
    //This functions generates depthPayload and choicePayload and set it to state
    if (DepthRTinstance?.current?.api && ChoiceRTinstance?.current?.api) {
      let depthData = getDepthOrChoicePayload(
        props,
        DepthRTinstance,
        uniqueClusterList,
        "depth",
        props.planDetails.data.plan_code
      );
      let choiceData = getDepthOrChoicePayload(
        props,
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

  const showDepthChoiceTableData = (isShow) => {
    if (isShow) {
      fetchDepthChoiceData(
        props,
        props.selectedChannel,
        setDepthChoicePayload,
        setDepthTableCols,
        setChoiceTableCols,
        setShowDepthChoiceComponent
      );
    }
    setShowDepthChoiceComponent(isShow);
  };

  useEffect(() => {
    let planCode = props.planDetails?.data?.plan_code;
    let AssortNLE = parseInt(localStorage.getItem("AssortNLE"));
    if (
      (!props.initialLoadDepthChoice ||
        props.fromDashboardScreen_2_2 ||
        planCode === AssortNLE) &&
      planCode
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
      props.setSelectedChannel(defaultChannel);
      setChannelOptions(channelOpt);
      let updatedFormData = props.formData;
      updatedFormData.channel_list = defaultChannel?.value;
      props.setFormData(updatedFormData);
      PARAMETERS_FORM[1].options = channelOpt;
      if (!isWholesalePlan(props.planDetails?.data)) {
        delete PARAMETERS_FORM[0];
      }
      setSubChannelFormFields(PARAMETERS_FORM);
    }
  }, [props.planDetails]);

  //Need to check later
  //   useEffect(() => {
  //     let formValues = formData;
  //     const levelsData = configureLevels(
  //       props.planDetails?.data,
  //       props.levelsJson,
  //       props.apsStData?.data
  //     );
  //     setLevelsOptions(levelsData?.options);
  //     if (isEmpty(levelSelected) && props.apsStData?.data) {
  //       setLevelSelected(levelsData?.selectedValue);
  //       //Configure formdata for levels
  //       Object.keys(props.levelsJson).forEach((level) => {
  //         if (!isEmpty(levelsData?.selectedValue?.[level])) {
  //           formValues[level] = levelsData?.selectedValue?.[level]?.label;
  //         }
  //       });
  //       setFormData(formValues);
  //     }
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, [props.apsStData?.data, props.depthChoiceData]);

  useEffect(() => {
    if (DepthRTinstance?.data && ChoiceRTinstance?.data) {
      handleNextDepthChoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DepthRTinstance, ChoiceRTinstance]);

  useEffect(() => {
    if (DepthRTinstance && ChoiceRTinstance) {
      handleNextDepthChoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DepthRTinstance, ChoiceRTinstance]);

  useEffect(() => {
    if (
      (props.depthChoiceData?.choice_data &&
        props.depthChoiceData?.depth_data) ||
      !props.depthChoiceData?.length
    ) {
      setShowLoader(false);
    }
  }, [props.apsStData, props.depthChoiceData]);

  useEffect(() => {
    if (showDepthChoiceComponent && props.planDetails?.data) {
      showDepthChoiceTableData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedChannel]);

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
          version: props.version,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
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
        depthChoicePayload.optimization_level =
          props.screenConfiguration?.common?.final_level || "l3_name";
        props.setDepthChoiceData([]);
        let response = await props.getDepthChoiceData(
          depthChoicePayload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
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

  //   const confirmChannelChange = () => {
  //     setSelectedChannel(tempSelectedChannel);
  //     setShowChnConfirm(false);
  //     setEnableRecalculateDepthBtn(true);
  //     setEnableRecalculateChoiceBtn(true);
  //   };

  //   const handleChangeSubChannelFilter = (updatedFormData, id) => {
  //     setFormData(updatedFormData);
  //     setCallUpdateApsData(true);
  //   };

  //   const onChannelChange = (val) => {
  //     if (!disableRecalculateChoiceBtn || !disableRecalculateDepthBtn) {
  //       setTempSelectedChannel(val);
  //       setShowChnConfirm(true);
  //     } else {
  //       setSelectedChannel(val);
  //     }
  //   };

  //   const handleLevelsChange = (option, key) => {
  //     const selectedValue = levelSelected;
  //     let formOption = cloneDeep(formData);
  //     selectedValue[key.filter_id] = option;
  //     formOption[key.filter_id] = option?.label;
  //     if (key.filter_id === "l1_name") {
  //       let l2ValuesOpt = [];
  //       const groupByProperties = ["l1_name", "l2_name"];
  //       const groupResult = groupByCustom({
  //         Group: props.apsStData?.data,
  //         By: groupByProperties,
  //       });
  //       groupResult.forEach((item) => {
  //         let filter = item.filter((itm) => itm.l1_name === option?.label);
  //         if (filter?.length) {
  //           l2ValuesOpt.push({
  //             label: filter[0]?.l2_name,
  //             value: filter[0]?.l2_name,
  //             id: filter[0]?.l2_name,
  //           });
  //         }
  //       });
  //       levelsOptions.l2_name = l2ValuesOpt;
  //       formOption.l2_name = l2ValuesOpt[0]?.label;
  //       selectedValue.l2_name = l2ValuesOpt[0];
  //       setLevelsOptions(levelsOptions);
  //     }
  //     setFormData(formOption);
  //     setLevelSelected(selectedValue);
  //   };

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
    <React.Fragment>
      <LoadingOverlay loader={props.loader} spinner>
        {depthChoiceArr.map((item) => {
          let showComponent =
            item === "Choice" ? showChoiceComponent : showDepthComponent;
          let setShowComponent =
            item === "Choice" ? setShowChoiceComponent : setShowDepthComponent;
          return (
            <div>
              <div className={classes.heading}>
                <div className={globalClasses.layoutAlignSpaceBetween}>
                  <Typography fontWeight={600} fontSize={"16px"}>
                    {item === "Choice" ? styleOrChoice : "Depth"}
                  </Typography>
                  <div className={classes.verticalLine}></div>
                  <Switch
                    checked={showComponent}
                    onChange={(e) => {
                      setShowComponent(!showComponent);
                    }}
                    leftLabel={showComponent ? "Hide" : "Show"}
                    rightLabel=""
                  />
                </div>
                {showComponent && (
                  <div className={classes.rightEnd}>
                    {props.levelOneOptions.length > 1 &&
                      filterView(
                        props.columnHeaderJson?.l1_name,
                        "l1_name",
                        props.levelOneOptions,
                        props.handleL1ValueChange,
                        props.levelOneSelected,
                        `${classes.assortMultiFilterView} ${classes.flexRow}`,
                        classes.inputLabel
                      )}
                    {props.levelTwoOptions.length > 0 &&
                      filterView(
                        props.columnHeaderJson?.l2_name,
                        "l2_name",
                        props.levelTwoOptions,
                        props.handleL2ValueChange,
                        props.levelTwoSelected,
                        `${classes.assortMultiFilterView} ${classes.flexRow}`,
                        classes.inputLabel
                      )}

                    {/* Filter optimisation needed
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
                    })} */}
                    {/* {isChannelMultiple(props.planDetails?.data) &&
                      filterView(
                        "Channel",
                        "channel",
                        channelOptions,
                        onChannelChange,
                        selectedChannel,
                        classes.formContainer,
                        classes.inputLabel
                      )} */}
                    {/* {!history.location.pathname.includes("view") && (
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
                    )}  */}
                  </div>
                )}
              </div>
              <DepthChoiceTableComponent
                RTinstance={
                  item === "Choice" ? ChoiceRTinstance : DepthRTinstance
                }
                setRTinstance={
                  item === "Choice" ? setChoiceRTinstance : setDepthRTinstance
                }
                columns={item === "Choice" ? choiceTableCols : depthTableCols}
                setColumns={
                  item === "Choice" ? setChoiceTableCols : setDepthTableCols
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
                formData={cloneDeep(props.formData)}
                loading={props.isLoading || showLoader}
                setDisableNext={props.setDisableNext}
                selectedChannel={props.selectedChannel}
                levelSelected={props.levelSelected}
                setIsDepthChoiceChanged={props.setIsDepthChoiceChanged}
                isDepthChoiceChanged={props.isDepthChoiceChanged}
                setVersion={props.setVersion}
                version={props.version}
                isView={props.isView}
              />
            </div>
          );
        })}
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
    loader: strategyAssortServiceActions.workStrategyLoaderSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
      getL3OptData,
      setL3OptData,
      updateL3OptData,
      addSnack,
      setWorkStrategyLoader,
      set2_2_Loader,
      getDepthChoiceData,
      setDepthChoiceData,
      setDepthChoiceGraphData,
      updateDepthChoiceData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(WorkingStrageyDepthChoiceComponent));
