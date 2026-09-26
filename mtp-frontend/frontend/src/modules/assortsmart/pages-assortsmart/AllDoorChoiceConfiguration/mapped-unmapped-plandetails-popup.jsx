import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  List,
  ListItem,
  Link,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import LoadingOverlay from "../../../../core/Utils/Loader/loader";
import { setCoreChoiceLoader } from "modules/assortsmart/services-assortsmart/CoreChoiceConfiguration/core-choice-configuration-service";
import { getFiltersRespArr } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { Dashboard } from "modules/assortsmart/constants-assortsmart/stringContants";
import { fetchAssortDashboardTableData } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import {
  CLUSTERING,
  PLAN,
} from "modules/assortsmart/constants-assortsmart/routesContants";

const MappedUnmappedPlanModal = (props) => {
  const classes = useStyles();
  const history = useHistory();

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handlePlanClick = async (event) => {
    const planName = event.target.innerText;
    const filterValues = getFiltersRespArr(Dashboard.__plan_levels);
    filterValues.push({
      attribute_name: "season",
      operator: "in",
      filter_type: "non-cascaded",
      values: [],
    });
    try {
      props.setCoreChoiceLoader(true);
      const reqBody = {
        filters: filterValues,
        status: 0,
        meta: {
          sort: [],
          search: [{ column: "name", pattern: planName }],
          range: [],
        },
      };
      const planRes = await props.fetchAssortDashboardTableData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      const planCode = planRes?.data?.data[0].plan_code;
      const planStep = planRes?.data?.data[0].plan_step;
      if (planStep < 2) {
        history.push(`${CLUSTERING}/${planCode}`);
      } else {
        history.push(`${PLAN}/${planCode}`);
      }
    } catch (error) {
      displaySnackMessages("Fetching plan details failed", "error");
    }
    props.setCoreChoiceLoader(false);
  };

  return (
    <Dialog
      id="mapped-unmapped-plans-modal"
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      fullWidth={true}
      disableEscapeKeyDown={true}
      open={props.showPlansPopup}
    >
      <DialogTitle id="mapped-unmapped-plans-Title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">{props.mappedOrUnmapped}:</Typography>
          <IconButton
            color="primary"
            aria-label="close"
            onClick={props.closeModal}
            size="small"
          >
            <Close />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent id="mapped-inmapped-plan-content">
        <LoadingOverlay loader={props.loader}>
          <List>
            {props.mappedOrUnmappedPlanDetails?.map((mappedOrUnmappedPlan) => {
              return (
                <ListItem>
                  <Link
                    onClick={handlePlanClick}
                    className={classes.link}
                    underline="hover"
                  >
                    {mappedOrUnmappedPlan}
                  </Link>
                </ListItem>
              );
            })}
          </List>
        </LoadingOverlay>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    loader:
      store.assortsmartReducer.coreChoiceConfigurationReducer.coreChoiceLoading,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};
const mapActionsToProps = {
  setCoreChoiceLoader,
  fetchAssortDashboardTableData,
  addSnack,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(MappedUnmappedPlanModal);
