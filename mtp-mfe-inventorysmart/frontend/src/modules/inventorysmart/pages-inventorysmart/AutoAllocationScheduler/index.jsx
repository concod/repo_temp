import React, { useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { Grid } from "@mui/material";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import {
  getAllocatioSchedulerListTableData,
  setAutoAllocationSchedulerTableLoader,
} from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/auto-allocation-scheduler-service";
import AutoAllocationSchedulerListComponent from "./AutoAllocationSchedulerListComponent";
import CreateAutoAllocationScheduler from "./CreateAutoAllocationScheduler";
import { canTakeActionOnModules } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Button } from "impact-ui-v3";

const AutoAllocationRulesComponent = (props) => {
  const [isSchedulerPanelOpen, setIsSchedulerPanelOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const refreshTableRef = useRef(null);
  const {
    getAllocationSchedulerTableData,
    tableLoader,
    setTableLoader,
  } = props;

  const ALLOCATION_SCHEDULER_TABLE_NAME = "auto_allocation_scheduler";

  const disableCreate = () => {
    const canCreate = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_SCHEDULER,
      "create",
      props?.modulePermissions,
      props?.module
    );
    return !canCreate;
  };

  const handleOpenCreatePanel = () => {
    setIsEditMode(false);
    setIsSchedulerPanelOpen(true);
  };

  const handleOpenEditPanel = () => {
    setIsEditMode(true);
    setIsSchedulerPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsSchedulerPanelOpen(false);
    setIsEditMode(false);
  };

  const handleSchedulerSaved = () => {
    refreshTableRef.current?.();
    handleClosePanel();
  };

  return (
    <>
      <Grid>
        <Loader loader={tableLoader}>
          <AutoAllocationSchedulerListComponent
            selectedDependencyValue={null}
            getRowData={getAllocationSchedulerTableData}
            table_name={ALLOCATION_SCHEDULER_TABLE_NAME}
            setTableLoader={setTableLoader}
            onOpenEditPanel={handleOpenEditPanel}
            refreshTableRef={refreshTableRef}
            topRightOptions={
              <Button
                variant="primary"
                id="createAllocationRule"
                onClick={handleOpenCreatePanel}
                disabled={disableCreate()}
              >
                Create Scheduler
              </Button>
            }
            {...props}
          />
        </Loader>
      </Grid>

      <CreateAutoAllocationScheduler
        open={isSchedulerPanelOpen}
        edit={isEditMode}
        onClose={handleClosePanel}
        onSaved={handleSchedulerSaved}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const autoAllocationSchedulerService =
    inventorysmartReducer.autoAllocationSchedulerService;
  const inventorySmartCommonService =
    inventorysmartReducer.inventorySmartCommonService;

  return {
    tableLoader: autoAllocationSchedulerService.tableLoader,
    modulePermissions:
      inventorySmartCommonService.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAllocationSchedulerTableData: (payload) =>
      dispatch(getAllocatioSchedulerListTableData(payload)),
    setTableLoader: (payload) =>
      dispatch(setAutoAllocationSchedulerTableLoader(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoAllocationRulesComponent);
