import { useState, useEffect, useRef } from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
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

const OriginalDeepDiveTableView = function (props) {
  const classes = useStyles();
  const tableGridInstance = useRef(null);
  const [deepDiveTableData, setDeepDiveTableData] = useState([]);
  const [loader, setLoader] = useState(true);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  //Enable loader when the data is updated
  useEffect(() => {
    setLoader(true);
  }, [props.deepDiveViewTableData]);

  //Update the data and refresh the table
  useEffect(() => {
    if (loader) {
      setDeepDiveTableData([...props?.deepDiveViewTableData]);
      setLoader(false);
    }
  }, [loader]);

  const getTopRightOptions = () => {
    const topRightOptions = [];

    // Check access control for original download
    const canDownload = !isEmpty(props?.userAccess)
      ? props?.isUserHasOriginalDownloadAccess
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
            chartFilterData={props?.chartFilterData}
            isCreateScenarioDeepDive={true}
          />
        </>
      );
    }

    return topRightOptions;
  };

  return (
    <div>
      <Loader loader={loader} minHeight={"260px"}>
        {props?.columns?.length > 0 && (
          <div className={classes.gridContainer}>
            <AgGridComponent
              pagination={false}
              columns={loader ? [] : props?.columns}
              rowdata={loader ? [] : deepDiveTableData}
              tableHeader="Deep Dive Original Table"
              loadTableInstance={loadTableInstance}
              topRightOptions={getTopRightOptions()}
            />
          </div>
        )}
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
    deepDiveViewTableData:
      store.omsReducer.orderManagementService.orderManagementDeepDiveTableData,
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OriginalDeepDiveTableView);
