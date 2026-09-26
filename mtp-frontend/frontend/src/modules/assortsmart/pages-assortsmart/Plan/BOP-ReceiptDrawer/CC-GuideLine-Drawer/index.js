import React, { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
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
import {
  getCCGuideLineData,
  updateCCGuideLineData,
} from "../../../../services-assortsmart/Plan/BOP-Receipt-Drawer/bop-receipt-drawer-service";
import {
  filterView,
  getDefaultChannelValue,
  isChannelMultiple,
} from "../../../../utils-assortsmart/utilityFunctions";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { isEmpty } from "lodash";
import { getColumnsAg } from "actions/tableColumnActions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { displaySnackMessage } from "../../Plan-Wedge/plan-wedge-functions";

const CCGuidelineComponent = (props) => {
  const [column, setColumn] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const classes = useStyles();
  const ccInstance = useRef({});

  useEffect(() => {
    if (selectedChannel && ccInstance?.current?.api) {
      ccInstance.current.api.onFilterChanged();
    }
  }, [selectedChannel?.value]);

  useEffect(() => {
    const fetchData = async () => {
      props.setShowLoader(true);
      const tableConfig = await getColumnsAg(
        "table_name=assort_cc_guideline",
        props.columnHeaderJson
      )();
      if (tableConfig?.length) {
        setColumn(tableConfig);
      }
    };
    fetchData();
  }, [props.columnHeaderJson]);

  useEffect(() => {
    const fetchData = async () => {
      const payload = {
        cc_guideline_plan_code: props.selectedPlan?.value, // selected plan code
        plan_code: props.planDetails?.data?.plan_code, // current plan code
      };
      let response = await props.getCCGuideLineData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setShowLoader(false);
      if (response?.data?.status) {
        response?.data?.data?.forEach((obj) => {
          obj["uniqueID"] = obj.l3_name + obj.channel;
        });
        setTableData(response?.data?.data);
      }
    };
    if (props.selectedPlan) {
      props.setShowLoader(true);
      if (isChannelMultiple(props.planDetails?.data)) {
        const channelOpt = props.planDetails?.data?.channel?.map((item) => {
          return {
            label: item,
            value: item,
            id: item,
          };
        });
        const defaultChannel = getDefaultChannelValue(
          channelOpt,
          props.planDetails?.data
        );
        setSelectedChannel(defaultChannel);
        setChannelOptions(channelOpt);
      }
      fetchData();
    }
  }, [props.planDetails?.data, props.selectedPlan]);

  const onCopyToCurrentPlan = async () => {
    try {
      props.setShowLoader(true);
      let data = tableData;
      if(isChannelMultiple(props.planDetails?.data) && selectedChannel?.value){
        data = data.filter((obj) => obj.channel === selectedChannel?.value);
      }
      let payload = {
        data: data,
      };
      const updateResponse = await props.updateCCGuideLineData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setShowLoader(false);
      if (updateResponse?.data?.status) {
        displaySnackMessage(
          updateResponse?.data?.message,
          "success",
          props.addSnack
        );
        props.onToggleCCGuideline(false);
        props.setReloadDepthChoice(true);
        props.setEnableRecalculateDepthChoice(true);
      } else {
        displaySnackMessage(
          updateResponse?.data?.message,
          "error",
          props.addSnack
        );
      }
    } catch (err) {
      props.setShowLoader(false);
      displaySnackMessage("Something went wrong", "error", props.addSnack);
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    return isChannelMultiple(props.planDetails?.data) ? true : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (node.data) {
        if (isChannelMultiple(props.planDetails?.data)) {
          return selectedChannel?.value === node.data?.channel;
        }
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableData, selectedChannel?.value]
  );

  const loadTableInstance = (params) => {
    ccInstance.current = params;
  };

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.onToggleCCGuideline(false)}
      classes={{ root: classes.dialog }}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid container direction="row" alignItems="center">
          <Typography variant="h3">CC Guidance</Typography>
          <Grid Item xs="3" display={"flex"}>
            {filterView(
              "Select Plan",
              "selected-plan",
              props.ccGuidelinePlanOptions,
              props.setSelectedPlan,
              props.selectedPlan,
              classes.assortMultiFilterView
            )}
            {channelOptions?.length ?
              filterView(
                "Channel",
                "channel",
                channelOptions,
                setSelectedChannel,
                selectedChannel,
                classes.assortMultiFilterView
              ) : null}
          </Grid>
          <IconButton
            className={classes.rightEnd}
            onClick={() => props.onToggleCCGuideline(false)}
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
            <LoadingOverlay loader={props.showLoader}>
              <Grid
                container
                className={`${classes.typographyMarginBottom} ${classes.resultContainer}`}
              >
                <Grid Item className={classes.rightEnd}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onCopyToCurrentPlan()}
                    disabled={tableData?.length ? false : true}
                  >
                    {Plan.__Copy_Current_Plan}
                  </Button>
                </Grid>
              </Grid>
              <br />
              {column?.length ? (
                <AgGridTable
                  rowdata={tableData}
                  columns={column}
                  loadTableInstance={loadTableInstance}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  uniqueRowId="uniqueID"
                  sideBar={false}
                  onGridChanged
                  adjustTableHeight={tableData?.length <= 2}
                  sizeColumnsToFitFlag
                />
              ) : null}
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      store
    ),
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getCCGuideLineData,
      updateCCGuideLineData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CCGuidelineComponent));
