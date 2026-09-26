import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Button,
  Grid,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import {
  fetchAssortDashboardTableData,
  setDashboardLoader,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  refreshPlans,
  setOmniLoader,
  fetchOmniMappingMetrics,
  setOmniMappingMetrics,
  setOmniMappingData,
} from "modules/assortsmart/services-assortsmart/OmniChannel/omni-channel-service";
import {
  formatStringArray,
  filterView,
  generateFilterValues,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { setWedgeAttributeData } from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "../../../../core/Utils/Loader/loader";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";

const useStyles = makeStyles({
  addPlanFilterContainer: {
    display: "flex",
    marginBottom: "25%",
  },
});

const OmniAddPlanModal = (props) => {
  const classes = useStyles();
  const sharedClasses = sharedStyles();

  const [plansFilterData, setPlansFilterData] = useState([]);
  const [channelSelected, setChannelSelected] = useState({});
  const [planSelected, setPlansSelected] = useState({});
  const [planNameToCodeMapping, setPlanNameToCodeMapping] = useState({});
  const [selectedPlanCode, setSelectedPlanCode] = useState();

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    if (props.channelFilterOptions.length === 1) {
      setChannelSelected(props.channelFilterOptions[0]);
    }
  }, [props.channelFilterOptions]);

  const handleAddPlan = async () => {
    try {
      props.setOmniLoader(true);
      const reqBody = {
        omni_plan_code: props.planDetails?.data.plan_code,
        plan_code: [selectedPlanCode],
        refresh_flag: false,
      };
      const addPlanData = await props.refreshPlans(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (addPlanData?.data?.data?.status) {
        displaySnackMessages("Plan added successfully", "success");
        props.handleClose();
        try {
          if (isEmpty(props.selectedL3Option)) {
            props.setWedgeAttributeData([]);
            props.setOmniMappingData([]);
          }
          const payload = {
            filters: [
              {
                attribute_name: "source_plan_code",
                value: [props.planDetails?.data.plan_code],
                operator: "in",
              },
            ],
          };
          const metricsData = await props.fetchOmniMappingMetrics(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name ||
              "assort",
            props.planDetails?.data?.plan_code
          );
          props.setOmniMappingMetrics(metricsData.data.data);
        } catch (error) {
          displaySnackMessages("OmniMapping data fetch failed", "error");
        }
      } else {
        displaySnackMessages(addPlanData?.data?.data?.message, "error");
      }
    } catch (error) {
      displaySnackMessages("Add plans failed", "error");
    }
    props.setOmniLoader(false);
  };

  useEffect(() => {
    const getPlanData = async () => {
      if (!isEmpty(channelSelected)) {
        props.setOmniLoader(true);
        const levels = ["l0_name", "l1_name", "l2_name"];
        const filterValues = generateFilterValues(
          props.planDetails.data,
          levels
        );
        filterValues.push(
          {
            attribute_name: "channel",
            operator: "in",
            filter_type: "cascaded",
            values: [channelSelected.value],
          },
          {
            attribute_name: "steps",
            operator: "in",
            filter_type: "non-cascaded",
            values: common.__Finalize_Steps,
          },
          {
            attribute_name: "season",
            operator: "in",
            filter_type: "non-cascaded",
            values: [props.planDetails.data.season],
          }
        );
        let body = {
          filters: filterValues,
          status: 0,
          meta: {},
        };
        const plansRes = await props.fetchAssortDashboardTableData(
          body,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          0,
          -1
        ); // To prevent pagination on fetch plans
        const planObj = {};
        //To get plan code from selected plan name
        plansRes?.data.data.forEach((item) => {
          planObj[item.name] = item.plan_code;
        });
        setPlanNameToCodeMapping(planObj);
        const planData = plansRes?.data.data.map((item) => {
          return item.name;
        });
        let planOption = formatStringArray(planData);
        setPlansSelected({});
        if (planOption?.length === 1) {
          setPlansSelected(planOption[0]);
          setSelectedPlanCode(planObj[planOption[0]["label"]]);
        }
        setPlansFilterData(planOption);
        props.setOmniLoader(false);
      }
    };
    getPlanData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelSelected]);

  const handleChannelChange = async (val) => {
    setChannelSelected(val);
  };

  const handlePlansChange = (val) => {
    setPlansSelected(val);
    //Set selected plan code from selected plan name
    setSelectedPlanCode(planNameToCodeMapping[val["label"]]);
  };
  return (
    <>
      <Dialog
        id="omniAddPlanModal"
        maxWidth={"md"}
        aria-labelledby="customized-dialog-title"
        fullWidth={true}
        disableEscapeKeyDown={true}
        open={props.isOpen}
      >
        <DialogTitle id="omniAddPlanModalTitle">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">Add Plan</Typography>
            <IconButton
              color="primary"
              aria-label="close"
              onClick={props.handleClose}
              size="large"
            >
              <Close />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent id="omniAddPlanModalContent">
          <LoadingOverlay loader={props.loader}>
            <div className={classes.addPlanFilterContainer}>
              <Grid container alignItems="center" spacing={4}>
                {props.channelFilterOptions?.length > 0 ? (
                  <Grid item xs={12} md={6}>
                    {filterView(
                      "Channel",
                      "channel",
                      props.channelFilterOptions,
                      handleChannelChange,
                      channelSelected
                    )}
                  </Grid>
                ) : (
                  <Grid item xs={12} md={6}>
                    <p>All channels are imported</p>
                  </Grid>
                )}
                {!isEmpty(channelSelected) && plansFilterData?.length > 0 && (
                  <Grid item xs={12} md={6}>
                    {filterView(
                      "Plans",
                      "plans",
                      plansFilterData,
                      handlePlansChange,
                      planSelected
                    )}
                  </Grid>
                )}
                {!isEmpty(channelSelected) && plansFilterData?.length === 0 && (
                  <Grid item xs={12} md={6}>
                    <p>No plan for selected channel</p>
                  </Grid>
                )}
              </Grid>
            </div>
          </LoadingOverlay>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={props.handleClose}
            id="omniAddPlanCancelBtn"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddPlan}
            id="omniCreatePlanSaveBtn"
            color="primary"
            className={sharedClasses.smallPrimaryButton}
            disabled={
              isEmpty(channelSelected) || isEmpty(planSelected) ? true : false
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    loader: store.assortsmartReducer.omniChannelReducer.omniLoader,
    omniMappingData:
      store.assortsmartReducer.omniChannelReducer.omniMappingData,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {
  fetchAssortDashboardTableData,
  setDashboardLoader,
  refreshPlans,
  addSnack,
  setOmniLoader,
  fetchOmniMappingMetrics,
  setOmniMappingMetrics,
  setOmniMappingData,
  setWedgeAttributeData,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(OmniAddPlanModal));
