import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AgGridTable from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { extractDropsArr } from "../../../Plan-Dashboard/components/common-plan-functions";
import { updatePlanAPI } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  getBopChoiceLevelData,
  setBOPLoader,
  getBopL3LevelData,
} from "../../../../services-assortsmart/Plan/BOP-Receipt-Drawer/bop-receipt-drawer-service";
import { configureFiltersResponse } from "../../../../../clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import {
  filterView,
  getLevelFilters,
} from "../../../../utils-assortsmart/utilityFunctions";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { cloneDeep, isEmpty } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

const BOPRootComponent = (props) => {
  const classes = useStyles();
  const [bopChoiceLevelColumn, setBopChoiceLevelColumn] = useState([]);
  const [bopChoiceLevelData, setBopChoiceLevelData] = useState([]);
  const [
    bopOrBenchmarkL3LevelColumns,
    setBopOrBenchmarkL3LevelColumns,
  ] = useState([]);
  const [bopOrBenchmarkL3LevelData, setBopOrBenchmarkL3LevelData] = useState(
    []
  );
  const [isBopDefault, setIsBopDefault] = useState(true);
  const bopOrBenchmarkInstance = useRef({});

  const displayMessage = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const loadTableInstance = (params) => {
    bopOrBenchmarkInstance.current = params;
  };

  const getBopPayload = (bopData, bopOrChoice) => {
    let reqBody = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [bopOrChoice === "choice" ? bopData?.plan_code : bopData?.value],
          operator: "in",
        },
        ...getLevelFilters(props.planDetails?.data, props.planLevels),
        {
          attribute_name: "channel",
          value: bopOrChoice === "choice" ? [bopData?.channel] : props.planDetails?.data?.channel,
          prefix: "levels",
          operator: "in",
        },
        {
          attribute_name: "sub_channel",
          value: props.planDetails?.data?.sub_channel
            ? props.planDetails?.data?.sub_channel
            : props.planDetails?.data?.channel,
          prefix: "levels",
          operator: "in",
        },
        {
          attribute_name: "flow_to_next_season",
          prefix: "attribute_value",
          operator: "in",
          value: ["Yes"],
        },
      ],
    };
    if (bopOrChoice === "choice") {
      reqBody.filters.push({
        attribute_name: "l3_name",
        prefix: "levels",
        operator: "in",
        value: [bopData?.l3_name],
      })
    }
    return reqBody;
  };

  const showBopDataChoiceLevel = (bopL3Data) => {
    props.setBOPLoader(true);

    const fetchBopChoiceData = async () => {
      try {
        let reqBody = getBopPayload(bopL3Data, "choice");
        let bopChoiceLevelResp = await props.getBopChoiceLevelData(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );

        let SkUHide = !props.screenConfiguration.common.show_store_eligiblity;
        let columsData = cloneDeep(bopChoiceLevelResp?.data?.data?.columns);
        if (SkUHide) {
          columsData.forEach((col) => {
            if (col.column_name === "sku_productivity") {
              col.is_hidden = true;
            }
          });
        }

        setBopChoiceLevelColumn(
          agGridColumnFormatter(columsData, props.levelsJson)
        );

        let choiceLevelData = bopChoiceLevelResp?.data?.data?.data.map(
          (item) => {
            let bopChoiceRow = cloneDeep(item);
            bopChoiceRow.choice = item.choice_name;
            item.attribute_value.forEach((attr) => {
              Object.keys(attr).forEach((key) => {
                bopChoiceRow[`attributes_${key}`] = attr[key];
              });
            });
            return bopChoiceRow;
          }
        );

        setBopChoiceLevelData(choiceLevelData);

        props.setBOPLoader(false);
      } catch (err) {
        props.setBOPLoader(false);
        displayMessage("Fetching BOP choice details failed", "error");
      }
    };

    fetchBopChoiceData();
  };

  const callBopLevel = async (bopOrBenchmarkPlan) => {
    let reqBody = getBopPayload(bopOrBenchmarkPlan, "bop");
    let bopOrBenchmarkL3LevelDataResp = await props.getBopL3LevelData(
      reqBody,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    if (bopOrBenchmarkL3LevelDataResp?.data?.status) {
      let bopOrBenchmarkCols = agGridColumnFormatter(
        bopOrBenchmarkL3LevelDataResp?.data?.data?.columns,
        props.levelsJson
      );
      bopOrBenchmarkCols.forEach((item) => {
        if (item.column_name === "style_view") {
          item.editable = false;
        }
      });
      setBopOrBenchmarkL3LevelColumns(bopOrBenchmarkCols);
      let filteredData = bopOrBenchmarkL3LevelDataResp?.data?.data?.data.filter(
        (item) => props.planDetails?.data?.l2_name.includes(item.l2_name)
      );
      filteredData.forEach((item) => {
        item.uniqueID = item.l3_name + item.channel + item.sub_channel;
      });
      setBopOrBenchmarkL3LevelData(filteredData);
      props.setBOPLoader(false);
    } else {
      props.setBOPLoader(false);
      displayMessage("Fetching BOP choice details failed", "error");
    }
  };

  const onGenerateBop = async (bopPlan, isDefaultBop) => {
    props.setBOPLoader(true);
    try {
      setBopChoiceLevelColumn([]);
      const reqBody = {
        [props.screenConfiguration?.common?.drop_key ||
          "drops"]: extractDropsArr(
            props.planDetails["data"],
            props.screenConfiguration?.common?.drop_key,
            "edit"
          ),
        [props.screenConfiguration?.common?.flow_key ||
          "flow"]: extractDropsArr(
            props.planDetails["data"],
            props.screenConfiguration?.common?.drop_key,
            "edit"
          ),
        filters: configureFiltersResponse(
          props.planLevels?.data?.level_info,
          props.planDetails["data"]
        ),
        channel: props.planDetails?.data?.channel,
        sub_channel: props.planDetails?.data?.sub_channel,
        "cluster_plan_code": props.planDetails?.data?.cluster_plan_code,
        "compare_season": props.planDetails?.data?.compare_season,
        "compare_year": props.planDetails?.data?.compare_year,
        "data_pull_source": props.planDetails?.data?.data_pull_source,
        "deadline_date": props.planDetails?.data?.deadline_date,
        "description": props.planDetails?.data?.description,
        "name": props.planDetails?.data?.name,
        "plan_code": props.planDetails?.data?.plan_code,
        "season": props.planDetails?.data?.season,
        "season_id": props.planDetails?.data?.season_id,
        "selling_period_edate": props.planDetails?.data?.selling_period_edate,
        "selling_period_sdate": props.planDetails?.data?.selling_period_sdate,
        "steps": props.planDetails?.data?.plan_step,
        "year": props.planDetails?.data?.year
      };
      reqBody["bop_tag_plan_code"] = bopPlan?.value;
      if (!isDefaultBop) {
        let updateResponse = await props.updatePlanAPI(
          reqBody,
          props.planDetails.data.plan_code,
          props.screenConfiguration?.common?.endpoint_project_name ||
            "assort"
        );
        if (updateResponse?.data?.status) {
          props.setCurrentBopPlan(bopPlan?.value);
          callBopLevel(bopPlan);
        } else {
          props.setBOPLoader(false);
          displayMessage("Updateing Prev. Season Plan failed", "error");
        }
      } else {
        callBopLevel(bopPlan);
      }
    } catch (err) {
      props.setBOPLoader(false);
      displayMessage("Fetching BOP choice details failed", "error");
    }
  };

  useEffect(() => {
    //Generate BOP plan data if BOP icon is selected
    if (props.selectedBop?.value && isBopDefault) {
      onGenerateBop(props.selectedBop, isBopDefault);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedBop]);

  const onChangeBop = (val) => {
    setIsBopDefault(false);
    setBopChoiceLevelData([]);
    props.setSelectedBop(val);
  };

  useEffect(() => {
    return () => {
      props.setSelectedBop({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.onToggleBop(false)}
      classes={{ root: classes.dialog }}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid container direction="row" alignItems="center">
          <Typography variant="h3">BOP</Typography>
          <Grid Item xs="6">
            {filterView(
              "Prev. Season Plan",
              "prev-season-plan",
              props.bopOptions,
              onChangeBop,
              props.selectedBop,
              classes.assortMultiFilterView
            )}
          </Grid>
          <IconButton
            className={classes.rightEnd}
            onClick={() => props.onToggleBop(false)}
            aria-label="close"
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={classes.contentBody}>
          <Grid container direction="row" className={classes.dialogGrid}>
            <LoadingOverlay loader={props.loaderBOP}>
              <Grid
                container
                className={`${classes.typographyMarginBottom} ${classes.resultContainer}`}
              >
                <Grid Item className={classes.rightEnd}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onGenerateBop(props.selectedBop)}
                    disabled={!isEmpty(props.selectedBop) ? false : true}
                  >
                    {Plan.__Bop_Generate}
                  </Button>
                </Grid>
              </Grid>
              <br />
              {bopOrBenchmarkL3LevelColumns?.length ? (
                <AgGridTable
                  rowdata={bopOrBenchmarkL3LevelData}
                  columns={bopOrBenchmarkL3LevelColumns}
                  onReviewClick={(tableInfo) => {
                    setBopChoiceLevelData([]);
                    showBopDataChoiceLevel(tableInfo.data);
                  }}
                  loadTableInstance={loadTableInstance}
                  uniqueRowId="uniqueID"
                  sideBar={false}
                  onGridChanged
                  adjustTableHeight={
                    bopOrBenchmarkL3LevelData?.length <= 2 ? true : false
                  }
                  sizeColumnsToFitFlag
                />
              ) : null}
              <div className={classes.typographyMarginBottom}> </div>

              {bopChoiceLevelColumn?.length ? (
                <div>
                  <Typography
                    variant="h4"
                    className={classes.typographyMarginBottom}
                  >
                    BOP Choice level data
                  </Typography>
                  <AgGridTable
                    rowdata={bopChoiceLevelData}
                    columns={bopChoiceLevelColumn}
                    tableId={"bop-choice-level"}
                    sideBar={false}
                    adjustTableHeight={
                      bopChoiceLevelData?.length <= 2 ? true : false
                    }
                  />
                </div>
              ) : (
                <div />
              )}
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    loaderBOP: store.assortsmartReducer.bopReceiptDrawerReducer.loaderBOP,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getBopChoiceLevelData: (payload, endpoint) =>
    dispatch(getBopChoiceLevelData(payload, endpoint)),
  setBOPLoader: (payload) => dispatch(setBOPLoader(payload)),
  getBopL3LevelData: (payload, endpoint) =>
    dispatch(getBopL3LevelData(payload, endpoint)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  updatePlanAPI: (payload, planCode, endpoint) =>
    dispatch(updatePlanAPI(payload, planCode, endpoint)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BOPRootComponent));
