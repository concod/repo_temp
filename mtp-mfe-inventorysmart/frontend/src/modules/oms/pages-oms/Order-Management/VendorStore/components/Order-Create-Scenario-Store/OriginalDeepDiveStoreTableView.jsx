import React, { useState, useEffect, useRef } from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import {
  getOmsVendorToStoreDeepDiveTableConfiguration,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableLoader,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import DeepDiveDownload from "../../../Order-Deep-Dive/DeepDiveDownload";

const OriginalDeepDiveStoreTableView = function (props) {
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
  }, [props.deepDiveTableData]);

  //Update the data and refresh the table
  useEffect(() => {
    if (loader) {
      const safeData = Array.isArray(props?.deepDiveTableData)
        ? props.deepDiveTableData
        : [];
      setDeepDiveTableData([...safeData]);
      setLoader(false);
    }
  }, [loader]);

  const getTopRightOptions = () => {
    const topRightOptions = [];

    // Check access control for original download
    const canDownload = !isEmpty(props?.userAccess)
      ? props?.isUserHasOriginalDownloadAccess
      : true; // Default to true for backward compatibility

    if (canDownload) {
      topRightOptions.push(
        <>
          <DeepDiveDownload
            weekRange={props?.weekRange}
            chartFilterData={props?.chartFilterData}
            isCreateScenarioDeepDive={true}
            isCalledFromVendorToStore={true}
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
    deepDiveTableConfigLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveTableConfigLoader,
    deepDiveTableLoader:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableLoader,
    deepDiveTableData:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsVendorToStoreDeepDiveTableConfiguration: (payload) =>
    dispatch(getOmsVendorToStoreDeepDiveTableConfiguration(payload)),
  setDeepDiveTableConfigLoader: (payload) =>
    dispatch(setDeepDiveTableConfigLoader(payload)),
  setDeepDiveTableLoader: (payload) =>
    dispatch(setDeepDiveTableLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OriginalDeepDiveStoreTableView);
