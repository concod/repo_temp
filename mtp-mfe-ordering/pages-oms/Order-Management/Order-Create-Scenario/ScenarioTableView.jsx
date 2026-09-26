import { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { Grid, Typography } from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import {
  getOmsCreateScenarioTableConfig,
  getOmsSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
  setOrderScenarioApplyTableConfigLoader,
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryCreateScenarioApplyTableConfiguration,
  setRedirectFromDeepDive,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import DeepDiveDownload from "../Order-Deep-Dive/DeepDiveDownload";

const ScenarioTableView = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const tableGridInstance = useRef(null);
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const getTopRightOptions = () => {
    const topRightOptions = [];

    // Check access control for scenario download
    const canDownload = !isEmpty(props?.userAccess)
      ? props?.isUserHasScenarioDownloadAccess
      : true;

    if (canDownload) {
      topRightOptions.push(
        <>
          {/* {downloadExcelLink(
            csvData,
            fileName,
            downloadLink,
            csvHeaders,
            "",
            "",
            true
          )} */}
          <DeepDiveDownload
            weekRange={props?.weekRange}
            simulateDownloadData={props?.simulateDownloadData}
            isCreateScenarioDownload={true}
          />
        </>
      );
    }

    return topRightOptions;
  };

  return (
    <div>
      <Loader
        loader={props.orderScenarioApplyTableConfigLoader}
        minHeight={"260px"}
      >
        <AgGridComponent
          pagination={false}
          columns={props?.columns}
          rowdata={props?.data}
          tableHeader="Scenario Table"
          topRightOptions={getTopRightOptions()}
        />
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderScenarioApplyTableConfigLoader:
      store.omsReducer.orderManagementService
        .orderScenarioApplyTableConfigLoader,
    orderScenarioApplyTableDataLoader:
      store.omsReducer.orderManagementService.orderScenarioApplyTableDataLoader,
    orderManagementSkuSummaryTableLoader:
      store.omsReducer.orderManagementService
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
