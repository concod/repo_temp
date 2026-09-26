import { useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Grid } from "@mui/material";
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
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import KPI from "../../KPI";
import InventoryDashboardAlerts from "./InventoryDashboardAlerts";
import StyleInventoryDetailsTable from "./StyleInventoryDetailsTable";
import ViewPlansTable from "./ViewPlansTable";

const InventoryDashboardDetails = function (props) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false); // using instead of aggrid refreshServerSideStore api

  const classes = useStyles();
  const globalClasses = globalStyles();
  const history = useHistory();

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    confirmDeletePlans();
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const confirmDeletePlans = () => {
    const callDelete = async () => {
      props.setInventorysmartDeletePlanLoader(true);
      setRenderAgGrid(false);
      try {
        let body = {
          plan_codes: [...selectedPlanIds],
        };

        await props.deletePlans(body);
        displaySnackMessages("Successfully deleted plans", "success");
        props.setInventorysmartDeletePlanLoader(false);
        setRenderAgGrid(true);
      } catch (err) {
        props.setInventorysmartDeletePlanLoader(false);
        setRenderAgGrid(true);
        displaySnackMessages("Something went wrong on delete", "error");
      }
    };
    callDelete();
  };

  const onDeleteSelectedPlans = () => {
    selectedPlanIds?.length > 0 && setShowDeleteDialog(true);
  };

  const handleNewPlanCreation = () => {
    history.push(`${CREATE_ALLOCATION}?step=0`);
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
            <CustomAccordion label="KPIs" customClass={classes.customAccordion}>
              <KPI
                screen={
                  SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
                }
                showDateFilter={
                  props.inventorysmartScreenConfig?.dashboard?.drillDown
                    ?.store_inventory_kpis_require_fiscal_calendar
                }
              />
            </CustomAccordion>
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
              <Grid
                container
                className={globalClasses.marginVertical1rem}
                justifyContent={"flex-end"}
              >
                <Button
                  variant="contained"
                  color="primary"
                  id="createProductBtn"
                  className={classes.button}
                  onClick={() => onDeleteSelectedPlans()}
                  disabled={
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                      "delete"
                    )
                  }
                >
                  <DeleteIcon fontSize="small"></DeleteIcon>{" "}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  id="productSetAllBtn"
                  className={classes.button}
                  onClick={() => handleNewPlanCreation()}
                  disabled={
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                      "create"
                    )
                  }
                >
                  {CREATE_NEW_PLAN}
                </Button>
              </Grid>
              <ViewPlansTable
                setSelectedPlanIds={setSelectedPlanIds}
                confirmDeletePlans={confirmDeletePlans}
                renderAgGrid={renderAgGrid}
                setRenderAgGrid={setRenderAgGrid}
                isEditAllowed={canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                  "edit"
                )}
                isDeleteAllowed={canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                  "delete"
                )}
              />
            </CustomAccordion>
          </div>
        )}

      {!(
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

      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Allocation Plan"
        subHeading={getDeleteMessage("the selected plans?")}
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
            confirmDelete();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant="error"
      />
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
