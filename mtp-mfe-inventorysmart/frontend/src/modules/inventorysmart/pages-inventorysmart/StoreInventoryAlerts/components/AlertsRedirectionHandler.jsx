import React from "react";
import { Grid } from "@mui/material";
import { Button } from "impact-ui-v3"
import globalStyles from "core/Styles/globalStyles";
import {
  ALERTS_REDIRECT_ACTION_MAPPING,
  MFP_ADA_SCREENNAME,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import DeleteIcon from "@mui/icons-material/Delete";
import { TENANT } from "config/api";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import { generateExteralComponent } from "modules/inventorysmart/client-specific-features-inventorysmart/client-specific-inventorysmart-mapping";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import {
  ADA_VISUAL_MFP_DASHBOARD,
  ADA_VISUAL_MFP_DASHBOARD_STANDALONE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const AlertsRedirectionHandler = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const getADALink = () => {
    return ADA_VISUAL_MFP_DASHBOARD_STANDALONE;
  };

  const alertsActionDispatchHandler = (
    expeditedAllocation = false,
    p_redirection = false
  ) => {
    const redirection = p_redirection || props.redirection;
    const redirectionType =
      ALERTS_REDIRECT_ACTION_MAPPING[redirection].redirectionType;
    const redirectionUrl =
      ALERTS_REDIRECT_ACTION_MAPPING[redirection].redirectionUrl;
    const redirectionParams =
      ALERTS_REDIRECT_ACTION_MAPPING[redirection].redirectionParams;
    const selectionRequired =
      ALERTS_REDIRECT_ACTION_MAPPING[redirection].selectionRequired === false
        ? false
        : true; // flag to check if row selection is rquired for action button

    switch (redirectionType) {
      case 1:
        props.handleInventoryRedirection(
          redirectionUrl,
          redirectionParams,
          expeditedAllocation,
          selectionRequired
        );
        break;
      case 2:
        props.handleAutoAllocationFinalize(redirectionUrl);
        break;
      case 3:
        if (props?.inventorysmartHiddenModules?.includes(MFP_ADA_SCREENNAME)) {
          props.handleRedirectionToADA(redirectionUrl);
        } else props.handleRedirectionToADA(getADALink());
        break;
      case 4:
        props.handleRedirectionToADAMFP(redirectionUrl);
        break;
      case 5:
        props.handleRedirectionToNewStoreSetUp(
          redirectionUrl,
          redirectionParams
        );
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
    if (props.reviewOnly) return props.canEdit;

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
        <div>
          {props.reviewOnly && (
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              sx={{ marginLeft: '5px' }}
              disabled={props.selectedArticles.length < 1 || props.isReviewing}
              onClick={props.onReview}
            >
              Review Recommendation
            </Button>
          )}
      {props.redirection === "Finalize" &&
              props.canDeleteAutoAllocations && (
            <Button
              variant="contained"
              color="primary"
              disabled={props.selectedArticles.length < 1}
              onClick={() => props.onDelete()}
              startIcon={<DeleteIcon />}
                  sx = {{marginLeft:'5px'}}
            >
              Delete
            </Button>
          )}
          {props.redirection === "Create Allocation" && props.selectedArticles?.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              sx={{ marginLeft: '5px' }}
              onClick={() => alertsActionDispatchHandler()}
            >
              {ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].label}
            </Button>
          )}
          {props.redirection !== "Create Allocation" && (props.redirection !== "ADA" || props.selectedArticles?.length > 0) && 
            (props.redirection !== "Finalize" || props.selectedArticles?.length > 0) && (
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              sx={{ marginLeft: '5px' }}
              onClick={() => alertsActionDispatchHandler()}
            >
              {ALERTS_REDIRECT_ACTION_MAPPING[props.redirection].label}
            </Button>
          )}
          {props.redirection === "Create Allocation" && props.expeditedFlow && (
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
                sx = {{marginLeft:'5px'}}
              onClick={() => alertsActionDispatchHandler(true)}
            >
              Expedited Allocation
            </Button>
          )}
          {props.additionalRedirection &&
            props.additionalRedirection?.map((redirection, index) => (
              <Button
                key={index}
                variant="contained"
                color="primary"
                id="productSetAllBtn"
                  sx = {{marginLeft:'5px'}}
                  onClick={() =>
                    alertsActionDispatchHandler(false, redirection)
                  }
              >
                {
                  ALERTS_REDIRECT_ACTION_MAPPING[props.additionalRedirection]
                    .label
                }
              </Button>
            ))}
          {props.ddScreenConfigs?.dashboard?.drillDown
            ?.dashboardAutoAllocationWithFinalize &&
            props?.tableConfig === "auto_allocation_level_2" &&
            generateExteralComponent("finalizeButton", {
              classes,
              disabledForViewOnlyAccess: props.selectedArticles.length < 1,
              autoAllocationCodeFromDashboard:
                props.selectedArticles[0]?.plan_code,
              loaderSetter: props.setDashboardLoaderFullScreen,
              ...getautoAllocationArticlesFromDashboard(),
              reloadDashboard: true,
            })}
          {/* <FinalizeButton /> */}
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    expeditedFlow:
      store?.inventorysmartReducer?.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.expeditedFlow,
    //Cannot be put in ddScreenConfigs as used in routes.js
    inventorysmartHiddenModules:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.hiddenModules,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
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
