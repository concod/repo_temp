import { useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { OpenInFull, CloseFullscreen } from "@mui/icons-material";
import { Delete, Search } from "@mui/icons-material";
import { Button, Grid, Typography, ButtonBase } from "@mui/material";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { addSnack } from "core/actions/snackbarActions";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { Prompt } from "impact-ui";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  CREATE_NEW_PLAN,
  DELETE_MESSAGE,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  INVENTORY_SUBMODULES_NAMES,
  SCREENS_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import KPI from "../../KPI";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import InventoryDashboardAlerts from "./InventoryDashboardAlerts";
import StyleInventoryDetailsTable from "./StyleInventoryDetailsTable";
import ViewPlansTable from "./ViewPlansTable";

const InventoryDashboardDetails = function (props) {

  const classes = useStyles();
  const globalClasses = globalStyles();
  const history = useHistory();
  const [expand, setExpand] = useState(false);


  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };




  const getDeleteMessage = (p_msg = "") => {
    return `${DELETE_MESSAGE} ${p_msg}`;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <>
      {!(
        props.inventorysmartScreenConfig?.dashboard?.drillDown?.hidden?.indexOf(
          "store_inventory_kpis"
        ) > -1
      ) &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_KPI,
          "view"
        ) && (
          <div className={globalClasses.marginVertical1rem}>
            <Grid 
            className={`${globalClasses.layoutAlignSpaceBetween } ${globalClasses.verticalAlignCenter}`}>
              <Typography variant="h6" className={`${classes.font500}`}>
                KPIs
              </Typography>
              <Button
                className={`${globalClasses.buttonNew}`}
                onClick={() => { 
                  setExpand(!expand)
                   }}>
                {expand ? <CloseFullscreen 
                className={`${globalClasses.iconNew}`}/> : <OpenInFull 
                className={`${globalClasses.iconNew}`}/>}
              </Button>
            </Grid>
            <KPI
              screen={
                SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
              }
              showDateFilter={
                props.inventorysmartScreenConfig?.dashboard?.drillDown
                  ?.store_inventory_kpis_require_fiscal_calendar
              }
              expand={expand}
            />
          </div>
        )}
      {/* *Show View Plans only for VB */}
      {!(
        props.inventorysmartScreenConfig?.dashboard?.drillDown?.hidden?.indexOf(
          "view_plans"
        ) > -1
      ) &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
          "view"
        ) && (
          <div className={globalClasses.marginVertical1rem}>
            <CustomAccordion label="View Allocation Plans">

              <ViewPlansTable
                canTakeActionOnModules={canTakeActionOnModules}

              />
            </CustomAccordion>
          </div>
        )}

      { !props?.inventorysmartScreenConfig?.dashboard?.hideAlertsComponent && !(
        props.inventorysmartScreenConfig?.dashboard?.drillDown?.hidden?.indexOf(
          "store_inventory_alerts"
        ) > -1
      ) &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
          "view"
        ) && (
          <InventoryDashboardAlerts
            screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY}
            canEdit={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
              "edit"
            )}
            canDelete={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
              "delete"
            )}
            canCreate={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
              "create"
            )}
          />
        )}
      {canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ARTICLE_DETAILS,
        "view"
      ) && (
          <div className={globalClasses.marginVertical1rem}>
            <CustomAccordion label="Details">
              <StyleInventoryDetailsTable
                isCreateAllocationAllowed={canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
                  "create"
                )}
              />
            </CustomAccordion>
          </div>
        )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => ({
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InventoryDashboardDetails);
