import React, { useEffect, useState } from "react";
import { Card, Button, Paper, Typography } from "@mui/material";
import { useHistory } from "react-router";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import GlobalStyles from "core/Styles/globalStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import AssortBreadCrumbs from "../assort-bread-crumbs";
import TabComponent from "../Plan/plan-drop-tab-view-component";
import StrategyKPIComponent from "./strategy-kpi-component";
import { OpenInFull } from "@mui/icons-material";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { generateDropDownOptions } from "../Plan/Plan-Wedge/plan-wedge-functions";
import WorkingStrategyTabComponent from "./Working-Strategy/working-strategy-tab-component";
import {
  getPlanDetails,
  setPlanDetails,
  getPlanLevels,
  setPlanLevels,
  setLevelsJson,
  setColumnHeaderJson,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  generateLevelJson,
  updateLyColumnHeading,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";

const CreateStrategyComponent = (props) => {
  const [tabList, setTabList] = useState({
    "IA Recommended": 0,
    "Working Strategy": 1,
  });
  const [selectedTab, setSelectedTab] = useState("Working Strategy");
  const [disableNext, setDisableNext] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clusterData, setClusterData] = useState([]);
  const [invalidL3Clusters, setInvalidL3Clusters] = useState([]);
  const [initialLoadBudgetComponent, setInitialLoadBudgetComponent] = useState(
    true
  );
  const [fromDashboardScreen_2_1, setFromDashboardScreen_2_1] = useState(false);
  const [isDepthChoiceChanged, setIsDepthChoiceChanged] = useState(false);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);
  const [version, setVersion] = useState(null);
  const [isDepthChoiceWarning, setIsDepthChoiceWarning] = useState(false);
  const [isDepthChoiceError, setIsDepthChoiceError] = useState(false);
  const [depthChoiceData, handleDepthChoiceData] = useState({});
  const classes = useStyles();
  const globalClasses = GlobalStyles();

  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        let levelData = await props.getPlanLevels();
        props.setPlanLevels(levelData?.data);
        const plandetails = await props.getPlanDetails(
          props.match.params.planCode,
          "assort-smart"
        );
        if (plandetails?.data?.status) {
          props.setPlanDetails(plandetails?.data);
        }
      } catch (error) {
        props.addSnack({
          message: "Fetching strategy plan details failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchPlanDetails();
  }, []);

  useEffect(() => {
    if (props.planLevels?.status && props.planDetails?.data) {
      props.setLevelsJson(generateLevelJson(props.planLevels.data));
      let tempLevelsJson = {
        LY:
          props.planDetails.data?.compare_year < 0
            ? updateLyColumnHeading(props.planDetails.data?.compare_year)
            : props.planDetails?.data?.compare_season || "Ref Season",
        ...generateLevelJson(props.planLevels.data),
      };
      props.setColumnHeaderJson(tempLevelsJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planLevels, props.planDetails]);

  return (
    <React.Fragment>
      {/* <AssortBreadCrumbs
        planStep={15}
        location={history.location.pathname}
      /> */}
      <Paper elevation={3} className={classes.strategyPaper}>
        <h2>Strategy</h2>
        <TabComponent
          groupedDrops={tabList}
          onChangeTab={setSelectedTab}
          selectedTab={selectedTab}
        />
        {selectedTab === "IA Recommended" ? (
          <React.Fragment>
            <div className={globalClasses.layoutAlignSpaceBetween}>
              <Typography fontWeight={600} fontSize={"16px"}>
                IA Recommended
              </Typography>
              <Button variant="outlined" onClick={() => setExpanded(!expanded)}>
                <OpenInFull />
              </Button>
            </div>
            <WorkingStrategyTabComponent
              expanded={expanded}
              clusterData={clusterData}
              sendClusterTableData={setClusterData}
              initialLoadBudgetComponent={initialLoadBudgetComponent}
              setInitialLoadBudgetComponent={setInitialLoadBudgetComponent}
              fromDashboardScreen_2_1={fromDashboardScreen_2_1}
              setDisableNext={setDisableNext}
              setInvalidL3Clusters={setInvalidL3Clusters}
              setIsDepthChoiceChanged={setIsDepthChoiceChanged}
              isDepthChoiceChanged={isDepthChoiceChanged}
              setShowReceiptDrawer={setShowReceiptDrawer}
              setVersion={setVersion}
              setIsDepthChoiceWarning={setIsDepthChoiceWarning}
              setIsDepthChoiceError={setIsDepthChoiceError}
              handleDepthChoiceData={handleDepthChoiceData}
              isView={true}
            />
          </React.Fragment>
        ) : null}
        {selectedTab === "Working Strategy" ? (
          <React.Fragment>
            <div className={globalClasses.layoutAlignSpaceBetween}>
              <Typography fontWeight={600} fontSize={"16px"}>
                Working Strategy
              </Typography>
              <Button variant="outlined" onClick={() => setExpanded(!expanded)}>
                <OpenInFull />
              </Button>
            </div>
            <WorkingStrategyTabComponent
              expanded={expanded}
              clusterData={clusterData}
              sendClusterTableData={setClusterData}
              initialLoadBudgetComponent={initialLoadBudgetComponent}
              setInitialLoadBudgetComponent={setInitialLoadBudgetComponent}
              fromDashboardScreen_2_1={fromDashboardScreen_2_1}
              setDisableNext={setDisableNext}
              setInvalidL3Clusters={setInvalidL3Clusters}
              setIsDepthChoiceChanged={setIsDepthChoiceChanged}
              isDepthChoiceChanged={isDepthChoiceChanged}
              setShowReceiptDrawer={setShowReceiptDrawer}
              setVersion={setVersion}
              setIsDepthChoiceWarning={setIsDepthChoiceWarning}
              setIsDepthChoiceError={setIsDepthChoiceError}
              handleDepthChoiceData={handleDepthChoiceData}
              isView={false}
            />
          </React.Fragment>
        ) : null}
      </Paper>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
  };
};

const mapActionsToProps = {
  getPlanDetails,
  setPlanDetails,
  getPlanLevels,
  setPlanLevels,
  setLevelsJson,
  setColumnHeaderJson,
  addSnack,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(CreateStrategyComponent);
