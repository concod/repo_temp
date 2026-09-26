import React, { useEffect, useLayoutEffect, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import CreateAutoAllocationRules from "./CreateAutoAllocationRules";
import AutoAllocationRulesListComponent from "./AutoAllocationRulesListComponent";
import { Button } from "impact-ui-v3";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getAllocationRulesListTableData,
  setAutoAllocationRulesTableLoader,
} from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/auto-allocation-rules-service";
import { setCreateViewActive } from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/create-auto-allocation-rules-service";
import { canTakeActionOnModules } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  confirmBox: {
    "& .MuiDialog-paper": {
      maxWidth: "430px",
      borderRadius: "10px 10px 6px 6px",
    },
  },
  buttonFlex: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "16px",
    alignItems: "center",
  },
}));

const AutoAllocationRulesComponent = (props) => {
  const globalClasses = globalStyles();
  const [renderTableOrGrid, setRenderTableOrGrid] = useState("table");
  const classes = useStyles();
  const {
    getAllocationRulesTableData,
    tableLoader,
    setTableLoader,
    setCreateViewActive,
  } = props;
  const ALLOCATION_RULES_TABLE_NAME = "auto_allocation_rules_list";

  useEffect(() => {
    setCreateViewActive(renderTableOrGrid !== "table");
  }, [renderTableOrGrid, setCreateViewActive]);

  useLayoutEffect(() => {
    if (!props.isCreateViewActive || renderTableOrGrid !== "table") {
      return;
    }

    setRenderTableOrGrid(props.editId ? "grid-edit" : "grid");
  }, []);

  const disableCreate = () => {
    const canCreate = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_AUTO_ALLOCATION_RULES,
      "create",
      props?.modulePermissions,
      props?.module
    );
    return !canCreate;
  };

  return (
    <>
      {renderTableOrGrid === "table" && (
        <Loader loader={tableLoader}>
          <AutoAllocationRulesListComponent
            selectedDependencyValue={null}
            getRowData={getAllocationRulesTableData}
            table_name={ALLOCATION_RULES_TABLE_NAME}
            setTableLoader={setTableLoader}
            setRenderTableOrGrid={setRenderTableOrGrid}
            createRulesButton={
              <Button
                variant="primary"
                id="createAllocationRule"
                onClick={() => setRenderTableOrGrid("grid")}
                disabled={disableCreate()}
              >
                Create Rules
              </Button>
            }
            {...props}
          />
        </Loader>
      )}
      {renderTableOrGrid === "grid" && (
        <CreateAutoAllocationRules
          resetGridView={() => setRenderTableOrGrid("table")}
        />
      )}
      {renderTableOrGrid === "grid-edit" && (
        <CreateAutoAllocationRules
          edit={true}
          resetGridView={() => setRenderTableOrGrid("table")}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const autoAllocationRulesService =
    inventorysmartReducer.autoAllocationRulesService;
  const createAutoAllocationRulesService =
    inventorysmartReducer.createAutoAllocationRulesService;
  const inventorySmartCommonService =
    inventorysmartReducer.inventorySmartCommonService;
  return {
    tableLoader: autoAllocationRulesService.tableLoader,
    modulePermissions:
      inventorySmartCommonService.inventorysmartModulesPermission,
    isCreateViewActive: createAutoAllocationRulesService.isCreateViewActive,
    editId: createAutoAllocationRulesService.editId,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAllocationRulesTableData: (payload) =>
      dispatch(getAllocationRulesListTableData(payload)),
    setTableLoader: (payload) =>
      dispatch(setAutoAllocationRulesTableLoader(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setCreateViewActive: (payload) => dispatch(setCreateViewActive(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoAllocationRulesComponent);
