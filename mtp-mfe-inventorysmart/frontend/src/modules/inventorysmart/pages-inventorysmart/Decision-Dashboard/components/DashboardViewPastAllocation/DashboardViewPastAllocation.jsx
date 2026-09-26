import { useState } from "react";
import { connect } from "react-redux";
import { Prompt, Button, useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import {
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants.js";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { isActionAllowedOnSubModule } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import ViewPlansTable from "../ViewPlansTable";
import ViewPlansTableS2S from "../ViewPlansTableS2S";

const DashboardViewPastAllocation = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: { variant: variance },
    });
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
        let response = await props.deletePlans(body);
        if (response.data.status) {
          displaySnackMessages(
            t("inventorysmart.plandeletedSuccess"),
            "success"
          );
          setSelectedPlanIds([]);
          setRenderAgGrid(true);
        }
        props.setInventorysmartDeletePlanLoader(false);
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

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    confirmDeletePlans();
  };

  const getDeleteMessage = (p_msg = "") => {
    return `Are you sure you want to delete ${p_msg}`;
  };

  return (
    <>
      {props.isStoretoStore ? (
        <ViewPlansTableS2S
          tableHeader="Allocation Plans"
          renderAgGrid={renderAgGrid}
          selectedPlanIds={selectedPlanIds}
          setRenderAgGrid={setRenderAgGrid}
          isEditAllowed={canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
            "edit"
          )}
          isDeleteAllowed={canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
            "delete"
          )}
          isStoretoStore={props.isStoretoStore}
        />
      ) : (
        <ViewPlansTable
          tableHeader="Allocation Plans"
          setSelectedPlanIds={setSelectedPlanIds}
          confirmDeletePlans={confirmDeletePlans}
          canTakeActionOnModules={canTakeActionOnModules}
          renderAgGrid={renderAgGrid}
          selectedPlanIds={selectedPlanIds}
          setRenderAgGrid={setRenderAgGrid}
          onDeleteSelectedPlans={onDeleteSelectedPlans}
          isEditAllowed={canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
            "edit"
          )}
          isDeleteAllowed={canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
            "delete"
          )}
          isStoretoStore={props.isStoretoStore}
        />
      )}
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Allocation Plan"
        onPrimaryButtonClick={() => {
          confirmDelete();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        handleClose={() => setShowDeleteDialog(false)}
        variant="error"
        primaryButtonLabel={DIALOG_CONFIRM_BTN_TEXT}
        secondaryButtonLabel={DIALOG_REJECT_BTN_TEXT}
      >
        {getDeleteMessage("the selected allocation Plan?")}
      </Prompt>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
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
)(DashboardViewPastAllocation);
