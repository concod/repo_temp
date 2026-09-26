import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router";
import { Typography, Card, Container } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import ComparePlanLevelThreeTable from "./Compare-plan-level-three-table";
import ComparePlanClusterTable from "./compare-plan-cluster-table";
import {
  getPlanLevels,
  setPlanLevels,
  getPlanDetails,
  setPlanDetails,
  setLevelsJson,
  setColumnHeaderJson,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { getPlanMetricsData } from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  generateLevelJson,
  updateLyColumnHeading,
  filterView,
  getPlanPayload,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  getComparePlanTableData,
  setLoader,
  setClusterLoader,
  setComparePlanTableData,
  validateComparePlan,
  getComparePlanClusterData,
  setComparePlanClusterTableData,
  setPlanMetricsData,
} from "modules/assortsmart/services-assortsmart/Plan/Compare-Plan/compare-plan-service";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

const ComparePlanContainer = (props) => {
  const {
    plan_code,
    drop_plan_code,
    noOfPlans,
    hideClusterTable,
  } = props.location?.state;
  const globalClasses = globalStyles();
  const styles = useStyles();
  const [comparePlanTableCols, setComparePlanTableCols] = useState([]);
  const [comparePlanRTinstance, setComparePlanRTinstance] = useState(null);
  const [
    comparePlanClusterRTinstance,
    setComparePlanClusterRTinstance,
  ] = useState(null);
  const [clusterTableCols, setClusterTableCols] = useState([]);
  const [level1Options, setLevel1Options] = useState([]);
  const [level3Options, setLevel3Options] = useState([]);
  const [selectedL1FilterValue, setSelectedL1FilterValue] = useState({});
  const [selectedL3FilterValue, setSelectedL3FilterValue] = useState({});

  const generateOptions = (rawData) => {
    return (
      rawData?.length &&
      rawData.map((eachOption) => {
        return {
          label: eachOption,
          value: eachOption,
        };
      })
    );
  };

  useEffect(() => {
    if (props.planMetricsData?.length) {
      const tempL1Options = generateOptions(
        props.planMetricsData[0]?.["l1_name"]
      );
      const tempL3Options = generateOptions(
        props.planMetricsData[0]?.["l3_name"]
      );
      setLevel1Options(tempL1Options);
      setLevel3Options(tempL3Options);
      setSelectedL1FilterValue(tempL1Options?.[0] || {});
      setSelectedL3FilterValue(tempL3Options?.[0] || {});
    }
  }, [props.planMetricsData]);

  useEffect(() => {
    const setPlanData = async () => {
      props.setLoader(true);
      let levelData = await props.getPlanLevels();
      props.setPlanLevels(levelData?.data);
      let planDetails = await props.getPlanDetails(
        plan_code[0],
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setPlanDetails(planDetails?.data);
      sessionStorage.setItem("planData", JSON.stringify(planDetails?.data));
    };
    setPlanData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!hideClusterTable) {
      validatePlan();
    } else {
      fetchComparePlanData();
      fetchPlanMetricsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onChangeL3 = (val) => {
    props.setComparePlanClusterTableData([]);
    setSelectedL3FilterValue(val);
  };

  useEffect(() => {
    return () => {
      props.setComparePlanClusterTableData([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlanMetricsData = async () => {
    try {
      const reqBody = {
        filters: [
          {
            attribute_name: "plan_code",
            operator: "in",
            value: plan_code,
          },
        ],
      };
      props.setClusterLoader(true);
      const planMetrics = await props.getPlanMetricsData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setPlanMetricsData(planMetrics.data.data);
    } catch (err) {
      displaySnackMessages("Something Went Wrong", "error");
    }
    props.setClusterLoader(false);
  };

  useEffect(() => {
    if (!isEmpty(selectedL3FilterValue) && !hideClusterTable) {
      fetchComparePlanClusterData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL3FilterValue]);

  const fetchComparePlanClusterData = async () => {
    try {
      if (drop_plan_code.length === 0) drop_plan_code.push(0);
      else if (plan_code.length === 0) plan_code.push(0);
      const planDetails = props.planDetails.data;
      let level3Data = [];
      const planData = {
        plan_code: plan_code,
        l0_name: planDetails?.l0_name,
        l1_name: planDetails?.l1_name,
        l2_name: planDetails?.l2_name,
        selling_period_sdate: planDetails?.selling_period_sdate,
        selling_period_edate: planDetails?.selling_period_edate,
      };
      let reqBodyClusterPlan = getPlanPayload(
        planData,
        props.planLevels,
        true,
        true
      );
      reqBodyClusterPlan.filters.forEach((item) => {
        if (item["attribute_name"] === "plan_code") {
          item["value"] = item["value"][0];
        }
      });
      level3Data.push(selectedL3FilterValue["value"]);
      reqBodyClusterPlan.filters.push({
        attribute_name: "l3_name",
        value: level3Data,
        operator: "in",
      });
      props.setClusterLoader(true);
      const response = await getComparePlanClusterData(
        reqBodyClusterPlan,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (response) {
        const columnData = response.data.data.columns;
        let clusterColumn = agGridColumnFormatter(
          cloneDeep(columnData),
          props.levelsJson
        );
        setClusterTableCols(clusterColumn);
        const rowData = response.data.data.data;
        props.setComparePlanClusterTableData(rowData);
      }
    } catch (err) {
      displaySnackMessages("something went wrong", "error");
    }
    props.setClusterLoader(false);
  };

  const fetchComparePlanData = async () => {
    try {
      if (drop_plan_code.length === 0) drop_plan_code.push(0);
      else if (plan_code.length === 0) plan_code.push(0);
      const reqBody = {
        filters: [
          {
            attribute_name: "plan_code",
            operator: "in",
            value: plan_code,
          },
          {
            attribute_name: "drop_plan_code",
            operator: "in",
            value: drop_plan_code,
          },
        ],
      };
      props.setLoader(true);
      const response = await getComparePlanTableData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (response) {
        const columnData = response.data.data.columns;
        const rowdata = response.data.data.data;
        props.setComparePlanTableData(rowdata);
        let level3Columns = agGridColumnFormatter(
          cloneDeep(columnData),
          props.levelsJson
        );
        setComparePlanTableCols(level3Columns);
      }
      props.setLoader(false);
    } catch (err) {
      displaySnackMessages("Compare plan failed", "error");
      props.setLoader(false);
    }
  };

  const validatePlan = async () => {
    try {
      const value = plan_code.concat(drop_plan_code);
      const req = {
        filters: [
          {
            attribute_name: "plan_code",
            operator: "in",
            value: value,
          },
        ],
      };
      const res = await validateComparePlan(
        req,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (res && res.data.data.message === "Clusters similar") {
        fetchComparePlanData();
        fetchPlanMetricsData();
      } else {
        displaySnackMessages("Clusters are not similar", "error");
        props.setLoader(false);
      }
    } catch (e) {
      displaySnackMessages("Something went wrong", "error");
      props.setLoader(false);
    }
  };

  return (
    <>
      <Container maxWidth={false}>
        <Typography className={styles.heading} variant="h3">
          Compare Plans
        </Typography>
        <LoadingOverlay loader={props.loader}>
          {comparePlanTableCols.length > 0 && (
            <Card className={globalClasses.paper}>
              <div className={styles.heading}>
                {filterView(
                  props.levelsJson["l1_name"],
                  "l1_name",
                  level1Options,
                  setSelectedL1FilterValue,
                  selectedL1FilterValue,
                  styles.assortMultiFilterView
                )}
              </div>
              <ComparePlanLevelThreeTable
                RTinstance={comparePlanRTinstance}
                setRTinstance={setComparePlanRTinstance}
                compareL3LevelColumns={comparePlanTableCols}
                compareL3LevelRows={props.comparePlanTableData}
                noOfPlans={noOfPlans}
              />
            </Card>
          )}
        </LoadingOverlay>
        {!hideClusterTable ? (
          <LoadingOverlay loader={props.clusterLoader}>
            {clusterTableCols.length > 0 && (
              <Card className={globalClasses.paper}>
                <div className={styles.heading}>
                  {filterView(
                    props.levelsJson["l1_name"],
                    "l1_name",
                    level1Options,
                    setSelectedL1FilterValue,
                    selectedL1FilterValue,
                    styles.assortMultiFilterView
                  )}
                  {filterView(
                    props.levelsJson["l3_name"],
                    "l3_name",
                    level3Options,
                    onChangeL3,
                    selectedL3FilterValue,
                    styles.assortMultiFilterView
                  )}
                </div>
                <ComparePlanClusterTable
                  RTinstance={comparePlanClusterRTinstance}
                  setRTinstance={setComparePlanClusterRTinstance}
                  compareClusterLevelColumns={clusterTableCols}
                  compareClusterLevelRows={props.comparePlanClusterData}
                  noOfPlans={noOfPlans}
                  selectedL3FilterValue={selectedL3FilterValue}
                />
              </Card>
            )}
          </LoadingOverlay>
        ) : null}
      </Container>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    columnHeaderJson:
      store.assortsmartReducer.planDashboardReducer.columnHeaderJson,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    comparePlanTableData:
      store.assortsmartReducer.comparePlanReducer.comparePlanTableData,
    loader: store.assortsmartReducer.comparePlanReducer.comparePlan_loader,
    clusterLoader:
      store.assortsmartReducer.comparePlanReducer.clusterPlan_loader,
    comparePlanClusterData:
      store.assortsmartReducer.comparePlanReducer.comparePlanClusterTableData,
    planMetricsData:
      store.assortsmartReducer.comparePlanReducer.planMetricsData,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getPlanLevels: (payload) => dispatch(getPlanLevels(payload)),
  setPlanLevels: (payload) => dispatch(setPlanLevels(payload)),
  getPlanDetails: (payload, endpoint) =>
    dispatch(getPlanDetails(payload, endpoint)),
  setPlanDetails: (payload) => dispatch(setPlanDetails(payload)),
  setLevelsJson: (payload) => dispatch(setLevelsJson(payload)),
  setColumnHeaderJson: (payload) => dispatch(setColumnHeaderJson(payload)),
  getComparePlanTableData: (payload, endpoint) =>
    dispatch(getComparePlanTableData(payload, endpoint)),
  setComparePlanTableData: (payload) =>
    dispatch(setComparePlanTableData(payload)),
  setLoader: (payload) => dispatch(setLoader(payload)),
  setClusterLoader: (payload) => dispatch(setClusterLoader(payload)),
  validateComparePlan: (payload, endpoint) =>
    dispatch(validateComparePlan(payload, endpoint)),
  getComparePlanClusterData: (payload, endpoint) =>
    dispatch(getComparePlanClusterData(payload, endpoint)),
  setComparePlanClusterTableData: (payload) =>
    dispatch(setComparePlanClusterTableData(payload)),
  getPlanMetricsData: (payload, endpoint) =>
    dispatch(getPlanMetricsData(payload, endpoint)),
  setPlanMetricsData: (payload) => dispatch(setPlanMetricsData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ComparePlanContainer));
