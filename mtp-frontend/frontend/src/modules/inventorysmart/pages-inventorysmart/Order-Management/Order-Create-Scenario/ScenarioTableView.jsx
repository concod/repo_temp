import { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { Button, Grid, Tooltip, Typography } from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import {
  getOmsCreateScenarioTableConfig,
  getOmsSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
  setOrderScenarioApplyTableConfigLoader,
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryCreateScenarioApplyTableConfiguration,
  setRedirectFromDeepDive,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";

const ScenarioTableView = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const tableGridInstance = useRef(null);
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };
  return (
    <div>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"space-between"}
      >
        <Grid container alignItems={"center"} item xs={3}>
          <Typography variant="h6">Scenario Table</Typography>
        </Grid>
      </Grid>
      <Loader
        loader={props.orderScenarioApplyTableConfigLoader}
        minHeight={"260px"}
      >
        <AgGridComponent
          pagination={false}
          columns={props?.columns}
          rowdata={props?.data}
          showSaveTableConfig={false}
          showSearchModalBtn={false}
        />
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderScenarioApplyTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderScenarioApplyTableConfigLoader,
    orderScenarioApplyTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderScenarioApplyTableDataLoader,
    orderManagementSkuSummaryTableLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSkuSummaryTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsCreateScenarioTableConfig: (payload) =>
    dispatch(getOmsCreateScenarioTableConfig(payload)),
  getOmsSkuSummaryCreateScenarioApplyTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryCreateScenarioApplyTableConfiguration(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
  setOrderScenarioApplyTableConfigLoader: (payload) =>
    dispatch(setOrderScenarioApplyTableConfigLoader(payload)),
  setOrderManagementSkuSummaryTableLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableLoader(payload)),
  //   addSnack: (payload) => dispatch(addSnack(payload)),
  //   closeSnack: (payload) => dispatch(closeSnack(payload)),
  getOmsSkuSummaryTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableConfiguration(payload)),
  //   setOmsCreateNewOrderApproveRequestData: (payload) =>
  //     dispatch(setOmsCreateNewOrderApproveRequestData(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ScenarioTableView);
