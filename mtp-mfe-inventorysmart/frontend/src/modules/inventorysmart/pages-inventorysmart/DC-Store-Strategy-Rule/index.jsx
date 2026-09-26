import React, { useEffect, useLayoutEffect, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { Grid } from "@mui/material";
import { Button } from "impact-ui-v3";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getDCStoreStrategyRulesListTableData,
  setDCStoreStrategyTableLoader,
} from "modules/inventorysmart/services-inventorysmart/DcStoreStrategyRules/dc-store-strategy-rules-service";
import { setCreateViewActive } from "modules/inventorysmart/services-inventorysmart/DcStoreStrategyRules/create-dc-store-strategy-rules-service";
import DCStoreStrategyRulesListComponent from "./DCStoreStrategyRulesListComponent";
import CreateDCStoreStrategyRules from "./CreateDCStoreStrategyRules";
import { canTakeActionOnModules } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "../../../../core/Styles/globalStyles";

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

const DCStoreStrategyRulesComponent = (props) => {
  const [renderTableOrGrid, setRenderTableOrGrid] = useState("table");
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { getAllocationRulesTableData, tableLoader, setTableLoader, setCreateViewActive } =
    props;

  const ALLOCATION_RULES_TABLE_NAME = "dc_store_rules_list";

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
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STORE_POLICY_STRATEGY_RULES,
      "create",
      props?.modulePermission,
      props?.module
    );
    return !canCreate;
  };

  return (
    <>
      {renderTableOrGrid === "table" && (
        <Grid>
          <Loader loader={tableLoader}>
              <DCStoreStrategyRulesListComponent
                selectedDependencyValue={null}
                getRowData={getAllocationRulesTableData}
                table_name={ALLOCATION_RULES_TABLE_NAME}
                setTableLoader={setTableLoader}
                setRenderTableOrGrid={setRenderTableOrGrid}
                modulePermissions={props?.modulePermission}
                module={props.module}
                topRightOptions={
                  <Button
                    variant="contained"
                    color="primary"
                    id="createAllocationRule"
                    onClick={() => setRenderTableOrGrid("grid")}
                    disabled={disableCreate()}
                  >
                    Create Rules
                  </Button>
                }
              />
          </Loader>
        </Grid>
      )}
      {renderTableOrGrid === "grid" && (
        <CreateDCStoreStrategyRules
          resetGridView={() => setRenderTableOrGrid("table")}
        />
      )}
      {renderTableOrGrid === "grid-edit" && (
        <CreateDCStoreStrategyRules
          edit={true}
          resetGridView={() => setRenderTableOrGrid("table")}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const dcStoreStrategyRulesService =
    inventorysmartReducer.dcStoreStrategyRulesService;
  const createDCStoreStrategyRulesService =
    inventorysmartReducer.createDCStoreStrategyRulesService;
  return {
    tableLoader: dcStoreStrategyRulesService.tableLoader,
    isCreateViewActive: createDCStoreStrategyRulesService.isCreateViewActive,
    editId: createDCStoreStrategyRulesService.editId,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAllocationRulesTableData: (payload) =>
      dispatch(getDCStoreStrategyRulesListTableData(payload)),
    setTableLoader: (payload) =>
      dispatch(setDCStoreStrategyTableLoader(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setCreateViewActive: (payload) => dispatch(setCreateViewActive(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCStoreStrategyRulesComponent);
