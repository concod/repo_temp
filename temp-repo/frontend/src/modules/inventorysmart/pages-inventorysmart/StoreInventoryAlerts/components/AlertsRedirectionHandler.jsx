import React from "react";
import { Button, Grid } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { ALERTS_REDIRECT_ACTION_MAPPING } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import DeleteIcon from "@mui/icons-material/Delete";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import { generateExteralComponent } from "modules/inventorysmart/client-specific-features-inventorysmart/client-specific-inventorysmart-mapping";
import { useHistory } from "react-router";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";

const AlertsRedirectionHandler = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();

  const alertsActionDispatchHandler = (expeditedAllocation = false) => {
    const redirectionType =
      ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].redirectionType;
    const redirectionUrl =
      ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].redirectionUrl;
    const redirectionParams =
      ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].redirectionParams;

    switch (redirectionType) {
      case 1:
        props.handleInventoryRedirection(
          redirectionUrl,
          redirectionParams,
          expeditedAllocation
        );
        break;
      case 2:
        props.handleAutoAllocationFinalize(redirectionUrl);
        break;
      case 3:
        props.handleRedirectionToADA(redirectionUrl);
        break;
      default:
        props.handleInventoryRedirection(
          redirectionUrl,
          null,
          expeditedAllocation
        );
        break;
    }
  };

  const showActionCTA = () => {
    return (
      props.redirection &&
      (ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].permission === "edit"
        ? props.canEdit
        : props.canCreate)
    );
  };

  const getautoAllocationArticlesFromDashboard = () => {
    let l_rowData = [];
    props?.agGridUserInstance?.current?.api?.forEachNode((node) =>
      l_rowData.push(node?.data)
    );
    if (l_rowData?.length === props.selectedArticles?.length) {
      return {};
    }
    return {
      autoAllocationArticlesFromDashboard: props.selectedArticles?.map(
        (val) => val.article
      ),
    };
  };

  return (
    <>
      {showActionCTA() && (
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          className={globalClasses.marginAround}
          spacing={2}
        >
          <Grid item>
            {props.redirection === "Finalize" &&
              props.canDeleteAutoAllocations && (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={props.selectedArticles.length < 1}
                  onClick={() => props.onDelete()}
                  startIcon={<DeleteIcon />}
                >
                  Delete
                </Button>
              )}
          </Grid>

          <div className={classes.buttonGroupWrapper}>
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              className={classes.button}
              onClick={() => alertsActionDispatchHandler()}
            >
              {ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].label}
            </Button>
            {props.redirection === "Create Allocation" && props.expeditedFlow && (
              <Button
                variant="contained"
                color="primary"
                id="productSetAllBtn"
                className={classes.button}
                onClick={() => alertsActionDispatchHandler(true)}
              >
                Expedited Allocation
              </Button>
            )}
            {props.inventorysmartScreenConfig?.dashboard?.drillDown
              ?.dashboardAutoAllocationWithFinalize &&
              props?.tableConfig === "auto_allocation_level_2" &&
              generateExteralComponent("finalizeButton", {
                classes,
                history,
                disabledForViewOnlyAccess: props.selectedArticles.length < 1,
                autoAllocationCodeFromDashboard:
                  props.selectedArticles[0]?.plan_code,
                loaderSetter: props.setDashboardLoaderFullScreen,
                ...getautoAllocationArticlesFromDashboard(),
              })}
            {/* <FinalizeButton /> */}
          </div>
        </Grid>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    expeditedFlow:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dashboard?.expeditedFlow,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setDashboardLoaderFullScreen: (payload) =>
    dispatch(setDashboardLoaderFullScreen(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AlertsRedirectionHandler);
